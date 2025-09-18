// Environment variables with validation

function getEnvVar(name: string, fallback?: string): string {
  const value = process.env[name] || fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  // Database
  mongodb: {
    uri: getEnvVar('MONGODB_URI'),
    dbName: getEnvVar('MONGODB_DB_NAME', 'outreach-dashboard'),
  },

  // Authentication
  nextAuth: {
    url: getEnvVar('NEXTAUTH_URL', 'http://localhost:3000'),
    secret: getEnvVar('NEXTAUTH_SECRET'),
  },

  // Google OAuth
  google: {
    clientId: getEnvVar('GOOGLE_CLIENT_ID'),
    clientSecret: getEnvVar('GOOGLE_CLIENT_SECRET'),
  },

  // Snowflake
  snowflake: {
    account: getEnvVar('SNOWFLAKE_ACCOUNT'),
    username: getEnvVar('SNOWFLAKE_USERNAME'),
    password: process.env.SNOWFLAKE_PASSWORD || '', // Optional for external browser auth
    warehouse: getEnvVar('SNOWFLAKE_WAREHOUSE'),
    database: getEnvVar('SNOWFLAKE_DATABASE', 'ABLY_ANALYTICS_PRODUCTION'),
    schema: getEnvVar('SNOWFLAKE_SCHEMA', 'MODELLED_COMMERCIAL'),
    authenticator: getEnvVar('SNOWFLAKE_AUTHENTICATOR', 'externalbrowser'),
  },

  // Claude AI
  claude: {
    apiKey: getEnvVar('CLAUDE_API_KEY'),
    useMock: getEnvVar('CLAUDE_USE_MOCK', 'true'),
    rateLimitPerMinute: getEnvVar('CLAUDE_RATE_LIMIT_PER_MINUTE', '10'),
    dailyLimit: getEnvVar('CLAUDE_DAILY_LIMIT', '100'),
    costWarningThreshold: getEnvVar('CLAUDE_COST_WARNING_THRESHOLD', '5.00'),
    approvalThreshold: getEnvVar('CLAUDE_APPROVAL_THRESHOLD', '10.00'),
    mockBalance: getEnvVar('CLAUDE_MOCK_BALANCE', '12.45'),
  },

  // Gmail API
  gmail: {
    clientId: getEnvVar('GMAIL_CLIENT_ID'),
    clientSecret: getEnvVar('GMAIL_CLIENT_SECRET'),
  },

  // Ably
  ably: {
    apiKey: getEnvVar('ABLY_API_KEY'),
  },

  // App Configuration
  app: {
    approvalRequired: getEnvVar('APPROVAL_REQUIRED', 'true') === 'true',
    adminEmails: getEnvVar('ADMIN_EMAILS', '').split(',').filter(Boolean),
  },
} as const;