# Get Branch Names

Extract branch names from the user's request:
- Parse the user's natural language request for branch names
- Support multiple branches in a single request
- Examples:
  - "create worktrees for feat-auth, feat-payments" → ['feat-auth', 'feat-payments']
  - "I want worktrees called x, y and z" → ['x', 'y', 'z']
  - "worktree for bugfix-login" → ['bugfix-login']
- If no branch names provided, ask: "What branch name(s) would you like to use? You can specify multiple."
- Validate each branch name (no spaces, special chars that git doesn't allow)

Store the list of branch names for use in subsequent steps.
