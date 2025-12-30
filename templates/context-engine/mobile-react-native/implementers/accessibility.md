---
domain: accessibility
description: Accessibility props (label, hint, role), screen reader optimization, 44x44 touch targets
---

# Accessibility Implementer

This implementer defines patterns for implementing accessibility in React Native applications, including proper use of accessibility props, screen reader optimization, touch target sizing, focus management, and WCAG compliance.

## Core Patterns

### Accessibility Props

Apply comprehensive accessibility props to components:

```typescript
// src/components/Button/AccessibleButton.tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, AccessibilityRole } from 'react-native';

interface AccessibleButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  accessibilityHint?: string;
  accessibilityLabel?: string;
  role?: AccessibilityRole;
  testID?: string;
}

export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  label,
  onPress,
  disabled = false,
  loading = false,
  accessibilityHint,
  accessibilityLabel,
  role = 'button',
  testID,
}) => {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled || loading}
      testID={testID}
      // Accessibility props
      accessible={true}
      accessibilityRole={role}
      accessibilityLabel={accessibilityLabel || label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{
        disabled: disabled || loading,
        busy: loading,
      }}
      // Ensure minimum touch target size
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Text style={styles.text}>
        {loading ? 'Loading...' : label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 44, // iOS minimum touch target
    minWidth: 44,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

// src/components/Input/AccessibleTextInput.tsx
import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';

interface AccessibleTextInputProps extends TextInputProps {
  label: string;
  error?: string;
  required?: boolean;
  description?: string;
}

export const AccessibleTextInput: React.FC<AccessibleTextInputProps> = ({
  label,
  error,
  required = false,
  description,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const inputId = `input-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const errorId = error ? `${inputId}-error` : undefined;
  const descriptionId = description ? `${inputId}-description` : undefined;

  return (
    <View style={styles.container}>
      <Text
        style={styles.label}
        accessibilityRole="text"
        nativeID={`${inputId}-label`}
      >
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>

      {description && (
        <Text
          style={styles.description}
          nativeID={descriptionId}
          accessibilityRole="text"
        >
          {description}
        </Text>
      )}

      <TextInput
        {...props}
        style={[
          styles.input,
          isFocused && styles.inputFocused,
          error && styles.inputError,
        ]}
        onFocus={(e) => {
          setIsFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          props.onBlur?.(e);
        }}
        // Accessibility props
        accessible={true}
        accessibilityLabel={label}
        accessibilityHint={description}
        accessibilityRequired={required}
        accessibilityLabelledBy={`${inputId}-label`}
        accessibilityDescribedBy={
          [descriptionId, errorId].filter(Boolean).join(' ')
        }
        accessibilityInvalid={!!error}
      />

      {error && (
        <Text
          style={styles.error}
          nativeID={errorId}
          accessibilityRole="alert"
          accessibilityLive="polite"
        >
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  required: {
    color: '#FF3B30',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  inputFocused: {
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  error: {
    fontSize: 14,
    color: '#FF3B30',
    marginTop: 4,
  },
});
```

### Screen Reader Optimization

Optimize components for screen readers:

```typescript
// src/components/Card/AccessibleCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface AccessibleCardProps {
  title: string;
  description: string;
  imageUri?: string;
  author?: string;
  date?: string;
  onPress?: () => void;
}

export const AccessibleCard: React.FC<AccessibleCardProps> = ({
  title,
  description,
  imageUri,
  author,
  date,
  onPress,
}) => {
  // Construct comprehensive accessibility label
  const accessibilityLabel = [
    title,
    description,
    author && `by ${author}`,
    date && `posted ${date}`,
  ]
    .filter(Boolean)
    .join(', ');

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      style={styles.card}
      onPress={onPress}
      // Group all content for screen reader
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityHint={onPress ? 'Double tap to open' : undefined}
    >
      {/* Hide children from screen reader since we provided comprehensive label */}
      {imageUri && (
        <View
          style={styles.imageContainer}
          importantForAccessibility="no-hide-descendants"
        >
          <Image source={{ uri: imageUri }} style={styles.image} />
        </View>
      )}

      <View
        style={styles.content}
        importantForAccessibility="no-hide-descendants"
      >
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>

        {(author || date) && (
          <View style={styles.metadata}>
            {author && <Text style={styles.author}>{author}</Text>}
            {date && <Text style={styles.date}>{date}</Text>}
          </View>
        )}
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  imageContainer: {
    marginBottom: 12,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  metadata: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  author: {
    fontSize: 12,
    color: '#999',
  },
  date: {
    fontSize: 12,
    color: '#999',
  },
});

// src/components/List/AccessibleList.tsx
import React from 'react';
import { FlatList, View, Text, StyleSheet } from 'react-native';

interface AccessibleListProps<T> {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactElement;
  keyExtractor: (item: T) => string;
  heading?: string;
  emptyMessage?: string;
}

export function AccessibleList<T>({
  data,
  renderItem,
  keyExtractor,
  heading,
  emptyMessage = 'No items to display',
}: AccessibleListProps<T>) {
  const ListHeaderComponent = heading ? (
    <Text
      style={styles.heading}
      accessibilityRole="header"
      accessibilityLevel={2}
    >
      {heading}
    </Text>
  ) : undefined;

  const ListEmptyComponent = (
    <View style={styles.empty}>
      <Text
        accessibilityRole="text"
        accessibilityLive="polite"
      >
        {emptyMessage}
      </Text>
    </View>
  );

  return (
    <FlatList
      data={data}
      renderItem={({ item, index }) => (
        <View
          accessibilityRole="listitem"
          // Announce position in list
          accessibilityLabel={`Item ${index + 1} of ${data.length}`}
        >
          {renderItem(item, index)}
        </View>
      )}
      keyExtractor={keyExtractor}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent}
      // Improve VoiceOver navigation
      accessibilityRole="list"
    />
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  empty: {
    padding: 32,
    alignItems: 'center',
  },
});
```

### Touch Target Sizing

Ensure minimum touch target sizes:

```typescript
// src/utils/accessibility.ts
import { Platform, Dimensions } from 'react-native';

/**
 * Minimum touch target sizes per platform guidelines
 */
export const TOUCH_TARGET = {
  // iOS Human Interface Guidelines
  ios: {
    minHeight: 44,
    minWidth: 44,
  },
  // Android Material Design
  android: {
    minHeight: 48,
    minWidth: 48,
  },
  // Web WCAG
  web: {
    minHeight: 44,
    minWidth: 44,
  },
} as const;

/**
 * Get platform-specific minimum touch target size
 */
export function getMinTouchTarget() {
  return TOUCH_TARGET[Platform.OS as keyof typeof TOUCH_TARGET] || TOUCH_TARGET.ios;
}

/**
 * Calculate hit slop to achieve minimum touch target
 */
export function calculateHitSlop(
  currentWidth: number,
  currentHeight: number
): { top: number; bottom: number; left: number; right: number } {
  const { minWidth, minHeight } = getMinTouchTarget();

  const horizontalSlop = Math.max(0, (minWidth - currentWidth) / 2);
  const verticalSlop = Math.max(0, (minHeight - currentHeight) / 2);

  return {
    top: verticalSlop,
    bottom: verticalSlop,
    left: horizontalSlop,
    right: horizontalSlop,
  };
}

// src/components/IconButton/IconButton.tsx
import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { calculateHitSlop } from '@/utils/accessibility';

interface IconButtonProps {
  iconName: string;
  onPress: () => void;
  size?: number;
  color?: string;
  accessibilityLabel: string;
  accessibilityHint?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  iconName,
  onPress,
  size = 24,
  color = '#000',
  accessibilityLabel,
  accessibilityHint,
}) => {
  const hitSlop = calculateHitSlop(size, size);

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.button}
      hitSlop={hitSlop}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
    >
      <Icon name={iconName} size={size} color={color} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
