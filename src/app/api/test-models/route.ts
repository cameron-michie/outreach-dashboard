import { NextResponse } from 'next/server';
import { UserModel, EmailTemplateModel } from '@/lib/models';

export async function GET() {
  try {
    // Test creating a user
    const testUser = {
      googleId: 'test-google-id-123',
      email: 'test@ably.com',
      name: 'Test User',
      role: 'user' as const,
      isActive: true,
    };

    const userResult = await UserModel.create(testUser);
    console.log('Test user created with ID:', userResult.insertedId);

    // Test finding the user
    const foundUser = await UserModel.findByEmail('test@ably.com');
    console.log('Found user:', foundUser?.name);

    // Test finding the default template
    const defaultTemplate = await EmailTemplateModel.findDefault();
    console.log('Default template found:', defaultTemplate?.name);

    // Clean up - delete the test user
    if (foundUser) {
      await UserModel.delete(foundUser._id);
      console.log('Test user deleted');
    }

    return NextResponse.json({
      success: true,
      message: 'Model operations successful',
      results: {
        userCreated: !!userResult.insertedId,
        userFound: !!foundUser,
        defaultTemplateFound: !!defaultTemplate,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Model test error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Model test failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}