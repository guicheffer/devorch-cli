**Get the active spec:**

```bash
devorch get-spec
```

**Parse the output:**
- If `NO_ACTIVE_SPEC=true` and `NO_SPECS_FOUND=true`: Exit with error - no specs to work with
- Otherwise: Extract `CURRENT_SPEC=[path]`, `SPEC_NAME=[name]`, and `FOLDER_NAME=[folder]`
- Always extract `NEWEST_SPEC=[path]`, `NEWEST_SPEC_NAME=[name]`, and `NEWEST_SPEC_FOLDER=[folder]` from output
- Check `IS_STALE` flag to determine if active spec is older than newest

**Note:** If no active spec was previously set, `devorch get-spec` automatically sets the newest spec as active.

**Always ask the user to confirm or change the spec:**

Use the AskUserQuestion tool to prompt the user:

```
Question: "Active spec is '[active-folder-name]' ([active-date]). Which spec would you like to use?"

Header: "Select Spec"

Options:
1. Continue with '[active-folder-name]'
   Description: Use the currently active spec

2. Switch to '[newest-folder-name]'
   Description: Switch to the newest spec ([newest-date])

3. Cancel
   Description: Abort this command
```

**Note:** If the active spec is stale (`IS_STALE=true`), modify the question to: "Active spec '[active-folder-name]' ([active-date]) is older than '[newest-folder-name]' ([newest-date]). Which spec would you like to use?"

**Handle user's response:**
- **Option 1 (Continue)**: Use `CURRENT_SPEC` path as-is
- **Option 2 (Switch)**: Run `devorch get-spec [NEWEST_SPEC_NAME]` to set it active, then re-run `devorch get-spec` to get updated spec info, and use the new `CURRENT_SPEC` path
- **Option 3 (Cancel)**: Stop execution and exit the command

**Validate spec folder exists:**

```bash
if [ ! -d "[spec-path]" ]; then
  echo "ERROR: Spec folder not found at [spec-path]"
  exit 1
fi
```

**Store the selected spec path as `[spec-folder-path]`** for use in subsequent phases.

The `[spec-folder-path]` variable will contain the full path to the spec folder (e.g., `devorch/specs/2025-11-18-user-auth`).
