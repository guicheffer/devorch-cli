---
domain: styling-design-system
description: Using Zest design system with design tokens for spacing, colors, and typography
---

# Styling and Design System (Zest)

Apply the Zest design system for consistent, accessible, and maintainable styling across the application.

## Core Patterns

### 1. Zest Component Usage

**Pattern:** All UI components use Zest design system primitives imported from `@/libs/zest`.

**Example from PR #60695:**
```typescript
import { Box, Text, Button } from '@/libs/zest';

const NPSQuestion: React.FC<Props> = ({ question, selectedRating, onRatingSelect }) => {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      marginTop="global.md-1"
      marginBottom="global.md-3"
    >
      <Text textAlign="center">{question}</Text>

      <Box
        display="flex"
        gap="xs"
        justifyContent="center"
        flexWrap="wrap"
      >
        {numbers.map((number) => {
          const ButtonComponent = isSelected
            ? Button.Primary
            : Button.Secondary;

          return (
            <ButtonComponent key={number} size="sm">
              {number}
            </ButtonComponent>
          );
        })}
      </Box>
    </Box>
  );
};
```

**Frequency:** 95% of components

**Available Zest Components:**
- `Box` - Layout container
- `Text` - Typography
- `Button` - Interactive buttons (Primary, Secondary, Tertiary)
- `Input` - Form inputs
- `Divider` - Visual separators
- Icons from `@/libs/zest-support/icons`

### 2. Design Token Spacing

**Pattern:** Use design tokens for all spacing values. Never use arbitrary pixel values.

**Common Spacing Tokens:**
```typescript
// Global spacing scale
'global.xs'      // Extra small
'global.sm-1'    // Small-1
'global.sm-2'    // Small-2
'global.md-1'    // Medium-1
'global.md-2'    // Medium-2
'global.md-3'    // Medium-3
'global.lg-1'    // Large-1
```

**Example from PR #60724:**
```typescript
<Box
  display="flex"
  alignItems="center"
  justifyContent="space-between"
  mt="global.sm-2"  // ✅ Using design token
  gap="global.xs"
>
  <Text>Label</Text>
  <Text>Value</Text>
</Box>
```

**❌ Avoid:**
```typescript
<Box
  marginTop="16px"   // Don't use px
  padding={4}        // Don't use numbers
>
```

**Frequency:** 100% of styled components

### 3. Design Token Colors

**Pattern:** Use semantic color tokens for text and background colors.

**Common Color Tokens:**
```typescript
// Foreground colors
'shared-alias.neutral.foreground.default'
'shared-alias.neutral.foreground.subtle'
'shared-alias.negative.foreground.default'  // Red/error
'shared-alias.positive.foreground.default'  // Green/success

// Grays
'global.gray.600'
'global.gray.800'
```

**Example from PR #60724:**
```typescript
<Text
  type="body-sm-bold"
  color={
    hasDiscount
      ? 'shared-alias.negative.foreground.default'  // Red for discount
      : 'shared-alias.neutral.foreground.default'   // Default
  }
>
  {renderPrice(grandTotalFormatted)}
</Text>

<Text
  type="body-sm-regular"
  color="global.gray.600"  // Subtle gray for secondary text
  textDecorationLine="line-through"
>
  {renderPrice(finalPriceFormatted)}
</Text>
```

**Frequency:** 100% of colored text

### 4. Typography Types

**Pattern:** Use Zest typography types instead of custom font styling.

**Available Typography Types:**
```typescript
'heading-xl'
'heading-lg'
'heading-md'
'heading-sm'
'body-lg-bold'
'body-lg-regular'
'body-md-bold'
'body-md-regular'
'body-sm-bold'
'body-sm-regular'
'caption-bold'
'caption-regular'
```

**Example:**
```typescript
<Text type="heading-md">Section Title</Text>
<Text type="body-md-regular">Regular body text</Text>
<Text type="caption-regular" color="global.gray.600">
  Helper text
</Text>
```

### 5. Conditional Styling

**Pattern:** Change styling dynamically based on props or state using conditional expressions.

**Example from PR #60724:**
```typescript
<Text
  type="body-sm-bold"
  color={
    hasDiscount
      ? 'shared-alias.negative.foreground.default'
      : 'shared-alias.neutral.foreground.default'
  }
  data-test-id="order-review-section-final-total"
>
  {renderPrice(grandTotalFormatted, isFetchingPrices)}
</Text>
```

