#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

cd ~/aquaflow || exit 1

echo "Stopping application on port 4000..."

# Try fuser
if command -v fuser &> /dev/null; then
    echo "Using fuser..."
    fuser -k 4000/tcp
fi

# Try lsof
if command -v lsof &> /dev/null; then
    echo "Using lsof..."
    PIDS=$(lsof -t -i:4000)
    if [ -n "$PIDS" ]; then
        kill -9 $PIDS
    fi
fi

# Fallback: kill all node processes (aggressive but effective for single app server)
# Only do this if we suspect port is still held? No, risky if other things run.
# But we can grep for 'next'
# pkill -f "next-server" || true

sleep 2

echo "Starting application..."
export PORT=4000
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=2048"

# Start in background
nohup npm start > app.log 2>&1 &
PID=$!
echo "Started with PID $PID"

# Wait a bit and show logs
sleep 5
echo "--- Last 20 lines of logs ---"
tail -n 20 app.log
