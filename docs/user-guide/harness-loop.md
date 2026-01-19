# Harness Loop

![Ralph Wiggum](../assets/ralph.gif)

![Harness Loop Workflow](../assets/harness-flow.jpg)

**Run Claude Code in an external bash loop for autonomous, iterative development.**

> Learn more about the technique: **[The Ralph Wiggum Technique](https://ghuntley.com/ralph/)**

## Overview

The Harness Loop implements the [Ralph Wiggum technique](https://ghuntley.com/ralph/) for fully autonomous development by running Claude Code in an external bash loop. Each iteration, Claude reads specs, works on tasks, logs progress, and continues until all acceptance criteria are met.

**Key benefits:**
- **Autonomous execution:** Claude works through tasks without manual intervention
- **Progress tracking:** Acceptance criteria checkboxes track completion
- **Iteration logs:** Every iteration creates a detailed report
- **Graceful completion:** Loop stops when "## COMPLETED" marker is added to PLAN.md

## Prerequisites

Ralph requires **context training** to be configured. This provides Claude with your project's patterns and conventions.

```yaml
# spec-machine/config.local.yml
profile:
  context_training: your-training-name
```

> Run `/train-context` to create context training if you haven't already.

## Quick Start

```bash
# 1. Initialize a feature folder (requires context_training in config)
devorch harness init my-feature

# 2. Generate specs (Claude investigates and writes detailed specs)
devorch harness create-specs my-feature

# 3. Review and edit PLAN.md to add tasks

# 4. Start the autonomous loop
devorch harness loop my-feature
```

## Commands

### `devorch harness init <feature>`

Creates the feature folder structure with templates.

```bash
devorch harness init auth-system
```

**Creates:**
```
devorch/harness/auth-system/
├── PROMPT.md      # Prompt sent to Claude each iteration
├── PLAN.md        # Tasks with acceptance criteria
├── specs/         # For specification files
└── logs/          # Iteration reports
```

### `devorch harness create-specs <feature>`

Boots Claude interactively to investigate the codebase and write detailed specifications.

```bash
devorch harness create-specs auth-system

# Or run in headless mode (no user interaction)
devorch harness create-specs auth-system --headless
```

Claude will:
1. Ask clarifying questions about the feature (interactive mode)
2. Explore the existing codebase structure
3. Identify relevant patterns and conventions
4. Write specification files in `specs/`
5. Update PLAN.md with tasks

### `devorch harness loop <feature>`

Runs Claude in an external bash loop until completion.

```bash
# Basic usage
devorch harness loop auth-system

# With iteration limit
devorch harness loop auth-system --max-iterations 20

# Show all message types (tool calls, etc.)
devorch harness loop auth-system --verbose
```

**Options:**
| Flag | Description |
|------|-------------|
| `--max-iterations N` | Stop after N iterations (default: 20) |
| `--verbose` | Show all message types instead of just assistant/result |

**Loop behavior:**
1. Reads PROMPT.md and sends to Claude
2. Claude works on the first incomplete task
3. Claude creates iteration log in `logs/`
4. Claude updates PLAN.md with progress
5. Loop checks for "## COMPLETED" marker
6. Repeats until complete or max iterations reached

**Stopping the loop:**
- Press `Ctrl+C` to stop gracefully after current iteration
- Add `## COMPLETED` to PLAN.md to signal completion

### `devorch harness list`

Lists all existing features with their status.

```bash
devorch harness list
```

**Output:**
```
Found 3 feature(s):

  [DONE] auth-system
     3 specs, 12 iterations

  [....] payment-flow
     2 specs, 5 iterations

  [    ] new-feature
     no specs, no iterations
```

### `devorch harness status <feature>`

Shows detailed progress for a feature.

```bash
devorch harness status auth-system
```

**Output:**
```
Feature: auth-system
Path: devorch/harness/auth-system

Specs:
  - overview.md
  - auth-flow.md
  - token-management.md

Iterations:
  5 completed
  - iteration-003.md
  - iteration-004.md
  - iteration-005.md

==================================================
PLAN.md Progress
==================================================

Status: IN_PROGRESS

Tasks:
  [x] Implement login endpoint
      [x] Create POST /auth/login route
      [x] Add password validation
      [x] Return JWT token

  [2/3] Add token refresh
      [x] Create refresh endpoint
      [x] Implement token rotation
      [ ] Add refresh token storage

==================================================
Progress: 5/6 acceptance criteria
         [################----] 83%
```

## Workflow

### 1. Initialize Feature

```bash
devorch harness init my-feature
```

This creates the folder structure and template files.

### 2. Create Specifications

```bash
devorch harness create-specs my-feature
```

When prompted, describe what the feature should do. Claude will investigate your codebase and create detailed specs in the `specs/` folder.

### 3. Define Tasks in PLAN.md

Edit `PLAN.md` to define tasks with acceptance criteria:

```markdown
# Plan: my-feature

## Status: IN_PROGRESS

## Tasks

### Task 1: Create database schema
**Acceptance Criteria:**
- [ ] Add users table with email, password_hash columns
- [ ] Add sessions table with user_id, token, expires_at
- [ ] Create migration file

### Task 2: Implement authentication endpoints
**Acceptance Criteria:**
- [ ] POST /auth/register - create new user
- [ ] POST /auth/login - authenticate and return token
- [ ] POST /auth/logout - invalidate session
- [ ] Add input validation for all endpoints

### Task 3: Add middleware
**Acceptance Criteria:**
- [ ] Create auth middleware to verify tokens
- [ ] Apply middleware to protected routes
- [ ] Return 401 for invalid/expired tokens
```

### 4. Run the Loop

```bash
devorch harness loop my-feature
```

Claude will:
1. Read specs and PLAN.md
2. Find the first task with unchecked criteria
3. Work on that task only
4. Create an iteration log
5. Update PLAN.md checkboxes
6. Repeat until all tasks complete

### 5. Monitor Progress

Check progress anytime:

```bash
devorch harness status my-feature
```

Or review iteration logs in `devorch/harness/my-feature/logs/`.

## File Formats

### PROMPT.md

The prompt sent to Claude each iteration. Created at `init` time with your context training path baked in:

```markdown
# Feature: my-feature

## Load Context First

**IMPORTANT:** Before starting work, use the Explore subagent to understand project patterns:

Task tool with subagent_type=Explore:
"Quickly scan spec-machine/context-training/your-training-name for key patterns..."

---

## Files to Read

1. **Specs folder** - Read ALL spec files to understand the feature
2. **Plan file** - Read to see current progress and find the next incomplete task
3. **Previous logs** - Read only the last 2-3 iteration logs for recent context

## Instructions

1. Read first: Use Read tool on all spec files, PLAN.md, and last 2-3 logs
2. Find next task: Look in PLAN.md for the FIRST task with unchecked acceptance criteria
3. Work on ONE task: Complete only that single task
4. Verify criteria: Ensure ALL acceptance criteria for the task are met
5. Update PLAN.md: Check off completed criteria with [x]
6. Write iteration log: Create a log file documenting what you did

## CRITICAL: When to Stop

After completing ONE task (or if blocked), you MUST stop.
When ALL tasks done: Add "## COMPLETED" to PLAN.md
```

### PLAN.md

Tracks tasks and progress:

```markdown
# Plan: {{FEATURE_NAME}}

## Status: IN_PROGRESS

## Tasks

### Task 1: [Task Name]
**Acceptance Criteria:**
- [ ] Criterion 1
- [ ] Criterion 2

### Task 2: [Task Name]
**Acceptance Criteria:**
- [ ] Criterion 1
- [ ] Criterion 2
```

### Iteration Logs

Created in `logs/iteration-NNN.md`:

```markdown
# Iteration 005

**Timestamp:** 2024-01-15T14:30:00Z
**Task:** Task 2 - Implement authentication endpoints
**Status:** COMPLETE

## Changes Made
- `src/routes/auth.ts` - Created - Added login/register/logout endpoints
- `src/middleware/auth.ts` - Created - Token verification middleware

## Approach
Implemented JWT-based authentication following existing patterns in the codebase.

## Verification
- [x] POST /auth/register - create new user: Works, tested with curl
- [x] POST /auth/login - authenticate and return token: Returns valid JWT
- [x] POST /auth/logout - invalidate session: Removes session from DB

## Next Steps
Move to Task 3: Add middleware to protected routes
```

## Best Practices

### Writing Good Acceptance Criteria

- **Be specific:** "Add email validation" → "Validate email format using regex, return 400 for invalid"
- **Be testable:** Each criterion should be verifiable
- **Be atomic:** One thing per criterion
- **Include edge cases:** "Handle duplicate email registration with 409 response"

### Organizing Specs

Number spec files for clear ordering (00-, 01-, etc.):

```
specs/
├── 00-overview.md       # High-level feature description
├── 01-data-model.md     # Database schema, types
├── 02-api-endpoints.md  # REST API specifications
├── 03-business-logic.md # Core logic requirements
└── 99-integration.md    # How components connect (last)
```

### When to Use Harness Loop

**Good fit:**
- Multi-step feature implementation
- Refactoring with clear acceptance criteria
- Bug fixes requiring multiple changes
- Adding tests to existing code

**Not ideal for:**
- Exploratory work without clear specs
- One-off quick fixes
- Tasks requiring human judgment at each step

## Troubleshooting

### Loop stops unexpectedly

Check the latest iteration log in `logs/` for blockers or errors.

### Claude skips tasks

Ensure acceptance criteria use the exact format:
```markdown
- [ ] Criterion text
```

### Progress not updating

Verify PLAN.md has the correct task format:
```markdown
### Task N: Task Name
**Acceptance Criteria:**
- [ ] ...
```

### Loop never completes

Claude adds `## COMPLETED` when all criteria are checked. Verify all `- [ ]` are changed to `- [x]`.
