---
domain: react-native-components
description: Verify React Native component structure, TypeScript props, hooks patterns, React.memo optimization, and SafeAreaView usage
---

# React Native Components Verification

Verify that React Native component implementations follow best practices for functional components, TypeScript typing, hooks-based logic, performance optimization with React.memo, and proper SafeAreaView usage.

## Verification Checklist

### 1. Functional Component Structure

**Requirement:** Components must be functional components with TypeScript, not class components.

**Verification Steps:**

✅ **Check functional component pattern:**
```typescript
// ✅ Correct - functional component with TypeScript
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  testID?: string;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  testID,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text>{label}</Text>
    </TouchableOpacity>
  );
};

// ❌ Incorrect - class component
class Button extends React.Component<ButtonProps> {
  render() {
    return <TouchableOpacity />;  // Don't use class components!
  }
}

// ❌ Incorrect - no TypeScript types
export const Button = ({ label, onPress }) => {  // Missing types!
  return <TouchableOpacity onPress={onPress}><Text>{label}</Text></TouchableOpacity>;
};
```

✅ **Check named exports:**
```typescript
// ✅ Correct - named exports for better tree-shaking
export const Button: React.FC<ButtonProps> = (props) => { ... };
export const Card: React.FC<CardProps> = (props) => { ... };

// ❌ Incorrect - default exports
export default Button;  // Avoid default exports
```

**How to Verify:**
```bash
# Check for class components (should be none)
find src/components -name "*.tsx" | xargs grep "class.*extends.*Component" && echo "❌ Found class components" || echo "✅ No class components"

# Check for functional components with React.FC
find src/components -name "*.tsx" | xargs grep "React.FC" | wc -l

# Check for default exports (anti-pattern)
find src/components -name "*.tsx" | xargs grep "export default" && echo "❌ Found default exports" || echo "✅ Using named exports"

# Check all components have TypeScript extensions
find src/components -name "*.jsx" -o -name "*.js" | grep -v ".test." && echo "❌ Found non-TypeScript files" || echo "✅ All TypeScript"
```

---

### 2. TypeScript Props Interface

**Requirement:** All components must have properly typed props interfaces with clear documentation.

**Verification Steps:**

✅ **Check props interface definition:**
```typescript
// ✅ Correct - comprehensive props interface
interface ProductCardProps {
  /** Product data to display */
  product: {
    id: string;
    title: string;
    price: number;
    imageUrl?: string;
  };
  /** Callback when card is pressed */
  onPress: (productId: string) => void;
  /** Optional variant for different styles */
  variant?: 'default' | 'compact' | 'featured';
  /** Whether card is in a loading state */
  isLoading?: boolean;
  /** Test identifier for testing */
  testID?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onPress,
  variant = 'default',
  isLoading = false,
  testID,
}) => {
  // Component implementation
};

// ❌ Incorrect - inline props without interface
export const ProductCard: React.FC<{
  product: any;  // ❌ Using 'any'
  onPress: Function;  // ❌ Using 'Function' instead of specific signature
}> = (props) => {
  // Missing default values, no documentation
};

// ❌ Incorrect - no TypeScript at all
export const ProductCard = ({ product, onPress }) => {
  // No type safety!
};
```

✅ **Check optional vs required props:**
```typescript
// ✅ Correct - clear required and optional props
interface UserProfileProps {
  // Required props
  userId: string;
  displayName: string;

  // Optional props with defaults
  showAvatar?: boolean;
  avatarSize?: 'small' | 'medium' | 'large';

  // Optional callbacks
  onEdit?: () => void;
  onDelete?: () => void;

  // Optional test props
  testID?: string;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  userId,
  displayName,
  showAvatar = true,
  avatarSize = 'medium',
  onEdit,
  onDelete,
  testID,
}) => {
  // Implementation
};

// ❌ Incorrect - everything is optional
interface UserProfileProps {
  userId?: string;  // Should be required!
  displayName?: string;  // Should be required!
  // Hard to know what's actually needed
}
```

✅ **Check children prop typing:**
```typescript
// ✅ Correct - properly typed children
interface ContainerProps {
  children: React.ReactNode;
  title?: string;
}

export const Container: React.FC<ContainerProps> = ({ children, title }) => {
  return (
    <View>
      {title && <Text>{title}</Text>}
      {children}
    </View>
  );
};

// ❌ Incorrect - untyped or wrong children type
interface ContainerProps {
  children: any;  // ❌ Don't use 'any'
}

interface ContainerProps {
  children: JSX.Element;  // ❌ Too restrictive - only allows single element
}
```

