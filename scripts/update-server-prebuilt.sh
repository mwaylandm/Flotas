#!/bin/bash

# --- SWAP CONFIGURATION ---
if [ $(free -m | grep Swap | awk '{print $2}') -eq 0 ]; then
    echo "Adding 2G swap file..."
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    if ! grep -q "/swapfile" /etc/fstab; then
        echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    fi
fi

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

APP_DIR="aquaflow"

echo "--- STARTING UPDATE (PREBUILT) on $(date) ---"

# Ensure target directory exists
mkdir -p "$HOME/$APP_DIR"

# Clean previous build artifacts to ensure clean state
echo "Cleaning previous build..."
rm -rf "$HOME/$APP_DIR/.next"

# Unzip artifact
echo "Unzipping artifact..."
unzip -o ~/aquaflow-deploy.zip -d ~/$APP_DIR > /dev/null

cd ~/$APP_DIR

# Install dependencies
echo "Installing dependencies..."
npm install --production --no-audit --legacy-peer-deps || { echo "npm install failed"; exit 1; }

# Generate Prisma Client
echo "Generating Prisma Client..."
npx prisma@6.7.0 generate || { echo "prisma generate failed"; exit 1; }

# Run migrations
echo "Running database migrations..."
npx prisma@6.7.0 migrate deploy || { echo "prisma migrate failed"; exit 1; }

# Restart Application
echo "Restarting application..."

# FIX PM2 PATH issues
export PATH=$PATH:/usr/bin:/bin:/usr/sbin:/sbin

if command -v pm2 &> /dev/null; then
    echo "Configuring PM2..."
    pm2 delete aquaflow || true
    pm2 start npm --name "aquaflow" --cwd "$HOME/$APP_DIR" -- start
    pm2 save
else
    echo "PM2 not found! Installing PM2..."
    npm install -g pm2
    
    pm2 delete aquaflow || true
    pm2 start npm --name "aquaflow" --cwd "$HOME/$APP_DIR" -- start
    pm2 save
fi

echo "--- DEPLOYMENT SUCCESSFUL ---"
