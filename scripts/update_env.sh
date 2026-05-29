#!/bin/bash
sed -i 's|NEXTAUTH_URL="http://localhost:3000"|NEXTAUTH_URL="http://52.91.243.25"|g' ~/aquaflow/.env
cat ~/aquaflow/.env
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
pm2 restart aquaflow
