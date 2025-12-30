---
domain: testing
description: Verify Jest + React Testing Library setup, MSW integration, testID conventions, native module mocking, and test coverage for React Native apps
---

# Testing Verification

Verify that React Native testing implementations follow best practices for Jest configuration, React Testing Library usage, MSW integration, testID conventions, native module mocking, and test coverage.

## Verification Checklist

### 1. Jest Configuration

**Requirement:** Jest must be properly configured for React Native with correct presets, transformIgnorePatterns, and setup files.

**Verification Steps:**

✅ **Check Jest preset and transform configuration:**
```javascript
// ✅ Correct - proper React Native preset and transforms
// jest.config.js
module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: [
    '@testing-library/jest-native/extend-expect',
    '<rootDir>/jest.setup.js',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-vector-icons|react-native-reanimated|@react-native-community)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};

// ❌ Incorrect - missing critical transform patterns
module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [
    'node_modules/',  // Too broad - will break RN dependencies!
  ],
};
```

✅ **Check coverage configuration:**
```javascript
// ✅ Correct - comprehensive coverage with exclusions
module.exports = {
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
  ],
  coverageThresholds: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};

// ❌ Incorrect - no coverage thresholds or exclusions
module.exports = {
  collectCoverageFrom: ['src/**/*.ts'],  // Too broad, no exclusions
};
```

✅ **Check test setup file:**
```javascript
// ✅ Correct - comprehensive jest.setup.js
// jest.setup.js
import 'react-native-gesture-handler/jestSetup';
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import { cleanup } from '@testing-library/react-native';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Mock native modules
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');

// Mock react-navigation
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
  }),
  useRoute: () => ({ params: {} }),
  useFocusEffect: jest.fn(),
}));

// Cleanup after each test
afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

// ❌ Incorrect - minimal or missing setup
import 'react-native-gesture-handler/jestSetup';
// Missing AsyncStorage, navigation mocks, cleanup!
```

**How to Verify:**
```bash
# Check Jest configuration exists
test -f jest.config.js && echo "✅ Jest config found" || echo "❌ Jest config missing"

# Check setup file exists
test -f jest.setup.js && echo "✅ Setup file found" || echo "❌ Setup file missing"

# Verify preset is react-native
grep "preset.*react-native" jest.config.js && echo "✅ Correct preset" || echo "❌ Wrong preset"

# Check transformIgnorePatterns includes React Native packages
grep "transformIgnorePatterns" jest.config.js | grep "react-native" && echo "✅ Transform patterns correct" || echo "❌ Transform patterns missing"

# Run tests to verify configuration works
npm test -- --passWithNoTests
```

---

### 2. Component Testing with RTL

**Requirement:** Components must be tested using React Testing Library with proper queries, accessibility, and user interactions.

**Verification Steps:**

✅ **Check RTL imports and usage:**
```typescript
// ✅ Correct - proper RTL imports and queries
import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Button } from '../Button';

describe('Button', () => {
  it('renders correctly with label', () => {
    render(<Button label="Click me" onPress={jest.fn()} />);

    expect(screen.getByText('Click me')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPressMock = jest.fn();
    render(<Button label="Click me" onPress={onPressMock} />);

    fireEvent.press(screen.getByText('Click me'));

    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it('is accessible', () => {
    const { getByLabelText } = render(
      <Button label="Submit" accessibilityLabel="Submit form" onPress={jest.fn()} />
    );

    expect(getByLabelText('Submit form')).toBeTruthy();
  });
});

// ❌ Incorrect - using enzyme or wrong queries
import { shallow } from 'enzyme';  // Don't use enzyme!

it('renders button', () => {
  const wrapper = shallow(<Button label="Click" />);  // ❌ Wrong approach
  expect(wrapper.find('TouchableOpacity')).toHaveLength(1);  // ❌ Implementation detail
});
```

✅ **Check testID usage:**
```typescript
// ✅ Correct - descriptive testID following conventions
// Component
export const ProductCard: React.FC<Props> = ({ product }) => {
  return (
    <View testID={`product-card-${product.id}`}>
      <Text testID="product-card-title">{product.title}</Text>
      <Text testID="product-card-price">${product.price}</Text>
      <Button testID="product-card-add-button" onPress={handleAdd}>
        Add to Cart
      </Button>
    </View>
  );
};

// Test
it('displays product information', () => {
  const product = { id: '123', title: 'Test Product', price: 19.99 };
  render(<ProductCard product={product} />);

  expect(screen.getByTestId('product-card-123')).toBeTruthy();
  expect(screen.getByTestId('product-card-title')).toHaveTextContent('Test Product');
  expect(screen.getByTestId('product-card-price')).toHaveTextContent('$19.99');
});

// ❌ Incorrect - vague or missing testIDs
<View testID="view1">  {/* ❌ Not descriptive */}
  <Text>{product.title}</Text>  {/* ❌ Missing testID */}
</View>
```

