---
schema: command-multi-agent
name: /worktree
description: Create one or more git worktrees with branches and copy .claude folder
mode: multi-agent
partials:
  setup: common/partials/commands/command-setup.md
  get-branch-name: dev-tools/worktree/partials/1-get-branch-name.md
  create-worktree: dev-tools/worktree/partials/2-create-worktree.md
  copy-settings: dev-tools/worktree/partials/3-copy-settings.md
  provide-instructions: dev-tools/worktree/partials/4-provide-instructions.md
---

# /worktree - Create Git Worktrees (Multi-Agent)

Create one or more git worktrees in `./worktrees/` with new branches and automatically copy the `.claude` folder to maintain your local configuration.

{{partials.setup}}

## Overview

This command automates the process of:
- Creating git worktrees in `./worktrees/<branch-name>` for one or more branches
- Creating new branches with the specified names
- Copying the `.claude` folder to each new worktree (if it exists)
- Providing instructions for switching to the new worktrees

## Orchestration

You are the orchestrator for this workflow. Coordinate the following steps, using the Explore subagent where appropriate for verification tasks.

## Workflow

### Step 1: Get Branch Names

{{partials.get-branch-name}}

### Step 2: Verify Git Repository State

Before creating the worktrees, optionally use the **Explore** subagent to verify:
- Current git repository status
- Existing worktrees (`git worktree list`)
- Branch existence for each requested branch

This verification step helps prevent conflicts and provides better error messages.

### Step 3: Create the Worktrees

{{partials.create-worktree}}

### Step 4: Copy Claude Configuration

{{partials.copy-settings}}

### Step 5: Verify Setup

Optionally use the **Explore** subagent to verify the worktrees were created successfully:
- Check that each `./worktrees/<branch-name>` exists
- Verify `.claude` folder was copied if it existed
- Confirm the branches were created

### Step 6: Provide Next Steps

{{partials.provide-instructions}}

## Coordination Notes

- Use parallel tool calls where possible (e.g., creating multiple worktrees in parallel)
- Handle errors gracefully - continue with remaining worktrees if one fails
- Provide a summary of successes and failures at the end
- If verification fails, provide detailed diagnostics before attempting fixes