```

### Focus Management

Manage focus for keyboard and screen reader navigation:

```typescript
// src/hooks/useAccessibilityFocus.ts
import { useEffect, useRef } from 'react';
import { AccessibilityInfo, findNodeHandle } from 'react-native';

/**
 * Set accessibility focus to element
 */
export function useAccessibilityFocus(shouldFocus: boolean = false) {
  const ref = useRef<any>(null);

  useEffect(() => {
    if (shouldFocus && ref.current) {
      const reactTag = findNodeHandle(ref.current);
      if (reactTag) {
        AccessibilityInfo.setAccessibilityFocus(reactTag);
      }
    }
  }, [shouldFocus]);

  return ref;
}

// src/hooks/useAnnouncement.ts
import { useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Announce message to screen reader
 */
export function useAnnouncement(message: string, trigger?: any) {
  useEffect(() => {
    if (message) {
      AccessibilityInfo.announceForAccessibility(message);
    }
  }, [message, trigger]);
}

// Usage example
// src/components/Toast/AccessibleToast.tsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAccessibilityFocus, useAnnouncement } from '@/hooks';

interface AccessibleToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  visible: boolean;
}

export const AccessibleToast: React.FC<AccessibleToastProps> = ({
  message,
  type,
  visible,
}) => {
  const ref = useAccessibilityFocus(visible);

  // Announce toast message to screen reader
  useAnnouncement(visible ? message : '', visible);

  if (!visible) return null;

  return (
    <View
      ref={ref}
      style={[styles.toast, styles[type]]}
      accessible={true}
      accessibilityRole="alert"
      accessibilityLive="assertive"
    >
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  success: {
    backgroundColor: '#4CAF50',
  },
  error: {
    backgroundColor: '#F44336',
  },
  info: {
    backgroundColor: '#2196F3',
  },
  message: {
    color: '#fff',
    fontSize: 16,
  },
});

