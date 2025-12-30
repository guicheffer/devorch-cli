---
name: $parent
---

#### Check devorch Version

```bash
devorch check-version --command {{name}}
```

The command outputs JSON to stdout:

```json
{
  "cli": { "current": "v1.0.0", "latest": "v1.1.0" },
  "templates": { "installed": "v1.0.0", "latest": "v1.1.0" },
  "blocked": false,
  "message": "CLI update available (v1.1.0). Run `devorch update` after this task."
}
```

Parse the JSON and check the `blocked` field:

IF `blocked` == false:
  - Show the `message` field to the user (if present)
  - CONTINUE with the command

IF `blocked` == true:
  - Show the `message` field to the user
  - STOP execution - do not proceed with the command
{{#dependencies.subagents.0}}

#### Required Subagents

**Before starting**, verify that all required subagents are available in your current profile.

**STOP HERE** if any of the required subagents listed below are not available.

If any subagent is missing, inform the user:

```
⚠️ Cannot execute this command - Missing required subagent(s):
[list the missing ones]

This command requires these subagents to function properly. Please ensure your profile includes them.
```

**Only proceed** if all required subagents are available.

**Required:**
{{#dependencies.subagents}}
- {{.}}
{{/dependencies.subagents}}
{{/dependencies.subagents.0}}
{{#dependencies.skills.0}}

#### Required Skills

This {{schema}} requires the following skills to be activated:

{{#dependencies.skills}}
- Activate skill **`{{.}}`**
{{/dependencies.skills}}
{{/dependencies.skills.0}}
