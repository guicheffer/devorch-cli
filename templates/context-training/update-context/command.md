---
schema: command-multi-agent
name: /update-context
description: Update existing context training with new PRs or migrate to new metadata format
mode: multi-agent
dependencies:
  subagents:
    - context-training/context-migrator
    - context-training/pr-fetcher
    - context-training/pr-pattern-analyzer
    - context-training/pattern-reviewer
    - context-training/artifact-generator
partials:
  setup: common/partials/commands/command-setup.md
  context-training-check: common/partials/commands/check-context-training.md
  standard-instructions-footer: common/partials/commands/standard-instructions-footer.md
  fetch-prs: context-training/partials/fetch-prs.md
---

# Purpose

Update existing context-training with format migration and optional PR ingestion.

## Instructions

This process follows 6 sequential phases:

0. **Pre-checks** - Verify devorch version and required subagents
1. **Load Context Training** - Get context-training name from config
2. **Migrate Format** - Update all files to match current schemas (always runs)
3. **Ask About PR Ingestion** - User chooses whether to ingest new PRs
4. **Ingest New PRs** - Analyze PRs and add patterns (if selected)
5. **Report** - Summarize results

{{partials.standard-instructions-footer}}

## Error Handling Strategy

**If any subagent fails:**
1. Report the error clearly to the user
2. Offer options:
   - Retry the failed step
   - Skip this step and continue
   - Abort the entire operation
3. Log the error for debugging
4. Don't leave the context-training in an inconsistent state

**Common failure scenarios:**
- **Migrator fails:** Some files may be partially migrated - report which succeeded/failed
- **PR fetcher fails:** GitHub API issues or auth problems - offer to skip PR ingestion
- **Pattern analyzer fails:** Can't parse PRs - offer to retry with different PRs
- **Pattern reviewer fails:** User cancellation - save progress and exit gracefully
- **Artifact generator fails:** Disk write errors - rollback or report incomplete files

## Workflow

### PHASE 0: Pre-checks

{{partials.setup}}

### PHASE 1: Load Context Training from Config

{{^context-training-name}}
{{partials.context-training-check}}
{{/context-training-name}}

