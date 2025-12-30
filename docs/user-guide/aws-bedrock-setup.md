# AWS Bedrock Setup Guide

This guide covers setting up, troubleshooting, and managing Claude Code with AWS Bedrock at YourCompany.

> **Windows Users:** The setup wizard below is for macOS/Linux. See the [Windows Setup Guide](./windows-setup.md) for Windows-specific instructions.

## Quick Setup (macOS/Linux)

Run the setup wizard:

```bash
devorch setup-bedrock
```

This interactive wizard will:
1. Install Homebrew (macOS, if needed)
2. Install Claude Code
3. Install AWS CLI
4. Configure AWS SSO for YourCompany Bedrock
5. Let you select your preferred AWS region and Claude model

**Prerequisites:**
- Must be part of `bedrock-user` group in AWS
- Request access in **#access-now** on Slack if needed

---

## Available Commands

### `devorch setup-bedrock` - Initial Setup

**When to use:**
- First-time setup for Claude Code with AWS Bedrock
- After fresh macOS install
- Setting up a new machine

**What it does:**
1. **Checks/installs dependencies**: Homebrew, Claude Code, AWS CLI
2. **Configures AWS SSO**: Creates `~/.aws/config` with `sso-bedrock` profile
3. **Configures Claude Code**: Sets up `.claude/settings.local.json` with Bedrock environment variables

**Options:**
```bash
devorch setup-bedrock          # Interactive mode
devorch setup-bedrock --ci     # Non-interactive (for automation)
```

---

### `devorch switch-model` - Change Model or Region

**When to use:**
- Switching to a different Claude model (e.g., Sonnet → Opus)
- Changing AWS region (e.g., eu-west-1 → us-east-1)
- Testing different model capabilities

**What it does:**
1. Prompts you to select a new AWS region
2. Fetches available Claude models from Bedrock
3. Lets you choose from the latest models with helpful descriptions
4. Updates your Claude Code settings with the new model/region

![Model Selection](../assets/switch-model-demo.gif)

**Model tiers:**
- **Sonnet** (Recommended) - Balanced performance and cost
- **Opus** - Most capable, best for complex reasoning and planning
- **Haiku** - Fast and cost-effective for simple tasks

**Example:**
```bash
devorch switch-model

# Select region: EU (Ireland)
# Select model: Claude Sonnet 4.5 (Recommended)
# ✓ Settings updated!
```

---

### `devorch debug-bedrock` - Troubleshoot Issues

**When to use:**
- Claude Code won't start or shows authentication errors
- "Credentials expired" or SSO errors
- Need to share configuration with support

**What it does:**
1. **Checks AWS config**: Validates `~/.aws/config` has correct SSO settings
2. **Checks Claude Code settings**: Verifies Bedrock is enabled
3. **Tests AWS credentials**: Runs `aws sts get-caller-identity`
4. **Checks cache**: Reports AWS credential cache status
5. **Offers fixes**: Can login to SSO or clear stale cache

**Example output:**
```
📁 Checking AWS configuration...
✅ AWS Config File: Found at /Users/you/.aws/config
✅ sso-bedrock Profile: Profile found
✅ SSO Start URL: https://d-93677e566e.awsapps.com/start
✅ SSO Role Name: bedrock-user

🤖 Checking Claude Code settings...
✅ Claude Code Settings: Bedrock enabled in Claude Code
✅ Claude Model: claude-sonnet-4-5-20250929-v1:0

🔐 Testing AWS credentials...
✅ AWS Credentials: Valid credentials found
✅ AWS Role: Using bedrock-user role

📂 Checking AWS cache...
✅ AWS Cache: CLI cache: 3 files, SSO cache: 2 files
```

**If issues are found:**
- The command shows specific errors and suggests fixes
- You can login to SSO directly from the debug command
- You can clear stale cache if credentials are invalid

---

## Troubleshooting

### "No valid credentials - login required"

Your AWS SSO session has expired.

**Solution:**
```bash
# Option 1: Run debug and login from there
devorch debug-bedrock
# Answer "Yes" when asked to login

# Option 2: Login directly
aws sso login --profile sso-bedrock
```

### "SSO Start URL is incorrect"

Your AWS config has an old or wrong SSO URL.

**Solution:**
```bash
# Re-run setup to fix
devorch setup-bedrock
```

### "Profile not found" or "sso-bedrock profile missing"

AWS config doesn't have the required profile.

**Solution:**
```bash
devorch setup-bedrock
```

### Stale cache causing issues

Sometimes old cached credentials cause problems.

**Solution:**
```bash
devorch debug-bedrock
# Answer "Yes" when asked to clear cache
# Then login again
```

### Claude Code says "Model not available"

The model you selected might not be available in your region.

**Solution:**
```bash
devorch switch-model
# Select a different region or model
```

---

## Configuration Details

### AWS Config Location

The setup creates/updates `~/.aws/config` with a `sso-bedrock` profile:

```ini
[profile sso-bedrock]
sso_start_url = https://d-93677e566e.awsapps.com/start
sso_region = eu-west-1
sso_account_id = 951719175506
sso_role_name = bedrock-user
region = eu-west-1
```

### Claude Code Settings Location

Settings are stored based on your context:
- **In a git repo**: `.claude/settings.local.json` (project-level)
- **Outside a git repo**: `~/.claude/settings.json` (user-level)

Example settings:
```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "awsAuthRefresh": "aws sso login --profile sso-bedrock",
  "env": {
    "AWS_PROFILE": "sso-bedrock",
    "AWS_REGION": "eu-west-1",
    "CLAUDE_CODE_USE_BEDROCK": "1",
    "ANTHROPIC_MODEL": "eu.anthropic.claude-sonnet-4-5-20250929-v1:0"
  }
}
```

### Available Regions

| Region | Code |
|--------|------|
| EU (Frankfurt) | `eu-west-1` |
| US East (N. Virginia) | `us-east-1` |

---

## FAQ

**Q: How do I know if I have Bedrock access?**

Run `devorch debug-bedrock`. If you see errors about permissions, you need to request access in **#access-now** on Slack.

**Q: Which Claude model should I use?**

- **Sonnet** (Recommended) - Best balance of speed and capability
- **Opus** - Most capable, best for complex reasoning and planning
- **Haiku** - Fast and cost-effective for simple tasks

**Q: Can I use multiple profiles?**

Yes, but devorch commands use the `sso-bedrock` profile. For other profiles, configure them manually in `~/.aws/config`.

**Q: How often do I need to login?**

AWS SSO sessions typically last 8-12 hours. When they expire, Claude Code will prompt you to refresh (or you'll see auth errors).

**Q: Where can I get help?**

- Run `devorch debug-bedrock` and share the output
- Ask in **#ai-native-pdlc** on Slack

---

## Related Documentation

- [Quick Start](./quickstart.md) - Get started with devorch
- [Developer's Guide](../developer-guide/dev-guide.md) - Development workflows
- [Designer's Guide](../developer-guide/designers-guide.md) - Design-focused workflows
- [Command Reference](./command-reference.md) - All commands
