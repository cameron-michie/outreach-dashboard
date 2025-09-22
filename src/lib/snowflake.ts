import snowflake from 'snowflake-sdk';
import { env } from './env';
import { SnowflakeConnection as BaseSnowflakeConnection, SnowflakeError, SnowflakeStatement } from '@/types/common';

interface SnowflakeConnectionWrapper {
  connection: BaseSnowflakeConnection;
  isConnected: boolean;
}

let globalConnection: SnowflakeConnectionWrapper | null = null;

export async function getSnowflakeConnection(): Promise<BaseSnowflakeConnection> {
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
  return new Promise<BaseSnowflakeConnection>((resolve, reject) => {
    if (env.snowflake.authenticator === 'externalbrowser') {
      connection.connectAsync((err: SnowflakeError | null, conn: BaseSnowflakeConnection) => {
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
      connection.connect((err: SnowflakeError | null, conn: BaseSnowflakeConnection) => {
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

export async function executeSnowflakeQuery<T = unknown>(query: string): Promise<T[]> {
  const connection = await getSnowflakeConnection();

  return new Promise<T[]>((resolve, reject) => {
    connection.execute({
      sqlText: query,
      complete: (err: SnowflakeError | null, stmt: SnowflakeStatement, rows: unknown[]) => {
        if (err) {
          console.error('Snowflake query error:', err);
          reject(err);
          return;
        }

        console.log(`✅ Snowflake query executed successfully, returned ${rows?.length || 0} rows`);
        resolve((rows || []) as T[]);
      },
    });
  });
}

export async function closeSnowflakeConnection(): Promise<void> {
  if (globalConnection?.isConnected) {
    return new Promise<void>((resolve) => {
      globalConnection!.connection.destroy((err: SnowflakeError | null, conn: BaseSnowflakeConnection) => {
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

// ICP Query - comprehensive query for validated ICP accounts
export const ICP_QUERY = `
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
order by
    admin_info.ably_account_id desc,
    admin_info.dt_created_at desc
limit 200
`;

export interface ICPAccount {
  ably_account_id: number;
  ably_user_id: number;
  first_name?: string;
  last_name?: string;
  user_email: string;
  company_name: string;
  dt_sign_up: string;
  dt_sdk_connect?: string;
  dt_last_sign_in?: string;
  account_owner: boolean;
  current_package_payment_plan: string;
  icp_validated: boolean;
  icp_validated_date?: string;
  use_case?: string;
  sign_in_count: number;
  num_website_visits?: number;
  messages?: number;
  peak_connections?: number;
  peak_channels?: number;
  brings_you_here?: string;
  whos_developing?: string;
  scale_needs?: string;
}

export async function getICPAccounts(): Promise<ICPAccount[]> {
  return executeSnowflakeQuery<ICPAccount>(ICP_QUERY);
}