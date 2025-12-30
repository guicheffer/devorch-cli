---
domain: testing
description: Jest + React Testing Library for unit tests, MSW for integration tests, testID conventions, hook testing, native module mocking
---

# Testing Implementer

This implementer defines patterns for testing React Native applications using Jest and React Testing Library, including unit tests, integration tests with MSW, testID conventions, custom hook testing, and native module mocking.

## Core Patterns

### Jest Configuration

Configure Jest for React Native testing:

```javascript
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
  testMatch: [
    '**/__tests__/**/*.(test|spec).[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  globals: {
    __DEV__: true,
  },
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  cacheDirectory: '<rootDir>/.jest-cache',
};

// jest.setup.js
import 'react-native-gesture-handler/jestSetup';
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import { cleanup } from '@testing-library/react-native';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Mock react-native modules
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');

// Mock native modules
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
            AppleLanguages: ['en_US'],
          },
        },
      },
    },
    RN
  );
});

// Cleanup after each test
afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

// Suppress console errors in tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};

// Mock react-navigation
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
    setParams: jest.fn(),
    canGoBack: jest.fn(() => true),
  }),
  useRoute: () => ({
    params: {},
  }),
  useFocusEffect: jest.fn(),
}));
```

### Component Testing

Test React Native components with RTL:

```typescript
// src/components/Button/__tests__/Button.test.tsx
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Button } from '../Button';

describe('Button', () => {
  it('renders correctly with label', () => {
    render(<Button label="Click me" onPress={jest.fn()} />);

    expect(screen.getByText('Click me')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPressMock = jest.fn();
    render(<Button label="Click me" onPress={onPressMock} />);

    const button = screen.getByText('Click me');
    fireEvent.press(button);

    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    const onPressMock = jest.fn();
    render(<Button label="Click me" onPress={onPressMock} disabled />);

    const button = screen.getByText('Click me');
    fireEvent.press(button);

    expect(onPressMock).not.toHaveBeenCalled();
  });

  it('shows loading indicator when loading', () => {
    render(<Button label="Click me" onPress={jest.fn()} loading />);

    expect(screen.getByTestId('button-loading-indicator')).toBeTruthy();
  });

  it('applies correct accessibility props', () => {
    render(
      <Button
        label="Click me"
        onPress={jest.fn()}
        accessibilityLabel="Custom label"
        accessibilityHint="Custom hint"
      />
    );

    const button = screen.getByLabelText('Custom label');
    expect(button).toBeTruthy();
    expect(button.props.accessibilityHint).toBe('Custom hint');
  });

  it('handles different button variants', () => {
    const { rerender } = render(
      <Button label="Primary" onPress={jest.fn()} variant="primary" />
    );

    let button = screen.getByTestId('button');
    expect(button.props.style).toContainEqual(
      expect.objectContaining({ backgroundColor: '#007AFF' })
    );

    rerender(<Button label="Secondary" onPress={jest.fn()} variant="secondary" />);

    button = screen.getByTestId('button');
    expect(button.props.style).toContainEqual(
      expect.objectContaining({ backgroundColor: '#8E8E93' })
    );
  });

  it('matches snapshot', () => {
    const tree = render(
      <Button label="Snapshot test" onPress={jest.fn()} />
    ).toJSON();

    expect(tree).toMatchSnapshot();
  });
});
```

### Screen Testing

Test complete screens with navigation:

