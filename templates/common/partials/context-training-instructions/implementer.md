{{#context-training-name}}
---

## User Requirements & Preferences

Always read and prioritize information about user specific requirements on coding from the user's local @devorch/context-training/{{context-training-name}}/ folder.

For this file you **NEED** to read and review:

- @devorch/context-training/{{context-training-name}}/implementation.md

For this file you **SHOULD** review relevant domain files from:

- @devorch/context-training/{{context-training-name}}/implementers/

**About this folder:**
- Contains domain-specific implementation preferences (one file per domain)
- Each file is named with kebab-case (e.g., `react-components.md`, `state-management.md`, `error-handling.md`)
- Each file has frontmatter with `domain` and `description` fields
- Review files that are relevant to your current task to understand implementation patterns, conventions, and preferences

**How to use:**
1. List files in the implementers/ folder to see available domains
2. Read files that are relevant to your current implementation task
3. Follow the patterns, conventions, and guidelines from those domain files
{{/context-training-name}}
