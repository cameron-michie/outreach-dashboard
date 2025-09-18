import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GmailService } from '@/lib/gmail-service';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('📧 Testing Gmail connection...');

    // Check Gmail connection
    const connectionStatus = await GmailService.checkGmailConnection();
    const limits = GmailService.getGmailLimits();

    const response = {
      success: true,
      gmail_status: connectionStatus,
      limits_and_quotas: limits,
      configuration: {
        mock_mode: process.env.GMAIL_MOCK_MODE === 'true',
        daily_send_limit: process.env.GMAIL_DAILY_SEND_LIMIT || '500',
        batch_size: process.env.GMAIL_BATCH_SIZE || '10',
        delay_ms: process.env.GMAIL_DELAY_MS || '1000'
      },
      user_info: {
        email: session.user.email,
        name: session.user.name,
        authenticated: true
      },
      next_steps: connectionStatus.connected
        ? 'Gmail is ready for sending emails'
        : 'Please re-authenticate with Gmail sending permissions',
      test_timestamp: new Date().toISOString()
    };

    console.log('✅ Gmail test completed');
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Gmail test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Gmail test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        suggestion: 'Check Gmail authentication and permissions'
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
    const { send_test_email = false, test_email_address } = body;

    if (!send_test_email) {
      return NextResponse.json(
        { error: 'Missing send_test_email parameter' },
        { status: 400 }
      );
    }

    const emailAddress = test_email_address || session.user.email;

    console.log(`📤 Sending test email to ${emailAddress}...`);

    // Send a test email
    const testEmail = {
      to: emailAddress,
      subject: `Outreach Dashboard Test Email - ${new Date().toISOString()}`,
      content: `
        <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Gmail Integration Test</h2>
            <p>This is a test email from the Outreach Dashboard Gmail integration.</p>

            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Test Details:</h3>
              <ul>
                <li><strong>Sent by:</strong> ${session.user.name} (${session.user.email})</li>
                <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
                <li><strong>Mock Mode:</strong> ${process.env.GMAIL_MOCK_MODE === 'true' ? 'Yes' : 'No'}</li>
                <li><strong>System:</strong> Outreach Dashboard v1.0</li>
              </ul>
            </div>

            <p>If you received this email, the Gmail integration is working correctly!</p>

            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              This email was sent as part of a system test. If you received this unexpectedly,
              please contact the system administrator.
            </p>
          </body>
        </html>
      `,
      account_id: 'test-account',
      campaign_id: 'test-campaign',
      sequence: 1
    };

    const sendResult = await GmailService.sendEmail(testEmail);

    const response = {
      success: sendResult.success,
      test_email: {
        to: emailAddress,
        subject: testEmail.subject,
        sent_at: sendResult.sent_at,
        message_id: sendResult.messageId,
        cost: sendResult.cost,
        error: sendResult.error
      },
      gmail_status: sendResult.success ? 'working' : 'failed',
      user: session.user.email,
      timestamp: new Date().toISOString()
    };

    if (sendResult.success) {
      console.log(`✅ Test email sent successfully to ${emailAddress}`);
    } else {
      console.log(`❌ Test email failed: ${sendResult.error}`);
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Gmail test send error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send test email',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}