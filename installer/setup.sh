#!/bin/bash
set -e

# devorch installer script
# Works for both:
#   1. ZIP install: When bin/devorch exists locally (downloaded from releases)
#   2. CURL install: Downloads from GitHub using gh CLI
#
# CURL usage:
#   gh api repos/guicheffer/devorch/contents/installer/setup.sh --jq '.content' | base64 -d | sh

REPO="guicheffer/devorch"
INSTALL_DIR="${INSTALL_DIR:-$HOME/.local/bin}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd)" || SCRIPT_DIR=""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

info() {
  printf "${GREEN}%s${NC}\n" "$1"
}

warn() {
  printf "${YELLOW}%s${NC}\n" "$1"
}

error() {
  printf "${RED}%s${NC}\n" "$1"
  exit 1
}

# Get platform key for asset-names.json lookup (e.g., "darwin-arm64", "linux-x64")
get_platform_key() {
  OS="$(uname -s)"
  ARCH="$(uname -m)"

  case "$OS" in
    Linux*)  OS_KEY="linux" ;;
    Darwin*) OS_KEY="darwin" ;;
    *)       error "Unsupported OS: $OS" ;;
  esac

  case "$ARCH" in
    x86_64)  ARCH_KEY="x64" ;;
    aarch64) ARCH_KEY="arm64" ;;
    arm64)   ARCH_KEY="arm64" ;;
    *)       error "Unsupported architecture: $ARCH" ;;
  esac

  echo "${OS_KEY}-${ARCH_KEY}"
}

# Fetch binary name from asset-names.json (single source of truth)
fetch_binary_name() {
  PLATFORM_KEY="$1"

  # Use gh's built-in jq to decode base64 and parse JSON in one call
  BINARY_NAME=$(gh api "repos/${REPO}/contents/src/cli/lib/release/asset-names.json" \
    --jq ".content | @base64d | fromjson | .binaries[\"${PLATFORM_KEY}\"]" 2>/dev/null) || true

  if [ -z "$BINARY_NAME" ] || [ "$BINARY_NAME" = "null" ]; then
    error "No binary found for platform: $PLATFORM_KEY"
  fi

  echo "$BINARY_NAME"
}

# Add to PATH
setup_path() {
  if ! echo "$PATH" | grep -q "$INSTALL_DIR"; then
    SHELL_NAME=$(basename "$SHELL")
    case "$SHELL_NAME" in
      zsh)
        PROFILE="$HOME/.zshrc"
        ;;
      bash)
        if [[ "$(uname -s)" == "Linux" ]]; then
          PROFILE="$HOME/.bashrc"
        else
          PROFILE="$HOME/.bash_profile"
        fi
        ;;
      fish)
        PROFILE="$HOME/.config/fish/config.fish"
        ;;
      *)
        PROFILE="$HOME/.profile"
        ;;
    esac

    echo "export PATH=\"\$PATH:$INSTALL_DIR\"" >> "$PROFILE"
    export PATH="$PATH:$INSTALL_DIR"

    info "✅ Added to PATH in $PROFILE"
    warn "⚠️  Please restart your terminal or run: source $PROFILE"
    echo ""
  fi
}

# Install from local binary (ZIP install)
install_from_zip() {
  info "🚀 Installing devorch from local binary..."

  mkdir -p "$INSTALL_DIR"

  info "📦 Copying to ${INSTALL_DIR}..."
  cp "${SCRIPT_DIR}/bin/devorch" "${INSTALL_DIR}/devorch"
  chmod +x "${INSTALL_DIR}/devorch"

  # Remove macOS quarantine attribute
  if [[ "$(uname -s)" == "Darwin" ]]; then
    xattr -d com.apple.quarantine "${INSTALL_DIR}/devorch" 2>/dev/null || true
  fi

  info "✅ devorch installed!"
  echo ""

  setup_path

  info "🎉 Installation complete!"
  echo ""
  echo "Next step: Run 'devorch setup-bedrock'"
  echo ""
  echo "This will install and configure:"
  echo "  • Homebrew (macOS, if needed)"
  echo "  • Claude Code"
  echo "  • AWS CLI"
  echo "  • AWS SSO authentication"
  echo "  • Claude model selection"
  echo ""
}

# Download and install from GitHub (CURL install)
install_from_github() {
  info "🚀 Installing devorch from GitHub..."

  # Check gh CLI
  if ! command -v gh > /dev/null 2>&1; then
    error "GitHub CLI (gh) is not installed. Please install it from https://cli.github.com/"
  fi

  # Check authentication - either via gh auth or GH_TOKEN env var
  if [ -z "$GH_TOKEN" ] && ! gh auth status > /dev/null 2>&1; then
    error "GitHub CLI is not authenticated. Please run: gh auth login (or set GH_TOKEN)"
  fi

  # Get platform key and fetch binary name from asset-names.json
  PLATFORM_KEY=$(get_platform_key)
  info "Detected platform: $PLATFORM_KEY"

  info "Fetching asset names..."
  BINARY_NAME=$(fetch_binary_name "$PLATFORM_KEY")
  info "Binary: $BINARY_NAME"

  # Get latest version
  info "Fetching latest version..."
  VERSION=$(gh release list --repo "$REPO" --limit 1 --json tagName --jq '.[0].tagName')
  info "Installing version: $VERSION"

  # Download binary directly
  TEMP_DIR=$(mktemp -d)

  info "Downloading..."
  if ! gh release download "$VERSION" \
    --repo "$REPO" \
    --pattern "$BINARY_NAME" \
    --dir "$TEMP_DIR" \
    --clobber; then
    rm -rf "$TEMP_DIR"
    error "Failed to download binary: $BINARY_NAME"
  fi

  # Install binary
  mkdir -p "$INSTALL_DIR"
  cp "${TEMP_DIR}/${BINARY_NAME}" "${INSTALL_DIR}/devorch"
  chmod +x "${INSTALL_DIR}/devorch"

  # Remove macOS quarantine attribute
  if [[ "$(uname -s)" == "Darwin" ]]; then
    xattr -d com.apple.quarantine "${INSTALL_DIR}/devorch" 2>/dev/null || true
  fi

  # Cleanup
  rm -rf "$TEMP_DIR"

  info "✅ Installed to $INSTALL_DIR/devorch"
  echo ""

  setup_path

  info "🎉 Installation complete!"
  echo ""
  echo "Next step: Run 'devorch setup-bedrock'"
  echo ""
}

# Main: auto-detect install mode
main() {
  # Check if bin/devorch exists (ZIP install mode)
  if [ -n "$SCRIPT_DIR" ] && [ -f "${SCRIPT_DIR}/bin/devorch" ]; then
    install_from_zip
  else
    install_from_github
  fi
}

main
