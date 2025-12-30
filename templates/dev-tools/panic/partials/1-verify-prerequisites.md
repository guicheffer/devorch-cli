## Step 1: Verify Prerequisites

### Check GitHub CLI

Verify that the `gh` CLI is available and authenticated:

```bash
gh --version
gh auth status
```

**If `gh` is not installed or not authenticated:**

Display error message and exit:

```
❌ Error: GitHub CLI not available or not authenticated

The /panic command requires the GitHub CLI (gh).

Install: https://cli.github.com/
Authenticate: gh auth login

After setup, try /panic again.
```

**STOP HERE** if GitHub CLI is not ready.

### Check Git Repository

Verify that the current directory is inside a git repository:

```bash
git rev-parse --is-inside-work-tree
git remote get-url origin
```

**If not a git repository:**

Display error message and exit:

```
❌ Error: Not a git repository

The /panic command requires a git repository to create issues.
Please run this command from within a git repository.
```

**STOP HERE** if not in a git repository.

### Display Verification Success

Once both checks pass, display confirmation:

```
✅ Prerequisites Verified

Repository: [owner/repo from git remote]
Working Directory: [pwd]
GitHub CLI: Authenticated as [username from gh auth status]
```
