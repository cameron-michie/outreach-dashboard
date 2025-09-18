# Outreach Dashboard API Design

## Overview

This document outlines the API design for Phase 2.2: Claude AI Integration. The system generates personalized outreach emails using Claude AI, integrates with Snowflake for customer data, and manages the complete email campaign lifecycle with approval workflows.

## Architecture Principles

### 1. Cost-Conscious Design
- **Mock Mode**: Development uses mock responses to avoid Claude API costs
- **Rate Limiting**: Prevent accidental credit burn through rate limiting
- **Cost Estimation**: Pre-calculate costs before expensive operations
- **User Confirmation**: Explicit approval for operations that consume credits

### 2. Data Flow
```
ICP Accounts Selection → Template Selection → Claude Generation → Campaign Storage → Approval Workflow → Gmail Sending
```

### 3. Integration Points
- **Snowflake**: Real-time customer data fetching
- **Claude AI**: Email content generation (with cost controls)
- **Ably Core MCP**: Company research and enrichment (placeholder)
- **Gmail API**: Email sending with tracking
- **MongoDB**: Campaign storage and audit trails

## API Endpoints

### Claude AI Endpoints

#### `POST /api/claude/generate-email`
**Purpose**: Generate a single email preview for real-time user feedback

**Request Body**:
```json
{
  "account_id": "123456",
  "template_id": "template_uuid",
  "email_sequence": 1,
  "use_mock": true
}
```

**Response**:
```json
{
  "success": true,
  "email": {
    "subject": "Quick question about [Company]'s real-time infrastructure",
    "content": "Hi [Contact Name],\n\nI noticed [Company] has been exploring real-time messaging...",
    "variables_used": ["company_name", "use_case", "sign_in_count"],
    "generation_time": "2.3s",
    "estimated_cost": "$0.02"
  },
  "account_data": {
    "company_name": "Acme Corp",
    "engagement_score": 75,
    "icp_match": true
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Insufficient Claude credits",
  "details": "Current balance: $1.50, Required: $2.00"
}
```

#### `POST /api/claude/generate-campaign`
**Purpose**: Generate emails for entire campaign (bulk operation)

**Request Body**:
```json
{
  "campaign_id": "campaign_uuid",
  "account_ids": ["123456", "789012"],
  "template_id": "template_uuid",
  "email_sequence": [1, 2],
  "use_mock": false,
  "confirm_cost": true
}
```

**Response**:
```json
{
  "success": true,
  "campaign_id": "campaign_uuid",
  "generated_emails": 4,
  "total_cost": "$0.24",
  "generation_time": "45.2s",
  "emails": [
    {
      "account_id": "123456",
      "sequence": 1,
      "subject": "...",
      "content": "...",
      "status": "draft"
    }
  ]
}
```

#### `POST /api/claude/research-company`
**Purpose**: Research company using external sources (Ably Core MCP placeholder)

**Request Body**:
```json
{
  "company_name": "Acme Corp",
  "company_domain": "acme.com",
  "research_depth": "basic|detailed"
}
```

**Response**:
```json
{
  "success": true,
  "research": {
    "company_overview": "Acme Corp is a mid-sized SaaS platform...",
    "tech_stack": ["React", "Node.js", "AWS"],
    "recent_news": ["Series B funding", "New CTO hire"],
    "pain_points": ["Scaling challenges", "Real-time features"],
    "sources": ["website", "crunchbase", "linkedin"]
  },
  "ably_mcp_enabled": false,
  "note": "Using placeholder data - Ably MCP integration pending"
}
```

#### `GET /api/claude/estimate-cost`
**Purpose**: Estimate costs before expensive operations

**Query Parameters**:
- `accounts`: Number of accounts
- `sequences`: Number of email sequences
- `research`: Include research costs

**Response**:
```json
{
  "success": true,
  "estimates": {
    "email_generation": {
      "cost_per_email": "$0.03",
      "total_emails": 8,
      "total_cost": "$0.24"
    },
    "research": {
      "cost_per_company": "$0.15",
      "companies": 4,
      "total_cost": "$0.60"
    },
    "grand_total": "$0.84",
    "current_balance": "$12.45",
    "sufficient_credits": true
  }
}
```

### Enhanced Campaign Endpoints

#### `POST /api/campaigns/[id]/send`
**Purpose**: Send approved campaign emails via Gmail

**Request Body**:
```json
{
  "email_sequence": [1, 2],
  "dry_run": false,
  "schedule_time": "2024-01-15T09:00:00Z"
}
```

**Response**:
```json
{
  "success": true,
  "sent_emails": 6,
  "failed_emails": 0,
  "gmail_message_ids": ["msg_123", "msg_456"],
  "scheduled_count": 4
}
```

#### `GET /api/campaigns/[id]/preview`
**Purpose**: Preview generated emails before approval

**Response**:
```json
{
  "success": true,
  "campaign": {
    "id": "campaign_uuid",
    "name": "Q1 Enterprise Outreach",
    "status": "draft",
    "target_accounts": 8,
    "emails": [
      {
        "account_id": "123456",
        "sequence": 1,
        "subject": "...",
        "content": "...",
        "status": "draft",
        "scheduled_date": "2024-01-15T09:00:00Z"
      }
    ]
  }
}
```

#### `POST /api/campaigns/[id]/regenerate`
**Purpose**: Re-generate specific emails in a campaign

**Request Body**:
```json
{
  "account_id": "123456",
  "email_sequence": 1,
  "use_different_template": "template_uuid_2"
}
```

