# Skills System

**Knowledge modules that capture codebase patterns and conventions. Claude Code only.**

## Overview

Skills are specialized knowledge modules that document patterns, best practices, and conventions from your codebase. They provide agents with project-specific context to make better implementation decisions.

**Key features:**
- **Codebase-specific:** Patterns extracted from real production code
- **Manually created:** Document your team's conventions and patterns
- **Auto-updatable:** Optional repository tracking for automatic updates
- Uses Claude Code knowledge features

**Skills vs Documentation:**
- Documentation: General reference material
- Skills: Actionable patterns with code examples for AI agents

## Quick Start

### Install Skills

**Option 1: Auto-resolve from dependencies (Recommended)**

Skills automatically install from command/subagent dependencies:

```yaml
# devorch.config.yml
commands:
  - name: /implement-spec
    enabled: true

# Skills auto-installed from subagent dependencies
skills:
  # Auto-installed as dependency of implementers/ui-implementer
  - name: zest-design-system
    enabled: true
  - name: zustand-patterns
    enabled: true
```

**Option 2: Use context training**

Context trainings reference skills your project needs:

```yaml
# devorch/config.local.yml (recommended)
profile:
  context_training: mobile-app

# Skills referenced in context training are auto-loaded
# List them in your devorch.config.yml:
skills:
  - react-native-core/component-patterns
  - zustand-patterns
  - zest-design-system
```

**Option 3: Explicit installation**

Manually specify which skills to install:

```yaml
skills:
  - zest-design-system
  - zustand-patterns
```

