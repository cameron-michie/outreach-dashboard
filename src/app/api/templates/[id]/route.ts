import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { TemplateModel, AuditLogModel } from '@/lib/models';
import { ObjectId } from 'mongodb';

interface RouteContext {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 });
    }

    console.log(`🔍 Fetching template ${id} for ${session.user.email}`);

    const template = await TemplateModel.findOne({
      _id: new ObjectId(id),
      user_id: session.user.id
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    console.log(`✅ Retrieved template: ${template.name}`);

    return NextResponse.json(template);
  } catch (error) {
    console.error('❌ Template fetch error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch template',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 });
    }

    const body = await request.json();
    const { name, description, subject, body: templateBody, category, variables } = body;

    console.log(`📝 Updating template ${id} for ${session.user.email}`);

    const updateData: any = {
      updated_at: new Date()
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (subject !== undefined) updateData.subject = subject;
    if (templateBody !== undefined) updateData.body = templateBody;
    if (category !== undefined) updateData.category = category;
    if (variables !== undefined) updateData.variables = variables;

    const template = await TemplateModel.findOneAndUpdate(
      { _id: new ObjectId(id), user_id: session.user.id },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Log the update
    await AuditLogModel.logAction(
      session.user.id,
      'template_updated',
      'template',
      id,
      { changes: Object.keys(updateData) }
    );

    console.log(`✅ Template updated: ${template.name}`);

    return NextResponse.json(template);
  } catch (error) {
    console.error('❌ Template update error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update template',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 });
    }

    console.log(`🗑️ Deleting template ${id} for ${session.user.email}`);

    const template = await TemplateModel.findOne({
      _id: new ObjectId(id),
      user_id: session.user.id
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    await TemplateModel.deleteOne({
      _id: new ObjectId(id),
      user_id: session.user.id
    });

    // Log the deletion
    await AuditLogModel.logAction(
      session.user.id,
      'template_deleted',
      'template',
      id,
      { template_name: template.name }
    );

    console.log(`✅ Template deleted: ${template.name}`);

    return NextResponse.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('❌ Template deletion error:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete template',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}