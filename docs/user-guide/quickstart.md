# Quick Start

Get devorch running in under 5 minutes.

> **Windows Users:** See the [Windows Setup Guide](./windows-setup.md) for Windows-specific instructions.

## Install the CLI

### For Non-Technical Users (PMs, UX Designers)

See the [Installation Guide](./install.md) for detailed step-by-step instructions. The process is:

1. Download a zip file from GitHub Releases
2. Unzip and run a simple script
3. Done!

### For Developers

**Prerequisites:**
- **GitHub CLI** (`gh`) - [Install here](https://cli.github.com/)
- **Authenticate**: Run `gh auth login` if not already authenticated

**Install:**
```bash
# Download and install
gh api repos/guicheffer/devorch/contents/installer/setup.sh \
  --jq '.content' | base64 -d | sh

# Add to PATH
export PATH="$PATH:$HOME/.local/bin"
```

**Verify installation:**
```bash
devorch --version
```

## Setup AWS Bedrock Access

Run the setup wizard to install all dependencies and configure AWS:

```bash
devorch setup-bedrock
```

This guided wizard will:
- Install Homebrew (macOS, if needed)
- Install Claude Code
- Install AWS CLI
- Select AWS region (eu-west-1 or us-east-1)
- Configure AWS SSO for YourCompany Bedrock
- Select Claude model from available options
- Set up Claude Code with proper authentication

**Prerequisites:**
- Must be part of `bedrock-user` group in AWS
- Request access in #access-now on Slack if needed

**When to use:**
- First-time setup for Claude Code with AWS Bedrock
- Switching AWS regions or profiles
- Troubleshooting authentication issues

**Skip this step if:** You already have Claude Code configured with AWS Bedrock access.

## Install in Your Project

Navigate to your project and run:

```bash
cd /path/to/your-project
devorch install
```

**What happens:**
1. Creates `devorch.config.yml` if missing (or use `devorch/config.yml`)
2. Guides you through interactive setup
3. Installs all available commands to `.claude/`
4. Auto-resolves dependencies (subagents and skills)

## Automatic .gitignore (No Action Required)

**devorch automatically creates `.gitignore` files during installation** to keep generated files out of version control:

```
# Auto-created by installer
.claude/agents/devorch/.gitignore      # Ignores all generated subagents
.claude/commands/devorch/.gitignore    # Ignores all generated commands
.claude/skills/.gitignore                   # Ignores enabled bundled skills only
devorch/.gitignore                     # Ignores .state/ directory
```

**What gets auto-gitignored:**
- ✅ Generated subagents and commands (always gitignored)
- ✅ Enabled bundled skills (gitignored, can be regenerated)
- ✅ Installation state (gitignored)
- ❌ Custom skills (not gitignored - user-created content)
- ❌ Config file (not gitignored - team settings)

**Why automatic?** These are generated files that can be recreated with `devorch install`. After cloning, teammates just run `devorch install` to regenerate everything.

## Customize for Your Repository (Optional but Recommended)

Create repository-specific context trainings to customize how devorch works for your project:

### 1. Analyze Your Tech Stack

```bash
/analyze-tech-stack
```

This creates `devorch/tech-stack.md` documenting your:
- Platform and frameworks
- Libraries and tools
- Available skills (patterns from your code)

### 2. Create a Context Training

**During first installation**, `devorch install` will prompt you to choose:

```
📦 Context Training Setup

How would you like to set up context training?
  ○ Mobile - React Native (boilerplate)
  ○ Web Frontend - Next.js (boilerplate)
  ○ Backend - Go Microservice (boilerplate)
  ○ Backend - Kotlin Microservice (boilerplate)
  ○ Backend - PHP API (boilerplate)
  ○ Data Pipeline - Airflow (boilerplate)
  ● Generate my own (recommended)
```

**Option 1: Use a boilerplate** (quick setup)
- Pre-built patterns copied to your project
- Generic but functional immediately
- Good for getting started quickly

**Option 2: Generate your own** (recommended)
- Run `/analyze-tech-stack` to document your stack
- Run `/train-context` to analyze your PR history
- Extracts YOUR team's patterns and conventions
- Creates domain-specific implementers

**For existing repositories with PR history:** Choose "Generate my own"

**For fresh repositories without PRs:** Use a boilerplate, customize later as patterns emerge

**What you get:**
- `devorch/context-training/my-app/` with customizations
- Merged implementers (ui-implementer, state-implementer, etc.)
- Config updated with context-training reference and skills

**Why this matters:**
- Specs follow your team's style
- Implementers use your project's patterns
- AI agents reference your tech stack

See [Context Training System](./context-training.md) for details.

## Run Your First Command

### Create a Specification

**Claude Code:**
```
/create-spec
```

**With context training:**
- Follows your specification guidelines
- References your skills
- Creates tasks for your custom implementers

### Implement a Specification

**Claude Code:**
```
/implement-spec
```

The command will:
- Read your spec from `specs/` folder
- Discover your custom implementers (if context training configured)
- Select appropriate implementer based on task
- Follow your domain preferences
- Reference your skills
- Run verification with your rules
- Generate implementation report

### Other Useful Commands

```
/analyze-tech-stack     # Document your tech stack
/train-context          # Create repository-specific context training
/gather-requirements    # Research and plan a new feature
/create-spec            # Write specification document
/update-spec            # Update existing spec with changed requirements
/create-tasks           # Break down spec into tasks
/implement-task         # Implement specific tasks
/implement-spec         # Batch implement all tasks
/zest-check             # Check Figma design implementability for Zest
/a11y-check             # Audit Figma designs for accessibility
/create-ux-spec-web     # Generate web dev instructions from Figma
/create-ux-spec-rn      # Generate React Native dev instructions from Figma
/design-change-web      # Implement visual/styling changes in web apps
/design-change-rn       # Implement visual/styling changes in React Native
/worktree               # Create git worktree with new branch
/panic                  # Debug context collection
```

## Quick Configuration Example

Edit `devorch.config.yml` to customize:

```yaml
profile:
  name: my-project
  agents: [claude-code]

commands:
  - name: /gather-requirements
    enabled: true
  - name: /create-spec
    enabled: true
  - name: /create-tasks
    enabled: true
  - name: /implement-spec
    enabled: true
  - name: /worktree
    enabled: true

# Subagents and skills auto-resolve from command dependencies
```

## Updating devorch

### Version Management

**devorch automatically uses the latest version.** The installed version is tracked in `devorch/.state/state.json` and commands will prompt you to update both the CLI and templates if you're not on the latest.

### Update CLI and Templates

Get the latest CLI version and templates with new features and bug fixes:

```bash
devorch update
```

This command automatically:
1. Updates the CLI binary to the latest release
2. Installs updated templates (commands, subagents, skills)
3. Pulls latest templates from the remote repository
4. Updates your `.claude/` directories
5. Updates version in `devorch/.state/state.json`
6. Preserves your configuration

**When to update:**
- ✅ **New features** - Get latest templates and CLI features
- ✅ **Bug fixes** - Get improvements and fixes
- ✅ **Monthly** - Stay current with improvements
- ✅ **When prompted** - Commands will notify you if updates are available

**What gets updated:**
- Commands in `.claude/commands/devorch/`
- Subagents in `.claude/agents/devorch/`
- Skills in `.claude/skills/` (if using skills)
- Context training merges (if using custom context training)
- Version in `devorch/.state/state.json`

**What's preserved:**
- Your `devorch.config.yml` configuration
- Your custom context training files in `devorch/context-training/`
- Your specs in `specs/`

**Note:** Version is tracked automatically in the state file, not in your config. All installations default to using the latest version.

## CLI Commands

The `devorch` CLI provides several commands for managing your installation:

### Installation & Updates

```bash
devorch install     # Install or reinstall in current project
devorch update      # Update CLI and install updated templates
devorch diagnose    # Check installation health and show status
```

### AWS Bedrock Setup

```bash
devorch setup-bedrock    # Setup AWS Bedrock for Claude Code (guided wizard)
devorch switch-model     # Switch Claude model and AWS region
devorch debug-bedrock    # Debug AWS configuration and credential issues
```

**setup-bedrock** - Initial setup wizard that installs Homebrew, Claude Code, AWS CLI, configures AWS SSO, and selects a Claude model.

**switch-model** - Change your Claude model or AWS region after initial setup. Lists available models from AWS Bedrock and updates your configuration.

**debug-bedrock** - Diagnose AWS SSO and Bedrock credential issues. Checks your AWS config, validates SSO settings, tests credentials, and provides output you can share with engineering support.

### Version Management

```bash
devorch --version        # Show CLI version
devorch check-version    # Check if updates are available
```

### Spec Management

```bash
# Get current active spec
devorch get-spec

# Set active spec by name (without date prefix)
devorch get-spec user-profile

# Set active spec by full folder name
devorch get-spec 2025-11-18-user-profile
```

The `get-spec` command manages which spec is active for spec-driven workflow commands (`/create-spec`, `/create-tasks`, `/implement-spec`, `/implement-task`). When you create a new spec with `/gather-requirements`, it's automatically set as active.

**How it works:**
- Active spec is tracked in `devorch/.state/state.json`
- Always shows newest spec for comparison
- Includes `IS_STALE` flag when active spec is older than newest
- Commands check for stale specs (active older than newest)
- Machine-readable output for AI-friendly parsing
- Exact name matching (supports both `user-profile` and `2025-11-18-user-profile`)

## Next Steps

**Learn core concepts:**
- [Core Concepts](./concepts.md) - Understand the architecture
- [Configuration Guide](./configuration.md) - Complete config reference
- [Workflows](./workflows.md) - When and how to use commands

**Customize your setup:**
- [Context Training System](./context-training.md) - Customize for your repository (RECOMMENDED)
- [Extending](../developer-guide/extending.md) - Create custom commands and subagents
- [Skills](./skills.md) - Add project-specific knowledge (Claude Code only)

**Advanced usage:**
- [Polyrepo Setup](./polyrepo.md) - Work across multiple repositories
- [Development](../developer-guide/development.md) - Contribute to devorch

## Common Issues

**GitHub CLI not found:**
```bash
# macOS
brew install gh

# Linux
# See https://github.com/cli/cli/blob/trunk/docs/install_linux.md
```

**Permission denied:**
```bash
chmod +x ~/.local/bin/devorch
```

**Config validation fails:**
```bash
devorch diagnose
```

Check diagnostic results and fix your `devorch.config.yml`. Config will also be validated automatically when you run `devorch install`.

### AWS Bedrock Issues

**"No valid credentials" or AWS authentication fails:**
```bash
# Run diagnostics first
devorch debug-bedrock

# If credentials expired, re-login
aws sso login --profile sso-bedrock
```

**Wrong SSO URL or role name:**

The correct AWS SSO configuration should have:
- `sso_start_url = https://d-93677e566e.awsapps.com/start`
- `sso_role_name = bedrock-user`

If your config is wrong, run `devorch setup-bedrock` to recreate it, or manually edit `~/.aws/config`.

**"Access Denied" when listing models:**
- Ensure you're part of the `bedrock-user` group in AWS
- Request access in #access-now on Slack

**Need to change Claude model or region:**
```bash
devorch switch-model
```

**Still having issues?**
```bash
# Generate full debug output for support
devorch debug-bedrock
# Copy the output and share with engineering support
```

## Getting Help

- Run `devorch --help` for CLI help
- Check [Working with devorch](./working-with-devorch.md) for detailed workflows
- Open an issue at [github.com/guicheffer/devorch](https://github.com/guicheffer/devorch)
