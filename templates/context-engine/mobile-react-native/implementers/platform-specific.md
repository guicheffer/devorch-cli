---
domain: platform-specific
description: Platform.select(), platform file extensions (.ios.ts/.android.ts), native module event bridges
---

# Platform-Specific Implementer

This implementer defines patterns for handling platform-specific code in React Native applications, including Platform.select(), platform-specific file extensions, native module bridges, and platform-specific UI patterns.

## Core Patterns

### Platform.select() Usage

Use Platform.select() for inline platform-specific code:

```typescript
// src/constants/styles.ts
import { Platform, StyleSheet } from 'react-native';

export const platformStyles = {
  shadow: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    android: {
      elevation: 5,
    },
    default: {},
  }),

  statusBarHeight: Platform.select({
    ios: 44,
    android: 24,
    default: 0,
  }),

  headerHeight: Platform.select({
    ios: 44,
    android: 56,
    default: 50,
  }),
};

// src/components/Card/Card.tsx
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { platformStyles } from '@/constants/styles';

export const Card: React.FC = ({ children }) => {
  return (
    <View style={[styles.card, platformStyles.shadow]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: Platform.select({
      ios: 12,
      android: 8,
      default: 8,
    }),
    padding: 16,
    marginVertical: 8,
  },
});

// src/utils/platform.ts
import { Platform } from 'react-native';

export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';
export const isWeb = Platform.OS === 'web';

export function selectPlatform<T>(
  options: Partial<Record<typeof Platform.OS, T>> & { default: T }
): T {
  return Platform.select(options) ?? options.default;
}

// Specific platform version checks
export const isIOS14OrHigher = isIOS && parseInt(Platform.Version as string, 10) >= 14;
export const isAndroid11OrHigher = isAndroid && Platform.Version >= 30;
```

### Platform-Specific File Extensions

Use platform-specific file extensions for different implementations:

```typescript
// src/components/Button/Button.tsx (shared)
export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

// src/components/Button/Button.ios.tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import type { ButtonProps } from './Button';

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        variant === 'primary' ? styles.primary : styles.secondary,
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12, // iOS prefers larger border radius
    alignItems: 'center',
  },
  primary: {
    backgroundColor: '#007AFF', // iOS blue
  },
  secondary: {
    backgroundColor: '#8E8E93',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: '#fff',
    fontSize: 17, // iOS default
    fontWeight: '600',
  },
});

// src/components/Button/Button.android.tsx
import React from 'react';
import { TouchableNativeFeedback, View, Text, StyleSheet } from 'react-native';
import type { ButtonProps } from './Button';

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
}) => {
  return (
    <TouchableNativeFeedback
      onPress={onPress}
      disabled={disabled}
      background={TouchableNativeFeedback.Ripple('#fff', false)}
    >
      <View
        style={[
          styles.button,
          variant === 'primary' ? styles.primary : styles.secondary,
          disabled && styles.disabled,
        ]}
      >
        <Text style={styles.text}>{title}</Text>
      </View>
    </TouchableNativeFeedback>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 4, // Material Design prefers smaller radius
    alignItems: 'center',
    elevation: 2,
  },
  primary: {
    backgroundColor: '#6200EE', // Material purple
  },
  secondary: {
    backgroundColor: '#03DAC6',
  },
  disabled: {
    backgroundColor: '#E0E0E0',
  },
  text: {
    color: '#fff',
    fontSize: 14, // Android default
    fontWeight: 'bold',
    textTransform: 'uppercase', // Material Design pattern
  },
});

// Usage (automatically picks correct platform file)
// src/screens/HomeScreen.tsx
import React from 'react';
import { View } from 'react-native';
import { Button } from '@/components/Button/Button'; // .ios.tsx or .android.tsx automatically selected

export const HomeScreen: React.FC = () => {
  return (
    <View>
      <Button title="Click Me" onPress={() => console.log('Pressed')} />
    </View>
  );
};
```

### Native Module Bridges

Create bridges to communicate with native modules:

