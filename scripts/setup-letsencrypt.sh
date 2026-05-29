#!/bin/bash

# Define domain based on IP
DOMAIN="52.91.243.25.sslip.io"
EMAIL="admin@aquaflow.com" # Dummy email for certbot

echo "--- Setting up Real SSL for $DOMAIN ---"

# Install Certbot
echo "Installing Certbot..."
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx

# Configure Nginx with domain
echo "Configuring Nginx for $DOMAIN..."
cat << EOF | sudo tee /etc/nginx/sites-available/aquaflow
server {
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN";
        add_header X-XSS-Protection "1; mode=block";
        add_header X-Content-Type-Options "nosniff";
    }

    listen 80;
}
EOF

# Reload Nginx to apply basic config
sudo systemctl reload nginx

# Obtain Certificate
echo "Obtaining Let's Encrypt Certificate..."
# Use --non-interactive and --agree-tos
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m $EMAIL --redirect

# Update .env if it exists to use new domain for NEXTAUTH_URL
ENV_FILE="/home/ubuntu/aquaflow/.env"
if [ -f "$ENV_FILE" ]; then
    echo "Updating NEXTAUTH_URL in .env..."
    # Replace existing NEXTAUTH_URL or append if not exists
    if grep -q "NEXTAUTH_URL" "$ENV_FILE"; then
        sed -i "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=https://$DOMAIN|g" "$ENV_FILE"
    else
        echo "NEXTAUTH_URL=https://$DOMAIN" >> "$ENV_FILE"
    fi
else
    echo "Creating .env with NEXTAUTH_URL..."
    echo "NEXTAUTH_URL=https://$DOMAIN" > "$ENV_FILE"
fi

echo "--- SSL Setup Complete ---"
echo "New URL: https://$DOMAIN"
