---
schema: command-multi-agent
name: /update-spec
description: Update an existing specification based on changed requirements
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

# Update Specification

## Purpose

Update an existing specification document based on changed requirements from the user. This command updates requirements.md in-place (tracking each change with a todo list), then uses spec-writer to regenerate the specification.

## Instructions

This process follows 6 sequential phases:

0. **Pre-checks** - Verify devorch version and required subagents
1. **Select Spec** - Choose the spec to update with stale detection
2. **Gather Changes** - Collect updated requirements and new inputs from user
3. **Confirm Changes** - Validate and confirm changes with user
4. **Update Requirements** - Update requirements.md in-place (no history append)
5. **Regenerate Spec** - Use spec-writer to update the specification
6. **Re-verify** - Validate the updated specification

{{partials.instructions-footer}}

{{^context-training-name}}
{{partials.context-training-check}}
{{/context-training-name}}

## Workflow

### PHASE 0: Pre-checks

{{partials.setup}}

### PHASE 1: Select Spec

{{partials.select-spec}}

**Validate spec has been created:**

Check that the spec exists and has the required files:

```bash
if [ ! -f "[spec-folder-path]/spec.md" ]; then
  echo "ERROR: No spec.md found. Run /create-spec first."
  exit 1
fi

if [ ! -f "[spec-folder-path]/planning/requirements.md" ]; then
  echo "ERROR: No requirements.md found. Run /gather-requirements and /create-spec first."
  exit 1
fi
```

If either file is missing, inform the user:

"⚠️ Cannot update spec - required files missing.

Please ensure you have run `/gather-requirements` and `/create-spec` before attempting to update.

Missing: [list missing files]"

**Then STOP.**

**Check if tasks have been created:**

Check if implementation has started:

```bash
if [ -f "[spec-folder-path]/tasks.md" ]; then
  echo "ERROR: tasks.md exists - cannot update spec"
  exit 1
fi
```

If tasks.md exists, inform the user and STOP:

"⚠️ **Cannot update spec** - `tasks.md` exists.

`/update-spec` is intended for **pre-implementation iteration** - updating requirements and spec BEFORE tasks are created.

This spec has tasks created, which means implementation planning has started. Updating the spec now would invalidate the existing task breakdown.

**Your options:**

1. **Delete tasks and update**:
   ```bash
   rm [spec-folder-path]/tasks.md
   ```
   Then run `/update-spec` again, followed by `/create-tasks` to regenerate

2. **Edit spec manually** (for small changes):
   Edit `[spec-folder-path]/spec.md` directly

3. **Continue with current spec**:
   Proceed with implementation using existing tasks

**Recommendation**: Only delete tasks.md if you haven't started implementing yet, or if you're willing to regenerate the task breakdown."

**Then STOP.**

### PHASE 2: Gather Changes from User

**Display current spec summary:**

Read `[spec-folder-path]/spec.md` and extract:
- Goal section
- Core Requirements (functional and non-functional)
- Out of Scope items
- Visual Design references (if any)

Present to user:

"📋 **Current Specification Summary for `[spec-name]`:**

**Goal:** [Goal from spec]

**Current Functional Requirements:**
- [List functional requirements]

**Current Non-Functional Requirements:**
- [List non-functional requirements]

**Current Out of Scope:**
- [List out of scope items]

**Visual Assets:** [X files in planning/visuals/ or 'None']

---

**What would you like to update?**

Please describe your changes. You can:
- **Add** new requirements
- **Modify** existing requirements
- **Remove** requirements (move to out of scope)
- **Clarify** existing requirements with more detail
- **Add new visuals** - place them in `[spec-folder-path]/planning/visuals/`

Be specific about what should change. Everything not mentioned will be preserved as-is."

**STOP and wait for user response.**

### PHASE 3: Validate and Confirm Changes

After user provides their change request:

**Check for new visual assets:**

```bash
ls -la [spec-folder-path]/planning/visuals/ 2>/dev/null | grep -E '\.(png|jpg|jpeg|gif|svg)$' | wc -l
```

Note the count for later.

**Parse the change request and identify:**
- What is being added
- What is being modified
- What is being removed
- What needs clarification

**Present change summary for confirmation:**

"📝 **Proposed Changes:**

**Will be ADDED:**
- [List items to add]

**Will be MODIFIED:**
- [List items to modify with brief description]

**Will be REMOVED (moved to Out of Scope):**
- [List items to remove]

**Will be CLARIFIED:**
- [List items getting more detail]

**New Visual Assets:** [X new files detected / No new files]

**Will be PRESERVED (unchanged):**
- [List major sections not being changed]

---

Does this correctly capture your intended changes?"

Use AskUserQuestion tool:

```
Question: "Is this change summary correct?"

Header: "Confirm"

Options:
1. "Yes, proceed with updates"
   Description: Apply these changes to the specification

2. "No, let me clarify"
   Description: I'll provide more details about what to change

3. "Cancel"
   Description: Abort the update
```

**Handle response:**
- **Option 1**: Proceed to PHASE 4
- **Option 2**: Return to gathering changes with user's clarification
- **Option 3**: Stop execution

### PHASE 4: Update Requirements Document

**Before making changes, inform the user:**

"🔄 **Updating requirements...** Applying your changes one by one. ⏳"

**Step 4.1: Create a change tracking todo list**

Use the TodoWrite tool to create a todo list of ALL changes to apply:

