# Workflows

Practical guide to using devorch commands and choosing the right approach.

## Development Spectrum

Choose the right tool for the task:

```
Vibe Coding ←─── Agentic Coding ←─── Spec-Driven Development
(Quick)          (Tagged)            (Planned)
```

### Vibe Coding

**For:** Quick, ad-hoc changes

**Example:**
```
"Change button color to red"
"Fix typo in error message"
```

**Tools:** Direct AI assistance in IDE, no devorch needed

### Agentic Coding

**For:** Focused, context-aware work

**Example:**
```
/load-context-training

# Then make natural language requests:
Update the login form styling to match the design system
Add a user preferences API endpoint
Add integration tests for the auth flow
```

**Tools:** `/load-context-training` + natural language requests

**Benefits:**
- Right standards automatically loaded
- No context overload
- Faster than full workflow
- Maintains consistency
- Natural language - no special syntax

### Spec-Driven Development

**For:** Comprehensive, planned work spanning multiple repos/components

**Example:**
- User engagement feature across frontend and backend
- New payment flow with verification
- Multi-repo refactoring

**Tools:** devorch commands (`/gather-requirements`, `/create-spec`, `/create-tasks`, `/implement-task`, `/implement-spec`)

**Benefits:**
- Consistent implementation across workspace
- Built-in verification
- Documentation trail
- Team coordination

## Core Commands

### `/new-spec` - Research and Plan

**When to use:**
- Starting a new feature or epic
- Requirements are unclear
- Need to explore similar patterns

**What it does:**
1. Asks clarifying questions interactively
2. Collects visual assets (screenshots, designs)
3. Identifies similar features in codebase
4. Documents requirements in research folder

**Example workflow:**
```
/new-spec

> What feature are you building?
User profile settings page

> What's the main user goal?
Allow users to update preferences and view account info

... (interactive research)
```

**Output:**
```
specs/2025-10-30-user-profile-settings/
├── planning/
│   ├── requirements.md
│   ├── research.md
│   └── assets/
│       └── design-mockup.png
```

### `/create-spec` - Transform into Blueprint

**When to use:**
- After research is complete
- Have clear requirements
- Ready to plan implementation

**What it does:**
1. Reads requirements from research folder
2. Writes detailed spec.md
3. Breaks down into tasks.md by specialty
4. Assigns implementer roles
5. Verifies completeness

**Example:**
```
/create-spec
```

**Output:**
```
specs/2025-10-30-user-profile-settings/
├── spec.md              # Detailed specification
├── tasks.md             # Breakdown by specialty
└── planning/            # Original research
```

**spec.md example:**
```markdown
# User Profile Settings

## Overview
Allow users to update preferences...

## Requirements
- [ ] Settings UI component
- [ ] API endpoints for preferences
- [ ] State management
- [ ] Localization support

## Technical Approach
...
```

**tasks.md example:**
```markdown
## UI Implementation
- Create SettingsScreen component
- Add form validation
- Integrate with design system

## Data Access
- Add preferences API client
- Implement caching strategy

## Verification
- Visual regression tests
- API contract tests
```

### `/implement-spec` - Build from Blueprint

**When to use:**
- Spec is finalized and approved
- Ready to implement

**What it does:**
1. Reads spec.md and tasks.md
2. Delegates to specialized implementers
3. Reuses existing patterns
4. Documents work
5. Runs verification
6. Produces implementation report

**Example:**
```
/implement-spec
```

**What happens:**
1. **UI Implementer** creates components
2. **Data Access Implementer** adds API integration
3. **State Management Implementer** adds stores
4. **Verifier** runs tests and captures evidence

**Output:**
```
specs/2025-10-30-user-profile-settings/
├── implementation/
│   ├── ui-implementation.md
│   ├── data-access-implementation.md
│   └── state-management-implementation.md
└── verification/
    ├── test-results.md
    ├── screenshots/
    └── verification-report.md
```

### `/plan-product` - Product Documentation

**When to use:**
- Starting new project
- Need mission and roadmap
- Defining tech stack

**What it does:**
1. Gathers product information
2. Creates mission.md
3. Creates roadmap.md
4. Documents tech-stack.md

**Example:**
```
/plan-product
```

**Output:**
```
product/
├── mission.md
├── roadmap.md
└── tech-stack.md
```

### `/worktree` - Git Worktree Helper

**When to use:**
- Working on multiple features simultaneously
- Want isolated working directories

