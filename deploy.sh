#!/bin/bash

# deploy.sh
#
# Run this script on the Vultr server to pull and apply new code.
# SSH into the server first:
#   ssh root@YOUR_SERVER_IP
#   cd HYGIENE_ACCESSIBILITY/backend
#   bash deploy.sh
#
# Or run it remotely in one command:
#   ssh root@YOUR_SERVER_IP "cd HYGIENE_ACCESSIBILITY/backend && bash deploy.sh"

set -e  # Exit immediately if any command fails

echo "Pulling latest code from GitHub..."
git pull

echo "Installing/updating dependencies..."
npm install

echo "Restarting server with PM2..."
pm2 restart hazard-hound

echo ""
echo "Deploy complete. Hazard-Hound is up to date."
