import { google } from 'googleapis';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AuditLogModel } from '@/lib/models';

export interface EmailToSend {
  to: string;
  subject: string;
  content: string;
  account_id: string;
  campaign_id: string;
  sequence: number;
  scheduled_date?: Date;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  cost?: number;
  sent_at: Date;
}

export interface BulkSendResult {
  total_sent: number;
  total_failed: number;
  results: (SendEmailResult & { account_id: string; sequence: number })[];
  total_cost: number;
  send_time: number;
}

export class GmailService {
  private static async getOAuth2Client() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      throw new Error('User not authenticated');
    }

    // Get OAuth2 credentials from session
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    );

    // Note: NextAuth doesn't expose OAuth tokens by default for security
    // This would require additional configuration to access Gmail tokens
    // For now, we'll always use mock mode unless explicitly configured
    throw new Error('Gmail OAuth tokens not available. Configure NextAuth to expose tokens or use mock mode.');

    return oauth2Client;
  }

  private static async getGmailApi() {
    const auth = await this.getOAuth2Client();
    return google.gmail({ version: 'v1', auth });
  }

  /**
   * Send a single email via Gmail API
   */
  static async sendEmail(emailData: EmailToSend): Promise<SendEmailResult> {
    const startTime = Date.now();

    try {
      console.log(`📧 Sending email to ${emailData.to} for account ${emailData.account_id}`);

      // Check if this is a mock/test environment
      if (process.env.GMAIL_MOCK_MODE === 'true') {
        // Simulate sending time
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

        const mockResult: SendEmailResult = {
          success: true,
          messageId: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          cost: 0, // No cost for mock sends
          sent_at: new Date()
        };

        console.log(`✅ Mock email sent to ${emailData.to}`);
        return mockResult;
      }

      // Real Gmail API implementation
      const gmail = await this.getGmailApi();

      // Create the email message
      const emailMessage = this.createEmailMessage(emailData);

      // Send the email
      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: emailMessage
        }
      });

      const result: SendEmailResult = {
        success: true,
        messageId: response.data.id,
        cost: 0, // Gmail API is free
        sent_at: new Date()
      };

      console.log(`✅ Email sent successfully to ${emailData.to}, messageId: ${response.data.id}`);
      return result;

    } catch (error) {
      console.error(`❌ Failed to send email to ${emailData.to}:`, error);

      const result: SendEmailResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Gmail error',
        sent_at: new Date()
      };

      return result;
    }
  }

  /**
   * Send multiple emails in bulk with rate limiting
   */
  static async sendBulkEmails(
    emails: EmailToSend[],
    options: {
      batchSize?: number;
      delayMs?: number;
      userId: string;
    }
  ): Promise<BulkSendResult> {
    const { batchSize = 10, delayMs = 1000, userId } = options;
    const startTime = Date.now();

    console.log(`📬 Starting bulk send of ${emails.length} emails`);

    const results: (SendEmailResult & { account_id: string; sequence: number })[] = [];
    let totalSent = 0;
    let totalFailed = 0;
    let totalCost = 0;

    // Process emails in batches to respect rate limits
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);

      console.log(`📨 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(emails.length / batchSize)}`);

      // Send batch in parallel
      const batchPromises = batch.map(async (email) => {
        const result = await this.sendEmail(email);
        return {
          ...result,
          account_id: email.account_id,
          sequence: email.sequence
        };
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Update counters
      batchResults.forEach(result => {
        if (result.success) {
          totalSent++;
        } else {
          totalFailed++;
        }
        totalCost += result.cost || 0;
      });

      // Add delay between batches (except for the last batch)
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    const endTime = Date.now();
    const sendTime = (endTime - startTime) / 1000;

    // Log the bulk send operation
    await AuditLogModel.logAction(
      userId,
      'bulk_emails_sent',
      'gmail',
      'bulk_send',
      {
        total_emails: emails.length,
        successful: totalSent,
        failed: totalFailed,
        send_time: sendTime,
        total_cost: totalCost
      }
    );

    const bulkResult: BulkSendResult = {
      total_sent: totalSent,
      total_failed: totalFailed,
      results,
      total_cost: totalCost,
      send_time: sendTime
    };

    console.log(`✅ Bulk send completed: ${totalSent} sent, ${totalFailed} failed in ${sendTime.toFixed(1)}s`);
    return bulkResult;
  }

  /**
   * Create base64-encoded email message for Gmail API
   */
  private static createEmailMessage(emailData: EmailToSend): string {
    const { to, subject, content } = emailData;

    // Create the email headers and content
    const emailLines = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      '',
      content
    ];

    const email = emailLines.join('\r\n');

    // Convert to base64url format required by Gmail API
    const encodedEmail = Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    return encodedEmail;
  }

  /**
   * Check Gmail API connection and permissions
   */
  static async checkGmailConnection(): Promise<{
    connected: boolean;
    error?: string;
    profile?: {
      emailAddress?: string;
      messagesTotal?: number;
      threadsTotal?: number;
      historyId?: string;
      mock_mode?: boolean;
    };
  }> {
    try {
      if (process.env.GMAIL_MOCK_MODE === 'true') {
        return {
          connected: true,
          profile: {
            emailAddress: 'mock@ably.com',
            messagesTotal: 1000,
            mock_mode: true
          }
        };
      }

      const gmail = await this.getGmailApi();
      const profile = await gmail.users.getProfile({ userId: 'me' });

      return {
        connected: true,
        profile: profile.data
      };

    } catch (error) {
      console.error('Gmail connection error:', error);
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get Gmail sending quotas and limits
   */
  static getGmailLimits() {
    return {
      daily_send_limit: 500, // Gmail API limit for most accounts
      per_second_limit: 5,   // Conservative rate limit
      recommended_batch_size: 10,
      recommended_delay_ms: 1000
    };
  }
}

export default GmailService;