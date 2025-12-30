---
domain: navigation
description: React Navigation with TypeScript types, stack architecture, native bridge events, hardware back button handling
---

# Navigation Implementer

This implementer defines patterns for implementing navigation in React Native applications using React Navigation with TypeScript, including stack architecture, type-safe navigation, native bridge events, and hardware back button handling.

## Core Patterns

### Navigation Container Setup

Define the root navigation container with TypeScript types:

```typescript
// src/navigation/RootNavigator.tsx
import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useColorScheme } from 'react-native';
import { RootStackParamList } from './types';
import { navigationRef } from './navigationRef';
import { linking } from './linking';

// Screens
import HomeScreen from '@/screens/HomeScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import DetailScreen from '@/screens/DetailScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const scheme = useColorScheme();

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={scheme === 'dark' ? DarkTheme : DefaultTheme}
      linking={linking}
      fallback={<LoadingScreen />}
      onReady={() => {
        // Analytics or initialization
        console.log('Navigation ready');
      }}
      onStateChange={(state) => {
        // Track navigation state changes
        const currentRoute = state?.routes[state.index];
        console.log('Current route:', currentRoute?.name);
      }}
    >
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: true,
          headerBackTitleVisible: false,
          animation: 'default',
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{
            title: 'Home',
            headerLargeTitle: true,
          }}
        />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            title: 'Profile',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            title: 'Settings',
          }}
        />
        <Stack.Screen
          name="Detail"
          component={DetailScreen}
          options={({ route }) => ({
            title: route.params.title,
            headerBackTitle: 'Back',
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

// Loading screen component
const LoadingScreen: React.FC = () => (
  <View style={styles.loading}>
    <ActivityIndicator size="large" />
  </View>
);

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
```

### TypeScript Navigation Types

Define comprehensive type-safe navigation types:

```typescript
// src/navigation/types.ts
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

// Root Stack parameter list
export type RootStackParamList = {
  Home: undefined;
  Profile: { userId: string };
  Settings: undefined;
  Detail: { id: string; title: string };
  Auth: undefined;
  Main: undefined;
};

// Main Tab parameter list
export type MainTabParamList = {
  Feed: undefined;
  Search: { query?: string };
  Notifications: undefined;
  Profile: { userId: string };
};

// Auth Stack parameter list
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token: string };
};

// Screen props types
export type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;
export type ProfileScreenProps = NativeStackScreenProps<RootStackParamList, 'Profile'>;
export type SettingsScreenProps = NativeStackScreenProps<RootStackParamList, 'Settings'>;
export type DetailScreenProps = NativeStackScreenProps<RootStackParamList, 'Detail'>;

// Composite types for nested navigators
export type FeedScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Feed'>,
  NativeStackScreenProps<RootStackParamList>
>;

export type SearchScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Search'>,
  NativeStackScreenProps<RootStackParamList>
>;

// Navigation prop types for hooks
export type RootStackNavigationProp = NativeStackScreenProps<RootStackParamList>['navigation'];
export type MainTabNavigationProp = BottomTabScreenProps<MainTabParamList>['navigation'];

// Declare global types for type-safe navigation
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
```

### Navigation Reference for Imperative Navigation

Set up navigation reference for navigation outside of components:

```typescript
// src/navigation/navigationRef.ts
import { createNavigationContainerRef, StackActions } from '@react-navigation/native';
import { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Navigate to a screen imperatively
 */
export function navigate<RouteName extends keyof RootStackParamList>(
  name: RouteName,
  params?: RootStackParamList[RouteName]
) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}

/**
 * Go back to previous screen
 */
export function goBack() {
  if (navigationRef.isReady() && navigationRef.canGoBack()) {
    navigationRef.goBack();
  }
}

/**
 * Reset navigation stack
 */
export function resetNavigation(routeName: keyof RootStackParamList) {
  if (navigationRef.isReady()) {
    navigationRef.reset({
      index: 0,
      routes: [{ name: routeName }],
    });
  }
}

/**
 * Push a new screen onto stack
 */
export function push<RouteName extends keyof RootStackParamList>(
  name: RouteName,
  params?: RootStackParamList[RouteName]
) {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(StackActions.push(name, params));
  }
}

/**
 * Pop N screens from stack
 */
export function pop(count: number = 1) {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(StackActions.pop(count));
  }
}

/**
 * Pop to top of stack
 */
export function popToTop() {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(StackActions.popToTop());
  }
}

/**
 * Get current route name
 */
export function getCurrentRouteName(): string | undefined {
  if (navigationRef.isReady()) {
    return navigationRef.getCurrentRoute()?.name;
  }
  return undefined;
}

/**
 * Get current route params
 */
export function getCurrentRouteParams<RouteName extends keyof RootStackParamList>(
): RootStackParamList[RouteName] | undefined {
  if (navigationRef.isReady()) {
    return navigationRef.getCurrentRoute()?.params as RootStackParamList[RouteName];
  }
  return undefined;
}
```

