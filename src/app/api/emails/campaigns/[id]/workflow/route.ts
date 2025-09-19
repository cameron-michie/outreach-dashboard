import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CampaignModel, AuditLogModel } from '@/lib/models';
import { ClaudeCostManager } from '@/lib/claude-cost-manager';
import { ObjectId } from 'mongodb';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, options } = body;

    const validActions = [
      'complete_workflow',
      'request_approval',
      'generate_and_schedule',
      'generate_send_immediate',
      'preview_complete_workflow'
    ];

    if (!action || !validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Valid actions: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    const { id } = await params;

    console.log(`🔄 Running workflow action '${action}' for campaign ${id}`);

    const campaign = await CampaignModel.findById(id);
    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Check access
    const hasAccess = session.user.role === 'admin' ||
                     campaign.created_by === session.user.email ||
                     campaign.assigned_to === session.user.email;

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    let workflowResult: any = { success: true, steps: [] };

    switch (action) {
      case 'complete_workflow':
        workflowResult = await executeCompleteWorkflow(campaign, session, options);
        break;

      case 'request_approval':
        workflowResult = await executeRequestApproval(campaign, session, options);
        break;

      case 'generate_and_schedule':
        workflowResult = await executeGenerateAndSchedule(campaign, session, options);
        break;

      case 'generate_send_immediate':
        workflowResult = await executeGenerateSendImmediate(campaign, session, options);
        break;

      case 'preview_complete_workflow':
        workflowResult = await previewCompleteWorkflow(campaign, session, options);
        break;

      default:
        return NextResponse.json(
          { error: 'Action not implemented' },
          { status: 400 }
        );
    }

    // Log the workflow action
    await AuditLogModel.logAction(
      session.user.id,
      'campaign_workflow_executed',
      'campaign',
      id,
      {
        workflow_action: action,
        campaign_name: campaign.name,
        success: workflowResult.success,
        steps_completed: workflowResult.steps?.length || 0,
        executed_by: session.user.email
      }
    );

    console.log(`✅ Workflow '${action}' completed for campaign ${id}`);

    return NextResponse.json({
      success: workflowResult.success,
      campaign_id: id,
      workflow_action: action,
      result: workflowResult,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('❌ Campaign workflow error:', error);
    return NextResponse.json(
      {
        error: 'Workflow execution failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function executeCompleteWorkflow(campaign: any, session: any, options: any) {
  const steps = [];
  let currentStep = 1;

  try {
    // Step 1: Validate campaign is ready
    steps.push({
      step: currentStep++,
      name: 'validate_campaign',
      status: 'running',
      description: 'Validating campaign configuration'
    });

    if (!campaign.target_accounts || campaign.target_accounts.length === 0) {
      throw new Error('No target accounts configured');
    }

    if (!campaign.template_id) {
      throw new Error('No email template selected');
    }

    steps[steps.length - 1].status = 'completed';
    steps[steps.length - 1].result = `Campaign validated: ${campaign.target_accounts.length} accounts, template selected`;

    // Step 2: Check approval requirements
    if (campaign.requires_approval && campaign.status !== 'approved') {
      steps.push({
        step: currentStep++,
        name: 'request_approval',
        status: 'running',
        description: 'Requesting campaign approval'
      });

      await CampaignModel.update(campaign._id, {
        status: 'pending_approval',
        approval_requested_at: new Date(),
        approval_requested_by: session.user.email
      });

      steps[steps.length - 1].status = 'completed';
      steps[steps.length - 1].result = 'Approval requested - workflow will continue after approval';

      return {
        success: true,
        steps,
        status: 'pending_approval',
        message: 'Campaign submitted for approval. Workflow will continue automatically once approved.'
      };
    }

    // Step 3: Generate emails
    if (!campaign.generated_emails || campaign.generated_emails.length === 0) {
      steps.push({
        step: currentStep++,
        name: 'generate_emails',
        status: 'running',
        description: 'Generating personalized emails'
      });

      // Cost check
      const costEstimate = ClaudeCostManager.estimateCosts({
        account_ids: campaign.target_accounts,
        email_sequences: campaign.email_sequences || [1],
        include_research: false
      });

      if (!costEstimate.sufficient_credits) {
        throw new Error(`Insufficient credits: Need $${costEstimate.grand_total}, have $${costEstimate.current_balance}`);
      }

      // Simulate email generation (using mock for now)
      const mockEmails = campaign.target_accounts.flatMap((accountId: string) =>
        (campaign.email_sequences || [1]).map((sequence: number) => ({
          account_id: accountId,
          sequence,
          subject: `Generated Email ${sequence} for Account ${accountId}`,
          content: `Mock email content for account ${accountId}, sequence ${sequence}`,
          status: 'draft',
          generated_at: new Date()
        }))
      );

      await CampaignModel.update(campaign._id, {
        generated_emails: mockEmails,
        generation_metadata: {
          generated_at: new Date(),
          generated_by: session.user.email,
          total_cost: costEstimate.grand_total,
          mock_mode: true
        }
      });

      steps[steps.length - 1].status = 'completed';
      steps[steps.length - 1].result = `Generated ${mockEmails.length} emails`;
    }

    // Step 4: Schedule emails
    steps.push({
      step: currentStep++,
      name: 'schedule_emails',
      status: 'running',
      description: 'Scheduling email delivery'
    });

    const scheduleType = options?.schedule_type || 'scheduled';
    const now = new Date();

    // Update emails with scheduling
    const updatedEmails = (campaign.generated_emails || []).map((email: any, index: number) => ({
      ...email,
      status: 'scheduled',
      scheduled_date: new Date(now.getTime() + (index * 5 * 60 * 1000)) // 5 minutes apart
    }));

    await CampaignModel.update(campaign._id, {
      generated_emails: updatedEmails,
      status: 'active',
      scheduled_at: new Date(),
      scheduled_by: session.user.email
    });

    steps[steps.length - 1].status = 'completed';
    steps[steps.length - 1].result = `Scheduled ${updatedEmails.length} emails`;

    // Step 5: Final validation
    steps.push({
      step: currentStep++,
      name: 'final_validation',
      status: 'completed',
      description: 'Workflow completed successfully',
      result: 'Campaign is now active and emails are scheduled'
    });

    return {
      success: true,
      steps,
      status: 'active',
      message: 'Complete workflow executed successfully. Campaign is now active.',
      emails_scheduled: updatedEmails.length,
      next_send_date: updatedEmails.length > 0 ? updatedEmails[0].scheduled_date : null
    };

  } catch (error) {
    // Mark current step as failed
    if (steps.length > 0) {
      steps[steps.length - 1].status = 'failed';
      steps[steps.length - 1].error = error instanceof Error ? error.message : 'Unknown error';
    }

    return {
      success: false,
      steps,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function executeRequestApproval(campaign: any, session: any, options: any) {
  if (campaign.status === 'approved') {
    return {
      success: true,
      message: 'Campaign is already approved',
      status: 'approved'
    };
  }

  if (campaign.status === 'pending_approval') {
    return {
      success: true,
      message: 'Campaign approval is already pending',
      status: 'pending_approval'
    };
  }

  await CampaignModel.update(campaign._id, {
    status: 'pending_approval',
    approval_requested_at: new Date(),
    approval_requested_by: session.user.email,
    approval_comments: options?.comments || null
  });

  return {
    success: true,
    message: 'Approval requested successfully',
    status: 'pending_approval',
    next_steps: ['Wait for admin approval', 'Monitor approval status']
  };
}

async function executeGenerateAndSchedule(campaign: any, session: any, options: any) {
  // This would integrate with the existing generate-campaign and schedule endpoints
  return {
    success: true,
    message: 'Integration with generate-campaign and schedule endpoints',
    note: 'This would call the existing /api/claude/generate-campaign and /api/emails/campaigns/[id]/schedule endpoints'
  };
}

async function executeGenerateSendImmediate(campaign: any, session: any, options: any) {
  // This would generate emails and immediately schedule them for sending
  return {
    success: true,
    message: 'Integration with generate-campaign and immediate send',
    note: 'This would generate emails and schedule them for immediate sending'
  };
}

async function previewCompleteWorkflow(campaign: any, session: any, options: any) {
  const preview = {
    workflow_steps: [
      {
        step: 1,
        name: 'validate_campaign',
        description: 'Validate campaign configuration',
        estimated_time: '5 seconds',
        requirements: ['Target accounts configured', 'Template selected']
      },
      {
        step: 2,
        name: 'approval_check',
        description: 'Check if approval is required',
        estimated_time: '1 second',
        conditional: campaign.requires_approval,
        note: campaign.requires_approval ? 'Approval required - will pause workflow' : 'No approval required'
      },
      {
        step: 3,
        name: 'generate_emails',
        description: 'Generate personalized emails using Claude AI',
        estimated_time: `${campaign.target_accounts?.length * 3} seconds`,
        cost_estimate: ClaudeCostManager.estimateCosts({
          account_ids: campaign.target_accounts || [],
          email_sequences: campaign.email_sequences || [1],
          include_research: false
        })
      },
      {
        step: 4,
        name: 'schedule_emails',
        description: 'Schedule emails for delivery',
        estimated_time: '10 seconds',
        note: `Will schedule ${(campaign.target_accounts?.length || 0) * (campaign.email_sequences?.length || 1)} emails`
      },
      {
        step: 5,
        name: 'activate_campaign',
        description: 'Set campaign status to active',
        estimated_time: '2 seconds'
      }
    ],
    total_estimated_time: `${(campaign.target_accounts?.length || 0) * 3 + 18} seconds`,
    total_emails: (campaign.target_accounts?.length || 0) * (campaign.email_sequences?.length || 1),
    warnings: [],
    requirements_check: {
      has_target_accounts: (campaign.target_accounts?.length || 0) > 0,
      has_template: !!campaign.template_id,
      approval_status: campaign.requires_approval ? campaign.status : 'not_required'
    }
  };

  return {
    success: true,
    preview,
    can_execute: preview.requirements_check.has_target_accounts &&
                 preview.requirements_check.has_template &&
                 (!campaign.requires_approval || campaign.status === 'approved')
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const campaign = await CampaignModel.findById(id);
    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Return available workflow actions based on campaign state
    const availableActions = [];

    if (campaign.status === 'draft') {
      availableActions.push('complete_workflow', 'request_approval', 'preview_complete_workflow');
    }

    if (campaign.status === 'approved') {
      availableActions.push('generate_and_schedule', 'generate_send_immediate');
    }

    if (campaign.generated_emails?.length > 0 && campaign.status !== 'active') {
      availableActions.push('schedule_and_activate');
    }

    return NextResponse.json({
      success: true,
      campaign_id: id,
      current_status: campaign.status,
      available_actions: availableActions,
      workflow_status: {
        has_target_accounts: (campaign.target_accounts?.length || 0) > 0,
        has_template: !!campaign.template_id,
        has_generated_emails: (campaign.generated_emails?.length || 0) > 0,
        requires_approval: campaign.requires_approval,
        is_approved: campaign.status === 'approved'
      }
    });

  } catch (error) {
    console.error('❌ Get workflow status error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get workflow status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}