**How to Verify:**
```bash
# Check all components have interfaces
find src/components -name "*.tsx" | xargs grep "interface.*Props" | wc -l

# Check for 'any' type usage (anti-pattern)
find src/components -name "*.tsx" | xargs grep ": any" && echo "❌ Found 'any' types" || echo "✅ No 'any' types"

# Check for Function type (should use specific signatures)
find src/components -name "*.tsx" | xargs grep ": Function" && echo "❌ Found generic Function type" || echo "✅ Using specific function signatures"

# Check for JSDoc comments on props
find src/components -name "*.tsx" | xargs grep "/\*\*.*\*/" | wc -l
```

---

### 3. Hooks-Based Logic

**Requirement:** Component logic must use React hooks (useState, useEffect, useCallback, useMemo) appropriately.

**Verification Steps:**

✅ **Check useState usage:**
```typescript
// ✅ Correct - typed useState with clear naming
export const Counter: React.FC = () => {
  const [count, setCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleIncrement = () => {
    setCount(prev => prev + 1);
  };

  return (
    <View>
      <Text>{count}</Text>
      <Button onPress={handleIncrement} label="Increment" />
    </View>
  );
};

// ❌ Incorrect - untyped state, direct state mutation
export const Counter: React.FC = () => {
  const [count, setCount] = useState(0);  // ❌ No type annotation

  const handleIncrement = () => {
    count++;  // ❌ Direct mutation - won't trigger re-render!
    setCount(count);  // ❌ Not using functional update
  };
};
```

✅ **Check useEffect usage:**
```typescript
// ✅ Correct - useEffect with dependencies and cleanup
export const UserProfile: React.FC<Props> = ({ userId }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchUser = async () => {
      try {
        const data = await api.getUser(userId);
        if (!cancelled) {
          setUser(data);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to fetch user', error);
        }
      }
    };

    fetchUser();

    return () => {
      cancelled = true;  // Cleanup to prevent state updates after unmount
    };
  }, [userId]);  // Correct dependencies

  return user ? <Text>{user.name}</Text> : <ActivityIndicator />;
};

// ❌ Incorrect - missing dependencies, no cleanup
export const UserProfile: React.FC<Props> = ({ userId }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    api.getUser(userId).then(setUser);  // ❌ No cleanup, can cause memory leak
  }, []);  // ❌ Missing userId dependency - will use stale value
};
```

✅ **Check useCallback usage:**
```typescript
// ✅ Correct - useCallback for event handlers passed to children
export const RecipeList: React.FC<Props> = ({ recipes }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleRecipePress = useCallback((id: string) => {
    setSelectedId(id);
    analytics.track('recipe_selected', { id });
  }, []);  // No dependencies - callback is stable

  return (
    <FlatList
      data={recipes}
      renderItem={({ item }) => (
        <RecipeCard recipe={item} onPress={handleRecipePress} />
      )}
    />
  );
};

// ❌ Incorrect - creating new function on every render
export const RecipeList: React.FC<Props> = ({ recipes }) => {
  const [selectedId, setSelectedId] = useState(null);

  return (
    <FlatList
      data={recipes}
      renderItem={({ item }) => (
        <RecipeCard
          recipe={item}
          onPress={(id) => {  // ❌ New function created every render
            setSelectedId(id);
            analytics.track('recipe_selected', { id });
          }}
        />
      )}
    />
  );
};
```

**How to Verify:**
```bash
# Check for useState usage
find src/components -name "*.tsx" | xargs grep "useState" | wc -l

# Check for useEffect usage
find src/components -name "*.tsx" | xargs grep "useEffect" | wc -l

# Check for useCallback usage in components with callbacks
find src/components -name "*.tsx" | xargs grep "useCallback" | wc -l

# Check for missing dependencies warning suppressions (anti-pattern)
find src/components -name "*.tsx" | xargs grep "eslint-disable.*react-hooks/exhaustive-deps" && echo "❌ Found disabled dependency warnings" || echo "✅ No disabled warnings"

# Check for direct state mutation (anti-pattern)
find src/components -name "*.tsx" | xargs grep -E "state\.[a-zA-Z]+ =" && echo "❌ Found direct state mutation" || echo "✅ No direct mutations"
```

