import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ClaudeCostManager } from '@/lib/claude-cost-manager';
import { TemplateEngine } from '@/lib/template-engine';
import { executeSnowflakeQuery } from '@/lib/snowflake';
import { TemplateModel } from '@/lib/models';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { account_id, template_id, email_sequence, use_mock } = body;

    // Validate required parameters
    if (!account_id || !template_id || !email_sequence) {
      return NextResponse.json(
        { error: 'Missing required parameters: account_id, template_id, email_sequence' },
        { status: 400 }
      );
    }

    if (email_sequence < 1 || email_sequence > 4) {
      return NextResponse.json(
        { error: 'email_sequence must be between 1 and 4' },
        { status: 400 }
      );
    }

    console.log(`🎯 Generating email for account ${account_id}, sequence ${email_sequence}`);

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

    // Record the request
    ClaudeCostManager.recordRequest(session.user.id);

    // Get account data from Snowflake
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
        WHERE ably_account_id = ${parseInt(account_id)}
      )
    `;

    const accountData = await executeSnowflakeQuery(accountQuery);

    if (!accountData || accountData.length === 0) {
      return NextResponse.json(
        { error: 'Account not found in Snowflake data' },
        { status: 404 }
      );
    }

    const account = accountData[0];

    // Get template data
    const template = await TemplateModel.findOne({ _id: new ObjectId(template_id) });
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Create template context
    const templateContext = TemplateEngine.createTemplateContext(
      account,
      { name: session.user.name || 'Ably Team', email: session.user.email },
      email_sequence
    );

    // Determine if we should use mock or real Claude API
    const shouldUseMock = use_mock !== false && ClaudeCostManager.isMockMode();

    let generatedEmail;
    let actualCost = 0;
    let generationTime = 0;

    if (shouldUseMock) {
      console.log('📝 Using mock email generation');

      // Use mock generation
      const mockResult = ClaudeCostManager.generateMockEmail(account, template, email_sequence);

      // Apply template substitution to mock content
      const substitutedResult = TemplateEngine.generateEmail(
        mockResult.subject,
        mockResult.content,
        templateContext
      );

      generatedEmail = {
        subject: substitutedResult.subject,
        content: substitutedResult.content,
        variables_used: substitutedResult.variables_used,
        generation_time: mockResult.generation_time,
        estimated_cost: mockResult.estimated_cost,
        mock_mode: true
      };

      generationTime = mockResult.generation_time;

    } else {
      console.log('🤖 Using real Claude API');

      // Estimate cost first
      const costEstimate = ClaudeCostManager.estimateCosts({
        account_ids: [account_id],
        email_sequences: [email_sequence]
      });

      if (!costEstimate.sufficient_credits) {
        return NextResponse.json(
          {
            error: 'Insufficient Claude credits',
            details: `Current balance: $${costEstimate.current_balance}, Required: $${costEstimate.grand_total}`
          },
          { status: 402 }
        );
      }

      // Check if approval is required
      if (ClaudeCostManager.requiresApproval(costEstimate.grand_total)) {
        return NextResponse.json(
          {
            error: 'Approval required',
            message: `Cost of $${costEstimate.grand_total} exceeds approval threshold`,
            cost_estimate: costEstimate
          },
          { status: 403 }
        );
      }

      // TODO: Implement real Claude API call here
      // For now, return error since we want to avoid burning credits
      return NextResponse.json(
        {
          error: 'Real Claude API disabled',
          message: 'Real Claude API calls are disabled to prevent credit usage. Use use_mock: true.',
          suggestion: 'Set use_mock: true in request body or set CLAUDE_USE_MOCK=false environment variable'
        },
        { status: 503 }
      );
    }

    // Calculate engagement score for account insights
    const engagementScore = Math.min(100, Math.max(0,
      (account.sign_in_count * 5) +
      (account.messages ? Math.log(account.messages) * 10 : 0) +
      (account.icp_intent === 'yes' ? 25 : 0)
    ));

    const response = {
      success: true,
      email: generatedEmail,
      account_data: {
        company_name: account.company_name,
        contact_name: templateContext.variables.contact_name,
        engagement_score: Math.round(engagementScore),
        icp_match: account.icp_intent === 'yes',
        sign_in_count: account.sign_in_count,
        use_case: account.use_case
      },
      template_info: {
        template_id: template._id,
        template_name: template.name,
        category: template.category
      },
      generation_metadata: {
        sequence: email_sequence,
        user: session.user.email,
        timestamp: new Date().toISOString(),
        cost: actualCost,
        mock_mode: shouldUseMock
      }
    };

    console.log(`✅ Email generated successfully (${shouldUseMock ? 'mock' : 'real'} mode)`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Email generation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate email',
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

    // Return current configuration and rate limit status
    const rateLimitInfo = ClaudeCostManager.checkRateLimit(session.user.id);
    const config = ClaudeCostManager.getConfiguration();

    return NextResponse.json({
      success: true,
      configuration: config,
      rate_limit: rateLimitInfo,
      user: {
        email: session.user.email,
        can_make_request: ClaudeCostManager.canMakeRequest(session.user.id).allowed
      }
    });

  } catch (error) {
    console.error('❌ Configuration fetch error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}