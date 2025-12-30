# CLAUDE.md

Guide for AI assistants working on devorch.

**MASTER IS PROTECTED - ALWAYS CREATE PRs**

- NEVER run `git push` to master
- NEVER commit directly to master
- ALWAYS create a branch and PR for changes
- Use `gh pr create` to create pull requests

## Project Overview

**devorch** is a CLI that installs AI workflow automation (subagents, commands, skills) for Claude Code.

```
devorch/
├── src/
│   ├── cli/       # CLI application (distributed tool)
│   ├── schemas/   # Zod schema definitions
│   └── utils/     # Shared utilities
├── templates/     # Markdown files (commands, subagents, skills)
```

## Critical Rules

### 1. Always Use Bun

```bash
# ✅ Correct
bun install
bun run dev
bun run build

# ❌ Never
npm install
yarn/pnpm
```

**Testing Note**: The `tests/evals` directory contains fixture projects with test files that should not be run. Always use the package.json test scripts:

```bash
# ✅ Run standard test suite (excludes evals)
bun run test

# ✅ Or use specific test scripts
bun run test:unit          # Unit tests only
bun run test:integration   # Integration tests only

# ❌ Never run the test runner directly without paths
# This will incorrectly include eval fixtures:
# bun test  (wrong - scans all files including evals)
```

The `test` script in package.json explicitly specifies directories to avoid the evals fixtures.

### 2. Always Use @/ Path Alias

```typescript
// ✅ Correct
import { logger } from '@/utils/logger.js';
import { UserError } from '@/utils/errors.js';

// ❌ Never
import { logger } from '../../../utils/logger.js';
```
