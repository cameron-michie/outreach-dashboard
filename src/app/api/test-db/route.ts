import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { initializeDatabase, createDefaultTemplate } from '@/lib/dbInit';

export async function GET() {
  try {
    // Test database connection
    const db = await getDatabase();

    // Test basic operations
    const stats = await db.stats();
    const collections = await db.listCollections().toArray();

    // Initialize indexes and default template
    await initializeDatabase();
    await createDefaultTemplate();

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      database: db.databaseName,
      stats: {
        collections: stats.collections || 0,
        dataSize: stats.dataSize || 0,
        indexSize: stats.indexSize || 0,
      },
      collections: collections.map(col => col.name),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Database connection error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Database connection failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}