**For complex conditions:**
```typescript
const getBackgroundColor = () => {
  if (isError) return 'shared-alias.negative.background.default';
  if (isSuccess) return 'shared-alias.positive.background.default';
  return 'shared-alias.neutral.background.default';
};

<Box backgroundColor={getBackgroundColor()}>
  {/* content */}
</Box>
```

**Frequency:** 80% of interactive components

### 6. Icon Usage

**Pattern:** Import icons from `@/libs/zest-support/icons/generated/{size}`.

**Example from PR #60787:**
```typescript
import { SpeechBubbleOutline24 } from '@/libs/zest-support/icons/generated/24';
import { CheckCircle16 } from '@/libs/zest-support/icons/generated/16';

<Box display="flex" alignItems="center" gap="global.xs">
  <SpeechBubbleOutline24 />
  <Text>Contact Support</Text>
</Box>
```

**Available sizes:**
- `16` - Small icons
- `24` - Default icons
- `32` - Large icons

**Frequency:** 65% of components with icons

## Implementation Guidelines

### Layout Patterns

**Flexbox Column:**
```typescript
<Box
  display="flex"
  flexDirection="column"
  gap="global.sm-2"
>
  <Section1 />
  <Section2 />
</Box>
```

**Flexbox Row with Alignment:**
```typescript
<Box
  display="flex"
  alignItems="center"
  justifyContent="space-between"
  gap="global.xs"
>
  <Text>Label</Text>
  <Text>Value</Text>
</Box>
```

**Responsive Spacing:**
```typescript
<Box
  padding={['global.sm-2', 'global.md-1']}  // Mobile, Desktop
  marginTop={['global.xs', 'global.sm-1']}
>
  {/* content */}
</Box>
```

### Button Variants

```typescript
import { Button } from '@/libs/zest';

// Primary action
<Button.Primary onClick={handleSubmit}>
  Submit
</Button.Primary>

// Secondary action
<Button.Secondary onClick={handleCancel}>
  Cancel
</Button.Secondary>

// Tertiary/subtle action
<Button.Tertiary onClick={handleEdit}>
  Edit
</Button.Tertiary>

// With size
<Button.Primary size="sm">Small Button</Button.Primary>
```

### Accessibility

Always include proper semantic HTML and ARIA attributes:

```typescript
<Box role="region" aria-labelledby="section-title">
  <Text id="section-title" type="heading-md">
    Section Title
  </Text>
  {/* content */}
</Box>
```

## Zest Component Props

### Box Component

```typescript
type BoxProps = {
  // Layout
  display?: 'flex' | 'block' | 'inline-flex' | 'grid';
  flexDirection?: 'row' | 'column';
  alignItems?: 'center' | 'flex-start' | 'flex-end';
  justifyContent?: 'center' | 'space-between' | 'flex-start' | 'flex-end';
  gap?: DesignToken;

  // Spacing
  margin?: DesignToken;
  marginTop?: DesignToken;
  marginBottom?: DesignToken;
  marginLeft?: DesignToken;
  marginRight?: DesignToken;
  padding?: DesignToken;
  paddingTop?: DesignToken;
  // ... other padding

  // Colors
  backgroundColor?: ColorToken;

  // Accessibility
  role?: string;
  'aria-label'?: string;
  'data-test-id'?: string;
};
```

### Text Component

```typescript
type TextProps = {
  type?: TypographyType;
  color?: ColorToken;
  textAlign?: 'left' | 'center' | 'right';
  textDecorationLine?: 'none' | 'underline' | 'line-through';
  children: React.ReactNode;
};
```

## Related Libraries

- `@/libs/zest` - Zest design system components
- `@/libs/zest-support/icons` - Icon library

## Migration from Custom Styling

If converting from custom CSS/styled-components:

```typescript
// ❌ Old approach
const StyledDiv = styled.div`
  display: flex;
  margin-top: 16px;
  color: #666;
`;

// ✅ New approach with Zest
<Box display="flex" marginTop="global.sm-2">
  <Text color="global.gray.600">
    {content}
  </Text>
</Box>
```

## See Also

- **react-component-architecture** - For component structure
- **accessibility** - For ARIA patterns
- **typescript-patterns** - For typing Zest props
