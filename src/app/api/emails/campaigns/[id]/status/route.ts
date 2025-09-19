import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CampaignModel, AuditLogModel } from '@/lib/models';
import { ObjectId } from 'mongodb';

const VALID_STATUS_TRANSITIONS = {
  'draft': ['pending_approval', 'approved', 'active', 'deleted'],
  'pending_approval': ['approved', 'rejected', 'draft'],
  'rejected': ['draft', 'pending_approval'],
  'approved': ['active', 'draft'],
  'active': ['paused', 'completed', 'cancelled'],
  'paused': ['active', 'cancelled'],
  'completed': [], // Terminal state
  'cancelled': ['draft'], // Can restart as draft
  'deleted': [] // Terminal state
};

const STATUS_DESCRIPTIONS = {
  'draft': 'Campaign is being created and configured',
  'pending_approval': 'Campaign is waiting for admin approval',
  'rejected': 'Campaign was rejected and needs revision',
  'approved': 'Campaign is approved and ready to activate',
  'active': 'Campaign is running and sending emails',
  'paused': 'Campaign is temporarily paused',
  'completed': 'Campaign has finished sending all emails',
  'cancelled': 'Campaign was cancelled and stopped',
  'deleted': 'Campaign has been deleted'
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { status, reason } = body;

    if (!status || !Object.keys(VALID_STATUS_TRANSITIONS).includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Valid statuses: ' + Object.keys(VALID_STATUS_TRANSITIONS).join(', ') },
        { status: 400 }
      );
    }

    const { id } = await params;

    console.log(`🔄 Changing campaign ${id} status to ${status} by ${session.user.email}`);

    // Check access permissions
    const accessFilter: any = { _id: new ObjectId(id) };
    if (session.user.role !== 'admin') {
      accessFilter.$or = [
        { created_by: session.user.email },
        { assigned_to: session.user.email }
      ];
    }

    // Get campaign and check access manually
    const campaign = await CampaignModel.findById(id);

    // Check access permissions manually
    if (!campaign || (session.user.role !== 'admin' &&
        campaign.created_by !== session.user.email &&
        campaign.assigned_to !== session.user.email)) {
      return NextResponse.json(
        { error: 'Campaign not found or access denied' },
        { status: 404 }
      );
    }

    const currentStatus = campaign.status;

    // Validate status transition
    const validTransitions = VALID_STATUS_TRANSITIONS[currentStatus as keyof typeof VALID_STATUS_TRANSITIONS];
    if (!validTransitions.includes(status)) {
      return NextResponse.json(
        {
          error: `Invalid status transition from ${currentStatus} to ${status}`,
          valid_transitions: validTransitions,
          current_status: currentStatus
        },
        { status: 400 }
      );
    }

    // Special permission checks for certain status changes
    if (status === 'approved' && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can approve campaigns' },
        { status: 403 }
      );
    }

    if (status === 'deleted' && session.user.role !== 'admin' && campaign.created_by !== session.user.email) {
      return NextResponse.json(
        { error: 'Only campaign creators and admins can delete campaigns' },
        { status: 403 }
      );
    }

    // Validate business rules for status changes
    const emails = campaign.generated_emails || [];
    const hasEmailsSent = emails.some((e: any) => e.status === 'sent');

    if (status === 'active' && emails.length === 0) {
      return NextResponse.json(
        { error: 'Cannot activate campaign without generated emails' },
        { status: 400 }
      );
    }

    if (status === 'deleted' && hasEmailsSent) {
      return NextResponse.json(
        { error: 'Cannot delete campaign with sent emails. Use cancelled status instead.' },
        { status: 400 }
      );
    }

    if (status === 'completed') {
      const allEmailsSent = emails.length > 0 && emails.every((e: any) => e.status === 'sent' || e.status === 'failed');
      if (!allEmailsSent) {
        return NextResponse.json(
          { error: 'Cannot mark campaign as completed. Not all emails have been sent.' },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {
      status,
      updated_at: new Date(),
      updated_by: session.user.email,
      [`${status}_at`]: new Date(),
      [`${status}_by`]: session.user.email
    };

    if (reason) {
      updateData[`${status}_reason`] = reason;
    }

    // Special handling for certain status changes
    if (status === 'paused') {
      // When pausing, record which emails were scheduled
      const scheduledEmails = emails.filter((e: any) => e.status === 'scheduled');
      updateData.paused_metadata = {
        scheduled_emails_count: scheduledEmails.length,
        next_scheduled_date: scheduledEmails.length > 0 ?
          Math.min(...scheduledEmails.map((e: any) => new Date(e.scheduled_date).getTime())) : null
      };
    }

    if (status === 'active' && currentStatus === 'paused') {
      // When resuming from pause, we might need to reschedule emails
      updateData.resumed_from_pause = true;
    }

    if (status === 'cancelled') {
      // When cancelling, update any scheduled emails to cancelled status
      const updatedEmails = emails.map((email: any) => {
        if (email.status === 'scheduled') {
          return { ...email, status: 'cancelled', cancelled_at: new Date() };
        }
        return email;
      });
      updateData.generated_emails = updatedEmails;
    }

    // Update the campaign
    await CampaignModel.update(id, updateData);

    // Get the updated campaign
    const updatedCampaign = await CampaignModel.findById(id);

    // Log the status change
    await AuditLogModel.logAction(
      session.user.id,
      'campaign_status_changed',
      'campaign',
      id,
      {
        campaign_name: campaign.name,
        from_status: currentStatus,
        to_status: status,
        reason: reason || null,
        changed_by: session.user.email,
        emails_affected: status === 'cancelled' ? emails.filter(e => e.status === 'scheduled').length : 0
      }
    );

    // Determine next available actions
    const nextActions = VALID_STATUS_TRANSITIONS[status as keyof typeof VALID_STATUS_TRANSITIONS] || [];
    const availableActions = nextActions.filter(action => {
      // Apply permission filters
      if (action === 'approved' && session.user.role !== 'admin') return false;
      if (action === 'deleted' && session.user.role !== 'admin' && campaign.created_by !== session.user.email) return false;
      return true;
    });

    const response = {
      success: true,
      campaign_id: id,
      status_change: {
        from: currentStatus,
        to: status,
        changed_by: session.user.email,
        changed_at: new Date(),
        reason: reason || null
      },
      campaign: updatedCampaign,
      available_actions: availableActions,
      next_steps: getNextStepsForStatus(status, updatedCampaign)
    };

    console.log(`✅ Campaign ${id} status changed from ${currentStatus} to ${status}`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Campaign status change error:', error);
    return NextResponse.json(
      {
        error: 'Failed to change campaign status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
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

    console.log(`📊 Getting status information for campaign ${id}`);

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

    const currentStatus = campaign.status;
    const validTransitions = VALID_STATUS_TRANSITIONS[currentStatus as keyof typeof VALID_STATUS_TRANSITIONS] || [];

    // Filter transitions based on permissions
    const availableTransitions = validTransitions.filter(status => {
      if (status === 'approved' && session.user.role !== 'admin') return false;
      if (status === 'deleted' && session.user.role !== 'admin' && campaign.created_by !== session.user.email) return false;
      return true;
    });

    // Note: AuditLogModel.find needs to be implemented or mocked
    const statusHistory: any[] = [];

    const emails = campaign.generated_emails || [];
    const statusSummary = {
      current_status: currentStatus,
      description: STATUS_DESCRIPTIONS[currentStatus as keyof typeof STATUS_DESCRIPTIONS],
      available_transitions: availableTransitions,
      status_metadata: {
        created_at: campaign.created_at,
        updated_at: campaign.updated_at,
        approved_at: campaign.approved_at || null,
        rejected_at: campaign.rejected_at || null,
        activated_at: campaign.activated_at || null,
        paused_at: campaign.paused_at || null,
        completed_at: campaign.completed_at || null,
        cancelled_at: campaign.cancelled_at || null
      },
      email_statistics: {
        total: emails.length,
        draft: emails.filter((e: any) => e.status === 'draft').length,
        scheduled: emails.filter((e: any) => e.status === 'scheduled').length,
        sent: emails.filter((e: any) => e.status === 'sent').length,
        failed: emails.filter((e: any) => e.status === 'failed').length,
        cancelled: emails.filter((e: any) => e.status === 'cancelled').length
      },
      permissions: {
        can_approve: session.user.role === 'admin',
        can_delete: session.user.role === 'admin' || campaign.created_by === session.user.email,
        can_edit: session.user.role === 'admin' || campaign.created_by === session.user.email || campaign.assigned_to === session.user.email
      },
      history: statusHistory.map((log: any) => ({
        from_status: log.metadata?.from_status,
        to_status: log.metadata?.to_status,
        changed_by: log.metadata?.changed_by,
        changed_at: log.created_at,
        reason: log.metadata?.reason
      }))
    };

    return NextResponse.json({
      success: true,
      campaign_id: id,
      status_summary
    });

  } catch (error) {
    console.error('❌ Get campaign status error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get campaign status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function getNextStepsForStatus(status: string, campaign: any): string[] {
  const emails = campaign.generated_emails || [];

  switch (status) {
    case 'draft':
      return ['Configure campaign settings', 'Add target accounts', 'Select email template', 'Request approval'];
    case 'pending_approval':
      return ['Wait for admin approval', 'Review campaign details'];
    case 'approved':
      return ['Generate emails', 'Schedule campaign', 'Activate campaign'];
    case 'active':
      const scheduledCount = emails.filter((e: any) => e.status === 'scheduled').length;
      return scheduledCount > 0 ?
        ['Monitor email delivery', 'Check campaign performance'] :
        ['Generate and schedule emails'];
    case 'paused':
      return ['Resume campaign', 'Review scheduled emails', 'Cancel campaign if needed'];
    case 'completed':
      return ['Review campaign results', 'Export performance data', 'Create follow-up campaign'];
    case 'cancelled':
      return ['Review cancellation reason', 'Create new campaign', 'Restart as draft'];
    case 'rejected':
      return ['Review rejection feedback', 'Modify campaign', 'Resubmit for approval'];
    default:
      return [];
  }
}