```typescript
// src/native/NativeBridge.ts
import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

interface INativeModule {
  // Methods
  initialize: () => Promise<void>;
  getData: (key: string) => Promise<any>;
  setData: (key: string, value: any) => Promise<void>;
  performAction: (action: string, params?: any) => Promise<any>;

  // Constants
  API_VERSION: string;
  FEATURE_FLAGS: Record<string, boolean>;
}

// Get native module
const NativeModule = NativeModules.CustomNativeModule as INativeModule;

if (!NativeModule) {
  console.warn('CustomNativeModule not found');
}

// Create event emitter for native events
const eventEmitter = new NativeEventEmitter(NativeModule as any);

/**
 * Bridge to native module with TypeScript support
 */
export class NativeBridge {
  private static instance: NativeBridge;
  private initialized = false;

  private constructor() {}

  static getInstance(): NativeBridge {
    if (!NativeBridge.instance) {
      NativeBridge.instance = new NativeBridge();
    }
    return NativeBridge.instance;
  }

  /**
   * Initialize native module
   */
  async initialize(): Promise<void> {
    if (this.initialized || !NativeModule) return;

    try {
      await NativeModule.initialize();
      this.initialized = true;
      console.log('Native module initialized');
    } catch (error) {
      console.error('Failed to initialize native module:', error);
    }
  }

  /**
   * Get data from native module
   */
  async getData(key: string): Promise<any> {
    if (!NativeModule) {
      throw new Error('Native module not available');
    }

    try {
      return await NativeModule.getData(key);
    } catch (error) {
      console.error('Failed to get data from native:', error);
      throw error;
    }
  }

  /**
   * Set data in native module
   */
  async setData(key: string, value: any): Promise<void> {
    if (!NativeModule) {
      throw new Error('Native module not available');
    }

    try {
      await NativeModule.setData(key, value);
    } catch (error) {
      console.error('Failed to set data in native:', error);
      throw error;
    }
  }

  /**
   * Perform native action
   */
  async performAction(action: string, params?: any): Promise<any> {
    if (!NativeModule) {
      throw new Error('Native module not available');
    }

    try {
      return await NativeModule.performAction(action, params);
    } catch (error) {
      console.error('Failed to perform native action:', error);
      throw error;
    }
  }

  /**
   * Subscribe to native events
   */
  addListener(eventName: string, callback: (data: any) => void) {
    if (!NativeModule) {
      console.warn('Cannot add listener: Native module not available');
      return () => {};
    }

    const subscription = eventEmitter.addListener(eventName, callback);
    return () => subscription.remove();
  }

  /**
   * Get native constants
   */
  getConstants() {
    if (!NativeModule) {
      return { API_VERSION: '0.0.0', FEATURE_FLAGS: {} };
    }

    return {
      API_VERSION: NativeModule.API_VERSION,
      FEATURE_FLAGS: NativeModule.FEATURE_FLAGS,
    };
  }

  /**
   * Check if native module is available
   */
  isAvailable(): boolean {
    return !!NativeModule && this.initialized;
  }
}

export const nativeBridge = NativeBridge.getInstance();

// src/hooks/useNativeBridge.ts
import { useEffect, useState, useCallback } from 'react';
import { nativeBridge } from '@/native/NativeBridge';

export function useNativeBridge() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    nativeBridge.initialize().then(() => {
      setAvailable(nativeBridge.isAvailable());
    });
  }, []);

  const getData = useCallback(async (key: string) => {
    return nativeBridge.getData(key);
  }, []);

  const setData = useCallback(async (key: string, value: any) => {
    return nativeBridge.setData(key, value);
  }, []);

  const performAction = useCallback(async (action: string, params?: any) => {
    return nativeBridge.performAction(action, params);
  }, []);

  return {
    available,
    getData,
    setData,
    performAction,
  };
}

// src/hooks/useNativeEvent.ts
import { useEffect, useCallback } from 'react';
import { nativeBridge } from '@/native/NativeBridge';

export function useNativeEvent(eventName: string, callback: (data: any) => void) {
  const memoizedCallback = useCallback(callback, [callback]);

  useEffect(() => {
    const unsubscribe = nativeBridge.addListener(eventName, memoizedCallback);
    return unsubscribe;
  }, [eventName, memoizedCallback]);
}
```

### Platform-Specific Permissions

Handle platform-specific permissions:

