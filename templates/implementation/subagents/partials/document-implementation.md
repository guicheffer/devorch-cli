Create `[spec-folder-path]/implementation/task-{task-id}-report.md`

**Template:**

```markdown
# Task {task-id}: {brief description}

**Completed:** {timestamp}

## Changes
- `path/to/file.ext` - Created/Modified - [What and why]

## Approach
[1-2 sentences: How you implemented this and key decisions]

## Tests
- ✅ All tests passing
- Manual verification: [Brief steps if applicable]

## Status
✅ COMPLETE
```

### Error Handling

**If implementation encounters an error:**

1. **Document the error** in the task report:
```markdown
## Status
⚠️ BLOCKED

## Error
- **Type:** [Compilation/Runtime/Dependency/Pattern Not Found]
- **Description:** [What went wrong]
- **Attempted Solutions:** [What you tried]
- **Recommended Fix:** [What should be done to unblock]
```

2. **Do NOT mark subtask as complete** if it failed
3. **Create a blocking note** in tasks.md next to the failed subtask:
```markdown
- [ ] 1.2 Create Model with validations <!-- BLOCKED: Missing database schema -->
```

4. **Return with status:** Report the blockage to the orchestrator so it can handle appropriately
