# Copy Claude Configuration

For each successfully created worktree, copy the `.claude` folder if it exists:

```bash
# For each successfully created worktree
if [ -d .claude ]; then
  cp -r .claude ./worktrees/<branch-name>/.claude
  echo "✓ Copied .claude folder to ./worktrees/<branch-name>"
else
  echo "ℹ No .claude folder to copy"
fi
```

This copies the entire `.claude` folder including:
- settings.local.json
- Any other local configuration files
- Custom commands or settings
