#!/bin/bash

# Script to test setup-bedrock in a fresh Docker environment

set -e

echo "📦 Compiling standalone binary for Linux..."
if [ ! -f "test-docker/devorch" ]; then
  echo "Compiling with bun (targeting Linux)..."
  bun run compile:linux
else
  echo "test-docker/devorch binary exists, skipping compilation (delete to recompile)"
fi

echo ""
echo "🐳 Building Docker image for setup-bedrock testing..."
docker build -f test-docker/Dockerfile -t devorch-test-setup .

echo ""
echo "✅ Docker image built successfully!"
echo ""
echo "Available commands:"
echo ""
echo "1. Test the environment (shows what's installed):"
echo "   docker run --rm -it devorch-test-setup"
echo ""
echo "2. Run setup-bedrock interactively (will prompt for installation):"
echo "   docker run --rm -it devorch-test-setup bash -c './devorch setup-bedrock'"
echo ""
echo "3. Run setup-bedrock non-interactively (CI mode with --ci flag):"
echo "   docker run --rm devorch-test-setup bash -c './devorch setup-bedrock --ci'"
echo ""
echo "4. Get a shell to explore:"
echo "   docker run --rm -it devorch-test-setup bash"
echo ""

# Ask user what they want to do
echo "What would you like to do?"
echo "1) Test environment (default)"
echo "2) Run setup-bedrock interactively"
echo "3) Run setup-bedrock non-interactively (CI mode)"
echo "4) Get a shell"
read -p "Choice [1]: " choice
choice=${choice:-1}

case $choice in
  1)
    echo ""
    echo "🧪 Running environment test..."
    docker run --rm -it devorch-test-setup
    ;;
  2)
    echo ""
    echo "🚀 Running setup-bedrock interactively..."
    echo ""
    docker run --rm -it devorch-test-setup bash -c './devorch setup-bedrock'
    ;;
  3)
    echo ""
    echo "🤖 Running setup-bedrock non-interactively (--ci mode)..."
    echo ""
    docker run --rm devorch-test-setup bash -c './devorch setup-bedrock --ci'
    ;;
  4)
    echo ""
    echo "🐚 Opening shell..."
    docker run --rm -it devorch-test-setup bash
    ;;
  *)
    echo "Invalid choice"
    exit 1
    ;;
esac
