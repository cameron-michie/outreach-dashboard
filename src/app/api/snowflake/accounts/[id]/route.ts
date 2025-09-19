import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { executeSnowflakeQuery } from '@/lib/snowflake';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const accountId = parseInt(id);

    if (isNaN(accountId)) {
      return NextResponse.json({ error: 'Invalid account ID' }, { status: 400 });
    }

    console.log(`🔍 Fetching account details for ID ${accountId} by ${session.user.email}`);

    // Enhanced account details query
    const accountDetailsQuery = `
      WITH account_overview AS (
        SELECT
          ably_account_id,
          account_users.user_id ably_user_id,
          dt_created_at,
          account_owner,
          current_package_payment_plan,
          web_admin.company_name,
          sign_in_count,
          last_sign_in_at,
          user_email,
          created_at as user_created_at,
          email_verified,
          phone_number
        FROM
          ABLY_ANALYTICS_PRODUCTION.MODELLED_COMMERCIAL.ACCOUNT_OVERVIEW_ALL_ACCOUNTS account_overview
        LEFT JOIN
          ABLY_ANALYTICS_PRODUCTION.STAGING_WEB_ADMIN_PUBLIC.STAGING_WEB_ADMIN_ACCOUNT_USERS account_users
        ON
          account_overview.ably_account_id = account_users.account_id
        LEFT JOIN
          ABLY_ANALYTICS_PRODUCTION.STAGING_WEB_ADMIN_PUBLIC.STAGING_WEB_ADMIN_USERS web_admin
        ON
          web_admin.USER_ID = account_users.user_id
        WHERE
          ably_account_id = ${accountId}
      ),

      firmographics AS (
        SELECT
          ably_user_id,
          brings_you_here,
          whos_developing,
          scale_needs,
          company_size,
          industry,
          role,
          case when
            (
              scale_needs IN ('scale++', 'scaling_up', 'operating_at_scale')
              AND
              whos_developing IN ('single_team', 'larger_team', 'multiple_team')
            )
            then 'yes' else 'no' end as icp_intent
        FROM ABLY_ANALYTICS_PRODUCTION.STAGING_WEB_ADMIN_PUBLIC.STAGING_WEB_ADMIN_FIRMOGRAPHICS
      ),

      crm_info AS (
        SELECT
          PROPERTY_FIRSTNAME first_name,
          PROPERTY_LASTNAME last_name,
          TRY_CAST(property_ably_id as integer) ably_id,
          property_hs_analytics_num_page_views num_website_visits,
          property_use_case use_case,
          property_lifecyclestage lifecycle_stage,
          property_lead_source lead_source,
          property_city city,
          property_country country
        FROM
          ABLY_ANALYTICS_PRODUCTION.STAGING_HUBSPOT.STAGING_HUBSPOT_CONTACTS
        WHERE
          TRY_CAST(property_ably_id as integer) = ${accountId}
      ),

      usage_stats AS (
        SELECT
          account_id,
          COUNT(*) as total_days_active,
          SUM(messages_all_all_count) as total_messages,
          AVG(messages_all_all_count) as avg_daily_messages,
          MAX(connections_all_peak_max) as max_connections,
          MAX(channels_peak_max) as max_channels,
          MIN(interval_started_at) as first_usage_date,
          MAX(interval_started_at) as last_usage_date
        FROM
          ABLY_ANALYTICS_PRODUCTION.MODELLED_PRODUCT_USAGE.ACCOUNT_APP_STATS_BY_DAY
        WHERE
          account_id = ${accountId}
        GROUP BY
          account_id
      ),

      recent_activity AS (
        SELECT
          account_id,
          interval_started_at::date as activity_date,
          messages_all_all_count as daily_messages,
          connections_all_peak_max as peak_connections,
          channels_peak_max as peak_channels
        FROM
          ABLY_ANALYTICS_PRODUCTION.MODELLED_PRODUCT_USAGE.ACCOUNT_APP_STATS_BY_DAY
        WHERE
          account_id = ${accountId}
          AND interval_started_at >= DATEADD('day', -30, CURRENT_DATE())
        ORDER BY
          interval_started_at DESC
        LIMIT 30
      )

      SELECT
        account_overview.ably_account_id,
        account_overview.ably_user_id,
        account_overview.user_email,
        account_overview.company_name,
        account_overview.dt_created_at::date as dt_sign_up,
        account_overview.sign_in_count,
        account_overview.last_sign_in_at::date as dt_last_sign_in,
        account_overview.current_package_payment_plan as package_plan,
        account_overview.account_owner,
        account_overview.email_verified,
        account_overview.phone_number,

        -- CRM Data
        crm_info.first_name,
        crm_info.last_name,
        crm_info.use_case,
        crm_info.num_website_visits,
        crm_info.lifecycle_stage,
        crm_info.lead_source,
        crm_info.city,
        crm_info.country,

        -- Firmographics
        firmographics.brings_you_here,
        firmographics.whos_developing,
        firmographics.scale_needs,
        firmographics.company_size,
        firmographics.industry,
        firmographics.role,
        firmographics.icp_intent,

        -- Usage Statistics
        usage_stats.total_days_active,
        usage_stats.total_messages,
        usage_stats.avg_daily_messages,
        usage_stats.max_connections,
        usage_stats.max_channels,
        usage_stats.first_usage_date::date as first_usage_date,
        usage_stats.last_usage_date::date as last_usage_date

      FROM account_overview
      LEFT JOIN firmographics ON firmographics.ably_user_id = account_overview.ably_user_id
      LEFT JOIN crm_info ON crm_info.ably_id = account_overview.ably_user_id
      LEFT JOIN usage_stats ON usage_stats.account_id = account_overview.ably_account_id
    `;

    // Get recent activity separately due to array structure
    const recentActivityQuery = `
      SELECT
        interval_started_at::date as activity_date,
        messages_all_all_count as daily_messages,
        connections_all_peak_max as peak_connections,
        channels_peak_max as peak_channels
      FROM
        ABLY_ANALYTICS_PRODUCTION.MODELLED_PRODUCT_USAGE.ACCOUNT_APP_STATS_BY_DAY
      WHERE
        account_id = ${accountId}
        AND interval_started_at >= DATEADD('day', -30, CURRENT_DATE())
      ORDER BY
        interval_started_at DESC
      LIMIT 30
    `;

    const [accountDetails, recentActivity] = await Promise.all([
      executeSnowflakeQuery(accountDetailsQuery),
      executeSnowflakeQuery(recentActivityQuery)
    ]);

    if (!accountDetails || accountDetails.length === 0) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const account = accountDetails[0];

    // Calculate engagement score based on various factors
    const calculateEngagementScore = (account: any, activity: any[]) => {
      let score = 0;

      // Recent sign-in activity (0-25 points)
      if (account.sign_in_count > 10) score += 25;
      else if (account.sign_in_count > 5) score += 15;
      else if (account.sign_in_count > 1) score += 10;

      // Usage patterns (0-25 points)
      if (account.total_messages > 1000) score += 25;
      else if (account.total_messages > 100) score += 15;
      else if (account.total_messages > 10) score += 10;

      // Recent activity (0-25 points)
      const recentDays = activity.length;
      if (recentDays > 20) score += 25;
      else if (recentDays > 10) score += 15;
      else if (recentDays > 5) score += 10;

      // ICP alignment (0-25 points)
      if (account.icp_intent === 'yes') score += 25;
      else if (account.scale_needs === 'scaling_up') score += 15;
      else if (account.whos_developing === 'larger_team') score += 10;

      return Math.min(score, 100);
    };

    const engagementScore = calculateEngagementScore(account, recentActivity);

    const response = {
      account: {
        ...account,
        engagement_score: engagementScore,
        recent_activity: recentActivity
      },
      insights: {
        engagement_level: engagementScore >= 75 ? 'high' : engagementScore >= 50 ? 'medium' : 'low',
        is_icp_match: account.icp_intent === 'yes',
        has_recent_activity: recentActivity.length > 0,
        total_usage_days: account.total_days_active || 0,
        avg_daily_messages: Math.round(account.avg_daily_messages || 0),
        days_since_last_usage: account.last_usage_date ?
          Math.floor((new Date().getTime() - new Date(account.last_usage_date).getTime()) / (1000 * 60 * 60 * 24)) : null
      },
      timestamp: new Date().toISOString()
    };

    console.log(`✅ Retrieved detailed account info for ${account.company_name || account.user_email}`);

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ Account details API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch account details',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}