---
schema: command-multi-agent
name: /create-ux-spec-rn
description: Generate detailed React Native development instructions from a Figma design using Zest design system tokens and components.
mode: multi-agent
dependencies:
  skills:
    - figma-dev-mode-figma-researcher
    - ui-design-system-rn-zest-integration
    - ui-design-system-rn-zest-components
    - ui-design-system-rn-styling-patterns
    - ui-design-system-rn-responsive-design
    - ui-design-system-rn-images
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

# Create UX Spec (React Native)

## Purpose

Generate a detailed development specification document from a Figma design for React Native. This document maps all design tokens to Zest RN tokens (global.* and alias.*), identifies required components with their exact props, and provides implementation code with useZestStyles patterns.

**Use this command when:**
- A designer hands off a Figma design for React Native implementation
- You need to understand exactly how to build a design with Zest RN
- You want a reference document before starting implementation

## Instructions

1. Check prerequisites (Figma MCP installed)
2. Collect Figma URL from user
3. Extract design using Figma researcher skill
4. Map all tokens to Zest RN equivalents
5. Generate UX Spec document

{{partials.instructions-footer}}

## Workflow

### PHASE 0: Pre-checks

{{partials.setup}}

{{partials.figma-prerequisites}}

{{partials.collect-figma-url}}

{{partials.extract-design}}

### PHASE 3: Map to Zest RN Tokens

Map extracted values to Zest React Native tokens:

**Spacing tokens (global.spacing.*):**
| Figma Value | Zest Token |
|-------------|------------|
| 0px | global.spacing.none |
| 4px | global.spacing.xs |
| 8px | global.spacing.sm |
| 12px | global.spacing.md |
| 16px | global.spacing.lg |
| 24px | global.spacing.xl |
| 32px | global.spacing.xxl |

**Border radius tokens (global.borderRadius.*):**
| Figma Value | Zest Token |
|-------------|------------|
| 0px | global.borderRadius.none |
| 4px | global.borderRadius.sm |
| 8px | global.borderRadius.md |
| 12px | global.borderRadius.lg |
| 9999px | global.borderRadius.full |

**Color tokens (alias.color.*):**
| Figma Value | Zest Token |
|-------------|------------|
| Brand primary | alias.color.brand.background.default |
| Brand text | alias.color.brand.foreground.default |
| Neutral background | alias.color.neutral.background.default |
| Neutral text | alias.color.neutral.foreground.default |
| Error | alias.color.semantic.error.background |
| Success | alias.color.semantic.success.background |
| Warning | alias.color.semantic.warning.background |

**Typography tokens:**
| Figma Style | Zest Text Type |
|-------------|----------------|
| Headline XL | headline-xl |
| Headline LG | headline-lg |
| Headline MD | headline-md |
| Body LG Regular | body-lg-regular |
| Body MD Regular | body-md-regular |
| Body SM Regular | body-sm-regular |
| Body LG Bold | body-lg-bold |
| Body MD Bold | body-md-bold |
| Body SM Bold | body-sm-bold |

**Components mapping:**
| Figma Element | Zest Component |
|---------------|----------------|
| Primary button | Button (variant="primary") |
| Secondary button | Button (variant="secondary") |
| Text button | Button (variant="text") |
| Text styles | Text (type prop) |
| Icon | Icon (Name+Variant+Size format) |
| Icon button | IconButton / IconButtonToggle |
| Card | Card (variant: static/navigational/selectable) |
| Badge | Badge |
| Input | InputField |
| Text area | TextArea |
| Loading | Spinner |
| Message | InlineMessage |
| Tag | Tag / TagStatic / TagFilter |
| Image | ImageCloudinary |

### PHASE 4: Generate UX Spec Document

Create a markdown document with the following structure:

```markdown
# UX Spec: [Design Name]

**Figma:** [FIGMA_URL]
**Generated:** [DATE]
**Platform:** React Native (Zest)

---

{{partials.component-tree}}

---

## Design Tokens

### Colors
| Usage | Figma Value | Zest Token |
|-------|-------------|------------|
| Background | #FFFFFF | alias.color.neutral.background.default |
| Primary action | #1A73E8 | alias.color.brand.background.default |
| ... | ... | ... |

### Spacing
| Usage | Figma Value | Zest Token |
|-------|-------------|------------|
| Container padding | 24px | global.spacing.xl |
| Element gap | 16px | global.spacing.lg |
| ... | ... | ... |

### Typography
| Usage | Figma Style | Zest Text Type |
|-------|-------------|----------------|
| Heading | 24px Bold | headline-lg |
| Body | 16px Regular | body-md-regular |
| ... | ... | ... |

### Border Radius
| Usage | Figma Value | Zest Token |
|-------|-------------|------------|
| Card corners | 8px | global.borderRadius.md |
| Button corners | 4px | global.borderRadius.sm |
| ... | ... | ... |

---

## Components

### [Component Name]

**Zest Component:** `Button`

**Props:**
- variant: "primary"
- size: "md"
- appearance: "brand"
- testID: "component-button"

**Code:**
```tsx
<Button
  variant="primary"
  size="md"
  appearance="brand"
  testID="component-button"
  onPress={handlePress}
>
  Button Label
</Button>
```

### [Icon Example]

**Zest Component:** `Icon`

**Props:**
- icon: HeartOutline24
- altText: "Like"

**Code:**
```tsx
import { HeartOutline24 } from '@zest/react-native';

<Icon icon={HeartOutline24} altText="Like" />
```

[Repeat for each component]

---

## Layout Structure with useZestStyles

```tsx
// Extract styles config OUTSIDE component for performance
const stylesConfig = createStylesConfig((theme) => ({
  container: {
    flex: 1,
    padding: theme.global.spacing.lg,
    backgroundColor: theme.alias.color.neutral.background.default,
  },
  header: {
    marginBottom: theme.global.spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: theme.global.spacing.sm,
  },
  card: {
    padding: theme.global.spacing.md,
    borderRadius: theme.global.borderRadius.md,
  },
}));

// Inside component
const Component = () => {
  const styles = useZestStyles(stylesConfig);

  return (
    <View style={styles.container}>
      <Text type="headline-lg" style={styles.header}>Title</Text>
      <View style={styles.row}>
        <Button variant="primary" testID="primary-btn">Primary</Button>
        <Button variant="secondary" testID="secondary-btn">Secondary</Button>
      </View>
      <Card variant="static" style={styles.card}>
        <Text type="body-md-regular">Card content</Text>
      </Card>
    </View>
  );
};
```

---

## Responsive Considerations

Use `useWindowDimensions` for responsive layouts:

```tsx
import { useWindowDimensions } from 'react-native';

const Component = () => {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;

  const stylesConfig = createStylesConfig((theme) => ({
    container: {
      padding: isTablet ? theme.global.spacing.xl : theme.global.spacing.md,
      flexDirection: isTablet ? 'row' : 'column',
    },
  }));

  const styles = useZestStyles(stylesConfig);
  // ...
};
```

**Device size support:**
- iPhone SE (375px) to iPad (1024px+)
- Portrait and landscape orientation
- fontScale awareness for accessibility

---

## Image Handling

Use `ImageCloudinary` for all images:

```tsx
<ImageCloudinary
  src="https://res.cloudinary.com/yourcompany/image/upload/..."
  quality="auto:eco"
  width={width}
  height={Math.round(width * 0.5625)} // 16:9 aspect ratio
  alt="Description"
  testID="hero-image"
/>
```

**Never use:**
- `require()` for images (causes bundle bloat)
- Non-Cloudinary URLs

---

{{partials.accessibility}}

---

## Implementation Notes

- [Any custom styling requirements]
- [Components not available in Zest RN]
- [Platform-specific considerations]

```

Save this document to `{{artifacts-path}}/ux-specs/[design-name]-rn.md`

## Report

After generating the spec:

```
UX Spec Generated Successfully

**File:** {{artifacts-path}}/ux-specs/[design-name]-rn.md

**Summary:**
- X design tokens mapped
- Y components identified
- Z custom implementations needed

**Next Steps:**
1. Review the generated spec document
2. Implement using the provided code patterns
3. Reference the spec during code review
```

{{partials.critical-rules}}
