# Docker Test Environment for setup-bedrock

This directory contains Docker setup for testing the `setup-bedrock` command in a fresh environment that simulates a new macOS machine.

## Quick Start

```bash
# From the project root
./test-docker/run.sh
```

This will:
1. Build a Docker image with a clean Ubuntu environment
2. Prompt you to choose what to test

## Manual Usage

### Build the image
```bash
docker build -f test-docker/Dockerfile -t devorch-test-setup .
```

### Run tests

**1. Check environment status:**
```bash
docker run --rm -it devorch-test-setup
```

**2. Run setup-bedrock interactively:**
```bash
docker run --rm -it devorch-test-setup bash -c './devorch setup-bedrock'
```

**3. Run setup-bedrock non-interactively (CI mode):**
```bash
docker run --rm devorch-test-setup bash -c './devorch setup-bedrock --ci'
```
This skips all prompts and uses default values. Perfect for CI/automation.

**4. Get a shell to explore:**
```bash
docker run --rm -it devorch-test-setup bash
```

## What's Tested

The Docker environment simulates a fresh macOS by:
- Starting with no Homebrew installed
- Starting with no AWS CLI installed
- Starting with no Claude Code installed
- Using a non-root user (like a macOS user)
- Having basic tools (git, curl, sudo) available

## Limitations

- This uses Ubuntu instead of macOS (can't run macOS in Docker)
- Some macOS-specific behaviors may differ
- Homebrew will install Linux version instead of macOS version
- Claude Code desktop app won't actually run (but CLI installation can be tested)
- **AWS SSO login won't work** - requires a web browser for OAuth authentication, which Docker doesn't have
  - The setup will successfully install Homebrew, Claude Code CLI, and AWS CLI
  - It will configure AWS and Claude settings files
  - But it will fail at the AWS SSO login step (this is expected)
  - On real macOS, this step will open a browser and work normally

## Notes

The test environment:
- User: `testuser`
- Password: `qwerty123` (set but not needed - passwordless sudo for Docker)
- Home: `/home/testuser`
- Shell: `/bin/bash`
- Working directory: `/home/testuser/devorch`
- Sudo: Passwordless (NOPASSWD) - Docker doesn't support interactive TTY for password prompts

**Note:** On real macOS, users will be prompted for their password when running sudo commands (e.g., during Homebrew installation). The Docker environment uses passwordless sudo only for testing convenience.
