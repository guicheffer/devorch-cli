---
domain: styling
description: Verify Zest design system usage, useZestStyles hook, theme tokens, conditional styles, and typography components
---

# Styling Verification

Verify that React Native styling implementations follow Zest design system patterns including useZestStyles hook, theme-based styling with tokens, conditional styles, and typography components.

## Verification Checklist

### 1. Zest Design System Integration

**Requirement:** All styling must use the Zest design system with useZestStyles hook, not raw StyleSheet or inline styles.

**Verification Steps:**

✅ **Check useZestStyles usage:**
```typescript
// ✅ Correct - using useZestStyles from Zest
import { useZestStyles } from '@yourcompany/zest-native';
import { stylesFn } from './Button.styles';

export const Button: React.FC<ButtonProps> = ({ variant, disabled }) => {
  const styles = useZestStyles(stylesFn);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        styles[variant],
        disabled && styles.disabled,
      ]}
    >
      <Text style={styles.label}>Press me</Text>
    </TouchableOpacity>
  );
};

// ❌ Incorrect - using raw StyleSheet
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    padding: 16,  // ❌ Hardcoded values instead of tokens
    backgroundColor: '#007AFF',  // ❌ Hardcoded colors
  },
});

// ❌ Incorrect - inline styles
<View style={{ padding: 16, backgroundColor: '#007AFF' }} />
```

✅ **Check styles file structure:**
```typescript
// ✅ Correct - styles file with theme tokens
// Button.styles.ts
import type { ZestStylesFn } from '@yourcompany/zest-native';

export const stylesFn: ZestStylesFn = ({ tokens, helpers }) => ({
  container: {
    paddingHorizontal: tokens.spacing.md,  // ✅ Using spacing tokens
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  primary: {
    backgroundColor: tokens.colors.primary,  // ✅ Using color tokens
  },

  secondary: {
    backgroundColor: tokens.colors.secondary,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },

  disabled: {
    opacity: 0.5,
  },

  label: {
    ...tokens.typography.buttonMedium,  // ✅ Using typography tokens
    color: tokens.colors.textInverse,
  },
});

// ❌ Incorrect - hardcoded values
export const styles = {
  container: {
    padding: 16,  // ❌ No tokens
    backgroundColor: '#007AFF',  // ❌ Hardcoded color
    borderRadius: 8,  // ❌ Hardcoded radius
  },
};
```

**How to Verify:**
```bash
# Check for useZestStyles usage
find src/components -name "*.tsx" | xargs grep "useZestStyles" | wc -l

# Check for raw StyleSheet.create (anti-pattern)
find src/components -name "*.tsx" | xargs grep "StyleSheet.create" && echo "❌ Found raw StyleSheet" || echo "✅ No raw StyleSheet"

# Check for inline style objects (anti-pattern)
find src/components -name "*.tsx" | xargs grep "style={{" && echo "❌ Found inline styles" || echo "✅ No inline styles"

# Check styles files use tokens
find src/components -name "*.styles.ts" | xargs grep "tokens\." | wc -l

# Check for hardcoded colors
find src/components -name "*.styles.ts" | xargs grep -E "'#[0-9A-Fa-f]{6}'" && echo "❌ Found hardcoded colors" || echo "✅ Using color tokens"
```

---

### 2. Theme Tokens Usage

**Requirement:** All design values (colors, spacing, typography) must come from Zest theme tokens.

**Verification Steps:**

✅ **Check spacing tokens:**
```typescript
// ✅ Correct - using spacing tokens
export const stylesFn: ZestStylesFn = ({ tokens }) => ({
  container: {
    padding: tokens.spacing.md,  // ✅ Token
    marginBottom: tokens.spacing.lg,  // ✅ Token
    gap: tokens.spacing.sm,  // ✅ Token
  },

  header: {
    paddingHorizontal: tokens.spacing.xl,
    paddingTop: tokens.spacing.md,
  },
});

// ❌ Incorrect - hardcoded spacing
export const styles = {
  container: {
    padding: 16,  // ❌ Hardcoded
    marginBottom: 24,  // ❌ Hardcoded
    gap: 8,  // ❌ Hardcoded
  },
};
```

