#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo "--- PM2 STATUS ---"
pm2 status

echo "--- APP PORT 3000 ---"
curl -I http://localhost:3000

echo "--- NGINX PORT 80 ---"
curl -I http://localhost:80