```typescript
// src/utils/permissions.ts
import { Platform, PermissionsAndroid } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

export type Permission =
  | 'camera'
  | 'photos'
  | 'microphone'
  | 'location'
  | 'notifications'
  | 'contacts';

/**
 * Get platform-specific permission identifier
 */
function getPermissionIdentifier(permission: Permission) {
  const permissions = {
    camera: Platform.select({
      ios: PERMISSIONS.IOS.CAMERA,
      android: PERMISSIONS.ANDROID.CAMERA,
    }),
    photos: Platform.select({
      ios: PERMISSIONS.IOS.PHOTO_LIBRARY,
      android: PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
    }),
    microphone: Platform.select({
      ios: PERMISSIONS.IOS.MICROPHONE,
      android: PERMISSIONS.ANDROID.RECORD_AUDIO,
    }),
    location: Platform.select({
      ios: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
      android: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
    }),
    notifications: Platform.select({
      ios: PERMISSIONS.IOS.NOTIFICATIONS,
      android: PERMISSIONS.ANDROID.POST_NOTIFICATIONS,
    }),
    contacts: Platform.select({
      ios: PERMISSIONS.IOS.CONTACTS,
      android: PERMISSIONS.ANDROID.READ_CONTACTS,
    }),
  };

  return permissions[permission];
}

/**
 * Check if permission is granted
 */
export async function checkPermission(permission: Permission): Promise<boolean> {
  const permissionId = getPermissionIdentifier(permission);

  if (!permissionId) {
    console.warn(`Permission ${permission} not available on this platform`);
    return false;
  }

  const result = await check(permissionId);
  return result === RESULTS.GRANTED;
}

/**
 * Request permission from user
 */
export async function requestPermission(permission: Permission): Promise<boolean> {
  const permissionId = getPermissionIdentifier(permission);

  if (!permissionId) {
    console.warn(`Permission ${permission} not available on this platform`);
    return false;
  }

  const result = await request(permissionId);
  return result === RESULTS.GRANTED;
}

/**
 * Request multiple permissions
 */
export async function requestMultiplePermissions(
  permissions: Permission[]
): Promise<Record<Permission, boolean>> {
  const results: Record<Permission, boolean> = {} as any;

  for (const permission of permissions) {
    results[permission] = await requestPermission(permission);
  }

  return results;
}

// src/hooks/usePermission.ts
import { useState, useEffect, useCallback } from 'react';
import { checkPermission, requestPermission, Permission } from '@/utils/permissions';

export function usePermission(permission: Permission) {
  const [granted, setGranted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkPermission(permission).then((result) => {
      setGranted(result);
      setLoading(false);
    });
  }, [permission]);

  const request = useCallback(async () => {
    setLoading(true);
    const result = await requestPermission(permission);
    setGranted(result);
    setLoading(false);
    return result;
  }, [permission]);

  return { granted, loading, request };
}
```

### Platform-Specific Navigation

Handle platform-specific navigation patterns:

```typescript
// src/navigation/PlatformNavigator.tsx
import React from 'react';
import { Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

const Stack = createNativeStackNavigator();
const BottomTab = createBottomTabNavigator();
const TopTab = createMaterialTopTabNavigator();

// iOS-style navigation options
const iosNavigationOptions = {
  headerLargeTitle: true,
  headerTransparent: false,
  headerBlurEffect: 'regular' as const,
  headerStyle: {
    backgroundColor: '#fff',
  },
  headerTitleStyle: {
    fontSize: 17,
    fontWeight: '600' as const,
  },
};

// Android-style navigation options
const androidNavigationOptions = {
  headerStyle: {
    backgroundColor: '#6200EE',
    elevation: 4,
  },
  headerTitleStyle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
  },
  headerTintColor: '#fff',
};

// Select navigation options based on platform
export const navigationOptions = Platform.select({
  ios: iosNavigationOptions,
  android: androidNavigationOptions,
  default: iosNavigationOptions,
});

// iOS uses bottom tabs, Android uses top tabs (material design)
export const TabNavigator = Platform.select({
  ios: BottomTab.Navigator,
  android: TopTab.Navigator,
  default: BottomTab.Navigator,
});

// src/navigation/animations.ts
import { Platform } from 'react-native';
import { StackNavigationOptions } from '@react-navigation/stack';

/**
 * Platform-specific screen transition animations
 */
export const screenTransitions: StackNavigationOptions = Platform.select({
  ios: {
    animation: 'default', // iOS slide from right
    gestureEnabled: true,
    gestureDirection: 'horizontal',
  },
  android: {
    animation: 'fade_from_bottom', // Material Design
    gestureEnabled: false,
  },
  default: {
    animation: 'default',
    gestureEnabled: true,
  },
});

export const modalTransitions: StackNavigationOptions = Platform.select({
  ios: {
    presentation: 'modal',
    animation: 'slide_from_bottom',
    gestureEnabled: true,
    gestureDirection: 'vertical',
  },
  android: {
    presentation: 'transparentModal',
    animation: 'fade',
  },
  default: {
    presentation: 'modal',
  },
});
```

