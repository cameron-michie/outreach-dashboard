from flask import Flask, request, jsonify
from flask_cors import CORS
from snowflakeConnector import process_snowflake_query
from sendEmails import send_message

app = Flask(__name__)
CORS(app)

@app.route('/run_script', methods=['POST'])
def run_script():
    data = request.get_json()
    print("Received data:", data)
    dashboard_data = process_snowflake_query()
    return jsonify(dashboard_data)

@app.route('/send_emails', methods=['POST'])
def send_emails():
    allEmailData = request.get_json()
    print("Received data:", allEmailData)
    emailBody, emailSubjects, emailTo = [], [], [] # Written using Vim motionw
    for emailData in allEmailData: 
        emailBody.append(emailData['emailHtml'])
        emailSubjects.append(emailData['emailSubject'])
        emailTo.append(emailData['USER_EMAIL'])
    send_message(emailBody, emailSubjects, emailTo)
    return jsonify({"messaga": "Emails received and processed successfully!"}), 200

@app.route('/')
def home():
    return "Welcome to the Flask Server!"

if __name__ == '__main__':
    app.run(host='localhost', debug=True, port=5000)
