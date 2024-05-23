import snowflake.connector
from flask import current_app
from queries import *
import json 

def get_snowflake_connection():
    """Get or create a Snowflake connection."""
    if not hasattr(current_app, 'snowflake_connection'):
        # Establish new Snowflake connection if it doesn't exist
        config = {
            "authenticator": 'externalbrowser',
            "user": 'CAMERON.MICHIE@ABLY.COM',
            "account": 'hk06212.eu-west-1',
            "database": 'ABLY_ANALYTICS_PRODUCTION',
            "schema": 'MODELLED_COMMERCIAL',
            "warehouse": 'VW_CLIENTS_PRODUCTION'
        }
        current_app.snowflake_connection = snowflake.connector.connect(**config)
        print("New Snowflake connection established.")
    return current_app.snowflake_connection

def fetch_data_as_json(sql_query):
    """Execute SQL query using the global Snowflake connection and return results as JSON."""
    connection = get_snowflake_connection()
    with connection.cursor() as cursor:
        cursor.execute(sql_query)
        return cursor.fetch_pandas_all().to_json(orient='index')

def process_snowflake_query(get_sql=info):
    """Main function to handle fetching of data."""
    try:
        json_data = fetch_data_as_json(get_sql())
        parsed_data = json.loads(json_data)
        print(json.dumps(parsed_data, indent=4))
        return parsed_data
    except Exception as e:
        # Handle exception, possibly reinitializing the connection if needed
        print(f"Error processing query: {e}")
        current_app.snowflake_connection.close()
        delattr(current_app, 'snowflake_connection')  # Remove connection if it fails
        raise

if __name__ == "__main__":
    process_snowflake_query()
