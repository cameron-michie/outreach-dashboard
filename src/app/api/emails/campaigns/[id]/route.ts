import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CampaignModel, TemplateModel, AuditLogModel } from '@/lib/models';
import { DatabaseFilter, GeneratedEmail, UpdateData } from '@/types/common';
import { ObjectId } from 'mongodb';

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

    console.log(`📋 Fetching email campaign ${id} for ${session.user.email}`);

    // Build access filter
    const accessFilter: any = { _id: new ObjectId(id) };

    // Users can only access campaigns they created or are assigned to (unless admin)
    if (session.user.role !== 'admin') {
      accessFilter.$or = [
        { created_by: session.user.email },
        { assigned_to: session.user.email }
      ];
    }

    // Get campaign and check access manually since findOne doesn't work with complex filters
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

    // Get associated template
    const template = await TemplateModel.findById(campaign.template_id);

    // Analyze email statuses
    const emails = campaign.generated_emails || [];
    const emailAnalysis = {
      total: emails.length,
      by_status: {
        draft: emails.filter((e: any) => e.status === 'draft').length,
        scheduled: emails.filter((e: any) => e.status === 'scheduled').length,
        pending_approval: emails.filter((e: any) => e.status === 'pending_approval').length,
        approved: emails.filter((e: any) => e.status === 'approved').length,
        sent: emails.filter((e: any) => e.status === 'sent').length,
        failed: emails.filter((e: any) => e.status === 'failed').length
      },
      by_sequence: {}
    };

    // Group by email sequence
    emails.forEach((email: any) => {
      const seq = email.sequence || 1;
      if (!emailAnalysis.by_sequence[seq]) {
        emailAnalysis.by_sequence[seq] = {
          total: 0,
          draft: 0,
          scheduled: 0,
          sent: 0,
          failed: 0
        };
      }
      emailAnalysis.by_sequence[seq].total++;
      emailAnalysis.by_sequence[seq][email.status]++;
    });

    // Note: AuditLogModel.find needs to be implemented or mocked
    const recentActivity: any[] = [];

    // Determine available actions based on campaign state and user permissions
    const canEdit = session.user.email === campaign.created_by || session.user.role === 'admin';
    const canApprove = session.user.role === 'admin' && campaign.requires_approval;
    const canGenerateEmails = !campaign.requires_approval || campaign.status === 'approved';
    const canSend = emails.length > 0 && (emails.some((e: any) => e.status === 'draft' || e.status === 'scheduled'));

    const availableActions = [];
    if (canEdit) availableActions.push('edit', 'delete');
    if (canApprove && campaign.status === 'pending_approval') availableActions.push('approve', 'reject');
    if (canGenerateEmails && campaign.status !== 'completed') availableActions.push('generate_emails');
    if (canSend) availableActions.push('send_emails', 'schedule_emails');
    if (campaign.status === 'active') availableActions.push('pause');
    if (campaign.status === 'paused') availableActions.push('resume');

    const response = {
      success: true,
      campaign: {
        ...campaign,
        template: template ? {
          id: template._id,
          name: template.name,
          subject: template.subject,
          preview: template.content.substring(0, 200) + '...'
        } : null
      },
      email_analysis: emailAnalysis,
      permissions: {
        can_edit: canEdit,
        can_approve: canApprove,
        can_generate_emails: canGenerateEmails,
        can_send: canSend
      },
      available_actions: availableActions,
      recent_activity: recentActivity.slice(0, 5),
      next_scheduled: emails
        .filter((e: any) => e.status === 'scheduled' && e.scheduled_date && new Date(e.scheduled_date) > new Date())
        .sort((a: any, b: any) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
        .slice(0, 3)
    };

    console.log(`✅ Retrieved campaign ${id} with ${emails.length} emails`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Get email campaign error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch email campaign',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

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
    const {
      name,
      description,
      assigned_to,
      schedule_settings,
      status,
      requires_approval
    } = body;

    const { id } = await params;

    console.log(`📝 Updating email campaign ${id} for ${session.user.email}`);

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

    // Prevent modifications if campaign is completed or if emails have been sent
    const hasEmailsSent = campaign.generated_emails?.some((e: any) => e.status === 'sent');
    if (campaign.status === 'completed' || hasEmailsSent) {
      return NextResponse.json(
        { error: 'Cannot modify campaign with sent emails or completed status' },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: any = {
      updated_at: new Date(),
      updated_by: session.user.email
    };

    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (assigned_to) updateData.assigned_to = assigned_to;
    if (schedule_settings) updateData.schedule_settings = { ...campaign.schedule_settings, ...schedule_settings };

    // Only admin can change approval requirements and status
    if (session.user.role === 'admin') {
      if (requires_approval !== undefined) updateData.requires_approval = requires_approval;
      if (status) updateData.status = status;
    }

    await CampaignModel.update(id, updateData);

    // Get the updated campaign
    const updatedCampaign = await CampaignModel.findById(id);

    // Log the update
    await AuditLogModel.logAction(
      session.user.id,
      'email_campaign_updated',
      'campaign',
      id,
      {
        updated_fields: Object.keys(updateData),
        updated_by: session.user.email
      }
    );

    console.log(`✅ Updated email campaign ${id}`);

    return NextResponse.json({
      success: true,
      campaign: updatedCampaign,
      message: 'Campaign updated successfully'
    });

  } catch (error) {
    console.error('❌ Update email campaign error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update email campaign',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    console.log(`🗑️ Deleting email campaign ${id} for ${session.user.email}`);

    // Check access permissions - only creators and admins can delete
    const accessFilter: any = { _id: new ObjectId(id) };
    if (session.user.role !== 'admin') {
      accessFilter.created_by = session.user.email;
    }

    // Get campaign and check access manually
    const campaign = await CampaignModel.findById(id);

    // Check access permissions manually
    if (!campaign || (session.user.role !== 'admin' && campaign.created_by !== session.user.email)) {
      return NextResponse.json(
        { error: 'Campaign not found or access denied' },
        { status: 404 }
      );
    }

    // Prevent deletion if any emails have been sent
    const hasEmailsSent = campaign.generated_emails?.some((e: any) => e.status === 'sent');
    if (hasEmailsSent) {
      return NextResponse.json(
        { error: 'Cannot delete campaign with sent emails. Archive it instead.' },
        { status: 400 }
      );
    }

    // Soft delete by updating status
    await CampaignModel.update(id, {
      status: 'deleted',
      deleted_at: new Date(),
      deleted_by: session.user.email
    });

    // Log the deletion
    await AuditLogModel.logAction(
      session.user.id,
      'email_campaign_deleted',
      'campaign',
      id,
      {
        campaign_name: campaign.name,
        deleted_by: session.user.email
      }
    );

    console.log(`✅ Deleted email campaign ${id}`);

    return NextResponse.json({
      success: true,
      message: 'Campaign deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete email campaign error:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete email campaign',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}