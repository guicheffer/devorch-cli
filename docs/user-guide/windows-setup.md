# Windows Setup Guide

This guide covers setting up Claude Code with AWS Bedrock on Windows.

> **Note:** The `devorch setup-bedrock` wizard is designed for macOS/Linux. Windows users should follow these manual steps instead.

## Prerequisites

- Must be part of `bedrock-user` group in AWS
- Request access in **#access-now** on Slack if needed

## Setup Steps

### 1. Install AWS CLI

Download and run the AWS CLI installer:

**[Download AWS CLI for Windows](https://awscli.amazonaws.com/AWSCLIV2.msi)**

After installation, open a **new** PowerShell window and verify:

```powershell
aws --version
```

### 2. Configure AWS SSO

Run the SSO configuration:

```powershell
aws configure sso
```

When prompted, enter these values:

| Prompt | Value |
|--------|-------|
| SSO session name | `bedrock` |
| SSO start URL | `https://d-93677e566e.awsapps.com/start` |
| SSO region | `eu-west-1` |
| SSO registration scopes | (press Enter for default) |

A browser window will open for authentication. Complete the login, then return to PowerShell.

When prompted to select an account and role:
- Select the account with Bedrock access
- Select the `bedrock-user` role

For the remaining prompts:

| Prompt | Value |
|--------|-------|
| CLI default client Region | `eu-west-1` |
| CLI default output format | `json` |
| CLI profile name | `sso-bedrock` |

### 3. Install Node.js

Download and install Node.js LTS:

**[Download Node.js for Windows](https://nodejs.org/)**

After installation, open a **new** PowerShell window and verify:

```powershell
node --version
npm --version
```

### 4. Install Claude Code

```powershell
npm install -g @anthropic-ai/claude-code
```

Verify installation:

```powershell
claude --version
```

### 5. Configure PowerShell Profile

Open your PowerShell profile for editing:

```powershell
notepad $PROFILE
```

If the file doesn't exist, create it first:

```powershell
New-Item -Path $PROFILE -ItemType File -Force
notepad $PROFILE
```

Add these lines to the file:

```powershell
# AWS Bedrock Configuration for Claude Code
$env:AWS_PROFILE = "sso-bedrock"
$env:CLAUDE_CODE_USE_BEDROCK = "1"
$env:AWS_REGION = "eu-west-1"
```

Save and close Notepad.

### 6. Restart PowerShell

Close and reopen PowerShell for the environment variables to take effect.

### 7. Login to AWS SSO

```powershell
aws sso login --profile sso-bedrock
```

A browser window will open. Complete the authentication.

### 8. Start Claude Code

```powershell
claude
```

You're all set!

---

## Daily Usage

### Starting Claude Code

Each time you want to use Claude Code:

1. Open PowerShell
2. If your SSO session expired (you'll see auth errors), run:
   ```powershell
   aws sso login --profile sso-bedrock
   ```
3. Start Claude Code:
   ```powershell
   claude
   ```

### SSO Session Duration

AWS SSO sessions typically last 8-12 hours. When they expire, simply run `aws sso login --profile sso-bedrock` again.

---

## Troubleshooting

### "aws: command not found"

AWS CLI isn't in your PATH. Try:
1. Close and reopen PowerShell
2. If still not working, reinstall AWS CLI

### "claude: command not found"

Node.js/npm isn't in your PATH. Try:
1. Close and reopen PowerShell
2. If still not working, reinstall Node.js

### "The term '$PROFILE' is not recognized"

You may be using Command Prompt instead of PowerShell. Make sure you're using **PowerShell** (search for "PowerShell" in the Start menu).

### "Access Denied" or credential errors

1. Verify you're in the `bedrock-user` group (request access in #access-now on Slack)
2. Re-run SSO login:
   ```powershell
   aws sso login --profile sso-bedrock
   ```

### Environment variables not set

Verify your profile is configured correctly:

```powershell
echo $env:AWS_PROFILE
echo $env:CLAUDE_CODE_USE_BEDROCK
echo $env:AWS_REGION
```

If empty, check that `$PROFILE` contains the correct settings and restart PowerShell.

---

## Switching Models or Regions

To change your Claude model or AWS region, edit your PowerShell profile:

```powershell
notepad $PROFILE
```

Update the `AWS_REGION` value and add `ANTHROPIC_MODEL`:

```powershell
$env:AWS_PROFILE = "sso-bedrock"
$env:CLAUDE_CODE_USE_BEDROCK = "1"
$env:AWS_REGION = "us-east-1"  # Change region here
$env:ANTHROPIC_MODEL = "us.anthropic.claude-sonnet-4-5-20250929-v1:0"  # Optional: specific model
```

**Available Regions:**
- `eu-west-1` (EU Frankfurt) - Model prefix: `eu.`
- `us-east-1` (US East) - Model prefix: `us.`

---

## Need Help?

- Run `aws sts get-caller-identity --profile sso-bedrock` to verify your AWS credentials
- Ask in **#ai-native-pdlc** on Slack
- For access issues, request in **#access-now** on Slack
