import snowflake from 'snowflake-sdk';
import { env } from './env';

interface SnowflakeConnection {
  connection: any;
  isConnected: boolean;
}

let globalConnection: SnowflakeConnection | null = null;

export async function getSnowflakeConnection(): Promise<any> {
  if (globalConnection?.isConnected) {
    return globalConnection.connection;
  }

  const connection = snowflake.createConnection({
    account: env.snowflake.account,
    username: env.snowflake.username,
    password: env.snowflake.password || undefined,
    authenticator: env.snowflake.authenticator,
    warehouse: env.snowflake.warehouse,
    database: env.snowflake.database,
    schema: env.snowflake.schema,
  });

  // Use connectAsync for external browser authenticator
  return new Promise((resolve, reject) => {
    if (env.snowflake.authenticator === 'externalbrowser') {
      connection.connectAsync((err: any, conn: any) => {
        if (err) {
          console.error('Failed to connect to Snowflake:', err);
          reject(err);
          return;
        }

        console.log('✅ Successfully connected to Snowflake');
        globalConnection = {
          connection: conn,
          isConnected: true,
        };
        resolve(conn);
      });
    } else {
      connection.connect((err: any, conn: any) => {
        if (err) {
          console.error('Failed to connect to Snowflake:', err);
          reject(err);
          return;
        }

        console.log('✅ Successfully connected to Snowflake');
        globalConnection = {
          connection: conn,
          isConnected: true,
        };
        resolve(conn);
      });
    }
  });
}

export async function executeSnowflakeQuery<T = any>(query: string): Promise<T[]> {
  const connection = await getSnowflakeConnection();

  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText: query,
      complete: (err: any, stmt: any, rows: any[]) => {
        if (err) {
          console.error('Snowflake query error:', err);
          reject(err);
          return;
        }

        console.log(`✅ Snowflake query executed successfully, returned ${rows?.length || 0} rows`);
        resolve(rows || []);
      },
    });
  });
}

export async function closeSnowflakeConnection(): Promise<void> {
  if (globalConnection?.isConnected) {
    return new Promise((resolve) => {
      globalConnection!.connection.destroy((err: any, conn: any) => {
        if (err) {
          console.error('Error closing Snowflake connection:', err);
        } else {
          console.log('🔌 Snowflake connection closed');
        }
        globalConnection = null;
        resolve();
      });
    });
  }
}