```typescript
// src/screens/__tests__/ProfileScreen.test.tsx
import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileScreen } from '../ProfileScreen';
import { useUser } from '@/hooks/useUser';

// Mock hooks
jest.mock('@/hooks/useUser');
const mockUseUser = useUser as jest.MockedFunction<typeof useUser>;

// Create test navigation
const Stack = createNativeStackNavigator();

const renderWithNavigation = (component: React.ReactElement) => {
  return render(
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Profile" component={() => component} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

describe('ProfileScreen', () => {
  beforeEach(() => {
    mockUseUser.mockReturnValue({
      user: {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
        avatar: 'https://example.com/avatar.jpg',
      },
      loading: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  it('renders user information correctly', async () => {
    renderWithNavigation(<ProfileScreen />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeTruthy();
      expect(screen.getByText('john@example.com')).toBeTruthy();
    });
  });

  it('shows loading state while fetching user', () => {
    mockUseUser.mockReturnValue({
      user: null,
      loading: true,
      error: null,
      refetch: jest.fn(),
    });

    renderWithNavigation(<ProfileScreen />);

    expect(screen.getByTestId('profile-loading')).toBeTruthy();
  });

  it('shows error state when fetch fails', async () => {
    mockUseUser.mockReturnValue({
      user: null,
      loading: false,
      error: new Error('Failed to fetch user'),
      refetch: jest.fn(),
    });

    renderWithNavigation(<ProfileScreen />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch user/i)).toBeTruthy();
    });
  });

  it('allows editing profile when edit button is pressed', async () => {
    renderWithNavigation(<ProfileScreen />);

    const editButton = screen.getByTestId('edit-profile-button');
    fireEvent.press(editButton);

    await waitFor(() => {
      expect(screen.getByTestId('profile-edit-form')).toBeTruthy();
    });
  });

  it('refetches user data on pull to refresh', async () => {
    const refetchMock = jest.fn();
    mockUseUser.mockReturnValue({
      user: {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
        avatar: 'https://example.com/avatar.jpg',
      },
      loading: false,
      error: null,
      refetch: refetchMock,
    });

    renderWithNavigation(<ProfileScreen />);

    const scrollView = screen.getByTestId('profile-scroll-view');
    fireEvent(scrollView, 'refresh');

    await waitFor(() => {
      expect(refetchMock).toHaveBeenCalledTimes(1);
    });
  });
});
```

### Custom Hook Testing

Test custom hooks using renderHook:

```typescript
// src/hooks/__tests__/useCounter.test.ts
import { renderHook, act } from '@testing-library/react-native';
import { useCounter } from '../useCounter';

describe('useCounter', () => {
  it('initializes with default value', () => {
    const { result } = renderHook(() => useCounter());

    expect(result.current.count).toBe(0);
  });

  it('initializes with custom value', () => {
    const { result } = renderHook(() => useCounter(10));

    expect(result.current.count).toBe(10);
  });

  it('increments count', () => {
    const { result } = renderHook(() => useCounter(0));

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });

  it('decrements count', () => {
    const { result } = renderHook(() => useCounter(5));

    act(() => {
      result.current.decrement();
    });

    expect(result.current.count).toBe(4);
  });

  it('resets count to initial value', () => {
    const { result } = renderHook(() => useCounter(10));

    act(() => {
      result.current.increment();
      result.current.increment();
      result.current.reset();
    });

    expect(result.current.count).toBe(10);
  });
});

// src/hooks/__tests__/useAsync.test.ts
import { renderHook, waitFor } from '@testing-library/react-native';
import { useAsync } from '../useAsync';

describe('useAsync', () => {
  it('handles successful async operation', async () => {
    const asyncFn = jest.fn().mockResolvedValue('success');
    const { result } = renderHook(() => useAsync(asyncFn));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBe('success');
      expect(result.current.error).toBeNull();
    });
  });

  it('handles failed async operation', async () => {
    const error = new Error('Failed');
    const asyncFn = jest.fn().mockRejectedValue(error);
    const { result } = renderHook(() => useAsync(asyncFn));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toEqual(error);
    });
  });

  it('allows manual refetch', async () => {
    const asyncFn = jest.fn().mockResolvedValue('success');
    const { result } = renderHook(() => useAsync(asyncFn, { immediate: false }));

    expect(result.current.loading).toBe(false);

    act(() => {
      result.current.execute();
    });

    await waitFor(() => {
      expect(result.current.data).toBe('success');
    });

    expect(asyncFn).toHaveBeenCalledTimes(1);
  });
});
```

### Integration Testing with MSW

Set up MSW for API mocking:

```typescript
// src/test/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

// jest.setup.js additions
import { server } from './src/test/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// src/test/handlers.ts
import { rest } from 'msw';
import { API_BASE_URL } from '@/config/constants';

export const handlers = [
  // User endpoints
  rest.get(`${API_BASE_URL}/users/:userId`, (req, res, ctx) => {
    const { userId } = req.params;

    return res(
      ctx.status(200),
      ctx.json({
        id: userId,
        name: 'John Doe',
        email: 'john@example.com',
        avatar: 'https://example.com/avatar.jpg',
      })
    );
  }),

  rest.put(`${API_BASE_URL}/users/:userId`, async (req, res, ctx) => {
    const { userId } = req.params;
    const body = await req.json();

    return res(
      ctx.status(200),
      ctx.json({
        id: userId,
        ...body,
      })
    );
  }),

  // Posts endpoints
  rest.get(`${API_BASE_URL}/posts`, (req, res, ctx) => {
    const page = req.url.searchParams.get('page') || '1';

    return res(
      ctx.status(200),
      ctx.json({
        data: [
          { id: '1', title: 'Post 1', content: 'Content 1' },
          { id: '2', title: 'Post 2', content: 'Content 2' },
        ],
        page: parseInt(page),
        hasMore: true,
      })
    );
  }),

  rest.post(`${API_BASE_URL}/posts`, async (req, res, ctx) => {
    const body = await req.json();

    return res(
      ctx.status(201),
      ctx.json({
        id: '3',
        ...body,
        createdAt: new Date().toISOString(),
      })
    );
  }),
];

// src/screens/__tests__/FeedScreen.integration.test.tsx
import React from 'react';
import { render, waitFor, screen, fireEvent } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FeedScreen } from '../FeedScreen';
import { server } from '@/test/server';
import { rest } from 'msw';
import { API_BASE_URL } from '@/config/constants';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('FeedScreen Integration', () => {
  it('fetches and displays posts', async () => {
    renderWithProviders(<FeedScreen />);

    await waitFor(() => {
      expect(screen.getByText('Post 1')).toBeTruthy();
      expect(screen.getByText('Post 2')).toBeTruthy();
    });
  });

  it('handles API error gracefully', async () => {
    server.use(
      rest.get(`${API_BASE_URL}/posts`, (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ error: 'Server error' }));
      })
    );

    renderWithProviders(<FeedScreen />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeTruthy();
    });
  });

  it('creates a new post', async () => {
    renderWithProviders(<FeedScreen />);

    await waitFor(() => {
      expect(screen.getByText('Post 1')).toBeTruthy();
    });

    const createButton = screen.getByTestId('create-post-button');
    fireEvent.press(createButton);

    const titleInput = screen.getByTestId('post-title-input');
    const contentInput = screen.getByTestId('post-content-input');
    const submitButton = screen.getByTestId('post-submit-button');

    fireEvent.changeText(titleInput, 'New Post');
    fireEvent.changeText(contentInput, 'New Content');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(screen.getByText('New Post')).toBeTruthy();
    });
  });

  it('loads more posts on scroll', async () => {
    renderWithProviders(<FeedScreen />);

    await waitFor(() => {
      expect(screen.getByText('Post 1')).toBeTruthy();
    });

    const flatList = screen.getByTestId('feed-list');
    fireEvent(flatList, 'onEndReached');

    await waitFor(() => {
      // Check that more posts were loaded
      expect(screen.getAllByTestId('post-item')).toHaveLength(4);
    });
  });
});
```

### Native Module Mocking

Mock native modules for testing:

```typescript
// __mocks__/react-native-reanimated.js
const Reanimated = require('react-native-reanimated/mock');

// Silence warnings
Reanimated.default.call = () => {};

module.exports = Reanimated;

// __mocks__/react-native-gesture-handler.js
const View = require('react-native/Libraries/Components/View/View');

module.exports = {
  Swipeable: View,
  DrawerLayout: View,
  State: {},
  ScrollView: View,
  Slider: View,
  Switch: View,
  TextInput: View,
  ToolbarAndroid: View,
  ViewPagerAndroid: View,
  DrawerLayoutAndroid: View,
  WebView: View,
  NativeViewGestureHandler: View,
  TapGestureHandler: View,
  FlingGestureHandler: View,
  ForceTouchGestureHandler: View,
  LongPressGestureHandler: View,
  PanGestureHandler: View,
  PinchGestureHandler: View,
  RotationGestureHandler: View,
  RawButton: View,
  BaseButton: View,
  RectButton: View,
  BorderlessButton: View,
  FlatList: View,
  gestureHandlerRootHOC: jest.fn((c) => c),
  Directions: {},
};

// src/test/mocks/nativeModules.ts
import { NativeModules } from 'react-native';

// Mock custom native module
export const mockAnalyticsModule = {
  track: jest.fn(),
  identify: jest.fn(),
  screen: jest.fn(),
  reset: jest.fn(),
};

NativeModules.Analytics = mockAnalyticsModule;

// Mock location module
export const mockLocationModule = {
  getCurrentPosition: jest.fn((callback) => {
    callback({
      latitude: 37.7749,
      longitude: -122.4194,
    });
  }),
  watchPosition: jest.fn(() => 'watch-id'),
  clearWatch: jest.fn(),
};

NativeModules.Location = mockLocationModule;

// Mock biometrics module
export const mockBiometricsModule = {
  isAvailable: jest.fn().mockResolvedValue(true),
  authenticate: jest.fn().mockResolvedValue(true),
};

NativeModules.Biometrics = mockBiometricsModule;

// Usage in tests
// src/hooks/__tests__/useAnalytics.test.ts
import { renderHook } from '@testing-library/react-native';
import { useAnalytics } from '../useAnalytics';
import { mockAnalyticsModule } from '@/test/mocks/nativeModules';

describe('useAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tracks events with correct parameters', () => {
    const { result } = renderHook(() => useAnalytics());

    result.current.track('button_clicked', { button_name: 'submit' });

    expect(mockAnalyticsModule.track).toHaveBeenCalledWith(
      'button_clicked',
      { button_name: 'submit' }
    );
  });

  it('identifies user correctly', () => {
    const { result } = renderHook(() => useAnalytics());

    result.current.identify('user-123', { name: 'John' });

    expect(mockAnalyticsModule.identify).toHaveBeenCalledWith(
      'user-123',
      { name: 'John' }
    );
  });
});
```

