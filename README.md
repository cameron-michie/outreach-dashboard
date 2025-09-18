# Outreach Dashboard

A Next.js webapp for automated ICP (Ideal Customer Profile) outreach email campaigns. The system queries Ably's Snowflake database for target accounts, generates personalized emails using Claude AI, and manages email scheduling/sending through Gmail API with real-time updates via Ably LiveSync.

## Features

- **ICP Account Discovery**: Query Snowflake for new ICP accounts based on criteria
- **AI Email Generation**: Use Claude AI to research companies and generate personalized 4-email sequences
- **Email Scheduling**: Calendar-based scheduling with automated sending via cron jobs
- **Approval Workflow**: Optional manual approval before sending emails
- **Real-time Updates**: Live status updates using Ably LiveSync
- **Gmail Integration**: Send emails through users' Gmail accounts with proper authentication

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (serverless functions)
- **Database**: MongoDB Atlas (Free M0 tier) + Snowflake (via API)
- **Real-time**: Ably LiveSync
- **Authentication**: NextAuth.js with Google OAuth (@ably.com domain restricted)
- **Email**: Gmail API
- **AI**: Claude API (Anthropic)
- **Deployment**: Vercel
- **Testing**: Jest, React Testing Library, Playwright, Supertest

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- MongoDB Atlas account
- Google Cloud Project with OAuth configured
- Snowflake access
- Claude AI API key
- Ably account

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd outreach-dashboard
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.example .env.local
```

4. Fill in your environment variables in `.env.local` (see Environment Variables section below)

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

### Environment Variables

See `.env.example` for all required environment variables. Key variables include:

- `MONGODB_URI`: MongoDB Atlas connection string
- `NEXTAUTH_SECRET`: Random secret for NextAuth.js
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: Google OAuth credentials
- `SNOWFLAKE_*`: Snowflake connection details
- `CLAUDE_API_KEY`: Claude AI API key
- `ABLY_API_KEY`: Ably real-time messaging key

## Development

### Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Format with Prettier
- `npm run format:check` - Check Prettier formatting
- `npm run type-check` - TypeScript type checking

### Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard pages
│   ├── calendar/          # Calendar view
│   └── emails/            # Email management
├── components/            # React components
│   ├── ui/               # Base UI components
│   ├── email/            # Email-specific components
│   └── dashboard/        # Dashboard components
├── lib/                   # Utility libraries
├── types/                 # TypeScript types
└── hooks/                 # Custom React hooks
```

## Authentication

- Uses NextAuth.js with Google OAuth
- Restricted to @ably.com email addresses only
- Supports admin and user roles

## Database Schema

### MongoDB Collections

- **users**: User accounts and roles
- **email_campaigns**: Campaign data and email sequences
- **email_templates**: Email templates for Claude AI
- **audit_logs**: System activity logs

See `src/types/index.ts` for detailed type definitions.

## API Endpoints

### Core APIs
- `/api/snowflake/*` - Snowflake data queries
- `/api/claude/*` - AI email generation
- `/api/gmail/*` - Email sending
- `/api/emails/*` - Campaign management
- `/api/cron/*` - Scheduled jobs

## Deployment

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on git push to main

### Environment Variables for Production

Ensure all environment variables from `.env.example` are set in your production environment.

## Contributing

1. Follow the existing code style (ESLint + Prettier configured)
2. Write tests for new features
3. Update documentation as needed
4. Create pull requests for review

## Security

- All API routes require authentication
- @ably.com domain restriction enforced
- Environment variables for all secrets
- Input validation on all endpoints
- Rate limiting implemented

## License

[License information]
