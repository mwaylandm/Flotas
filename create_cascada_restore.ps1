
$path = "..\Cascada\scripts\restore-http.sh"
$content = @"
#!/bin/bash
# Script to restore HTTP configuration and remove SSL redirection
# IP: 54.83.100.171

DOMAIN="54.83.100.171"
APP_PORT=3000

echo "--- Restoring HTTP for `$DOMAIN ---"

# 1. Restore Nginx Config
echo "Configuring Nginx for HTTP..."
cat << EOF | sudo tee /etc/nginx/sites-available/cascada
server {
    server_name `$DOMAIN _;

    location / {
        proxy_pass http://localhost:`$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade `$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host `$host;
        proxy_cache_bypass `$http_upgrade;
    }

    listen 80;
}
EOF

# Link configuration (ensure it's linked)
sudo ln -sf /etc/nginx/sites-available/cascada /etc/nginx/sites-enabled/cascada
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# 2. Update .env
ENV_FILE="/var/www/cascada/.env"
echo "Updating .env NEXTAUTH_URL..."
if [ -f "`$ENV_FILE" ]; then
    if grep -q "NEXTAUTH_URL" "`$ENV_FILE"; then
        sudo sed -i "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=http://`$DOMAIN|g" "`$ENV_FILE"
    else
        echo "NEXTAUTH_URL=http://`$DOMAIN" | sudo tee -a "`$ENV_FILE"
    fi
fi

# 3. Restart App
echo "Restarting PM2..."
pm2 restart cascada

echo "--- HTTP Restoration Complete ---"
echo "URL: http://`$DOMAIN"
"@

[System.IO.File]::WriteAllText($path, $content)
Write-Host "restore-http.sh created in Cascada/scripts"
