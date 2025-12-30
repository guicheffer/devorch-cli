# Contributing to devorch

Thank you for contributing to devorch! This guide will help you get started.

## Quick Links

- 📚 [Local Development Guide](docs/developer-guide/development.md) - Setting up your development environment
- 🛠️ [Extending devorch](docs/developer-guide/extending.md) - Creating custom commands, subagents, and skills
- 📝 [Template Creation](templates/CONTRIBUTING.md) - Detailed guide for creating commands, subagents, and skills
- 🐛 [Issue Tracker](https://github.com/guicheffer/devorch/issues) - Report bugs or request features

## Your First Contribution

**Choose your path based on what you want to do:**

| What you want to do | Time | Docs to read | Steps |
|---------------------|------|--------------|-------|
| Fix a typo or improve docs | 10 min | Just this file | Edit → Commit → PR |
| Add an example to a skill | 20 min | [Template Guide](templates/CONTRIBUTING.md) | Find skill → Add example → PR |
| Report a bug | 15 min | None | [Create issue](https://github.com/guicheffer/devorch/issues/new) with repro steps |
| Fix a bug in CLI code | 1-2 hrs | [DEVELOPMENT.md](docs/developer-guide/development.md) | Setup → Fix → Test → PR |
| Add a new command/subagent/skill | 2-4 hrs | [Template Guide](templates/CONTRIBUTING.md) + [EXTENDING.md](docs/developer-guide/extending.md) | Create → Test → PR |
| Major feature or refactor | Plan first! | All docs below | [Start a discussion](https://github.com/guicheffer/devorch/discussions) first |

### Quick Start: I Just Want to Fix a Typo

**No setup needed! Just use GitHub's web interface:**

1. Browse to the file with the typo
2. Click the edit (pencil) icon
3. Make your change
4. Scroll down → "Propose changes"
5. Click "Create pull request"

Done! We'll review and merge quickly.

### 1. Find Something to Work On

**Good first contributions:**
- Fix typos or improve documentation
- Add examples to existing skills (see `templates/skills/*/references/examples.md`)
- Report bugs with clear reproduction steps
- Suggest new features in discussions

Browse [existing issues](https://github.com/guicheffer/devorch/issues) or [create a new one](https://github.com/guicheffer/devorch/issues/new).

**Looking for "good first issue"?** Filter issues by the `good first issue` label.

### 2. Set Up Your Environment

**Prerequisites:**
- [Bun](https://bun.sh) (not npm/yarn/pnpm)
- [GitHub CLI](https://cli.github.com/)
- Git

**Clone and install:**
```bash
gh repo clone guicheffer/devorch
cd devorch
bun install
```

**Verify setup:**
```bash
bun run test      # Run all tests (excludes eval fixtures)
bun run dev       # Run CLI in development mode
```

See [DEVELOPMENT.md](docs/developer-guide/development.md) for complete setup instructions.

### 3. Make Your Changes

**Branch naming:**
```bash
git checkout -b fix/description       # Bug fixes
git checkout -b feat/description      # New features
git checkout -b docs/description      # Documentation
```

**Before committing:**
```bash
bun run test      # All tests pass (excludes eval fixtures)
bun run lint:fix  # Auto-fix lint issues
bun run format    # Format code
```

Pre-commit hooks will automatically run linting and formatting.

### 4. Submit a Pull Request

1. Push your branch: `git push origin your-branch-name`
2. Open a pull request on GitHub
3. Fill out the PR template (describes what changed and why)
4. Wait for review - we'll provide feedback and may request changes

## Types of Contributions

### 🐛 Bug Fixes

1. [Create an issue](https://github.com/guicheffer/devorch/issues/new) describing the bug
2. Reference the issue in your PR: "Fixes #123"
3. Include test cases that verify the fix

### ✨ New Features

1. [Start a discussion](https://github.com/guicheffer/devorch/discussions) first
2. Get feedback on the approach
3. Implement with tests and documentation
4. Submit PR referencing the discussion

### 📚 Documentation

Documentation improvements are always welcome! No need for discussion first.

Areas to improve:
- Fix typos or unclear explanations
- Add missing examples
- Improve getting started guides
- Document undocumented features

### 🎨 Templates (Commands, Subagents, Skills)

Creating new templates is a great contribution! See the detailed [Template Creation Guide](templates/CONTRIBUTING.md).

**Quick overview:**
- **Commands** - User-invoked slash commands (e.g., `/new-spec`)
- **Subagents** - Specialized agents called by multi-agent commands
- **Skills** - Knowledge modules with codebase patterns and examples

**Creation process:**
1. Study existing examples in `templates/`
2. Follow the [Template Creation Guide](templates/CONTRIBUTING.md)
3. Test locally with `--local` flag
4. Submit PR with your template

### 🔧 Core CLI Development

Working on the CLI itself? See [DEVELOPMENT.md](docs/developer-guide/development.md) for:
- Project structure and architecture
- Testing strategies
- Debugging tips
- Release process

## Development Workflow

### Running Tests

```bash
bun run test             # All tests (excludes eval fixtures)
bun run test:unit        # Unit tests only
bun run test:integration # Integration tests only
bun run test:watch       # Watch mode
bun test --coverage      # With coverage (use direct bun test for coverage)
```

**Important:** Always use `bun run test` instead of `bun test` directly. The `bun run test` command uses package.json scripts that exclude eval fixtures in `tests/evals`. Running `bun test` directly will incorrectly include these fixtures.

**Snapshot tests for templates:**

Every command and subagent has a dedicated snapshot test in `tests/snapshots/`. These tests ensure that template compilation produces consistent output.

```bash
# Run all snapshot tests
bun test tests/snapshots/

# Run specific snapshot test
bun test tests/snapshots/commands/panic.test.ts

# Update snapshots after template changes
bun test tests/snapshots/ --update-snapshots
```

**Coverage test:**

The `tests/snapshots/coverage.test.ts` automatically verifies that every command and subagent template has a corresponding snapshot test. This runs with the regular test suite.

See [tests/snapshots/README.md](tests/snapshots/README.md) for more details on snapshot testing.

### Testing Local Changes

**Method 1: In test-project**
```bash
cd test-project
bun ../src/cli/index.ts install --local=../
```

**Method 2: Global install**
```bash
bun run compile
./devorch install --local=$(pwd)
```

See [Testing Local Changes](docs/developer-guide/development.md#testing-local-changes) for more details.

### Code Quality

This project uses:
- **Bun** for runtime and package management (required)
- **TypeScript** for type safety
- **Biome** for linting and formatting
- **Husky** for pre-commit hooks

**Style guidelines:**
- Use `@/` path alias for imports (never relative paths)
- Use custom error classes from `@/utils/errors.js`
- Use custom logger from `@/utils/logger.js`
- Follow existing patterns in the codebase

See [DEVELOPMENT.md](docs/developer-guide/development.md#code-style) for complete style guidelines.

## Project Structure

```
devorch/
├── src/
│   ├── cli/              # CLI application
│   │   ├── commands/     # CLI command implementations
│   │   └── lib/          # Core libraries
│   ├── updater/          # Auto-updater system
│   ├── schemas/          # Zod schema definitions
│   └── utils/            # Shared utilities
├── templates/            # Commands, subagents, skills, workflows
│   ├── commands/         # User-invoked slash commands
│   ├── subagents/        # Specialized agents
│   ├── skills/           # Knowledge modules
│   ├── standards/        # Standards presets
│   └── shared/workflows/ # Reusable instruction snippets
├── tests/                # Test suite
│   ├── integration/      # Integration tests
│   └── unit/             # Unit tests (colocated with source)
└── docs/                 # Documentation
```

## Getting Help

- 💬 [Discussions](https://github.com/guicheffer/devorch/discussions) - Ask questions
- 🐛 [Issues](https://github.com/guicheffer/devorch/issues) - Report bugs
- 📖 [Documentation](docs/) - Read guides

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what's best for the project
- Welcome newcomers and help them learn

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

**Still have questions?** Check out our [detailed documentation](docs/) or [ask in discussions](https://github.com/guicheffer/devorch/discussions).
