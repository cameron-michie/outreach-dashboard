import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { EmailCampaignModel } from '@/lib/models';
 
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const status = searchParams.get('status');
    const template = searchParams.get('template');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    console.log(`🔍 Fetching campaigns for ${session.user.email} - Page ${page}, Limit ${limit}`);

    const filters: any = { user_id: session.user.id };

    if (status) {
      filters.status = status;
    }

    if (template) {
      // filters.template_id = template;
    }

    if (startDate || endDate) {
      filters.created_at = {};
      if (startDate) {
        filters.created_at.$gte = new Date(startDate);
      }
      if (endDate) {
        filters.created_at.$lte = new Date(endDate);
      }
    }

    // Get all campaigns first, then filter and paginate manually
    let allCampaigns = await EmailCampaignModel.findAll(filters);

    // Apply additional filters
    if (status) {
      allCampaigns = allCampaigns.filter(campaign => campaign.status === status);
    }

    // Calculate pagination
    const total = allCampaigns.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedCampaigns = allCampaigns.slice(startIndex, endIndex);

    const result = {
      data: paginatedCampaigns,
      pagination: {
        page,
        limit,
        total_count: total,
        total_pages: totalPages,
        has_next_page: page < totalPages,
        has_prev_page: page > 1,
      },
    };

    console.log(`✅ Retrieved ${paginatedCampaigns.length} campaigns (${total} total)`);

    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ Campaigns API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch campaigns',
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
    const { name, description, template_id, scheduled_at, target_accounts } = body;

    if (!name || !template_id || !target_accounts || !Array.isArray(target_accounts)) {
      return NextResponse.json(
        { error: 'Missing required fields: name, template_id, target_accounts' },
        { status: 400 }
      );
    }

    console.log(`📝 Creating campaign "${name}" for ${session.user.email}`);

    const campaignData = {
      name,
      description: description || '',
      template_id,
      user_id: session.user.id,
      status: 'draft' as const,
      scheduled_at: scheduled_at ? new Date(scheduled_at) : null,
      target_accounts,
      email_count: target_accounts.length,
      sent_count: 0,
      opened_count: 0,
      replied_count: 0,
    };

    const campaign = await EmailCampaignModel.create(campaignData);

    console.log(`✅ Campaign created with ID: ${campaign._id}`);

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    console.error('❌ Campaign creation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create campaign',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
