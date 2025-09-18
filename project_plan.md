# Outreach Dashboard - Project Plan

## Project Overview

A Next.js webapp for automated ICP (Ideal Customer Profile) outreach email campaigns. The system queries Ably's Snowflake database for target accounts, generates personalized emails using Claude AI, and manages email scheduling/sending through Gmail API with real-time updates via Ably LiveSync.

## Architecture

### Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (serverless functions)
- **Database**: MongoDB Atlas (Free M0 tier) + Snowflake (via API)
- **Real-time**: Ably LiveSync
- **Authentication**: NextAuth.js with Google OAuth
- **Email**: Gmail API
- **AI**: Claude API (Anthropic)
- **Deployment**: Vercel
- **Scheduling**: Vercel Cron Jobs
- **Testing**: Jest, React Testing Library, Playwright, Supertest

### System Components

1. **Frontend App** (Next.js)
   - Dashboard for email campaign management
   - Calendar view for scheduled emails
   - Email editor and approval interface
   - User authentication and filtering

2. **Backend APIs** (Next.js API Routes)
   - Snowflake integration for ICP data
   - Claude AI integration for email generation
   - Gmail API for sending emails
   - MongoDB operations for email storage
   - Ably LiveSync for real-time updates

3. **Database Schema** (MongoDB)
   - Users collection
   - Email campaigns collection
   - Email templates collection
   - Audit logs collection

4. **External Integrations**
   - Snowflake (ICP data, HubSpot data)
   - Claude AI (email generation)
   - Gmail API (email sending)
   - Google OAuth (authentication)
   - Ably (real-time updates)

## Project Structure

```
outreach-dashboard/
├── src/
│   ├── app/                          # Next.js app directory
│   │   ├── api/                      # API routes
│   │   │   ├── auth/                 # NextAuth configuration
│   │   │   ├── snowflake/            # Snowflake data queries
│   │   │   ├── claude/               # AI email generation
│   │   │   ├── gmail/                # Gmail API integration
│   │   │   ├── emails/               # Email CRUD operations
│   │   │   ├── cron/                 # Scheduled jobs
│   │   │   └── ably/                 # Real-time updates
│   │   ├── dashboard/                # Main dashboard page
│   │   ├── calendar/                 # Calendar view
│   │   ├── emails/                   # Email management pages
│   │   ├── settings/                 # User settings
│   │   ├── layout.tsx                # Root layout
│   │   ├── page.tsx                  # Home page
│   │   └── globals.css               # Global styles
│   ├── components/                   # Reusable components
│   │   ├── ui/                       # Base UI components
│   │   ├── email/                    # Email-specific components
│   │   ├── calendar/                 # Calendar components
│   │   └── dashboard/                # Dashboard components
│   ├── lib/                          # Utility libraries
│   │   ├── auth.ts                   # Authentication config
│   │   ├── db.ts                     # MongoDB connection
│   │   ├── snowflake.ts              # Snowflake client
│   │   ├── claude.ts                 # Claude AI client
│   │   ├── gmail.ts                  # Gmail API client
│   │   ├── ably.ts                   # Ably client
│   │   └── utils.ts                  # General utilities
│   ├── types/                        # TypeScript types
│   └── hooks/                        # Custom React hooks
├── __tests__/                        # Test files
│   ├── api/                          # API route tests
│   ├── components/                   # Component tests
│   ├── lib/                          # Library/utility tests
│   ├── e2e/                          # End-to-end tests
│   ├── __mocks__/                    # Test mocks
│   └── setup/                        # Test setup files
├── public/                           # Static assets
├── emails/                           # Generated email storage
├── .env.local                        # Environment variables
├── .env.test                         # Test environment variables
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── next.config.js
├── jest.config.js                    # Jest configuration
├── playwright.config.ts              # Playwright configuration
└── vercel.json                       # Vercel configuration
```

## Database Schema

### MongoDB Collections

#### 1. users

```typescript
{
  _id: ObjectId,
  googleId: string,
  email: string,           // Must end with @ably.com
  name: string,
  picture?: string,
  role: 'admin' | 'user',
  isActive: boolean,
  createdAt: Date,
  updatedAt: Date
}
```

#### 2. email_campaigns

```typescript
{
  _id: ObjectId,
  companyName: string,
  contactName?: string,
  contactEmail?: string,
  ablyAccountId: string,
  ablyUserId: string,
  customerSnapshot: string,      // Research phase 1
  businessHypothesis: string,    // Research phase 1
  emails: [
    {
      emailNumber: 1 | 2 | 3 | 4,
      subject: string,
      content: string,
      scheduledDate: Date,
      status: 'draft' | 'scheduled' | 'pending_approval' | 'approved' | 'sent' | 'failed',
      sentAt?: Date,
      sentBy?: string,           // User email who sent it
      gmailMessageId?: string,
      approvedBy?: string,       // User email who approved it
      approvedAt?: Date
    }
  ],
  assignedTo: string,            // User email
  requiresApproval: boolean,
  status: 'active' | 'paused' | 'completed',
  icpData: {                     // From Snowflake query
    dtCreatedAt: Date,
    dtSdkConnect?: Date,
    lastSignInAt?: Date,
    useCase?: string,
    signInCount: number,
    messages?: number,
    peakConnections?: number,
    peakChannels?: number,
    icpIntent: 'yes' | 'no'
  },
  createdBy: string,             // User email
  createdAt: Date,
  updatedAt: Date
}
```

