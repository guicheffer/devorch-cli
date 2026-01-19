# Contributing to Templates

A quick reference for creating commands, subagents, skills, and workflows.

## Directory Structure

```
templates/
├── [category]/              # Command domains (analysis, context-training, design, etc.)
│   ├── [command-name]/
│   │   ├── command.md       # Multi-agent orchestrator
│   │   └── partials/        # Command-specific workflow steps
│   └── subagents/
│       └── [agent-name].md  # Specialized agents
├── common/
│   └── partials/
│       ├── commands/        # Reusable command components
│       └── context-training-instructions/  # Role-specific training snippets
└── skills/
    └── [domain]/[skill-name]/
        ├── SKILL.md         # Knowledge module
        └── references/      # Examples, docs, patterns (REQUIRED)
```

## Dependencies (One Direction Only)

```
Commands → Commands, Subagents, Skills
Subagents → Skills
Skills → (leaf nodes)
```

- **Commands** can depend on other commands, subagents, and skills.
- **Subagents** use skills only (cannot call other subagents or commands).
- **Skills** are leaf nodes (no dependencies).
- Dependencies are auto-installed when parent is selected.

## Template Enforcement

### Multi-Agent Command

**Frontmatter:**
```yaml
---
schema: command-multi-agent
name: /command-name
argument-hint: [optional-arg]        # If command takes arguments
description: Clear one-line description
mode: multi-agent
dependencies:
  commands:                          # Other commands to auto-install (optional)
    - /dependent-command
  skills:                            # Required skills (optional)
    - domain/skill-name
  subagents:                         # Required subagents (optional)
    - domain/subagent-name
partials:
  setup: common/partials/commands/command-setup.md  # REQUIRED
  partial-name: path/to/partial.md
---
```

**Required Heading Structure:**
```markdown
# Command Title

## Purpose
[What this command does and why it exists]

## Instructions
[High-level overview of phases]

{{partials.instructions-footer}}

## Variables (optional)
[Define variables used in workflow]
TASK_ID: $ARGUMENTS[0]

## Workflow

### PHASE 0: Pre-checks
{{partials.setup}}

### PHASE 1: [Phase Name]
[Instructions or {{partials.phase-workflow}}]

### PHASE 2: [Phase Name]
[Sequential steps - ONE AT A TIME]

## Report
[What to display after completion]
[Artifacts created]
```

**Rules:**
- **Purpose** → What and why (always first heading after title)
- **Instructions** → High-level overview of phases
- **Variables** → Optional, define command arguments
- **Workflow** → PHASE-based sequential steps, starting with PHASE 0 base-checks
- **Report** → Display completion status and artifacts
- PHASE 0 always contains `{{partials.setup}}`
- Sequential execution - never parallel
- State management via `{{artifacts-path}}/[subagent-name]/`
- Access arguments with `$ARGUMENTS[0]`, `$ARGUMENTS[1]`
- **User prompts**: Use quotes, not code blocks (commands get confused by code blocks)
  - ✅ Good: `Ask the user: "Which option do you prefer?"`
  - ❌ Bad: `Ask the user:\n```\nWhich option?\n```\`
- **Subagent references**: Always use backticks with full domain/agent-name path
  - ✅ Good: `Use the \`specification/jira-ticket-fetcher\` subagent`
  - ❌ Bad: `Use the **specification/jira-ticket-fetcher** subagent`
  - ❌ Bad: `Use the \`jira-ticket-fetcher\` subagent` (missing domain prefix)
- **SlashCommand invocations**: Use simple function-style syntax
  - ✅ Good: `Run \`SlashCommand("/gather-requirements")\``
  - ❌ Bad: `Use \`/gather-requirements\` command via SlashCommand tool:`
- **Skill references**: Use dashes instead of slashes in non-frontmatter context
  - Frontmatter: `dependencies.skills: [cli-tools/jira-cli]`
  - In content: `cli-tools-jira-cli` skill (replace `/` with `-`)
  - ✅ Good: `See the \`cli-tools-jira-cli\` skill for details`
  - ❌ Bad: `See the \`cli-tools/jira-cli\` skill for details`

### Subagent

```yaml
---
schema: subagent                     # or specification-agent
name: domain/subagent-name           # domain extracted from name
description: |
  Clear, focused description
context_training_role: none          # none | specification | implementation | verifier
color: cyan                          # UI identification color
model: inherit                       # Use parent model
dependencies:
  skills:                            # Skills only - NOT other subagents
    - skill-domain/skill-name
partials:
  workflow: path/to/workflow.md
---
```

