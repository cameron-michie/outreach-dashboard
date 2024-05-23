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
    part_html = MIMEText(message_html, 'html')
    message.attach(part_html)
    return {'raw': base64.urlsafe_b64encode(message.as_bytes()).decode()}

def main():
    flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
    creds = flow.run_local_server(port=0)
    service = build('gmail', 'v1', credentials=creds)

    sender = "cameron.michie@ably.com"
    to = "cameron.oscar.michie@gmail.com"
    subject = "Hello from Python!"
    message_html = """
    <html>
        <body>
            <p>Hi,<br>
               This is a <b>test email</b> sent from a Python script using the Gmail API with <i>HTML formatting</i>.
            </p>
        </body>
    </html>
    """

    message = create_message(sender, to, subject, message_html)
    result = service.users().messages().send(userId="me", body=message).execute()
    print(f"Message Id: {result['id']}")

if __name__ == '__main__':
    main()