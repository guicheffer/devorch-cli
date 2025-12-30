# Core Concepts

Understanding devorch's architecture and components.

## What is DevOrch?

**Composable AI workflow automation** for Claude Code. Install exactly the commands, subagents, and skills you need for your project.

```
devorch CLI
    ↓
Templates (commands, subagents, skills)
    ↓
Installed to .claude/ or .claude/
    ↓
Used by AI agents in your IDE
```

## Architecture

### Installation Flow

```
1. devorch.config.yml (your project config)
        ↓
2. CLI fetches templates from GitHub release
        ↓
3. Dependency resolution (auto-resolves subagents and skills)
        ↓
4. Compilation (applies frontmatter filters, variables)
        ↓
5. Installation to .claude/ or .claude/
```

**Key insight:** Templates are compiled at install-time, customized for Claude Code and configuration.

### Directory Structure

**After installation:**
```
your-project/
├── devorch.config.yml    # Your configuration
└── .claude/                    # Claude Code installation
    ├── agents/                 # Subagents
    │   └── devorch/
    │       ├── implementers/
    │       └── verifiers/
    ├── commands/               # Slash commands
    │   └── devorch/
    │       ├── create-spec.md
    │       └── implement-spec.md
    └── knowledge/              # Skills (patterns and conventions)
        └── devorch/
            ├── zustand-patterns/
            └── zest-design-system/
```

## Components

### Commands

**Slash commands** that orchestrate workflows.

**Example: `/create-spec`**
```yaml
# In devorch.config.yml
commands:
  - name: /create-spec
    enabled: true

# Installs to:
# .claude/commands/devorch/create-spec.md
```

**What it does:**
1. Reads requirements from research folder
2. Writes detailed specification
3. Breaks down into tasks by specialty
4. Assigns implementer roles
5. Verifies completeness

**Available commands:**

**Context & Planning:**
- `/analyze-tech-stack` - Document repository tech stack
- `/train-context` - Generate context training from codebase
- `/load-context-training` - Load context training files
- `/update-context` - Update context training configuration

**Specification Workflow:**
- `/gather-requirements` - Research and plan new feature
- `/create-spec` - Transform requirements into blueprint
- `/update-spec` - Update existing specification
- `/create-tasks` - Break down spec into tasks
- `/implement-task` - Implement specific tasks
- `/implement-spec` - Batch implement all tasks
- `/jira-gather-requirements` - Fetch Jira ticket and post questions
- `/jira-create-spec` - Generate spec from Jira ticket

**Design & UX:**
- `/zest-check` - Check Figma design implementability for Zest (web & RN)
- `/a11y-check` - Audit Figma designs for accessibility compliance
- `/create-ux-spec-web` - Generate web dev instructions from Figma
- `/create-ux-spec-rn` - Generate React Native dev instructions from Figma
- `/design-change-web` - Implement visual/styling changes in web apps
- `/design-change-rn` - Implement visual/styling changes in React Native
- `/zest-add-component-web` - Add or update Zest web components
- `/zest-add-component-rn` - Add or update Zest React Native components

**Utilities:**
- `/worktree` - Create git worktree with branch
- `/panic` - Debug context collection
- `/help` - Show command help

### Subagents

**Specialized agents** for focused tasks.

**Categories:**
- `specification/*` - Create specifications
- `implementers/*` - Implement changes
- `verifiers/*` - Verify implementations
- `researchers/*` - Research patterns

**Example: UI Implementer**
```yaml
# Auto-resolved from command dependencies
subagents:
  - implementers/ui-implementer

# Installs to:
# .claude/agents/devorch/implementers/ui-implementer.md
```

**What it knows:**
- UI component patterns
- Styling conventions
- Accessibility requirements
- Testing patterns
- Only relevant skills (no context overload)

**Why multiple implementers?**
Focused agents prevent context overload. Each agent sees only relevant knowledge for their specialty.

### Skills

**Knowledge modules** extracted from codebases. **Claude Code only.**

**Example: Zustand Patterns**
```yaml
# Auto-resolved from subagent dependencies
skills:
  - zustand-patterns

# Installs to:
# .claude/knowledge/devorch/zustand-patterns/
```

**What it contains:**
- Store structure patterns from your codebase
- Real code examples
- Best practices
- Anti-patterns (what to avoid)
- Usage guidelines

**How it's created:**
AI analyzes your repository code and extracts patterns automatically. Skills stay synchronized with your codebase through scheduled updates.

## Dependency System

**Dependencies resolve automatically** - you only specify commands.

### How It Works

```yaml
# You configure:
commands:
  - name: /implement-spec
    enabled: true

# CLI auto-resolves:
commands:
  - name: /implement-spec
    enabled: true
subagents:
  - name: specification/spec-writer
    enabled: true      # From implement-spec
  - name: implementers/ui-implementer
    enabled: true    # From implement-spec
skills:
  - name: zest-design-system
    enabled: true             # From ui-implementer
  - zustand-patterns               # From ui-implementer
```

### Dependency Chain

```
Command
  ├─→ depends on Subagents
  │     └─→ depend on Skills
  └─→ depends on Skills (optional)
```

**Rules:**
- Commands can depend on: subagents, skills
- Subagents can depend on: skills only
- Skills cannot have dependencies (leaf nodes)
- No circular dependencies

### Example Resolution

```yaml
# config.yml specifies
commands:
  - name: /implement-spec
    enabled: true

# implement-spec depends on
dependencies:
  subagents:
    - specification/spec-writer
    - implementers/ui-implementer

# ui-implementer depends on
dependencies:
  skills:
    - zest-design-system
    - zustand-patterns

# Final resolution
commands: [implement-spec]
subagents: [specification/spec-writer, implementers/ui-implementer]
skills: [zest-design-system, zustand-patterns]
```

CLI writes comments in your config showing what was auto-installed:

```yaml
subagents:
  - specification/spec-writer
  # Auto-installed as dependency of implement-spec
  - implementers/ui-implementer
```

## Templates vs Installed Files

### Templates (Source)

Located in devorch repository:
```
templates/
├── commands/
│   └── implement-spec/
│       ├── single-agent/    # Claude Code
│       └── multi-agent/     # Claude Code
├── subagents/
│   └── implementers/
└── skills/
    └── zustand-patterns/
```

### Installed Files (Compiled)

Located in your project after installation:
```
.claude/
├── commands/devorch/
├── agents/devorch/
└── knowledge/devorch/
```

**Compilation applies:**
- Frontmatter filtering (agent-specific)
- Template variable substitution
- Dependency resolution
- Path organization

## Key Takeaways

1. **Commands** orchestrate workflows
2. **Subagents** implement focused tasks
3. **Skills** provide codebase-specific knowledge (Claude Code only)
4. **Dependencies auto-resolve** - just specify commands
5. **Templates compile** at install-time for your agent
6. **Direct file editing** for custom assets

## Next Steps

- [Configuration](./configuration.md) - Configure your setup
- [Workflows](./workflows.md) - Learn when to use what
- [Extending](../developer-guide/extending.md) - Create custom commands and subagents
- [Skills](./skills.md) - Add project knowledge (Claude Code)