✅ **Check async testing:**
```typescript
// ✅ Correct - proper async/await with waitFor
it('loads and displays user data', async () => {
  render(<UserProfile userId="123" />);

  expect(screen.getByTestId('loading-spinner')).toBeTruthy();

  await waitFor(() => {
    expect(screen.getByText('John Doe')).toBeTruthy();
  });

  expect(screen.queryByTestId('loading-spinner')).toBeNull();
});

// ❌ Incorrect - no waiting for async operations
it('displays user data', () => {
  render(<UserProfile userId="123" />);
  expect(screen.getByText('John Doe')).toBeTruthy();  // ❌ Will fail - data not loaded yet
});
```

**How to Verify:**
```bash
# Check for RTL imports in test files
find src -name "*.test.tsx" -o -name "*.test.ts" | xargs grep "@testing-library/react-native" && echo "✅ Using RTL" || echo "❌ Not using RTL"

# Check for enzyme imports (anti-pattern)
find src -name "*.test.*" | xargs grep "enzyme" && echo "❌ Found enzyme usage" || echo "✅ No enzyme"

# Check for testID usage in components
grep -r "testID=" src --include="*.tsx" | wc -l

# Run component tests
npm test -- --testPathPattern="components" --passWithNoTests
```

---

### 3. MSW Integration for API Mocking

**Requirement:** API calls must be mocked using MSW (Mock Service Worker) at the network level, not by mocking hooks.

**Verification Steps:**

✅ **Check MSW setup:**
```typescript
// ✅ Correct - MSW server setup
// src/__mocks__/server.ts
import { setupServer } from 'msw/native';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

// jest.setup.js
import { server } from './src/__mocks__/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// ❌ Incorrect - mocking Apollo/TanStack Query hooks
jest.mock('@apollo/client', () => ({
  useQuery: jest.fn(),  // ❌ Don't mock hooks directly!
}));
```

✅ **Check MSW handlers organization:**
```typescript
// ✅ Correct - organized handlers by domain
// src/__mocks__/handlers/index.ts
import { recipeHandlers } from './recipes';
import { userHandlers } from './users';
import { orderHandlers } from './orders';

export const handlers = [
  ...recipeHandlers,
  ...userHandlers,
  ...orderHandlers,
];

// src/__mocks__/handlers/recipes.ts
import { graphql, http, HttpResponse } from 'msw';

export const recipeHandlers = [
  graphql.query('GetRecipes', ({ query, variables }) => {
    return HttpResponse.json({
      data: {
        recipes: [
          { id: '1', title: 'Test Recipe', cookTime: 30 },
        ],
      },
    });
  }),

  http.get('https://api.example.com/recipes/:id', ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      title: 'Test Recipe',
      ingredients: [],
    });
  }),
];

// ❌ Incorrect - all handlers in one file
export const handlers = [
  // 50+ handlers mixed together - hard to maintain!
];
```

✅ **Check MSW usage in tests:**
```typescript
// ✅ Correct - using MSW in integration tests
import { server } from '@/__mocks__/server';
import { graphql, HttpResponse } from 'msw';

describe('RecipeList Integration', () => {
  it('displays recipes from API', async () => {
    server.use(
      graphql.query('GetRecipes', () => {
        return HttpResponse.json({
          data: {
            recipes: [
              { id: '1', title: 'Pasta Carbonara' },
              { id: '2', title: 'Caesar Salad' },
            ],
          },
        });
      })
    );

    render(<RecipeList />);

    await waitFor(() => {
      expect(screen.getByText('Pasta Carbonara')).toBeTruthy();
      expect(screen.getByText('Caesar Salad')).toBeTruthy();
    });
  });

  it('handles API errors', async () => {
    server.use(
      graphql.query('GetRecipes', () => {
        return HttpResponse.json(
          { errors: [{ message: 'Network error' }] },
          { status: 500 }
        );
      })
    );

    render(<RecipeList />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load recipes')).toBeTruthy();
    });
  });
});

// ❌ Incorrect - mocking useQuery hook
jest.mock('@apollo/client', () => ({
  useQuery: jest.fn(() => ({
    data: { recipes: [] },
    loading: false,
  })),
}));
```

