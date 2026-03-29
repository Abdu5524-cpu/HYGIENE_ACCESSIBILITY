#!/bin/bash

# setup-vultr.sh
#
# Manual setup script for a fresh Vultr Ubuntu server.
# Run these commands over SSH after provisioning the server.
#
# Usage:
#   ssh root@YOUR_SERVER_IP
#   then paste or run this script
#
# NOTE: You must manually create the .env file (step 8) before
# starting the server. The script will remind you.

set -e  # Exit immediately if any command fails

# ---------------------------------------------------------------------------
# 1. Update apt package list and upgrade installed packages
# ---------------------------------------------------------------------------
echo "Updating apt packages..."
apt update && apt upgrade -y

# ---------------------------------------------------------------------------
# 2. Install Node.js 20 via NodeSource official setup script
#    This adds the NodeSource apt repository and installs Node 20 + npm
# ---------------------------------------------------------------------------
echo "Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Confirm Node and npm versions
node -v
npm -v

# ---------------------------------------------------------------------------
# 3. Install Git
# ---------------------------------------------------------------------------
echo "Installing Git..."
apt install -y git

# ---------------------------------------------------------------------------
# 4. Clone the Hazard-Hound repository
# ---------------------------------------------------------------------------
echo "Cloning repository..."
git clone https://github.com/Abdu5524-cpu/HYGIENE_ACCESSIBILITY

# ---------------------------------------------------------------------------
# 5. cd into the repo
# ---------------------------------------------------------------------------
cd HYGIENE_ACCESSIBILITY/backend

# ---------------------------------------------------------------------------
# 6. Install npm dependencies
# ---------------------------------------------------------------------------
echo "Installing npm dependencies..."
npm install

# ---------------------------------------------------------------------------
# 7. Install PM2 globally
#    PM2 is a process manager that keeps Node apps alive and restarts
#    them automatically if they crash.
# ---------------------------------------------------------------------------
echo "Installing PM2..."
npm install -g pm2

# ---------------------------------------------------------------------------
# 8. MANUAL STEP — create the .env file before starting the server
#
#    You must run this yourself (do not put secrets in this script):
#
#      nano .env
#
#    Then add:
#      MONGO_URI=mongodb+srv://auralov_db_user:YOURPASSWORD@hazard-hound.h8xedz3.mongodb.net/?appName=Hazard-Hound
#      PORT=3000
#
#    Replace YOURPASSWORD with the actual Atlas password.
#    Save and exit nano with Ctrl+O, Enter, Ctrl+X.
# ---------------------------------------------------------------------------
echo ""
echo "============================================================"
echo "ACTION REQUIRED: Create your .env file before continuing."
echo "  Run: nano .env"
echo "  Add: MONGO_URI=... and PORT=3000"
echo "  Then re-run the remaining steps below."
echo "============================================================"
echo ""

# Pause so the user can read the message before the script continues
read -p "Press Enter once your .env file is ready..."

# ---------------------------------------------------------------------------
# 9. Start server.js with PM2
#    --name gives the process a friendly label for pm2 status/logs
# ---------------------------------------------------------------------------
echo "Starting server with PM2..."
pm2 start server.js --name "hazard-hound"

# ---------------------------------------------------------------------------
# 10. Save the PM2 process list and set it to start on reboot
#     pm2 startup generates a systemd command — run the output it prints
#     pm2 save writes the current process list so it is restored on boot
# ---------------------------------------------------------------------------
echo "Configuring PM2 to survive reboots..."
pm2 startup    # This prints a command — copy and run it if prompted
pm2 save

# ---------------------------------------------------------------------------
# 11. Done
# ---------------------------------------------------------------------------
echo ""
echo "============================================================"
echo "Hazard-Hound is running!"
echo "Server IP: YOUR_SERVER_IP"
echo "API available at: http://YOUR_SERVER_IP:3000"
echo ""
echo "Useful PM2 commands:"
echo "  pm2 status          — check if the server is running"
echo "  pm2 logs            — tail the server logs"
echo "  pm2 restart hazard-hound — restart after changes"
echo "============================================================"
