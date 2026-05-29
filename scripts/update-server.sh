#!/bin/bash
set -x

# --- SWAP CONFIGURATION ---
# Check if swap exists, if not create 2GB swap
if [ $(free -m | grep Swap | awk '{print $2}') -eq 0 ]; then
    echo "Adding 2G swap file to prevent OOM..."
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    # Persist swap
    if ! grep -q "/swapfile" /etc/fstab; then
        echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    fi
    echo "Swap added."
else
    echo "Swap already exists."
fi

export NVM_DIR="$HOME/.nvm"

# Function to load NVM
load_nvm() {
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
}

# Try loading NVM
load_nvm

# Check for npm
if ! command -v npm &> /dev/null; then
    echo "npm not found. Checking standard paths..."
    export PATH=$PATH:/usr/local/bin:/usr/bin
fi

if ! command -v npm &> /dev/null; then
    echo "npm/node not found. Attempting to install NVM and Node.js..."
    
    # Install NVM
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    
    # Load NVM again
    load_nvm
    
    # Install Node
    echo "Installing Node.js 20..."
    nvm install 20
    nvm use 20
    nvm alias default 20
    
    # Ensure npm is now available
    if ! command -v npm &> /dev/null; then
        echo "CRITICAL: Failed to install Node.js/npm. Aborting."
        exit 1
    fi
    echo "Node.js $(node -v) installed."
fi

APP_DIR="aquaflow"

echo "--- STARTING UPDATE on $(date) ---"

# Ensure target directory exists
if [ ! -d "$HOME/$APP_DIR" ]; then
    echo "Creating directory $APP_DIR..."
    mkdir -p "$HOME/$APP_DIR"
fi

# Unzip artifact (using zip)
echo "Stopping application..."
pm2 stop aquaflow || true

echo "Fixing permissions..."
if [ -d ~/$APP_DIR ]; then
    sudo chown -R $USER:$USER ~/$APP_DIR
fi

echo "Extracting artifact..."
if ! command -v unzip &> /dev/null; then
    echo "Installing unzip..."
    sudo apt-get update && sudo apt-get install -y unzip
fi

unzip -o ~/aquaflow-deploy.zip -d ~/$APP_DIR
UNZIP_RET=$?
# Treat 0 (success), 1 (one or more warnings), and 2 (minor errors) as acceptable
if [ $UNZIP_RET -ne 0 ] && [ $UNZIP_RET -ne 1 ] && [ $UNZIP_RET -ne 2 ]; then
    echo "Extraction failed with error code $UNZIP_RET"
    exit 1
fi
if [ $UNZIP_RET -eq 1 ] || [ $UNZIP_RET -eq 2 ]; then
    echo "Warning: Unzip returned code $UNZIP_RET, continuing..."
fi
echo "Extraction completed"

echo "Fixing permissions again..."
sudo chown -R $USER:$USER ~/$APP_DIR
chmod -R u+rwX ~/$APP_DIR

cd ~/$APP_DIR

if [ ! -f ".env" ]; then
    echo 'DATABASE_URL="file:./dev.db"' > .env
    PUBLIC_IP=$(curl -s ifconfig.me || echo "52.91.243.25")
    echo "NEXTAUTH_URL=\"http://$PUBLIC_IP\"" >> .env
    if ! grep -q "NEXTAUTH_SECRET=" .env; then
        echo "NEXTAUTH_SECRET=\"change_me\"" >> .env
    fi
else
    PUBLIC_IP=$(curl -s ifconfig.me || echo "52.91.243.25")
    if grep -q "NEXTAUTH_URL=" .env; then
        sed -i "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=http://$PUBLIC_IP|g" .env
    else
        echo "NEXTAUTH_URL=\"http://$PUBLIC_IP\"" >> .env
    fi
    if ! grep -q "DATABASE_URL=" .env; then
        echo 'DATABASE_URL="file:./dev.db"' >> .env
    fi
fi

echo "Cleaning up previous build artifacts..."
rm -rf .next
rm -rf node_modules/.cache
rm -f tsconfig.tsbuildinfo

# Install dependencies
echo "Installing dependencies..."
# Ensure dev dependencies are installed by setting NODE_ENV=development
export NODE_ENV=development
# Use legacy-peer-deps to avoid strict resolution errors
npm install --no-audit --legacy-peer-deps || { echo "npm install failed"; exit 1; }

# Clean npm cache to free space for build
echo "Cleaning npm cache..."
npm cache clean --force
rm -rf ~/.npm
rm -rf ~/.cache

# Generate Prisma Client
echo "Generating Prisma Client..."
# Use specific version to match project (avoid Prisma 7 breaking changes if not ready)
npx prisma@6.7.0 generate || { echo "prisma generate failed"; exit 1; }

# Run migrations (using db push as we are not using migration files yet)
echo "Syncing database schema..."
npx prisma@6.7.0 db push || { echo "prisma db push failed"; exit 1; }

echo "Ensuring admin user exists..."
node scripts/ensure_admin.js || true

# Build application
echo "Building Next.js application..."
export NODE_OPTIONS="--max-old-space-size=2048"
export NODE_ENV=production
npm run build || { echo "build failed"; exit 1; }

# Restart Application
echo "Restarting application..."
# Ensure global binaries are in path (pm2)
export PATH=$PATH:$(npm bin -g)

if command -v pm2 &> /dev/null; then
    echo "Configuring PM2..."
    pm2 delete aquaflow || true
    pm2 start npm --name "aquaflow" --cwd "$HOME/$APP_DIR" -- start
    pm2 save
else
    echo "PM2 not found! Installing PM2..."
    npm install -g pm2
    
    if command -v pm2 &> /dev/null; then
        pm2 delete aquaflow || true
        pm2 start npm --name "aquaflow" --cwd "$HOME/$APP_DIR" -- start
        pm2 save
    else
        export PATH=$PATH:$(npm bin -g)
        if command -v pm2 &> /dev/null; then
             pm2 delete aquaflow || true
             pm2 start npm --name "aquaflow" --cwd "$HOME/$APP_DIR" -- start
             pm2 save
        else
             echo "Failed to install/find PM2. Attempting direct execution..."
             nohup npm start > app.log 2>&1 &
             echo "Started with nohup (no PM2)."
        fi
    fi
fi

echo "--- DEPLOYMENT SUCCESSFUL ---"
