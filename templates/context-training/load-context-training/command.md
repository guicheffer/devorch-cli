---
schema: command-multi-agent
name: /load-context-training
argument-hint: "[max-tokens]"
description: Load all context-training files into context for the current project
mode: multi-agent
dependencies:
  subagents:
    - context-training/context-loader
    - context-training/context-summarizer
partials:
  setup: common/partials/commands/command-setup.md
  context-training-check: common/partials/commands/check-context-training.md
  instructions-footer: common/partials/commands/standard-instructions-footer.md
---

# Load Context Training Files

## Purpose

Load all context-training files into Claude's context for the current project. This is useful when you want to reference or review your project's patterns, guidelines, and conventions without having them automatically injected during implementation.

**Usage:**
- `/load-context-training` - Load all files in full
- `/load-context-training <max-tokens>` - Load summarized version within token budget (e.g., `/load-context-training 50k`)

## Instructions

This command follows a 3-phase workflow:

0. **Pre-checks** - Verify devorch version
1. **Check Configuration** - Verify context-training is configured
2. **Load Files** - Either full load OR summarized load (based on arguments)
3. **Provide Summary** - Show what was loaded

{{partials.instructions-footer}}

## Variables

Parse command arguments:

```
MAX_TOKENS: $ARGUMENTS[0]        # e.g., "50k", "100k" or empty (full load)
```

**Validation:**
- If MAX_TOKENS is empty: **Full load mode** → use `context-loader` subagent
- If MAX_TOKENS is provided: **Summarized mode** → use `context-summarizer` subagent

## Workflow

### PHASE 0: Pre-checks

{{partials.setup}}

### PHASE 1: Check Configuration

{{^context-training-name}}
{{partials.context-training-check}}
{{/context-training-name}}

{{#context-training-name}}
Inform the user:

"📦 **Loading context training:** `{{context-training-name}}`
   **Location:** `devorch/context-training/{{context-training-name}}/`"
{{/context-training-name}}

### PHASE 2: Load Context Training Files

**IMPORTANT:** Always delegate file loading to the appropriate subagent. Do NOT read files directly in this command.

#### If MAX_TOKENS is empty (Full Load Mode)

Use the `context-training/context-loader` subagent:

```markdown
Task tool parameters:
- subagent_type: "context-training/context-loader"
- description: "Load context-training files"
- prompt: |
    Load the context-training files for {{context-training-name}}.

    Context training directory: devorch/context-training/{{context-training-name}}

    Read all files in the context-training directory and return them in full with semantic framing.
```

#### If MAX_TOKENS is provided (Summarized Mode)

Parse the token budget (e.g., "50k" → 50000, "100k" → 100000).

Use the `context-training/context-summarizer` subagent:

```markdown
Task tool parameters:
- subagent_type: "context-training/context-summarizer"
- description: "Summarize context-training files"
- prompt: |
    Summarize the context-training files for {{context-training-name}}.

    Context training directory: devorch/context-training/{{context-training-name}}
    Target token budget: [parsed token value] tokens

    Read all files and return a summarized version that fits within the token budget
    while preserving the most important patterns and guidelines.
```

### PHASE 3: Provide Summary

#### If Full Load Mode (no MAX_TOKENS)

Count the tokens and provide a detailed summary:

1. **Count tokens** in the context-training directory:
   ```bash
   devorch count-tokens devorch/context-training/{{context-training-name}} 2>/dev/null || echo ""
   ```

2. **Calculate percentage** of context window:
   - Context window: ~200,000 tokens
   - Calculate: `percentage = (loaded_tokens / 200000) * 100`

3. **Display summary:**

```
✅ Context training loaded: {{context-training-name}}
**Mode:** Full load

**Files loaded:**
[If loaded:] - specification.md
[If loaded:] - implementation.md
- [count] implementer files:
  - [list each implementer filename]
- [count] verifier files:
  - [list each verifier filename]

[If any files were missing:]
**Note:** [filename] not found (optional)

**Total files:** [count]
**Tokens loaded:** [formatted token count] ([X]% of context window)

All context-training files are now loaded and available for reference.
```

#### If Summarized Mode (MAX_TOKENS provided)

Skip token counting (the summarizer already targeted the budget). Provide a brief summary:

```
✅ Context training loaded: {{context-training-name}}
**Mode:** Summarized (target: $MAX_TOKENS tokens)

Summarized content from all context-training files is now available.

For full details, run `/load-context-training` without arguments.
```

## Report

After successfully loading:

```
✅ **Context training loaded successfully**

**Summary:**
- Context training: {{context-training-name}}
[If full load:] - Mode: Full load
[If full load:] - Implementers: [count]
[If full load:] - Verifiers: [count]
[If full load:] - Tokens: [count] ([X]% of context)
[If summarized:] - Mode: Summarized (target: $MAX_TOKENS)

**Next steps:**
[If full load:]
- All files are available in this conversation
- Reference specific implementers or verifiers as needed
[If summarized:]
- Summarized content is available for quick reference
- Run `/load-context-training` for full details
```

If the operation failed or was incomplete:

```
⚠️ **Context training partially loaded**

**Loaded:**
- [list what was successfully loaded]

**Missing:**
- [list what couldn't be loaded]

**Recommendation:** Review the context-training setup or run `/train-context` to regenerate.
```

**Error scenarios:**

If context-training directory doesn't exist:
```
❌ Context training directory not found: devorch/context-training/{{context-training-name}}/

Please run `/train-context` to generate context training first.
```

If no implementer files exist (fatal):
```
❌ No implementer files found in context-training

The context-training directory exists but has no implementer files. Run `/train-context` to regenerate.
```
