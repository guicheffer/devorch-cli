---
domain: react-native-components
description: React Native component architecture with functional components, TypeScript props, hooks-based logic, and performance optimization
---

# React Native Component Patterns

Build React Native components using functional components with TypeScript interfaces, hooks-based logic, React.memo optimization, and SafeAreaView for mobile layouts.

## Core Patterns

### 1. Functional Components with TypeScript Props

**Pattern:** All React Native components use functional components with explicit TypeScript interface definitions for props. Component props are defined in separate interfaces and exported for reusability.

**Example from PR #2213:**
```typescript
// Define props interface with explicit types
export interface OnboardingScreenComponentProps {
  navigation: NativeStackNavigationProp<
    SocialRecipeBridgeStackParamsList,
    SocialRecipeBridgeStackRoutes.SocialRecipeBridgeOnboarding
  >;
  route: RouteProp<
    SocialRecipeBridgeStackParamsList,
    SocialRecipeBridgeStackRoutes.SocialRecipeBridgeOnboarding
  >;
}

// Functional component with destructured props
export const OnboardingScreen = ({
  navigation,
}: OnboardingScreenComponentProps) => {
  const styles = useZestStyles(stylesConfig);
  const { translateRaw } = useT9n('social-recipe-bridge');

  return (
    <View style={styles.container}>
      <Text type="headline-lg">{translateRaw('onboarding.title')}</Text>
    </View>
  );
};
```

**Example from PR #2311:**
```typescript
interface PhoneMockupProps {
  source: ImageSourcePropType;
  accessibilityLabel: string;
}

export const PhoneMockup: React.FC<PhoneMockupProps> = ({
  source,
  accessibilityLabel,
}) => {
  const styles = useZestStyles(stylesConfig);
  return (
    <View style={styles.phoneMockupContainer}>
      <Image
        source={source}
        style={styles.phoneMockupImage}
        accessibilityLabel={accessibilityLabel}
        resizeMode="contain"
      />
    </View>
  );
};
```

**Frequency:** 100% of components

**Why:** This pattern provides:
- Full TypeScript type safety for props
- Clear component API contracts
- Reusable prop interfaces across components
- Better IDE autocomplete and type checking
- Easier refactoring and maintenance

**Guidelines:**
- Always export prop interfaces for reusability
- Use explicit typing for all props (no implicit any)
- Destructure props in function signature for clarity
- Include navigation and route types when applicable
- Use React.FC type annotation for generic components

### 2. Hooks-based Component Logic

**Pattern:** Component logic is encapsulated in custom hooks following the useXXX naming convention. Hooks manage state, side effects, and business logic separately from the component rendering logic.

**Example from PR #2213:**
```typescript
// Component uses multiple custom hooks
export const OnboardingScreen = ({ navigation }: OnboardingScreenComponentProps) => {
  const styles = useZestStyles(stylesConfig);
  const { translateRaw } = useT9n('social-recipe-bridge');

  const [currentScreen, setCurrentScreen] = useState<ScreenIndex>(0);

  // Get onboarding state management
  const { setSeen, setSkipped } = useOnboardingState();

  // Get analytics tracking functions
  const {
    trackOnboardingViewed,
    trackScreenViewed,
    trackOnboardingSkipped,
    trackOnboardingCompleted,
  } = useOnboardingAnalytics();

  // Business logic in custom hook
  const { handleNext, handleSkip, handleBack } = useOnboardingNavigation({
    currentScreen,
    setCurrentScreen,
    navigation,
    setSeen,
    setSkipped,
    trackOnboardingCompleted,
    trackOnboardingSkipped,
  });

  return (
    <View style={styles.container}>
      {/* Rendering logic */}
    </View>
  );
};
```

**Example from PR #2276:**
```typescript
const VoiceCommandsScreen = () => {
  // Voice command hook
  const {
    isListening,
    error,
    startListening,
    stopListening,
  } = useVoiceCommands({
    onCommand: handleVoiceCommand,
    enabled: isVoiceEnabled,
  });

  // Translation hook for voice commands
  const {
    nextWord,
    previousWord,
    readWord,
  } = useVoiceCommandTranslations();

  return (
    <View>
      <Button onPress={startListening} disabled={isListening}>
        {isListening ? 'Listening...' : 'Start Voice Commands'}
      </Button>
    </View>
  );
};
```

**Frequency:** 95% of components with logic

**Why:** Hooks provide:
- Separation of concerns (logic vs. rendering)
- Reusable logic across components
- Better testability (hooks can be tested in isolation)
- Cleaner component code
- Easier to reason about component behavior

