#!/bin/bash

# Script to test installer/setup.sh in Docker
# Tests both ZIP install (local binary) and optionally CURL install (download from GitHub)

set -e

echo "📦 Compiling standalone binary for Linux..."
if [ ! -f "test-docker/devorch" ]; then
  echo "Compiling with bun (targeting Linux)..."
  bun run compile:linux
else
  echo "test-docker/devorch binary exists, skipping compilation (delete to recompile)"
fi

echo ""
echo "🐳 Building Docker image for installer testing..."
docker build -f test-docker/Dockerfile.installer -t devorch-test-installer .

echo ""
echo "✅ Docker image built successfully!"
echo ""
echo "Available tests:"
echo ""
echo "1. Test ZIP install (simulates downloading zip, extracting, running setup.sh)"
echo "   - Uses local binary at bin/devorch"
echo "   - Does NOT require GitHub CLI"
echo ""
echo "2. Test CURL install (simulates running the curl one-liner)"
echo "   - Downloads binary from GitHub releases"
echo "   - Requires: GH_TOKEN environment variable for authentication"
echo ""
echo "3. Get a shell to explore"
echo ""

# Ask user what they want to do
echo "What would you like to do?"
echo "1) Test ZIP install (default)"
echo "2) Test CURL install (requires GH_TOKEN)"
echo "3) Get a shell"
read -p "Choice [1]: " choice
choice=${choice:-1}

case $choice in
  1)
    echo ""
    echo "🧪 Testing ZIP install..."
    echo ""
    docker run --rm -it devorch-test-installer bash -c '/home/testuser/test-zip-install.sh'
    ;;
  2)
    echo ""
    if [ -z "$GH_TOKEN" ]; then
      echo "⚠️  GH_TOKEN not set. Getting token from gh CLI..."
      GH_TOKEN=$(gh auth token 2>/dev/null || true)
      if [ -z "$GH_TOKEN" ]; then
        echo "❌ Could not get GH_TOKEN. Please run 'gh auth login' or set GH_TOKEN"
        exit 1
      fi
    fi
    echo "🧪 Testing CURL install (downloading from GitHub)..."
    echo ""
    # Install gh CLI and authenticate, then run setup.sh
    docker run --rm -it \
      -e GH_TOKEN="$GH_TOKEN" \
      devorch-test-installer bash -c '
        echo "Installing GitHub CLI..."
        curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
        sudo chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
        sudo apt-get update && sudo apt-get install gh -y

        echo ""
        echo "Authenticating with GitHub..."
        echo "$GH_TOKEN" | gh auth login --with-token
        gh auth status

        echo ""
        echo "=== Testing CURL Install (downloads from GitHub) ==="
        echo ""
        cd /home/testuser/curl-test
        ./setup.sh

        echo ""
        echo "Testing installed binary:"
        ~/.local/bin/devorch --version
      '
    ;;
  3)
    echo ""
    echo "🐚 Opening shell..."
    docker run --rm -it devorch-test-installer bash
    ;;
  *)
    echo "Invalid choice"
    exit 1
    ;;
esac