#### 3. email_templates

```typescript
{
  _id: ObjectId,
  name: string,
  description: string,
  promptTemplate: string,        // Claude prompt template
  isDefault: boolean,
  createdBy: string,
  createdAt: Date,
  updatedAt: Date
}
```

#### 4. audit_logs

```typescript
{
  _id: ObjectId,
  userId: string,
  action: string,
  entityType: 'campaign' | 'email' | 'template',
  entityId: string,
  details: Record<string, any>,
  timestamp: Date
}
```

## Implementation TODOs

### Phase 1: Project Setup & Core Infrastructure

#### 1.1 Project Initialization

- [x] Initialize Next.js 14 project with TypeScript
- [x] Configure Tailwind CSS
- [x] Set up ESLint and Prettier
- [x] Configure environment variables structure
- [x] Set up basic project structure

#### 1.2 Database Setup

- [x] Create MongoDB Atlas cluster (Free M0 tier)
- [x] Configure MongoDB connection in Next.js
- [x] Create database schemas and models
- [x] Set up MongoDB indexes for performance
- [x] Test database connectivity

#### 1.3 Authentication Setup

- [ ] Configure NextAuth.js with Google OAuth
- [ ] Set up Google Cloud Project OAuth credentials
- [ ] Implement @ably.com email domain restriction
- [ ] Create user session management
- [ ] Build login/logout components

#### 1.4 External Service Integrations

- [ ] Set up Snowflake Node.js driver
- [ ] Configure Snowflake connection and test queries
- [ ] Set up Claude AI SDK and test API calls
- [ ] Configure Gmail API with proper scopes
- [ ] Set up Ably client for real-time updates
- [ ] Test all external service connections

### Phase 2: Core API Development

#### 2.1 Snowflake Integration APIs

- [ ] Create `/api/snowflake/icp-accounts` endpoint
- [ ] Implement the existing ICP query from queries.py
- [ ] Add filtering and pagination for ICP results
- [ ] Create `/api/snowflake/hubspot-data` endpoint for contact info
- [ ] Add error handling and connection pooling

#### 2.2 Claude AI Integration

- [ ] Create `/api/claude/generate-emails` endpoint
- [ ] Implement the research phase (external website analysis)
- [ ] Build email generation logic following the 4-email sequence
- [ ] Add template management for different outreach types
- [ ] Implement retry logic and rate limiting

#### 2.3 Gmail API Integration

- [ ] Create `/api/gmail/send` endpoint for individual emails
- [ ] Implement batch email sending functionality
- [ ] Add email status tracking and delivery confirmation
- [ ] Create `/api/gmail/sent-emails` for retrieving sent emails
- [ ] Implement proper OAuth token refresh handling

#### 2.4 Email Campaign Management

- [ ] Create `/api/emails/campaigns` CRUD endpoints
- [ ] Implement campaign creation workflow
- [ ] Add email scheduling logic
- [ ] Create approval workflow endpoints
- [ ] Implement campaign status management

### Phase 3: Frontend Development

#### 3.1 Core UI Components

- [ ] Build reusable UI components (Button, Input, Modal, etc.)
- [ ] Create layout components (Header, Sidebar, Navigation)
- [ ] Implement responsive design system
- [ ] Add loading states and error boundaries
- [ ] Create data table components for campaign lists

#### 3.2 Dashboard Pages

- [ ] Build main dashboard with campaign overview
- [ ] Create ICP accounts list with filtering
- [ ] Implement campaign creation flow
- [ ] Add user management interface (admin only)
- [ ] Build settings page for approval preferences

#### 3.3 Calendar Interface

- [ ] Implement calendar view for scheduled emails
- [ ] Add date picker for scheduling emails
- [ ] Create timeline view for email sequences
- [ ] Implement drag-and-drop rescheduling
- [ ] Add calendar export functionality

#### 3.4 Email Management Interface

- [ ] Build email editor with rich text support
- [ ] Create email preview components
- [ ] Implement approval workflow UI
- [ ] Add email status tracking dashboard
- [ ] Build email analytics and reporting

### Phase 4: Real-time Features & Automation

#### 4.1 Ably LiveSync Integration

- [ ] Configure Ably channels for real-time updates
- [ ] Implement real-time campaign status updates
- [ ] Add live email queue monitoring
- [ ] Create real-time notifications system
- [ ] Add collaborative editing features

#### 4.2 Cron Jobs & Automation

- [ ] Create `/api/cron/daily-email-check` endpoint
- [ ] Implement email queue processing logic
- [ ] Add automatic email generation for new ICP accounts
- [ ] Create cleanup jobs for old campaigns
- [ ] Implement monitoring and alerting for failed jobs

