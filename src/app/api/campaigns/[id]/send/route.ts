import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CampaignModel, AuditLogModel } from '@/lib/models';
import { GmailService, EmailToSend } from '@/lib/gmail-service';
import { ObjectId } from 'mongodb';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      send_immediately = false,
      batch_size = 10,
      delay_minutes = 5,
      filter_sequences = [],
      dry_run = false
    } = body;

    console.log(`📬 Sending campaign ${params.id} (dry_run: ${dry_run})`);

    // Get campaign
    const campaign = await CampaignModel.findOne({
      _id: new ObjectId(params.id),
      user_id: session.user.id
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found or access denied' },
        { status: 404 }
      );
    }

    if (!campaign.generated_emails || campaign.generated_emails.length === 0) {
      return NextResponse.json(
        { error: 'No generated emails found in campaign. Generate emails first.' },
        { status: 400 }
      );
    }

    // Check Gmail connection
    const gmailStatus = await GmailService.checkGmailConnection();
    if (!gmailStatus.connected && !dry_run) {
      return NextResponse.json(
        {
          error: 'Gmail not connected',
          details: gmailStatus.error,
          suggestion: 'Please re-authenticate with Gmail permissions'
        },
        { status: 503 }
      );
    }

    // Filter emails to send
    let emailsToSend = campaign.generated_emails.filter((email: any) =>
      email.status === 'draft' || email.status === 'scheduled'
    );

    // Apply sequence filter if specified
    if (filter_sequences.length > 0) {
      emailsToSend = emailsToSend.filter((email: any) =>
        filter_sequences.includes(email.sequence)
      );
    }

    if (emailsToSend.length === 0) {
      return NextResponse.json(
        { error: 'No emails available to send. All emails may have already been sent.' },
        { status: 400 }
      );
    }

    // Prepare emails for Gmail service
    const gmailEmails: EmailToSend[] = emailsToSend.map((email: any) => ({
      to: email.variables_used?.contact_email || 'unknown@example.com',
      subject: email.subject,
      content: email.content,
      account_id: email.account_id,
      campaign_id: params.id,
      sequence: email.sequence,
      scheduled_date: email.scheduled_date ? new Date(email.scheduled_date) : undefined
    }));

    // Handle scheduled vs immediate sending
    const now = new Date();
    const readyToSend = send_immediately
      ? gmailEmails
      : gmailEmails.filter(email =>
          !email.scheduled_date || email.scheduled_date <= now
        );

    if (readyToSend.length === 0 && !send_immediately) {
      return NextResponse.json(
        {
          message: 'No emails are scheduled to send at this time',
          total_emails: emailsToSend.length,
          next_send_date: Math.min(
            ...gmailEmails
              .filter(e => e.scheduled_date && e.scheduled_date > now)
              .map(e => e.scheduled_date!.getTime())
          )
        }
      );
    }

    // Dry run - just return what would be sent
    if (dry_run) {
      const response = {
        success: true,
        dry_run: true,
        would_send: readyToSend.length,
        total_in_campaign: emailsToSend.length,
        gmail_connected: gmailStatus.connected,
        emails_preview: readyToSend.slice(0, 3).map(email => ({
          to: email.to,
          subject: email.subject,
          account_id: email.account_id,
          sequence: email.sequence,
          scheduled_date: email.scheduled_date
        })),
        batch_info: {
          batch_size,
          total_batches: Math.ceil(readyToSend.length / batch_size),
          estimated_time_minutes: Math.ceil(readyToSend.length / batch_size) * delay_minutes
        }
      };

      return NextResponse.json(response);
    }

    // Real sending
    console.log(`📤 Sending ${readyToSend.length} emails in batches of ${batch_size}`);

    const sendResult = await GmailService.sendBulkEmails(readyToSend, {
      batchSize: batch_size,
      delayMs: delay_minutes * 60 * 1000, // Convert minutes to milliseconds
      userId: session.user.id
    });

    // Update campaign with send results
    const updatedEmails = campaign.generated_emails.map((email: any) => {
      const sendResultForEmail = sendResult.results.find(
        r => r.account_id === email.account_id && r.sequence === email.sequence
      );

      if (sendResultForEmail) {
        return {
          ...email,
          status: sendResultForEmail.success ? 'sent' : 'failed',
          sent_at: sendResultForEmail.sent_at,
          message_id: sendResultForEmail.messageId,
          send_error: sendResultForEmail.error,
          updated_at: new Date()
        };
      }

      return email;
    });

    // Update campaign status
    const totalSent = updatedEmails.filter((e: any) => e.status === 'sent').length;
    const totalEmails = updatedEmails.length;
    const newStatus = totalSent === totalEmails ? 'completed' :
                     totalSent > 0 ? 'partially_sent' : 'failed';

    await CampaignModel.findOneAndUpdate(
      { _id: new ObjectId(params.id) },
      {
        $set: {
          generated_emails: updatedEmails,
          status: newStatus,
          send_metadata: {
            last_send_at: new Date(),
            total_sent: sendResult.total_sent,
            total_failed: sendResult.total_failed,
            send_time: sendResult.send_time,
            gmail_cost: sendResult.total_cost,
            sent_by: session.user.email
          },
          updated_at: new Date()
        }
      }
    );

    // Log the send operation
    await AuditLogModel.logAction(
      session.user.id,
      'campaign_emails_sent',
      'campaign',
      params.id,
      {
        emails_sent: sendResult.total_sent,
        emails_failed: sendResult.total_failed,
        send_time: sendResult.send_time,
        batch_size,
        delay_minutes
      }
    );

    const response = {
      success: true,
      campaign_id: params.id,
      send_results: {
        total_sent: sendResult.total_sent,
        total_failed: sendResult.total_failed,
        send_time: `${sendResult.send_time.toFixed(1)}s`,
        gmail_cost: sendResult.total_cost
      },
      campaign_status: newStatus,
      details: sendResult.results.map(r => ({
        account_id: r.account_id,
        sequence: r.sequence,
        success: r.success,
        message_id: r.messageId,
        error: r.error
      })),
      next_steps: totalSent < totalEmails
        ? 'Some emails remain unsent. Check campaign status and retry if needed.'
        : 'All emails sent successfully!'
    };

    console.log(`✅ Campaign send completed: ${sendResult.total_sent} sent, ${sendResult.total_failed} failed`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Campaign send error:', error);
    return NextResponse.json(
      {
        error: 'Failed to send campaign',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get campaign and send status
    const campaign = await CampaignModel.findOne({
      _id: new ObjectId(params.id),
      user_id: session.user.id
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found or access denied' },
        { status: 404 }
      );
    }

    // Check Gmail connection
    const gmailStatus = await GmailService.checkGmailConnection();
    const gmailLimits = GmailService.getGmailLimits();

    // Analyze campaign send status
    const emails = campaign.generated_emails || [];
    const sendStatus = {
      total_emails: emails.length,
      draft: emails.filter((e: any) => e.status === 'draft').length,
      scheduled: emails.filter((e: any) => e.status === 'scheduled').length,
      sent: emails.filter((e: any) => e.status === 'sent').length,
      failed: emails.filter((e: any) => e.status === 'failed').length
    };

    // Find next scheduled emails
    const now = new Date();
    const nextScheduled = emails
      .filter((e: any) => e.status === 'scheduled' && e.scheduled_date && new Date(e.scheduled_date) > now)
      .sort((a: any, b: any) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
      .slice(0, 5);

    const response = {
      success: true,
      campaign_id: params.id,
      campaign_status: campaign.status,
      send_status: sendStatus,
      ready_to_send: sendStatus.draft + sendStatus.scheduled,
      gmail_connection: gmailStatus,
      gmail_limits: gmailLimits,
      next_scheduled: nextScheduled.map((e: any) => ({
        account_id: e.account_id,
        sequence: e.sequence,
        scheduled_date: e.scheduled_date,
        subject: e.subject
      })),
      send_metadata: campaign.send_metadata || null,
      recommendations: {
        batch_size: Math.min(gmailLimits.recommended_batch_size, sendStatus.total_emails),
        estimated_send_time: Math.ceil(sendStatus.total_emails / gmailLimits.recommended_batch_size) * 2 // 2 minutes per batch
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Campaign send status error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get send status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}