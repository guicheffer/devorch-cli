---
schema: command-multi-agent
name: /design-change-web
description: Implement design changes to web applications based on Figma designs. Asks clarifying questions to pinpoint exact location, reads Figma specifications, finds implementation files, and verifies changes match designs using Chrome DevTools.
mode: multi-agent
dependencies:
  skills:
    - figma-dev-mode-figma-researcher
    - figma-dev-mode-figma-image-downloader
    - ui-design-system-web-zest-integration
    - ui-design-system-web-zest-components
    - ui-design-system-web-accessibility
    - ui-design-system-web-styled-components
  subagents: []
partials:
  setup: common/partials/commands/command-setup.md
  instructions-footer: common/partials/commands/standard-instructions-footer.md
---

# Design Change Web

## Purpose

Implement design changes to web applications based on Figma designs with careful clarification and verification. You act like the designers' gateway to doing technical changes!

## Instructions

1. Don't skip any phase, or step in the workflow
2. Always stop for user feedback, when requested

{{partials.instructions-footer}}

## Workflow

### PHASE 0: Pre-checks

{{partials.setup}}

### PHASE 1: Check prerequisites

Check `gh` CLI:

```bash
if ! command -v gh &> /dev/null; then
  echo "GitHub CLI (gh) not found"
  echo "Install: https://cli.github.com/"
  exit 1
fi
```

Check `gh` is properly authenticated:

```bash
if ! gh auth status &> /dev/null; then
  echo "GitHub CLI not authenticated"
  echo "Run: gh auth login"
  exit 1
fi
```

**STOP** and explain the user they need to have the `gh` CLI tool installed. You can help them with the install!

#### Optional Prerequisites

Check if `node` is installed:

```bash
if ! command -v node &> /dev/null; then
  echo "Node not found"
  echo "Install: https://nodejs.org/en/download"
  exit 1
fi
```

Check if `node` has the right version, using `node --version` and checking `package.json@engines`.

Check if `yarn` is installed:

```bash
if ! command -v yarn &> /dev/null; then
  echo "Yarn not found"
  echo "Install: https://yarnpkg.com/getting-started/install"
  exit 1
fi
```

**EXPLAIN** to the user that they need these CLI tools installed to run the web repository. You can help them with the install! This will make it easier to test.

Check whether the playwright or chrome devtools MCP is available, if the user has both `node` and `yarn`. If it's not available **STOP** and explain the user how to install it.

### PHASE 2: Collect input [INTERACTIVE]

We require the following from the user, ask them the questions one-by-one. The questions could have been answered as a part of $ARGS, if yes, then answer the question from that $ARGS input variable.

1. **Design Change**: We need the user to define the design change they want, this will be in the form of a description of the change like:

   "We want to change the color to primary.100"
   "We want to increase heading sizes to h2"

   Even better though is if the user adds a figma file in this case. The figma file link will look something like: `https://www.figma.com/design/rXFdAU9w1qCDKajA6MaxUo/-DRAFT--Onboarding?node-id=1-15326&t=0VD3WkaI5MB3kRdR-11`. Make sure the user selects a **frame**, not the full file.

2. **Change locality**: Where the change needs to be done, like on which page, and which element on that page. For example:

   "We want to change the main CTA button on the homepage"
   "We want to fix the headings on the deliveries pages"

   The user will run this command in the web repository, so every component there is web-based.

3. **Ticket number**: We need a JIRA ticket number for the Pull Request

### PHASE 3: Parse locality

Use the glob and grep tools to find the right locality within the repo. If you are presented with ambiguous localities, or more than one places where the designer would do the change, let's try to hone into just one place, with more clarifying questions, and presenting the user with the options you found.

**ONLY CONTINUE** to the next phase when we're sure about the locality of the change and we were able to hone into the exact locality of the change. This can be n+1 localities, if the user wants to do a sweeping change, usually it's just one single change though.

### PHASE 4: Parse design input

**WHEN**: Given a Figma file. Activate the `figma-dev-mode-figma-researcher` skill to research the given figma file. If the figma researcher fails download the screenshots by activating `figma-dev-mode-figma-image-downloader` skill.

Use the information distilled to formulate the exact design change that the user requires.

