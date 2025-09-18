import Anthropic from '@anthropic-ai/sdk';
import { env } from './env';

let claudeClient: Anthropic | null = null;

export function getClaudeClient(): Anthropic {
  if (!claudeClient) {
    claudeClient = new Anthropic({
      apiKey: env.claude.apiKey,
    });
  }
  return claudeClient;
}

export interface EmailGenerationRequest {
  companyName: string;
  firstName: string;
  lastName: string;
  useCase?: string;
  emailSequence: number; // 1, 2, 3, or 4
  customPrompt?: string;
}

export interface EmailGenerationResponse {
  subject: string;
  body: string;
  emailSequence: number;
}

export async function generateEmail(request: EmailGenerationRequest): Promise<EmailGenerationResponse> {
  const client = getClaudeClient();

  const prompt = request.customPrompt || `
You are an expert email copywriter for Ably, a real-time data synchronization platform.

Generate a professional outreach email for:
- Company: ${request.companyName}
- Contact: ${request.firstName} ${request.lastName}
- Use Case: ${request.useCase || 'Not specified'}
- Email #${request.emailSequence} in sequence

Guidelines:
1. Keep subject lines under 50 characters
2. Email body should be 150-200 words
3. Professional but friendly tone
4. Focus on value proposition for their specific use case
5. Include a clear call-to-action
6. Email sequence context:
   - Email 1: Introduction and value proposition
   - Email 2: Social proof and case studies
   - Email 3: Technical benefits and ROI
   - Email 4: Final follow-up with special offer

Return ONLY a JSON object with "subject" and "body" fields.
`;

  try {
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    const parsedResponse = JSON.parse(content.text);

    return {
      subject: parsedResponse.subject,
      body: parsedResponse.body,
      emailSequence: request.emailSequence,
    };
  } catch (error) {
    console.error('❌ Claude email generation failed:', error);
    throw new Error(`Failed to generate email: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function testClaudeConnection(): Promise<boolean> {
  try {
    const client = getClaudeClient();

    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: 'Respond with "OK" to confirm the connection is working.',
        },
      ],
    });

    const content = response.content[0];
    return content.type === 'text' && content.text.includes('OK');
  } catch (error) {
    console.error('❌ Claude connection test failed:', error);
    return false;
  }
}