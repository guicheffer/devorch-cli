---
schema: command-multi-agent
name: /create-ux-spec-web
description: Generate detailed web development instructions from a Figma design using Zest design system tokens and components.
mode: multi-agent
dependencies:
  skills:
    - figma-dev-mode-figma-researcher
    - ui-design-system-zest-web-integration
    - ui-design-system-zest-components
partials:
  setup: common/partials/commands/command-setup.md
  instructions-footer: common/partials/commands/standard-instructions-footer.md
  figma-prerequisites: design/partials/figma-prerequisites.md
  collect-figma-url: design/partials/collect-figma-url.md
  extract-design: design/partials/extract-design.md
  component-tree: design/partials/component-tree.md
  accessibility: design/partials/accessibility.md
  critical-rules: design/partials/critical-rules.md
---

# Create UX Spec (Web)

## Purpose

Generate a detailed development specification document from a Figma design. This document maps all design tokens to Zest web tokens, identifies required components with their exact props, and provides implementation code snippets.

**Use this command when:**
- A designer hands off a Figma design for web implementation
- You need to understand exactly how to build a design with Zest
- You want a reference document before starting implementation

## Instructions

1. Check prerequisites (Figma MCP installed)
2. Collect Figma URL from user
3. Extract design using Figma researcher skill
4. Map all tokens to Zest web equivalents
5. Generate UX Spec document

{{partials.instructions-footer}}

## Workflow

### PHASE 0: Pre-checks

{{partials.setup}}

{{partials.figma-prerequisites}}

{{partials.collect-figma-url}}

{{partials.extract-design}}

### PHASE 3: Map to Zest Tokens

Map extracted values to Zest web tokens:

**Spacing tokens:**
| Figma Value | Zest Token |
|-------------|------------|
| 0px | zero |
| 2px | xxs |
| 4px | xs |
| 8px | sm-1 |
| 12px | sm-2 |
| 16px | md-1 |
| 24px | md-2 |
| 32px | lg-1 |
| 48px | lg-2 |

**Color tokens:**
| Figma Value | Zest Token |
|-------------|------------|
| Brand blue | primary.600 |
| Error red | error.600 |
| Warning yellow | warning.600 |
| Success green | success.600 |
| Grays | neutral.100 - neutral.800 |

**Components mapping:**
| Figma Element | Zest Component |
|---------------|----------------|
| Primary button | Button.Primary |
| Secondary button | Button.Secondary |
| Text styles | Text with variant prop |
| Container/Frame | Box |
| Card | Card |
| Icon button | IconButton.Primary |

### PHASE 4: Generate UX Spec Document

Create a markdown document with the following structure:

```markdown
# UX Spec: [Design Name]

**Figma:** [FIGMA_URL]
**Generated:** [DATE]
**Platform:** Web (Zest)

---

{{partials.component-tree}}

---

## Design Tokens

### Colors
| Usage | Figma Value | Zest Token |
|-------|-------------|------------|
| Background | #FFFFFF | neutral.100 |
| Primary action | #1A73E8 | primary.600 |
| ... | ... | ... |

### Spacing
| Usage | Figma Value | Zest Token |
|-------|-------------|------------|
| Container padding | 24px | md-2 |
| Element gap | 16px | md-1 |
| ... | ... | ... |

### Typography
| Usage | Figma Style | Zest Variant |
|-------|-------------|--------------|
| Heading | 24px Bold | headline-lg |
| Body | 16px Regular | body-md-regular |
| ... | ... | ... |

---

## Components

### [Component Name]

**Zest Component:** `Button.Primary`

**Props:**
- size: "md"
- onClick: handler

**Code:**
```tsx
<Button.Primary size="md" onClick={handleClick}>
  Button Label
</Button.Primary>
```

[Repeat for each component]

---

## Layout Structure

```tsx
<Box display="flex" flexDirection="column" gap="md-1" p="md-2">
  <Text variant="headline-lg">Title</Text>
  <Box display="flex" gap="sm-2">
    <Button.Primary>Primary</Button.Primary>
    <Button.Secondary>Secondary</Button.Secondary>
  </Box>
  <Card>
    <Box p="md-1">
      <Text variant="body-md-regular">Card content</Text>
    </Box>
  </Card>
</Box>
```

---

## Responsive Considerations

- **Mobile** [< 768px]: [adjustments]
- **Tablet** [768px - 1024px]: [adjustments]
- **Desktop** [> 1024px]: [default layout]

Use responsive arrays: `[mobile, tablet, desktop]`

Example:
```tsx
<Box
  display="flex"
  flexDirection={["column", "column", "row"]}
  gap={["sm-2", "md-1", "md-2"]}
>
```

---

{{partials.accessibility}}

---

## Implementation Notes

- [Any custom styling requirements]
- [Components not available in Zest]
- [Accessibility considerations]

```

Save this document to `{{artifacts-path}}/ux-specs/[design-name]-web.md`

## Report

After generating the spec:

```
UX Spec Generated Successfully

**File:** {{artifacts-path}}/ux-specs/[design-name]-web.md

**Summary:**
- X design tokens mapped
- Y components identified
- Z custom implementations needed

**Next Steps:**
1. Review the generated spec document
2. Use /design-change-web to implement the design
3. Reference the spec during code review
```

{{partials.critical-rules}}