**How to Verify:**
```bash
# Check for MSW setup
test -f src/__mocks__/server.ts && echo "✅ MSW server setup found" || echo "❌ MSW server missing"

# Check for handlers directory
test -d src/__mocks__/handlers && echo "✅ Handlers directory found" || echo "❌ Handlers missing"

# Check for hook mocking anti-pattern
find src -name "*.test.*" | xargs grep "jest.mock.*useQuery" && echo "❌ Mocking hooks directly" || echo "✅ Not mocking hooks"

# Check MSW is imported in test files
find src -name "*.test.*" | xargs grep "from 'msw'" | wc -l
```

---

### 4. Custom Hook Testing

**Requirement:** Custom hooks must be tested using renderHook from RTL, not by creating wrapper components.

**Verification Steps:**

✅ **Check renderHook usage:**
```typescript
// ✅ Correct - using renderHook from RTL
import { renderHook, waitFor } from '@testing-library/react-native';
import { useRecipes } from '../useRecipes';

describe('useRecipes', () => {
  it('fetches recipes on mount', async () => {
    const { result } = renderHook(() => useRecipes());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.recipes).toHaveLength(2);
  });

  it('refetches recipes when refresh is called', async () => {
    const { result } = renderHook(() => useRecipes());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.refetch();
    });

    expect(result.current.loading).toBe(true);
  });
});

// ❌ Incorrect - creating wrapper component to test hook
const TestComponent = () => {
  const { recipes, loading } = useRecipes();  // ❌ Don't do this
  return <Text>{loading ? 'Loading' : recipes.length}</Text>;
};

it('fetches recipes', () => {
  render(<TestComponent />);  // ❌ Wrong approach
});
```

✅ **Check hook wrapper for providers:**
```typescript
// ✅ Correct - providing necessary context
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('useUserProfile', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  it('loads user profile', async () => {
    const { result } = renderHook(() => useUserProfile('123'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.name).toBe('John Doe');
  });
});

// ❌ Incorrect - missing required providers
const { result } = renderHook(() => useUserProfile('123'));
// ❌ Will fail - hook needs QueryClientProvider!
```

**How to Verify:**
```bash
# Check for renderHook usage
find src -name "*.test.*" | xargs grep "renderHook" && echo "✅ Using renderHook" || echo "❌ Not testing hooks properly"

# Check for hook testing anti-pattern (wrapper components)
find src -name "*.test.*" | xargs grep "const TestComponent.*use[A-Z]" && echo "❌ Using wrapper components" || echo "✅ No wrapper anti-pattern"

# Run hook tests
npm test -- --testPathPattern="hooks" --passWithNoTests
```

---

### 5. Native Module Mocking

**Requirement:** Native modules must be selectively mocked only when necessary, with clear mock implementations.

**Verification Steps:**

✅ **Check selective native module mocking:**
```typescript
// ✅ Correct - selective mocking with clear implementations
// jest.setup.js

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock react-native-permissions
jest.mock('react-native-permissions', () => ({
  check: jest.fn(() => Promise.resolve('granted')),
  request: jest.fn(() => Promise.resolve('granted')),
  PERMISSIONS: {
    IOS: { CAMERA: 'ios.permission.CAMERA' },
    ANDROID: { CAMERA: 'android.permission.CAMERA' },
  },
  RESULTS: {
    GRANTED: 'granted',
    DENIED: 'denied',
  },
}));

// Mock specific native module methods
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return Object.setPrototypeOf(
    {
      Platform: {
        ...RN.Platform,
        OS: 'ios',
        select: jest.fn((obj) => obj.ios),
      },
      NativeModules: {
        ...RN.NativeModules,
        SettingsManager: {
          settings: {
            AppleLocale: 'en_US',
          },
        },
      },
    },
    RN
  );
});

// ❌ Incorrect - mocking entire react-native
jest.mock('react-native', () => ({
  Platform: {},
  View: 'View',
  Text: 'Text',
  // ❌ Breaks actual RN functionality!
}));
```

✅ **Check per-test native module overrides:**
```typescript
// ✅ Correct - overriding mocks for specific tests
describe('LocationPicker', () => {
  it('handles denied permissions', async () => {
    const { check } = require('react-native-permissions');
    check.mockResolvedValueOnce('denied');

    render(<LocationPicker />);

    await waitFor(() => {
      expect(screen.getByText('Location permission denied')).toBeTruthy();
    });
  });

  it('handles granted permissions', async () => {
    const { check } = require('react-native-permissions');
    check.mockResolvedValueOnce('granted');

    render(<LocationPicker />);

    await waitFor(() => {
      expect(screen.getByTestId('location-map')).toBeTruthy();
    });
  });
});

// ❌ Incorrect - no way to test different permission states
jest.mock('react-native-permissions', () => ({
  check: jest.fn(() => Promise.resolve('granted')),  // ❌ Always granted!
}));
```

