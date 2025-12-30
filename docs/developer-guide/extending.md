# Extending DevOrch

Create custom commands, subagents, and skills for your project.

## Overview

DevOrch can be extended with custom assets:
- **Commands:** Slash commands for workflows
- **Subagents:** Specialized agents for focused tasks
- **Skills:** Knowledge modules (Claude Code only, advanced)

**Create custom assets in your project's `.claude/` or `.claude/` directories.**

## Creating Custom Assets

Create custom assets by editing markdown files directly in your project. Simple, fast, full control.

### Creating a Command

**1. Create directory structure in your project:**
```bash
cd /path/to/your-project
mkdir -p .claude/commands/my-command
```

**2. Create command file:**

`.claude/commands/my-command/my-command.md`:

```markdown
---
name: my-command
description: Brief description of what this command does
mode: single-agent
dependencies:
  subagents:
    - some-category/some-agent
  skills:
    - some-skill
---

# My Command

## Purpose

[Explain what this command does and when to use it]

## Workflow

### Step 1: [First Step]

[Instructions for the agent...]

### Step 2: [Second Step]

[More instructions...]

## Output

[Describe what the command produces]
```

**3. Test the command:**
```
/my-command
```

**4. Contribute back to devorch:**
```bash
devorch contribute
```

Select your custom command and optionally add repository tracking for automatic updates.

### Creating a Subagent

**1. Create directory in your project:**
```bash
cd /path/to/your-project
mkdir -p .claude/agents/my-category
```

**2. Create subagent file:**

`.claude/agents/my-category/my-agent.md`:

```markdown
---
name: my-agent
category: my-category
description: Brief description of agent's role
dependencies:
  skills:
    - relevant-skill
---

# My Agent

## Role

You are a specialized agent responsible for [specific task].

## Responsibilities

- Responsibility 1
- Responsibility 2
- Responsibility 3

## Standards and Patterns

{{skills.relevant-skill}}

## Workflow

### When Called

1. [First step]
2. [Second step]
3. [Third step]

### Output Format

[Describe expected output]

## Examples

### Example 1: [Scenario]

**Input:**
\`\`\`
[example input]
\`\`\`

**Expected action:**
[what agent should do]

**Output:**
\`\`\`
[example output]
\`\`\`
```

### Creating Skills

Skills are knowledge modules that provide codebase-specific patterns and conventions. Create them manually in `.claude/knowledge/`.

See [Skills Guide](../user-guide/skills.md) for detailed instructions on creating and structuring skills.

## Using Shared Workflows

Avoid duplication by extracting common workflows.

**When to use:**
- Command has both single-agent and multi-agent versions
- Multiple commands share workflow steps
- Complex workflow used in multiple places

### Create Shared Workflow

**1. Create workflow file:**

`templates/common/partials/commands/my-command/verify-prerequisites.md`:

```markdown
## Verify Prerequisites

Check that all required tools and files are present:

1. Verify git is available
2. Check for required configuration files
3. Validate dependencies
```

**2. Reference in command:**

`templates/dev-tools/my-command/command.md`:

```markdown
---
partials:
  verify-prerequisites: common/partials/commands/my-command/verify-prerequisites.md
  run-workflow: common/partials/commands/my-command/run-workflow.md
---

# My Command

{{partials.verify-prerequisites}}

{{partials.run-workflow}}
```

### Example: Shared Partials

Common partials are used across multiple commands:

**Shared partials location:**
```
templates/common/partials/commands/
├── check-context-training.md
├── command-setup.md
├── select-spec.md
└── standard-instructions-footer.md
```

**Command references them:**
```markdown
---
partials:
  verify-prerequisites: shared/workflows/commands/panic/verify-prerequisites.md
  gather-context: shared/workflows/commands/panic/gather-context.md
  format-report: shared/workflows/commands/panic/format-report.md
  create-issue: shared/workflows/commands/panic/create-issue.md
---

# Panic Command

{{partials.verify-prerequisites}}
{{partials.gather-context}}
{{partials.format-report}}
{{partials.create-issue}}
```

## Declaring Dependencies

Assets can depend on other assets.

### Command Dependencies

Commands can depend on subagents and skills:

```markdown
---
name: implement-feature
mode: multi-agent
dependencies:
  subagents:
    - implementers/ui-implementer
    - verifiers/code-quality-verifier
  skills:
    - zest-design-system
---
```

### Subagent Dependencies

Subagents can depend on skills only:

```markdown
---
name: ui-implementer
category: implementers
dependencies:
  skills:
    - zest-design-system
    - zustand-patterns
---
```

