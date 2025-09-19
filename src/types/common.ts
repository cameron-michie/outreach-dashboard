/**
 * Common type definitions used across the application
 */

// Database and model types
export interface DatabaseFilter {
  [key: string]: unknown;
}

export interface UpdateData {
  [key: string]: unknown;
}

// Campaign related types
export interface EmailStatus {
  status: 'draft' | 'scheduled' | 'pending_approval' | 'approved' | 'sent' | 'failed' | 'cancelled';
  scheduled_date?: string;
  sent_at?: string;
  error?: string;
}

export interface GeneratedEmail extends EmailStatus {
  id: string;
  account_id: string;
  subject: string;
  content: string;
  sequence: number;
  to_email: string;
  to_name?: string;
  company_name?: string;
}

export interface CampaignEmail extends GeneratedEmail {
  campaign_id: string;
}

export interface Campaign {
  _id: string;
  user_id: string;
  name: string;
  template_id: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  target_accounts: string[];
  generated_emails: GeneratedEmail[];
  created_at: string;
  updated_at: string;
  scheduled_start?: string;
  approval_required?: boolean;
  approved_at?: string;
  approved_by?: string;
  target_data?: AccountData[];
}

export interface AccountData {
  ably_account_id: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  use_case?: string;
  sign_in_count?: number;
  [key: string]: unknown;
}

// Snowflake connection types
export interface SnowflakeError {
  code: string;
  message: string;
  sqlState?: string;
}

export interface SnowflakeStatement {
  getSqlText(): string;
  getColumns(): Array<{ name: string; type: string }>;
  getRequestId(): string;
}

export interface SnowflakeConnection {
  execute(options: {
    sqlText: string;
    complete: (err: SnowflakeError | null, stmt: SnowflakeStatement, rows: unknown[]) => void;
  }): void;
  destroy(callback: (err: SnowflakeError | null, conn: SnowflakeConnection) => void): void;
  connectAsync?: (callback: (err: SnowflakeError | null, conn: SnowflakeConnection) => void) => void;
  connect?: (callback: (err: SnowflakeError | null, conn: SnowflakeConnection) => void) => void;
}

// User and session types
export interface UserData {
  name: string;
  email: string;
  id?: string;
}

export interface SessionUser extends UserData {
  id: string;
}

export interface Session {
  user: SessionUser;
}

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Workflow and approval types
export interface WorkflowStep {
  name: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp?: string;
  error?: string;
  details?: Record<string, unknown>;
}

export interface WorkflowResult {
  success: boolean;
  steps: WorkflowStep[];
  error?: string;
}

export interface ApprovalLog {
  action: 'approved' | 'rejected' | 'requested';
  by: string;
  at: string;
  comment?: string;
}

// Template types
export interface TemplateData {
  id: string;
  name: string;
  subject_template: string;
  content_template: string;
  variables: string[];
  [key: string]: unknown;
}

// Email scheduling types
export interface ScheduleSettings {
  start_date: string;
  time_zone: string;
  business_hours: {
    start: string;
    end: string;
  };
  days_between_emails: number;
  exclude_weekends: boolean;
  custom_schedules?: CustomSchedule[];
}

export interface CustomSchedule {
  account_id: string;
  sequence: number;
  scheduled_date: string;
}

// Google services types
export interface GoogleProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

// Utility types
export type EmailAddress = string;
export type TimestampString = string;
export type DateString = string;

// Generic object types for when we truly don't know the structure
export type UnknownObject = Record<string, unknown>;
export type StringRecord = Record<string, string>;
export type NumberRecord = Record<string, number>;