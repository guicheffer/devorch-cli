# Development Guide

Contributing to devorch and understanding its architecture.

## Prerequisites

- **Bun** (required, not npm/yarn/pnpm)
- **GitHub CLI** (`gh`)

**Install Bun:**
```bash
curl -fsSL https://bun.sh/install | bash
```

## Quick Start

```bash
# Clone and setup
git clone https://github.com/guicheffer/devorch.git
cd devorch
bun install

# Run in dev mode
bun run dev

# Run tests
bun test
```

## Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                       devorch                          │
│                                                              │
│  ┌──────────────┐         ┌──────────────┐                 │
│  │ CLI (dist)   │  →      │ Templates    │                 │
│  │  (src/cli/)  │         │ (templates/) │                 │
│  └──────────────┘         └──────────────┘                 │
│         ↓                         ↓                         │
│   Install time                Compile                       │
│   compilation              templates with                   │
│                           frontmatter filters                │
│                                  ↓                          │
│                          ┌──────────────┐                   │
│                          │ User Project │                   │
│                          │  .claude/    │                   │
│                          │  .claude/    │                   │
│                          └──────────────┘                   │
└──────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
devorch/
├── src/
│   ├── cli/           # CLI application (distributed)
│   │   ├── commands/  # CLI command implementations
│   │   ├── lib/       # Core libraries
│   │   │   ├── discovery/  # Custom asset discovery
│   │   │   └── ...
│   │   └── types/     # TypeScript types
│   ├── schemas/       # Zod schema definitions
│   └── utils/         # Shared utilities
├── templates/         # Markdown files (commands, subagents, skills)
│   ├── commands/
│   ├── subagents/
│   ├── skills/        # Skills with optional .updater/ directories
│   └── shared/
├── .github/
│   ├── workflows/     # CI/CD automation
│   │   ├── auto-update-skills.yml  # Daily skill auto-updater
│   │   ├── ci.yml                  # CI checks
│   │   └── release.yml             # Release automation
│   └── scripts/       # CI/CD scripts
│       └── generate-update-matrix.ts  # Skill update discovery
└── docs/              # Documentation
```

### Development .claude/ Folder

The root `.claude/` folder contains development files for devorch itself:

```
.claude/
└── settings.local.json           # Local Claude Code settings (user-created)
```

**Files explained:**

**`settings.local.json`** - User's local Claude Code settings
- NOT created by devorch (user-created)
- Contains AWS credentials, permissions, environment variables
- Git-ignored for security
- Used by developers for local Claude Code configuration

**Note for contributors:**
- These files are for devorch's own development/testing
- User projects will have their own `.claude/` folders
- Don't commit `settings.local.json` (contains credentials)

### Automatic .gitignore Generation

**devorch automatically creates `.gitignore` files during installation:**

```
# Auto-created by installer
.claude/agents/devorch/.gitignore      # Ignores all generated subagents
.claude/commands/devorch/.gitignore    # Ignores all generated commands
.claude/skills/.gitignore                   # Ignores enabled bundled skills only
devorch/.gitignore                     # Ignores .state/ directory
```

**What gets gitignored:**
- ✅ Generated subagents and commands (always gitignored)
- ✅ Enabled bundled skills (gitignored, can be regenerated)
- ✅ Installation state (gitignored)
- ❌ Custom skills (not gitignored - user-created content)
- ❌ Config file (not gitignored - team settings)

**Why automatic?** These are generated files that can be recreated with `devorch install`. After cloning, teammates just run `devorch install` to regenerate everything.

**Implementation:** See `src/cli/lib/installation/installer.ts:160-195`

### CLI Architecture

```
src/cli/
├── index.ts                 # Entry point
├── commands/
│   ├── setup/
│   │   └── install/        # Install command
│   ├── manage/
│   │   ├── update/         # Update installation
│   │   ├── check-version/  # Version checking
│   │   └── contribute/     # Contribute assets
│   └── diagnose/           # Diagnostics
└── lib/
    ├── config/            # Config loading and parsing
    ├── source/            # GitHub/local source loading
    ├── compiler/          # Template compilation
    ├── installer/         # Installation logic
    ├── markdown-di/       # Dependency resolution & injection
    └── filesystem/        # File operations
```

### GitHub Workflows

**Location:** `.github/workflows/`

The repository uses GitHub Actions for automation:

#### CI Workflow (`ci.yml`)

Runs on every push and pull request:

```yaml
jobs:
  test:          # Run test suite
  typecheck:     # TypeScript validation
  lint:          # Biome linting
  build:         # Build CLI
