---
schema: command-multi-agent
name: /panic
description: Emergency context capture and GitHub issue creation
mode: multi-agent
dependencies:
  subagents:
    - dev-tools/conversation-analyzer
    - dev-tools/command-history-collector
    - dev-tools/error-analyzer
    - dev-tools/environment-collector
    - dev-tools/file-context-collector
partials:
  setup: common/partials/commands/command-setup.md
  verify-prerequisites: dev-tools/panic/partials/1-verify-prerequisites.md
  gather-context: dev-tools/panic/partials/2-gather-context.md
  format-report: dev-tools/panic/partials/3-format-report.md
  create-issue: dev-tools/panic/partials/4-create-issue.md
---

# /panic - Emergency Context Capture (Multi-Agent)

This command uses a multi-agent orchestration pattern to capture comprehensive context and create a GitHub issue for help or debugging.

{{partials.setup}}

---

## Process Overview

This workflow follows a structured multi-phase approach:

**PHASE 1: Verification** - Check prerequisites and repository status
**PHASE 2: Context Gathering** - Collect all relevant information using subagents
**PHASE 3: Report Assembly** - Compile information into structured markdown
**PHASE 4: Issue Creation** - Submit to GitHub and report results

Follow each of these phases IN SEQUENCE:

---

## Multi-Phase Process

### PHASE 1: Verification

**Objective:** Ensure all prerequisites are met

{{partials.verify-prerequisites}}

### PHASE 2: Context Gathering

**Objective:** Collect comprehensive context using available subagents or direct orchestration

**🚀 CRITICAL: Launch all 5 subagents IN PARALLEL**

To minimize latency, launch all context-gathering subagents simultaneously in a SINGLE message with multiple Task tool calls:

```markdown
**In a single message, invoke all 5 Task tools:**

1. Task(subagent_type="dev-tools/conversation-analyzer", ...)
2. Task(subagent_type="dev-tools/command-history-collector", ...)
3. Task(subagent_type="dev-tools/error-analyzer", ...)
4. Task(subagent_type="dev-tools/environment-collector", ...)
5. Task(subagent_type="dev-tools/file-context-collector", ...)
```

**Each subagent prompt should include:**
- Context: "This is for a /panic report to capture current session state"
- Output format: "Return your findings as structured markdown"
- Scope: Relevant to their specific task

**Task Assignment Strategy:**

For each aspect of context gathering, use the specialized subagent:

#### Task 2.1: Conversation Analysis (PARALLEL)
- **Subagent:** `dev-tools/conversation-analyzer`
- **Output:** Summary, goal, status, key issues

#### Task 2.2: Command & Tool History (PARALLEL)
- **Subagent:** `dev-tools/command-history-collector`
- **Output:** Structured list of all commands/tools used

#### Task 2.3: Error Collection & Analysis (PARALLEL)
- **Subagent:** `dev-tools/error-analyzer`
- **Output:** Categorized errors with context

#### Task 2.4: Environment Information (PARALLEL)
- **Subagent:** `dev-tools/environment-collector`
- **Output:** System and project snapshot

#### Task 2.5: File Context Gathering (PARALLEL)
- **Subagent:** `dev-tools/file-context-collector`
- **Output:** Relevant files with content/excerpts

**Fallback:** If any subagent fails, the orchestrator performs that task directly.

**Context Gathering Instructions:**

{{partials.gather-context}}

**Note:** If using subagents, coordinate their outputs and consolidate into the format described above.

### PHASE 3: Report Assembly

**Objective:** Compile all gathered information into a structured markdown report

{{partials.format-report}}

**Multi-Agent Specific:**
- Include which subagents were used in the report footer
- Note any subagent failures or fallbacks in the "Additional Context" section

### PHASE 4: Issue Creation

**Objective:** Create GitHub issue and report results to user

{{partials.create-issue}}

**Multi-Agent Specific:**
When displaying results, include:
```
Subagents Used:
- [subagent-1]: [what it contributed]
- [subagent-2]: [what it contributed]
- Direct orchestration: [any fallback tasks]
```

---

## Error Handling

### Verification Failures (Phase 1)

Handled by the verify-prerequisites workflow (see above).

### Context Gathering Failures (Phase 2)

**If a subagent fails:**
- Log the failure with details
- Fall back to direct orchestration for that specific task
- Continue with remaining tasks
- Note the failure in the final report under "Additional Context"

**Example fallback message:**
```
⚠️ Subagent [name] failed during context gathering
Reason: [error message]
Falling back to direct orchestration for this task.
```

### Report Assembly Failures (Phase 3)

Handled by the format-report workflow (see above).

### Issue Creation Failures (Phase 4)

Handled by the create-issue workflow (see above).

---

All subagents must also be instructed to follow these standards.
