#!/bin/bash

# Development script for Explorasa-NG
# This script starts both the Angular dev server and Electron application

echo "Starting Explorasa-NG in development mode..."
echo ""

# Set Node.js options for compatibility
export NODE_OPTIONS="--openssl-legacy-provider"

# Build the main process first
echo "Building main process..."
npm run build-main

if [ $? -ne 0 ]; then
    echo "Failed to build main process"
    exit 1
fi

echo "Main process built successfully!"
echo ""

# Start Angular dev server in background
echo "Starting Angular development server..."
npm run serve &
SERVER_PID=$!

echo "Waiting for Angular dev server to start..."
sleep 8

# Check if server is running
if ! curl -s http://localhost:4200 > /dev/null; then
    echo "Angular dev server failed to start"
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

echo "Angular dev server is running at http://localhost:4200"
echo ""

# Start Electron application
echo "Starting Electron application..."
DEV_MODE=1 electron . --ignore-gpu-blacklist &
ELECTRON_PID=$!

echo ""
echo "=== Development Environment Started ==="
echo "Angular Dev Server: http://localhost:4200"
echo "Electron App: Running with DevTools enabled"
echo ""
echo "To stop both processes, press Ctrl+C"
echo ""

# Function to cleanup on exit
cleanup() {
    echo "\nStopping development environment..."
    kill $SERVER_PID 2>/dev/null
    kill $ELECTRON_PID 2>/dev/null
    echo "Development environment stopped."
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for Electron to finish
wait $ELECTRON_PID

# If Electron exits, cleanup
cleanup