# Snapshot Tests

This directory contains snapshot tests for all commands and subagents.

## Structure

```
tests/snapshots/
├── README.md                    # This file
├── test-utils.ts               # Helper functions for creating snapshot tests
├── coverage.test.ts            # Meta-test to ensure complete coverage
├── commands/                   # Command snapshot tests (9 tests)
│   ├── panic.test.ts
│   ├── worktree.test.ts
│   ├── analyze-tech-stack.test.ts
│   ├── train-context.test.ts
│   ├── design-change-web.test.ts
│   ├── verify-figma-file.test.ts
│   ├── implement-spec.test.ts
│   ├── create-spec.test.ts
│   └── new-spec.test.ts
└── subagents/                  # Subagent snapshot tests (22 tests)
    ├── dependency-scanner.test.ts
    ├── tech-stack-analyzer.test.ts
    ├── ... (20 more)
    └── tasks-list-creator.test.ts
```

## How It Works

Each test file is extremely simple (just 3 lines) thanks to utility functions:

### Command Test Example
```typescript
import { createCommandSnapshotTest } from '../test-utils';

createCommandSnapshotTest('verify-figma-file', '/verify-figma-file');
```

### Subagent Test Example
```typescript
import { createSubagentSnapshotTest } from '../test-utils';

createSubagentSnapshotTest('specification', 'spec-writer');
```

## Coverage Test

The `coverage.test.ts` file automatically ensures:

1. ✅ Every command in `templates/` has a corresponding snapshot test
2. ✅ Every subagent in `templates/` has a corresponding snapshot test
3. ✅ No orphaned tests exist (tests without matching templates)

This runs automatically with the test suite and will fail if coverage is incomplete.

## Adding New Tests

When you add a new command or subagent template:

1. Create a new test file in the appropriate directory
2. Use the utility function from `test-utils.ts`
3. Run tests - the coverage test will pass if everything is correct

### Example: Adding a New Command Test

```bash
# 1. Create the test file
cat > tests/snapshots/commands/my-new-command.test.ts << 'EOF'
import { createCommandSnapshotTest } from '../test-utils';

createCommandSnapshotTest('my-new-command', '/my-new-command');
EOF

# 2. Run tests to generate snapshot
bun test tests/snapshots/commands/my-new-command.test.ts --update-snapshots
```

## Running Tests

```bash
# Run all snapshot tests
bun test tests/snapshots/

# Run just command tests
bun test tests/snapshots/commands/

# Run just subagent tests
bun test tests/snapshots/subagents/

# Run coverage test
bun test tests/snapshots/coverage.test.ts

# Update snapshots after template changes
bun test tests/snapshots/ --update-snapshots
```

## Test Stats

- **160 total tests** across 37 files
- **32 snapshots** maintained
- **100% coverage** of all commands and subagents
- **Each test file**: 3 lines of code