### Nested Tab Navigator

Implement bottom tab navigation with nested stacks:

```typescript
// src/navigation/MainTabNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { MainTabParamList } from './types';

// Screens
import FeedScreen from '@/screens/FeedScreen';
import SearchScreen from '@/screens/SearchScreen';
import NotificationsScreen from '@/screens/NotificationsScreen';
import ProfileScreen from '@/screens/ProfileScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();
const FeedStack = createNativeStackNavigator();
const SearchStack = createNativeStackNavigator();
const NotificationsStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

// Feed Stack Navigator
const FeedStackNavigator: React.FC = () => (
  <FeedStack.Navigator>
    <FeedStack.Screen
      name="FeedHome"
      component={FeedScreen}
      options={{ title: 'Feed' }}
    />
  </FeedStack.Navigator>
);

// Search Stack Navigator
const SearchStackNavigator: React.FC = () => (
  <SearchStack.Navigator>
    <SearchStack.Screen
      name="SearchHome"
      component={SearchScreen}
      options={{ title: 'Search' }}
    />
  </SearchStack.Navigator>
);

// Notifications Stack Navigator
const NotificationsStackNavigator: React.FC = () => (
  <NotificationsStack.Navigator>
    <NotificationsStack.Screen
      name="NotificationsHome"
      component={NotificationsScreen}
      options={{ title: 'Notifications' }}
    />
  </NotificationsStack.Navigator>
);

// Profile Stack Navigator
const ProfileStackNavigator: React.FC = () => (
  <ProfileStack.Navigator>
    <ProfileStack.Screen
      name="ProfileHome"
      component={ProfileScreen}
      options={{ title: 'Profile' }}
    />
  </ProfileStack.Navigator>
);

export const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          if (route.name === 'Feed') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Search') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'Notifications') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'help-circle-outline';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: {
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
      })}
    >
      <Tab.Screen
        name="Feed"
        component={FeedStackNavigator}
        options={{
          tabBarLabel: 'Home',
          tabBarBadge: undefined, // Can be set dynamically
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchStackNavigator}
        options={{
          tabBarLabel: 'Search',
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsStackNavigator}
        options={{
          tabBarLabel: 'Notifications',
          tabBarBadge: 3, // Dynamic notification count
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={{
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
};
```

### Hardware Back Button Handling

Handle Android hardware back button with navigation:

```typescript
// src/navigation/useBackHandler.ts
import { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { useNavigation } from '@react-navigation/native';

/**
 * Custom hook to handle hardware back button on Android
 */
export function useBackHandler(handler?: () => boolean): void {
  const navigation = useNavigation();

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        // Custom handler takes precedence
        if (handler) {
          return handler();
        }

        // Default behavior: go back if possible
        if (navigation.canGoBack()) {
          navigation.goBack();
          return true; // Prevent default behavior
        }

        return false; // Allow default behavior (exit app)
      }
    );

    return () => backHandler.remove();
  }, [handler, navigation]);
}

// src/hooks/usePreventBack.ts
import { useEffect } from 'react';
import { BackHandler, Alert } from 'react-native';

/**
 * Hook to prevent navigation back with confirmation
 */
export function usePreventBack(
  shouldPrevent: boolean,
  message: string = 'Are you sure you want to go back?'
): void {
  useEffect(() => {
    if (!shouldPrevent) return;

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        Alert.alert(
          'Confirm',
          message,
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Yes',
              onPress: () => {
                backHandler.remove();
                BackHandler.exitApp();
              },
            },
          ],
          { cancelable: false }
        );
        return true; // Prevent default behavior
      }
    );

    return () => backHandler.remove();
  }, [shouldPrevent, message]);
}

// Usage in a screen
// src/screens/FormScreen.tsx
import React, { useState } from 'react';
import { View, TextInput, Button } from 'react-native';
import { useBackHandler, usePreventBack } from '@/hooks';

const FormScreen: React.FC = () => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Prevent back if there are unsaved changes
  usePreventBack(
    hasUnsavedChanges,
    'You have unsaved changes. Are you sure you want to leave?'
  );

  return (
    <View>
      <TextInput
        onChangeText={() => setHasUnsavedChanges(true)}
        placeholder="Enter text"
      />
      <Button
        title="Save"
        onPress={() => {
          // Save logic
          setHasUnsavedChanges(false);
        }}
      />
    </View>
  );
};
```

