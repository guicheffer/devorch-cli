# Create Specifications for: {{{FEATURE_NAME}}}

## Feature Description
{{{DESCRIPTION}}}

## Your Task
You are tasked with creating detailed specifications for this feature. Follow these steps:

### 1. Clarify Requirements
Before investigating the codebase, **use the AskUserQuestion tool** to resolve any ambiguity about the feature:
- Ask about unclear requirements or edge cases
- Confirm assumptions about scope and behavior
- Clarify integration points or dependencies
- Understand priority of different aspects

Example questions to consider:
- "Should this feature support [X] or [Y] behavior?"
- "What should happen when [edge case] occurs?"
- "Should this integrate with [existing system]?"

**Important**: Ask all your clarifying questions upfront before diving into implementation details. Group related questions together to minimize back-and-forth.

### 2. Investigate the Codebase
After clarifying requirements:
- Explore the existing codebase structure
- Identify relevant files, patterns, and conventions
- Understand how similar features are implemented
- Note any dependencies or constraints

### 3. Write Specification Files
Create specification files in: `{{{SPECS_PATH}}}/`

Each spec file should include these sections:

#### **Overview**
- What this feature/component is
- High-level description of its purpose
- How it fits into the larger system

#### **Requirements**
- Detailed functional requirements
- Input/output specifications
- Edge cases to handle
- Performance requirements (if applicable)

#### **Acceptance Criteria**
Write acceptance criteria that are **verifiable and complete**. Each AC should include both the action AND its verification.

**BAD examples (incomplete):**
- [ ] Write unit tests
- [ ] Add error handling
- [ ] Create component

**GOOD examples (verifiable):**
- [ ] Unit tests written AND passing (`bun test` exits 0)
- [ ] Error handling implemented AND tested (invalid input returns 400)
- [ ] Component renders correctly AND matches design spec

Each criterion must answer: "How do I VERIFY this is done?"
- Include the success condition, not just the task
- Reference specific commands, outputs, or behaviors
- Cover both happy path and error cases

### 4. File Organization
Number spec files for clear ordering (00-, 01-, etc.):
- `{{{SPECS_PATH}}}/00-overview.md` - High-level feature overview
- `{{{SPECS_PATH}}}/01-[component-name].md` - Detailed specs for each component
- `{{{SPECS_PATH}}}/02-[another-component].md` - Additional components as needed
- `{{{SPECS_PATH}}}/NN-integration.md` - How components work together (last file)

### 5. Update PLAN.md
After creating specs, update `devorch/harness/{{{FEATURE_NAME}}}/PLAN.md` with tasks extracted from the specs.

Each task should have:
```markdown
### Task N: [Task Name]
- [ ] AC 1: [Action] AND [Verification] (e.g., "Tests written AND passing")
- [ ] AC 2: [Action] AND [Verification]
```

**Important:** Copy the acceptance criteria from specs into PLAN.md tasks. The loop uses PLAN.md to track progress.

### Important Guidelines
- Be specific and actionable
- Reference existing code patterns where relevant
- Include code examples where helpful
- Consider error handling and edge cases
- Keep acceptance criteria atomic and testable

---

## When You're Done

After creating all specification files, provide a brief summary of:
1. What spec files were created
2. Key decisions made based on user input
3. Any remaining open questions or considerations

Then instruct the user:
> **Specs complete!** Please type `/exit` or press `Ctrl+C` to close this session.
>
> Next steps:
> 1. Review the specs in `{{{SPECS_PATH}}}/`
> 2. Run `devorch harness loop {{{FEATURE_NAME}}}` to start implementation

---

Begin by asking clarifying questions about the feature requirements.
