#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
cd ~/aquaflow
export NODE_ENV=production
echo "Building..."
npm run build > build.log 2>&1
EXIT_CODE=$?
echo "Build finished with exit code $EXIT_CODE"
if [ $EXIT_CODE -ne 0 ]; then
    echo "Build failed! Tailing log:"
    tail -n 50 build.log
    exit $EXIT_CODE
fi

echo "Checking BUILD_ID..."
ls -l .next/BUILD_ID

echo "Checking sw.js..."
ls -l public/sw.js