**Structure:**
```markdown
You are a [role] specialist.

## Input Requirements
[What the agent expects - be specific]

## Core Responsibilities
1. **[Task]**: [Clear description]

## Workflow
{{partials.workflow}}

## Output
[What the agent returns - exact format]

## Critical Rules
**DO:**
- ✅ [Specific dos]

**DON'T:**
- ❌ [Specific don'ts - critical for preventing hallucinations]
```

**Context Training Roles:**
- `specification` - Writes/verifies specs, receives spec style guidelines
- `implementation` - Plans work, receives list of implementers/verifiers
- `none` - Pure data collectors, no tuning needed

**Patterns:**
- Save state to `{{artifacts-path}}/[subagent-name]/state.json`
- Use exact bash commands (don't let agent improvise)
- Validate prerequisites before proceeding
- Return structured success/error responses
- Include extensive DON'T section to prevent hallucinations

### Skill

```yaml
---
name: skill-name
description: Comprehensive description with tech details
---
```

**Structure:**
```markdown
# [Skill Name]

[Brief introduction]

## When to Use
[Specific use cases]

## Core Principles
1. **[Principle]**: [Description with examples]

## Examples

### ✅ Good
[Code example with explanation]

### ❌ Bad
[Anti-pattern with explanation]

## Common Mistakes
[Mistakes and corrections]

## Quick Reference
[Cheatsheet format]

## Documentation
- **[Production Examples](./references/examples.md)** - Real code from codebase
- **[API Reference](./references/api-docs.md)** - Complete API docs
- **[Patterns](./references/patterns.md)** - Best practices
```

**REQUIRED: `references/` folder**
- Must include `examples.md` with production code examples
- Should include `patterns.md` for best practices
- Optional `api-docs.md` for API documentation

**OPTIONAL: `.updater/` folder** (for auto-updating skills)
- Contains `prompt.md` that follows the **command format** (see below)
- Frontmatter must include `repos:` array of GitHub repositories to clone
- Used by GitHub Actions workflow to automatically update skill from source repos
- See `templates/skills/ui-design-system/zest-components/.updater/prompt.md` for example

**Auto-Updater Prompt Format (.updater/prompt.md):**

Follow the same structure as multi-agent commands:

```yaml
---
repos:
  - org/repo1
  - org/repo2
---

# Update [Skill Name]

## Purpose
[What this update does]

## Instructions
[High-level overview of the update workflow]

Execute workflow phases sequentially, ONE AT A TIME.

## Workflow

### PHASE 1: [Phase Name]
[Instructions]

### PHASE 2: [Phase Name]
[Instructions]

### PHASE 3: [Phase Name]
[Instructions]

## Report
[What to display after completion]
[Artifacts created]
```

**Rules for .updater/prompt.md:**
- Must follow PHASE-based workflow structure
- Frontmatter `repos:` defines which repos to clone
- Include clear instructions for reading source files
- Specify exact file paths to analyze
- Define report format and location
- Include DO/DON'T critical rules section

### Workflow Partial

**NO frontmatter** (or `name: $parent` to inherit parent name)

Write as **direct instructions** (not documentation):

```markdown
Check if `devorch/products/` directory exists.

If NO products exist, display error and STOP:
```
❌ No products found. Run /plan-product first.
```

Parse spec folder structure:
- Read `devorch/products/[product]/specs/` for all specs
- Extract spec names and paths

Store as `[spec-list]` for downstream use.
```

**Rules:**
- No headers/titles (injected into parent flow)
- Direct imperative instructions
- Clear error handling with STOP conditions
- Define output variables like `[variable-name]`

## Variables & Mustache

### Variable Syntax Rules

**CRITICAL: Two types of variables, different syntax:**

1. **Mustache Variables `{{variable}}`** - Compile-time template variables
   - Rendered when command is installed
   - Available from frontmatter, config, or built-in context
   - Examples:
     - `{{name}}` - Command/subagent name
     - `{{context-training-name}}` - Active context training
     - `{{artifacts-path}}` - Artifact storage path
     - `{{partials.partial-name}}` - Inject partial content

2. **Runtime Variables `$VARIABLE`** - Parsed from command arguments
   - Evaluated when command is executed
   - Parsed from user arguments in Variables section
   - Examples:
     - `$ARGUMENTS[0]` - First command argument
     - `$ARGUMENTS[1]` - Second command argument
     - `$MODE` - Custom variable parsed from arguments
     - `$MAX_TOKENS` - Custom variable parsed from arguments

**Examples:**

```markdown
## Variables
Parse command arguments:
MODE: $ARGUMENTS[0]           # Runtime variable
MAX_TOKENS: $ARGUMENTS[1]     # Runtime variable

## Workflow
Load files from: devorch/context-training/{{context-training-name}}/
                                                 ^^^^^^^^^^^^^^^^^^^^
                                                 Compile-time (mustache)

Target token budget: $MAX_TOKENS
                     ^^^^^^^^^^^
                     Runtime (from arguments)
```

**Common mistakes:**
- ❌ Using `{{MODE}}` for runtime argument variable (should be `$MODE`)
- ❌ Using `$context-training-name` for template variable (should be `{{context-training-name}}`)
- ❌ Mixing syntax: `{{$VARIABLE}}` (choose one!)

**Conditionals:**
```markdown
{{#dependencies.subagents}}
- {{.}}
{{/dependencies.subagents}}

{{^context-training-name}}
No context training available.
{{/context-training-name}}
```
## Common Patterns

**Prerequisites Check:**
```markdown
{{partials.setup}}

Check required tools:
```bash
command -v gh >/dev/null 2>&1 || echo "ERROR: gh not found"
command -v jq >/dev/null 2>&1 || echo "ERROR: jq not found"
```

If errors, display fix instructions and STOP.
```

**State Management:**
```markdown
Save to artifact:
```bash
echo "$data" > {{artifacts-path}}/subagent-name/state.json
```

Load from artifact:
```bash
cat {{artifacts-path}}/subagent-name/state.json
```
```

**Sequential Task Processing:**
```markdown
FOR EACH task in tasks.md (in order):
1. Call SlashCommand: /implement-task [task-id]
2. WAIT for completion
3. Record result
4. Continue to next task

**CRITICAL: ONE AT A TIME - never parallel.**
```

**Verification Loop:**
```markdown
Attempt counter: 0
Max attempts: 3

LOOP:
1. Run verification
2. If PASS → break loop
3. If FAIL:
   - Increment attempt counter
   - If attempts < max → auto-fix and retry
   - If attempts >= max → report failure and STOP
```

## Testing

**Manual test:**
```bash
cd test-project
bun ../cli/src/index.ts install --local=../
cat .claude/commands/my-command.md  # Verify compiled output
```

**Snapshot test (REQUIRED for new templates):**
```bash
# For command
cat > tests/snapshots/commands/my-command.test.ts << 'EOF'
import { createCommandSnapshotTest } from '../test-utils';
createCommandSnapshotTest('my-command', '/my-command');
EOF

# For subagent
cat > tests/snapshots/subagents/my-subagent.test.ts << 'EOF'
import { createSubagentSnapshotTest } from '../test-utils';
createSubagentSnapshotTest('category', 'my-subagent');
EOF

# Generate snapshot
bun test tests/snapshots/commands/my-command.test.ts --update-snapshots
```

**After modifying templates:**
```bash
bun test tests/snapshots/ --update-snapshots
bun test tests/snapshots/  # Verify pass
```

## Anti-Patterns (Don't Do This)

- ❌ Commands calling other commands directly (use the SlashCommand tool)
- ❌ Subagents calling other subagents (technically not possible, architecture prevents this)
- ❌ Parallel execution of dependent tasks
- ❌ Skills with dependencies on other skills
- ❌ Improvised filenames (specify exact artifact paths)
- ❌ Skipping prerequisite checks
- ❌ Workflow partials with headers/titles
- ❌ Creating skill without `references/` folder
- ❌ Missing `{{partials.setup}}` in multi-agent commands
- ❌ Hardcoded artifact paths like `.devorch/artifacts/` (use `{{artifacts-path}}` instead)

## Quick Start Examples

**New multi-agent command:**
1. Copy existing command as template (e.g., `/implement-task`)
2. Update frontmatter (name, description, subagents)
3. Replace PHASE content with your workflow
4. Add partials to `partials/` folder if reusable
5. Create snapshot test
6. Test with `install --local`

**New subagent:**
1. Copy existing subagent in same domain (e.g., `implementation/`)
2. Update frontmatter (name, description, skills, role)
3. Define clear Input/Output/Workflow
4. Add extensive DON'T section
5. Create snapshot test

**New skill:**
1. Create `skills/domain/skill-name/SKILL.md`
2. Add frontmatter (name, description)
3. Create `references/` folder with at least `examples.md`
4. Write clear examples with ✅/❌ patterns
5. Reference skill in subagent: `dependencies.skills: [skill-name]`

See `test-project/readme.md` and existing templates for more examples.

## Release Process

Template changes trigger **patch** releases automatically on merge to main. CLI changes (`src/`) trigger **minor** releases. Use PR labels to override:
- `semver:patch` - Template-only update
- `semver:minor` - CLI update required
- `semver:major` - Breaking changes
- `semver:skip` - No release needed
