import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CampaignModel, AuditLogModel } from '@/lib/models';
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
      return NextResponse.json({ error: 'Invalid campaign ID' }, { status: 400 });
    }

    console.log(`🔍 Fetching campaign ${id} for ${session.user.email}`);

    const campaign = await CampaignModel.findOne({
      _id: new ObjectId(id),
      user_id: session.user.id
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    console.log(`✅ Retrieved campaign: ${campaign.name}`);

    return NextResponse.json(campaign);
  } catch (error) {
    console.error('❌ Campaign fetch error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch campaign',
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
      return NextResponse.json({ error: 'Invalid campaign ID' }, { status: 400 });
    }

    const body = await request.json();
    const { name, description, scheduled_at, status, target_accounts } = body;

    console.log(`📝 Updating campaign ${id} for ${session.user.email}`);

    const existingCampaign = await CampaignModel.findOne({
      _id: new ObjectId(id),
      user_id: session.user.id
    });

    if (!existingCampaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Prevent updates to sent campaigns except for status changes
    if (existingCampaign.status === 'sent' && status !== 'sent') {
      return NextResponse.json(
        { error: 'Cannot modify sent campaigns except to update status' },
        { status: 400 }
      );
    }

    const updateData: any = {
      updated_at: new Date()
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (scheduled_at !== undefined) updateData.scheduled_at = scheduled_at ? new Date(scheduled_at) : null;
    if (status !== undefined) updateData.status = status;
    if (target_accounts !== undefined) {
      updateData.target_accounts = target_accounts;
      updateData.email_count = target_accounts.length;
    }

    const campaign = await CampaignModel.findOneAndUpdate(
      { _id: new ObjectId(id), user_id: session.user.id },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    // Log the update
    await AuditLogModel.logAction(
      session.user.id,
      'campaign_updated',
      'campaign',
      id,
      { changes: Object.keys(updateData) }
    );

    console.log(`✅ Campaign updated: ${campaign?.name}`);

    return NextResponse.json(campaign);
  } catch (error) {
    console.error('❌ Campaign update error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update campaign',
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
      return NextResponse.json({ error: 'Invalid campaign ID' }, { status: 400 });
    }

    console.log(`🗑️ Deleting campaign ${id} for ${session.user.email}`);

    const campaign = await CampaignModel.findOne({
      _id: new ObjectId(id),
      user_id: session.user.id
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Prevent deletion of sent campaigns
    if (campaign.status === 'sent') {
      return NextResponse.json(
        { error: 'Cannot delete sent campaigns' },
        { status: 400 }
      );
    }

    await CampaignModel.deleteOne({
      _id: new ObjectId(id),
      user_id: session.user.id
    });

    // Log the deletion
    await AuditLogModel.logAction(
      session.user.id,
      'campaign_deleted',
      'campaign',
      id,
      { campaign_name: campaign.name }
    );

    console.log(`✅ Campaign deleted: ${campaign.name}`);

    return NextResponse.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    console.error('❌ Campaign deletion error:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete campaign',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}