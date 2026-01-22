# Polyrepo Guide

Multi-repository workspace setup for coordinated development across multiple codebases.

## What is a Polyrepo?

A workspace containing multiple repositories with shared specifications and development standards.

**Key features:**
- Each repo maintains own code and git history
- Specs shared across all repos
- Single source of truth for cross-repo features
- Coordinated changes span multiple repos

## When to Use

**Good for:**
- Multiple teams collaborating on specs
- Features spanning frontend, backend, microservices
- Separate specs repository from implementation
- Cross-repo refactorings
- Shared standards across projects

**Not needed for:**
- Single repository projects (use embedded specs)
- Solo developers
- Simple projects

## Architecture

```
your-specs-repo/                # Specs repository (tracked)
├── .mcp.json                   # MCP server config
├── .gitignore                  # Contains "workspace/"
├── devorch.config.yml
├── specs/                      # Shared specifications
│   └── 2025-10-30-payment-flow/
└── workspace/                  # Git-ignored
    ├── frontend-app/           # Implementation repos (untracked)
    ├── backend-api/
    ├── payment-service/
    └── mobile-app/
```

**Benefits over git submodules:**
- No submodule complexity
- Independent git operations
- Simpler workflow
- Easy to manage

## Setup

### 1. Clone Specs Repository

```bash
git clone https://github.com/company/specs-repo.git
cd specs-repo
```

### 2. Create workspace/ Directory

```bash
mkdir workspace
echo "workspace/" >> .gitignore
git add .gitignore
git commit -m "Add workspace/ to gitignore"
```

### 3. Clone Implementation Repositories

```bash
cd workspace
git clone https://github.com/company/frontend-app.git
git clone https://github.com/company/backend-api.git
git clone https://github.com/company/payment-service.git
git clone https://github.com/company/mobile-app.git
cd ..
```

### 4. Configure MCP Servers (Optional)

Create `.mcp.json` in specs repo root:

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

See [Workflows](./workflows.md) for MCP server details.

### 5. Install devorch

```bash
devorch install
```

## Working with Polyrepo

### AI Navigation

Use `@` to reference files across repos:

```
@workspace/frontend-app/src/components/Button.tsx update styling
@workspace/backend-api/src/routes/auth.ts add new endpoint
@workspace/payment-service/src/processors/stripe.ts review integration
```

**Benefits:**
- AI focuses on exact files
- No grep cycles
- Clear context
- Faster responses

### Cross-Repo Workflows

**Example: Payment flow feature**

1. **Research:**
```
/new-spec

> Feature: Payment flow
> Repos: frontend-app, backend-api, payment-service
```

2. **Create spec:**
```
/create-spec
```

Spec spans all three repos:
```markdown
## Frontend
- Payment form component
- Success/error screens
- State management

## Backend
- Payment API endpoints
- Webhook handlers
- Database migrations

## Payment Service
- Stripe integration
- Transaction logging
- Retry logic
```

3. **Implement:**
```
/implement-spec
```

AI coordinates across all repos:
- Frontend: Implements UI
- Backend: Adds endpoints
- Payment service: Integrates Stripe
- Verifiers: Test entire flow

### Syncing Repositories

Pull latest changes from all repos:

```bash
cd workspace
for dir in */; do
  echo "Updating $dir"
  cd "$dir" && git pull origin main && cd ..
done
cd ..
```

Or create a script `sync-workspace.sh`:

```bash
#!/bin/bash
cd workspace
for dir in */; do
  echo "📦 Updating $dir..."
  (cd "$dir" && git fetch && git pull)
done
echo "✅ All repos synced"
```

Usage:
```bash
chmod +x sync-workspace.sh
./sync-workspace.sh
```

### Creating Branches

Create matching branches across repos:

```bash
#!/bin/bash
BRANCH="feature/payment-flow"

cd workspace
for dir in frontend-app backend-api payment-service; do
  echo "Creating branch in $dir"
  (cd "$dir" && git checkout -b $BRANCH)
done
```

### Team Workflow Example

**Scenario:** New payment feature spanning 3 repos

1. **PM creates spec**
```bash
# In specs repo
/new-spec
/create-spec
```

2. **Team reviews spec**
```bash
# Review specs/2025-10-30-payment-flow/spec.md
# Comment, iterate, finalize
```

3. **Developer implements**
```bash
# Create branches
./create-branches.sh feature/payment-flow

# Run implementation
/implement-spec

# Work happens across:
# - workspace/frontend-app
# - workspace/backend-api
# - workspace/payment-service
```

4. **Verification**
```bash
# Verifier tests full flow
# Uses MCP servers to test E2E
# Creates verification report
```

5. **Team creates PRs**
```bash
# In each repo
cd workspace/frontend-app
git push -u origin feature/payment-flow
gh pr create --title "Payment flow: Frontend"

cd ../backend-api
git push -u origin feature/payment-flow
gh pr create --title "Payment flow: Backend"

# etc.
```

## Best Practices

### Spec Organization

Group specs by feature:
```
specs/
├── 2025-10-30-payment-flow/
│   ├── spec.md
│   ├── tasks.md
│   ├── implementation/
│   └── verification/
├── 2025-11-01-user-profile/
└── 2025-11-05-analytics-dashboard/
```

### Cross-Repo References

Link between repos in specs:
```markdown
## Dependencies

- Frontend: `workspace/frontend-app/src/api/payments.ts`
- Backend: `workspace/backend-api/src/routes/payments.ts`
- Service: `workspace/payment-service/src/stripe.ts`
```

### Workspace Management

Keep workspace clean:
```bash
# Remove merged branches
cd workspace
for dir in */; do
  (cd "$dir" && git branch --merged | grep -v "\*" | xargs -n 1 git branch -d)
done
```

### Team Coordination

**Specs repo as source of truth:**
- Commit all specs
- Track implementation progress
- Document decisions
- Link to PRs

**Implementation repos:**
- Reference spec in PR descriptions
- Link back to spec repo
- Keep branches synced

## Troubleshooting

### Workspace repos out of sync

```bash
cd workspace/frontend-app
git status
git pull origin main
```

### Spec references wrong paths

Update references in spec.md:
```markdown
- ❌ `src/components/Button.tsx`
- ✅ `workspace/frontend-app/src/components/Button.tsx`
```

### MCP servers not available

Verify `.mcp.json` in specs repo root:
```bash
cat .mcp.json
# Restart Claude Code to reload config
```

## Comparison: Embedded vs Polyrepo

| Feature | Embedded Specs | Polyrepo |
|---------|---------------|----------|
| **Setup** | Simple | Moderate |
| **Use case** | Single repo | Multiple repos |
| **Specs location** | Inside repo | Separate repo |
| **Cross-repo features** | Not supported | Primary use case |
| **Team coordination** | Per-repo | Centralized |
| **Complexity** | Low | Medium |

**Choose embedded** for single repo projects.
**Choose polyrepo** for multi-repo coordination.

## Next Steps

- [Workflows](./workflows.md) - Using commands across repos
- [Configuration](./configuration.md) - Configure your setup
- [Concepts](./concepts.md) - Understanding the architecture