// ICP Query based on the archive/queries.py
export const ICP_QUERY = `
  with admin_info as (
    select
      ably_account_id,
      account_users.user_id ably_user_id,
      dt_created_at,
      account_owner,
      current_package_payment_plan,
      web_admin.company_name,
      sign_in_count,
      last_sign_in_at,
      user_email
    from
      ABLY_ANALYTICS_PRODUCTION.MODELLED_COMMERCIAL.ACCOUNT_OVERVIEW_ALL_ACCOUNTS account_overview
    left join
      ABLY_ANALYTICS_PRODUCTION.STAGING_WEB_ADMIN_PUBLIC.STAGING_WEB_ADMIN_ACCOUNT_USERS account_users
    on
      account_overview.ably_account_id = account_users.account_id
    left join
      ABLY_ANALYTICS_PRODUCTION.STAGING_WEB_ADMIN_PUBLIC.STAGING_WEB_ADMIN_USERS web_admin
    on
      web_admin.USER_ID = account_users.user_id
    where
      dt_created_at is not null
    and
      dt_created_at between
        case DAYNAME(getdate())
          when 'Mon' THEN dateadd('day', -4, getdate()::date)
          when 'Tue' THEN dateadd('day', -3, getdate()::date)
          when 'Wed' THEN dateadd('day', -2, getdate()::date)
          when 'Thu' THEN dateadd('day', -2, getdate()::date)
          when 'Fri' THEN dateadd('day', -2, getdate()::date)
          else getdate()
        end
        and
        case DAYNAME(getdate())
          WHEN 'Mon' THEN dateadd('day', -2, getdate()::date)
          WHEN 'Tue' THEN dateadd('day', -1, getdate()::date)
          when 'Wed' THEN dateadd('day', -1, getdate()::date)
          when 'Thu' THEN dateadd('day', -1, getdate()::date)
          when 'Fri' THEN dateadd('day', -1, getdate()::date)
          ELSE getdate()::date
        END
    order by
      dt_created_at desc
  ),
  firmographics as
  (
    select
      ably_user_id,
      brings_you_here,
      whos_developing,
      scale_needs,
      case when
        (
          scale_needs in ('scale++', 'scaling_up', 'operating_at_scale')
          and
          whos_developing in ('single_team', 'larger_team', 'multiple_team')
        )
        then 'yes' else 'no' end as icp_intent
    from ABLY_ANALYTICS_PRODUCTION.STAGING_WEB_ADMIN_PUBLIC.STAGING_WEB_ADMIN_FIRMOGRAPHICS
    order by dt_created_at desc
  ),

  crm_info as (
    select
      PROPERTY_FIRSTNAME first_name,
      PROPERTY_LASTNAME last_name,
      TRY_CAST(property_ably_id as integer) ably_id,
      property_hs_analytics_num_page_views num_website_visits,
      property_use_case use_case
    from
      ABLY_ANALYTICS_PRODUCTION.STAGING_HUBSPOT.STAGING_HUBSPOT_CONTACTS
    where
      property_ably_id is not null
  ),

  dt_sdk_connect as (
    select
      account_id,
      dt_sdk_connect,
      messages,
      peak_connections,
      peak_channels
    from
      (
        SELECT
          account_id,
          interval_started_at::date AS dt_sdk_connect,
          messages_all_all_count AS messages,
          connections_all_peak_max AS peak_connections,
          channels_peak_max AS peak_channels,
          ROW_NUMBER() OVER (PARTITION BY account_id ORDER BY interval_started_at) AS rn
        FROM
          ABLY_ANALYTICS_PRODUCTION.MODELLED_PRODUCT_USAGE.ACCOUNT_APP_STATS_BY_DAY
        WHERE
          (messages_all_all_count >= 5 OR connections_all_peak_max >= 2 OR channels_peak_max >=2)
          AND account_id IS NOT NULL
      )
    WHERE
      rn = 1 or rn is null
  )

  select
    ably_account_id,
    admin_info.ably_user_id,
    first_name,
    last_name,
    user_email,
    company_name,
    dt_created_at::date dt_sign_up,
    dt_sdk_connect,
    last_sign_in_at::date dt_last_sign_in,
    use_case,
    sign_in_count,
    num_website_visits,
    messages,
    peak_connections,
    peak_channels,
    brings_you_here,
    whos_developing,
    scale_needs,
    icp_intent
  from admin_info
  left join dt_sdk_connect
  on account_id = ably_account_id
  left join crm_info
  on ably_id = ably_user_id
  left join firmographics
  on firmographics.ably_user_id = admin_info.ably_user_id
  where
    (
      mod(ably_account_id,2) = 0
    OR
      icp_intent = 'yes'
    )
`;

export interface ICPAccount {
  ably_account_id: number;
  ably_user_id: number;
  first_name: string;
  last_name: string;
  user_email: string;
  company_name: string;
  dt_sign_up: string;
  dt_sdk_connect?: string;
  dt_last_sign_in?: string;
  use_case?: string;
  sign_in_count: number;
  num_website_visits?: number;
  messages?: number;
  peak_connections?: number;
  peak_channels?: number;
  brings_you_here?: string;
  whos_developing?: string;
  scale_needs?: string;
  icp_intent: 'yes' | 'no';
}

export async function getICPAccounts(): Promise<ICPAccount[]> {
  return executeSnowflakeQuery<ICPAccount>(ICP_QUERY);
}