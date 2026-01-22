# Quick Install

This guide is designed for non-technical users (PMs, UX designers) who want to install devorch on a fresh computer without developer tools.

> **Windows Users:** See the [Windows Setup Guide](./windows-setup.md) for Windows-specific instructions.

## Installation Steps

### 1. Download the installer for your platform

Visit the [Releases page](https://github.com/guicheffer/devorch/releases/latest) and download the appropriate zip file for your platform:

- **macOS (Apple Silicon M1/M2/M3):** `devorch-mac-apple-silicon-vX.X.X.zip`
- **macOS (Intel):** `devorch-mac-intel-vX.X.X.zip`
- **Linux:** `devorch-linux-vX.X.X.zip`
- **Linux (ARM):** `devorch-linux-arm-vX.X.X.zip`
- **Windows:** `devorch-windows-vX.X.X.zip`

*(where `vX.X.X` is the version number, e.g., `v1.0.257`)*

**How to check your Mac type:**
- Click the Apple menu () → About This Mac
- **Apple Silicon (M1/M2/M3):** Says "Chip: Apple M1/M2/M3" or similar
- **Intel:** Says "Processor: Intel"

### 2. Unzip the downloaded file

Double-click the `.zip` file in your Downloads folder. A new folder will be created.

### 3. Run the installer

**macOS:**
1. Open **Terminal** (search "Terminal" in Spotlight)
2. Drag `setup.sh` from the unzipped folder into Terminal
3. Press Enter

**Linux:**
1. Open a terminal in the unzipped folder
2. Run: `./setup.sh`

The installer will:
- Copy the `devorch` binary to `~/.local/bin`
- Add `~/.local/bin` to your PATH
- Make the binary executable

### 4. Restart your terminal

Close and reopen your Terminal app.

### 5. Run setup

Now run the setup wizard to install all dependencies:

```bash
devorch setup-bedrock
```

The setup wizard will automatically:
- ✅ Install Homebrew (macOS, if needed)
- ✅ Install Claude Code
- ✅ Install AWS CLI
- ✅ Configure AWS SSO authentication
- ✅ Help you select a Claude model
- ✅ Configure Claude Code settings

That's it! You're ready to use devorch.

## Troubleshooting

### macOS says "cannot be opened" or "malware" warning

This happens because the file was downloaded from the internet. Run from Terminal instead:

```bash
cd ~/Downloads/devorch-mac-*   # or wherever you unzipped
./setup.sh
```

If you still get an error, remove the quarantine attribute first:
```bash
xattr -d com.apple.quarantine setup.sh bin/devorch
./setup.sh
```

### "devorch: command not found" after installation

This means `~/.local/bin` is not in your PATH. You can either:

**Option 1: Restart your terminal** (recommended)

Close and reopen your Terminal app.

**Option 2: Add to PATH manually**

```bash
export PATH="$PATH:$HOME/.local/bin"
```

To make this permanent, add the line above to your shell profile:
- macOS (zsh): `~/.zshrc`
- macOS (bash): `~/.bash_profile`
- Linux (bash): `~/.bashrc`

### "Permission denied" when running setup.sh

Make the script executable:
```bash
chmod +x setup.sh
./setup.sh
```

### Setup fails during Homebrew installation

The Homebrew installer may ask for your password. This is normal - Homebrew needs administrator privileges to install system-wide tools.

### AWS SSO login fails

Make sure you:
1. Have been added to the "bedrock-user" group in AWS
2. If not, request access in #access-now on Slack
3. Complete the browser-based AWS SSO authentication when prompted

### Other AWS/Bedrock issues

Run the debug command to diagnose problems:

```bash
devorch debug-bedrock
```

This will check your configuration and offer to fix common issues. See the [AWS Bedrock Setup Guide](./aws-bedrock-setup.md) for more details.

## For Developers

If you prefer using the GitHub CLI (`gh`):

```bash
gh api repos/guicheffer/devorch/contents/installer/setup.sh \
  --jq '.content' | base64 -d | sh
```

This downloads and runs the current installer from the repository.

## Need Help?

- **AWS/Bedrock issues**: Run `devorch debug-bedrock` - see [AWS Bedrock Setup Guide](./aws-bedrock-setup.md)
- **Access issues**: Request in #access-now on Slack
- **Questions/Feedback**: Ask in #ai-native-pdlc on Slack
