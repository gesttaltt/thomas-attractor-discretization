#!/bin/bash
# Thomas Attractor - Unix/Linux/macOS Startup Script
# Unified orchestrator for automatic server start and browser launch

set -e

echo ""
echo "=========================================="
echo "   Thomas Attractor - Unix Launcher"
echo "=========================================="
echo ""

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js not found!"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if start.js exists
if [ ! -f "start.js" ]; then
    echo "ERROR: start.js not found!"
    echo "Please run this script from the project root directory."
    exit 1
fi

echo "Starting Thomas Attractor application..."
echo ""

# Run the orchestrator with all arguments
node start.js "$@"