// Core types for the outreach dashboard

export interface User {
  _id: string;
  googleId: string;
  email: string; // Must end with @ably.com
  name: string;
  picture?: string;
  role: 'admin' | 'user';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailCampaign {
  _id: string;
  companyName: string;
  contactName?: string;
  contactEmail?: string;
  ablyAccountId: string;
  ablyUserId: string;
  customerSnapshot: string; // Research phase 1
  businessHypothesis: string; // Research phase 1
  emails: EmailSequence[];
  assignedTo: string; // User email
  requiresApproval: boolean;
  status: 'active' | 'paused' | 'completed';
  icpData: ICPData;
  createdBy: string; // User email
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailSequence {
  emailNumber: 1 | 2 | 3 | 4;
  subject: string;
  content: string;
  scheduledDate: Date;
  status: 'draft' | 'scheduled' | 'pending_approval' | 'approved' | 'sent' | 'failed';
  sentAt?: Date;
  sentBy?: string; // User email who sent it
  gmailMessageId?: string;
  approvedBy?: string; // User email who approved it
  approvedAt?: Date;
}

export interface ICPData {
  dtCreatedAt: Date;
  dtSdkConnect?: Date;
  lastSignInAt?: Date;
  useCase?: string;
  signInCount: number;
  messages?: number;
  peakConnections?: number;
  peakChannels?: number;
  icpIntent: 'yes' | 'no';
}

export interface EmailTemplate {
  _id: string;
  name: string;
  description: string;
  promptTemplate: string; // Claude prompt template
  isDefault: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  _id: string;
  userId: string;
  action: string;
  entityType: 'campaign' | 'email' | 'template';
  entityId: string;
  details: Record<string, unknown>;
  timestamp: Date;
}