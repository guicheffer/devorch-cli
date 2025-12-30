---
domain: styling-design-system
description: Verify correct usage of Zest design system, design tokens, and consistent styling patterns
---

# Styling and Design System Verification

Verify that implementation follows Zest design system patterns, uses design tokens correctly, and maintains visual consistency.

## Verification Checklist

### 1. Zest Component Usage

**Requirement:** All UI components must use Zest design system components, not native HTML or custom styled components.

**Verification Steps:**

✅ **Check component imports:**
```typescript
// ✅ Required
import { Box, Text, Button } from '@/libs/zest';
import { Card, Stack, Divider } from '@/libs/zest';

// ❌ Should not see these in new code
import styled from 'styled-components';
const CustomDiv = styled.div`...`;
```

✅ **Verify all layout uses Zest Box:**
```typescript
// ✅ Correct
<Box display="flex" flexDirection="column" gap="global.sm-2">
  <Text type="body-lg-bold">Title</Text>
</Box>

// ❌ Incorrect
<div className="container">
  <h2>Title</h2>
</div>
```

✅ **Verify all text uses Zest Text:**
```typescript
// ✅ Correct
<Text type="body-md-regular">Description text</Text>
<Text type="heading-lg">Section Title</Text>

// ❌ Incorrect
<p>Description text</p>
<h1>Section Title</h1>
```

✅ **Verify buttons use Zest Button variants:**
```typescript
// ✅ Correct
<Button.Primary size="md" onClick={handleClick}>
  Submit
</Button.Primary>
<Button.Secondary size="sm">Cancel</Button.Secondary>

// ❌ Incorrect
<button className="primary-button">Submit</button>
```

**How to Verify:**
```bash
# Check for non-Zest components in new files
grep -r "import.*from 'styled-components'" app/
grep -r "<div className=" app/features/new-feature/
grep -r "<p>" app/features/new-feature/
grep -r "<h[1-6]>" app/features/new-feature/
```

**Expected Result:** No matches in new code. All UI should use Zest components.

---

### 2. Design Token Usage

**Requirement:** All spacing, colors, and typography must use design tokens, not hardcoded values.

**Verification Steps:**

✅ **Check spacing uses tokens:**
```typescript
// ✅ Correct - using design tokens
<Box
  marginTop="global.md-1"
  marginBottom="global.md-3"
  padding="global.sm-2"
  gap="global.xs"
>

// ❌ Incorrect - hardcoded values
<Box
  marginTop="20px"
  marginBottom="40px"
  padding="16px"
  gap="8px"
>
```

**Valid Spacing Tokens:**
- `global.xs` (4px)
- `global.sm-1` (8px)
- `global.sm-2` (12px)
- `global.md-1` (16px)
- `global.md-2` (20px)
- `global.md-3` (24px)
- `global.lg-1` (32px)
- `global.lg-2` (40px)
- `global.xl` (48px)

✅ **Check colors use semantic tokens:**
```typescript
// ✅ Correct - semantic color tokens
<Text color="shared-alias.neutral.foreground.default">Normal text</Text>
<Text color="shared-alias.negative.foreground.default">Error text</Text>
<Box backgroundColor="global.gray.100">Background</Box>

// ❌ Incorrect - hardcoded hex colors
<Text color="#333333">Normal text</Text>
<Text color="#FF0000">Error text</Text>
<Box backgroundColor="#F5F5F5">Background</Box>
```

**Valid Color Token Prefixes:**
- `shared-alias.neutral.*` - Neutral colors
- `shared-alias.negative.*` - Error/danger states
- `shared-alias.positive.*` - Success states
- `shared-alias.warning.*` - Warning states
- `global.gray.*` - Gray scale (100-900)
- `global.brand.*` - Brand colors

✅ **Check typography uses type prop:**
```typescript
// ✅ Correct - using Text component with type
<Text type="heading-xl">Large Heading</Text>
<Text type="body-lg-bold">Bold Body Text</Text>
<Text type="body-md-regular">Regular Body Text</Text>
<Text type="body-sm-regular">Small Text</Text>

// ❌ Incorrect - custom fontSize/fontWeight
<Text fontSize="24px" fontWeight="700">Large Heading</Text>
<span style={{ fontSize: '16px', fontWeight: 400 }}>Regular Text</span>
```

**Valid Typography Types:**
- `heading-xl`, `heading-lg`, `heading-md`, `heading-sm`
- `body-lg-bold`, `body-lg-regular`
- `body-md-bold`, `body-md-regular`
- `body-sm-bold`, `body-sm-regular`
- `body-xs-regular`

