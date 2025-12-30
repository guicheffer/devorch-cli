---
domain: styling
description: Zest design system with useZestStyles hook, theme-based styling with token system, conditional styles, and typography components
---

# Styling with Zest Design System

Style components using the Zest design system via useZestStyles hook with theme tokens for colors, spacing, typography, and design values. All styles are theme-aware and support light/dark mode switching.

## Core Patterns

### 1. Zest Design System with useZestStyles Hook

**Pattern:** All components use the Zest design system via the useZestStyles hook. Styles are defined in separate style config objects and applied through the hook, which handles theme switching and responsive design.

**Example from PR #2213:**
```typescript
import { useZestStyles, Text } from '@zest/react-native';
import { stylesConfig } from './styles';

export const OnboardingScreen = ({ navigation }: Props) => {
  const styles = useZestStyles(stylesConfig);

  return (
    <View style={styles.container}>
      <Text type="headline-lg" style={styles.headlineText}>
        {headline}
      </Text>

      <View style={styles.content}>
        <Text type="body-lg-regular">{description}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <Button style={styles.button} onPress={handleNext}>
          Next
        </Button>
      </View>
    </View>
  );
};
```

**Styles file (styles.ts):**
```typescript
// styles.ts
import { createStyles } from '@zest/react-native';

export const stylesConfig = createStyles((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
    paddingHorizontal: theme.spacing.lg,
  },
  headlineText: {
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer: {
    paddingBottom: theme.spacing.xl,
  },
  button: {
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
  },
}));
```

**Frequency:** 100% of styled components

**Why:** useZestStyles provides:
- Automatic theme switching (light/dark mode)
- Consistent design tokens across app
- Type-safe style definitions
- Responsive design support
- Better performance (styles are memoized)

**Guidelines:**
- Always use useZestStyles hook in components
- Define styles in separate styles.ts file
- Access theme tokens through theme parameter
- Never use inline styles or StyleSheet.create
- Co-locate styles file with component file

### 2. Theme-based Styling with Token System

**Pattern:** Styles access theme tokens for colors, spacing, typography, and other design values. This ensures consistency and enables theme switching (light/dark mode).

**Example from PR #2311:**
```typescript
export const stylesConfig = createStyles((theme) => ({
  container: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginVertical: theme.spacing.md,
  },
  title: {
    ...theme.typography.headline.md,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  description: {
    ...theme.typography.body.regular,
    color: theme.colors.text.secondary,
    lineHeight: 24,
  },
  button: {
    backgroundColor: theme.colors.brand.primary,
    borderRadius: theme.borderRadius.sm,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  buttonText: {
    color: theme.colors.text.inverse,
    ...theme.typography.button.md,
  },
}));
```

**Available theme tokens:**
```typescript
// Colors
theme.colors.background.primary
theme.colors.background.secondary
theme.colors.background.tertiary
theme.colors.text.primary
theme.colors.text.secondary
theme.colors.text.tertiary
theme.colors.text.inverse
theme.colors.brand.primary
theme.colors.brand.secondary
theme.colors.success.primary
theme.colors.error.primary
theme.colors.warning.primary
theme.colors.border.primary
theme.colors.border.secondary

// Spacing (numbers in points)
theme.spacing.xxs  // 2
theme.spacing.xs   // 4
theme.spacing.sm   // 8
theme.spacing.md   // 16
theme.spacing.lg   // 24
theme.spacing.xl   // 32
theme.spacing.xxl  // 48

// Border Radius
theme.borderRadius.sm   // 4
theme.borderRadius.md   // 8
theme.borderRadius.lg   // 12
theme.borderRadius.xl   // 16
theme.borderRadius.full // 999

// Typography
theme.typography.headline.lg
theme.typography.headline.md
theme.typography.headline.sm
theme.typography.body.lg
theme.typography.body.regular
theme.typography.body.sm
theme.typography.button.lg
theme.typography.button.md
theme.typography.button.sm
theme.typography.caption

// Shadows (iOS + Android elevation)
theme.shadows.sm
theme.shadows.md
theme.shadows.lg
```

**Frequency:** 100% of style definitions

