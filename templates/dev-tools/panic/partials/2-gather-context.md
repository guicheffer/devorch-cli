## Step 2: Gather Comprehensive Context

Collect all relevant information about the current session for the panic report.

### A. Conversation Summary

Review the conversation history in the current context window and create:

- **Goal**: Brief description of what the user was trying to accomplish
- **Current Status**: Where things stand (stuck, error, needs review, etc.)
- **Key Issues**: Main questions or problems encountered
- **Timeline**: High-level sequence of what was attempted

**Format:**
```markdown
## Summary

[1-2 paragraph overview of the situation]

## Goal

[What the user was trying to accomplish]

## Current Status

[Current state: stuck/error/blocked/needs-review]
```

### B. Commands & Tools Used

List all commands and tools executed in this session:

- Bash commands (with relevant results/outputs)
- File operations (Read, Write, Edit, Glob, Grep)
- Tool invocations (Task, WebFetch, SlashCommand, etc.)
- Failed operations with their error messages

**Include:**
- Command/tool name
- Key parameters or arguments
- Result status (success/failure)
- Error messages for failures

**Format:**
```markdown
## Commands & Tools Used

<details>
<summary>View all commands ([X] total)</summary>

1. `bash: git status` - Success
2. `Read: src/file.ts` - Success
3. `Edit: src/file.ts` - Failed: file not found
4. `Task: subagent-name` - Success
[etc.]

</details>
```

### C. Error Context

Capture all errors encountered during the session:

- Error messages and their full text
- Stack traces (if available)
- Failed command outputs
- Validation failures
- Build/test failures
- Exception traces
- Warning messages

**For each error, include:**
- When it occurred (sequence in conversation)
- What operation triggered it
- Full error message
- Any attempted fixes

**Format:**
```markdown
## Errors Encountered

<details>
<summary>View errors ([Y] total)</summary>

### Error 1: [Brief description]

**Occurred during:** [operation/command]

**Error message:**
\`\`\`
[full error text]
\`\`\`

**Context:** [what was being attempted]

---

### Error 2: [Brief description]
[same structure]

</details>
```

### D. Environment Information

Collect system and project details:

```bash
# Git context
git branch --show-current
git status --short
git log --oneline -5
git diff --stat

# System info
uname -a
pwd
date

# Project structure (top-level)
ls -la
```

**Capture:**
- Operating system and version
- Current working directory
- Git branch name
- Git status (modified/untracked files)
- Recent commits (last 5)
- Any uncommitted changes
- Current date/time

**Format:**
```markdown
## Environment

- **OS:** [OS name and version from uname]
- **Date/Time:** [current timestamp]
- **Working Directory:** [pwd]
- **Git Branch:** [branch name]
- **Git Status:**
  \`\`\`
  [git status output]
  \`\`\`
- **Recent Commits:**
  \`\`\`
  [git log output]
  \`\`\`
- **Uncommitted Changes:**
  \`\`\`
  [git diff --stat]
  \`\`\`
```

### E. Relevant Files

Identify and capture files that were discussed, modified, or are relevant to the errors:

**⚠️ TOKEN BUDGET AWARENESS:**

Before including file contents, estimate current context usage:
- If context appears >60% full (based on conversation length), use SUMMARY MODE
- In summary mode: Include file paths and brief descriptions only, not full content
- Always prioritize: Error-related files > Modified files > Read files

**Files to include (priority order):**
1. Files mentioned in error messages (HIGHEST)
2. Files that were modified during session
3. Configuration files (package.json, tsconfig.json, etc.)
4. Files that were read
5. Recently modified files (LOWEST)

**For each file:**
1. Record file path and size
2. **If context budget is tight (>60% full):** Include path + 1-line description only
3. If file is under 200 lines AND context budget allows: include full content
4. If file is larger: include relevant excerpts (around errors/changes)
5. Note any modifications made during session

**Maximum files to include:** 10 files (prioritize by relevance)

**Format:**
```markdown
## Relevant Files

<details>
<summary>File 1: path/to/file.ext ([size] lines)</summary>

**Status:** [read/modified/created/deleted]

**Content:**
\`\`\`[extension]
[file contents or relevant excerpt]
\`\`\`

</details>

<details>
<summary>File 2: path/to/file.ext ([size] lines)</summary>

[same structure]

</details>
```

### F. Additional Context

Capture any other relevant information:

- Recent conversation topics
- Links or URLs referenced
- External resources consulted
- Attempted solutions that didn't work
- Workarounds or temporary fixes applied

**Format:**
```markdown
## Additional Context

- [Notable item 1]
- [Notable item 2]
[etc.]
```