### Deep Linking Configuration

Configure deep linking for universal and app links:

```typescript
// src/navigation/linking.ts
import { LinkingOptions } from '@react-navigation/native';
import { RootStackParamList } from './types';
import * as Linking from 'expo-linking';

const prefix = Linking.createURL('/');

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    prefix,
    'myapp://',
    'https://myapp.com',
    'https://*.myapp.com',
  ],
  config: {
    screens: {
      Home: '',
      Profile: {
        path: 'profile/:userId',
        parse: {
          userId: (userId: string) => userId,
        },
      },
      Settings: 'settings',
      Detail: {
        path: 'detail/:id',
        parse: {
          id: (id: string) => id,
        },
      },
      Auth: {
        screens: {
          Login: 'login',
          Register: 'register',
          ForgotPassword: 'forgot-password',
          ResetPassword: {
            path: 'reset-password/:token',
            parse: {
              token: (token: string) => token,
            },
          },
        },
      },
      Main: {
        screens: {
          Feed: 'feed',
          Search: {
            path: 'search/:query?',
            parse: {
              query: (query: string) => decodeURIComponent(query),
            },
          },
          Notifications: 'notifications',
        },
      },
      NotFound: '*',
    },
  },
  async getInitialURL() {
    // Check if app was opened from a deep link
    const url = await Linking.getInitialURL();
    if (url != null) {
      return url;
    }

    // Check if there is an initial firebase notification
    // const message = await messaging().getInitialNotification();
    // return message?.data?.link;

    return null;
  },
  subscribe(listener) {
    // Listen to incoming links from deep linking
    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      listener(url);
    });

    // Listen to firebase push notifications
    // const unsubscribe = messaging().onNotificationOpenedApp((message) => {
    //   const url = message?.data?.link;
    //   if (url) {
    //     listener(url);
    //   }
    // });

    return () => {
      linkingSubscription.remove();
      // unsubscribe();
    };
  },
};

// Helper functions for creating links
export const createProfileLink = (userId: string): string => {
  return Linking.createURL(`profile/${userId}`);
};

export const createDetailLink = (id: string, title: string): string => {
  return Linking.createURL(`detail/${id}`, {
    queryParams: { title },
  });
};

export const createSearchLink = (query: string): string => {
  return Linking.createURL(`search/${encodeURIComponent(query)}`);
};
```

### Navigation Hooks

Create custom navigation hooks for common patterns:

```typescript
// src/hooks/useNavigationHelpers.ts
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useEffect } from 'react';
import { RootStackNavigationProp } from '@/navigation/types';

/**
 * Hook that provides type-safe navigation helpers
 */
export function useNavigationHelpers() {
  const navigation = useNavigation<RootStackNavigationProp>();

  const navigateToProfile = useCallback(
    (userId: string) => {
      navigation.navigate('Profile', { userId });
    },
    [navigation]
  );

  const navigateToDetail = useCallback(
    (id: string, title: string) => {
      navigation.navigate('Detail', { id, title });
    },
    [navigation]
  );

  const navigateToSettings = useCallback(() => {
    navigation.navigate('Settings');
  }, [navigation]);

  return {
    navigateToProfile,
    navigateToDetail,
    navigateToSettings,
    goBack: navigation.goBack,
    canGoBack: navigation.canGoBack,
  };
}

/**
 * Hook to track screen focus events
 */
export function useScreenFocus(callback: () => void): void {
  useFocusEffect(
    useCallback(() => {
      callback();
    }, [callback])
  );
}

/**
 * Hook to run effect only when screen is focused
 */
export function useFocusedEffect(effect: () => void | (() => void), deps: any[]): void {
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      return effect();
    }
  }, [isFocused, ...deps]);
}

/**
 * Hook to get typed route params
 */
export function useTypedRoute<RouteName extends keyof RootStackParamList>() {
  return useRoute<RouteProp<RootStackParamList, RouteName>>();
}

/**
 * Hook to prevent navigation while condition is true
 */
export function useNavigationBlocker(
  shouldBlock: boolean,
  message: string = 'Are you sure you want to leave?'
): void {
  const navigation = useNavigation();

  useEffect(() => {
    if (!shouldBlock) return;

    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!shouldBlock) {
        return;
      }

      // Prevent default behavior of leaving the screen
      e.preventDefault();

      // Prompt the user before leaving the screen
      Alert.alert(
        'Discard changes?',
        message,
        [
          { text: "Don't leave", style: 'cancel', onPress: () => {} },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
        ]
      );
    });

    return unsubscribe;
  }, [navigation, shouldBlock, message]);
}

/**
 * Hook to reset navigation to a specific screen
 */
export function useResetNavigation() {
  const navigation = useNavigation<RootStackNavigationProp>();

  const resetToHome = useCallback(() => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  }, [navigation]);

  const resetToAuth = useCallback(() => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Auth' }],
    });
  }, [navigation]);

  return { resetToHome, resetToAuth };
}
```

### Native Bridge Event Integration

Integrate native module events with navigation:

```typescript
// src/navigation/useNativeNavigationEvents.ts
import { useEffect } from 'react';
import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { RootStackNavigationProp } from './types';

const { NavigationBridge } = NativeModules;
const navigationEventEmitter = new NativeEventEmitter(NavigationBridge);

/**
 * Hook to handle navigation events from native code
 */
export function useNativeNavigationEvents(): void {
  const navigation = useNavigation<RootStackNavigationProp>();

  useEffect(() => {
    // Listen for navigation requests from native code
    const navigateSubscription = navigationEventEmitter.addListener(
      'navigate',
      (event: { screen: string; params?: any }) => {
        const { screen, params } = event;

        // Type-safe navigation based on screen name
        switch (screen) {
          case 'Profile':
            if (params?.userId) {
              navigation.navigate('Profile', { userId: params.userId });
            }
            break;
          case 'Detail':
            if (params?.id && params?.title) {
              navigation.navigate('Detail', { id: params.id, title: params.title });
            }
            break;
          case 'Settings':
            navigation.navigate('Settings');
            break;
          default:
            console.warn(`Unknown screen requested from native: ${screen}`);
        }
      }
    );

    // Listen for back navigation requests from native
    const goBackSubscription = navigationEventEmitter.addListener(
      'goBack',
      () => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
      }
    );

    // Listen for reset navigation requests from native
    const resetSubscription = navigationEventEmitter.addListener(
      'reset',
      (event: { screen: string }) => {
        navigation.reset({
          index: 0,
          routes: [{ name: event.screen as keyof RootStackParamList }],
        });
      }
    );

    return () => {
      navigateSubscription.remove();
      goBackSubscription.remove();
      resetSubscription.remove();
    };
  }, [navigation]);
}

// src/navigation/NavigationBridge.ts
/**
 * Bridge to send navigation events to native code
 */
export class NavigationBridge {
  /**
   * Notify native code of current route
   */
  static notifyRouteChange(routeName: string, params?: any): void {
    if (Platform.OS === 'ios') {
      NavigationBridge?.onRouteChange?.(routeName, params || {});
    } else if (Platform.OS === 'android') {
      NavigationBridge?.onRouteChange?.(routeName, JSON.stringify(params || {}));
    }
  }

  /**
   * Request native navigation drawer to open
   */
  static openDrawer(): void {
    NavigationBridge?.openDrawer?.();
  }

  /**
   * Request native navigation drawer to close
   */
  static closeDrawer(): void {
    NavigationBridge?.closeDrawer?.();
  }

  /**
   * Request native tab bar visibility change
   */
  static setTabBarVisible(visible: boolean): void {
    NavigationBridge?.setTabBarVisible?.(visible);
  }
}

// Usage in navigation container
// src/navigation/RootNavigator.tsx
import { NavigationBridge } from './NavigationBridge';
import { useNativeNavigationEvents } from './useNativeNavigationEvents';

export const RootNavigator: React.FC = () => {
  useNativeNavigationEvents();

  return (
    <NavigationContainer
      onStateChange={(state) => {
        const currentRoute = state?.routes[state.index];
        if (currentRoute) {
          NavigationBridge.notifyRouteChange(
            currentRoute.name,
            currentRoute.params
          );
        }
      }}
    >
      {/* Navigator content */}
    </NavigationContainer>
  );
};
```

