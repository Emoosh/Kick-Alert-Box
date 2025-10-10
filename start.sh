#!/bin/sh
# start.sh - Updated startup script

echo "🚀 Starting Kick Alert Box services..."

# Generate Prisma client if needed
echo "📦 Generating Prisma client..."
npx prisma generate

echo "🎯 Starting Next.js server on port 3000..."
node server.js &
NEXTJS_PID=$!

echo "🔌 Starting WebSocket server on port 4001..."
/usr/local/bin/tsx ws-server.ts &
WS_PID=$!

echo "⚡ Starting background worker..."
/usr/local/bin/tsx src/worker/alert-worker.ts &
WORKER_PID=$!

echo "✅ All services started successfully!"
echo "Next.js PID: $NEXTJS_PID"
echo "WebSocket PID: $WS_PID" 
echo "Worker PID: $WORKER_PID"

# Function to handle shutdown
cleanup() {
    echo "🛑 Shutting down services..."
    kill $NEXTJS_PID $WS_PID $WORKER_PID 2>/dev/null
    exit 0
}

# Trap signals
trap cleanup SIGTERM SIGINT

# Wait for any process to exit
wait -n

# If any process exits, cleanup and exit
echo "⚠️ One or more services have stopped. Exiting..."
cleanup