**Guidelines:**
- Name hooks with "use" prefix (useOnboardingState, useAnalytics)
- Keep hooks focused on single responsibility
- Extract complex logic into custom hooks
- Use built-in hooks (useState, useEffect, useCallback) as building blocks
- Return stable references from hooks (use useCallback for functions)

### 3. React.memo for Performance Optimization

**Pattern:** Components that render frequently or have expensive render operations are wrapped with React.memo to prevent unnecessary re-renders. This is critical for React Native performance.

**Example from PR #2213:**
```typescript
export const ProgressIndicator = React.memo<ProgressIndicatorProps>(
  ({ currentScreen, total }) => {
    const styles = useZestStyles(stylesConfig);

    return (
      <View style={styles.progressContainer}>
        {Array.from({ length: total }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressDot,
              index === currentScreen && styles.progressDotActive,
            ]}
          />
        ))}
      </View>
    );
  }
);

// Add display name for debugging
ProgressIndicator.displayName = 'ProgressIndicator';
```

**Custom comparison function for complex props:**
```typescript
interface RecipeCardProps {
  recipe: Recipe;
  onPress: (id: string) => void;
  isSelected: boolean;
}

const RecipeCard = React.memo<RecipeCardProps>(
  ({ recipe, onPress, isSelected }) => {
    return (
      <TouchableOpacity onPress={() => onPress(recipe.id)}>
        <Text>{recipe.name}</Text>
      </TouchableOpacity>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison: only re-render if these specific fields change
    return (
      prevProps.recipe.id === nextProps.recipe.id &&
      prevProps.isSelected === nextProps.isSelected
    );
  }
);
```

**Frequency:** 70% of reusable components

**Why:** React.memo prevents:
- Unnecessary re-renders when parent updates
- Expensive recalculations in render
- Janky scrolling in lists
- Performance issues on lower-end devices

**Guidelines:**
- Use React.memo for components rendered in lists (FlatList items)
- Apply to components with expensive render logic
- Wrap components that receive stable props from parent
- Add displayName for better debugging experience
- Use custom comparison function only when default shallow comparison isn't sufficient

### 4. SafeAreaView for Mobile Layout

**Pattern:** Screens use SafeAreaView from react-native-safe-area-context to handle device notches and safe areas. Edges prop is used to specify which edges need safe area treatment.

**Example from PR #2213:**
```typescript
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';

export const OnboardingScreen = () => {
  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.container} testID="onboarding-screen">
          <View style={styles.header}>
            <Text type="headline-lg">Welcome</Text>
          </View>

          <View style={styles.content}>
            {/* Main content */}
          </View>

          <View style={styles.footer}>
            <Button onPress={handleContinue}>Continue</Button>
          </View>
        </View>
      </SafeAreaView>
    </>
  );
};

const stylesConfig = createStyles((theme) => ({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
  },
}));
```

**Modal with all edges:**
```typescript
export const FullScreenModal = () => {
  return (
    <>
      <StatusBar barStyle="light-content" />
      <SafeAreaView
        style={styles.container}
        edges={['top', 'bottom', 'left', 'right']}
      >
        {/* Modal content */}
      </SafeAreaView>
    </>
  );
};
```

**Frequency:** 100% of full-screen components

**Why:** SafeAreaView ensures:
- Content doesn't overlap with notches or home indicators
- Consistent layout across different device models
- Proper spacing on iPhone X and newer devices
- Android gesture navigation support
- Professional, polished UI appearance

**Guidelines:**
- Import from 'react-native-safe-area-context', not 'react-native'
- Use edges prop to specify which edges need insets (['top'], ['bottom'], ['top', 'bottom'])
- Combine with StatusBar component for status bar styling
- Apply flex: 1 to SafeAreaView for full-screen layouts
- Use edges={['top']} for screens with tab bars (tab bar handles bottom)

### 5. Component File Organization

**Pattern:** Components are organized in feature directories with co-located files for component, styles, types, hooks, and tests.

**File structure:**
```
src/features/onboarding/
├── OnboardingScreen.tsx          # Main component
├── components/                    # Sub-components
│   ├── ProgressIndicator.tsx
│   ├── OnboardingSlide.tsx
│   └── SkipButton.tsx
├── hooks/                         # Custom hooks
│   ├── useOnboardingState.ts
│   ├── useOnboardingNavigation.ts
│   └── useOnboardingAnalytics.ts
├── styles.ts                      # Zest styles config
├── types.ts                       # TypeScript types
├── constants.ts                   # Constants and config
└── __tests__/
    ├── OnboardingScreen.test.tsx
    └── useOnboardingState.test.ts
```

