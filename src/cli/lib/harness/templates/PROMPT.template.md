# Feature: {{{FEATURE_NAME}}}

<files>
- **Specs:** `{{{RALPH_DIR}}}/specs/`
- **Plan:** `{{{RALPH_DIR}}}/PLAN.md`
- **Logs:** `{{{RALPH_DIR}}}/logs/`
- **Context training:** `{{{CONTEXT_TRAINING_PATH}}}`
</files>

<workflow>
1. **Discover files** - Glob in parallel (single message):
   - `{{{CONTEXT_TRAINING_PATH}}}/implementers/*.md`
   - `{{{CONTEXT_TRAINING_PATH}}}/verifiers/*.md`
   - `{{{RALPH_DIR}}}/specs/*.md`
   - `{{{RALPH_DIR}}}/logs/iteration-*.md`
2. **Read all files** - Read in parallel (single message):
   - `{{{CONTEXT_TRAINING_PATH}}}/specification.md` (skip if not found)
   - `{{{CONTEXT_TRAINING_PATH}}}/implementation.md` (skip if not found)
   - All implementer/verifier files from step 1
   - All spec files from step 1
   - `{{{RALPH_DIR}}}/PLAN.md`
   - Last 2-3 logs only (save context)
3. **Find task** - First task with unchecked acceptance criteria
4. **Do the work** - Complete that ONE task
5. **Verify criteria** - Ensure ALL acceptance criteria are met
6. **Run CI locally** - Find PR workflows, run same checks, fix failures:
   ```bash
   grep -l "pull_request" .github/workflows/*.yml .github/workflows/*.yaml 2>/dev/null
   ```
7. **Update PLAN.md** - Check off completed criteria with `[x]`
8. **Write log** - Create iteration log (see format below)
9. **STOP** - Do not continue to next task
</workflow>

<constraints>
- **One task only** - Complete ONE task per iteration, never more
- **CI required** - Task not complete until CI checks pass locally
- **Must stop** - After task completion (or if blocked), STOP immediately
- **Defer scope creep** - Out of scope work? Add new task to PLAN.md, continue current
- **Completion marker** - When ALL tasks done, add `## COMPLETED` to PLAN.md
</constraints>

<log_format>
Create at: `{{{RALPH_DIR}}}/logs/iteration-{NNN}.md`

```markdown
# Iteration {NNN}

**Timestamp:** {ISO timestamp}
**Task:** {task-id} - {task-name}
**Status:** COMPLETE | BLOCKED | IN_PROGRESS

## Changes Made
- `path/to/file.ext` - Created/Modified - [What and why]

## Approach
[1-2 sentences on approach and key decisions]

## Verification
- [x] Acceptance criterion 1: {result}
- [x] Acceptance criterion 2: {result}

## CI Checks
- [x] {check command} - passed/failed

## Blockers (if any)
- **Type:** [Error type]
- **Description:** [What went wrong]
- **Attempted Solutions:** [What you tried]
- **Recommended Fix:** [What should be done]

## Next Steps
[What needs to happen next iteration]
```
</log_format>