## Data Models

### Enhanced Campaign Model
```typescript
interface EmailCampaign {
  // Existing fields...
  generated_content?: {
    total_cost: number;
    generation_time: number;
    claude_model: string;
    generated_at: Date;
    generated_by: string;
  };
  cost_tracking: {
    estimated_cost: number;
    actual_cost: number;
    approved_by?: string;
    approved_at?: Date;
  };
}
```

### Email Generation Log
```typescript
interface EmailGenerationLog {
  _id: string;
  campaign_id: string;
  account_id: string;
  template_id: string;
  sequence_number: number;
  input_data: Record<string, any>;
  generated_content: {
    subject: string;
    content: string;
  };
  cost: number;
  generation_time: number;
  claude_model: string;
  created_at: Date;
}
```

## Template Variable System

### Variable Types
- **Account Data**: `{{company_name}}`, `{{use_case}}`, `{{sign_in_count}}`
- **Research Data**: `{{tech_stack}}`, `{{recent_news}}`, `{{pain_points}}`
- **Behavioral Data**: `{{engagement_score}}`, `{{last_activity}}`, `{{feature_usage}}`

### Template Example
```
Subject: Quick question about {{company_name}}'s real-time infrastructure

Hi {{contact_name}},

I noticed {{company_name}} has been exploring real-time messaging solutions, and I thought you might be interested in how we've helped similar {{industry}} companies scale their applications.

Given that you've {{recent_activity}}, I'd love to share how our customers typically see a {{improvement_metric}} improvement in their real-time features.

Would you be open to a brief 15-minute call next week?

Best regards,
{{sender_name}}
```

## Cost Management

### Development Environment
```env
CLAUDE_USE_MOCK=true
CLAUDE_RATE_LIMIT=10_per_minute
CLAUDE_DAILY_LIMIT=100
CLAUDE_COST_WARNING_THRESHOLD=5.00
```

### Production Environment
```env
CLAUDE_USE_MOCK=false
CLAUDE_RATE_LIMIT=50_per_minute
CLAUDE_DAILY_LIMIT=1000
CLAUDE_COST_WARNING_THRESHOLD=50.00
CLAUDE_REQUIRE_APPROVAL_OVER=10.00
```

### Rate Limiting Strategy
- **Per User**: 10 requests/minute in development, 50 in production
- **Per Campaign**: Maximum 100 emails per generation request
- **Daily Limits**: Configurable per environment
- **Cost Limits**: Automatic approval required over threshold

## Error Handling

### Common Error Responses
```json
{
  "success": false,
  "error_code": "INSUFFICIENT_CREDITS",
  "message": "Insufficient Claude API credits",
  "details": {
    "current_balance": 1.50,
    "required_amount": 5.20,
    "suggested_action": "Add credits or reduce scope"
  },
  "retry_after": null
}
```

### Error Codes
- `INSUFFICIENT_CREDITS`: Not enough Claude API credits
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `ACCOUNT_NOT_FOUND`: Snowflake account doesn't exist
- `TEMPLATE_INVALID`: Template has syntax errors
- `APPROVAL_REQUIRED`: Cost exceeds auto-approval threshold
- `MOCK_MODE_ACTIVE`: Running in development mock mode

## Authentication & Authorization

### Required Permissions
- **Email Generation**: `@ably.com` domain restriction
- **Campaign Management**: User can only access own campaigns
- **Admin Functions**: Cost management, system configuration
- **Approval Workflow**: Admin role required for high-cost operations

### Audit Logging
All operations logged with:
- User identity and role
- Operation type and parameters
- Cost information
- Success/failure status
- Timestamp and duration

## Integration Specifications

### Snowflake Integration
- Real-time account data fetching during generation
- Caching strategy for performance (5-minute cache)
- Fallback to last-known data if Snowflake unavailable

### Gmail API Integration
- OAuth 2.0 with email sending scope
- HubSpot BCC for tracking (6939709@bcc.hubspot.com)
- Message ID tracking for delivery status
- Retry logic for failed sends

### Ably Core MCP (Placeholder)
```typescript
// Placeholder interface for future Ably MCP integration
interface AblyMCPClient {
  research_company(domain: string): Promise<CompanyResearch>;
  enrich_contact(email: string): Promise<ContactEnrichment>;
  get_tech_stack(domain: string): Promise<TechStack>;
}
```

## Testing Strategy

### Mock Data
- Comprehensive mock responses for all Claude operations
- Realistic cost calculations for testing
- Simulated generation times and success/failure scenarios

### Integration Tests
- End-to-end campaign generation workflow
- Cost calculation accuracy
- Rate limiting enforcement
- Error handling scenarios

### Performance Tests
- Bulk email generation (100+ emails)
- Concurrent user scenarios
- Snowflake data fetching under load

## Security Considerations

### API Key Management
- Claude API key stored in secure environment variables
- Rotation strategy for production keys
- Monitoring for unusual usage patterns

### Data Privacy
- No customer data sent to Claude in logs
- Generated content encrypted at rest
- Audit trail for all data access

### Cost Protection
- Multiple layers of cost controls
- Real-time monitoring of spend
- Automatic shutoffs at predefined limits

## Future Enhancements

### Phase 3 Considerations
- A/B testing for email templates
- Machine learning for optimal send times
- Integration with additional research sources
- Advanced personalization using web scraping
- Multi-language support for international outreach

---

*This API design document serves as the foundation for Phase 2.2 implementation. All endpoints will initially use mock responses to avoid Claude API costs during development.*