**How to Verify:**
```bash
# Check for hardcoded values
grep -r "margin.*px" app/features/new-feature/
grep -r "padding.*px" app/features/new-feature/
grep -r "gap.*px" app/features/new-feature/
grep -r "color.*#[0-9a-fA-F]" app/features/new-feature/
grep -r "fontSize=" app/features/new-feature/
grep -r "fontWeight=" app/features/new-feature/
```

**Expected Result:** No hardcoded pixel values, hex colors, or font properties in new code.

---

### 3. Responsive Design Patterns

**Requirement:** Components must be responsive using Zest's responsive array syntax.

**Verification Steps:**

✅ **Check responsive spacing:**
```typescript
// ✅ Correct - responsive array [mobile, tablet, desktop]
<Box
  padding={['global.sm-2', 'global.md-1', 'global.lg-1']}
  marginBottom={['global.md-1', 'global.md-2']}
>

// ❌ Incorrect - fixed spacing
<Box padding="global.lg-1" marginBottom="global.md-2">
```

✅ **Check responsive display:**
```typescript
// ✅ Correct - responsive display changes
<Box
  display={['block', 'flex']}
  flexDirection={['column', 'row']}
>

// ❌ Incorrect - fixed layout
<Box display="flex" flexDirection="row">
```

✅ **Check mobile-first approach:**
```typescript
// ✅ Correct - mobile first, then tablet/desktop overrides
<Box
  width={['100%', '50%', '33.33%']}
  fontSize={['body-sm-regular', 'body-md-regular']}
>
```

**How to Verify:**
1. Test implementation at mobile (375px), tablet (768px), and desktop (1200px) widths
2. Check that layout doesn't break at any breakpoint
3. Verify responsive arrays are used for spacing/sizing that changes across breakpoints

---

### 4. Conditional Styling

**Requirement:** Dynamic styling must use conditional expressions in props, not inline styles or classes.

**Verification Steps:**

✅ **Check conditional colors:**
```typescript
// ✅ Correct - conditional in prop
<Text
  color={
    hasError
      ? 'shared-alias.negative.foreground.default'
      : 'shared-alias.neutral.foreground.default'
  }
>
  {message}
</Text>

// ❌ Incorrect - inline style
<Text style={{ color: hasError ? 'red' : 'black' }}>
  {message}
</Text>
```

✅ **Check state-based styling:**
```typescript
// ✅ Correct - using Zest props
<Button.Primary
  backgroundColor={isActive ? 'brand.primary' : 'global.gray.300'}
  color={isActive ? 'white' : 'global.gray.600'}
>
  {label}
</Button.Primary>

// ❌ Incorrect - className toggle
<button className={isActive ? 'active' : 'inactive'}>
  {label}
</button>
```

**How to Verify:**
```bash
# Check for prohibited patterns
grep -r "style={{" app/features/new-feature/
grep -r "className=" app/features/new-feature/
```

**Expected Result:** No inline styles or className props in new code using Zest.

---

### 5. Icon Usage

**Requirement:** Icons must be imported from `@/libs/zest-support/icons/generated` with appropriate sizes.

**Verification Steps:**

✅ **Check icon imports:**
```typescript
// ✅ Correct - size-specific imports
import { CheckmarkOutline24 } from '@/libs/zest-support/icons/generated/24';
import { CloseOutline32 } from '@/libs/zest-support/icons/generated/32';

// ❌ Incorrect - custom SVG or external library
import { Check } from 'react-icons/fa';
import CheckIcon from './icons/check.svg';
```

✅ **Check icon sizes match design:**
- 16px icons for small UI elements
- 24px icons for buttons and inline text
- 32px icons for larger touch targets
- 48px icons for hero/feature sections

**How to Verify:**
```bash
# Check icon imports
grep -r "from '@/libs/zest-support/icons/generated" app/features/new-feature/
grep -r "from 'react-icons" app/features/new-feature/  # Should not exist
grep -r ".svg'" app/features/new-feature/  # Should not exist
```

---

### 6. Visual Consistency

**Requirement:** Implementation must match design system patterns for similar components.

**Verification Steps:**

✅ **Check component patterns match existing usage:**
- Compare new Card components with existing Card patterns
- Verify Button sizes and variants are consistent
- Check Text types match similar UI sections
- Verify spacing follows established patterns

✅ **Check common patterns:**