### Dependency Rules

- Commands → subagents, skills
- Subagents → skills only
- Skills → no dependencies (leaf nodes)
- No circular dependencies

### Auto-Resolution

When users install commands, dependencies automatically resolve:

```yaml
# User config
commands:
  - name: implement-feature
    enabled: true

# CLI auto-adds:
subagents:
  # Auto-installed as dependency of implement-feature
  - name: implementers/ui-implementer
    enabled: true
  - name: verifiers/code-quality-verifier
    enabled: true

skills:
  # Auto-installed as dependency of ui-implementer
  - zest-design-system
  - zustand-patterns
```

## Frontmatter Reference

### Command Frontmatter

```yaml
---
name: string                    # Command name (kebab-case)
description: string             # Brief description
mode: single-agent | multi-agent
dependencies:                   # Optional
  subagents: array
  skills: array
partials:                       # Optional shared workflows
  workflow-name: path/to/workflow.md
---
```

### Subagent Frontmatter

```yaml
---
name: string                    # Agent name (kebab-case)
category: string                # Category (implementers, verifiers, etc.)
description: string             # Brief description
dependencies:                   # Optional
  skills: array
---
```

### Skill Frontmatter

See [Skills Guide](../user-guide/skills.md).

## Command Structure

Commands are organized by category in the templates directory:

**Directory structure:**
```
templates/
├── specification/     # Spec-related commands
│   ├── create-spec/
│   │   └── command.md
│   ├── gather-requirements/
│   │   └── command.md
│   └── update-spec/
│       └── command.md
├── implementation/    # Implementation commands
│   ├── implement-spec/
│   └── implement-task/
├── design/           # Design-related commands
├── dev-tools/        # Utility commands
└── common/           # Shared partials
    └── partials/
        └── commands/
```

**Commands can:**
- Use single prompt file for simple workflows
- Orchestrate multiple subagents for complex workflows
- Reference shared partials from `common/partials/`

**Example: Create Spec Command**

Location: `templates/specification/create-spec/command.md`

This command orchestrates multiple subagents (spec-writer, task-planner, verifier) to transform requirements into a specification with task breakdown.

## Testing Local Changes

When developing devorch itself:

```bash
cd /path/to/your-test-project

# Install from local devorch repo
bun /path/to/devorch/src/cli/index.ts install --local=/path/to/devorch

# Test your changes
/my-command
```


## Examples

### Example 1: Debug Command

Simple command that collects debug info:

`.claude/commands/debug/debug.md`:

```markdown
---
name: debug
description: Collect debug information
mode: single-agent
---

# Debug Command

## Purpose

Collect system information and recent errors for debugging.

## Workflow

### 1. Collect System Info

Run these commands:
\`\`\`bash
node --version
npm --version
git --version
\`\`\`

### 2. Check Recent Logs

Look for errors in:
- Console output
- Log files
- Git history

### 3. Create Report

Format as markdown:
\`\`\`markdown
# Debug Report

## System Info
- Node: [version]
- Git: [version]

## Recent Errors
[errors found]

## Recent Changes
[git log]
\`\`\`
```

### Example 2: Custom Implementer

Specialized agent for specific task:

`.claude/agents/implementers/api-implementer.md`:

```markdown
---
name: api-implementer
category: implementers
description: Implements API endpoints
dependencies:
  skills:
    - rest-api
---

# API Implementer

## Role

You implement RESTful API endpoints following company conventions.

## Responsibilities

- Create API route handlers
- Add request validation
- Implement error handling
- Write API tests
- Update API documentation

## Workflow

### 1. Analyze Requirements

Review the spec for API requirements.

### 2. Implement Endpoint

\`\`\`typescript
// Example structure
export async function handleRequest(req, res) {
  // Validation
  // Business logic
  // Response
}
\`\`\`

### 3. Add Tests

\`\`\`typescript
describe('API Endpoint', () => {
  it('should handle valid request', async () => {
    // Test implementation
  });
});
\`\`\`

### 4. Document

Update API docs with new endpoint.
```

## Best Practices

1. **Start simple** - Begin with basic command, add complexity as needed
2. **Use shared workflows** - Extract common patterns
3. **Declare dependencies** - Let auto-resolution work
4. **Test locally** - Use `--local` flag for rapid iteration
5. **Document thoroughly** - Clear instructions for agents
6. **Follow conventions** - Match existing naming and structure

## Next Steps

- [Skills Guide](../user-guide/skills.md) - Create and structure skills
- [Development](./development.md) - Contributing to devorch
- [Configuration](../user-guide/configuration.md) - Using custom assets in projects