**Guidelines:**
- Always use theme tokens instead of hardcoded values
- Use theme.colors for all color values
- Use theme.spacing for margins, padding, gaps
- Use theme.typography spread operator for text styles
- Use theme.borderRadius for rounded corners
- Use theme.shadows for elevation effects

### 3. Conditional Styling with Style Arrays

**Pattern:** Conditional styles are applied using style arrays, combining base styles with conditional style objects based on component state or props.

**Example from PR #2213:**
```typescript
export const stylesConfig = createStyles((theme) => ({
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.border.secondary,
    marginHorizontal: theme.spacing.xs,
  },
  progressDotActive: {
    backgroundColor: theme.colors.brand.primary,
    width: 24,
  },
  progressDotDisabled: {
    opacity: 0.5,
  },
}));

// Component usage
<View
  style={[
    styles.progressDot,
    index === currentScreen && styles.progressDotActive,
    disabled && styles.progressDotDisabled,
  ]}
/>
```

**Multiple conditional styles:**
```typescript
export const stylesConfig = createStyles((theme) => ({
  button: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: theme.colors.brand.primary,
  },
  buttonSecondary: {
    backgroundColor: theme.colors.background.secondary,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonFullWidth: {
    width: '100%',
  },
}));

// Component usage
<TouchableOpacity
  style={[
    styles.button,
    variant === 'primary' ? styles.buttonPrimary : styles.buttonSecondary,
    disabled && styles.buttonDisabled,
    fullWidth && styles.buttonFullWidth,
  ]}
  disabled={disabled}
>
  <Text>{label}</Text>
</TouchableOpacity>
```

**Frequency:** 95% of components with state-based styling

**Guidelines:**
- Use array syntax for combining styles
- Place base styles first in array
- Use conditional expressions (&&, ternary) for conditional styles
- Keep conditional logic simple and readable
- Avoid deeply nested ternaries (extract to variable if complex)

### 4. Zest Typography Components

**Pattern:** Text rendering uses Zest Typography components with predefined type variants instead of inline styles. Variants like headline-lg, body-md-regular, body-sm-bold are used for consistency.

**Example from PR #2213:**
```typescript
import { Text } from '@zest/react-native';

<View>
  <Text type="headline-lg" style={styles.headlineText}>
    {translateRaw('social-recipe-bridge.onboarding.screen1.headline')}
  </Text>

  <Text type="body-lg-regular" style={styles.subHeadlineText}>
    {translateRaw('social-recipe-bridge.onboarding.screen1.sub_headline')}
  </Text>

  <Text type="body-md-regular" style={styles.description}>
    {description}
  </Text>

  <Text type="body-sm-bold" style={styles.label}>
    {label}
  </Text>

  <Text type="caption" style={styles.caption}>
    {captionText}
  </Text>
</View>
```

**Available typography variants:**
```typescript
// Headlines
<Text type="headline-lg">Large Headline</Text>      // 32px, bold
<Text type="headline-md">Medium Headline</Text>     // 24px, bold
<Text type="headline-sm">Small Headline</Text>      // 20px, bold

// Body text
<Text type="body-lg-regular">Large Body</Text>      // 18px, regular
<Text type="body-lg-bold">Large Body Bold</Text>    // 18px, bold
<Text type="body-md-regular">Regular Body</Text>    // 16px, regular
<Text type="body-md-bold">Regular Body Bold</Text>  // 16px, bold
<Text type="body-sm-regular">Small Body</Text>      // 14px, regular
<Text type="body-sm-bold">Small Body Bold</Text>    // 14px, bold

// Special
<Text type="button-lg">Button Large</Text>          // 18px, semibold
<Text type="button-md">Button Medium</Text>         // 16px, semibold
<Text type="button-sm">Button Small</Text>          // 14px, semibold
<Text type="caption">Caption</Text>                 // 12px, regular
<Text type="overline">Overline</Text>               // 10px, uppercase
```

**Frequency:** 100% of text rendering

**Guidelines:**
- Always use Zest Text component, never React Native Text directly
- Choose appropriate type variant for semantic meaning
- Use additional style prop for spacing/color adjustments
- Don't override font size or weight in style prop
- Use headline variants for titles/headers
- Use body variants for paragraphs and descriptions

### 5. Layout Patterns with Flexbox