```

**Triggers:**
- Push to any branch
- Pull request opened/updated
- Manual workflow dispatch

**What it does:**
1. Installs dependencies with Bun
2. Runs all tests (`bun test`)
3. Checks TypeScript types (`bun run typecheck`)
4. Lints code (`bun run lint`)
5. Builds CLI (`bun run build`)

#### Auto-Update Skills Workflow (`auto-update-skills.yml`)

Automatically updates skills with `.updater/` configurations:

**Schedule:** Daily at 2am UTC

**Stages:**
1. **Discover Skills** - Scans for skills with `.updater/prompt.md`
2. **Generate Matrix** - Creates update matrix using `.github/scripts/generate-update-matrix.ts`
3. **Update Skills** - Uses Claude Code Action to update skill content
4. **Create PR** - Aggregates changes into review PR

**See:** Workflow at `.github/workflows/auto-update-skills.yml` and deprecated docs at [auto-updater.md](./auto-updater.md)

**Manual trigger:**
```bash
gh workflow run "Auto-Update Skills"
```

#### Release Workflow (`release.yml`)

Handles version releases and publishing:

**Triggers:**
- Manual workflow dispatch with version number
- Git tags matching `v*.*.*`

**What it does:**
1. Bumps version in package.json
2. Generates changelog
3. Creates GitHub release
4. Publishes artifacts

#### Required Workflow (`required-workflow.yaml`)

Meta-workflow that must pass for PR merge:

**Purpose:**
- Ensures all CI checks pass
- Prevents broken code from merging
- Enforces quality gates

**Checks:**
- All tests pass
- Type checking succeeds
- Linting passes
- Build succeeds

### Working with Workflows

**View workflow runs:**
```bash
gh run list
gh run view <run-id>
```

**Re-run failed workflow:**
```bash
gh run rerun <run-id>
```

**Debug workflow locally:**
Use [act](https://github.com/nektos/act) to run GitHub Actions locally:
```bash
act -j test  # Run test job locally
```

**Workflow permissions:**
- `contents: write` - Commit changes
- `pull-requests: write` - Create PRs
- `issues: write` - Create issues
- `id-token: write` - AWS authentication

## Development Commands

### CLI Development

```bash
# Development mode
bun run dev

# Build production
bun run build

# Compile standalone binary
bun run compile

# Type checking
bun run typecheck

# Lint and fix
bun run lint:fix

# Format code
bun run format
```

### Testing

**Test suite:** 182+ tests with excellent coverage

```bash
# All tests (unit + integration)
bun test

# Watch mode
bun test:watch

# Specific test suites
bun test:unit         # Unit tests only
bun test:integration  # Integration tests only

# Coverage
bun test --coverage

# Run specific file
bun test src/cli/lib/markdown-di/resolver.test.ts

# Run with filter
bun test -t "dependency resolution"
```

## Testing Architecture

### Test Organization

**Unit tests** - Colocated with source files:
```
src/cli/lib/markdown-di/
├── resolver.ts
├── resolver.test.ts      ← Unit tests here
├── processor.ts
└── processor.test.ts     ← Unit tests here
```

**Integration tests** - Separate directory:
```
tests/integration/
├── install.test.ts       # Full install workflow
├── compilation.test.ts   # Template compilation
└── config.test.ts        # Config loading
```

### Test Structure

**Unit test example:**
```typescript
import { describe, test, expect } from 'bun:test';
import { DependencyResolver } from '@/lib/markdown-di/resolver';

describe('DependencyResolver', () => {
  test('resolves simple dependency', () => {
    const resolver = new DependencyResolver();
    const result = resolver.resolve(frontmatter, context);

    expect(result.dependencies).toHaveLength(1);
    expect(result.dependencies[0]).toBe('my-subagent');
  });

  test('detects circular dependencies', () => {
    const resolver = new DependencyResolver();

    expect(() => {
      resolver.resolve(circularFrontmatter, context);
    }).toThrow('Circular dependency detected');
  });
});
```

**Integration test example:**
```typescript
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('devorch install', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'devorch-test-'));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  test('installs command successfully', async () => {
    // Run install
    await runInstall(testDir);

    // Verify files created
    const commandPath = join(testDir, '.claude/commands/my-command.md');
    expect(await exists(commandPath)).toBe(true);
  });
});
```

### Snapshot Testing

**Location:** `src/cli/lib/filesystem/__snapshots__/`

Snapshot tests verify compiled output doesn't change unexpectedly:

```typescript
import { test, expect } from 'bun:test';

