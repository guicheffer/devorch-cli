---
schema: command-multi-agent
name: /zest-check
description: Check Figma design file implementability for Zest design system. Runs analysis for both web and React Native platforms.
mode: multi-agent
dependencies:
  subagents:
    - design/zest-checker-web
    - design/zest-checker-rn
partials:
  setup: common/partials/commands/command-setup.md
  instructions-footer: common/partials/commands/standard-instructions-footer.md
---

# Zest Check

## Purpose

Check a Figma file's implementability using the Zest design system for **both platforms** (web and React Native). This command runs platform-specific subagents and combines their results.

## Instructions

1. Check prerequisites (Figma MCP)
2. Collect Figma input from user
3. Run both platform subagents in parallel
4. Present combined report

{{partials.instructions-footer}}

## Important: Platform Discrepancies

**Web and React Native implementations can have discrepancies.** The Zest design system has separate component libraries:

- **Web**: `@/libs/zest` with Box, Text, Button.Primary, styled-components patterns
- **React Native**: `@zest/react-native` with Button, Text, Icon, Card, useZestStyles

Some components exist in one platform but not the other. This check analyzes both platforms and highlights any discrepancies.

## Workflow

### PHASE 0: Pre-checks

{{partials.setup}}

User needs to have the Figma dev mode MCP installed!

**STOP** when it's not installed and tell the user how to install the Figma dev mode MCP.

### PHASE 1: Collect Figma Input [INTERACTIVE]

Collect figma file from the user.

The figma file link will look something like: `https://www.figma.com/design/rXFdAU9w1qCDKajA6MaxUo/-DRAFT--Onboarding?node-id=1-15326&t=0VD3WkaI5MB3kRdR-11`

Make sure the user selects a **frame**, not the full file. When they added a full file tell them this will result in too much context for the current LLM.

### PHASE 2: Run Platform Analysis

**Run both subagents in parallel:**

```
Task(subagent="design/zest-checker-web", prompt="Analyze this Figma design for Zest web implementability: [figma-link]")
Task(subagent="design/zest-checker-rn", prompt="Analyze this Figma design for Zest React Native implementability: [figma-link]")
```

Each subagent will:
1. Load platform-specific Zest skills as dependencies
2. Use Figma researcher to extract design tokens
3. Analyze token and component coverage
4. Check accessibility requirements
5. Return a detailed implementability report

### PHASE 3: Present Combined Report

Combine both subagent outputs into a single report:

#### 1. Implementability Scores

| Platform | Score | Status |
|----------|-------|--------|
| Web | X/10 | [status] |
| React Native | X/10 | [status] |

**Score guide:**
- **9-10** (Green): Fully implementable with existing Zest components
- **7-8** (Yellow): Mostly implementable, minor custom styling needed
- **5-6** (Orange): Partially implementable, some components missing
- **3-4** (Red): Significant gaps, many custom implementations needed
- **1-2** (Red): Major issues, most elements don't map to Zest

#### 2. Platform Discrepancies

Highlight any differences between web and RN:
- Components available in one platform but not the other
- Token differences
- Accessibility approach differences

#### 3. Web Analysis Summary

- Missing tokens
- Component mapping
- Accessibility findings

#### 4. React Native Analysis Summary

- Missing tokens
- Component mapping
- Accessibility findings

#### 5. Recommendations

Provide actionable recommendations for the UX designer to improve implementability on both platforms.

## Report

After all phases complete, display:

```
Zest Implementability Check Complete

**Scores:**
- Web: X/10
- React Native: X/10

**Key Findings:**
[Summary of major discrepancies and issues]

**Next Steps:**
1. Review platform discrepancies above
2. Address recommendations to improve implementability
3. Re-run /zest-check after making changes
```

## Critical Rules

**DO:**
- Run both platform subagents
- Highlight discrepancies between platforms
- Present findings clearly with the score table
- Provide platform-specific recommendations

**DON'T:**
- Load skills directly (subagents handle this)
- Skip either platform analysis
- Provide generic recommendations
