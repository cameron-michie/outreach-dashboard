import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { TemplateModel } from '@/lib/models';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    console.log(`🔍 Fetching templates for ${session.user.email} - Page ${page}, Limit ${limit}`);

    const filters: any = { user_id: session.user.id };

    if (category) {
      filters.category = category;
    }

    if (search) {
      filters.$or = [
        { name: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const templates = await TemplateModel.findPaginated(filters, page, limit);

    console.log(`✅ Retrieved ${templates.data.length} templates (${templates.total} total)`);

    return NextResponse.json(templates);
  } catch (error) {
    console.error('❌ Templates API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch templates',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, subject, body: templateBody, category, variables } = body;

    if (!name || !subject || !templateBody) {
      return NextResponse.json(
        { error: 'Missing required fields: name, subject, body' },
        { status: 400 }
      );
    }

    console.log(`📝 Creating template "${name}" for ${session.user.email}`);

    const templateData = {
      name,
      description: description || '',
      subject,
      body: templateBody,
      category: category || 'general',
      variables: variables || [],
      user_id: session.user.id,
      usage_count: 0
    };

    const template = await TemplateModel.create(templateData);

    console.log(`✅ Template created with ID: ${template._id}`);

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('❌ Template creation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create template',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}