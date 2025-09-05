#!/bin/bash

# Build script for explorasa-ng project
# This script handles the Node.js OpenSSL compatibility issue

echo "Building explorasa-ng project..."

# Set Node options for legacy OpenSSL support during build
export NODE_OPTIONS="--openssl-legacy-provider"

# Clean and build the project
npm run build

echo "Build completed successfully!"
echo ""
echo "To run the application:"
echo "  Development mode: npm run test (includes debugging tools)"
echo "  Production mode: npm run live"
echo "  Serve only: npm run serve"
echo ""
echo "Debugging:"
echo "  - Press F12 or Cmd+Option+I to open Chrome DevTools"
echo "  - Check DEBUGGING.md for detailed debugging guide"
echo "  - Main process logs appear in terminal"