### Platform-Specific Components

Create platform-specific component implementations:

```typescript
// src/components/DatePicker/DatePicker.tsx
import React from 'react';
import { Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

interface DatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  mode?: 'date' | 'time' | 'datetime';
  minimumDate?: Date;
  maximumDate?: Date;
}

// iOS uses inline picker
export const DatePicker: React.FC<DatePickerProps> = Platform.select({
  ios: ({ value, onChange, mode = 'date', minimumDate, maximumDate }) => (
    <DateTimePicker
      value={value}
      mode={mode}
      display="spinner" // iOS inline spinner
      onChange={(event, selectedDate) => {
        if (selectedDate) onChange(selectedDate);
      }}
      minimumDate={minimumDate}
      maximumDate={maximumDate}
      style={{ height: 200 }}
    />
  ),
  android: ({ value, onChange, mode = 'date', minimumDate, maximumDate }) => {
    const [show, setShow] = React.useState(false);

    return (
      <>
        <TouchableOpacity onPress={() => setShow(true)}>
          <Text>{value.toLocaleDateString()}</Text>
        </TouchableOpacity>
        {show && (
          <DateTimePicker
            value={value}
            mode={mode}
            display="default" // Android dialog
            onChange={(event, selectedDate) => {
              setShow(false);
              if (selectedDate) onChange(selectedDate);
            }}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
          />
        )}
      </>
    );
  },
  default: ({ value }) => <Text>{value.toLocaleDateString()}</Text>,
})!;

// src/components/ActionSheet/ActionSheet.tsx
import React from 'react';
import { Platform, ActionSheetIOS, Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Action {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  actions: Action[];
}

// iOS uses native ActionSheet
const IOSActionSheet: React.FC<ActionSheetProps> = ({
  visible,
  onClose,
  title,
  actions,
}) => {
  React.useEffect(() => {
    if (visible) {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...actions.map((a) => a.label), 'Cancel'],
          cancelButtonIndex: actions.length,
          destructiveButtonIndex: actions.findIndex((a) => a.destructive),
          title,
        },
        (buttonIndex) => {
          if (buttonIndex < actions.length) {
            actions[buttonIndex].onPress();
          }
          onClose();
        }
      );
    }
  }, [visible, actions, title, onClose]);

  return null;
};

// Android uses custom bottom sheet
const AndroidActionSheet: React.FC<ActionSheetProps> = ({
  visible,
  onClose,
  title,
  actions,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.sheet}>
          {title && <Text style={styles.title}>{title}</Text>}
          {actions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.action}
              onPress={() => {
                action.onPress();
                onClose();
              }}
            >
              <Text
                style={[
                  styles.actionText,
                  action.destructive && styles.destructive,
                ]}
              >
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.cancel} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

export const ActionSheet = Platform.select({
  ios: IOSActionSheet,
  android: AndroidActionSheet,
  default: AndroidActionSheet,
})!;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    color: '#666',
  },
  action: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#007AFF',
  },
  destructive: {
    color: '#FF3B30',
  },
  cancel: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopWidth: 8,
    borderTopColor: '#f0f0f0',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    color: '#666',
  },
});
```

### Platform-Specific Haptics

Implement platform-specific haptic feedback:

```typescript
// src/utils/haptics.ts
import { Platform, Vibration } from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

export type HapticType =
  | 'selection'
  | 'impactLight'
  | 'impactMedium'
  | 'impactHeavy'
  | 'notificationSuccess'
  | 'notificationWarning'
  | 'notificationError';

const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

/**
 * Trigger haptic feedback
 */
export function triggerHaptic(type: HapticType): void {
  if (Platform.OS === 'ios') {
    // iOS has rich haptic feedback
    ReactNativeHapticFeedback.trigger(type, hapticOptions);
  } else if (Platform.OS === 'android') {
    // Android uses simple vibration patterns
    const patterns: Record<HapticType, number[]> = {
      selection: [10],
      impactLight: [20],
      impactMedium: [40],
      impactHeavy: [60],
      notificationSuccess: [10, 50, 10],
      notificationWarning: [30, 50, 30],
      notificationError: [50, 100, 50],
    };

    const pattern = patterns[type] || [10];
    Vibration.vibrate(pattern);
  }
}

// src/hooks/useHaptic.ts
import { useCallback } from 'react';
import { triggerHaptic, HapticType } from '@/utils/haptics';

export function useHaptic() {
  const trigger = useCallback((type: HapticType) => {
    triggerHaptic(type);
  }, []);

  return { trigger };
}

// Usage
// src/components/Button/HapticButton.tsx
import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { useHaptic } from '@/hooks/useHaptic';

export const HapticButton: React.FC = ({ onPress, children }) => {
  const { trigger } = useHaptic();

  const handlePress = () => {
    trigger('impactLight');
    onPress?.();
  };

  return (
    <TouchableOpacity onPress={handlePress}>
      <Text>{children}</Text>
    </TouchableOpacity>
  );
};
```