✅ **Check color tokens:**
```typescript
// ✅ Correct - using color tokens
export const stylesFn: ZestStylesFn = ({ tokens }) => ({
  container: {
    backgroundColor: tokens.colors.background,  // ✅ Token
    borderColor: tokens.colors.border,  // ✅ Token
  },

  text: {
    color: tokens.colors.text,  // ✅ Token
  },

  error: {
    backgroundColor: tokens.colors.error,  // ✅ Token
    color: tokens.colors.errorText,  // ✅ Token
  },
});

// ❌ Incorrect - hardcoded colors
export const styles = {
  container: {
    backgroundColor: '#FFFFFF',  // ❌ Hardcoded
    borderColor: '#E0E0E0',  // ❌ Hardcoded
  },
  text: {
    color: '#000000',  // ❌ Won't adapt to dark mode
  },
};
```

✅ **Check typography tokens:**
```typescript
// ✅ Correct - using typography tokens
export const stylesFn: ZestStylesFn = ({ tokens }) => ({
  title: {
    ...tokens.typography.heading3,  // ✅ Typography token
  },

  body: {
    ...tokens.typography.bodyMedium,  // ✅ Typography token
  },

  caption: {
    ...tokens.typography.captionSmall,  // ✅ Typography token
    color: tokens.colors.textSecondary,
  },
});

// ❌ Incorrect - manual typography styles
export const styles = {
  title: {
    fontSize: 24,  // ❌ Hardcoded
    fontWeight: '700',  // ❌ Hardcoded
    lineHeight: 32,  // ❌ Hardcoded
    fontFamily: 'Roboto-Bold',  // ❌ Hardcoded
  },
};
```

✅ **Check border radius tokens:**
```typescript
// ✅ Correct - using borderRadius tokens
export const stylesFn: ZestStylesFn = ({ tokens }) => ({
  card: {
    borderRadius: tokens.borderRadius.md,  // ✅ Token
  },

  button: {
    borderRadius: tokens.borderRadius.full,  // ✅ Token for pill shape
  },

  avatar: {
    borderRadius: tokens.borderRadius.circle,  // ✅ Token for circle
  },
});

// ❌ Incorrect - hardcoded border radius
export const styles = {
  card: {
    borderRadius: 12,  // ❌ Hardcoded
  },
};
```

**How to Verify:**
```bash
# Check for token usage in styles
find src/components -name "*.styles.ts" | xargs grep "tokens\." | wc -l

# Check for hardcoded spacing values
find src/components -name "*.styles.ts" | xargs grep -E "padding.*[0-9]+|margin.*[0-9]+" && echo "❌ Found hardcoded spacing" || echo "✅ Using spacing tokens"

# Check for hardcoded colors
find src/components -name "*.styles.ts" | xargs grep -E "'#[0-9A-Fa-f]{6}'" && echo "❌ Found hardcoded colors" || echo "✅ Using color tokens"

# Check for hardcoded typography
find src/components -name "*.styles.ts" | xargs grep -E "fontSize.*[0-9]+|fontWeight.*[0-9]+" && echo "❌ Found hardcoded typography" || echo "✅ Using typography tokens"

# Check typography token spreading
find src/components -name "*.styles.ts" | xargs grep "\.\.\.tokens\.typography\." | wc -l
```

---

### 3. Conditional Styles

**Requirement:** Conditional styles must be applied using style arrays, not inline conditionals.

**Verification Steps:**

✅ **Check conditional style patterns:**
```typescript
// ✅ Correct - conditional styles with arrays
export const Button: React.FC<ButtonProps> = ({ variant, disabled, size }) => {
  const styles = useZestStyles(stylesFn);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        styles[variant],  // Variant-based styles
        size && styles[size],  // Optional size styles
        disabled && styles.disabled,  // Conditional disabled style
      ]}
    >
      <Text style={styles.label}>Press</Text>
    </TouchableOpacity>
  );
};

// ❌ Incorrect - inline conditional styles
<TouchableOpacity
  style={{
    backgroundColor: variant === 'primary' ? '#007AFF' : '#E0E0E0',  // ❌ Inline
    opacity: disabled ? 0.5 : 1,  // ❌ Inline
  }}
>
```

