import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CampaignModel, TemplateModel, AuditLogModel } from '@/lib/models';
import { executeSnowflakeQuery } from '@/lib/snowflake';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const status = searchParams.get('status');
    const assignedTo = searchParams.get('assigned_to');
    const requiresApproval = searchParams.get('requires_approval');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    console.log(`📋 Fetching email campaigns for ${session.user.email} - Page ${page}, Limit ${limit}`);

    // Build filters
    const filters: any = {};

    // Users can only see campaigns they created or are assigned to (unless admin)
    if (session.user.role !== 'admin') {
      filters.$or = [
        { created_by: session.user.email },
        { assigned_to: session.user.email }
      ];
    }

    if (status) {
      filters.status = status;
    }

    if (assignedTo) {
      filters.assigned_to = assignedTo;
    }

    if (requiresApproval !== null) {
      filters.requires_approval = requiresApproval === 'true';
    }

    if (startDate || endDate) {
      filters.created_at = {};
      if (startDate) {
        filters.created_at.$gte = new Date(startDate);
      }
      if (endDate) {
        filters.created_at.$lte = new Date(endDate);
      }
    }

    // Use findAll with manual pagination since findPaginated doesn't exist
    const allCampaigns = await CampaignModel.findAll(filters);

    // Manual pagination
    const skip = (page - 1) * limit;
    const data = allCampaigns.slice(skip, skip + limit);
    const total = allCampaigns.length;
    const campaigns = {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };

    // Enhance with additional metadata
    const enhancedCampaigns = campaigns.data.map((campaign: any) => {
      const emails = campaign.generated_emails || [];
      const totalEmails = emails.length;
      const draftEmails = emails.filter((e: any) => e.status === 'draft').length;
      const scheduledEmails = emails.filter((e: any) => e.status === 'scheduled').length;
      const sentEmails = emails.filter((e: any) => e.status === 'sent').length;
      const failedEmails = emails.filter((e: any) => e.status === 'failed').length;

      // Calculate next scheduled email
      const now = new Date();
      const nextScheduled = emails
        .filter((e: any) => e.status === 'scheduled' && e.scheduled_date && new Date(e.scheduled_date) > now)
        .sort((a: any, b: any) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())[0];

      return {
        ...campaign,
        email_summary: {
          total: totalEmails,
          draft: draftEmails,
          scheduled: scheduledEmails,
          sent: sentEmails,
          failed: failedEmails,
          next_scheduled: nextScheduled ? {
            date: nextScheduled.scheduled_date,
            account_id: nextScheduled.account_id,
            sequence: nextScheduled.sequence
          } : null
        },
        requires_attention: campaign.status === 'failed' || failedEmails > 0 ||
                          (campaign.requires_approval && campaign.status === 'pending_approval')
      };
    });

    const response = {
      ...campaigns,
      data: enhancedCampaigns,
      summary: {
        total_campaigns: campaigns.total,
        by_status: allCampaigns.reduce((acc: any, campaign: any) => {
          acc[campaign.status] = (acc[campaign.status] || 0) + 1;
          return acc;
        }, {}),
        // Note: recent_activity would need to be implemented in AuditLogModel
        recent_activity: []
      }
    };

    console.log(`✅ Retrieved ${enhancedCampaigns.length} campaigns (${campaigns.total} total)`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Email campaigns API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch email campaigns',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      template_id,
      target_accounts,
      assigned_to,
      requires_approval,
      schedule_settings,
      email_sequences
    } = body;

    // Validate required fields
    if (!name || !template_id || !target_accounts || !Array.isArray(target_accounts)) {
      return NextResponse.json(
        { error: 'Missing required fields: name, template_id, target_accounts' },
        { status: 400 }
      );
    }

    // Validate template exists
    const template = await TemplateModel.findById(template_id);
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Validate target accounts exist in Snowflake
    const accountIds = target_accounts.join(',');
    const accountQuery = `
      SELECT ably_account_id, company_name, user_email, first_name, last_name
      FROM (${require('@/lib/snowflake').ICP_QUERY}) icp_data
      WHERE ably_account_id IN (${accountIds})
    `;

    const accountsData = await executeSnowflakeQuery(accountQuery);
    if (!accountsData || accountsData.length === 0) {
      return NextResponse.json(
        { error: 'No valid target accounts found in database' },
        { status: 400 }
      );
    }

    const validAccountIds = accountsData.map((acc: any) => acc.ably_account_id.toString());
    const invalidAccounts = target_accounts.filter((id: string) => !validAccountIds.includes(id));

    if (invalidAccounts.length > 0) {
      return NextResponse.json(
        {
          error: 'Some target accounts not found',
          invalid_accounts: invalidAccounts,
          valid_accounts: validAccountIds
        },
        { status: 400 }
      );
    }

    console.log(`📝 Creating email campaign "${name}" for ${session.user.email}`);

    // Determine if approval is required
    const needsApproval = requires_approval ?? (accountsData.length > 50 || session.user.role !== 'admin');

    // Create campaign with enhanced structure
    const campaignData = {
      name,
      description: description || '',
      template_id,
      target_accounts: validAccountIds,
      assigned_to: assigned_to || session.user.email,
      created_by: session.user.email,
      requires_approval: needsApproval,
      status: needsApproval ? 'pending_approval' : 'draft',
      email_sequences: email_sequences || [1], // Default to single sequence
      schedule_settings: {
        delay_between_emails: schedule_settings?.delay_between_emails || 7, // days
        send_time_window: schedule_settings?.send_time_window || { start: '09:00', end: '17:00' },
        timezone: schedule_settings?.timezone || 'UTC',
        exclude_weekends: schedule_settings?.exclude_weekends ?? true
      },
      target_data: accountsData.map((acc: any) => ({
        account_id: acc.ably_account_id.toString(),
        company_name: acc.company_name,
        contact_email: acc.user_email,
        contact_name: `${acc.first_name} ${acc.last_name}`.trim(),
        icp_data: acc
      })),
      email_count: validAccountIds.length * (email_sequences?.length || 1),
      generated_emails: [], // Will be populated when emails are generated
      metadata: {
        created_via: 'api',
        template_name: template.name,
        total_sequences: email_sequences?.length || 1
      }
    };

    const campaign = await CampaignModel.create(campaignData);

    // Log campaign creation
    await AuditLogModel.logAction(
      session.user.id,
      'email_campaign_created',
      'campaign',
      campaign._id.toString(),
      {
        campaign_name: name,
        target_accounts: validAccountIds.length,
        requires_approval: needsApproval,
        assigned_to: assigned_to || session.user.email
      }
    );

    console.log(`✅ Email campaign created with ID: ${campaign._id}`);

    const response = {
      success: true,
      campaign: {
        id: campaign._id,
        name: campaign.name,
        status: campaign.status,
        requires_approval: campaign.requires_approval,
        target_accounts: validAccountIds.length,
        email_sequences: campaign.email_sequences.length,
        estimated_emails: campaign.email_count,
        assigned_to: campaign.assigned_to,
        created_by: campaign.created_by,
        created_at: campaign.created_at
      },
      next_steps: needsApproval
        ? 'Campaign requires approval before emails can be generated'
        : 'Campaign ready for email generation',
      actions_available: needsApproval
        ? ['view', 'edit', 'request_approval']
        : ['view', 'edit', 'generate_emails', 'schedule']
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('❌ Email campaign creation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create email campaign',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}