## Implementation Guidelines

### Platform Detection

1. **Platform.OS**: Use for simple platform checks
2. **Platform.select()**: Use for inline platform-specific values
3. **File Extensions**: Use .ios.tsx/.android.tsx for different implementations
4. **Version Checks**: Check Platform.Version for OS version-specific features
5. **Constants**: Use Platform.constants for platform-specific constants

### Native Modules

1. **Type Safety**: Define TypeScript interfaces for native modules
2. **Availability Checks**: Always check if native module exists
3. **Error Handling**: Handle native module errors gracefully
4. **Event Cleanup**: Clean up native event listeners
5. **Initialization**: Initialize native modules early in app lifecycle

### Platform Patterns

1. **Navigation**: Follow platform-specific navigation patterns
2. **Components**: Use platform-appropriate components (TouchableOpacity vs TouchableNativeFeedback)
3. **Styling**: Apply platform-specific styles (shadows vs elevation)
4. **Animations**: Use platform-appropriate animations
5. **Haptics**: Implement platform-appropriate feedback

### Testing

1. **Platform Mocking**: Mock Platform.OS in tests
2. **Native Module Mocks**: Mock native modules for testing
3. **Platform-Specific Tests**: Test both iOS and Android implementations
4. **Snapshot Tests**: Create platform-specific snapshots
5. **E2E Testing**: Test on real devices for each platform

## Anti-Patterns to Avoid

### Don't Check Platform in Render

```typescript
// Bad: Platform check in render
return (
  <View>
    {Platform.OS === 'ios' ? <IOSComponent /> : <AndroidComponent />}
  </View>
);

// Good: Use Platform.select() or file extensions
const Component = Platform.select({
  ios: IOSComponent,
  android: AndroidComponent,
});

return <Component />;
```

### Don't Assume Native Module Availability

```typescript
// Bad: No availability check
NativeModules.MyModule.doSomething();

// Good: Check availability
if (NativeModules.MyModule) {
  NativeModules.MyModule.doSomething();
} else {
  console.warn('MyModule not available');
}
```

### Don't Hardcode Platform-Specific Values

```typescript
// Bad: Hardcoded values
const headerHeight = 44; // Only correct for iOS

// Good: Platform-specific
const headerHeight = Platform.select({
  ios: 44,
  android: 56,
  default: 50,
});
```

### Don't Mix Platform Patterns

```typescript
// Bad: iOS pattern on Android
<TouchableOpacity> // iOS-style
  <Text style={{ textTransform: 'uppercase' }}> // Android-style
    Button
  </Text>
</TouchableOpacity>

// Good: Platform-appropriate patterns
Platform.select({
  ios: <TouchableOpacity><Text>Button</Text></TouchableOpacity>,
  android: <TouchableNativeFeedback><View><Text style={{ textTransform: 'uppercase' }}>BUTTON</Text></View></TouchableNativeFeedback>,
});
```

### Don't Forget Event Cleanup

```typescript
// Bad: No cleanup
useEffect(() => {
  const listener = nativeEmitter.addListener('event', handler);
}, []);

// Good: Clean up listeners
useEffect(() => {
  const listener = nativeEmitter.addListener('event', handler);
  return () => listener.remove();
}, []);
```

## Related Implementers

- **navigation.md**: Platform-specific navigation patterns
- **testing.md**: Testing platform-specific code
- **accessibility.md**: Platform-specific accessibility features
- **performance-optimization.md**: Platform-specific optimizations
- **analytics.md**: Platform-specific analytics