test('compiles template correctly', async () => {
  const result = await compileTemplate(templateContent);

  // Snapshot the compiled output
  expect(result.body).toMatchSnapshot();
});
```

**Updating snapshots:**
```bash
bun test --update-snapshots
# or
bun test -u
```

**When to update:**
- Intentional changes to template compilation
- Frontmatter structure changes
- Output format improvements

**When NOT to update:**
- Random test failures
- Unexpected changes (investigate first!)

### Test Conventions

**Naming:**
- Test files: `*.test.ts`
- Unit tests: Colocated with source
- Integration tests: `tests/integration/`

**Structure:**
```typescript
describe('ComponentName', () => {
  // Setup
  beforeEach(() => { /* ... */ });
  afterEach(() => { /* ... */ });

  // Happy path first
  test('does the thing successfully', () => { /* ... */ });

  // Edge cases
  test('handles empty input', () => { /* ... */ });
  test('handles invalid input', () => { /* ... */ });

  // Error cases
  test('throws on null input', () => { /* ... */ });
});
```

**Assertions:**
- Use descriptive expectations
- Test both success and failure paths
- Include edge cases

**Good:**
```typescript
test('resolves nested dependencies', () => {
  const result = resolver.resolve(nestedDeps);
  expect(result.dependencies).toHaveLength(3);
  expect(result.dependencies).toContain('parent');
  expect(result.dependencies).toContain('child');
  expect(result.dependencies).toContain('grandchild');
});
```

**Bad:**
```typescript
test('works', () => {
  const result = resolver.resolve(nestedDeps);
  expect(result).toBeTruthy(); // Too vague!
});
```

### Mocking

**File system mocking:**
```typescript
import { mock } from 'bun:test';
import * as fs from 'node:fs/promises';

test('handles missing file', async () => {
  // Mock fs.readFile to throw
  mock.module('node:fs/promises', () => ({
    readFile: async () => {
      throw new Error('ENOENT: File not found');
    }
  }));

  await expect(loadTemplate('missing.md')).rejects.toThrow('File not found');
});
```

**Logger mocking:**
```typescript
import { logger } from '@/utils/logger';

test('logs error on failure', async () => {
  const logSpy = mock(logger.error);

  await failingOperation();

  expect(logSpy).toHaveBeenCalledWith(
    'Operation failed',
    expect.objectContaining({ error: expect.any(Error) })
  );
});
```

### Testing Best Practices

**DO:**
- ✅ Test public APIs, not internal implementation
- ✅ Use descriptive test names
- ✅ Test error paths
- ✅ Clean up test resources (temp files, etc.)
- ✅ Keep tests fast (< 100ms per test)
- ✅ Use `beforeEach`/`afterEach` for setup/cleanup
- ✅ Test edge cases (empty arrays, null values, etc.)

**DON'T:**
- ❌ Test implementation details
- ❌ Write tests that depend on other tests
- ❌ Leave console.log in tests
- ❌ Skip tests without a good reason
- ❌ Mock everything (test real code paths when possible)
- ❌ Write flaky tests (random failures)

### Running Tests in CI

Tests run automatically in GitHub Actions:

```yaml
# .github/workflows/ci.yml
- name: Run tests
  run: bun test

- name: Check coverage
  run: bun test --coverage
```

**Coverage thresholds:**
- Lines: 80%+
- Functions: 80%+
- Branches: 75%+

### Debugging Tests

**Run with debugging:**
```bash
# Show console output
bun test --verbose

# Run single test
bun test -t "specific test name"

# Debug with breakpoints (VSCode)
# Use "JavaScript Debug Terminal" and run:
bun test
```

**Common issues:**

**Test timeout:**
```typescript
test('slow operation', async () => {
  // Increase timeout for slow tests
  await slowOperation();
}, { timeout: 10000 }); // 10 seconds
```

**Flaky tests:**
```typescript
// Bad: Depends on timing
test('processes async', async () => {
  trigger();
  await wait(100); // ❌ Arbitrary delay
  expect(result).toBe(true);
});

// Good: Wait for actual condition
test('processes async', async () => {
  trigger();
  await waitUntil(() => result === true); // ✅ Wait for condition
  expect(result).toBe(true);
});
```

### Writing New Tests

**Checklist for new features:**
1. [ ] Add unit tests for new functions/classes
2. [ ] Add integration test if feature spans multiple components
3. [ ] Test happy path
4. [ ] Test error paths
5. [ ] Test edge cases (null, empty, large inputs)
6. [ ] Update snapshots if output changes
7. [ ] Verify tests pass in CI

**Example: Adding test for new feature**
```bash
# 1. Create test file colocated with source
touch src/cli/lib/my-feature/my-feature.test.ts

# 2. Write tests
# (see examples above)

# 3. Run tests
bun test src/cli/lib/my-feature/my-feature.test.ts

# 4. Run all tests to check for regressions
bun test
```

## Testing Local Changes

### Method 1: Full Path

From any directory:
```bash
cd /path/to/your-test-project
devorch install --local=/path/to/devorch
```

### Method 2: Quick Iteration

From a test project within devorch repo:
```bash
cd devorch/test-project
bun ../src/cli/index.ts install --local=../
```

**Benefits:**
- Runs CLI directly with Bun
- No build step needed
- Instant feedback
- Perfect for development

**Workflow:**
1. Edit templates in `templates/` or code in `src/cli/`
2. Run `bun ../src/cli/index.ts install --local=../`
3. Test changes
4. Iterate

## Common Development Tasks

### Adding a New CLI Command

**1. Create command directory:**
```bash
mkdir -p src/cli/commands/my-category/my-command
```

**2. Create command file:**
```typescript
// src/cli/commands/my-category/my-command/index.ts
import { logger } from '@/utils/logger.js';

