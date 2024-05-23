def info():
    return """
    with admin_info as (
        select 
            ably_account_id,
            account_owner_user_id ably_user_id,
            dt_created_at,
            account_owner,
            current_package_payment_plan,
            web_admin.company_name,
            sign_in_count,
            last_sign_in_at,
            user_email,
        from
            ABLY_ANALYTICS_PRODUCTION.MODELLED_COMMERCIAL.ACCOUNT_OVERVIEW_ALL_ACCOUNTS
        left join
            ABLY_ANALYTICS_PRODUCTION.STAGING_WEB_ADMIN_PUBLIC.STAGING_WEB_ADMIN_USERS web_admin
        on
            ably_user_id = user_id
        where 
            dt_created_at is not null
        and
            dt_created_at between
                case DAYNAME(getdate())
                    when 'Mon' THEN dateadd('day', -4, getdate())
                    when 'Tue' THEN dateadd('day', -3, getdate())
                    when 'Wed' THEN dateadd('day', -2, getdate())
                    when 'Thu' THEN dateadd('day', -2, getdate())
                    when 'Fri' THEN dateadd('day', -2, getdate())
                    else getdate()
                end
                and
                case DAYNAME(getdate())
                    WHEN 'Mon' THEN dateadd('day', -2, getdate())
                    WHEN 'Tue' THEN dateadd('day', -1, getdate())
                    when 'Wed' THEN dateadd('day', -1, getdate())
                    when 'Thu' THEN dateadd('day', -1, getdate())
                    when 'Fri' THEN dateadd('day', -1, getdate())
                    ELSE getdate()
                END
        order by 
            dt_created_at desc
    ),

    crm_info as (
        select 
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
        ably_user_id,
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
        CASE WHEN dt_sdk_connect IS NULL THEN 'false' ELSE 'true' END AS sdk_connected,    
    from admin_info
    left join dt_sdk_connect
    on account_id = ably_account_id
    left join crm_info
    on ably_id = ably_user_id

    """