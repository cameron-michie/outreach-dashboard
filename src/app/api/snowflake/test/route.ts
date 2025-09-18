import { NextResponse } from 'next/server';
import { getSnowflakeConnection, executeSnowflakeQuery } from '@/lib/snowflake';

export async function GET() {
  try {
    console.log('🧪 Testing Snowflake connection...');

    // Test connection
    const connection = await getSnowflakeConnection();

    // Run a simple test query
    const testQuery = 'SELECT CURRENT_VERSION() as version, CURRENT_TIMESTAMP() as timestamp';
    const result = await executeSnowflakeQuery(testQuery);

    return NextResponse.json({
      success: true,
      message: 'Snowflake connection successful',
      data: result[0] || null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Snowflake connection test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}