### TestID Conventions

Implement consistent testID patterns:

```typescript
// src/utils/testIds.ts
/**
 * Centralized test IDs for consistent testing
 */
export const TestIds = {
  // Authentication
  auth: {
    loginButton: 'auth-login-button',
    registerButton: 'auth-register-button',
    emailInput: 'auth-email-input',
    passwordInput: 'auth-password-input',
    forgotPasswordLink: 'auth-forgot-password-link',
  },

  // Profile
  profile: {
    container: 'profile-container',
    avatar: 'profile-avatar',
    nameText: 'profile-name',
    emailText: 'profile-email',
    editButton: 'profile-edit-button',
    saveButton: 'profile-save-button',
    cancelButton: 'profile-cancel-button',
  },

  // Feed
  feed: {
    list: 'feed-list',
    postItem: (id: string) => `feed-post-${id}`,
    postTitle: (id: string) => `feed-post-title-${id}`,
    postContent: (id: string) => `feed-post-content-${id}`,
    likeButton: (id: string) => `feed-post-like-${id}`,
    commentButton: (id: string) => `feed-post-comment-${id}`,
    createButton: 'feed-create-button',
  },

  // Common
  common: {
    loadingIndicator: 'common-loading',
    errorMessage: 'common-error',
    successMessage: 'common-success',
    modal: 'common-modal',
    modalOverlay: 'common-modal-overlay',
    closeButton: 'common-close-button',
  },
};

// Usage in components
// src/components/Button/Button.tsx
import { TestIds } from '@/utils/testIds';

export const Button: React.FC<ButtonProps> = ({ label, onPress, testID }) => {
  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text>{label}</Text>
    </TouchableOpacity>
  );
};

// Usage in screens
// src/screens/ProfileScreen.tsx
import { TestIds } from '@/utils/testIds';

export const ProfileScreen: React.FC = () => {
  return (
    <View testID={TestIds.profile.container}>
      <Image
        testID={TestIds.profile.avatar}
        source={{ uri: user.avatar }}
      />
      <Text testID={TestIds.profile.nameText}>{user.name}</Text>
      <Text testID={TestIds.profile.emailText}>{user.email}</Text>
      <Button
        testID={TestIds.profile.editButton}
        label="Edit Profile"
        onPress={handleEdit}
      />
    </View>
  );
};
```

### Testing Utilities

Create reusable testing utilities:

```typescript
// src/test/utils.tsx
import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';

interface AllTheProvidersProps {
  children: React.ReactNode;
}

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {}, // Suppress errors in tests
    },
  });

export const AllTheProviders: React.FC<AllTheProvidersProps> = ({ children }) => {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </NavigationContainer>
    </QueryClientProvider>
  );
};

export const renderWithProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  return render(ui, { wrapper: AllTheProviders, ...options });
};

// Custom render with specific providers
export const renderWithAuth = (
  ui: ReactElement,
  authState: { isAuthenticated: boolean; user?: any }
) => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <AuthProvider initialState={authState}>{children}</AuthProvider>
  );

  return render(ui, { wrapper: Wrapper });
};

// Wait for async operations
export const waitForAsync = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

// Mock navigation prop
export const createMockNavigation = () => ({
  navigate: jest.fn(),
  goBack: jest.fn(),
  reset: jest.fn(),
  setParams: jest.fn(),
  canGoBack: jest.fn(() => true),
  dispatch: jest.fn(),
  isFocused: jest.fn(() => true),
  addListener: jest.fn(() => jest.fn()),
  removeListener: jest.fn(),
});

// Mock route prop
export const createMockRoute = (params = {}) => ({
  key: 'test-route',
  name: 'Test',
  params,
});

// src/test/factories.ts
/**
 * Factory functions for creating test data
 */
export const createUser = (overrides = {}) => ({
  id: '123',
  name: 'Test User',
  email: 'test@example.com',
  avatar: 'https://example.com/avatar.jpg',
  createdAt: new Date().toISOString(),
  ...overrides,
});

export const createPost = (overrides = {}) => ({
  id: '1',
  title: 'Test Post',
  content: 'Test Content',
  authorId: '123',
  createdAt: new Date().toISOString(),
  likes: 0,
  comments: [],
  ...overrides,
});

export const createComment = (overrides = {}) => ({
  id: '1',
  postId: '1',
  authorId: '123',
  content: 'Test Comment',
  createdAt: new Date().toISOString(),
  ...overrides,
});
```

## Implementation Guidelines

### Test Organization

1. **File Structure**: Place tests in `__tests__` folders or alongside source files
2. **Naming Convention**: Use `.test.ts` or `.spec.ts` suffixes
3. **Test Grouping**: Group related tests in describe blocks
4. **Test Isolation**: Each test should be independent
5. **Setup/Teardown**: Use beforeEach/afterEach for common setup

### Testing Best Practices

1. **Query Priority**: Use getByRole, getByLabelText before getByTestId
2. **User Events**: Test user interactions, not implementation details
3. **Async Operations**: Always wait for async operations to complete
4. **Mocking**: Mock external dependencies, not internal code
5. **Coverage**: Aim for high coverage but focus on critical paths

### TestID Patterns

1. **Consistency**: Use consistent naming conventions for testIDs
2. **Hierarchy**: Include component hierarchy in testIDs
3. **Dynamic IDs**: Use functions for dynamic testIDs
4. **Accessibility**: Prefer accessibility labels over testIDs
5. **Centralization**: Centralize testIDs in a constants file

### Integration Testing

1. **API Mocking**: Use MSW for consistent API mocking
2. **State Management**: Test with real providers when possible
3. **Navigation**: Test navigation flows end-to-end
4. **Error Scenarios**: Test error states and edge cases
5. **Performance**: Keep integration tests fast

## Anti-Patterns to Avoid

### Don't Test Implementation Details

```typescript
// Bad: Testing internal state
expect(component.state.count).toBe(1);

// Good: Testing user-visible behavior
expect(screen.getByText('Count: 1')).toBeTruthy();
```

### Don't Use Snapshot Tests Excessively

```typescript
// Bad: Large snapshot of entire screen
expect(tree).toMatchSnapshot();

// Good: Targeted snapshot of specific component
expect(buttonTree).toMatchSnapshot();
```

### Don't Forget to Clean Up

```typescript
// Bad: No cleanup
const subscription = eventEmitter.addListener('event', handler);

// Good: Proper cleanup
beforeEach(() => {
  const subscription = eventEmitter.addListener('event', handler);
  return () => subscription.remove();
});
```

### Don't Mock Everything

```typescript
// Bad: Mocking internal functions
jest.mock('../utils', () => ({
  internalHelper: jest.fn(),
}));

// Good: Mock external dependencies only
jest.mock('@/services/api');
```

### Don't Skip Error Cases

```typescript
// Bad: Only testing happy path
it('fetches user', async () => {
  // Only success case
});

// Good: Test error cases too
it('handles fetch error', async () => {
  // Error case
});
```

## Related Implementers

- **navigation.md**: Testing navigation flows
- **data-fetching.md**: Testing data fetching with MSW
- **analytics.md**: Testing analytics events
- **accessibility.md**: Testing accessibility features
- **performance-optimization.md**: Performance testing patterns
