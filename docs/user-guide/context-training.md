# Context Training System

Context trainings teach devorch how your repository works by providing AI agents with project-specific patterns and conventions.

## Quick Start

```bash
# 1. Analyze your tech stack
/analyze-tech-stack

# 2. Generate context training from your PRs
/train-context

# 3. Install with your context training
devorch install
```

## What Is Context Training?

Context training = **Your repository's personality and preferences**

It tells AI agents:
- How your team writes specs
- What patterns to follow for UI, state, API, etc.
- What to check when verifying implementations
- Which design systems and libraries to use

**Structure:**
```
devorch/context-training/my-app/
├── specification.md        # Spec writing guidelines
├── implementation.md       # Lists available implementers
├── implementers/          # Domain patterns (UI, state, API, etc.)
│   ├── ui.md
│   ├── state.md
│   └── api.md
└── verifiers/            # Verification rules
    └── ui.md
```

---

## 🔥 Manual Review & Customization

### You Can (and Should!) Edit These Files Directly

**The markdown files are YOUR customization points.** After generation:

1. **Review generated files** in `devorch/context-training/{name}/`
2. **Edit any `.md` file** to match your preferences
3. **Add new domain files** for specialized areas
4. **Each file = One specialty** that implementers can use

### Adding Your Own Specialties

**Create a new specialty by adding a markdown file:**

```bash
cd devorch/context-training/my-app/implementers/
touch animations.md
```

**animations.md:**
```markdown
---
domain: animations
description: Implements animations using framer-motion
---

# Animation Patterns

## Timing
- Use spring physics for interactive animations
- Use timing functions for page transitions

## Library
All animations use **framer-motion**:
- `useSpring()` for gestures
- `animate()` for sequences

Reference the **framer-motion-patterns** skill for detailed examples.
```

**That's it!** Next install, this becomes an `animations-implementer` that agents can discover and use.

### Implementers vs Verifiers

**Implementers** = Write code based on patterns
**Verifiers** = Check code against rules

| Type | File | Becomes | Role |
|------|------|---------|------|
| **Implementer** | `implementers/ui.md` | `ui-implementer` | Writes UI components following patterns |
| **Implementer** | `implementers/state.md` | `state-implementer` | Creates state management code |
| **Implementer** | `implementers/api.md` | `api-implementer` | Builds API endpoints |
| **Verifier** | `verifiers/ui.md` | `ui-verifier` | Checks UI components (tests, a11y, styling) |
| **Verifier** | `verifiers/api.md` | `api-verifier` | Validates API endpoints (types, errors, docs) |

**How they work together:**
1. Commands read `implementation.md` to discover implementers and verifiers
2. Planning assigns tasks to implementers based on domain
3. Implementers write code using patterns from their domain file + skills
4. Verifiers check the implementation using verification rules
5. Cycle repeats until verification passes

---

## File Purposes

### `specification.md`
**What:** Guidelines for writing specifications
**Used by:** Spec-writing subagents
**Include:**
- Required sections (Overview, Requirements, etc.)
- Level of detail expected
- Platform considerations
- Skill references for common patterns

### `implementation.md`
**What:** Lists all available implementers and verifiers
**Used by:** Planning subagents that assign tasks
**Include:**
- Each implementer's specialty
- When to use which implementer
- Verifier capabilities

### `implementers/*.md`
**What:** Domain-specific patterns (one file = one specialty)
**Used by:** Implementation subagents
**Frontmatter:**
```yaml
domain: ui-components
description: Patterns for building UI components with React
```
**Include:**
- Code patterns and conventions
- File structure preferences
- Design system usage (reference skills for detailed guidelines)
- Common pitfalls
- Testing approaches

### `verifiers/*.md`
**What:** Verification rules for domains
**Used by:** Verification subagents
**Frontmatter:**
```yaml
domain: ui-components
description: Verify UI components for correctness, accessibility, and design compliance
```
**Include:**
- What to check
- How to verify
- Testing patterns
- Quality criteria

---

## Creating Context Training

### Option 1: Generate from PRs (Recommended)

```bash
/train-context
> Analyze recent PRs and extract patterns
```

Analyzes your PRs and code to discover:
- Common file structures
- Coding conventions
- Testing patterns
- Library usage

### Option 2: Start Minimal

```bash
/train-context
> Create minimal context training
```

Creates basic structure for manual customization.

### Option 3: Manual Creation