**Form Fields:**
```typescript
// Standard form field pattern
<Box display="flex" flexDirection="column" gap="global.xs">
  <Text type="body-sm-bold" as="label">
    Field Label
  </Text>
  <Input placeholder="Enter value" />
  {hasError && (
    <Text type="body-xs-regular" color="shared-alias.negative.foreground.default">
      {errorMessage}
    </Text>
  )}
</Box>
```

**Section Headers:**
```typescript
// Standard section header pattern
<Box marginBottom="global.md-2">
  <Text type="heading-lg" marginBottom="global.xs">
    Section Title
  </Text>
  <Text type="body-md-regular" color="global.gray.600">
    Section description text
  </Text>
</Box>
```

**Cards:**
```typescript
// Standard card pattern
<Card padding="global.md-2" borderRadius="global.md">
  <Box display="flex" flexDirection="column" gap="global.sm-2">
    {/* Card content */}
  </Box>
</Card>
```

---

### 7. Accessibility Requirements

**Requirement:** Zest components must be used with proper accessibility props.

**Verification Steps:**

✅ **Check ARIA labels on interactive elements:**
```typescript
// ✅ Correct
<Button.Primary aria-label="Close modal" onClick={handleClose}>
  <CloseOutline24 />
</Button.Primary>

<Box role="radiogroup" aria-label="Rating selection">
  {/* Radio buttons */}
</Box>
```

✅ **Check semantic HTML usage:**
```typescript
// ✅ Correct - using 'as' prop for semantic HTML
<Text type="heading-lg" as="h1">Page Title</Text>
<Text type="body-md-regular" as="p">Paragraph text</Text>
<Box as="nav">Navigation content</Box>
```

---

## Testing Verification

### Visual Regression Tests

```typescript
describe('Visual Design System Compliance', () => {
  it('should use only Zest components', () => {
    const { container } = render(<MyComponent />);

    // Should not have raw HTML elements
    expect(container.querySelector('div:not([class*="zest"])')).toBeNull();
    expect(container.querySelector('p')).toBeNull();
    expect(container.querySelector('h1')).toBeNull();
  });

  it('should use design tokens for spacing', () => {
    const { container } = render(<MyComponent />);

    // Check computed styles use token values
    const box = container.querySelector('[data-test-id="main-box"]');
    const styles = window.getComputedStyle(box);

    // Token values should be applied
    expect(['8px', '12px', '16px', '20px', '24px']).toContain(styles.padding);
  });
});
```

### Chromatic Snapshot Tests

If using Chromatic for visual regression:
```bash
# Run Chromatic to catch visual changes
npm run chromatic
```

Review snapshots for:
- ✅ Consistent spacing
- ✅ Correct color usage
- ✅ Typography matches design
- ✅ Responsive behavior

---

## Common Issues and Fixes

### Issue 1: Hardcoded Pixel Values

**Problem:**
```typescript
<Box padding="16px" margin="20px">
```

**Fix:**
```typescript
<Box padding="global.md-1" margin="global.md-2">
```

### Issue 2: Custom Styled Components

**Problem:**
```typescript
const CustomButton = styled.button`
  background: blue;
  padding: 16px;
`;
```

**Fix:**
```typescript
<Button.Primary size="md" backgroundColor="brand.primary">
```

### Issue 3: Inline Styles

**Problem:**
```typescript
<div style={{ color: isError ? 'red' : 'black' }}>
```

**Fix:**
```typescript
<Text
  color={
    isError
      ? 'shared-alias.negative.foreground.default'
      : 'shared-alias.neutral.foreground.default'
  }
>
```

### Issue 4: Inconsistent Responsive Design

**Problem:**
```typescript
<Box padding="global.lg-1"> {/* Same on all screens */}
```

**Fix:**
```typescript
<Box padding={['global.sm-2', 'global.md-1', 'global.lg-1']}>
```

---

## Verification Summary

**Before marking implementation as complete, verify:**

- [ ] All UI uses Zest components (no raw HTML)
- [ ] All spacing uses design tokens (no px values)
- [ ] All colors use semantic tokens (no hex codes)
- [ ] All typography uses Text component with type prop
- [ ] Responsive design uses array syntax for breakpoints
- [ ] Icons imported from zest-support with correct sizes
- [ ] Conditional styling uses prop expressions (no inline styles)
- [ ] Accessibility props are present (aria-label, role, as)
- [ ] Visual consistency with existing components
- [ ] No custom styled-components or CSS modules

**Related Verifiers:**
- **react-component-architecture.md** - Component structure verification
- **testing-practices.md** - Test coverage verification
- **typescript-patterns.md** - Type safety verification
