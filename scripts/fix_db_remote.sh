#!/bin/bash
export PATH=$PATH:/home/ubuntu/.nvm/versions/node/v20.20.0/bin
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

cd /home/ubuntu/aquaflow

echo "--- 1. Installing correct Prisma version ---"
npm install prisma@6.7.0 --save-dev

echo "--- 2. Pushing DB Schema (creating tables) ---"
npx prisma@6.7.0 db push

echo "--- 3. Ensuring Admin User Exists ---"
node scripts/ensure_admin.js

echo "--- 3. Listing All Users ---"
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.user.findMany().then(users => console.log(users)).catch(e => console.error(e)).finally(() => prisma.\$disconnect())"