✅ **Check state-based styles:**
```typescript
// ✅ Correct - state-based styles with hooks
export const Card: React.FC<CardProps> = ({ isSelected, onPress }) => {
  const styles = useZestStyles(stylesFn);
  const [isPressed, setIsPressed] = useState(false);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isSelected && styles.selected,
        isPressed && styles.pressed,
      ]}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      onPress={onPress}
    >
      <Text style={[styles.text, isSelected && styles.selectedText]}>
        Card Content
      </Text>
    </TouchableOpacity>
  );
};

// Styles
export const stylesFn: ZestStylesFn = ({ tokens }) => ({
  container: {
    padding: tokens.spacing.md,
    backgroundColor: tokens.colors.background,
    borderWidth: 2,
    borderColor: 'transparent',
  },

  selected: {
    borderColor: tokens.colors.primary,
    backgroundColor: tokens.colors.primaryLight,
  },

  pressed: {
    opacity: 0.7,
  },

  text: {
    ...tokens.typography.bodyMedium,
    color: tokens.colors.text,
  },

  selectedText: {
    color: tokens.colors.primary,
    ...tokens.typography.bodyMediumBold,
  },
});

// ❌ Incorrect - complex inline conditions
<View
  style={{
    backgroundColor: isSelected ? '#E3F2FD' : isPressed ? '#F5F5F5' : '#FFFFFF',
    borderColor: isSelected ? '#007AFF' : 'transparent',
  }}
/>
```

✅ **Check platform-specific styles:**
```typescript
// ✅ Correct - platform styles in styles file
export const stylesFn: ZestStylesFn = ({ tokens, helpers }) => ({
  container: {
    padding: tokens.spacing.md,
    ...helpers.platform({
      ios: {
        shadowColor: tokens.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
});

// ❌ Incorrect - platform checks in component
import { Platform } from 'react-native';

<View
  style={{
    ...Platform.select({
      ios: { shadowOpacity: 0.1 },  // ❌ Inline platform styles
      android: { elevation: 4 },
    }),
  }}
/>
```

**How to Verify:**
```bash
# Check for style arrays with conditionals
find src/components -name "*.tsx" | xargs grep "style={\[" | wc -l

# Check for inline style objects (anti-pattern)
find src/components -name "*.tsx" | xargs grep "style={{" && echo "❌ Found inline styles" || echo "✅ No inline styles"

# Check for Platform.select in components (should be in styles)
find src/components -name "*.tsx" | xargs grep "Platform\.select" && echo "❌ Platform.select in components" || echo "✅ Platform styles in styles files"

# Check for helpers.platform usage in styles
find src/components -name "*.styles.ts" | xargs grep "helpers\.platform" | wc -l
```

---

### 4. Typography Components

**Requirement:** Use Zest Typography components (ZestText, ZestHeading) instead of raw Text components.

**Verification Steps:**

✅ **Check Zest Typography component usage:**
```typescript
// ✅ Correct - using Zest Typography components
import { ZestText, ZestHeading } from '@yourcompany/zest-native';

export const RecipeCard: React.FC<Props> = ({ recipe }) => {
  return (
    <View>
      <ZestHeading level={3} style={styles.title}>
        {recipe.title}
      </ZestHeading>

      <ZestText variant="bodyMedium" style={styles.description}>
        {recipe.description}
      </ZestText>

      <ZestText variant="captionSmall" color="textSecondary">
        {recipe.cookTime} minutes
      </ZestText>
    </View>
  );
};

// ❌ Incorrect - raw Text with manual typography
import { Text } from 'react-native';

<Text style={{ fontSize: 24, fontWeight: '700' }}>
  {recipe.title}  {/* ❌ Manual typography */}
</Text>
```

✅ **Check Typography variant props:**
```typescript
// ✅ Correct - using variant props
<ZestText variant="bodyMedium">Regular text</ZestText>
<ZestText variant="bodyMediumBold">Bold text</ZestText>
<ZestText variant="captionSmall">Small caption</ZestText>

<ZestHeading level={1}>Page Title</ZestHeading>
<ZestHeading level={2}>Section Title</ZestHeading>
<ZestHeading level={3}>Subsection Title</ZestHeading>

// ❌ Incorrect - raw Text with style prop
<Text style={styles.bodyMedium}>Text</Text>
<Text style={styles.heading1}>Title</Text>
```

✅ **Check color prop usage:**
```typescript
// ✅ Correct - using color prop from tokens
<ZestText variant="bodyMedium" color="text">
  Default text color
</ZestText>

<ZestText variant="bodySmall" color="textSecondary">
  Secondary text color
</ZestText>

<ZestText variant="bodyMedium" color="error">
  Error message
</ZestText>

// ❌ Incorrect - manual color in style
<Text style={{ color: '#666666' }}>
  Text  {/* ❌ Hardcoded color */}
</Text>
```