**Example types.ts:**
```typescript
// types.ts
export interface OnboardingScreenComponentProps {
  navigation: NativeStackNavigationProp<
    SocialRecipeBridgeStackParamsList,
    SocialRecipeBridgeStackRoutes.SocialRecipeBridgeOnboarding
  >;
  route: RouteProp<
    SocialRecipeBridgeStackParamsList,
    SocialRecipeBridgeStackRoutes.SocialRecipeBridgeOnboarding
  >;
}

export type ScreenIndex = 0 | 1 | 2 | 3;

export interface OnboardingSlideContent {
  headline: string;
  subHeadline: string;
  image: ImageSourcePropType;
  ctaText: string;
}
```

**Example constants.ts:**
```typescript
// constants.ts
import { ImageSourcePropType } from 'react-native';

export const SCREEN_COUNT = 4;

export const ONBOARDING_SLIDES: OnboardingSlideContent[] = [
  {
    headline: 'social-recipe-bridge.onboarding.screen1.headline',
    subHeadline: 'social-recipe-bridge.onboarding.screen1.sub_headline',
    image: require('./assets/screen1.png'),
    ctaText: 'social-recipe-bridge.onboarding.screen1.cta',
  },
  // ... more slides
];
```

**Frequency:** 100% of feature modules

**Guidelines:**
- Group related components in feature directories
- Co-locate styles, types, and hooks with components
- Use index.ts to export public API
- Keep sub-components in components/ subdirectory
- Place tests in __tests__/ directory

### 6. Conditional Rendering Patterns

**Pattern:** Use explicit conditional rendering with early returns, ternary operators for inline conditions, and logical && for optional elements.

**Early return pattern:**
```typescript
export const RecipeDetailScreen = ({ route }: Props) => {
  const { data: recipe, isLoading, error } = useRecipeQuery(route.params.recipeId);

  // Early return for loading state
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Early return for error state
  if (error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  // Early return if no data
  if (!recipe) {
    return <EmptyState />;
  }

  // Main render
  return (
    <ScrollView>
      <RecipeHeader recipe={recipe} />
      <RecipeIngredients ingredients={recipe.ingredients} />
      <RecipeSteps steps={recipe.steps} />
    </ScrollView>
  );
};
```

**Inline ternary for simple conditions:**
```typescript
<View style={styles.container}>
  <Text>{isLoading ? 'Loading...' : recipe.name}</Text>

  <Button
    variant={isPremium ? 'primary' : 'secondary'}
    onPress={handlePress}
  >
    {isPremium ? 'Download' : 'Upgrade to Download'}
  </Button>
</View>
```

**Logical && for optional elements:**
```typescript
<View style={styles.container}>
  <RecipeImage source={recipe.imageUrl} />

  {/* Show badge only if recipe is new */}
  {recipe.isNew && <NewBadge />}

  {/* Show rating only if available */}
  {recipe.rating && <StarRating value={recipe.rating} />}

  {/* Show description only if present */}
  {recipe.description && (
    <Text type="body-md-regular">{recipe.description}</Text>
  )}
</View>
```

**Frequency:** 100% of components

**Guidelines:**
- Use early returns for loading/error states
- Use ternary operators for inline conditions
- Use logical && for optional elements (ensure left side is boolean, not number)
- Avoid nested ternaries (extract to variable or helper function)
- Keep conditional logic simple and readable

## Implementation Guidelines

### Component Structure Best Practices

**Standard component structure:**
```typescript
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text } from 'react-native';
import { useZestStyles } from '@zest/react-native';

// 1. Import types
import type { MyComponentProps } from './types';

// 2. Import hooks
import { useMyFeature } from './hooks/useMyFeature';

// 3. Import styles
import { stylesConfig } from './styles';

// 4. Define component
export const MyComponent: React.FC<MyComponentProps> = ({
  prop1,
  prop2,
}) => {
  // 5. Hooks at the top
  const styles = useZestStyles(stylesConfig);
  const { data, isLoading } = useMyFeature();

  // 6. Local state
  const [selected, setSelected] = useState<string | null>(null);

  // 7. Event handlers with useCallback
  const handlePress = useCallback(() => {
    setSelected(data.id);
  }, [data.id]);

  // 8. Effects
  useEffect(() => {
    // Side effects
  }, []);

  // 9. Early returns for special states
  if (isLoading) return <LoadingSpinner />;

  // 10. Main render
  return (
    <View style={styles.container}>
      <Text>{data.title}</Text>
    </View>
  );
};

// 11. Display name for debugging
MyComponent.displayName = 'MyComponent';
```

