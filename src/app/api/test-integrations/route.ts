import { NextResponse } from 'next/server';
import { testClaudeConnection } from '@/lib/claude';
import { testAblyConnection } from '@/lib/ably';

export async function GET() {
  const results = {
    timestamp: new Date().toISOString(),
    services: {
      snowflake: { available: false, error: null as string | null },
      claude: { available: false, error: null as string | null },
      ably: { available: false, error: null as string | null },
      gmail: { available: false, error: null as string | null },
    },
  };

  // Test Snowflake (only if credentials are provided)
  try {
    if (process.env.SNOWFLAKE_ACCOUNT &&
        process.env.SNOWFLAKE_USERNAME &&
        process.env.SNOWFLAKE_WAREHOUSE) {
      // Real credentials provided, test connection
      const { getSnowflakeConnection } = await import('@/lib/snowflake');
      await getSnowflakeConnection();
      results.services.snowflake.available = true;
    } else {
      results.services.snowflake.error = 'Credentials not configured (missing account, username, or warehouse)';
    }
  } catch (error) {
    results.services.snowflake.error = error instanceof Error ? error.message : 'Unknown error';
  }

  // Test Claude AI (only if API key is provided)
  try {
    if (process.env.CLAUDE_API_KEY && process.env.CLAUDE_API_KEY !== 'your-claude-api-key') {
      const isConnected = await testClaudeConnection();
      results.services.claude.available = isConnected;
      if (!isConnected) {
        results.services.claude.error = 'Connection test failed';
      }
    } else {
      results.services.claude.error = 'API key not configured (using placeholder)';
    }
  } catch (error) {
    results.services.claude.error = error instanceof Error ? error.message : 'Unknown error';
  }

  // Test Ably (only if API key is provided)
  try {
    if (process.env.ABLY_API_KEY && process.env.ABLY_API_KEY !== 'your-ably-api-key') {
      const isConnected = await testAblyConnection();
      results.services.ably.available = isConnected;
      if (!isConnected) {
        results.services.ably.error = 'Connection test failed';
      }
    } else {
      results.services.ably.error = 'API key not configured (using placeholder)';
    }
  } catch (error) {
    results.services.ably.error = error instanceof Error ? error.message : 'Unknown error';
  }

  // Gmail test (requires user session with proper scopes)
  results.services.gmail.error = 'Gmail testing requires user authentication with proper scopes';

  const totalAvailable = Object.values(results.services).filter(s => s.available).length;
  const totalServices = Object.keys(results.services).length;

  return NextResponse.json({
    ...results,
    summary: {
      available: totalAvailable,
      total: totalServices,
      percentage: Math.round((totalAvailable / totalServices) * 100),
    },
  });
}