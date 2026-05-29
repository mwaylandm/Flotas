#!/bin/bash

# Install Nginx
echo "Installing Nginx..."
sudo apt-get update
sudo apt-get install -y nginx

# Generate Self-Signed Certificate
echo "Generating Self-Signed Certificate..."
sudo mkdir -p /etc/nginx/ssl
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/selfsigned.key \
  -out /etc/nginx/ssl/selfsigned.crt \
  -subj "/C=CL/ST=Santiago/L=Santiago/O=Aquaflow/OU=IT/CN=52.91.243.25"

# Configure Nginx
echo "Configuring Nginx..."
cat << 'EOF' | sudo tee /etc/nginx/sites-available/aquaflow
server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name _;

    ssl_certificate /etc/nginx/ssl/selfsigned.crt;
    ssl_certificate_key /etc/nginx/ssl/selfsigned.key;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN";
        add_header X-XSS-Protection "1; mode=block";
        add_header X-Content-Type-Options "nosniff";
    }
}
EOF

# Link configuration
sudo ln -sf /etc/nginx/sites-available/aquaflow /etc/nginx/sites-enabled/aquaflow
sudo rm -f /etc/nginx/sites-enabled/default

# Restart Nginx
echo "Restarting Nginx..."
sudo systemctl restart nginx
sudo systemctl enable nginx

echo "Nginx setup complete. App should be accessible via https://52.91.243.25"
