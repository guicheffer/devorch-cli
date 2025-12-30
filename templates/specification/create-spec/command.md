---
schema: command-multi-agent
name: /create-spec
description: Create specification document using subagents
mode: multi-agent
dependencies:
  subagents:
    - specification/spec-writer
    - specification/spec-verifier
partials:
  setup: common/partials/commands/command-setup.md
  context-training-check: common/partials/commands/check-context-training.md
  select-spec: common/partials/commands/select-spec.md
  instructions-footer: common/partials/commands/standard-instructions-footer.md
---

# Create Specification

## Purpose

Create a comprehensive specification document from gathered requirements and verify the spec for accuracy.

## Instructions

This process follows 4 sequential phases:

0. **Pre-checks** - Verify devorch version and required subagents
1. **Select Spec** - Choose active spec with stale detection
2. **Write Spec** - Generate detailed specification document
3. **Verify Spec** - Validate specification accuracy

{{partials.instructions-footer}}

{{^context-training-name}}
{{partials.context-training-check}}
{{/context-training-name}}

## Workflow

### PHASE 0: Pre-checks

{{partials.setup}}

### PHASE 1: Select Spec

{{partials.select-spec}}

### PHASE 2: Write Specification

**Before calling the subagent, inform the user:**

"📝 **Creating specification document...** This may take a few minutes as I explore the codebase for reusable patterns. ⏳"

Now use the **spec-writer** subagent to create the specification document for this spec.

**Pass to spec-writer in your prompt:**

```
Create a comprehensive specification document.

Spec folder path: [spec-folder-path]

Example path: devorch/specs/2025-11-18-user-auth

Read the requirements document at [spec-folder-path]/planning/requirements.md - it contains all the research findings, user answers, and context you need.

Create spec.md in the spec folder.
```

The spec-writer will:
1. Read requirements.md (contains all planning context)
2. Analyze requirements and constraints
3. Create `spec.md` inside the spec folder

### PHASE 3: Verify Specification

Use the **spec-verifier** subagent to verify accuracy.

**Pass to spec-verifier in your prompt:**

```
Spec folder path: [spec-folder-path]

Example path: devorch/specs/2025-11-18-user-auth

Questions asked to user during requirements gathering:
[List all questions from earlier in this conversation]

User's raw responses:
[List all user answers from earlier in this conversation]

Please verify the specification for accuracy and alignment with requirements.
```

The spec-verifier will:
1. Verify requirements accuracy
2. Check structural integrity
3. Validate visual alignment (if visuals exist)
4. Create verification report in `planning/spec-verification.md`

## Report

After all steps complete, read the verification report at `[spec-folder-path]/verification/spec-verification.md` and extract:
- Whether verification passed
- Critical issues (if any - these should have been auto-fixed)
- Minor issues count and list
- Recommendations

Then inform the user with this structure:

**If verification passed with NO minor issues:**

"⏺ Specification created successfully!

  ✅ Specification document: `[spec-folder-path]/spec.md`
  ✅ Verification: Passed

  👉 **Next step**: Run `/create-tasks` to break down the spec into actionable tasks"

**If verification passed WITH minor issues/recommendations:**

"⏺ Specification created successfully!

  ✅ Specification document: `[spec-folder-path]/spec.md`
  ✅ Verification: Passed with [N] minor recommendations

  Verification Results:
  [List key positive findings from the verification report, e.g.:]
  - ✅ Requirements accuracy verified
  - ✅ Structural integrity confirmed
  - ✅ Excellent reuse of existing patterns

  **📋 Minor Recommendations** (Before proceeding, consider addressing these):
  [List each minor issue/recommendation from the report as a numbered item]

  💡 **Options:**
  - Address these recommendations now (I can apply them one by one)
  - Proceed to `/create-tasks` and handle during implementation
  - Review the full verification report at `[spec-folder-path]/verification/spec-verification.md`

  👉 **Next step**: Run `/create-tasks` when ready"

**If verification found critical issues (should be rare as they're auto-fixed):**

"⚠️ Specification created with issues addressed!

  ✅ Specification document: `[spec-folder-path]/spec.md`
  ⚠️ Verification: [N] critical issues found and fixed

  Issues Fixed:
  [List what was fixed]

  👉 **Next step**: Review the spec and run `/create-tasks` when satisfied"

**Artifacts created:**
```
devorch/specs/[date-spec-name]/
├── planning/
│   ├── initialization.md
│   ├── requirements.md
│   └── visuals/
├── verification/
│   └── spec-verification.md
└── spec.md
```