```
Example todo list:
1. [pending] ADD: Two-factor authentication requirement to Functional Requirements
2. [pending] MODIFY: Update password policy from 8 to 12 characters minimum
3. [pending] REMOVE: Social login feature (move to Out of Scope)
4. [pending] CLARIFY: Add details to session timeout requirement
5. [pending] ADD: New wireframe reference for 2FA flow
```

**Step 4.2: Apply changes to requirements.md ONE BY ONE**

Read `[spec-folder-path]/planning/requirements.md` and apply each change sequentially:

**For each change in the todo list:**

1. Mark the todo as `in_progress`
2. Apply the change:
   - **ADD**: Insert new requirement into the appropriate section
   - **MODIFY**: Find and update the existing requirement text in-place using Edit tool
   - **REMOVE**: Remove from current section, add to "Out of Scope" with note "(Removed: [date])"
   - **CLARIFY**: Expand the existing requirement text in-place
   - **Visual**: Update "Visual References" section with new file references
3. Mark the todo as `completed`
4. Move to next change

**Step 4.3: Verify all changes applied**

After completing all todos, read requirements.md again and verify:
- All ADD items are present in correct sections
- All MODIFY items show updated text
- All REMOVE items are in Out of Scope
- All CLARIFY items have expanded details

**CRITICAL:**
- Apply changes ONE AT A TIME - do not batch
- Mark each todo as completed immediately after applying
- Do NOT append an "Update History" section
- The requirements.md should always reflect the CURRENT state, not a history of changes

### PHASE 5: Regenerate Specification

**Inform the user:**

"📝 **Regenerating specification...** Using spec-writer to update spec.md from the updated requirements. ⏳"

Use the **spec-writer** subagent to regenerate the specification document from the updated requirements.

**Pass to spec-writer in your prompt:**

```
Update the specification document based on the updated requirements.

Spec folder path: [spec-folder-path]

Example path: devorch/specs/2025-11-18-user-auth

Read the requirements document at [spec-folder-path]/planning/requirements.md - it has been UPDATED IN-PLACE with the latest requirements (no update history section).

IMPORTANT: This is an UPDATE to an existing spec, not a new spec.
- Read the existing spec.md first to understand current structure
- The requirements.md now contains the CURRENT state of requirements
- Update spec.md to match the updated requirements
- Preserve formatting and structure where possible
- Do NOT modify spec_name or created date in frontmatter

The following changes were made to requirements:
- ADD: [List items added]
- MODIFY: [List items modified]
- REMOVE: [List items removed - now in Out of Scope in requirements.md]
- CLARIFY: [List items clarified]

Update spec.md in the spec folder to match the updated requirements.
```

The spec-writer will:
1. Read existing spec.md and the updated requirements.md
2. Update spec.md to reflect the new requirements
3. Preserve unchanged sections where possible
4. Ensure spec matches the current state of requirements

### PHASE 6: Re-verify Specification

Use the **spec-verifier** subagent to verify the updated specification.

**IMPORTANT:** The verification should be regenerated fresh, not appended to. The `spec-verification.md` should always reflect the CURRENT state of the spec.

**Pass to spec-verifier in your prompt:**

```
Spec folder path: [spec-folder-path]

Example path: devorch/specs/2025-11-18-user-auth

IMPORTANT: Generate a FRESH verification for the current state of the spec.
- Delete or overwrite the existing spec-verification.md
- Verify the spec as it exists NOW (after updates)
- Do NOT append to or reference previous verification results

Verify the updated specification for:
1. Completeness - All requirements from requirements.md are covered
2. Consistency - No contradictions between sections
3. Clarity - Requirements are specific and testable
4. Alignment - Spec matches the current requirements.md

Generate a new spec-verification.md that reflects the current state.
```

The spec-verifier will:
1. Verify the spec against the updated requirements
2. Generate a FRESH `verification/spec-verification.md`
3. Report any issues or recommendations

## Report

After all steps complete, read the verification file:
- `[spec-folder-path]/verification/spec-verification.md`

Extract:
- Changes successfully applied
- Sections preserved unchanged
- Any issues found during verification

Then inform the user with this structure:

**If update completed successfully with no issues:**

"⏺ Specification updated successfully!

  ✅ Requirements updated: `[spec-folder-path]/planning/requirements.md`
  ✅ Specification updated: `[spec-folder-path]/spec.md`
  ✅ Verification: Passed

  **Changes Applied:**
  - [List key changes made]

  **Preserved (Unchanged):**
  - [List major sections not modified]

  👉 **Next step**: Run `/create-tasks` to generate task breakdown"

**If update completed with minor recommendations:**

"⏺ Specification updated successfully!

  ✅ Requirements updated
  ✅ Specification updated
  ⚠️ Verification: Passed with [N] recommendations

  **Changes Applied:**
  - [List key changes made]

  **Recommendations:**
  - [List recommendations from verification]

  💡 **Options:**
  - Address recommendations now
  - Proceed to `/create-tasks`
  - Review full verification at `[spec-folder-path]/verification/spec-verification.md`"

**If verification found issues:**

"⚠️ Specification updated with issues detected!

  ✅ Changes applied
  ⚠️ Verification found issues that need attention

  **Issues:**
  - [List issues]

  Please review and address these issues before proceeding."

**Artifacts created/updated:**
```
devorch/specs/[date-spec-name]/
├── planning/
│   ├── requirements.md          # Updated in-place with new requirements
│   └── visuals/                 # May have new files
├── verification/
│   └── spec-verification.md     # Re-verification results
└── spec.md                      # Updated specification
```