// src/screens/FormScreen.tsx
import React, { useRef, useState } from 'react';
import { View, TextInput } from 'react-native';
import { AccessibleButton } from '@/components/Button';

export const FormScreen: React.FC = () => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);

  const handleSubmit = () => {
    // Validation logic
    const newErrors: Record<string, string> = {};

    if (!email) {
      newErrors.email = 'Email is required';
      // Focus first error field
      emailInputRef.current?.focus();
    } else if (!password) {
      newErrors.password = 'Password is required';
      passwordInputRef.current?.focus();
    }

    setErrors(newErrors);
  };

  return (
    <View>
      <AccessibleTextInput
        ref={emailInputRef}
        label="Email"
        error={errors.email}
        returnKeyType="next"
        onSubmitEditing={() => passwordInputRef.current?.focus()}
      />
      <AccessibleTextInput
        ref={passwordInputRef}
        label="Password"
        error={errors.password}
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
      />
      <AccessibleButton
        label="Submit"
        onPress={handleSubmit}
      />
    </View>
  );
};
```

### Accessibility Testing Utilities

Create utilities for testing accessibility:

```typescript
// src/utils/accessibilityTesting.ts
import { AccessibilityInfo } from 'react-native';

/**
 * Check if screen reader is enabled
 */
export async function isScreenReaderEnabled(): Promise<boolean> {
  return await AccessibilityInfo.isScreenReaderEnabled();
}

/**
 * Check if reduce motion is enabled
 */
export async function isReduceMotionEnabled(): Promise<boolean> {
  return await AccessibilityInfo.isReduceMotionEnabled();
}

/**
 * Check if reduce transparency is enabled (iOS only)
 */
export async function isReduceTransparencyEnabled(): Promise<boolean> {
  return await AccessibilityInfo.isReduceTransparencyEnabled();
}

/**
 * Validate accessibility props
 */