{{#context-training-name}}
Inform the user:

"📦 **Updating context training:** {{context-training-name}}
   **Location:** devorch/context-training/{{context-training-name}}/"
{{/context-training-name}}

### PHASE 2: Migrate Format (Always Runs)

**This step always runs automatically to ensure files are in the correct format.**

Inform the user:

"🔄 **Migrating {{context-training-name}} to latest format...** This may take a moment. ⏳"

**Now use the context-migrator subagent** to migrate all files to the current schema format.

**Pass to context-migrator in your prompt:**

```
Context training path: devorch/context-training/{{context-training-name}}

Please migrate all files to match the current schema format.

The migrator will automatically:
1. Read current schemas using: devorch agent get-context-training-schema
2. Migrate implementer files (implementers/*.md) to match implementer schema
3. Migrate verifier files (verifiers/*.md) to match verifier schema
4. Preserve all pattern content and examples

Return in your final response:
- Total count of implementer files migrated
- Total count of verifier files migrated
- Complete list of all files you updated (with paths)
- Any issues encountered or warnings
```

The migrator will update all frontmatter to match current schemas and report what was changed.

**After the migrator completes, check if it reported any failures or errors. If so, ask the user:**

Use AskUserQuestion with:
- question: "Migration encountered issues with some files. How would you like to proceed?"
- header: "Migration Issues"
- multiSelect: false
- options:
  1. label: "Continue anyway", description: "Proceed with PR ingestion (you can fix migration issues manually)"
  2. label: "Retry failed files", description: "Re-run migrator on files that failed"
  3. label: "Abort", description: "Stop and review errors"

Based on user selection, either continue to Step 3, retry migration, or exit gracefully.

### PHASE 3: Ask About PR Ingestion

Ask the user if they want to ingest new PRs using AskUserQuestion:

Use the AskUserQuestion tool with:
- **question**: "Would you like to ingest new PRs to add fresh patterns?"
- **header**: "Ingest PRs?"
- **multiSelect**: false
- **options**:
  1. **label**: "Yes", **description**: "Analyze recent PRs and add new patterns to context training"
  2. **label**: "No", **description**: "Skip PR ingestion and finish"

**CRITICAL: STOP HERE and wait for the user's response.**

**Parse user selection:**
- If "Yes" selected: Set `INGEST_PRS = true` and continue to Step 4
- If "No" selected: Set `INGEST_PRS = false` and skip to Step 5

### PHASE 4: Ingest New PRs (if selected)

**IF `INGEST_PRS = false`:** Skip to Step 5

**IF `INGEST_PRS = true`:**

#### Step 4a: Fetch New PRs

{{partials.fetch-prs}}

**Save the artifact:**
```bash
mkdir -p {{artifacts-path}}/commands/update-context
echo "$PR_JSON" > {{artifacts-path}}/commands/update-context/fetched-prs.json
```

#### Step 4b: Analyze New PRs

Invoke the `context-training/pr-pattern-analyzer` subagent:

```
Analyze these PRs for patterns:
{List of PR numbers from Step 4a}

Focus on discovering:
- New implementation patterns not in existing context training
- Changes to existing patterns
- New verification/testing approaches
- Updated conventions or best practices

Return patterns organized by domain.
```

The analyzer will:
- Analyze PR diffs and code changes
- Identify new patterns or pattern changes
- Organize by domain (matching existing domains when possible)
- Flag potential new domains

**If analyzer fails (can't parse PRs, rate limits, etc.):**
```
❌ Pattern analysis failed: {error message}

PRs that failed to analyze:
- {List of PR numbers that failed}

What would you like to do?
1. Retry analysis with all PRs
2. Skip failed PRs and continue with successful ones
3. Try analyzing fewer PRs at a time
4. Abort PR ingestion

Your choice:
```

**CRITICAL: STOP HERE and wait for user's response if analysis failed.**

**If no patterns discovered:**
```
ℹ️ No new patterns discovered in the analyzed PRs.

The PRs may contain:
- Only bug fixes with no new patterns
- Changes to files outside the context-training scope
- Refactoring that doesn't introduce new patterns

What would you like to do?
1. Try analyzing different PRs
2. Complete without adding patterns
3. Abort

Your choice:
```

**CRITICAL: STOP HERE and wait for user's response.**

#### Step 4c: Review New Patterns

Invoke the `context-training/pattern-reviewer` subagent:

```
Context training: {{context-training-name}}
Existing patterns: devorch/context-training/{{context-training-name}}/

New patterns discovered:
{Patterns from Step 4b}

Please review these new patterns with the user:
1. Show patterns domain by domain
2. For existing domains: ask if patterns should be added or replace existing
3. For new domains: follow standard domain review process (Steps 3a-3e)
4. Collect user feedback and priorities

Return validated patterns ready for integration.
```

The reviewer will:
- Present new patterns alongside existing ones for comparison
- Ask user whether to add, replace, or skip patterns
- Collect verification method updates if new domains
- Return validated pattern set

#### Step 4d: Integrate New Patterns

Invoke the `context-training/artifact-generator` subagent:

```
Context training: {{context-training-name}}
Existing files: devorch/context-training/{{context-training-name}}/

Validated new patterns:
{Patterns from Step 4c}

Please integrate the new patterns:

1. **For existing domains:**
   - Append new patterns to existing implementer files
   - Maintain existing pattern structure
   - Add note: "Added: {date} from PRs {PR numbers}"

2. **For new domains:**
   - Create new implementer files following standard template
   - Create new verifier files if specified

3. **Update specification.md and implementation.md:**
   - If new patterns affect general guidance, update those files
   - Maintain consistency with domain-specific files

Return list of files created/updated.
```

**Extract actual results from artifact-generator's response:**
- Count of files created vs updated
- Specific file paths
- Pattern counts (new vs updated)
- PR numbers that were analyzed

**Display results to user:**
```
✅ New patterns integrated!

Updated:
- [actual count] existing implementer files
- [actual count] new implementer files created
- [actual count] verifier files updated/created
[Only include if actually updated:]
- specification.md
- implementation.md

Summary:
- [actual count] new patterns added
- [actual count] patterns updated
- From [actual count] PRs analyzed: #[PR numbers]
```

### PHASE 5: Report

After all operations complete, summarize the results to the user.

Report the migration results (count of files updated) that the context-migrator returned.

If PR ingestion was run, also report:
- Number of new patterns added
- Number of PRs analyzed
- Which domains were updated

Include next steps for the user.