**PRESENT** the design change to the user, and ask whether this sounds good. Explain to the user what you can see, and **EXPECT** and **ASK** for feedback.

**WHEN**: Given a worded design change, continue to the next phase.

### PHASE 5: Implement

Activate all skills starting with `ui-design-system-web-`. Use these skills to apply the design change.

**CRITICAL RULES:**

1. **Use Zest components** - Box, Text, Button.Primary, IconButton, etc.:
   ```typescript
   // Correct - Zest components
   import { Box, Text, Button } from '@/libs/zest';

   <Box
     display="flex"
     flexDirection={['column', 'row']}
     padding="md-1"
     backgroundColor="neutral.100"
   >
     <Text type="body-md-bold" color="neutral.800">
       Heading
     </Text>
     <Button.Primary onClick={handleClick}>
       Submit
     </Button.Primary>
   </Box>

   // Wrong - custom div/styles
   <div style={{ display: 'flex', padding: '16px' }}>
   ```

2. **Use theme tokens for spacing and colors** - Never hardcode values:
   ```typescript
   // Correct - theme tokens
   <Box padding="md-1" color="neutral.800" backgroundColor="primary.100">

   // Wrong - hardcoded values
   <Box padding="16px" color="#333" backgroundColor="#e0f2f1">
   ```

3. **Use responsive array syntax** - [mobile, tablet, desktop]:
   ```typescript
   <Box
     width={['100%', '50%', '33.33%']}
     flexDirection={['column', 'row']}
     padding={['sm-1', 'md-1', 'lg-1']}
   >
   ```

4. **Use styled-components for custom styling** - When Zest props are insufficient:
   ```typescript
   import styled from 'styled-components';

   const CustomCard = styled.div`
     border-radius: ${({ theme }) => theme.radii['border-radius-md']};
     box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
   `;
   ```

**ALWAYS** follow the skills for implementation, it's important to always follow the principles of the design system.

**NEVER** do any changes to API state, local state, effects, or any business logic - this always _just_ needs to be a design change, nothing more!

**IMPORTANT**: When making changes, add a Figma reference comment at the top of modified files or functions:

```typescript
// Figma: [FIGMA_FILE_URL]
```

This creates traceability between code and design.

### PHASE 5b (OPTIONAL): Show changes locally

**WHEN**: User doesn't have `yarn` or `node`, skip to `PHASE 6`

**WHEN**: User has the prerequisites, run the web repository and open their change on `localhost:3000` using the playwright or chrome devtools MCP.

Help debug the rendering through reading the console output of the `yarn dev` process, and the console in the browser. The user is not technical so they need all the help here.

Ask the user to verify the changes before continuing to PHASE 6.

### PHASE 6: Create PR

Since we're not working with a dev, use the `gh` tool to create a new PR for them. Create a branch like this:

`feature/[TICKET_NUMBER]-[slug-of-change-description]`

For example: `feature/EPS-1000-change-button-size`

Then use the PR Template to create the PR. The title should start with [TICKET_NUMBER], in brackets:

```txt
[EPS-1000] Changing button size on homepage
```

### PHASE 7: Monitor GH Actions

Now you need to monitor the GH actions on the PR, at some point there will be a preview link generated. The UX designer can then use this preview link to see their change!

Keep waiting until some action fails, fix it for the user when it's something you can fix.

Common issues to fix automatically:
- TypeScript errors
- Linting errors (prettier, eslint)
- Test failures
- Import path issues

**ONLY QUIT AND SUCCEED** when all the checks are green.

## Report

Show the user what kind of change we did, and report:
- The PR link
- The preview URL (once available from CI)
- Summary of changes made
- Any design tokens/components used

## Critical Rules

**DO:**
- Use Zest components (Box, Text, Button.Primary) for ALL layout and typography
- Use theme tokens for spacing (`padding="md-1"`) and colors (`color="neutral.800"`)
- Use responsive array syntax for adaptive layouts
- Add Figma reference comments
- Follow the skills for implementation patterns
- Wait for user confirmation at interactive phases

**DON'T:**
- Modify business logic, API calls, or state management
- Use hardcoded colors, spacing, or typography values
- Use inline styles when Box props are available
- Create new custom components when Zest equivalents exist
- Skip accessibility requirements
