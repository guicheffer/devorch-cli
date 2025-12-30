# Working with DevOrch

## When to Use Spec-Driven Development

DevOrch is for **larger chunks of work** - epics and features requiring careful planning and execution across multiple repositories.

### The Development Spectrum

<img width="1497" height="914" alt="Untitled scene" src="https://github.com/user-attachments/assets/fbac4887-5a9d-45c8-a345-2c794d4caff0" />

```
Vibe Coding ←────── Agentic Coding ←────── Spec-Driven Development
(Quick)            (Tagged)              (Planned)
```

**Vibe Coding** - Quick, ad-hoc changes
- Example: "Change button color to red"
- Tools: Direct AI assistance in IDE

**Agentic Coding** - Targeted, context-aware work
- Example: `/load-context-training` then freeform prompting with domain context
- Tools: Load context training files, then natural language requests
- Benefit: Right standards without context overload

**Spec-Driven Development** - Comprehensive, planned work
- Example: User engagement feature across frontend and backend
- Tools: DevOrch CLI with profiles and workflows
- Benefit: Consistent implementation and verification across workspace

---

## Repository Setup

### Embedded Specs (Recommended for Single Repo)

Embed devorch **inside your repository** alongside code.

**Use when:**
- Working on single repository
- Want specs close to implementation
- Prefer simpler setup
- Solo or small team

**Structure:**
```
your-repository/
├── src/
├── .mcp.json
└── devorch/
    ├── config.yml
    ├── specs/
    └── standards/
```

### Polyrepo (For Cross-Repo Work)

Create **separate specs repository** with child repos in `workspace/`.

**Use when:**
- Multiple teams share specs
- Specs separated from implementation
- Single source of truth for cross-repo features
- Work spans frontend, backend, microservices

See [Polyrepo Setup Guide](./polyrepo.md) for details.

**This guide focuses on embedded specs** (simpler, more common).

---

## Getting Started

### 1. Install DevOrch

```bash
cd /path/to/your-repository
devorch install
```

Choose configuration options or manually select components. See [Configuration Guide](./configuration.md) for complete reference.

### 2. Configure Context Training (Optional)

Customize how devorch works for your repository with context training.

Run tech stack analysis:
```bash
/analyze-tech-stack
```

Then create context training:
```bash
/train-context
```

See [Context Training Guide](./context-training.md) for details.

---

## Understanding Roles

### Implementers

Agents that make changes. Each has:
- Specific areas of responsibility (UI, state, data access, etc.)
- Domain-specific customizations from context training
- Assigned verifier

**Why multiple?** Prevents context overload. Each agent sees only relevant knowledge → focused, accurate work.

### Verifiers

Agents that verify implementations. They:
- Verify against standards and requirements
- Use automation tools (Mobile MCP, Browser MCP, Figma MCP)
- Capture evidence (screenshots, test results)
- Document issues

**Why critical?** Without verifiers, AI guesses. With verifiers, AI proves work by testing in real browsers/apps and comparing with designs.

### Best Practices

1. Create focused implementers - One responsibility each
2. Define clear boundaries
3. Customize via context training - Domain-specific preferences
4. Always assign verifiers
5. Use automation tools - MCP servers for verification

---

## Configure MCP Servers (Optional)

For verifiers with automation tools, create `.mcp.json` in repository root:

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
    }
  }
}
```

**Common servers:** mobile-mcp, chrome-devtools, figma-dev-mode, ios-simulator, playwright, firecrawl-mcp, sequential-thinking

---

## Core Workflow

### 1. `/devorch:gather-requirements` - Research and Plan

Creates spec folder, conducts interactive research:
- Asks clarifying questions
- Collects visual assets
- Identifies similar features
- Documents requirements

**Claude Code:** `/devorch:gather-requirements`

### 2. `/devorch:create-spec` - Transform into Blueprint

Transforms requirements into specification:
- Writes detailed spec.md
- Breaks down into tasks.md by specialty
- Assigns implementer roles
- Verifies completeness

**Claude Code:** `/devorch:create-spec`

### 3. `/devorch:implement-spec` - Build from Blueprint

Executes implementation:
- Delegates to specialized implementers
- Reuses existing patterns
- Documents work
- Runs verification through verifiers
- Produces reports

**Claude Code:** `/devorch:implement-spec`

**Output structure:**
```
devorch/specs/2025-10-15-feature-name/
├── planning/
├── spec.md
├── tasks.md
├── implementation/
└── verification/
```

---

## Using Agentic Coding

For smaller, focused work, use `/load-context-training` then natural language requests:

```
/load-context-training

# Then make natural language requests:
Update the button styling to match the design system
Implement a GraphQL query for user preferences
Add tests for the auth flow
```

**Benefits:** Right context automatically, avoids overload, faster than full workflow, maintains consistency, no special syntax

**What gets loaded:** All implementer patterns, specification guidelines, and verification rules from your context training.

---

## Summary

### Setup
1. Install DevOrch
2. Choose preset or configure manually
3. Set up MCP servers (optional)

### Development
1. Use spec-driven for major features/epics
2. Use agentic coding (tags) for focused tasks
3. Use vibe coding for quick tweaks

### Key Points
- Spec-driven for epics, not small changes
- Implementers build, verifiers prove
- Specialized agents prevent context overload
- Share configurations with team

---

## Additional Resources

- [Main README](../../README.md)
- [Configuration Guide](./configuration.md) - Complete configuration reference
- [Context Training Guide](./context-training.md) - Repository customization
- [Polyrepo Setup](./polyrepo.md)
- [Skills Guide](./skills.md)