**What it does:**
1. Gets branch name from you
2. Creates git worktree
3. Copies local settings (.env, etc)
4. Provides next steps

**Example:**
```
/worktree

> Enter branch name:
feature/user-profile-settings

Creating worktree at ./worktrees/feature-user-profile-settings...
Copying .env, .mcp.json...
Done!

Next steps:
cd ./worktrees/feature-user-profile-settings
```

### `/panic` - Debug Context Collection

**When to use:**
- Something is broken
- Need to collect context for debugging
- Want to create detailed issue

**What it does:**
1. Verifies git CLI available
2. Collects error logs, stack traces
3. Gathers system information
4. Creates formatted report
5. Optionally creates GitHub issue

**Example:**
```
/panic

Collecting context...
- Git status
- Recent logs
- Error traces
- System info

Report saved to debug-report-2025-10-30.md
```

## MCP Servers (Optional)

For verification with automation tools.

### Setup

Create `.mcp.json` in repository root:

```json
{
  "mcpServers": {
    "mobile-mcp": {
      "command": "npx",
      "args": ["-y", "@mobilenext/mobile-mcp@latest"]
    },
    "chrome-devtools": {
      "command": "npx",
      "args": ["chrome-devtools-mcp@latest"]
    },
    "figma-dev-mode": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-figma"]
    }
  }
}
```

### Common Servers

| Server | Purpose | Use Case |
|--------|---------|----------|
| `mobile-mcp` | Mobile testing | React Native verification |
| `chrome-devtools` | Browser automation | Web app testing |
| `figma-dev-mode` | Design comparison | Visual verification |
| `ios-simulator` | iOS testing | Native iOS verification |
| `playwright` | E2E testing | Integration tests |

### Example: Mobile Verification

**With mobile-mcp installed:**

Verifier can:
- Launch app on simulator
- Take screenshots
- Compare with designs
- Document visual differences
- Run interaction tests

## Choosing Your Approach

### Decision Tree

```
Is it a quick fix?
├─ Yes → Vibe Coding (direct AI)
└─ No → Is it focused on one area?
    ├─ Yes → Agentic Coding (/load-context-training + natural requests)
    └─ No → Is it a comprehensive feature?
        └─ Yes → Spec-Driven (/gather-requirements → /create-spec → /create-tasks → /implement-task or /implement-spec)
```

### Examples by Size

**Small (Vibe Coding):**
- Fix button styling
- Update error message
- Add console log

**Medium (Agentic Coding):**
- Add new API endpoint with tests
- Create new UI component with stories
- Refactor single module

**Large (Spec-Driven):**
- User authentication system
- Payment integration
- Multi-repo feature rollout

## Repository Setup

### Single Repository

Embed devorch in your repo:

```
your-repository/
├── src/
├── devorch.config.yml
└── specs/
```

**Benefits:**
- Specs close to code
- Simpler setup
- Good for single repo projects

### Multiple Repositories (Polyrepo)

Separate specs repository with child repos:

```
your-specs-repo/
├── devorch.config.yml
├── specs/
└── workspace/
    ├── frontend/
    ├── backend/
    └── mobile/
```

**Benefits:**
- Single source of truth
- Cross-repo coordination
- Team collaboration

See [Polyrepo Guide](./polyrepo.md) for details.

## Best Practices

### Use the Right Tool

Don't over-engineer:
- Quick fixes → Don't create specs
- Focused work → Use `/load-context-training`
- Complex features → Full spec-driven workflow

### Start Small

Try agentic coding before full spec-driven:
```
/load-context-training
Add settings button to header
```

If it grows, escalate to spec-driven workflow (see [Specification Workflow](#specification-workflow) for the full flow)

### Leverage Verification

Always use verifiers for important features:
- Visual regression
- API contract testing
- Integration testing
- Design comparison

### Document as You Go

Spec-driven workflow creates documentation automatically:
- spec.md - What you're building
- tasks.md - How it's broken down
- implementation/*.md - What was implemented
- verification/*.md - How it was verified

### Share with Team

Commit specs and implementation docs:
```bash
git add specs/
git commit -m "Add user profile settings spec and implementation"
```

## Next Steps

- [Configuration](./configuration.md) - Set up your commands
- [Skills](./skills.md) - Add project knowledge (Claude Code)
- [Extending](../developer-guide/extending.md) - Create custom workflows
- [Polyrepo](./polyrepo.md) - Multi-repo setup
