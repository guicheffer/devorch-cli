# Configuration Guide

Complete reference for devorch configuration.

## Config File Locations

devorch looks for configuration in the following locations (in order of priority):

| Location | Description |
|----------|-------------|
| `devorch.config.yml` | Primary location in project root |
| `devorch/config.yml` | Secondary location in devorch directory |
| `devorch/config.local.yml` | Local overrides (gitignored) |

**Search order:**
1. `devorch.config.yml` (or `.yaml`) in project root — **primary**
2. `devorch/config.yml` (or `.yaml`) in devorch directory — **secondary**
3. `devorch/config.local.yml` merges on top for local overrides

The secondary location (`devorch/config.yml`) is useful if you want to keep all devorch files in a single directory.

## Quick Reference

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| `profile.name` | Yes | Project identifier | `my-project` |
| `profile.agents` | Yes | Target AI agents | `[claude-code]` |
| `profile.context_training` | No | Repository-specific customizations (must be in `config.local.yml`) | `mobile-app` |
| `commands` | Yes | Commands to install | `[create-spec]` |
| `subagents` | No | Auto-resolved from commands | `[implementers/ui-implementer]` |
| `skills` | No | Auto-resolved from dependencies | `[zustand-patterns]` |
| `template_vars` | No | Custom template variables | `{custom_var: value}` |

## Configuration Format

Commands, subagents, and skills are configured using object format with an `enabled` flag:

```yaml
commands:
  - name: /create-spec
    enabled: true
  - name: /implement-spec
    enabled: false  # Available but not installed

subagents:
  - name: specification/spec-writer
    enabled: true

skills:
  - name: react-native-core/component-patterns
    enabled: true
```

The `enabled` flag determines whether an item is installed. When you run `devorch install`, all available items are automatically added to your config with `enabled: false` by default, making it easy to discover and enable new tools.

> **Upgrading from older configs?** If your config uses the old string-array format (e.g., `commands: ['/create-spec']`), it will be automatically migrated when you run install.

## Configuration Examples

### Minimal Setup

**Selected commands enabled, all others available but disabled:**

```yaml
profile:
  name: my-project
  agents: [claude-code]

commands:
  - name: /create-spec
    enabled: true
  - name: /implement-spec
    enabled: true
  # ... other commands with enabled: false
```

### Custom Selection

**Enable only specific commands:**

```yaml
profile:
  name: my-project
  agents: [claude-code]

commands:
  - name: /create-spec
    enabled: true
  - name: /implement-spec
    enabled: true

# Subagents and skills auto-resolved from enabled commands
# Dependencies will be automatically enabled
```

### Both Agents

**Install for Claude Code:**

```yaml
profile:
  name: my-project
  agents: [claude-code]

commands:
  - name: /create-spec
    enabled: true
  - name: /implement-spec
    enabled: true
```

Skills use Claude Code knowledge features.

### Explicit Dependencies

**Enable specific dependencies manually:**

```yaml
profile:
  name: my-project
  agents: [claude-code]

commands:
  - name: /implement-spec
    enabled: true

# Manually specify which subagents to enable
subagents:
  - name: specification/spec-writer
    enabled: true
  - name: implementers/ui-implementer
    enabled: true

# Manually specify which skills to enable
skills:
  - name: zest-design-system
    enabled: true
  - name: zustand-patterns
    enabled: true
```

### With Context Training

**Use context training for repository-specific customizations:**

```yaml
# devorch/config.local.yml
profile:
  name: my-project
  agents: [claude-code]
  context_training: mobile-app  # Developer-specific context

commands:
  - name: /implement-spec
    enabled: true

skills:
  - name: react-native-core/component-patterns
    enabled: true
  - name: zustand-patterns
    enabled: true
```

Context training customizes how implementers and verifiers work for your project.

### With Custom Variables

**Pass variables to templates:**

```yaml
profile:
  name: my-project
  agents: [claude-code]

commands:
  - name: /implement-spec
    enabled: true

template_vars:
  company_name: "YourCompany"
  api_base_url: "https://api.example.com"
  custom_setting: "value"
```

Access in templates via `{{template_vars.company_name}}`.

## Installation Behavior

### Auto-Population

When you run `devorch install`, ALL available commands, subagents, and skills are automatically added to your config with `enabled: false` by default. This gives you:

- **Visibility** - See all available tools in one place
- **Easy enabling** - Just change `enabled: false` to `enabled: true`
- **No manual searching** - Don't need to know what's available

### New Items Detection

On each install, devorch detects items that were added since your last install and prompts you:

```
Found 3 new commands/subagents/skills available. Would you like to enable them?
```

You can:
- **Select items to enable** - Use interactive multi-select to choose
- **Skip** - All new items added as `enabled: false` for later
- **View by category** - Skills grouped by category for easy browsing

### Dependency Resolution

When you enable a command or subagent, devorch automatically:

1. **Resolves dependencies** - Finds required subagents and skills
2. **Auto-enables them** - Changes dependent items from `enabled: false` to `enabled: true`
3. **Updates config** - Saves the changes to your config file

