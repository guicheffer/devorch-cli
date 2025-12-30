---
schema: command-multi-agent
name: /create-tasks
description: Create task breakdown with pre-discovered context for efficient implementation
mode: multi-agent
dependencies:
  subagents:
    - implementation/domain-mapper
    - implementation/tasks-list-creator
    - implementation/tasks-verifier
partials:
  setup: common/partials/commands/command-setup.md
  context-training-check: common/partials/commands/check-context-training.md
  select-spec: common/partials/commands/select-spec.md
  instructions-footer: common/partials/commands/standard-instructions-footer.md
---

# Create Tasks

## Purpose

Create a detailed task breakdown for the specification with implementer assignments based on available domains from context-training.

## Instructions

This process follows 5 sequential phases:

0. **Pre-checks** - Verify devorch version and required subagents
1. **Select Spec** - Choose active spec with stale detection
2. **Map Roles** - Discover implementers and verifiers from context-training
3. **Create Tasks** - Break down spec into actionable tasks with assignments
4. **Verify Tasks** - Validate task breakdown for accuracy and completeness

{{partials.instructions-footer}}

{{^context-training-name}}
{{partials.context-training-check}}
{{/context-training-name}}

## Workflow

### PHASE 0: Pre-checks

{{partials.setup}}

### PHASE 1: Select Spec

{{partials.select-spec}}

### PHASE 2: Map Domains

Inform the user: **"Discovering implementers and verifiers from context-training folder: `{{context-training-name}}`"**

Use the `implementation/domain-mapper` subagent to discover and map available implementer and verifier domains.

The domain-mapper will:
- Discover all implementer domains from `devorch/context-training/{{context-training-name}}/implementers/`
- Discover all verifier domains from `devorch/context-training/{{context-training-name}}/verifiers/`
- Extract `domain` and `description` from frontmatter
- Generate mapping files in `{{artifacts-path}}/{{context-training-name}}/`:
  - `implementer-domains.yml`
  - `verifier-domains.yml`

These mappings will be used to assign tasks to appropriate implementer domains.

### PHASE 3: Create Task Breakdown

Use the **tasks-list-creator** subagent to break down the spec into actionable tasks with pre-discovered context.

Provide the tasks-list-creator with:

- The spec folder path (from Phase 1)
- The `[spec-folder-path]/spec.md` file
- The original requirements from `[spec-folder-path]/planning/requirements.md`
- Any visual assets in `[spec-folder-path]/planning/visuals/`
- The domain mappings from:
  - `{{artifacts-path}}/{{context-training-name}}/implementer-domains.yml`
  - `{{artifacts-path}}/{{context-training-name}}/verifier-domains.yml`

The tasks-list-creator will:

1. **Break down the spec** into logical tasks with subtasks
2. **Assign implementers** to each task based on their `domain` and `description`
3. **Assign verification methods** to each task based on available verifier domains
4. **Create `tasks.md`** - A detailed task breakdown with:
   - Organized tasks
   - Subtasks with acceptance criteria
   - Implementer assignments
   - Verification method assignments
   - Dependencies noted

### PHASE 4: Verify Task Breakdown

Use the **tasks-verifier** subagent to verify the task breakdown for accuracy and completeness.

**Pass to tasks-verifier in your prompt:**

```
Verify the task breakdown for accuracy and completeness.

**Spec folder path:** [spec-folder-path]

Example path: devorch/specs/2025-11-18-user-auth

The tasks.md file has been created with [X] major tasks and [Y] subtasks. Please verify:
- All spec requirements have corresponding tasks
- Tasks are specific and actionable
- Implementer assignments are appropriate based on domain expertise
- Visual elements are referenced (if visuals exist)
- TDD principles are followed (tests written first)
- Dependencies are properly identified
- Acceptance criteria are clear and measurable

**Available domain mappings:**
- Implementers: {{artifacts-path}}/{{context-training-name}}/implementer-domains.yml
- Verifiers: {{artifacts-path}}/{{context-training-name}}/verifier-domains.yml

Use these mappings to validate that assigned implementer and verifier domains actually exist.

Create a verification report at `[spec-folder-path]/verification/tasks-verification.md`
```

The tasks-verifier will:
1. Verify task completeness against spec
2. Check task quality and structure
3. Validate implementer/verifier assignments
4. Check visual alignment (if visuals exist)
5. Verify TDD compliance
6. Create verification report in `verification/tasks-verification.md`

## Report

**Note:** The tasks-verifier subagent will produce its own formatted output following one of three scenarios (passed, passed with recommendations, or issues fixed). You should let that output show through to the user as-is.

After the tasks-verifier completes, you may optionally add a brief summary of domain mappings discovered:

"**Domain Mappings Discovered:**
- {{A}} implementer domains available
- {{B}} verifier domains available

**Artifacts created:**
```
devorch/specs/[date-spec-name]/
├── planning/
│   ├── initialization.md
│   ├── requirements.md
│   └── visuals/
├── verification/
│   ├── spec-verification.md
│   └── tasks-verification.md  # NEW: Task verification
├── spec.md
└── tasks.md                   # NEW: Task breakdown

{{artifacts-path}}/{{context-training-name}}/
├── implementer-domains.yml  # NEW: Domain mappings
└── verifier-domains.yml     # NEW: Domain mappings
```"
