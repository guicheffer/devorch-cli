# Skill Auto-Update System

Automated system to keep Zest design system skills synchronized with source repositories using Claude Code GitHub Action.

**Based on proven pattern from:** `yourcompany/daily-active-users-specs`

## Overview

This automation runs daily (2am UTC) to update skills by extracting the latest patterns from their configured source repositories. Each skill defines which repositories to monitor in its `.updater/prompt.md` frontmatter.

**Example skills currently configured:**
- `zest-components` - monitors `yourcompany/web`, `yourcompany/zest-react-native`, `yourcompany/shared-mobile-modules`
- `zest-integration` - monitors `yourcompany/web`, `yourcompany/zest-react-native`

**Important:** The `.updater/` directory is **never installed** to user projects - it's purely for internal automation.

## Architecture

```
templates/skills/
├── ui-design-system-web/
│   ├── zest-components/
│   │   ├── SKILL.md                       # Skill file (installed to user projects)
│   │   ├── references/                    # Reference docs (installed)
│   │   └── .updater/                      # Auto-update config (NOT installed)
│   │       ├── prompt.md                  # Update prompt with frontmatter config
│   │       └── reports/                   # Generated reports (gitignored)
│   │           └── YYYY-MM-DD-update.md
│   ├── zest-integration/
│   │   ├── SKILL.md
│   │   └── .updater/
│   │       ├── prompt.md
│   │       └── reports/
│   └── ...
└── ui-design-system-rn/
    ├── zest-components/
    ├── zest-integration/
    ├── styling-patterns/
    └── ...
```

**Key points:**
- `.updater/` folders live **inside each skill directory** (fully decentralized)
- `.updater/` folders are **never installed** to user projects (only `SKILL.md`, `references/`, `scripts/` are copied)
- **Auto-discovered:** Workflow scans for `.updater/prompt.md` files - if present, skill is auto-updated
- `prompt.md` contains frontmatter defining which repos to clone and skill-specific update instructions
- Reports are generated per skill in `.updater/reports/`
- **Reports are gitignored on master** but **committed to update branches** (so they appear in PRs for review)
- Everything related to auto-update is co-located with the skill (easier to maintain)
- **No central configuration needed** - just add `.updater/prompt.md` to any skill to enable auto-updates

## How It Works (Proven Pattern)

### 1. Pre-Clone Source Repositories

Before running Claude Code, the workflow clones source repos to parent directory:

```bash
cd ..
git clone https://github.com/yourcompany/web.git
git clone https://github.com/yourcompany/zest-react-native.git
git clone https://github.com/yourcompany/shared-mobile-modules.git
```

This gives Claude direct access to source code via relative paths like `../web/app/libs/zest/src/`.

### 2. Specific Prompts Per Skill

Each skill has a **detailed, specific prompt** (not generic) that includes:
- **Purpose**: What this update does
- **Context**: Where source repos are located
- **Key Files**: Exact paths to read (e.g., `../zest-react-native/src/index.tsx`)
- **Workflow**: Step-by-step instructions (8 phases)
- **Guidelines**: What to preserve, what to update
- **Critical Rules**: DO/DON'T lists
- **Output**: Report + updated skill file

**Example from `update-zest-components.md`:**
```markdown
## Key Files to Read

### React Native Implementation
- `../zest-react-native/src/index.tsx` - Main exports
- `../zest-react-native/src/components/` - Component implementations

### Workflow

1. Read Current Skill
2. Analyze Source Repositories (read exact TypeScript definitions)
3. Identify Changes (new components, signature changes, deprecated)
4. Update Skill Content (preserve frontmatter)
5. Generate Detailed Report
```

### 3. Report Generation

Claude generates a dated markdown report with:
- **Executive Summary**: Components checked, changes found
- **Signature Changes**: Detailed before/after for each changed API
- **New Features**: New components/hooks/APIs added
- **Platform Differences**: Web vs React Native notes
- **Verified (No Changes)**: List of APIs checked but unchanged

**Example report format:**
```markdown
## Executive Summary
- Total components checked: 25
- Signature changes found: 3
- New components added: 2
- Components deprecated: 0

## Signature Changes

### Button
- **Change**: Added `loading` prop (optional, type: boolean)
- **Breaking**: No
- **Source**: ../zest-react-native/src/components/Button.tsx:42

Before:
  interface Props { variant: 'primary' | 'secondary'; onPress: () => void }

After:
  interface Props { variant: 'primary' | 'secondary'; onPress: () => void; loading?: boolean }
```

### 4. GitHub Actions Workflow

**Trigger:**
- Scheduled: Daily at 2am UTC
- Manual: workflow_dispatch (for testing)

