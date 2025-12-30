{{#context-training-name}}
---

## User Requirements & Preferences

Always read and prioritize information about user specific requirements on coding from the user's local @devorch/context-training/{{context-training-name}}/ folder.

For this file you **SHOULD** review relevant domain files from:

- @devorch/context-training/{{context-training-name}}/verifiers/

**About this folder:**
- Contains domain-specific verification preferences and test patterns (one file per domain)
- Each file is named with kebab-case (e.g., `react-components.md`, `api-endpoints.md`)
- Each file has frontmatter with `domain` and `description` fields
- Review files that are relevant to your current task to understand verification patterns and testing conventions

**How to use:**
1. List files in the verifiers/ folder to see available domains
2. Read files that are relevant to your current verification task
3. Follow the verification patterns, test conventions, and guidelines from those domain files
{{/context-training-name}}
