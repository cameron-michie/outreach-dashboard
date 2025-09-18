import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getICPAccounts, executeSnowflakeQuery, ICPAccount } from '@/lib/snowflake';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100); // Max 100 per page
    const icpIntentOnly = searchParams.get('icp_intent_only') === 'true';
    const companyFilter = searchParams.get('company');
    const useCase = searchParams.get('use_case');
    const minSignInCount = searchParams.get('min_sign_in_count');
    const hasSDKConnect = searchParams.get('has_sdk_connect') === 'true';

    console.log(`🔍 Fetching ICP accounts for ${session.user.email} - Page ${page}, Limit ${limit}`);

    // Get base ICP data
    const allAccounts = await getICPAccounts();

    // Apply filters
    let filteredAccounts = allAccounts;

    if (icpIntentOnly) {
      filteredAccounts = filteredAccounts.filter(account => account.icp_intent === 'yes');
    }

    if (companyFilter) {
      const searchTerm = companyFilter.toLowerCase();
      filteredAccounts = filteredAccounts.filter(account =>
        account.company_name?.toLowerCase().includes(searchTerm) ||
        account.user_email?.toLowerCase().includes(searchTerm)
      );
    }

    if (useCase) {
      const searchTerm = useCase.toLowerCase();
      filteredAccounts = filteredAccounts.filter(account =>
        account.use_case?.toLowerCase().includes(searchTerm)
      );
    }

    if (minSignInCount) {
      const minCount = parseInt(minSignInCount);
      filteredAccounts = filteredAccounts.filter(account =>
        account.sign_in_count >= minCount
      );
    }

    if (hasSDKConnect) {
      filteredAccounts = filteredAccounts.filter(account =>
        account.dt_sdk_connect != null
      );
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedAccounts = filteredAccounts.slice(startIndex, endIndex);

    // Calculate pagination metadata
    const totalCount = filteredAccounts.length;
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Response
    const response = {
      data: paginatedAccounts,
      pagination: {
        page,
        limit,
        total_count: totalCount,
        total_pages: totalPages,
        has_next_page: hasNextPage,
        has_prev_page: hasPrevPage,
      },
      filters: {
        icp_intent_only: icpIntentOnly,
        company_filter: companyFilter,
        use_case: useCase,
        min_sign_in_count: minSignInCount,
        has_sdk_connect: hasSDKConnect,
      },
      summary: {
        total_icp_intent: allAccounts.filter(a => a.icp_intent === 'yes').length,
        total_with_sdk: allAccounts.filter(a => a.dt_sdk_connect != null).length,
        avg_sign_in_count: Math.round(
          allAccounts.reduce((sum, a) => sum + a.sign_in_count, 0) / allAccounts.length
        ),
      },
      timestamp: new Date().toISOString(),
    };

    console.log(`✅ Retrieved ${paginatedAccounts.length} accounts (${totalCount} total after filters)`);

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ ICP accounts API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch ICP accounts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}