export function validateAccessibilityProps(
  component: any
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for accessible prop
  if (!component.accessible) {
    errors.push('Component should have accessible={true}');
  }

  // Check for accessibility label on interactive elements
  if (
    ['button', 'link'].includes(component.accessibilityRole) &&
    !component.accessibilityLabel
  ) {
    errors.push('Interactive elements should have accessibilityLabel');
  }

  // Check minimum touch target size
  if (
    component.accessibilityRole === 'button' &&
    (component.style?.height < 44 || component.style?.width < 44)
  ) {
    errors.push('Touch targets should be at least 44x44');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// src/__tests__/accessibility.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { AccessibleButton } from '@/components/Button';

describe('Accessibility Tests', () => {
  it('has correct accessibility role', () => {
    const { getByRole } = render(
      <AccessibleButton label="Click me" onPress={jest.fn()} />
    );

    expect(getByRole('button')).toBeTruthy();
  });

  it('has accessibility label', () => {
    const { getByLabelText } = render(
      <AccessibleButton
        label="Click me"
        onPress={jest.fn()}
        accessibilityLabel="Custom label"
      />
    );

    expect(getByLabelText('Custom label')).toBeTruthy();
  });

  it('reflects disabled state', () => {
    const { getByRole } = render(
      <AccessibleButton label="Click me" onPress={jest.fn()} disabled />
    );

    const button = getByRole('button');
    expect(button.props.accessibilityState.disabled).toBe(true);
  });

  it('has minimum touch target size', () => {
    const { getByRole } = render(
      <AccessibleButton label="Click me" onPress={jest.fn()} />
    );

    const button = getByRole('button');
    expect(button.props.style.minHeight).toBeGreaterThanOrEqual(44);
    expect(button.props.style.minWidth).toBeGreaterThanOrEqual(44);
  });
});
```

### Dynamic Type Support

Support dynamic text sizing for accessibility:

```typescript
// src/components/Text/ScalableText.tsx
import React from 'react';
import { Text, TextProps, StyleSheet, Platform } from 'react-native';
import { useAccessibilityInfo } from '@react-native-community/hooks';

interface ScalableTextProps extends TextProps {
  baseSize?: number;
  maxFontSizeMultiplier?: number;
}

/**
 * Text component that respects system font size settings
 */
export const ScalableText: React.FC<ScalableTextProps> = ({
  baseSize = 16,
  maxFontSizeMultiplier = 2,
  style,
  children,
  ...props
}) => {
  const { screenReaderEnabled } = useAccessibilityInfo();

  return (
    <Text
      {...props}
      style={[{ fontSize: baseSize }, style]}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      allowFontScaling={true}
    >
      {children}
    </Text>
  );
};

// src/utils/typography.ts
import { PixelRatio, Platform } from 'react-native';

const fontScale = PixelRatio.getFontScale();

export const typography = {
  /**
   * Scale font size based on system settings
   */
  scale: (size: number): number => {
    return Math.round(size * fontScale);
  },

  /**
   * Predefined text sizes that scale with accessibility settings
   */
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },

  /**
   * Get scaled font size
   */
  getSize: (key: keyof typeof typography.sizes): number => {
    return typography.scale(typography.sizes[key]);
  },
};
```

### Color Contrast Utilities

Ensure sufficient color contrast:

```typescript
// src/utils/colorContrast.ts
/**
 * Calculate relative luminance
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 */
export function getContrastRatio(color1: string, color2: string): number {
  // Convert hex to RGB
  const hex1 = color1.replace('#', '');
  const hex2 = color2.replace('#', '');

  const r1 = parseInt(hex1.substring(0, 2), 16);
  const g1 = parseInt(hex1.substring(2, 4), 16);
  const b1 = parseInt(hex1.substring(4, 6), 16);

  const r2 = parseInt(hex2.substring(0, 2), 16);
  const g2 = parseInt(hex2.substring(2, 4), 16);
  const b2 = parseInt(hex2.substring(4, 6), 16);

  const lum1 = getLuminance(r1, g1, b1);
  const lum2 = getLuminance(r2, g2, b2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if color combination meets WCAG AA standards
 */
export function meetsWCAGAA(
  textColor: string,
  backgroundColor: string,
  isLargeText: boolean = false
): boolean {
  const ratio = getContrastRatio(textColor, backgroundColor);
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Check if color combination meets WCAG AAA standards
 */
export function meetsWCAGAAA(
  textColor: string,
  backgroundColor: string,
  isLargeText: boolean = false
): boolean {
  const ratio = getContrastRatio(textColor, backgroundColor);
  return isLargeText ? ratio >= 4.5 : ratio >= 7;
}

// src/constants/colors.ts
import { meetsWCAGAA } from '@/utils/colorContrast';

// Validate color combinations at build time
export const colors = {
  primary: '#007AFF',
  primaryText: '#FFFFFF',
  secondary: '#8E8E93',
  secondaryText: '#FFFFFF',
  background: '#FFFFFF',
  text: '#000000',
};

// Validate in development
if (__DEV__) {
  if (!meetsWCAGAA(colors.primaryText, colors.primary)) {
    console.warn('Primary button text does not meet WCAG AA standards');
  }
}
```

## Implementation Guidelines

### Accessibility Props

1. **accessible**: Set to true for focusable elements
2. **accessibilityRole**: Define semantic role (button, link, header, etc.)
3. **accessibilityLabel**: Provide clear, descriptive labels
4. **accessibilityHint**: Add hints for interactive elements
5. **accessibilityState**: Communicate element state (disabled, selected, etc.)

### Screen Reader Support

1. **Grouping**: Group related content with accessible={true}
2. **Hide Decorative**: Use importantForAccessibility="no" for decorative elements
3. **Announcements**: Use AccessibilityInfo for dynamic content
4. **Live Regions**: Use accessibilityLive for status updates
5. **Headers**: Mark headings with accessibilityRole="header"

### Touch Targets

1. **Minimum Size**: 44x44 on iOS, 48x48 on Android
2. **Hit Slop**: Add hitSlop for small targets
3. **Spacing**: Provide adequate spacing between targets
4. **Visual Feedback**: Show clear pressed/focus states
5. **Testing**: Test with actual fingers, not just pointer

### Color and Contrast

1. **WCAG AA**: Minimum 4.5:1 for normal text, 3:1 for large text
2. **WCAG AAA**: Minimum 7:1 for normal text, 4.5:1 for large text
3. **Don't Rely on Color**: Use multiple indicators (color + icon + text)
4. **Dark Mode**: Ensure contrast in both light and dark modes
5. **Testing**: Use color blindness simulators

## Anti-Patterns to Avoid

### Don't Skip Accessibility Labels

```typescript
// Bad: No accessibility label
<TouchableOpacity onPress={handlePress}>
  <Icon name="close" />
</TouchableOpacity>

// Good: Clear accessibility label
<TouchableOpacity
  onPress={handlePress}
  accessibilityLabel="Close"
  accessibilityRole="button"
>
  <Icon name="close" />
</TouchableOpacity>
```

### Don't Use Tiny Touch Targets

```typescript
// Bad: Too small
<TouchableOpacity style={{ width: 20, height: 20 }}>
  <Icon name="info" size={16} />
</TouchableOpacity>

// Good: Minimum size with hit slop
<TouchableOpacity
  style={{ width: 44, height: 44 }}
  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
>
  <Icon name="info" size={16} />
</TouchableOpacity>
```

### Don't Disable Font Scaling

```typescript
// Bad: Disables accessibility
<Text allowFontScaling={false}>
  Important text
</Text>

// Good: Allows scaling with limits
<Text
  allowFontScaling={true}
  maxFontSizeMultiplier={2}
>
  Important text
</Text>
```

### Don't Use Low Contrast Colors

```typescript
// Bad: Low contrast
const styles = StyleSheet.create({
  text: {
    color: '#999',
    backgroundColor: '#fff', // 2.8:1 contrast ratio
  },
});

// Good: Sufficient contrast
const styles = StyleSheet.create({
  text: {
    color: '#333',
    backgroundColor: '#fff', // 12.6:1 contrast ratio
  },
});
```

### Don't Forget Screen Reader Testing

```typescript
// Bad: No consideration for screen readers
<View>
  <Image source={require('./icon.png')} />
  <Text>Submit</Text>
</View>

// Good: Grouped for screen reader
<TouchableOpacity
  accessible={true}
  accessibilityLabel="Submit"
  accessibilityRole="button"
>
  <Image
    source={require('./icon.png')}
    importantForAccessibility="no"
  />
  <Text importantForAccessibility="no">Submit</Text>
</TouchableOpacity>
```

## Related Implementers

- **internationalization.md**: Accessible translations
- **testing.md**: Accessibility testing
- **navigation.md**: Accessible navigation
- **performance-optimization.md**: Performance without compromising accessibility
- **platform-specific.md**: Platform-specific accessibility features