---

### 4. React.memo Optimization

**Requirement:** Components should use React.memo when appropriate to prevent unnecessary re-renders.

**Verification Steps:**

✅ **Check React.memo usage:**
```typescript
// ✅ Correct - React.memo for list items and pure components
interface RecipeCardProps {
  recipe: Recipe;
  onPress: (id: string) => void;
}

export const RecipeCard = React.memo<RecipeCardProps>(({ recipe, onPress }) => {
  const handlePress = useCallback(() => {
    onPress(recipe.id);
  }, [recipe.id, onPress]);

  return (
    <TouchableOpacity onPress={handlePress} testID={`recipe-card-${recipe.id}`}>
      <Text>{recipe.title}</Text>
      <Text>{recipe.cookTime} min</Text>
    </TouchableOpacity>
  );
});

RecipeCard.displayName = 'RecipeCard';

// ❌ Incorrect - no memo for list item (will re-render on every parent update)
export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onPress }) => {
  return (
    <TouchableOpacity onPress={() => onPress(recipe.id)}>
      <Text>{recipe.title}</Text>
    </TouchableOpacity>
  );
};
```

✅ **Check custom comparison function when needed:**
```typescript
// ✅ Correct - custom comparison for complex props
interface ProductCardProps {
  product: Product;
  selectedIds: string[];
  onToggle: (id: string) => void;
}

const arePropsEqual = (
  prevProps: ProductCardProps,
  nextProps: ProductCardProps
): boolean => {
  // Only re-render if this specific product is selected/deselected
  const wasSelected = prevProps.selectedIds.includes(prevProps.product.id);
  const isSelected = nextProps.selectedIds.includes(nextProps.product.id);

  return (
    prevProps.product.id === nextProps.product.id &&
    prevProps.product.title === nextProps.product.title &&
    wasSelected === isSelected &&
    prevProps.onToggle === nextProps.onToggle
  );
};

export const ProductCard = React.memo<ProductCardProps>(
  ({ product, selectedIds, onToggle }) => {
    const isSelected = selectedIds.includes(product.id);

    return (
      <TouchableOpacity
        onPress={() => onToggle(product.id)}
        style={isSelected ? styles.selected : styles.default}
      >
        <Text>{product.title}</Text>
      </TouchableOpacity>
    );
  },
  arePropsEqual
);

// ❌ Incorrect - memo without considering array reference changes
export const ProductCard = React.memo<ProductCardProps>(({ product, selectedIds }) => {
  // Will still re-render when selectedIds array reference changes,
  // even if contents are the same
});
```

✅ **Check displayName for debugging:**
```typescript
// ✅ Correct - displayName set for better debugging
export const RecipeCard = React.memo<RecipeCardProps>((props) => {
  // Implementation
});

RecipeCard.displayName = 'RecipeCard';

// ❌ Incorrect - missing displayName
export const RecipeCard = React.memo((props) => {
  // Will show as "Anonymous" in React DevTools
});
```

**How to Verify:**
```bash
# Check for React.memo usage
find src/components -name "*.tsx" | xargs grep "React.memo" | wc -l

# Check for displayName after React.memo
find src/components -name "*.tsx" -exec sh -c 'grep -A 3 "React.memo" "$1" | grep displayName' _ {} \; | wc -l

# Check list item components have memo
find src/components -name "*Card.tsx" -o -name "*Item.tsx" -o -name "*Row.tsx" | while read file; do
  grep -q "React.memo" "$file" || echo "❌ $file missing React.memo"
done

# Analyze bundle to see component re-render patterns (requires why-did-you-render)
npm test -- --coverage --testPathPattern="performance" --passWithNoTests
```

---

### 5. SafeAreaView Usage

**Requirement:** Screen-level components must use SafeAreaView or useSafeAreaInsets to handle notches and system UI.

**Verification Steps:**

