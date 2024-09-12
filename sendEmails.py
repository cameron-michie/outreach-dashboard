from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import base64

SCOPES = ['https://www.googleapis.com/auth/gmail.send']

def create_message(sender, to, subject, message_html):
    """Create a message to send in an email."""
    message = MIMEMultipart("alternative")
    message['to'] = to
    message['from'] = sender
    message['subject'] = subject
    message['bcc'] = "6939709@bcc.hubspot.com"
    part_html = MIMEText(message_html, 'html')
    message.attach(part_html)
    return {'raw': base64.urlsafe_b64encode(message.as_bytes()).decode()}

def send_message(email_bodies, email_subjects, to_emails):
    flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
    creds = flow.run_local_server(port=0)
    service = build('gmail', 'v1', credentials=creds)
    sender = "cameron.michie@ably.com"
    
    for body, subject, to_email in zip(email_bodies, email_subjects, to_emails):
        message = create_message(sender, to_email, subject, body)
        result = service.users().messages().send(userId="me", body=message).execute()
        print(f"Message Id: {result['id']} - sent to {to_email}.")