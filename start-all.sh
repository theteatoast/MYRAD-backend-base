#!/bin/bash

echo "🚀 Starting MYRAD DataCoin Platform..."
echo ""
echo "📊 Backend & Frontend: http://localhost:4000"
echo "🔥 Listener (burn detection): Running in background"
echo ""

# Start the main dev server
echo "Starting backend server..."
npm run dev &
BACKEND_PID=$!

# Give server time to start
sleep 3

# Start the listener in the background
echo "Starting listener service..."
npm run listen &
LISTENER_PID=$!

echo ""
echo "✅ System started!"
echo "   Backend PID: $BACKEND_PID"
echo "   Listener PID: $LISTENER_PID"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for all background processes
wait
