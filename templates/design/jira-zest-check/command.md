---
schema: command-multi-agent
name: /jira-zest-check
argument-hint: "[ticket-key]"
description: Check Figma design implementability for Zest and post results to a Jira ticket
mode: multi-agent
dependencies:
  commands:
    - /zest-check
  skills:
    - cli-tools/jira-cli
partials:
  setup: common/partials/commands/command-setup.md
  instructions-footer: common/partials/commands/standard-instructions-footer.md
---

# Jira Zest Check

## Purpose

Check Figma design files for Zest design system implementability and post the complete review to a Jira ticket. This command is a wrapper around `/zest-check` that posts results to Jira.

The posted comment includes:
- Implementability scores for both web and React Native
- Platform discrepancies
- Missing tokens and components
- Accessibility findings
- Recommendations for designers

## Instructions

1. Check prerequisites (jira CLI)
2. Get ticket key from argument or user
3. Run `/zest-check` command
4. Post results to Jira ticket

{{partials.instructions-footer}}

## Variables

TICKET_KEY: $ARGUMENTS[0]   # Optional: Jira ticket key from command argument

## Workflow

### PHASE 0: Pre-checks

{{partials.setup}}

**Check for jira CLI:**

```bash
command -v jira >/dev/null 2>&1 || echo "ERROR: jira CLI not found"
```

If jira CLI not found, display error and STOP:
```
jira CLI is required for this command

**Installation:**
- macOS: `brew install jira`
- Other: https://github.com/ankitpokhrel/jira-cli#installation

**After installation:**
1. Run: `jira init` to configure Jira connection
2. Export API token: `export JIRA_API_TOKEN=your_token`
3. Re-run `/jira-zest-check`
```

### PHASE 1: Get Ticket Key [INTERACTIVE]

**If TICKET_KEY provided as argument:**
- Use the provided ticket key
- Example: `/jira-zest-check PROJ-123`

**If no TICKET_KEY provided:**

Ask the user: "Which Jira ticket would you like to post the Zest check results to? Provide the ticket key (e.g., PROJ-123)"

Wait for user response and extract the ticket key.

**Validate ticket key format:**
```bash
TICKET_KEY="[user-provided-key]"

if ! echo "$TICKET_KEY" | grep -qE '^[A-Z]+-[0-9]+$'; then
    echo "Invalid ticket key format: $TICKET_KEY"
    echo "Expected format: PROJECT-123"
    exit 1
fi
```

### PHASE 2: Run Zest Check

Run the `/zest-check` command (analyzes both platforms):

```
SlashCommand("/zest-check")
```

The `/zest-check` command will:
1. Check Figma MCP prerequisites
2. Collect Figma frame URL from user
3. Run both web and RN platform analysis in parallel
4. Output combined implementability report

**Wait for `/zest-check` to complete.**

**IMPORTANT:** Capture the entire report output from `/zest-check`. You will post this complete report to Jira in the next phase.

### PHASE 3: Post Results to Jira

After the check is complete, post the full report to the Jira ticket.

**Create and post the Jira comment:**

```bash
# Create temp file for the comment
COMMENT_FILE=$(mktemp)

# Write header
cat > "$COMMENT_FILE" <<'EOF'
## Zest Implementability Check

EOF

# Append the complete report from /zest-check
# This includes scores for both platforms, discrepancies, component mapping, accessibility, recommendations
cat >> "$COMMENT_FILE" <<'EOF'
[PASTE THE COMPLETE REPORT OUTPUT FROM /zest-check HERE]
EOF

# Add footer with instructions
cat >> "$COMMENT_FILE" <<'EOF'

---

*Posted by devorch*

**For designers:** Review the recommendations above to improve implementability
**For developers:** Use the component mapping as a reference during implementation
EOF

# Post to Jira
jira issue comment add "$TICKET_KEY" < "$COMMENT_FILE"
RESULT=$?

# Clean up temp file
rm "$COMMENT_FILE"
```

**Verify post success:**

```bash
if [ $RESULT -eq 0 ]; then
    echo "Posted Zest check to $TICKET_KEY"
    echo "   View at: https://yourcompany.atlassian.net/browse/$TICKET_KEY"
else
    echo "Failed to post to $TICKET_KEY"
    echo "   Error code: $RESULT"
    echo ""
    echo "The check was completed successfully."
    echo "You can manually copy the report above and paste it into the Jira ticket."
fi
```

## Report

After all phases complete, inform the user:

```
Zest check completed and posted to Jira

**Ticket:** $TICKET_KEY
**View at:** https://yourcompany.atlassian.net/browse/$TICKET_KEY

The Jira comment includes:
- Implementability scores (web and React Native)
- Platform discrepancies
- Missing tokens and components
- Accessibility findings
- Recommendations for designers

**Next steps:**
1. Review the feedback in the Jira ticket
2. Address recommendations to improve the scores
```

## Critical Rules

**DO:**
- Check both Figma MCP and jira CLI prerequisites at start
- Run `/zest-check` (covers both platforms automatically)
- Capture the COMPLETE report output from `/zest-check`
- Post the full report content to Jira (not just a summary)
- Use temp file to post: `jira issue comment add KEY < file`
- Provide Jira URL in the final report

**DON'T:**
- Skip jira CLI prerequisites check
- Re-implement check logic (use `/zest-check` command)
- Post only partial report or summary (post complete output!)
- Use heredoc with command substitution for large content
- Continue if `/zest-check` fails
- Assume jira CLI is configured (always check)

## Example Flow

```
User: /jira-zest-check DESIGN-456

Phase 0: Pre-checks passed (Figma MCP + jira CLI)
Phase 1: Got ticket key: DESIGN-456
Phase 2: Running /zest-check...
  - Collected Figma frame URL
  - Running web analysis...
  - Running RN analysis...
  - Web score: 8/10
  - RN score: 7/10
  Check complete
Phase 3: Posted complete report to DESIGN-456
  - View at: https://yourcompany.atlassian.net/browse/DESIGN-456

Zest check completed and posted to Jira

Next steps:
1. Review the feedback in Jira
2. Address recommendations to improve scores
```
