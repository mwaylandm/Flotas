#!/bin/bash

# Exit on error
set -e

echo "--- INSTALLING NGINX ---"
sudo apt-get update
sudo apt-get install -y nginx

echo "--- CONFIGURING NGINX ---"

# Create configuration file
CONFIG_CONTENT="server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}"

# Write config to available sites
echo "$CONFIG_CONTENT" | sudo tee /etc/nginx/sites-available/aquaflow > /dev/null

# Remove default site if it exists
if [ -f /etc/nginx/sites-enabled/default ]; then
    sudo rm /etc/nginx/sites-enabled/default
fi

# Link aquaflow config if not already linked
if [ ! -f /etc/nginx/sites-enabled/aquaflow ]; then
    sudo ln -s /etc/nginx/sites-available/aquaflow /etc/nginx/sites-enabled/
fi

echo "--- TESTING CONFIGURATION ---"
sudo nginx -t

echo "--- RESTARTING NGINX ---"
sudo systemctl restart nginx

echo "--- NGINX STATUS ---"
sudo systemctl status nginx --no-pager

echo "--- VERIFICATION ---"
curl -I http://localhost:80
