import { google } from 'googleapis';
import { env } from './env';

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
  html?: boolean;
  bcc?: string;
}

export interface EmailSendResult {
  messageId: string;
  success: boolean;
  error?: string;
}

export async function createGmailClient(accessToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    env.google.clientId, // Using the same OAuth client as auth
    env.google.clientSecret,
    'http://localhost:3000/api/auth/callback/google'
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

export function createEmailMessage(email: EmailMessage): string {
  const boundary = 'boundary_' + Math.random().toString(36).substring(2);

  let message = [
    `To: ${email.to}`,
    `Subject: ${email.subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary=${boundary}`,
    '',
    `--${boundary}`,
    `Content-Type: text/plain; charset=utf-8`,
    `Content-Transfer-Encoding: quoted-printable`,
    '',
    email.html ? email.body.replace(/<[^>]*>/g, '') : email.body, // Strip HTML for plain text
    '',
  ];

  if (email.html) {
    message = message.concat([
      `--${boundary}`,
      `Content-Type: text/html; charset=utf-8`,
      `Content-Transfer-Encoding: quoted-printable`,
      '',
      email.body,
      '',
    ]);
  }

  if (email.bcc) {
    message.splice(1, 0, `Bcc: ${email.bcc}`);
  }

  message.push(`--${boundary}--`);

  return message.join('\n');
}

export async function sendEmail(
  accessToken: string,
  email: EmailMessage
): Promise<EmailSendResult> {
  try {
    const gmail = await createGmailClient(accessToken);
    const rawMessage = createEmailMessage(email);

    const encodedMessage = Buffer.from(rawMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    console.log(`✅ Email sent successfully to ${email.to}, Message ID: ${response.data.id}`);

    return {
      messageId: response.data.id || '',
      success: true,
    };
  } catch (error) {
    console.error('❌ Gmail send error:', error);
    return {
      messageId: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function testGmailConnection(accessToken: string): Promise<boolean> {
  try {
    const gmail = await createGmailClient(accessToken);
    const response = await gmail.users.getProfile({ userId: 'me' });

    console.log(`✅ Gmail connection successful for: ${response.data.emailAddress}`);
    return true;
  } catch (error) {
    console.error('❌ Gmail connection test failed:', error);
    return false;
  }
}