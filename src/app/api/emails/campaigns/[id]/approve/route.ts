import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CampaignModel, AuditLogModel } from '@/lib/models';
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

    // Only admins can approve campaigns
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions. Admin role required for approval.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, comments } = body; // action: 'approve' | 'reject'

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    const { id } = await params;

    console.log(`👤 ${action === 'approve' ? 'Approving' : 'Rejecting'} campaign ${id} by ${session.user.email}`);

    const campaign = await CampaignModel.findById(id);
    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    if (!campaign.requires_approval) {
      return NextResponse.json(
        { error: 'Campaign does not require approval' },
        { status: 400 }
      );
    }

    if (campaign.status !== 'pending_approval') {
      return NextResponse.json(
        { error: `Campaign is not pending approval. Current status: ${campaign.status}` },
        { status: 400 }
      );
    }

    // Update campaign based on action
    const updateData: any = {
      updated_at: new Date(),
      updated_by: session.user.email
    };

    if (action === 'approve') {
      updateData.status = 'approved';
      updateData.approved_by = session.user.email;
      updateData.approved_at = new Date();
      if (comments) updateData.approval_comments = comments;
    } else {
      updateData.status = 'rejected';
      updateData.rejected_by = session.user.email;
      updateData.rejected_at = new Date();
      updateData.rejection_reason = comments || 'No reason provided';
    }

    await CampaignModel.update(id, updateData);

    // Get the updated campaign
    const updatedCampaign = await CampaignModel.findById(id);

    // Log the approval/rejection
    await AuditLogModel.logAction(
      session.user.id,
      action === 'approve' ? 'campaign_approved' : 'campaign_rejected',
      'campaign',
      id,
      {
        campaign_name: campaign.name,
        action,
        comments: comments || null,
        [`${action}ed_by`]: session.user.email,
        target_accounts: campaign.target_accounts?.length || 0
      }
    );

    // TODO: Send notification to campaign creator
    // This would typically send an email or in-app notification

    const response = {
      success: true,
      campaign: updatedCampaign,
      message: action === 'approve'
        ? 'Campaign approved successfully. Emails can now be generated.'
        : 'Campaign rejected. Creator will be notified.',
      next_steps: action === 'approve'
        ? ['generate_emails', 'schedule_campaign']
        : ['review_feedback', 'modify_campaign', 'resubmit_for_approval']
    };

    console.log(`✅ Campaign ${id} ${action}ed by ${session.user.email}`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Campaign approval error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process campaign approval',
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

    console.log(`📋 Getting approval status for campaign ${id}`);

    const campaign = await CampaignModel.findById(id);
    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this campaign
    const hasAccess = session.user.role === 'admin' ||
                     campaign.created_by === session.user.email ||
                     campaign.assigned_to === session.user.email;

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Note: AuditLogModel.find needs to be implemented or mocked
    const approvalHistory: any[] = [];

    const response = {
      success: true,
      campaign_id: id,
      campaign_name: campaign.name,
      approval_status: {
        requires_approval: campaign.requires_approval,
        current_status: campaign.status,
        approved_by: campaign.approved_by || null,
        approved_at: campaign.approved_at || null,
        rejected_by: campaign.rejected_by || null,
        rejected_at: campaign.rejected_at || null,
        approval_comments: campaign.approval_comments || null,
        rejection_reason: campaign.rejection_reason || null
      },
      permissions: {
        can_approve: session.user.role === 'admin' && campaign.status === 'pending_approval',
        can_request_approval: campaign.created_by === session.user.email && campaign.status === 'draft'
      },
      approval_history: approvalHistory.map((log: any) => ({
        action: log.action,
        user: log.metadata?.approved_by || log.metadata?.rejected_by || log.user_id,
        timestamp: log.created_at,
        comments: log.metadata?.comments || null
      }))
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Get approval status error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get approval status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}