**How to Verify:**
```bash
# Check for native module mocks in setup
grep -E "jest.mock.*react-native" jest.setup.js && echo "✅ Native modules mocked" || echo "❌ No native mocks"

# Check for AsyncStorage mock
grep "async-storage" jest.setup.js && echo "✅ AsyncStorage mocked" || echo "❌ AsyncStorage not mocked"

# Check for overly broad mocks
grep "jest.mock('react-native'," jest.setup.js | grep -v "requireActual" && echo "❌ Overly broad mock" || echo "✅ Selective mocking"
```

---

### 6. Test Coverage and Quality

**Requirement:** Tests must achieve minimum coverage thresholds (80%) and follow quality standards.

**Verification Steps:**

✅ **Check test file organization:**
```bash
# ✅ Correct - co-located tests
src/
├── components/
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.styles.ts
│   │   └── __tests__/
│   │       └── Button.test.tsx
│   └── Card/
│       ├── Card.tsx
│       └── __tests__/
│           └── Card.test.tsx
├── hooks/
│   ├── useRecipes.ts
│   └── __tests__/
│       └── useRecipes.test.ts

# ❌ Incorrect - separate __tests__ directory
src/
├── components/
│   ├── Button.tsx
│   └── Card.tsx
├── hooks/
│   └── useRecipes.ts
└── __tests__/  # ❌ Not co-located
    ├── Button.test.tsx
    └── Card.test.tsx
```

✅ **Check test naming conventions:**
```typescript
// ✅ Correct - descriptive test names
describe('RecipeCard', () => {
  it('displays recipe title and cook time', () => {
    // Test implementation
  });

  it('calls onPress with recipe ID when card is tapped', () => {
    // Test implementation
  });

  it('shows placeholder image when image fails to load', () => {
    // Test implementation
  });

  it('applies correct accessibility labels for screen readers', () => {
    // Test implementation
  });
});

// ❌ Incorrect - vague or unclear test names
describe('RecipeCard', () => {
  it('works', () => {  // ❌ Not descriptive
  });

  it('test 1', () => {  // ❌ No information
  });

  it('renders', () => {  // ❌ Too vague
  });
});
```

✅ **Check test isolation:**
```typescript
// ✅ Correct - each test is isolated
describe('CartStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useCartStore.setState({ items: [], total: 0 });
  });

  it('adds item to cart', () => {
    const { result } = renderHook(() => useCartStore());

    act(() => {
      result.current.addItem({ id: '1', name: 'Product', price: 10 });
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.total).toBe(10);
  });

  it('removes item from cart', () => {
    // Test is isolated - doesn't depend on previous test
    useCartStore.setState({
      items: [{ id: '1', name: 'Product', price: 10 }],
      total: 10
    });

    const { result } = renderHook(() => useCartStore());

    act(() => {
      result.current.removeItem('1');
    });

    expect(result.current.items).toHaveLength(0);
  });
});

// ❌ Incorrect - tests depend on each other
let store;

it('adds item', () => {
  store = useCartStore();
  store.addItem({ id: '1' });
});

it('removes item', () => {
  store.removeItem('1');  // ❌ Depends on previous test!
});
```

**How to Verify:**
```bash
# Run tests with coverage
npm test -- --coverage --passWithNoTests

# Check coverage thresholds are met
npm test -- --coverage --passWithNoTests | grep "All files" | grep -E "[89][0-9]\.[0-9]+|100"

# Count test files vs source files
SRC_FILES=$(find src -name "*.tsx" -o -name "*.ts" | grep -v ".test." | grep -v ".d.ts" | wc -l)
TEST_FILES=$(find src -name "*.test.tsx" -o -name "*.test.ts" | wc -l)
echo "Source files: $SRC_FILES, Test files: $TEST_FILES"

# Check for test isolation (no cross-test dependencies)
find src -name "*.test.*" | xargs grep -l "let.*describe\|var.*describe" && echo "❌ Potential test isolation issues" || echo "✅ Tests appear isolated"
```

---

## Common Issues and Fixes

### Issue 1: Tests Fail with "Cannot find module" Errors

**Symptoms:**
```
Cannot find module 'react-native-vector-icons' from 'Button.tsx'
```