See the **[templates/skills](https://github.com/guicheffer/devorch/tree/main/templates/skills)** directory for all available skills.

### Create a Skill

Skills are created manually in your project's `.claude/knowledge/` directory.

**1. Create directory structure:**
```bash
cd /path/to/your-project
mkdir -p .claude/knowledge/my-skill
```

**2. Create SKILL.md:**

`.claude/knowledge/my-skill/SKILL.md`:

```markdown
---
name: my-skill
description: Patterns for X feature
category: general
tracked_repositories:
  - url: company/repo
    type: internal
    paths: [/src/**/*.ts]
    sync_frequency: weekly
---

# My Skill

## Overview

Brief description of what patterns this skill documents.

## Patterns

### Pattern 1: [Name]

**When to use:**
[Explanation of when this pattern applies]

**Example:**
\`\`\`typescript
// Real code example from your codebase
function example() {
  // ...
}
\`\`\`

**Best practices:**
- Practice 1
- Practice 2

### Pattern 2: [Name]

[Similar structure...]

## Anti-Patterns

### Anti-Pattern 1

**Don't do this:**
\`\`\`typescript
// Bad example
\`\`\`

**Why:** Explanation of why this is problematic

**Do this instead:**
\`\`\`typescript
// Good example
\`\`\`

## Related Patterns

- Link to related skill or pattern
- Cross-reference with other documentation
```

**3. Test the skill:**

Use it in a subagent:

`.claude/agents/my-implementer.md`:

```markdown
---
name: my-implementer
category: implementers
dependencies:
  skills:
    - my-skill
---

# My Implementer

## Standards and Patterns

{{skills.my-skill}}

[Rest of agent definition...]
```

## Repository Tracking

Skills can track source repositories for automatic updates:

```yaml
---
name: zustand-patterns
description: Zustand store patterns
tracked_repositories:
  - url: company/shared-mobile-modules
    type: internal
    paths: [/src/stores/**/*.ts]
    last_synced: 2025-01-30T12:00:00Z
    sync_frequency: weekly
---
```

The auto-updater runs daily and:
1. Checks git commits in tracked paths since `last_synced`
2. Updates file content if changes detected
3. Creates PR for human review

## Available Skills

See the **[templates/skills](https://github.com/guicheffer/devorch/tree/main/templates/skills)** directory for all available skills.

**Available skill categories:**

| Category | Purpose | Example Skills |
|----------|---------|----------------|
| **State Management** | Store patterns, hooks, selectors | `zustand-patterns` |
| **UI Design System** | Component usage, styling patterns | `zest-design-system`, `zest-components`, `zest-integration` |
| **Data Access** | API integration patterns | `graphql-api`, `rest-api` |
| **Navigation** | Routing, deep linking | `navigation-patterns` |
| **Localization** | i18n patterns | `localization` |
| **Testing** | Test conventions | `test-patterns`, `mocking-strategies` |
| **Code Quality** | Code standards, linting, formatting | `typescript-patterns`, `file-organization` |
| **CLI Tools** | Command-line tool patterns | `jira-cli`, `github-cli` |
| **Feature Flags** | Feature flag implementation patterns | Feature toggle strategies |
| **Figma Dev Mode** | Figma-to-code workflows | Design token usage |
| **Global** | Cross-cutting concerns | Shared patterns across domains |
| **Observability** | Logging, monitoring, telemetry | Analytics, error tracking |
| **Platform** | Platform-specific patterns | `ios-patterns`, `android-patterns` |
| **React Native Core** | React Native fundamentals | Core RN patterns and practices |
| **React Web Core** | React web fundamentals | Core React web patterns |

## Skill Structure

### Frontmatter Fields

```yaml
---
name: string                    # Skill name (kebab-case)
description: string             # Brief description
category: string                # Category (state-management, ui-design, etc.)
tracked_repositories:           # Optional repository tracking
  - url: string                 # Repo URL (org/repo format)
    type: internal | external   # Repository access type
    paths: array                # Glob patterns to track
    last_synced: datetime       # Last sync timestamp (auto-updated)
    sync_frequency: daily | weekly | monthly
---
```

### Content Structure

**Recommended sections:**

1. **Overview** - What this skill covers
2. **Patterns** - Specific patterns with examples
3. **Best Practices** - Guidelines for using patterns
4. **Anti-Patterns** - What to avoid and why
5. **Examples** - Full examples showing patterns in use
6. **Related Patterns** - Cross-references

## When to Create Skills

**Good for:**
- Company-specific patterns (e.g., your Zustand conventions)
- Custom design system usage
- Internal API patterns
- Team-specific best practices
- Patterns agents need to follow consistently

**Not recommended for:**
- Official library documentation (link to official docs instead)
- One-time reference material
- Generic patterns well-documented elsewhere

## How Agents Use Skills

When an agent depends on a skill:

```markdown
---
name: ui-implementer
dependencies:
  skills:
    - zest-design-system
---

## Standards and Patterns

{{skills.zest-design-system}}
```

The `{{skills.zest-design-system}}` reference:
1. Loads the skill's SKILL.md content
2. Injects it into the agent's prompt
3. Agent has access to all patterns and examples

## Best Practices

1. **Focus on actionable patterns** - Provide code examples agents can follow
2. **Include real examples** - Use actual code from your codebase
3. **Document anti-patterns** - Show what NOT to do
4. **Keep it updated** - Use repository tracking for automatic updates
5. **Be specific** - Generic advice is less useful than concrete patterns
6. **Cross-reference** - Link related skills and patterns
7. **Use consistent structure** - Follow the recommended sections

## Troubleshooting

### Skill not loading

**Verify:**
- Skill listed in config
- Installed to `.claude/knowledge/`
- Agent depends on skill (in frontmatter)
- SKILL.md file exists

### Agent not following patterns

**Check:**
- Skill is actually loaded (check agent's dependencies)
- Patterns are clear and specific
- Examples are correct and up-to-date
- Skill content is properly formatted

### Repository tracking not working

**Verify:**
- `tracked_repositories` field is correct in frontmatter
- Repository URL is accessible
- Paths match files in repository
- Auto-updater is running (check GitHub Actions)

## Next Steps

- [Extending Guide](../developer-guide/extending.md) - Create custom assets
- [Configuration](./configuration.md) - Configure skills in your project
- [Development](../developer-guide/development.md) - Contributing to devorch
