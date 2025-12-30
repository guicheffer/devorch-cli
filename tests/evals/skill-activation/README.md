# Skill Activation Format Comparison Test

A/B test to determine which skill description format triggers auto-activation most reliably.

## Purpose

Before updating all 63 skills to a new description format, we empirically test which format works best for triggering skill activation.

## Formats Tested

| Format | Style | Example |
|--------|-------|---------|
| A | Current (simple) | `Manage Jira issues from command line` |
| B | WHAT/WHEN/KEYWORDS | `WHAT: Manage Jira issues. WHEN: reading tickets, adding comments, checking sprints. KEYWORDS: jira, ticket, issue, sprint, backlog, story.` |
| C | Simple triggers | `Jira CLI tool. Triggers: jira, ticket, issue, sprint, backlog, story, epic, kanban, scrum.` |
| D | Bracket prefix + Use when | `[CLI] Jira issue management. Use when: working with tickets, sprints, backlogs. Keywords: jira, ticket, issue, sprint, story, epic.` |
| E | Natural language with keywords | `Manage Jira issues via CLI (use for: tickets, sprints, backlogs, stories). Keywords: jira, ticket, issue, sprint, backlog, story, epic, kanban.` |

## Test Prompts (23 total)

**Easy (5)** - Explicitly mentions "Jira":
- "Read the Jira ticket SPEC-123"
- "Add a comment to Jira issue PROJ-456"
- etc.

**Medium (8)** - Ticket/issue concepts without "Jira":
- "Check the status of ticket SPEC-123"
- "What tickets are assigned to me?"
- etc.

**Hard (10)** - Very ambiguous:
- "What work items are in the current iteration?"
- "Show me the board"
- "Create a bug report for this crash"
- etc.

## Running the Test

```bash
# Run the format comparison test (takes ~10 minutes)
bun test ./tests/evals/skill-activation/format-comparison.test.ts --timeout 600000

# With verbose logging
VERBOSE_LOGS=1 bun test ./tests/evals/skill-activation/format-comparison.test.ts --timeout 600000
```

## Test Results (2024-12-16)

```
================================================================================
=== ACTIVATION RATE SUMMARY (by difficulty) ===
================================================================================

Format B: ← BEST
  Easy:    100% (5/5)
  Medium:   88% (7/8)
  Hard:     90% (9/10)
  Overall:  91% (21/23) [weighted: 5.45]

Format C:
  Easy:    100% (5/5)
  Medium:   88% (7/8)
  Hard:     90% (9/10)
  Overall:  91% (21/23) [weighted: 5.45]

Format D:
  Easy:    100% (5/5)
  Medium:   88% (7/8)
  Hard:     90% (9/10)
  Overall:  91% (21/23) [weighted: 5.45]

Format E:
  Easy:    100% (5/5)
  Medium:   88% (7/8)
  Hard:     90% (9/10)
  Overall:  91% (21/23) [weighted: 5.45]

Format A:
  Easy:    100% (5/5)
  Medium:   88% (7/8)
  Hard:     70% (7/10)          ← 20% worse on hard prompts
  Overall:  83% (19/23) [weighted: 4.85]

================================================================================
Weighted score = (easy × 1) + (medium × 2) + (hard × 3)
Higher weighted score = better at handling ambiguous prompts
================================================================================
```

## Key Findings

### 1. Keywords in description improve hard prompt activation by 20%

Format A (no keywords): **70%** on hard prompts
Formats B-E (with keywords): **90%** on hard prompts

### 2. Keyword format/structure doesn't matter

Once you include keywords, the specific structure (WHAT/WHEN/KEYWORDS vs Triggers vs natural language) has no measurable impact. All keyword-enhanced formats performed identically.

### 3. Prompts that consistently failed

Across ALL formats:
- **"List all open bugs in the project"** - "bug" is too generic, not in skill description
- **"Create a bug report for this crash"** - Same issue with "bug"

Format A only (no keywords) also failed:
- **"What's blocking this story?"** - No "story" keyword in Format A
- **"What did I work on last sprint?"** - No "sprint" keyword in Format A

### 4. The skill body content helps significantly

Even Format A performed well (83%) because the skill **body** contains keywords like "Jira", "sprint", "backlog". The description keywords provide a boost for ambiguous prompts.

## Recommendations

### Recommended Format

Since all keyword-enhanced formats perform equally, choose **Format B (WHAT/WHEN/KEYWORDS)** because:
1. Most explicit structure - easy to validate
2. Clear sections for what, when, and keywords
3. Easy to write and maintain

### Template

```yaml
description: "WHAT: [brief description]. WHEN: [trigger scenarios]. KEYWORDS: [comma-separated keywords]."
```

### Example

```yaml
description: "WHAT: Manage Jira issues via CLI. WHEN: reading tickets, adding comments, checking sprints, creating stories. KEYWORDS: jira, ticket, issue, sprint, backlog, story, epic, kanban, scrum, bug."
```

### Guidelines for Keywords

1. **Include domain-specific terms**: jira, ticket, issue, sprint
2. **Include action terms**: create, read, update, comment, move
3. **Include synonyms**: bug, defect, issue; task, work item, story
4. **Keep under 150 chars total** for readability

## Next Steps

1. ✅ A/B test complete - Format B recommended
2. Create validation script to enforce format
3. Update all 63 skills to use Format B
4. Document format in `templates/skills/SKILL-FORMAT.md`