#### 4.3 Approval Workflow

- [ ] Build approval request system
- [ ] Create email notifications for pending approvals
- [ ] Implement bulk approval functionality
- [ ] Add approval history tracking
- [ ] Create override capabilities for admins

### Phase 5: Advanced Features

#### 5.1 Analytics & Reporting

- [ ] Build email performance analytics
- [ ] Create campaign success metrics
- [ ] Implement response tracking (via HubSpot data)
- [ ] Add conversion rate analytics
- [ ] Build executive summary reports

#### 5.2 Template Management

- [ ] Create email template editor
- [ ] Implement template versioning
- [ ] Add A/B testing for email templates
- [ ] Build template analytics
- [ ] Create template sharing between users

#### 5.3 Advanced Filtering & Search

- [ ] Implement advanced ICP filtering
- [ ] Add full-text search for campaigns
- [ ] Create saved filter presets
- [ ] Build bulk actions for campaigns
- [ ] Add export functionality for campaign data

### Phase 6: Deployment & Production

#### 6.1 Production Setup

- [ ] Configure Vercel deployment settings
- [ ] Set up production environment variables
- [ ] Configure custom domain
- [ ] Set up SSL certificates
- [ ] Configure CDN and performance optimization

#### 6.2 Monitoring & Logging

- [ ] Implement application logging
- [ ] Set up error tracking (Sentry)
- [ ] Configure performance monitoring
- [ ] Add health check endpoints
- [ ] Create uptime monitoring

#### 6.3 Security & Compliance

- [ ] Implement rate limiting
- [ ] Add CSRF protection
- [ ] Configure security headers
- [ ] Implement audit logging
- [ ] Add data encryption for sensitive fields

#### 6.4 Testing & Quality Assurance

- [ ] Write unit tests for API endpoints
- [ ] Create integration tests for email workflows
- [ ] Add end-to-end tests for critical user journeys
- [ ] Implement load testing for Snowflake queries
- [ ] Create staging environment for testing

## Environment Variables Required

```env
# Database
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=outreach-dashboard

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Snowflake
SNOWFLAKE_ACCOUNT=your-account
SNOWFLAKE_USERNAME=your-username
SNOWFLAKE_PASSWORD=your-password
SNOWFLAKE_WAREHOUSE=your-warehouse
SNOWFLAKE_DATABASE=ABLY_ANALYTICS_PRODUCTION
SNOWFLAKE_SCHEMA=MODELLED_COMMERCIAL

# Claude AI
CLAUDE_API_KEY=your-claude-api-key

# Gmail API
GMAIL_CLIENT_ID=your-gmail-client-id
GMAIL_CLIENT_SECRET=your-gmail-client-secret

# Ably
ABLY_API_KEY=your-ably-api-key

# App Configuration
APPROVAL_REQUIRED=true
ADMIN_EMAILS=admin@ably.com,manager@ably.com
```

## Key Features Summary

### Core Functionality

1. **ICP Account Discovery**: Query Snowflake for new ICP accounts based on existing criteria
2. **AI Email Generation**: Use Claude AI to research companies and generate personalized 4-email sequences
3. **Email Scheduling**: Calendar-based scheduling with automated sending via cron jobs
4. **Approval Workflow**: Optional manual approval before sending emails
5. **Real-time Updates**: Live status updates using Ably LiveSync
6. **Gmail Integration**: Send emails through users' Gmail accounts with proper authentication

### User Experience

1. **Dashboard**: Overview of all campaigns, pending approvals, and scheduled emails
2. **Calendar View**: Visual timeline of email sequences and scheduling
3. **Email Editor**: Rich text editing with preview functionality
4. **User Management**: Admin controls for user permissions and settings
5. **Analytics**: Performance tracking and campaign success metrics

### Technical Excellence

1. **Type Safety**: Full TypeScript implementation
2. **Performance**: Optimized queries and caching strategies
3. **Security**: OAuth authentication with domain restrictions
4. **Scalability**: Serverless architecture with efficient database design
5. **Monitoring**: Comprehensive logging and error tracking

## Success Metrics

1. **Email Generation**: Automatically generate personalized email sequences for new ICP accounts
2. **Delivery Success**: >95% email delivery rate through Gmail API
3. **User Adoption**: All outreach team members actively using the platform
4. **Time Savings**: Reduce manual outreach time by 80%
5. **Response Rates**: Track and improve email response rates through analytics

## Risk Mitigation

1. **API Rate Limits**: Implement proper rate limiting and retry logic for all external APIs
2. **Email Deliverability**: Use Gmail API properly with authentication to avoid spam filters
3. **Data Security**: Encrypt sensitive data and implement proper access controls
4. **Service Dependencies**: Add graceful degradation for external service failures
5. **Scalability**: Design for horizontal scaling with serverless architecture

---

_This project plan provides a comprehensive roadmap for building a production-ready outreach email automation platform. Each phase builds upon the previous one, ensuring a solid foundation while delivering incremental value._