**How to Verify:**
```bash
# Check for Zest Typography usage
find src/components -name "*.tsx" | xargs grep "ZestText\|ZestHeading" | wc -l

# Check for raw Text usage (should be minimal)
find src/components -name "*.tsx" | xargs grep "import.*Text.*from 'react-native'" && echo "❌ Using raw Text" || echo "✅ Using ZestText"

# Check for manual typography in styles
find src/components -name "*.styles.ts" | xargs grep -E "fontSize|fontWeight|fontFamily" && echo "❌ Manual typography found" || echo "✅ Using typography tokens"

# Check Typography variants
find src/components -name "*.tsx" | xargs grep "variant=" | wc -l
```

---

### 5. Responsive Styles with Helpers

**Requirement:** Use Zest helpers for responsive and platform-specific styles.

**Verification Steps:**

✅ **Check helpers usage:**
```typescript
// ✅ Correct - using helpers for responsive styles
export const stylesFn: ZestStylesFn = ({ tokens, helpers }) => ({
  container: {
    padding: helpers.responsive({
      phone: tokens.spacing.md,
      tablet: tokens.spacing.lg,
    }),
  },

  grid: {
    flexDirection: helpers.responsive({
      phone: 'column',
      tablet: 'row',
    }),
  },

  shadow: {
    ...helpers.platform({
      ios: {
        shadowColor: tokens.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
});

// ❌ Incorrect - manual responsive logic
import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const isTablet = width > 768;

export const styles = {
  container: {
    padding: isTablet ? 24 : 16,  // ❌ Manual responsive
  },
};
```

✅ **Check accessibility helpers:**
```typescript
// ✅ Correct - using accessibility helpers
export const stylesFn: ZestStylesFn = ({ tokens, helpers }) => ({
  touchable: {
    minHeight: helpers.touchTarget.minHeight,  // 44px minimum
    minWidth: helpers.touchTarget.minWidth,  // 44px minimum
    justifyContent: 'center',
    alignItems: 'center',
  },

  text: {
    ...tokens.typography.bodyMedium,
    fontSize: helpers.accessibility.fontSize(tokens.typography.bodyMedium.fontSize),
  },
});

// ❌ Incorrect - hardcoded touch targets
export const styles = {
  button: {
    height: 30,  // ❌ Too small for accessibility
    width: 30,
  },
};
```

**How to Verify:**
```bash
# Check for helpers usage
find src/components -name "*.styles.ts" | xargs grep "helpers\." | wc -l

# Check for manual Dimensions.get (anti-pattern)
find src/components -name "*.tsx" -o -name "*.styles.ts" | xargs grep "Dimensions\.get" && echo "❌ Manual Dimensions" || echo "✅ Using helpers"

# Check for helpers.responsive
find src/components -name "*.styles.ts" | xargs grep "helpers\.responsive" | wc -l

# Check for helpers.platform
find src/components -name "*.styles.ts" | xargs grep "helpers\.platform" | wc -l

# Check touch target helpers
find src/components -name "*.styles.ts" | xargs grep "helpers\.touchTarget" | wc -l
```

---

### 6. Styles File Organization

**Requirement:** Each component must have a separate .styles.ts file, not inline styles.

**Verification Steps:**

✅ **Check styles file structure:**
```bash
# ✅ Correct - separate styles files
src/
├── components/
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.styles.ts  # ✅ Separate styles file
│   │   ├── Button.types.ts
│   │   └── index.ts
│   └── Card/
│       ├── Card.tsx
│       ├── Card.styles.ts  # ✅ Separate styles file
│       └── index.ts

# ❌ Incorrect - styles in component file
src/
├── components/
│   └── Button/
│       └── Button.tsx  # Styles defined inline
```

✅ **Check styles export pattern:**
```typescript
// ✅ Correct - Button.styles.ts
import type { ZestStylesFn } from '@yourcompany/zest-native';

export const stylesFn: ZestStylesFn = ({ tokens, helpers }) => ({
  container: {
    padding: tokens.spacing.md,
  },
});

// ✅ Correct - Button.tsx imports styles
import { useZestStyles } from '@yourcompany/zest-native';
import { stylesFn } from './Button.styles';

export const Button: React.FC<Props> = () => {
  const styles = useZestStyles(stylesFn);
  return <View style={styles.container} />;
};

// ❌ Incorrect - styles in component file
export const Button: React.FC<Props> = () => {
  const styles = useZestStyles(({ tokens }) => ({
    container: { padding: tokens.spacing.md },  // ❌ Inline in component
  }));
};
```