**Root Cause:** Missing transformIgnorePatterns for React Native dependencies

**Fix:**
```javascript
// jest.config.js
module.exports = {
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-vector-icons|react-native-reanimated|@react-native-community)/)',
  ],
};
```

---

### Issue 2: Async Tests Timing Out

**Symptoms:**
```
Timeout - Async callback was not invoked within the 5000 ms timeout
```

**Root Cause:** Not waiting for async operations to complete

**Fix:**
```typescript
// ❌ Before
it('loads data', () => {
  render(<DataComponent />);
  expect(screen.getByText('Data loaded')).toBeTruthy();  // Fails - data not loaded yet
});

// ✅ After
it('loads data', async () => {
  render(<DataComponent />);

  await waitFor(() => {
    expect(screen.getByText('Data loaded')).toBeTruthy();
  }, { timeout: 3000 });
});
```

---

### Issue 3: MSW Handlers Not Being Called

**Symptoms:**
- API calls fail in tests
- "No matching handler found" warnings

**Root Cause:** MSW server not properly initialized or handlers don't match requests

**Fix:**
```typescript
// ✅ Ensure server is initialized in jest.setup.js
import { server } from './src/__mocks__/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// ✅ Match exact GraphQL operation names
graphql.query('GetRecipes', () => {  // Must match exact operation name in code
  return HttpResponse.json({ data: { recipes: [] } });
});

// ✅ Match exact REST endpoints
http.get('https://api.example.com/recipes', () => {  // Must match exact URL
  return HttpResponse.json([]);
});
```

---

### Issue 4: Navigation Mocks Not Working

**Symptoms:**
```
Cannot read property 'navigate' of undefined
```

**Root Cause:** Missing or incomplete navigation mocks

**Fix:**
```typescript
// jest.setup.js
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      reset: jest.fn(),
      setOptions: jest.fn(),
      setParams: jest.fn(),
      dispatch: jest.fn(),
      canGoBack: jest.fn(() => true),
      isFocused: jest.fn(() => true),
    }),
    useRoute: () => ({
      key: 'test',
      name: 'TestScreen',
      params: {},
    }),
    useFocusEffect: jest.fn((callback) => callback()),
    useIsFocused: jest.fn(() => true),
  };
});
```

---

## Anti-Patterns to Avoid

### ❌ Don't Mock React Hooks Directly

**Bad:**
```typescript
jest.mock('@apollo/client', () => ({
  useQuery: jest.fn(() => ({
    data: mockData,
    loading: false,
  })),
}));
```

**Good:**
```typescript
// Use MSW to mock at network level
import { server } from '@/__mocks__/server';
import { graphql, HttpResponse } from 'msw';

server.use(
  graphql.query('GetRecipes', () => {
    return HttpResponse.json({ data: mockData });
  })
);
```

---

### ❌ Don't Test Implementation Details

**Bad:**
```typescript
// Testing state variable names
expect(wrapper.state('isLoading')).toBe(false);

// Testing class names
expect(wrapper.find('.button-primary')).toHaveLength(1);

// Testing props passed to children
expect(wrapper.find('Button').prop('onClick')).toBeDefined();
```

**Good:**
```typescript
// Test behavior and what user sees
expect(screen.getByText('Submit')).toBeTruthy();
expect(screen.queryByTestId('loading-spinner')).toBeNull();

fireEvent.press(screen.getByText('Submit'));
expect(onSubmit).toHaveBeenCalled();
```

---

### ❌ Don't Create Wrapper Components to Test Hooks

**Bad:**
```typescript
const TestComponent = () => {
  const { data } = useRecipes();
  return <Text>{data.length}</Text>;
};

it('fetches recipes', () => {
  render(<TestComponent />);
});
```

**Good:**
```typescript
const { result } = renderHook(() => useRecipes());

await waitFor(() => {
  expect(result.current.data).toHaveLength(5);
});
```

---

### ❌ Don't Mock Entire react-native Package

**Bad:**
```typescript
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  View: 'View',
  Text: 'Text',
  // Breaks everything!
}));
```

**Good:**
```typescript
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return Object.setPrototypeOf(
    {
      Platform: {
        ...RN.Platform,
        OS: 'ios',
        select: jest.fn((obj) => obj.ios),
      },
    },
    RN
  );
});
```

---

## Related Verifiers

- **react-native-components.md** - Component structure verification
- **state-management.md** - Zustand store testing verification
- **data-fetching.md** - Apollo/TanStack Query integration verification
- **accessibility.md** - Accessibility testing verification
