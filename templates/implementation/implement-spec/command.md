---
schema: command-multi-agent
name: /implement-spec
description: Implement spec using specialized subagents and verify implementation
mode: multi-agent
dependencies:
  commands:
    - /implement-task
  subagents:
    - implementation/implementer
    - implementation/verifier
partials:
  setup: common/partials/commands/command-setup.md
  context-training-check: common/partials/commands/check-context-training.md
  select-spec: common/partials/commands/select-spec.md
---

# Spec Implementation Process

Now that you have a spec and tasks list ready, this command will implement ALL tasks sequentially using the `/implement-task` workflow.

**Note:** This is a batch implementation command. For more control, use `/implement-task [task-id]` to implement tasks individually.

{{partials.setup}}

{{^context-training-name}}
{{partials.context-training-check}}
{{/context-training-name}}

---

## Process Overview

This command orchestrates the implementation of all tasks in a spec by calling `/implement-task` for each task sequentially.

**Phases:**
- PHASE 0: Select spec folder
- PHASE 1: Load and validate tasks.md
- PHASE 2: Run `/implement-task` for each task sequentially
- PHASE 3: Create implementation summary

Follow each of these phases IN SEQUENCE:

## Multi-Phase Process

{{partials.select-spec}}

### PHASE 1: Load Tasks

1. **Use the spec folder from Phase 0**

2. **Verify tasks.md exists**:
   - If `tasks.md` exists: proceed
   - If not: ERROR - "No tasks file found. Run `/create-tasks` first."

3. **Read tasks.md** and identify all tasks:
   - Parse task headers (e.g., "#### Task 1: Title")
   - Extract task IDs (e.g., "1", "2", "3")
   - Check completion status of subtasks for each task

4. **Display task summary**:
   ```
   📋 Found [X] tasks in spec
   🎯 Ready to implement sequentially
   ```

5. **Ask user for confirmation**:
   "This will implement all [X] tasks sequentially. This may take significant time. Continue? (yes/no)"
   - If no: abort and suggest `/implement-task [id]` for granular control

### PHASE 2: Implement Tasks Sequentially

**IMPORTANT: Implement tasks ONE AT A TIME in order.**

For each task in `tasks.md`, run `/implement-task` sequentially:

```
FOR EACH task (1, 2, 3, ...) in order:
  1. SlashCommand: /implement-task [task-id]
  2. Wait for command to complete fully
  3. Display progress: "✅ Task [id] completed ([completed]/[total] done)"
  4. THEN continue to next task
```

**Example execution:**
```
SlashCommand: /implement-task 1
  ↓ Wait for completion (implements + verifies)
Display: "✅ Task 1 completed (1/3 done)"
  ↓ Then continue
SlashCommand: /implement-task 2
  ↓ Wait for completion (implements + verifies)
Display: "✅ Task 2 completed (2/3 done)"
  ↓ Then continue
SlashCommand: /implement-task 3
  ↓ Wait for completion (implements + verifies)
Display: "✅ Task 3 completed (3/3 done)"
```

**Note:** Each `/implement-task` call handles both implementation and verification automatically.

**Do NOT run multiple /implement-task commands in parallel or at once.**

### PHASE 3: Create Implementation Summary

1. **Read tasks.md** to get completion statistics:
   - Count total tasks
   - Count completed subtasks (all `[x]` checkboxes)
   - Count completed verification checks (all `[x] ✓` checkboxes)

2. **List all reports** created:
   - Implementation reports in `implementations/`
   - Verification reports in `verification/`

3. **Create summary** in `implementation-summary.md`:

```markdown
# Implementation Summary

**Spec:** [spec-name]
**Completed:** [timestamp]

## Tasks Completed

[For each task:]
### Task [id]: [title]
- **Status:** ✅ Complete / ⚠️ Complete with Warnings / ❌ Failed
- **Verification:** ✅ PASSED / ⚠️ PASSED WITH WARNINGS ([X] warnings) / ❌ FAILED
- **Implementation:** `implementations/task-[id]-report.md`
- **Verification Report:** `verification/task-[id]-verification.md`

## Overall Status

✅ [X]/[Y] tasks completed
⚠️ [W] tasks completed with warnings
✅ [Z]/[W] verification checks passed

## Warnings Summary

[If any tasks had warnings, list them here:]
- **Task [id]:** [X] warnings - [brief description]
- **Task [id]:** [Y] warnings - [brief description]

## Next Steps

- Review implementation and verification reports
- Address warnings if needed before merging
- Test the feature manually
- Consider creating a PR
```

4. **Display to user**:

```
Implementation complete! 🎉

✅ [X]/[Y] tasks completed
⚠️ [W] tasks completed with warnings (if any)
✅ [Z]/[W] verification checks passed

[If any tasks had warnings:]
⚠️ **Warning Summary:**
- Task [id]: [X] warnings
- Task [id]: [Y] warnings

📄 Summary: `implementation-summary.md`
📁 Reports: `implementations/` and `verification/`

👉 Review the reports, address any warnings, and test the feature!
```

