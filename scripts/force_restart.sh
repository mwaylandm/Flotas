#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo "--- RELOADING PM2 ---"
pm2 reload aquaflow --update-env

if [ $? -ne 0 ]; then
    echo "Reload failed, trying delete and start..."
    pm2 delete aquaflow || true
    cd ~/aquaflow
    pm2 start npm --name "aquaflow" -- start
fi

echo "--- PM2 STATUS AFTER RESTART ---"
pm2 status