**Pattern:** Use Flexbox for layouts with theme-based spacing. Common patterns include vertical stacks, horizontal rows, and centered containers.

**Vertical stack pattern:**
```typescript
export const stylesConfig = createStyles((theme) => ({
  verticalStack: {
    gap: theme.spacing.md, // React Native 0.71+
  },
  // Fallback for older React Native versions
  verticalStackItem: {
    marginBottom: theme.spacing.md,
  },
}));

// With gap (React Native 0.71+)
<View style={styles.verticalStack}>
  <Card />
  <Card />
  <Card />
</View>

// Fallback without gap
<View>
  <View style={styles.verticalStackItem}><Card /></View>
  <View style={styles.verticalStackItem}><Card /></View>
  <View><Card /></View> {/* Last item no margin */}
</View>
```

**Horizontal row pattern:**
```typescript
export const stylesConfig = createStyles((theme) => ({
  horizontalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  spaceBetween: {
    justifyContent: 'space-between',
  },
  centered: {
    justifyContent: 'center',
  },
}));

// Space between
<View style={[styles.horizontalRow, styles.spaceBetween]}>
  <Text>Left</Text>
  <Text>Right</Text>
</View>

// Centered
<View style={[styles.horizontalRow, styles.centered]}>
  <Icon name="star" />
  <Text>Centered Content</Text>
</View>
```

**Centered container:**
```typescript
export const stylesConfig = createStyles((theme) => ({
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
}));

<View style={styles.centeredContainer}>
  <Text type="headline-md">Centered Content</Text>
</View>
```

**Frequency:** 100% of layout code

**Guidelines:**
- Use flexDirection: 'row' for horizontal layouts
- Use flexDirection: 'column' (default) for vertical layouts
- Use gap for spacing between items (React Native 0.71+)
- Use theme.spacing values for all spacing
- Use flex: 1 to fill available space
- Use alignItems and justifyContent for positioning

### 6. Card and Container Patterns

**Pattern:** Cards and containers use theme-based background colors, border radius, shadows, and padding.

**Card pattern:**
```typescript
export const stylesConfig = createStyles((theme) => ({
  card: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.md,
  },
  cardWithBorder: {
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
}));

<View style={styles.card}>
  <Text type="headline-sm">Card Title</Text>
  <Text type="body-md-regular">Card content goes here</Text>
</View>
```

**Section container:**
```typescript
export const stylesConfig = createStyles((theme) => ({
  section: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionContent: {
    gap: theme.spacing.sm,
  },
}));

<View style={styles.section}>
  <View style={styles.sectionHeader}>
    <Text type="headline-md">Section Title</Text>
    <Button variant="text">View All</Button>
  </View>

  <View style={styles.sectionContent}>
    {/* Section content */}
  </View>
</View>
```

**Frequency:** 95% of container components

**Guidelines:**
- Use theme.shadows for elevation effects
- Use theme.borderRadius for rounded corners
- Use theme.colors.background for container backgrounds
- Add borders with theme.colors.border
- Use consistent padding (theme.spacing.lg for cards)

## Implementation Guidelines

### Style File Organization

**Co-locate styles with components:**
```
src/features/onboarding/
├── OnboardingScreen.tsx
├── styles.ts                  # Styles for OnboardingScreen
├── components/
│   ├── ProgressIndicator.tsx
│   ├── progress-indicator-styles.ts
│   ├── OnboardingSlide.tsx
│   └── onboarding-slide-styles.ts
```

**Shared styles in separate file:**
```
src/styles/
├── common.ts                  # Common style patterns
├── layout.ts                  # Layout helpers
└── spacing.ts                 # Spacing utilities
```

### Platform-Specific Styles

**Platform.select for platform differences:**
```typescript
import { Platform } from 'react-native';

export const stylesConfig = createStyles((theme) => ({
  shadow: Platform.select({
    ios: {
      shadowColor: theme.colors.text.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    android: {
      elevation: 5,
    },
    default: {},
  }),
  buttonHeight: {
    height: Platform.select({
      ios: 44,
      android: 48,
      default: 44,
    }),
  },
}));
```

### Responsive Styles with Dimensions