✅ **Check SafeAreaView usage:**
```typescript
// ✅ Correct - SafeAreaView on screen components
import { SafeAreaView } from 'react-native-safe-area-context';

export const HomeScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView>
        <Text>Home Screen Content</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

// ❌ Incorrect - using React Native's SafeAreaView (deprecated)
import { SafeAreaView } from 'react-native';  // ❌ Use react-native-safe-area-context

export const HomeScreen: React.FC = () => {
  return (
    <SafeAreaView>  {/* Missing edges prop, less flexible */}
      <Text>Content</Text>
    </SafeAreaView>
  );
};

// ❌ Incorrect - no SafeAreaView on screen component
export const HomeScreen: React.FC = () => {
  return (
    <View>  {/* ❌ Content will be behind notch/status bar */}
      <Text>Content</Text>
    </View>
  );
};
```

✅ **Check useSafeAreaInsets for custom layouts:**
```typescript
// ✅ Correct - useSafeAreaInsets for manual inset handling
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const CustomHeader: React.FC = () => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <Text>Header</Text>
    </View>
  );
};

// ❌ Incorrect - hardcoded padding values
export const CustomHeader: React.FC = () => {
  return (
    <View style={[styles.header, { paddingTop: 44 }]}>  {/* ❌ Won't work on Android or notchless devices */}
      <Text>Header</Text>
    </View>
  );
};
```

✅ **Check edge specification:**
```typescript
// ✅ Correct - specifying which edges to apply insets
<SafeAreaView edges={['top']}>  {/* Only top inset */}
  <Header />
</SafeAreaView>

<SafeAreaView edges={['bottom']}>  {/* Only bottom inset */}
  <TabBar />
</SafeAreaView>

<SafeAreaView edges={['top', 'bottom']}>  {/* Both top and bottom */}
  <ScrollView>
    <Content />
  </ScrollView>
</SafeAreaView>

// ❌ Incorrect - no edge specification (applies all edges unnecessarily)
<SafeAreaView>
  <Content />
</SafeAreaView>
```

**How to Verify:**
```bash
# Check for SafeAreaView from correct package
find src/screens -name "*.tsx" | xargs grep "from 'react-native-safe-area-context'" | wc -l

# Check for deprecated SafeAreaView usage
find src/screens -name "*.tsx" | xargs grep "SafeAreaView.*from 'react-native'" && echo "❌ Using deprecated SafeAreaView" || echo "✅ Using correct package"

# Check screen components have SafeAreaView
find src/screens -name "*.tsx" | while read file; do
  grep -q "SafeAreaView\|useSafeAreaInsets" "$file" || echo "❌ $file missing SafeAreaView"
done

# Check for hardcoded status bar heights (anti-pattern)
find src -name "*.tsx" | xargs grep -E "paddingTop.*44|paddingTop.*20" && echo "❌ Found hardcoded status bar heights" || echo "✅ No hardcoded heights"
```

---

### 6. Component File Organization

**Requirement:** Components should be organized with clear file structure and naming conventions.

**Verification Steps:**

✅ **Check component directory structure:**
```bash
# ✅ Correct - organized component structure
src/
├── components/
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.styles.ts
│   │   ├── Button.types.ts
│   │   ├── index.ts
│   │   └── __tests__/
│   │       └── Button.test.tsx
│   ├── Card/
│   │   ├── Card.tsx
│   │   ├── Card.styles.ts
│   │   ├── index.ts
│   │   └── __tests__/
│   │       └── Card.test.tsx
│   └── index.ts

# ❌ Incorrect - flat structure
src/
├── components/
│   ├── Button.tsx
│   ├── ButtonStyles.ts
│   ├── Card.tsx
│   └── CardStyles.ts
```

✅ **Check index.ts barrel exports:**
```typescript
// ✅ Correct - components/Button/index.ts
export { Button } from './Button';
export type { ButtonProps } from './Button.types';

// ✅ Correct - components/index.ts
export { Button } from './Button';
export { Card } from './Card';
export { Header } from './Header';

// ❌ Incorrect - exporting everything with *
export * from './Button';  // ❌ Can cause circular dependencies
```

✅ **Check styles organization:**
```typescript
// ✅ Correct - separate styles file
// Button.styles.ts
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 8,
  },
  primary: {
    backgroundColor: '#007AFF',
  },
  secondary: {
    backgroundColor: '#E5E5E5',
  },
});

// Button.tsx
import { styles } from './Button.styles';

export const Button: React.FC<ButtonProps> = ({ variant }) => {
  return <View style={[styles.container, styles[variant]]} />;
};

// ❌ Incorrect - styles inline in component file
export const Button: React.FC<ButtonProps> = () => {
  const styles = StyleSheet.create({  // ❌ Created on every render!
    container: { padding: 16 },
  });

  return <View style={styles.container} />;
};
```