**Jobs:**
1. **generate-matrix** (auto-discovery)
   - Scans `templates/skills/**/.updater/prompt.md`
   - Parses frontmatter to get repos config
   - Generates matrix from discovered skills
   - Skills with `.updater/prompt.md` are automatically included
   - No central configuration needed!

2. **update-skills** (matrix per discovered skill)
   - Checkout repo
   - Clone source repos to `../` (from prompt.md frontmatter)
   - Read specific prompt file
   - Run Claude Code with prompt
   - **Commit reports to update branch** (using `git add -f` to override .gitignore)
   - Check for changes + extract report
   - Push to update branch

3. **create-pr**
   - Collect all reports from update branch
   - Create PR with reports embedded in body
   - Add labels (documentation, automated, claude-code, zest)

**Report Flow:**
- Reports are **gitignored on master** (via root `.gitignore`)
- Reports are **committed to update branches** (using `git add -f`)
- Reports are **included in PR body** for easy review
- Reports are **deleted when PR merges** (because they're gitignored on master)

## Configuration

### Adding a New Skill (Auto-Discovered)

1. **Create `.updater` directory** inside the skill:

```bash
mkdir templates/skills/category/my-skill/.updater
```

2. **Create `prompt.md` with frontmatter:** `templates/skills/category/my-skill/.updater/prompt.md`

```markdown
---
repos:
  - yourcompany/repo1
  - yourcompany/repo2
  - yourcompany/repo3
---

## Purpose

Update the My Skill documentation with latest patterns from source repositories.

## Context

Source repositories have been checked out to parent directory:
- `../repo1/path/to/code`
- `../repo2/path/to/code`

## Key Files to Read

- `../repo1/src/index.ts` - Main exports
- `../repo2/src/components/*.tsx` - Implementations

... (detailed instructions)
```

Use existing prompts as template (e.g., `zest-components/.updater/prompt.md`), customize:
- **Frontmatter:** List repos to clone
- **Key files:** Exact paths from source repos
- **Workflow:** Step-by-step instructions
- **Output:** Report + updated skill file

3. **That's it!** No workflow changes needed - skill is auto-discovered next run

The workflow automatically scans for `.updater/prompt.md` files and includes any skill that has one.

### Modifying Update Logic

Edit the prompt file inside the skill's `.updater/` directory:

```bash
# Edit the prompt for a specific skill
vi templates/skills/ui-design-system-web/zest-components/.updater/prompt.md
```

The prompt is the entire instruction set - no code changes needed.

### Modifying Source Repos

Edit the frontmatter in the prompt file:

```bash
# Edit the repos for a specific skill
vi templates/skills/ui-design-system-web/zest-components/.updater/prompt.md
```

Update the frontmatter `repos:` list:

```markdown
---
repos:
  - yourcompany/web
  - yourcompany/new-repo  # Add new repo
---
```

The workflow will automatically clone them on next run.

### Why .updater Folders Don't Get Installed

The installer (`src/cli/lib/installation/agent-installer.ts`) only copies:
- `SKILL.md` (main skill file)
- `references/**/*.md` (reference documentation)
- `scripts/**/*` (optional scripts)

Any other directories (like `.updater/`) are automatically ignored. No configuration needed!

## Manual Triggering

### Via GitHub UI

1. Go to **Actions** → **Auto-Update Skills**
2. Click **Run workflow**
3. Select branch: `master` (or `feature/skill-auto-update-system` for testing)
4. Click **Run workflow**

### Test Single Skill

To test one skill update:

1. Temporarily remove other skills from workflow matrix
2. Trigger workflow manually
3. Review single-skill PR
4. Restore full matrix

## Output

### Successful Run

Creates branch: `auto-update/zest-skills-YYYYMMDD`

Creates PR with:
- **Title**: "🤖 Zest Skills Update - {run_number}"
- **Body**:
  - Summary of updated skills
  - **Full reports** from all skills (embedded)
  - Review checklist
- **Labels**: documentation, automated, claude-code, zest, design-system

**PR includes full reports**, so reviewers see exactly what changed without checking files.

### No Updates Needed

Workflow completes with: "✓ No updates needed - all Zest skills are up to date"

## Key Differences vs Generic Approach

### ❌ Generic Approach (Doesn't Work)

```markdown
# Generic update-skill command
- Read skill-sources.yaml config
- Clone repos based on glob patterns
- Extract files matching patterns
- Update skill somehow (vague)
- Commit changes
```

**Problems:**
- Claude doesn't know what to look for
- No guidance on comparing old vs new
- No clear output format
- Unreliable results

### ✅ Specific Prompt + Decentralized Config (Works)

```markdown
# templates/skills/ui-design-system-web/zest-components/
├── SKILL.md
└── .updater/
    ├── prompt.md                 # Update instructions with frontmatter config
    └── reports/                  # Generated reports

# prompt.md
---
repos:
  - yourcompany/web
  - yourcompany/zest-react-native
---

## Purpose
...

## Key Files to Read
- Read ../zest-react-native/src/index.tsx (exact path)
- For each component, read TypeScript definition
- Compare against current skill documentation
- Check for: new props, removed props, type changes
- Generate report with before/after for each change
- Update skill with exact changes found
```

**Benefits:**
- ✅ Claude knows exactly what files to read
- ✅ Clear comparison methodology
- ✅ Structured report format
- ✅ Reliable, repeatable results
- ✅ **Fully decentralized** - no central workflow config
- ✅ **Auto-discovered** - just add `.updater/` to enable
- ✅ **Self-contained** - each skill manages its own updates

## Troubleshooting

### Workflow Fails to Clone Repos

**Error:** "Repository not found" or "Permission denied"

**Fix:** Check that:
- Vault secrets are configured (GITHUB_TOKEN)
- Self-hosted runner has network access
- Repository names are correct in workflow matrix

### Claude Doesn't Generate Report

**Check prompt file** - ensure it includes:
```markdown
## Output

1. **Report**: `automation/reports/$(date +%Y-%m-%d)-skill-name-update.md`
2. **Updated Skill**: `templates/skills/.../SKILL.md`

The report MUST be created before updating the skill file.
```

### Report Not Included in PR

**Check workflow** - ensure create-pr job:
1. Checks out update branch
2. Reads reports: `automation/reports/$(date +%Y-%m-%d)-*-update.md`
3. Includes in PR body: `${{ steps.check_branch.outputs.reports }}`

### Skill Frontmatter Changed

**Problem:** Claude modified skill name/description/metadata

**Prevention:** Prompt includes:
```markdown
## Critical Rules

**DO:**
- ✅ Preserve frontmatter exactly

**DON'T:**
- ❌ Change skill frontmatter (name, description)
```

Add more explicit examples if needed.

## Security

- **Self-hosted runner** required for private repository access
- **AWS Bedrock** credentials configured via IAM role
- **Vault secrets** for GitHub token
- **No secrets** in prompt files
- **PR review** required before merge (no auto-merge)

## Maintenance

### Weekly Review

1. Check PR created by auto-updater
2. **Read reports in PR body** - detailed change summary
3. Review changed skill files for accuracy
4. Verify frontmatter preserved
5. Merge when ready

### Improving Prompts

If Claude makes mistakes:
1. Identify issue (wrong files read, incorrect comparison, etc.)
2. Update specific prompt file
3. Test with manual trigger
4. Commit prompt improvement

**Prompts are the main configuration** - most fixes are prompt edits, not code changes.

### Adding Source Repos to a Skill

To track additional repositories for a skill:

1. Update skill's prompt frontmatter: `templates/skills/.../skill-name/.updater/prompt.md`
2. Add repo to frontmatter `repos:` list
3. Add exact file paths to read from the new repo in the prompt body
4. Test with manual trigger

No workflow changes needed - everything is auto-discovered.

**Example:**
```markdown
---
repos:
  - yourcompany/web
  - yourcompany/zest-react-native
  - yourcompany/new-repo  # Add this
---

## Key Files to Read
- `../new-repo/src/components/*.tsx` - New component implementations
```

## Performance

- **Repo clones:** Shallow (default branch only) - ~10 seconds each
- **Single skill update:** ~2-5 minutes (Claude analysis + generation)
- **Total workflow time:** ~10-15 minutes (2 skills, 3 max parallel)
- **Report size:** Typically 1-5 KB per skill

## Examples

### Example Prompt Structure

See `templates/skills/ui-design-system-web/zest-components/.updater/prompt.md` for complete example.

Key sections:
1. **Purpose** - What this updates
2. **Context** - Where source repos are
3. **Key Files** - Exact paths to read
4. **Workflow** - 8 detailed phases
5. **Guidelines** - What to preserve/update
6. **Critical Rules** - DO/DON'T
7. **Output** - Report + skill file

### Example Report

See generated reports in `automation/reports/` (after first run).

## Future Enhancements

Potential improvements:
- Cache cloned repos between runs (speed up)
- Skill diff preview in PR (visual changes)
- Auto-merge for minor updates (after validation)
- Metrics dashboard (success rate, common issues)
- More skills (expand beyond Zest to other skills)

## Credits

**Pattern based on:** `yourcompany/daily-active-users-specs/.github/workflows/update-zest-components.yml`

**Workflow:** `.github/workflows/auto-update-skills.yml`

Key insight: **Specific, detailed prompts with exact file paths work. Generic prompts don't.**
