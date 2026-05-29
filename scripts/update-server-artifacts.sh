#!/bin/bash

# Ensure swap is active
if [ $(free -m | grep Swap | awk '{print $2}') -eq 0 ]; then
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
fi

APP_DIR="aquaflow"
echo "--- STARTING ARTIFACT DEPLOYMENT on $(date) ---"

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Ensure node and npm are available
if ! command -v npm &> /dev/null; then
    echo "Error: npm could not be found. Is NVM installed?"
    exit 1
fi

# Ensure target directory exists
mkdir -p "$HOME/$APP_DIR"

# Unzip artifact
echo "Unzipping artifacts..."
unzip -o ~/aquaflow-artifacts.zip -d ~/$APP_DIR > /dev/null

cd ~/$APP_DIR

# Fix .env for production
echo "Configuring environment variables..."
PUBLIC_IP=$(curl -s ifconfig.me)
if [ -z "$PUBLIC_IP" ]; then
    PUBLIC_IP="52.91.243.25"
fi
echo "Detected Public IP: $PUBLIC_IP"

# Replace NEXTAUTH_URL
if grep -q "NEXTAUTH_URL=" .env; then
    sed -i "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=http://$PUBLIC_IP:3000|g" .env
else
    echo "NEXTAUTH_URL=\"http://$PUBLIC_IP:3000\"" >> .env
fi

# Ensure DATABASE_URL is set (default to local sqlite if missing/wrong)
if ! grep -q "DATABASE_URL=" .env; then
    echo 'DATABASE_URL="file:./dev.db"' >> .env
fi

# Install production dependencies only
echo "Installing production dependencies..."
npm install --production --no-audit --legacy-peer-deps || { echo "npm install failed"; exit 1; }

# Generate Prisma Client (needed for runtime)
echo "Generating Prisma Client..."
npx prisma generate || { echo "prisma generate failed"; exit 1; }

# Run migrations
echo "Running database migrations..."
npx prisma migrate deploy || { echo "prisma migrate failed"; exit 1; }

# Restart Application
echo "Restarting application..."
export PATH=$PATH:$(npm bin -g)

if command -v pm2 &> /dev/null; then
    pm2 delete aquaflow || true
    pm2 start npm --name "aquaflow" --cwd "$HOME/$APP_DIR" -- start
    pm2 save
else
    npm install -g pm2
    pm2 delete aquaflow || true
    pm2 start npm --name "aquaflow" --cwd "$HOME/$APP_DIR" -- start
    pm2 save
fi

echo "--- DEPLOYMENT SUCCESSFUL ---"
