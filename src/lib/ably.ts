import Ably from 'ably';
import { env } from './env';

let ablyClient: Ably.Realtime | null = null;

export function getAblyClient(): Ably.Realtime {
  if (!ablyClient) {
    ablyClient = new Ably.Realtime({
      key: env.ably.apiKey,
      clientId: 'outreach-dashboard-server',
    });
  }
  return ablyClient;
}

export interface CampaignUpdateEvent {
  type: 'campaign_created' | 'email_sent' | 'email_approved' | 'campaign_status_changed';
  campaignId: string;
  userId: string;
  data: Record<string, any>;
  timestamp: string;
}

export async function publishCampaignUpdate(event: CampaignUpdateEvent): Promise<void> {
  try {
    const client = getAblyClient();
    const channel = client.channels.get('campaigns');

    await channel.publish('update', event);
    console.log(`✅ Published Ably event: ${event.type} for campaign ${event.campaignId}`);
  } catch (error) {
    console.error('❌ Failed to publish Ably event:', error);
    throw error;
  }
}

export async function publishEmailUpdate(
  emailId: string,
  status: 'pending' | 'sent' | 'failed',
  recipientEmail: string,
  campaignId: string
): Promise<void> {
  const event: CampaignUpdateEvent = {
    type: 'email_sent',
    campaignId,
    userId: recipientEmail,
    data: {
      emailId,
      status,
      recipientEmail,
    },
    timestamp: new Date().toISOString(),
  };

  await publishCampaignUpdate(event);
}

export async function testAblyConnection(): Promise<boolean> {
  try {
    const client = getAblyClient();

    return new Promise((resolve) => {
      client.connection.on('connected', () => {
        console.log('✅ Ably connection successful');
        resolve(true);
      });

      client.connection.on('failed', (error) => {
        console.error('❌ Ably connection failed:', error);
        resolve(false);
      });

      client.connection.on('disconnected', () => {
        console.warn('⚠️ Ably disconnected');
        resolve(false);
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (client.connection.state !== 'connected') {
          console.error('❌ Ably connection timeout');
          resolve(false);
        }
      }, 10000);
    });
  } catch (error) {
    console.error('❌ Ably connection test failed:', error);
    return false;
  }
}

export function closeAblyConnection(): void {
  if (ablyClient) {
    ablyClient.close();
    ablyClient = null;
    console.log('🔌 Ably connection closed');
  }
}