**How to Verify:**
```bash
# Check all components have .styles.ts files
find src/components -name "*.tsx" | while read component; do
  dir=$(dirname "$component")
  base=$(basename "$component" .tsx)
  test -f "$dir/$base.styles.ts" || echo "❌ Missing $base.styles.ts"
done

# Check for inline stylesFn (anti-pattern)
find src/components -name "*.tsx" | xargs grep "useZestStyles(({" && echo "❌ Inline styles found" || echo "✅ No inline styles"

# Count styles files
COMPONENTS=$(find src/components -name "*.tsx" | grep -v ".test." | wc -l)
STYLES=$(find src/components -name "*.styles.ts" | wc -l)
echo "Components: $COMPONENTS, Styles files: $STYLES"
```

---

## Common Issues and Fixes

### Issue 1: Dark Mode Not Working

**Symptoms:**
- Colors don't change in dark mode
- App looks wrong in dark mode

**Root Cause:** Using hardcoded colors instead of tokens

**Fix:**
```typescript
// ❌ Before
const styles = {
  container: {
    backgroundColor: '#FFFFFF',  // Won't adapt to dark mode
  },
};

// ✅ After
export const stylesFn: ZestStylesFn = ({ tokens }) => ({
  container: {
    backgroundColor: tokens.colors.background,  // Adapts to theme
  },
});
```

---

### Issue 2: Inconsistent Spacing

**Symptoms:**
- Spacing looks different across components
- Design doesn't match mockups

**Root Cause:** Using hardcoded spacing values

**Fix:**
```typescript
// ❌ Before
const styles = {
  container: {
    padding: 12,
    marginBottom: 15,
  },
};

// ✅ After
export const stylesFn: ZestStylesFn = ({ tokens }) => ({
  container: {
    padding: tokens.spacing.md,
    marginBottom: tokens.spacing.lg,
  },
});
```

---

### Issue 3: Typography Not Scaling with Accessibility Settings

**Symptoms:**
- Text doesn't scale when user increases system font size
- Accessibility issues

**Root Cause:** Using raw Text with hardcoded font sizes

**Fix:**
```typescript
// ❌ Before
<Text style={{ fontSize: 16, fontWeight: '400' }}>
  Text content
</Text>

// ✅ After
<ZestText variant="bodyMedium">
  Text content
</ZestText>
```

---

## Anti-Patterns to Avoid

### ❌ Don't Use Inline Styles

**Bad:**
```typescript
<View style={{ padding: 16, backgroundColor: '#FFFFFF' }} />
```

**Good:**
```typescript
const styles = useZestStyles(stylesFn);
<View style={styles.container} />
```

---

### ❌ Don't Use Raw StyleSheet.create

**Bad:**
```typescript
const styles = StyleSheet.create({
  container: { padding: 16 },
});
```

**Good:**
```typescript
export const stylesFn: ZestStylesFn = ({ tokens }) => ({
  container: { padding: tokens.spacing.md },
});
```

---

### ❌ Don't Hardcode Colors

**Bad:**
```typescript
backgroundColor: '#007AFF'
```

**Good:**
```typescript
backgroundColor: tokens.colors.primary
```

---

### ❌ Don't Use Raw Text Component

**Bad:**
```typescript
<Text style={{ fontSize: 16 }}>Content</Text>
```

**Good:**
```typescript
<ZestText variant="bodyMedium">Content</ZestText>
```

---

### ❌ Don't Create Styles Inside Component

**Bad:**
```typescript
export const Button = () => {
  const styles = StyleSheet.create({  // Created on every render!
    button: { padding: 16 },
  });
};
```

**Good:**
```typescript
// Button.styles.ts
export const stylesFn: ZestStylesFn = ({ tokens }) => ({
  button: { padding: tokens.spacing.md },
});
```

---

## Related Verifiers

- **react-native-components.md** - Component structure verification
- **testing.md** - Testing styled components
- **accessibility.md** - Accessible styling and touch targets
- **performance-optimization.md** - Style performance optimization
