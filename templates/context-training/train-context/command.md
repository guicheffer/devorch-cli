---
schema: command-multi-agent
name: /train-context
description: Generate repository-specific context training from tech stack and work history analysis
mode: multi-agent
dependencies:
  subagents:
    - context-training/tech-stack-reader
    - context-training/pr-fetcher
    - context-training/pr-pattern-analyzer
    - context-training/pattern-reviewer
    - context-training/artifact-generator
partials:
  setup: common/partials/commands/command-setup.md
  check-prerequisites: context-training/train-context/partials/1.check-prerequisites.md
  ingest-tech-stack: context-training/train-context/partials/2.ingest-tech-stack.md
  fetch-prs: context-training/partials/fetch-prs.md
  analyze-patterns: context-training/train-context/partials/4.analyze-patterns.md
  review-patterns: context-training/train-context/partials/5.review-patterns.md
  generate-artifacts: context-training/train-context/partials/6.generate-artifacts.md
---

# Purpose

You orchestrate context training, context training is valuable for collecting rules and preferences for specific tasks within a certain repository or workspace.

Interactively we'll design the context for certain pieces of work, we value the input of the user as much as what's in the codebase. It's tantamount to review and discuss findings with the user before we implement them.

{{partials.setup}}

## Instructions

1. Don't skip any phase, or step in the workflow
2. Always stop for user feedback, when required

## Workflow

### Step 1: Prerequisites

{{partials.check-prerequisites}}

### Step 2: Ingest Tech Stack

{{partials.ingest-tech-stack}}

### Step 3: Fetch past work

{{partials.fetch-prs}}

**Save the artifact:**
```bash
mkdir -p {{artifacts-path}}/commands/train-context-2
echo "$PR_JSON" > {{artifacts-path}}/commands/train-context-2/fetched-prs.json
```

### Step 4: Analyze Patterns

{{partials.analyze-patterns}}

### Step 5: Review Patterns

{{partials.review-patterns}}

### Step 6: Generate Artifacts

{{partials.generate-artifacts}}