**Adapt to screen size:**
```typescript
import { Dimensions } from 'react-native';

export const stylesConfig = createStyles((theme) => {
  const { width } = Dimensions.get('window');
  const isSmallScreen = width < 375;

  return {
    container: {
      paddingHorizontal: isSmallScreen ? theme.spacing.md : theme.spacing.lg,
    },
    headline: {
      fontSize: isSmallScreen ? 24 : 32,
    },
  };
});
```

### Style Composition Helpers

**Reusable style mixins:**
```typescript
// styles/mixins.ts
import { Theme } from '@zest/react-native';

export const createCardStyle = (theme: Theme) => ({
  backgroundColor: theme.colors.background.secondary,
  borderRadius: theme.borderRadius.lg,
  padding: theme.spacing.lg,
  ...theme.shadows.md,
});

export const createButtonStyle = (theme: Theme) => ({
  paddingVertical: theme.spacing.md,
  paddingHorizontal: theme.spacing.lg,
  borderRadius: theme.borderRadius.md,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
});

// Usage in component
import { createCardStyle, createButtonStyle } from '@/styles/mixins';

export const stylesConfig = createStyles((theme) => ({
  card: createCardStyle(theme),
  button: createButtonStyle(theme),
}));
```

### Testing Styled Components

**Test style application:**
```typescript
import { render } from '@testing-library/react-native';
import { OnboardingScreen } from './OnboardingScreen';

describe('OnboardingScreen Styles', () => {
  it('applies correct container styles', () => {
    const { getByTestId } = render(<OnboardingScreen />);
    const container = getByTestId('onboarding-container');

    expect(container.props.style).toMatchObject({
      flex: 1,
      backgroundColor: expect.any(String),
    });
  });

  it('applies active state styles', () => {
    const { getByTestId } = render(<OnboardingScreen currentScreen={0} />);
    const dot = getByTestId('progress-dot-0');

    expect(dot.props.style).toContainEqual(
      expect.objectContaining({
        backgroundColor: expect.any(String), // Active color
        width: 24,
      })
    );
  });
});
```

## Anti-Patterns to Avoid

❌ **Don't use inline styles:**
```typescript
// ❌ Bad - inline styles
<View style={{
  backgroundColor: '#fff',
  padding: 16,
  marginTop: 8,
  borderRadius: 8
}}>
  <Text>Content</Text>
</View>
```

✅ **Use Zest theme tokens:**
```typescript
// ✅ Good - theme-based styles
const styles = useZestStyles(stylesConfig);

<View style={styles.container}>
  <Text>Content</Text>
</View>

// styles.ts
export const stylesConfig = createStyles((theme) => ({
  container: {
    backgroundColor: theme.colors.background.primary,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
}));
```

❌ **Don't hardcode colors:**
```typescript
// ❌ Bad - hardcoded colors
backgroundColor: '#FFFFFF',
color: '#000000',
borderColor: 'rgba(0, 0, 0, 0.1)',
```

✅ **Use theme colors:**
```typescript
// ✅ Good - theme colors
backgroundColor: theme.colors.background.primary,
color: theme.colors.text.primary,
borderColor: theme.colors.border.primary,
```

❌ **Don't use StyleSheet.create:**
```typescript
// ❌ Bad - StyleSheet.create doesn't have theme access
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff', // Can't access theme
  },
});
```

✅ **Use createStyles:**
```typescript
// ✅ Good - createStyles provides theme access
import { createStyles } from '@zest/react-native';

export const stylesConfig = createStyles((theme) => ({
  container: {
    backgroundColor: theme.colors.background.primary,
  },
}));
```

❌ **Don't use Text component from react-native:**
```typescript
// ❌ Bad - using React Native Text
import { Text } from 'react-native';

<Text style={{ fontSize: 24, fontWeight: 'bold' }}>
  Title
</Text>
```

✅ **Use Zest Text component:**
```typescript
// ✅ Good - using Zest Text with type variant
import { Text } from '@zest/react-native';

<Text type="headline-lg">
  Title
</Text>
```

## Related Implementers

- **react-native-components.md** - Components that use Zest styles
- **typescript.md** - TypeScript patterns for type-safe styles
- **accessibility.md** - Accessible styling patterns
- **platform-specific.md** - Platform-specific style adaptations
