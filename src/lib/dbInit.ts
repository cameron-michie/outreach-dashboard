import { getDatabase, COLLECTIONS } from './db';

export async function initializeDatabase(): Promise<void> {
  const db = await getDatabase();

  // Users collection indexes
  const usersCollection = db.collection(COLLECTIONS.USERS);
  await usersCollection.createIndex({ email: 1 }, { unique: true });
  await usersCollection.createIndex({ googleId: 1 }, { unique: true });
  await usersCollection.createIndex({ role: 1 });
  await usersCollection.createIndex({ isActive: 1 });

  // Email campaigns collection indexes
  const campaignsCollection = db.collection(COLLECTIONS.EMAIL_CAMPAIGNS);
  await campaignsCollection.createIndex({ companyName: 1 });
  await campaignsCollection.createIndex({ ablyAccountId: 1 });
  await campaignsCollection.createIndex({ ablyUserId: 1 });
  await campaignsCollection.createIndex({ assignedTo: 1 });
  await campaignsCollection.createIndex({ status: 1 });
  await campaignsCollection.createIndex({ createdAt: -1 });
  await campaignsCollection.createIndex({ 'emails.status': 1 });
  await campaignsCollection.createIndex({ 'emails.scheduledDate': 1 });
  await campaignsCollection.createIndex({
    'emails.scheduledDate': 1,
    'emails.status': 1
  });

  // Email templates collection indexes
  const templatesCollection = db.collection(COLLECTIONS.EMAIL_TEMPLATES);
  await templatesCollection.createIndex({ name: 1 }, { unique: true });
  await templatesCollection.createIndex({ isDefault: 1 });
  await templatesCollection.createIndex({ createdBy: 1 });

  // Audit logs collection indexes
  const auditLogsCollection = db.collection(COLLECTIONS.AUDIT_LOGS);
  await auditLogsCollection.createIndex({ userId: 1 });
  await auditLogsCollection.createIndex({ entityType: 1, entityId: 1 });
  await auditLogsCollection.createIndex({ timestamp: -1 });
  await auditLogsCollection.createIndex({ action: 1 });

  // TTL index for audit logs (optional - remove old logs after 1 year)
  await auditLogsCollection.createIndex(
    { timestamp: 1 },
    { expireAfterSeconds: 365 * 24 * 60 * 60 } // 1 year
  );

  console.log('Database indexes initialized successfully');
}

export async function createDefaultTemplate(): Promise<void> {
  const { EmailTemplateModel } = await import('./models');

  // Check if default template already exists
  const existingDefault = await EmailTemplateModel.findDefault();
  if (existingDefault) {
    console.log('Default email template already exists');
    return;
  }

  // Create default template using the outreach prompt
  const defaultTemplate = {
    name: 'Default Outreach Template',
    description: 'Default 4-email sequence template for ICP outreach',
    promptTemplate: `You are an expert Ably Solution Engineer, operating as an AI assistant for Cameron Michie. Your primary objective is to convert a high-potential, self-serve user from an Ideal Customer Profile (ICP) company, {{company}}, into a paying, committed-use customer by executing a personalized and story-driven email outreach campaign.

You will achieve this by following a structured two-phase process: Research & Synthesis, followed by Email Generation.

Phase 1: Research & Synthesis
Your first task is to build a comprehensive profile of the target. You must use the connected MCP server to query our internal systems (HubSpot, Metabase) and conduct external research. After each sub-step, you will summarize your findings.

Step 1.1: Internal Data Reconnaissance (MCP Query)
Query HubSpot and Metabase to find the following information. Commit these findings to memory.

Primary Info:
- The user's sign-up use case (the description they provided).
- Confirmation they are sending messages and the approximate volume (e.g., low, medium, high traffic).
- The date they last signed in.

Technical & Usage Info (Crucial for Personalization):
- What specific Ably SDKs are they using (e.g., ably-js, ably-java)? This reveals their tech stack.
- Are they using specific features like Presence, History, or Integrations?
- Are they approaching or hitting any free-tier limits (e.g., connections, channels, messages)?

If critical information like the contact's name or job title is missing, you must ask me for it before proceeding.

Internal Finding Summary: After completing this step, create a brief summary titled "Customer Snapshot".

Step 1.2: External Business & Technical Intelligence
Now, investigate the company's public presence.

Business Context: Review the {{company}} website (homepage, "About Us", "Products" pages) to understand their business model, their customers, and their value proposition. What do they do?

Technical Context: Review their careers page, specifically looking for engineering, DevOps, or SRE roles. Identify keywords related to their tech stack (e.g., programming languages, cloud providers, databases, architectural patterns like microservices or event-driven architecture).

External Finding Summary: After completing this step, create a summary titled "Business & Tech Hypothesis". This should be a one-paragraph hypothesis on why they are likely evaluating Ably and what business problem they might be trying to solve with real-time technology.

Phase 2: Email Campaign Generation
Using your findings from Phase 1, you will now generate a 4-email sequence.

The emails must follow a logical narrative arc. Each email builds on the last, guiding them from their initial use case to the broader value Ably can provide their entire business.

Email 1: The Relevant Opener (The Hook)
Goal: Show you've done your research and are not sending a generic blast.
Content: Start with a specific, relevant observation based on your research. For example, reference the SDK they are using or their sign-up use case. Ask a simple, open-ended question about their project.

Email 2: The Value-Add (Connecting the Dots)
Goal: Connect their current usage to a tangible Ably value proposition.
Content: Based on your "Business & Tech Hypothesis," explain how Ably can help them solve a specific problem. Offer a piece of relevant content like a blog post, a customer story, or a technical tutorial.

Email 3: The Broader Vision (Scaling Up)
Goal: Elevate the conversation from a single feature to architectural and business-level benefits.
Content: Discuss a strategic advantage of Ably, like our 99.999% uptime SLA, our global fault tolerance, or how we help engineering teams focus on core features instead of managing infrastructure. This is where you gently introduce the idea of a committed-use plan as a strategic partnership.

Email 4: The Professional "Breakup" (Closing the Loop)
Goal: Gracefully close the sequence, leave a positive impression, and keep the door open for the future without applying pressure.
Content: Acknowledge they are likely busy. State that you won't reach out again on this topic for now. Reiterate your role as a resource for any future real-time/event-driven architecture questions. End on a helpful, no-strings-attached note.

All emails should:
- Use a consultative, helpful tone
- Be brief and focused
- Include specific references to their use case and tech stack
- End with "Best Wishes, Cam"
- Include meeting link: https://meetings.hubspot.com/cameron-michie`,
    isDefault: true,
    createdBy: 'system',
  };

  await EmailTemplateModel.create(defaultTemplate);
  console.log('Default email template created successfully');
}