Example: Enabling `/implement-spec` automatically enables its required subagents and skills.

### Configuration Updates

The config file is updated automatically during install when:
- Old format detected (string arrays → objects with `enabled`)
- New items available (added with `enabled: false`)
- Dependencies resolved (changed to `enabled: true`)
- Command/subagent names migrated (old → new names)

## Field Details

### profile

Project metadata and installation targets.

```yaml
profile:
  name: string              # Required: Project identifier
  agents: array             # Required: [claude-code]
  context_training: string  # Optional: Repository-specific customizations
  description: string       # Optional: Profile description
```

**name:** Used in generated file paths and documentation.

**agents:**
- `claude-code` - Install to `.claude/`

**context_training:** Name of context training in `devorch/context-training/` directory. Context trainings customize how devorch works for your repository. See [Context Training Guide](./context-training.md).

### commands

Slash commands with enabled/disabled flags. **All available commands are listed in config after install.**

```yaml
commands:
  - name: /create-spec
    enabled: true
  - name: /implement-spec
    enabled: true
  - name: /new-spec
    enabled: false  # Available but not installed
  - name: /plan-product
    enabled: false
```

See the **[templates/commands](https://github.com/guicheffer/devorch/tree/main/templates/commands)** directory for all available commands.

**Note:** Enabled commands automatically pull in and enable required subagents and skills.

### subagents (optional)

Specialized agents with enabled/disabled flags. **Auto-resolved and auto-enabled from command dependencies.**

```yaml
subagents:
  - name: specification/spec-writer
    enabled: true
  - name: implementers/ui-implementer
    enabled: true
  - name: verifiers/code-quality-verifier
    enabled: false
```

See the **[templates/subagents](https://github.com/guicheffer/devorch/tree/main/templates/subagents)** directory for all available subagents.

**Categories:**
- `specification/*` - Specification creation
- `implementers/*` - Implementation agents
- `verifiers/*` - Verification agents
- `researchers/*` - Research agents

### skills (optional)

Knowledge modules with enabled/disabled flags. **Auto-resolved and auto-enabled from dependencies.** Claude Code only.

```yaml
skills:
  - name: ui-design-system-web/zest-components
    enabled: true
  - name: ui-design-system-rn/zest-components
    enabled: true
  - name: state-management/zustand-patterns
    enabled: false  # Available but not loaded
```

See the **[templates/skills](https://github.com/guicheffer/devorch/tree/main/templates/skills)** directory for all available skills.

Skills use Claude Code knowledge features and are grouped by category (e.g., `react-native-core/`, `state-management/`, etc.).

### context_training (optional)

Repository-specific customizations that guide how devorch works for your project.

> **Important:** Context training is developer-specific and must be configured in `devorch/config.local.yml` (not versioned), not in the main config file. This prevents merge conflicts and avoids accidentally committing personal configurations.

**Basic usage:**
```yaml
# devorch/config.local.yml
profile:
  context_training: mobile-app
```

**What context training provides:**
- **Specification guidelines:** How your team writes specs
- **Implementation patterns:** Domain-specific preferences (UI, state, API)
- **Verification rules:** What to check and how to test
- **Skill references:** Links to your tech stack patterns

**Context training structure:**
```
devorch/context-training/mobile-app/
├── specification.md   # Spec writing guidelines
├── implementation.md  # Available implementers/verifiers
├── implementers/      # Domain customizations (required)
│   ├── ui.md
│   ├── state.md
│   └── api.md
└── verifiers/        # Verification customizations
    └── ui.md
```

**Creating context training:**

Run tech stack analysis first:
```bash
/analyze-tech-stack
```

Then generate context training:
```bash
/train-context
```

This analyzes your repository (PRs, files, tech stack) and generates customized guidelines.

**Per-developer overrides:**

Developers can use different context trainings without modifying the committed config:

1. **Local config file** (recommended):
```yaml
# devorch/config.local.yml (gitignored)
profile:
  context_training: backend-api
```

2. **Environment variable**:
```bash
export DEVORCH_CONTEXT_TRAINING=backend-api
devorch install
```

During installation, devorch will prompt you to create a local config file if context trainings are available.

**Override precedence:** `Environment Variables > Local Config > Committed Config`

**See also:** [Context Training Guide](./context-training.md) for complete documentation.

### template_vars (optional)

Custom variables accessible in templates via Mustache syntax.

**Purpose**: Inject project-specific values into templates without modifying template source files.

**Basic usage:**
```yaml
template_vars:
  company_name: "YourCompany"
  api_base: "https://api.example.com"
  repo_url: "https://github.com/myorg/myrepo"
```

**Access in templates:**
```markdown
# In any command, subagent, or skill markdown file:
The company name is {{template_vars.company_name}}.
API endpoint: {{template_vars.api_base}}
```

**Common use cases:**

**Project metadata:**
```yaml
template_vars:
  project_name: "My App"
  team_name: "Mobile Team"
  slack_channel: "#mobile-dev"
```

**API configuration:**
```yaml
template_vars:
  api_base_dev: "https://dev-api.example.com"
  api_base_prod: "https://api.example.com"
  graphql_endpoint: "https://api.example.com/graphql"
```

**Repository links:**
```yaml
template_vars:
  repo_url: "https://github.com/myorg/myrepo"
  wiki_url: "https://wiki.internal.com/myproject"
  ci_url: "https://ci.internal.com/myproject"
```

**Design system:**
```yaml
template_vars:
  design_system_name: "Zest"
  figma_url: "https://figma.com/file/abc123"
  storybook_url: "https://storybook.myapp.com"
```

**Conditional rendering:**
```yaml
template_vars:
  has_analytics: true
  uses_graphql: true
  supports_offline: false
```

Then in templates:
```markdown
{{#template_vars.has_analytics}}
## Analytics
Track user events using our analytics service.
{{/template_vars.has_analytics}}

{{#template_vars.uses_graphql}}
Use GraphQL queries instead of REST endpoints.
{{/template_vars.uses_graphql}}
```

**Notes:**
- Variables are available to all commands, subagents, and skills
- Use dot notation to access nested values
- Supports Mustache conditionals and loops
- Values are injected at compile/install time

## Version Management

**devorch automatically uses the latest version.** Version tracking happens in the state file, not in your config.

### How Versioning Works

1. **No config needed** - Your `devorch.config.yml` doesn't include a version field
2. **State file tracking** - Installed version is saved in `devorch/.state/state.json`
3. **Auto-update prompts** - Commands notify you when updates are available
4. **Always latest** - New installations automatically use the latest version

### State File

The state file (`devorch/.state/state.json`) tracks:

```json
{
  "version": "v2.1.0",
  "installed_at": "2025-01-15T10:30:00Z",
  "config_hash": "abc123...",
  "status": "complete",
  "commands": ["/create-spec", "/implement-spec"],
  "subagents": ["specification/spec-writer"],
  "skills": ["zustand-patterns"]
}
```

**Key fields:**
- `version` - Installed template version (e.g., `v2.1.0`)
- `installed_at` - Installation timestamp
- `status` - `complete`, `in_progress`, or `failed`
- Component lists for tracking what's installed

**Location:** `devorch/.state/state.json` (automatically gitignored)

### Updating

When you're not on the latest version, commands will notify you:

```bash
⚠️  Update available: v2.0.0 → v2.1.0
   Run: devorch update    # Updates CLI and templates
```

To update:

```bash
# Update CLI and install updated templates
devorch update
```

This automatically updates:
- CLI binary
- Template files in `.claude/`
- Version in `devorch/.state/state.json`

Your configuration remains unchanged.

### Why No Version in Config?

**Team consistency:** Everyone uses the same latest templates without config drift.

**Simpler configs:** One less field to maintain and document.

**Automatic updates:** Just run `install` to get the latest without editing config.

**State tracking:** Version is implementation detail, not user configuration.

## CLI Commands

### Installation

```bash
# Install or update
devorch install

# Reinstall from scratch
devorch install

# Install from local templates (development)
devorch install --local=/path/to/devorch
```

### Validation

```bash
# Diagnose installation (includes validation)
devorch diagnose
```

### Management

```bash
# Update CLI and templates to latest
devorch update

# Reinstall after config changes
devorch install
```

## Common Patterns

### Start with Defaults

Install everything, remove what you don't need:

```yaml
profile:
  name: my-project
  agents: [claude-code]

commands:
  - /create-spec
  - /new-spec
  - /implement-spec
  - /plan-product
  - /worktree
  - /panic
```

### Minimal Workflow

Just spec creation and implementation:

```yaml
profile:
  name: my-project
  agents: [claude-code]

commands:
  - /create-spec
  - /implement-spec
```

### Team Shared Config

Version control your config for team consistency:

```bash
git add devorch.config.yml
git commit -m "Add devorch configuration"
```

Team members run:
```bash
devorch install
```

## Troubleshooting

### Missing Commands Error

**Problem:**
```yaml
profile:
  name: my-project
  agents: [claude-code]
# ❌ No commands specified
```

**Solution:** Add commands array.

### Invalid Agent

**Problem:**
```yaml
profile:
  agents: [claude-desktop]  # ❌ Invalid
```

**Solution:** Use `claude-code`.

### Dependency Conflicts

**Problem:** Manually specifying subagents conflicts with auto-resolution.

**Solution:** Remove manual `subagents` section to let auto-resolution work, or be explicit about all dependencies.

## Best Practices

1. **Start with defaults** - Install all commands first
2. **Let dependencies auto-resolve** - Don't specify subagents/skills unless needed
3. **Share configs** - Commit to version control for team consistency
4. **Keep updated** - Run `devorch install` periodically to get latest templates
5. **Version tracking** - Version is automatically tracked in `devorch/.state/state.json`, not in config

## Next Steps

- [Core Concepts](./concepts.md) - Understand dependencies
- [Workflows](./workflows.md) - Learn when to use commands
- [Extending](../developer-guide/extending.md) - Create custom components