**How to Verify:**
```bash
# Check component directories have proper structure
find src/components -mindepth 1 -maxdepth 1 -type d | while read dir; do
  component=$(basename "$dir")
  test -f "$dir/$component.tsx" || echo "❌ Missing $component.tsx in $dir"
  test -f "$dir/index.ts" || echo "❌ Missing index.ts in $dir"
done

# Check for inline StyleSheet.create (anti-pattern)
find src/components -name "*.tsx" | xargs grep -n "const.*StyleSheet.create" && echo "❌ Found inline styles" || echo "✅ Styles externalized"

# Check all components have barrel exports
find src/components -mindepth 1 -maxdepth 1 -type d | while read dir; do
  test -f "$dir/index.ts" || echo "❌ Missing index.ts in $dir"
done
```

---

## Common Issues and Fixes

### Issue 1: Component Re-renders Too Often

**Symptoms:**
- Performance issues
- Slow list scrolling
- High CPU usage

**Root Cause:** Missing React.memo, useCallback, or useMemo

**Fix:**
```typescript
// ❌ Before
export const ListItem = ({ item, onPress }) => {
  return <TouchableOpacity onPress={() => onPress(item.id)} />;
};

// ✅ After
export const ListItem = React.memo<Props>(({ item, onPress }) => {
  const handlePress = useCallback(() => {
    onPress(item.id);
  }, [item.id, onPress]);

  return <TouchableOpacity onPress={handlePress} />;
});
```

---

### Issue 2: TypeScript Errors with Props

**Symptoms:**
```
Property 'children' does not exist on type 'Props'
```

**Root Cause:** Missing or incorrect props interface

**Fix:**
```typescript
// ❌ Before
interface ContainerProps {
  title: string;
}

// ✅ After
interface ContainerProps {
  title: string;
  children: React.ReactNode;
}
```

---

### Issue 3: Content Behind Notch or Status Bar

**Symptoms:**
- Content appears behind iPhone notch
- Text cut off at top of screen

**Root Cause:** Missing SafeAreaView

**Fix:**
```typescript
// ❌ Before
export const Screen = () => (
  <View>
    <Text>Content</Text>
  </View>
);

// ✅ After
import { SafeAreaView } from 'react-native-safe-area-context';

export const Screen = () => (
  <SafeAreaView edges={['top', 'bottom']}>
    <Text>Content</Text>
  </SafeAreaView>
);
```

---

## Anti-Patterns to Avoid

### ❌ Don't Use Class Components

**Bad:**
```typescript
class MyComponent extends React.Component {
  render() {
    return <View />;
  }
}
```

**Good:**
```typescript
export const MyComponent: React.FC<Props> = () => {
  return <View />;
};
```

---

### ❌ Don't Use Default Exports

**Bad:**
```typescript
export default Button;
```

**Good:**
```typescript
export { Button };
```

---

### ❌ Don't Create Inline Functions for Event Handlers

**Bad:**
```typescript
<FlatList
  data={items}
  renderItem={({ item }) => (
    <TouchableOpacity onPress={() => handlePress(item.id)}>
      {/* New function created for every item! */}
    </TouchableOpacity>
  )}
/>
```

**Good:**
```typescript
const handlePress = useCallback((id: string) => {
  // Handle press
}, []);

<FlatList
  data={items}
  renderItem={({ item }) => (
    <ItemComponent item={item} onPress={handlePress} />
  )}
/>
```

---

### ❌ Don't Mutate State Directly

**Bad:**
```typescript
const [user, setUser] = useState({ name: 'John' });

user.name = 'Jane';  // ❌ Direct mutation
setUser(user);  // Won't trigger re-render!
```

**Good:**
```typescript
setUser(prev => ({ ...prev, name: 'Jane' }));
```

---

## Related Verifiers

- **testing.md** - Component testing verification
- **state-management.md** - State hooks and Zustand integration
- **styling.md** - Zest design system and styling verification
- **performance-optimization.md** - Performance patterns verification
- **accessibility.md** - Accessibility props verification
