import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ClaudeCostManager } from '@/lib/claude-cost-manager';
import { TemplateEngine } from '@/lib/template-engine';
import { executeSnowflakeQuery } from '@/lib/snowflake';
import { CampaignModel, TemplateModel, AuditLogModel } from '@/lib/models';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { campaign_id, account_ids, template_id, email_sequences, use_mock, confirm_cost } = body;

    // Validate required parameters
    if (!campaign_id || !account_ids || !template_id || !email_sequences) {
      return NextResponse.json(
        { error: 'Missing required parameters: campaign_id, account_ids, template_id, email_sequences' },
        { status: 400 }
      );
    }

    // Validate parameters
    const validation = ClaudeCostManager.validateRequest({
      account_ids,
      email_sequences,
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: validation.errors },
        { status: 400 }
      );
    }

    console.log(`🚀 Generating campaign for ${account_ids.length} accounts, ${email_sequences.length} sequences`);

    // Check rate limits
    const rateLimitCheck = ClaudeCostManager.canMakeRequest(session.user.id);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: rateLimitCheck.reason,
          retry_after: rateLimitCheck.resetTime
        },
        { status: 429 }
      );
    }

    // Estimate costs
    const costEstimate = ClaudeCostManager.estimateCosts({
      account_ids,
      email_sequences,
      include_research: false
    });

    // Check if user confirmed costs
    if (!costEstimate.sufficient_credits) {
      return NextResponse.json(
        {
          error: 'Insufficient Claude credits',
          cost_estimate: costEstimate
        },
        { status: 402 }
      );
    }

    // Check if approval is required and user hasn't confirmed
    if (ClaudeCostManager.requiresApproval(costEstimate.grand_total) && !confirm_cost) {
      return NextResponse.json(
        {
          error: 'Cost confirmation required',
          message: `Generation will cost $${costEstimate.grand_total}. Please confirm.`,
          cost_estimate: costEstimate,
          requires_confirmation: true
        },
        { status: 402 }
      );
    }

    // Record the request
    ClaudeCostManager.recordRequest(session.user.id);

    // Get campaign
    const campaign = await CampaignModel.findOne({
      _id: new ObjectId(campaign_id),
      user_id: session.user.id
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found or access denied' },
        { status: 404 }
      );
    }

    // Get template
    const template = await TemplateModel.findOne({ _id: new ObjectId(template_id) });
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Get account data from Snowflake
    const accountIdsStr = account_ids.map((id: string) => parseInt(id)).join(',');
    const accountQuery = `
      SELECT *
      FROM (
        SELECT
          ably_account_id,
          ably_user_id,
          first_name,
          last_name,
          user_email,
          company_name,
          dt_sign_up,
          dt_sdk_connect,
          dt_last_sign_in,
          use_case,
          sign_in_count,
          num_website_visits,
          messages,
          peak_connections,
          peak_channels,
          brings_you_here,
          whos_developing,
          scale_needs,
          icp_intent
        FROM (${require('@/lib/snowflake').ICP_QUERY}) icp_data
        WHERE ably_account_id IN (${accountIdsStr})
      )
    `;

    const accountsData = await executeSnowflakeQuery(accountQuery);

    if (!accountsData || accountsData.length === 0) {
      return NextResponse.json(
        { error: 'No accounts found in Snowflake data' },
        { status: 404 }
      );
    }

    // Determine if we should use mock or real Claude API
    const shouldUseMock = use_mock !== false && ClaudeCostManager.isMockMode();

    const generatedEmails: any[] = [];
    let totalCost = 0;
    const startTime = Date.now();

    console.log(`📝 Generating ${accountsData.length * email_sequences.length} emails (${shouldUseMock ? 'mock' : 'real'} mode)`);

    // Generate emails for each account and sequence
    for (const account of accountsData) {
      for (const sequence of email_sequences) {
        try {
          // Create template context
          const templateContext = TemplateEngine.createTemplateContext(
            account,
            { name: session.user.name || 'Ably Team', email: session.user.email },
            sequence
          );

          let generatedEmail;
          let emailCost = 0;

          if (shouldUseMock) {
            // Use mock generation
            const mockResult = ClaudeCostManager.generateMockEmail(account, template, sequence);

            // Apply template substitution
            const substitutedResult = TemplateEngine.generateEmail(
              mockResult.subject,
              mockResult.content,
              templateContext
            );

            generatedEmail = {
              account_id: account.ably_account_id.toString(),
              sequence,
              subject: substitutedResult.subject,
              content: substitutedResult.content,
              variables_used: substitutedResult.variables_used,
              status: 'draft',
              scheduled_date: new Date(Date.now() + (sequence - 1) * 7 * 24 * 60 * 60 * 1000), // 1 week apart
              generated_at: new Date(),
              mock_mode: true
            };

            emailCost = mockResult.estimated_cost;

          } else {
            // TODO: Implement real Claude API call here
            // For now, return error since we want to avoid burning credits
            return NextResponse.json(
              {
                error: 'Real Claude API disabled',
                message: 'Real Claude API calls are disabled to prevent credit usage. Use use_mock: true.'
              },
              { status: 503 }
            );
          }

          generatedEmails.push(generatedEmail);
          totalCost += emailCost;

          // Simulate some processing time for mock mode
          if (shouldUseMock) {
            await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
          }

        } catch (emailError) {
          console.error(`Failed to generate email for account ${account.ably_account_id}, sequence ${sequence}:`, emailError);

          // Add error entry
          generatedEmails.push({
            account_id: account.ably_account_id.toString(),
            sequence,
            status: 'failed',
            error: emailError instanceof Error ? emailError.message : 'Unknown error',
            generated_at: new Date()
          });
        }
      }
    }

    const endTime = Date.now();
    const generationTime = (endTime - startTime) / 1000;

    // Update campaign with generated emails
    const successfulEmails = generatedEmails.filter(email => email.status !== 'failed');

    await CampaignModel.findOneAndUpdate(
      { _id: new ObjectId(campaign_id) },
      {
        $set: {
          generated_emails: generatedEmails,
          generation_metadata: {
            total_cost: totalCost,
            generation_time: generationTime,
            claude_model: shouldUseMock ? 'mock' : 'claude-3-sonnet',
            generated_at: new Date(),
            generated_by: session.user.email,
            template_used: template_id
          },
          status: successfulEmails.length > 0 ? 'generated' : 'failed',
          updated_at: new Date()
        }
      }
    );

    // Log the operation
    await AuditLogModel.logAction(
      session.user.id,
      'campaign_emails_generated',
      'campaign',
      campaign_id,
      {
        accounts: account_ids.length,
        sequences: email_sequences.length,
        successful: successfulEmails.length,
        failed: generatedEmails.length - successfulEmails.length,
        total_cost: totalCost,
        mock_mode: shouldUseMock
      }
    );

    const response = {
      success: true,
      campaign_id,
      generated_emails: successfulEmails.length,
      failed_emails: generatedEmails.length - successfulEmails.length,
      total_cost: totalCost,
      generation_time: `${generationTime.toFixed(1)}s`,
      emails: generatedEmails,
      accounts_processed: accountsData.length,
      cost_breakdown: {
        per_email: shouldUseMock ? ClaudeCostManager['COST_PER_EMAIL'] : 0,
        total_emails: generatedEmails.length,
        total_cost: totalCost
      },
      metadata: {
        mock_mode: shouldUseMock,
        template_id,
        user: session.user.email,
        timestamp: new Date().toISOString()
      }
    };

    console.log(`✅ Campaign generation complete: ${successfulEmails.length} emails generated`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Campaign generation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate campaign',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accounts = parseInt(searchParams.get('accounts') || '1');
    const sequences = parseInt(searchParams.get('sequences') || '1');
    const includeResearch = searchParams.get('include_research') === 'true';

    // Estimate costs for the given parameters
    const costEstimate = ClaudeCostManager.estimateCosts({
      account_ids: Array(accounts).fill('dummy'),
      email_sequences: Array(sequences).fill(1),
      include_research: includeResearch
    });

    const rateLimitInfo = ClaudeCostManager.checkRateLimit(session.user.id);
    const config = ClaudeCostManager.getConfiguration();

    return NextResponse.json({
      success: true,
      cost_estimate: costEstimate,
      rate_limit: rateLimitInfo,
      configuration: config,
      warnings: {
        requires_approval: ClaudeCostManager.requiresApproval(costEstimate.grand_total),
        cost_warning: ClaudeCostManager.shouldWarnUser(costEstimate.grand_total),
        sufficient_credits: costEstimate.sufficient_credits
      }
    });

  } catch (error) {
    console.error('❌ Cost estimation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to estimate costs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}