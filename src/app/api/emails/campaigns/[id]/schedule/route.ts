import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CampaignModel, AuditLogModel } from '@/lib/models';
import { ObjectId } from 'mongodb';

// Email scheduling utility functions
class EmailScheduler {
  static calculateScheduleDates(
    campaignSettings: any,
    emailCount: number,
    sequences: number[] = [1]
  ): Date[] {
    const {
      delay_between_emails = 7, // days
      send_time_window = { start: '09:00', end: '17:00' },
      timezone = 'UTC',
      exclude_weekends = true,
      start_date
    } = campaignSettings;

    const schedules: Date[] = [];
    const baseDate = start_date ? new Date(start_date) : new Date();

    // Ensure we start on a weekday if weekends are excluded
    let currentDate = new Date(baseDate);
    if (exclude_weekends) {
      while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    sequences.forEach((sequence, seqIndex) => {
      for (let emailIndex = 0; emailIndex < emailCount; emailIndex++) {
        const emailDate = new Date(currentDate);

        // Add delay for each sequence after the first
        if (seqIndex > 0) {
          emailDate.setDate(emailDate.getDate() + (seqIndex * delay_between_emails));
        }

        // Randomize time within the send window to avoid spam detection
        const [startHour, startMin] = send_time_window.start.split(':').map(Number);
        const [endHour, endMin] = send_time_window.end.split(':').map(Number);

        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;
        const randomMinutes = Math.floor(Math.random() * (endMinutes - startMinutes)) + startMinutes;

        emailDate.setHours(Math.floor(randomMinutes / 60), randomMinutes % 60, 0, 0);

        // Skip weekends if configured
        if (exclude_weekends) {
          while (emailDate.getDay() === 0 || emailDate.getDay() === 6) {
            emailDate.setDate(emailDate.getDate() + 1);
          }
        }

        schedules.push(new Date(emailDate));

        // Add small random delay between emails (1-3 minutes) to avoid bulk sending detection
        currentDate.setMinutes(currentDate.getMinutes() + Math.floor(Math.random() * 3) + 1);
      }
    });

    return schedules.sort((a, b) => a.getTime() - b.getTime());
  }

  static validateScheduleSettings(settings: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (settings.delay_between_emails && (settings.delay_between_emails < 1 || settings.delay_between_emails > 30)) {
      errors.push('Delay between emails must be between 1 and 30 days');
    }

    if (settings.send_time_window) {
      const { start, end } = settings.send_time_window;
      if (!start || !end || !/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) {
        errors.push('Send time window must have valid start and end times (HH:MM format)');
      }
    }

    if (settings.start_date && new Date(settings.start_date) < new Date()) {
      errors.push('Start date cannot be in the past');
    }

    return { valid: errors.length === 0, errors };
  }
}

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
    const {
      schedule_type = 'immediate', // 'immediate' | 'scheduled' | 'custom'
      schedule_settings,
      start_date,
      preview_only = false
    } = body;

    const { id } = await params;

    console.log(`📅 Scheduling emails for campaign ${id} (${schedule_type})`);

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

    // Validate campaign state
    if (campaign.requires_approval && campaign.status !== 'approved') {
      return NextResponse.json(
        { error: 'Campaign must be approved before scheduling' },
        { status: 400 }
      );
    }

    if (!campaign.generated_emails || campaign.generated_emails.length === 0) {
      return NextResponse.json(
        { error: 'No emails generated for this campaign. Generate emails first.' },
        { status: 400 }
      );
    }

    // Merge schedule settings
    const finalScheduleSettings = {
      ...campaign.schedule_settings,
      ...schedule_settings,
      start_date: start_date || new Date()
    };

