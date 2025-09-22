import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { executeSnowflakeQuery, ICPAccount } from '@/lib/snowflake';

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
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const company = searchParams.get('company');
    const useCase = searchParams.get('use_case');
    const hasSDKConnect = searchParams.get('has_sdk_connect') === 'true';
    const minSignInCount = searchParams.get('min_sign_in_count');
    const packagePlan = searchParams.get('package_plan');
    const accountOwnerOnly = searchParams.get('account_owner_only') === 'true';

    console.log(`🔍 Fetching ICP accounts for ${session.user.email} - Page ${page}, Limit ${limit}`);

    // Build the base query with filters
    let query = `
with admin_info as (
    select
        account_overview.ably_account_id,
        account_users.user_id as ably_user_id,
        account_overview.dt_created_at,
        account_overview.account_owner,
        account_overview.current_package_payment_plan,
        account_overview.icp_validated,
        account_overview.icp_validated_at,
        web_admin.company_name,
        web_admin.sign_in_count,
        web_admin.last_sign_in_at,
        web_admin.user_email
    from ABLY_ANALYTICS_PRODUCTION.MODELLED_COMMERCIAL.ACCOUNT_OVERVIEW_ALL_ACCOUNTS account_overview
    left join ABLY_ANALYTICS_PRODUCTION.STAGING_WEB_ADMIN_PUBLIC.STAGING_WEB_ADMIN_ACCOUNT_USERS account_users
        on account_overview.ably_account_id = account_users.account_id
    left join ABLY_ANALYTICS_PRODUCTION.STAGING_WEB_ADMIN_PUBLIC.STAGING_WEB_ADMIN_USERS web_admin
        on web_admin.user_id = account_users.user_id
    where
        account_overview.dt_created_at is not null
        and account_overview.icp_validated = true
        and current_package_payment_plan in ('free_tier', 'ably_standard', 'ably_pro')
),

firmographics as (
    select
        ably_user_id,
        brings_you_here,
        whos_developing,
        scale_needs
    from ABLY_ANALYTICS_PRODUCTION.STAGING_WEB_ADMIN_PUBLIC.STAGING_WEB_ADMIN_FIRMOGRAPHICS
),

crm_info as (
    select
        PROPERTY_FIRSTNAME as first_name,
        PROPERTY_LASTNAME as last_name,
        TRY_CAST(property_ably_id as integer) as ably_id,
        property_hs_analytics_num_page_views as num_website_visits,
        property_use_case as use_case
    from ABLY_ANALYTICS_PRODUCTION.STAGING_HUBSPOT.STAGING_HUBSPOT_CONTACTS
    where property_ably_id is not null
),

dt_sdk_connect as (
    select
        account_id,
        dt_sdk_connect,
        messages,
        peak_connections,
        peak_channels
    from (
        SELECT
            account_id,
            interval_started_at::date AS dt_sdk_connect,
            messages_all_all_count AS messages,
            connections_all_peak_max AS peak_connections,
            channels_peak_max AS peak_channels,
            ROW_NUMBER() OVER (PARTITION BY account_id ORDER BY interval_started_at) AS rn
        FROM ABLY_ANALYTICS_PRODUCTION.MODELLED_PRODUCT_USAGE.ACCOUNT_APP_STATS_BY_DAY
        WHERE
            (messages_all_all_count >= 5 OR connections_all_peak_max >= 2 OR channels_peak_max >= 2)
            AND account_id IS NOT NULL
    )
    WHERE rn = 1
)

select
    admin_info.ably_account_id,
    admin_info.ably_user_id,
    crm_info.first_name,
    crm_info.last_name,
    admin_info.user_email,
    admin_info.company_name,
    admin_info.dt_created_at::date as dt_sign_up,
    dt_sdk_connect.dt_sdk_connect,
    admin_info.last_sign_in_at::date as dt_last_sign_in,
    admin_info.account_owner,
    admin_info.current_package_payment_plan,
    admin_info.icp_validated,
    admin_info.icp_validated_at::date as icp_validated_date,
    crm_info.use_case,
    admin_info.sign_in_count,
    crm_info.num_website_visits,
    dt_sdk_connect.messages,
    dt_sdk_connect.peak_connections,
    dt_sdk_connect.peak_channels,
    firmographics.brings_you_here,
    firmographics.whos_developing,
    firmographics.scale_needs
from admin_info
left join dt_sdk_connect on dt_sdk_connect.account_id = admin_info.ably_account_id
left join crm_info on crm_info.ably_id = admin_info.ably_user_id
left join firmographics on firmographics.ably_user_id = admin_info.ably_user_id
where 1=1`;

    // Add filters to WHERE clause
    const filterConditions = [];

    if (company) {
      filterConditions.push(`(LOWER(admin_info.company_name) LIKE LOWER('%${company}%') OR LOWER(admin_info.user_email) LIKE LOWER('%${company}%'))`);
    }

    if (useCase) {
      filterConditions.push(`LOWER(crm_info.use_case) LIKE LOWER('%${useCase}%')`);
    }

    if (hasSDKConnect) {
      filterConditions.push(`dt_sdk_connect.dt_sdk_connect IS NOT NULL`);
    }

    if (minSignInCount) {
      filterConditions.push(`admin_info.sign_in_count >= ${parseInt(minSignInCount)}`);
    }

    if (packagePlan) {
      filterConditions.push(`admin_info.current_package_payment_plan = '${packagePlan}'`);
    }

    if (accountOwnerOnly) {
      filterConditions.push(`admin_info.account_owner = true`);
    }

    if (filterConditions.length > 0) {
      query += ` AND ${filterConditions.join(' AND ')}`;
    }

    query += `
order by
    admin_info.ably_account_id desc,
    admin_info.dt_created_at desc`;

    // Execute the query to get all matching records
    const allAccounts = await executeSnowflakeQuery<ICPAccount>(query);

    // Apply pagination
    const totalCount = allAccounts.length;
    const totalPages = Math.ceil(totalCount / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedAccounts = allAccounts.slice(startIndex, endIndex);

    const result = {
      data: paginatedAccounts,
      pagination: {
        page,
        limit,
        total_count: totalCount,
        total_pages: totalPages,
        has_next_page: page < totalPages,
        has_prev_page: page > 1,
      },
    };

    console.log(`✅ Retrieved ${paginatedAccounts.length} ICP accounts (${totalCount} total)`);
    console.log('🔍 Sample account data:', JSON.stringify(paginatedAccounts[0], null, 2));

    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ ICP Accounts API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch ICP accounts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}