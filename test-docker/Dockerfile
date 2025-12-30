# Dockerfile for testing setup-bedrock command in a fresh environment
# Simulates a fresh macOS-like environment (using Debian/Ubuntu base)
# Note: Build the CLI locally first with `bun run compile:linux`

FROM ubuntu:22.04

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install basic utilities that would exist on a fresh macOS
RUN apt-get update && apt-get install -y \
    curl \
    git \
    sudo \
    build-essential \
    procps \
    file \
    ca-certificates \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user (like a macOS user) with password 'qwerty123'
# Note: Using NOPASSWD for Docker compatibility (non-interactive environment)
# On real macOS, users will be prompted for their password normally
RUN useradd -m -s /bin/bash testuser && \
    echo "testuser:qwerty123" | chpasswd && \
    echo "testuser ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Install Bun as testuser for running verification scripts
USER testuser
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/home/testuser/.bun/bin:${PATH}"

# Switch back to root for remaining setup
USER root

# Switch to the test user
USER testuser
WORKDIR /home/testuser

# Set up shell environment
ENV HOME=/home/testuser
ENV SHELL=/bin/bash

# Copy the pre-compiled Linux binary and verification script
COPY --chown=testuser:testuser test-docker/devorch /home/testuser/devorch/devorch
COPY --chown=testuser:testuser test-docker/verify-setup.ts /home/testuser/devorch/verify-setup.ts

WORKDIR /home/testuser/devorch

# Create a test script that runs setup-bedrock
RUN echo '#!/bin/bash\n\
echo "=== Testing setup-bedrock in fresh environment ==="\n\
echo ""\n\
echo "Current user: $(whoami)"\n\
echo "Password: qwerty123 (set, but NOPASSWD sudo for Docker compatibility)"\n\
echo "Home directory: $HOME"\n\
echo "Shell: $SHELL"\n\
echo ""\n\
echo "Sudo configuration:"\n\
sudo -n true && echo "✓ Passwordless sudo enabled (Docker limitation)" || echo "✗ Sudo check failed"\n\
echo ""\n\
echo "Installed commands:"\n\
which brew 2>/dev/null && echo "✓ brew" || echo "✗ brew"\n\
which claude 2>/dev/null && echo "✓ claude" || echo "✗ claude"\n\
which aws 2>/dev/null && echo "✓ aws" || echo "✗ aws"\n\
echo ""\n\
echo "Running: ./devorch setup-bedrock --help"\n\
./devorch setup-bedrock --help\n\
echo ""\n\
echo "=== Setup complete ==="\n\
echo ""\n\
echo "To run setup-bedrock interactively:"\n\
echo "  ./devorch setup-bedrock"\n\
' > /home/testuser/test-setup.sh && chmod +x /home/testuser/test-setup.sh

# Default command shows help and status
CMD ["/home/testuser/test-setup.sh"]