    // Validate schedule settings
    const validation = EmailScheduler.validateScheduleSettings(finalScheduleSettings);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid schedule settings', details: validation.errors },
        { status: 400 }
      );
    }

    const emails = campaign.generated_emails;
    const emailsBySequence = emails.reduce((acc: any, email: any) => {
      const seq = email.sequence || 1;
      if (!acc[seq]) acc[seq] = [];
      acc[seq].push(email);
      return acc;
    }, {});

    let scheduledEmails: any[] = [];

    if (schedule_type === 'immediate') {
      // Schedule all emails for immediate sending (within the next hour)
      const now = new Date();
      emails.forEach((email: any, index: number) => {
        const scheduleDate = new Date(now.getTime() + (index * 2 * 60 * 1000)); // 2 minutes apart
        scheduledEmails.push({
          ...email,
          scheduled_date: scheduleDate,
          status: 'scheduled'
        });
      });

    } else if (schedule_type === 'scheduled') {
      // Use intelligent scheduling based on campaign settings
      const sequences = Object.keys(emailsBySequence).map(Number);
      const accountCount = campaign.target_accounts.length;

      const scheduleDates = EmailScheduler.calculateScheduleDates(
        finalScheduleSettings,
        accountCount,
        sequences
      );

      let dateIndex = 0;
      sequences.forEach(sequence => {
        emailsBySequence[sequence].forEach((email: any) => {
          scheduledEmails.push({
            ...email,
            scheduled_date: scheduleDates[dateIndex % scheduleDates.length],
            status: 'scheduled'
          });
          dateIndex++;
        });
      });

    } else if (schedule_type === 'custom') {
      // Custom scheduling - user provides specific dates for each email
      if (!body.custom_schedules || !Array.isArray(body.custom_schedules)) {
        return NextResponse.json(
          { error: 'Custom schedules required for custom schedule type' },
          { status: 400 }
        );
      }

      const customSchedules = new Map(
        body.custom_schedules.map((cs: any) => [`${cs.account_id}-${cs.sequence}`, cs.scheduled_date])
      );

      emails.forEach((email: any) => {
        const key = `${email.account_id}-${email.sequence}`;
        const customDate = customSchedules.get(key);

        scheduledEmails.push({
          ...email,
          scheduled_date: customDate ? new Date(customDate) : new Date(),
          status: 'scheduled'
        });
      });
    }

    // Preview mode - just return the schedule without saving
    if (preview_only) {
      const preview = {
        schedule_type,
        total_emails: scheduledEmails.length,
        schedule_summary: {
          earliest: Math.min(...scheduledEmails.map(e => new Date(e.scheduled_date).getTime())),
          latest: Math.max(...scheduledEmails.map(e => new Date(e.scheduled_date).getTime())),
          by_sequence: Object.keys(emailsBySequence).reduce((acc: any, seq) => {
            const seqEmails = scheduledEmails.filter(e => e.sequence == seq);
            acc[seq] = {
              count: seqEmails.length,
              first_send: Math.min(...seqEmails.map(e => new Date(e.scheduled_date).getTime())),
              last_send: Math.max(...seqEmails.map(e => new Date(e.scheduled_date).getTime()))
            };
            return acc;
          }, {})
        },
        sample_schedule: scheduledEmails.slice(0, 10).map(e => ({
          account_id: e.account_id,
          sequence: e.sequence,
          scheduled_date: e.scheduled_date,
          subject: e.subject
        }))
      };

      return NextResponse.json({
        success: true,
        preview: true,
        schedule_preview: preview
      });
    }

    // Update campaign with scheduled emails
    await CampaignModel.update(id, {
      generated_emails: scheduledEmails,
      status: 'active',
      schedule_settings: finalScheduleSettings,
      scheduled_at: new Date(),
      scheduled_by: session.user.email
    });

    // Get the updated campaign
    const updatedCampaign = await CampaignModel.findById(id);

    // Log the scheduling
    await AuditLogModel.logAction(
      session.user.id,
      'campaign_emails_scheduled',
      'campaign',
      id,
      {
        schedule_type,
        total_emails: scheduledEmails.length,
        earliest_send: Math.min(...scheduledEmails.map(e => new Date(e.scheduled_date).getTime())),
        latest_send: Math.max(...scheduledEmails.map(e => new Date(e.scheduled_date).getTime())),
        scheduled_by: session.user.email
      }
    );

    const response = {
      success: true,
      campaign_id: id,
      scheduled_emails: scheduledEmails.length,
      schedule_summary: {
        earliest_send: new Date(Math.min(...scheduledEmails.map(e => new Date(e.scheduled_date).getTime()))),
        latest_send: new Date(Math.max(...scheduledEmails.map(e => new Date(e.scheduled_date).getTime()))),
        by_sequence: Object.keys(emailsBySequence).reduce((acc: any, seq) => {
          const seqEmails = scheduledEmails.filter(e => e.sequence == seq);
          acc[seq] = {
            count: seqEmails.length,
            next_send: seqEmails.length > 0 ?
              new Date(Math.min(...seqEmails.map(e => new Date(e.scheduled_date).getTime()))) : null
          };
          return acc;
        }, {})
      },
      next_steps: [
        'Monitor campaign status',
        'Check scheduled emails before send time',
        'Review delivery reports after sending'
      ]
    };

    console.log(`✅ Scheduled ${scheduledEmails.length} emails for campaign ${id}`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Email scheduling error:', error);
    return NextResponse.json(
      {
        error: 'Failed to schedule emails',
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

    console.log(`📅 Getting schedule status for campaign ${id}`);

    const campaign = await CampaignModel.findById(id);
    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    const emails = campaign.generated_emails || [];
    const now = new Date();

    const scheduleAnalysis = {
      total_emails: emails.length,
      scheduled_emails: emails.filter((e: any) => e.status === 'scheduled').length,
      pending_emails: emails.filter((e: any) =>
        e.status === 'scheduled' && new Date(e.scheduled_date) > now
      ).length,
      overdue_emails: emails.filter((e: any) =>
        e.status === 'scheduled' && new Date(e.scheduled_date) <= now
      ).length,
      sent_emails: emails.filter((e: any) => e.status === 'sent').length,
      next_scheduled: emails
        .filter((e: any) => e.status === 'scheduled' && new Date(e.scheduled_date) > now)
        .sort((a: any, b: any) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
        .slice(0, 5),
      schedule_settings: campaign.schedule_settings,
      campaign_status: campaign.status
    };

    return NextResponse.json({
      success: true,
      campaign_id: id,
      schedule_analysis
    });

  } catch (error) {
    console.error('❌ Get schedule status error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get schedule status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}