from flask import Flask, request, jsonify
from flask_cors import CORS
from snowflakeConnector import process_snowflake_query

app = Flask(__name__)
CORS(app)

@app.route('/run_script', methods=['POST'])
def run_script():
    data = request.get_json()
    print("Received data:", data)
    dashboard_data = process_snowflake_query()
    return jsonify(dashboard_data)

@app.route('/')
def home():
    return "Welcome to the Flask Server!"

if __name__ == '__main__':
    app.run(host='localhost', debug=True, port=5000)