export async function myCommand() {
  logger.info('Running my command');
  // Implementation
}
```

**3. Register command:**

Update CLI router to include new command.

**4. Test:**
```bash
bun run dev my-command
```

### Adding a New Template

**1. Create template:**
```bash
mkdir -p templates/commands/my-command/single-agent
vim templates/commands/my-command/single-agent/my-command.md
```

**2. Add frontmatter:**
```markdown
---
name: my-command
description: What it does
mode: single-agent
---

# My Command
...
```

**3. Test installation:**
```bash
cd test-project
bun ../src/cli/index.ts install --local=../
```

### Modifying Dependency Resolution

Dependency resolution: `src/cli/lib/markdown-di/resolver.ts`

**Key classes:**
- `DependencyResolver` - Resolves and validates dependencies
- `CircularDependencyDetector` - Prevents circular dependencies

Config integration: `src/cli/lib/config/config-writer.ts`
- `mergeDependenciesIntoConfigArrays()` - Adds dependencies to config

### Adding Custom Error Types

Error definitions: `src/utils/errors.ts`, `src/utils/error-codes.ts`

**Example:**
```typescript
// src/utils/errors.ts
export class MyError extends BaseError {
  static myCustomError(detail: string): MyError {
    return new MyError(
      ErrorCode.MY_CUSTOM_ERROR,
      `My error: ${detail}`,
      { detail }
    );
  }
}

// src/utils/error-codes.ts
export enum ErrorCode {
  MY_CUSTOM_ERROR = 'MY_CUSTOM_ERROR',
}
```

## CI/CD

### GitHub Actions Workflows

**`.github/workflows/`:**
- `test.yml` - Run tests on PR
- `build.yml` - Build CLI on push
- `release.yml` - Create releases
- `update-assets-cron.yml` - Scheduled skill updates

### Release Process

**1. Compile binaries:**
```bash
bun run compile
```

Outputs: `devorch` binary

**2. Create release:**
- Tag version: `git tag v2.1.0`
- Push tag: `git push origin v2.1.0`
- GitHub Actions builds for all platforms
- Attaches binaries to release

**3. Package templates:**
```bash
tar -czf config.tar.gz templates/
```

Attached to release with binaries.

## Code Style

### Always Use Bun

```bash
# ✅ Correct
bun install
bun run dev
bun test

# ❌ Never
npm install
yarn/pnpm
```

### Always Use Custom Error Classes

```typescript
// ✅ Correct
import { UserError, SystemError } from '@/utils/errors.js';
throw UserError.configNotFound(paths);

// ❌ Never
throw new Error('Config not found');
```

### Always Use Custom Logger

```typescript
// ✅ Correct
import { logger } from '@/utils/logger.js';
logger.info('Loading config', { path });

// ❌ Never
console.log('Loading...');
```

### Always Use Path Constants

```typescript
// ✅ Correct
import { INSTALL_PATHS } from '@/cli/lib/filesystem/paths.js';
const dir = join(projectDir, INSTALL_PATHS.claudeAgents());

// ❌ Never
const dir = join(projectDir, '.claude/agents/devorch');
```

## Pre-commit Hooks

Husky + lint-staged runs automatically:
- TypeScript type checking
- Biome linting with auto-fix
- Biome formatting

**Manual run:**
```bash
bun run format     # Format code with Biome
bun run lint:fix   # Lint and fix with Biome
bun run lint       # Check only (no fixes)
```

## Troubleshooting

**`catalog:` protocol not supported:**
- Using npm instead of Bun
- Solution: `bun install`

**GitHub CLI not found:**
- Install: https://cli.github.com/
- Authenticate: `gh auth login`

**Tests failing:**
- Run: `bun test --watch`
- Check test output for details

**Type errors:**
- Run: `bun run typecheck`
- Fix TypeScript errors

## Resources

- [Main README](../../README.md)
- [Extending Guide](./extending.md) - Creating custom assets
- [Skills Guide](../user-guide/skills.md) - Creating and structuring skills
- [Versioning System](./versioning.md) - Semver, version bumping, and releases
- [Auto-Updater](./auto-updater.md) - Historical auto-updater documentation (deprecated)
- [CLAUDE.md](../../CLAUDE.md) - Guide for AI assistants

## Next Steps

- Read [Extending](./extending.md) for creating custom assets
- Check [CLAUDE.md](../../CLAUDE.md) for development patterns
- Open issues or PRs on GitHub
