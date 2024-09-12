#!/bin/bash

# Activating the Python environment
echo "Activating myflaskapp environment..."
source ~/venvs/myflaskapp/bin/activate

# Running the Flask application
echo "Starting Flask app from app.py..."
python /Users/cameronoscarmichie/outreach-dashboard/app.py > flask_output.log 2>&1 &

# Waiting for Flask to initialize (optional, adjust sleep time as necessary)
echo "Waiting for Flask server to initialize..."
sleep 5

# Building the React project
echo "Building React dashboard..."
cd /Users/cameronoscarmichie/outreach-dashboard/react-dashboard
npm run build


if [ $? -eq 0 ]; then
    echo "React build successful, starting Electron app..."
    # Starting the Electron app
    cd /Users/cameronoscarmichie/outreach-dashboard
    npm start
else
    echo "React build failed, check the logs for errors."
fi