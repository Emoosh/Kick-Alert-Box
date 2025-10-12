#!/bin/sh
# start.sh - Updated startup script

echo "🚀 Starting Kick Alert Box services..."

# Generate Prisma client if needed
echo "📦 Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "🗄️ Running database migrations..."
npx prisma migrate deploy || echo "⚠️ Migration failed, continuing..."

echo "🎯 Starting Next.js server on port 3000..."
node server.js &
NEXTJS_PID=$!

echo "⚡ Starting background worker..."
/usr/local/bin/tsx src/worker/alert-worker.ts &
WORKER_PID=$!

echo "✅ All services started successfully!"
echo "Next.js PID: $NEXTJS_PID"
echo "Worker PID: $WORKER_PID"

# Function to handle shutdown
cleanup() {
    echo "🛑 Shutting down services..."
    kill $NEXTJS_PID $WORKER_PID 2>/dev/null
    exit 0
}

# Trap signals
trap cleanup SIGTERM SIGINT

# Monitor processes with detailed logging
monitor_processes() {
    while true; do
        # Check each process individually
        if ! kill -0 $NEXTJS_PID 2>/dev/null; then
            echo "❌ Next.js server (PID: $NEXTJS_PID) has stopped!"
            return 1
        fi
        
        if ! kill -0 $WORKER_PID 2>/dev/null; then
            echo "❌ Background worker (PID: $WORKER_PID) has stopped!"
            return 1
        fi
        
        echo "✅ All services running ($(date))"
        sleep 30
    done
}

# Start monitoring
monitor_processes
echo "⚠️ One or more services have stopped. Exiting..."
cleanup