**Avoid deeply nested JSX:**
```typescript
// ❌ Bad - deeply nested and hard to read
<View style={styles.container}>
  <View style={styles.header}>
    <View style={styles.titleContainer}>
      <View style={styles.iconWrapper}>
        <Icon name="star" />
      </View>
      <View style={styles.textWrapper}>
        <Text type="headline-md">{title}</Text>
        <View style={styles.subtitleWrapper}>
          <Text type="body-sm-regular">{subtitle}</Text>
        </View>
      </View>
    </View>
  </View>
</View>

// ✅ Good - extract into sub-components
<View style={styles.container}>
  <Header>
    <TitleSection icon="star" title={title} subtitle={subtitle} />
  </Header>
</View>
```

### Testing Components

**Unit tests with React Native Testing Library:**
```typescript
import { render, screen, fireEvent } from '@testing-library/react-native';
import { OnboardingScreen } from '../OnboardingScreen';

describe('OnboardingScreen', () => {
  const mockNavigation = {
    goBack: jest.fn(),
  };

  it('renders onboarding screen with first slide', () => {
    render(
      <OnboardingScreen
        navigation={mockNavigation}
        route={{} as any}
      />
    );

    expect(screen.getByTestId('onboarding-screen')).toBeTruthy();
    expect(screen.getByText(/Discover your midweek inspiration/)).toBeTruthy();
  });

  it('advances to next screen on next button press', () => {
    render(<OnboardingScreen navigation={mockNavigation} route={{} as any} />);

    const nextButton = screen.getByTestId('onboarding-next-button');
    fireEvent.press(nextButton);

    // Assert second screen is shown
    expect(screen.getByText(/screen 2 content/)).toBeTruthy();
  });

  it('calls navigation.goBack when skip is pressed', () => {
    render(<OnboardingScreen navigation={mockNavigation} route={{} as any} />);

    const skipButton = screen.getByTestId('onboarding-skip-button');
    fireEvent.press(skipButton);

    expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
  });
});
```

**Testing memoized components:**
```typescript
describe('RecipeCard', () => {
  it('does not re-render when unrelated props change', () => {
    const renderSpy = jest.fn();

    const RecipeCardWithSpy = React.memo<RecipeCardProps>((props) => {
      renderSpy();
      return <RecipeCard {...props} />;
    });

    const { rerender } = render(
      <RecipeCardWithSpy
        recipe={mockRecipe}
        isSelected={false}
        unrelatedProp="value1"
      />
    );

    expect(renderSpy).toHaveBeenCalledTimes(1);

    // Re-render with same recipe and isSelected, different unrelatedProp
    rerender(
      <RecipeCardWithSpy
        recipe={mockRecipe}
        isSelected={false}
        unrelatedProp="value2"
      />
    );

    // Component should NOT re-render because memoized props haven't changed
    expect(renderSpy).toHaveBeenCalledTimes(1);
  });
});
```

## Anti-Patterns to Avoid

❌ **Don't use class components:**
```typescript
// ❌ Bad - class components are legacy
class MyComponent extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { count: 0 };
  }

  render() {
    return <View><Text>{this.state.count}</Text></View>;
  }
}
```

✅ **Use functional components:**
```typescript
// ✅ Good - functional component with hooks
const MyComponent: React.FC<Props> = ({ initialCount }) => {
  const [count, setCount] = useState(initialCount);

  return (
    <View>
      <Text>{count}</Text>
    </View>
  );
};
```

❌ **Don't use inline styles:**
```typescript
// ❌ Bad - inline styles recreated on every render
<View style={{
  backgroundColor: '#fff',
  padding: 16,
  marginTop: 8
}}>
  <Text>Content</Text>
</View>
```

✅ **Use Zest design system:**
```typescript
// ✅ Good - styles from Zest theme
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
  },
}));
```

❌ **Don't use any type:**
```typescript
// ❌ Bad - loses type safety
interface Props {
  data: any;
  onPress: any;
}
```

✅ **Use explicit types:**
```typescript
// ✅ Good - explicit types
interface Props {
  data: Recipe[];
  onPress: (recipeId: string) => void;
}
```

❌ **Don't mutate props:**
```typescript
// ❌ Bad - mutating props
const MyComponent = ({ items }: Props) => {
  items.push(newItem); // NEVER mutate props
  return <List items={items} />;
};
```

✅ **Create new references:**
```typescript
// ✅ Good - create new array
const MyComponent = ({ items }: Props) => {
  const updatedItems = [...items, newItem];
  return <List items={updatedItems} />;
};
```

## Related Implementers

- **styling.md** - Zest design system patterns for styling components
- **state-management.md** - Zustand stores and state patterns used in components
- **navigation.md** - React Navigation integration and screen navigation
- **testing.md** - Component testing strategies with Jest and RTL
- **accessibility.md** - Accessibility props and patterns for components
- **performance-optimization.md** - Performance optimization techniques
- **internationalization.md** - Translation and i18n patterns for component text
