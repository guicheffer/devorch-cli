## Step 4: Create GitHub Issue

Submit the formatted panic report as a GitHub issue in the current repository.

### Prepare Issue Metadata

**Title:** `Panic Report - [YYYY-MM-DD HH:MM:SS]`
- Use current timestamp for uniqueness
- Makes it easy to find and sort panic reports

**Label:** `panic`
- Automatically label for easy filtering
- Allows repo maintainers to set up automation

**Body:** The formatted markdown report from Step 3

### Create the Issue

Use the GitHub CLI to create the issue:

```bash
# Generate timestamp
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Create issue with body from file (handles special characters better)
echo "[report markdown]" > {{artifacts-path}}/panic/report-$$.md

gh issue create \
  --title "Panic Report - $TIMESTAMP" \
  --body-file {{artifacts-path}}/panic/report-$$.md \
  --label "panic"
```

**Alternative approach** (if body is small enough):

```bash
gh issue create \
  --title "Panic Report - $(date '+%Y-%m-%d %H:%M:%S')" \
  --body "$(cat .panic-report-[timestamp].md)" \
  --label "panic"
```

### Handle Large Reports

If the report exceeds GitHub's issue size limits (typically ~65,000 characters):

1. **Create abbreviated issue:**
   - Include only Summary, Goal, Status sections
   - Add note: "Full report saved locally"
   - Include command to view: `cat .panic-report-[timestamp].md`

2. **Instruct user to attach full report:**
   ```
   ⚠️ Report is too large for GitHub issue body

   Created issue with summary: [issue URL]
   Full report saved to: .panic-report-[timestamp].md

   To attach the full report:
   1. Visit the issue: [URL]
   2. Click "Add a comment"
   3. Drag and drop: .panic-report-[timestamp].md
   ```

### Save Local Backup

Always save a local copy, regardless of issue creation success:

```bash
# Save with timestamp
echo "[report]" > .panic-report-$(date '+%Y%m%d-%H%M%S').md
```

This ensures context is never lost, even if GitHub is unavailable.

### Capture Issue Details

After successful creation, extract:
- Issue URL
- Issue number
- Repository information

Parse from `gh issue create` output or use:

```bash
# Get the issue number from the most recent issue
ISSUE_NUM=$(gh issue list --label panic --limit 1 --json number --jq '.[0].number')

# Construct URL
REPO=$(gh repo view --json nameWithOwner --jq '.nameWithOwner')
ISSUE_URL="https://github.com/$REPO/issues/$ISSUE_NUM"
```

### Display Success Message

Show detailed results to the user:

```
✅ Panic Report Created Successfully!

Issue: [issue URL]
Issue Number: #[number]
Repository: [owner/repo]
Local Copy: .panic-report-[timestamp].md

Report Contents:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Statistics:
- Commands logged: [X]
- Errors captured: [Y]
- Files included: [Z]
- Report size: [N] characters

📁 Sections:
✅ Summary & Goal
✅ Current Status
✅ Commands & Tools
✅ Error Details
✅ Environment Info
✅ Relevant Files
✅ Next Steps

💡 What to do next:
- Share the issue URL with others for help
- Use the local backup for offline reference
- Add more details to the issue if needed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Handle Issue Creation Failure

If `gh issue create` fails:

1. **Capture the error:**
   ```bash
   if ! gh issue create [...]; then
     echo "Failed to create issue"
     # fallback
   fi
   ```

2. **Display error with fallback:**
   ```
   ❌ Error: Failed to create GitHub issue

   Error message:
   [error from gh CLI]

   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   📄 Fallback: Report saved locally

   The panic report has been saved to:
   .panic-report-[timestamp].md

   You can:
   1. Manually create an issue and paste the contents
   2. Share this file with others for help
   3. Try again later when GitHub is available

   To manually create the issue:
   gh issue create --title "Panic Report" --body-file .panic-report-[timestamp].md --label panic
   ```

3. **Ensure local file exists:**
   - Always save the local backup before attempting issue creation
   - This guarantees context is preserved