### Authentication Flow Navigation

Implement authentication-aware navigation:

```typescript
// src/navigation/AuthNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList } from './types';

import LoginScreen from '@/screens/auth/LoginScreen';
import RegisterScreen from '@/screens/auth/RegisterScreen';
import ForgotPasswordScreen from '@/screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '@/screens/auth/ResetPasswordScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </Stack.Navigator>
  );
};

// src/navigation/AppNavigator.tsx
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { RootNavigator } from './RootNavigator';
import { AuthNavigator } from './AuthNavigator';
import { LoadingScreen } from '@/screens/LoadingScreen';

export const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return isAuthenticated ? <RootNavigator /> : <AuthNavigator />;
};
```

## Implementation Guidelines

### Navigation Structure

1. **Type Safety**: Always use TypeScript types for navigation params and props
2. **Stack Organization**: Use separate stacks for different flows (auth, main, etc.)
3. **Tab Navigation**: Nest stack navigators within tab navigators for better UX
4. **Modal Presentation**: Use modal presentation for temporary flows
5. **Deep Linking**: Configure deep linking for all important screens

### Performance Optimization

1. **Screen Options**: Memoize screen options when using dynamic values
2. **Navigation Container**: Avoid unnecessary re-renders of NavigationContainer
3. **Lazy Loading**: Use lazy loading for screens not immediately needed
4. **State Management**: Keep navigation state minimal and focused
5. **Event Listeners**: Clean up event listeners properly

### Hardware Back Button

1. **Android Handling**: Always handle hardware back button on Android
2. **Confirmation Dialogs**: Show confirmation for destructive actions
3. **Custom Behavior**: Implement custom back behavior per screen
4. **Exit App**: Handle back button on root screen appropriately
5. **Navigation Blocking**: Block navigation when there are unsaved changes

### Native Integration

1. **Event Bridges**: Use native event emitters for bidirectional communication
2. **Screen Tracking**: Send screen changes to native analytics
3. **Drawer Integration**: Integrate with native drawer if present
4. **Tab Bar Control**: Allow native code to control tab bar visibility
5. **Route Information**: Keep native code informed of current route

## Anti-Patterns to Avoid

### Don't Use String Literals for Navigation

```typescript
// Bad: String literals without types
navigation.navigate('Profile', { userId: '123' });

// Good: Use typed navigation
navigation.navigate('Profile', { userId: '123' }); // Type-checked
```

### Don't Ignore Hardware Back Button

```typescript
// Bad: No back button handling
const Screen: React.FC = () => {
  return <View>...</View>;
};

// Good: Handle back button
const Screen: React.FC = () => {
  useBackHandler(() => {
    // Custom back handling
    return true;
  });

  return <View>...</View>;
};
```

### Don't Create Circular Navigation

```typescript
// Bad: Circular navigation
navigation.navigate('ScreenA'); // From ScreenB
// Then in ScreenA:
navigation.navigate('ScreenB'); // Creates circular dependency

// Good: Use proper navigation hierarchy
navigation.navigate('ScreenA');
// Use goBack() instead of navigating back to previous screen
```

### Don't Forget to Clean Up Listeners

```typescript
// Bad: Missing cleanup
useEffect(() => {
  const subscription = navigationEventEmitter.addListener('event', handler);
}, []);

// Good: Always clean up
useEffect(() => {
  const subscription = navigationEventEmitter.addListener('event', handler);
  return () => subscription.remove();
}, []);
```

### Don't Mutate Navigation State Directly

```typescript
// Bad: Direct state mutation
navigation.setParams({ ...navigation.getState() });

// Good: Use navigation methods
navigation.setParams({ userId: '123' });
```

## Related Implementers

- **data-fetching.md**: Fetching data based on navigation params
- **analytics.md**: Tracking navigation events
- **testing.md**: Testing navigation flows
- **accessibility.md**: Accessible navigation patterns
- **platform-specific.md**: Platform-specific navigation behaviors
