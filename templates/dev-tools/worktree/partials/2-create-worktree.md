# Create Git Worktrees

For each branch name, create the git worktree:
```bash
git worktree add ./worktrees/<branch-name> -b <branch-name>
```

Process all branches:
- Track successful creations
- Track any failures with error details
- Continue with remaining branches even if one fails

Important:
- Always create worktrees in the `./worktrees/` directory
- Use the `-b` flag to create a new branch
- If a branch already exists, the command will fail for that branch - continue with others
- If the user wants to use an existing branch, omit the `-b` flag

## Error Handling

Handle common errors per branch:
- **Branch already exists**: Suggest using `git worktree add ./worktrees/<branch-name> <existing-branch>` (without `-b`)
- **Not in git repository**: Inform user this command only works in git repositories (fail early for all)
- **Directory already exists**: Check if worktree already exists at that path
- **Permission issues**: Report file system permission errors clearly