```bash
mkdir -p devorch/context-training/my-app/{implementers,verifiers}
touch devorch/context-training/my-app/{specification,implementation}.md
# Add at least one implementer file
echo "# UI patterns" > devorch/context-training/my-app/implementers/ui.md
```

Update config:
```yaml
profile:
  context_training: my-app
```

---

## Skill References

Link to reusable patterns using `**skill-name**`:

```markdown
Use functional components following **react-native-core/component-patterns**.
All UI follows **zest-design-system** guidelines.
```

Add skills to config:
```yaml
skills:
  - react-native-core/component-patterns
  - zest-design-system
```

---

## How It Works

### 1. Installation
- Core implementer template + your domain file = merged implementer
- Example: `implementer.md` + `implementers/ui.md` → `ui-implementer.md`
- Installed to `.claude/agents/devorch/ui-implementer.md`

### 2. Compilation
- `specification.md` appended to spec-writing subagents
- `implementation.md` appended to planning subagents

### 3. Execution
- Commands discover merged implementers
- Match tasks to implementers by specialty
- Implementers follow your patterns + skills
- Verifiers check using your rules

---

## Loading Context Training Manually

### `/load-context-training` Command

Sometimes you want to manually load context training files into your conversation for reference.

**When to use:**
- Review patterns before implementing custom features
- Understand project conventions
- Debug or inspect generated context training
- Answer questions about project preferences

**Usage:**
```bash
/load-context-training
```

**What it loads:**
- `specification.md` - Spec writing guidelines
- `implementation.md` - Available implementers
- `implementers/*.md` - All domain patterns
- `verifiers/*.md` - All verification rules

**Example:**
```
📦 Loading context training: mobile-app

✅ Context training loaded successfully

Summary:
- Total files loaded: 7
- Implementers: 3 (ui-components, state-management, api)
- Verifiers: 2 (ui-components, api)

Next steps:
- All files are now in conversation context
- Ask questions about patterns or conventions
- Reference specific implementers as needed
```

**Note:** The JIRA commands (`/jira-gather-requirements` and `/jira-create-spec`) automatically run this command at the start.

---

## Configuring Context Training

> **Important:** Context training is developer-specific and must be configured in `devorch/config.local.yml` (not versioned), not in the main config file. This prevents merge conflicts and avoids accidentally committing personal configurations.

Different developers can use different context trainings based on what they're working on.

**Priority:** Environment Variables > Local Config

### Local Config File
```yaml
# devorch/config.local.yml (gitignored)
profile:
  context_training: my-custom-context
```

This file is automatically gitignored. Perfect for:
- Testing different context trainings
- Personal workflow preferences
- Working on multiple projects

### Environment Variables (Quick Override)
```bash
export DEVORCH_CONTEXT_TRAINING=backend-api
devorch install
```

Use this for one-off changes without modifying any config files.

---

## Quick Reference

**Review & Edit:**
```bash
# View all your customizations
cd devorch/context-training/my-app
ls implementers/  # Your domain specialties
cat implementers/ui.md  # Edit patterns
```

**Add New Specialty:**
```bash
# Create new domain file
touch implementers/performance.md
# Fill with patterns, reinstall
devorch install
# Now performance-implementer exists!
```

**Check What's Installed:**
```bash
ls .claude/agents/devorch/*-implementer.md
```

**Verify Config:**
```bash
devorch get-context-training
```

---

## Examples

### UI Implementer Domain File

**`implementers/ui-components.md`:**
```markdown
---
domain: ui-components
description: Patterns for building UI components with React and TypeScript
---

# UI Implementation Patterns

## Components
- Functional components only
- Props typed with TypeScript
- Export from index.ts

## Styling
Use **zest-design-system** tokens:
- Colors: `colors.primary`
- Spacing: `spacing.md`
- Typography: `typography.body`

Reference the **zest-design-system** skill for complete token documentation.

## Testing
Every component gets:
- Render test
- Interaction test
- Accessibility check
```

### State Management Domain File

**`implementers/state-management.md`:**
```markdown
---
domain: state-management
description: State management patterns using Zustand
---

# State Patterns

Follow **zustand-patterns** skill for all stores.

## Store Structure
- One file per domain (userStore.ts)
- Actions prefix: `set`, `add`, `remove`
- Selectors separate from state

## Persistence
Use zustand persist middleware for:
- User preferences
- Auth tokens
- NOT for temporary UI state
```

---

## Next Steps

- **[Configuration Guide](./configuration.md)** - Full config reference
- **[Workflows](./workflows.md)** - Using commands with context training
- **[Skills System](./skills.md)** - Creating and using skills
