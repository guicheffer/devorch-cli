---
domain: internationalization
description: JSON translations with namespaces, useT9n hook, key registration, accessibility translations
---

# Internationalization Implementer

This implementer defines patterns for implementing internationalization (i18n) in React Native applications, including JSON translations with namespaces, custom translation hooks, key registration systems, and accessibility translations.

## Core Patterns

### I18n Configuration

Set up i18next for React Native:

```typescript
// src/i18n/config.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import translations
import en from './locales/en';
import es from './locales/es';
import fr from './locales/fr';
import de from './locales/de';

const LANGUAGE_KEY = '@app:language';

// Language detection
const languageDetector = {
  type: 'languageDetector' as const,
  async: true,
  detect: async (callback: (lng: string) => void) => {
    try {
      // Check stored language
      const storedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
      if (storedLanguage) {
        callback(storedLanguage);
        return;
      }

      // Use device language
      const deviceLanguage = Localization.locale.split('-')[0];
      callback(deviceLanguage);
    } catch (error) {
      console.error('Error detecting language:', error);
      callback('en'); // Fallback
    }
  },
  init: () => {},
  cacheUserLanguage: async (language: string) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, language);
    } catch (error) {
      console.error('Error caching language:', error);
    }
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
      de: { translation: de },
    },
    fallbackLng: 'en',
    compatibilityJSON: 'v3', // Important for React Native
    interpolation: {
      escapeValue: false, // React already escapes
    },
    react: {
      useSuspense: false, // Important for React Native
    },
    debug: __DEV__,
    defaultNS: 'translation',
    ns: ['translation'],
  });

export default i18n;

// src/i18n/types.ts
import en from './locales/en';

export type TranslationKeys = keyof typeof en;
export type DeepKeys<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}.${DeepKeys<T[K]>}`
          : K
        : never;
    }[keyof T]
  : never;

export type I18nKey = DeepKeys<typeof en>;
```

### Translation Files with Namespaces

Organize translations by namespace:

```typescript
// src/i18n/locales/en/index.ts
import common from './common.json';
import auth from './auth.json';
import profile from './profile.json';
import feed from './feed.json';
import settings from './settings.json';
import errors from './errors.json';

export default {
  common,
  auth,
  profile,
  feed,
  settings,
  errors,
} as const;

// src/i18n/locales/en/common.json
{
  "app_name": "MyApp",
  "welcome": "Welcome",
  "cancel": "Cancel",
  "save": "Save",
  "delete": "Delete",
  "edit": "Edit",
  "ok": "OK",
  "yes": "Yes",
  "no": "No",
  "loading": "Loading...",
  "error": "An error occurred",
  "success": "Success!",
  "retry": "Retry",
  "back": "Back",
  "next": "Next",
  "done": "Done",
  "search": "Search",
  "filter": "Filter",
  "sort": "Sort",
  "refresh": "Refresh",
  "share": "Share"
}

// src/i18n/locales/en/auth.json
{
  "login": {
    "title": "Log In",
    "email_placeholder": "Email address",
    "password_placeholder": "Password",
    "submit_button": "Log In",
    "forgot_password": "Forgot password?",
    "no_account": "Don't have an account?",
    "sign_up": "Sign up",
    "errors": {
      "invalid_email": "Please enter a valid email address",
      "invalid_password": "Password must be at least 8 characters",
      "login_failed": "Invalid email or password"
    }
  },
  "register": {
    "title": "Create Account",
    "name_placeholder": "Full name",
    "email_placeholder": "Email address",
    "password_placeholder": "Password",
    "confirm_password_placeholder": "Confirm password",
    "submit_button": "Create Account",
    "have_account": "Already have an account?",
    "log_in": "Log in",
    "terms": "By signing up, you agree to our {{terms}} and {{privacy}}",
    "terms_link": "Terms of Service",
    "privacy_link": "Privacy Policy",
    "errors": {
      "name_required": "Name is required",
      "email_required": "Email is required",
      "password_mismatch": "Passwords do not match",
      "registration_failed": "Failed to create account"
    }
  },
  "forgot_password": {
    "title": "Reset Password",
    "description": "Enter your email address and we'll send you a link to reset your password",
    "email_placeholder": "Email address",
    "submit_button": "Send Reset Link",
    "success": "Check your email for reset instructions",
    "back_to_login": "Back to log in"
  }
}

// src/i18n/locales/en/profile.json
{
  "title": "Profile",
  "edit_profile": "Edit Profile",
  "save_changes": "Save Changes",
  "cancel_edit": "Cancel",
  "personal_info": {
    "title": "Personal Information",
    "name": "Name",
    "email": "Email",
    "phone": "Phone Number",
    "bio": "Bio"
  },
  "stats": {
    "posts": "Posts",
    "posts_count": "{{count}} post",
    "posts_count_plural": "{{count}} posts",
    "followers": "Followers",
    "followers_count": "{{count}} follower",
    "followers_count_plural": "{{count}} followers",
    "following": "Following",
    "following_count": "{{count}} following"
  },
  "actions": {
    "follow": "Follow",
    "unfollow": "Unfollow",
    "message": "Message",
    "block": "Block",
    "report": "Report"
  },
  "errors": {
    "load_failed": "Failed to load profile",
    "update_failed": "Failed to update profile"
  }
}

// src/i18n/locales/en/errors.json
{
  "network": {
    "offline": "You are offline. Please check your internet connection.",
    "timeout": "Request timed out. Please try again.",
    "server_error": "Server error. Please try again later."
  },
  "validation": {
    "required": "This field is required",
    "email": "Please enter a valid email address",
    "min_length": "Must be at least {{min}} characters",
    "max_length": "Must be no more than {{max}} characters",
    "numeric": "Must be a number",
    "phone": "Please enter a valid phone number"
  },
  "generic": "Something went wrong. Please try again."
}
```

### Custom Translation Hook

Create type-safe translation hook:

```typescript
// src/hooks/useT9n.ts
import { useCallback } from 'react';
import { useTranslation, TOptions } from 'react-i18next';
import { I18nKey } from '@/i18n/types';

interface UseT9nReturn {
  t: (key: I18nKey, options?: TOptions) => string;
  language: string;
  changeLanguage: (lang: string) => Promise<void>;
  availableLanguages: string[];
}

/**
 * Custom hook for type-safe translations
 */
export function useT9n(): UseT9nReturn {
  const { t, i18n } = useTranslation();

  const changeLanguage = useCallback(
    async (lang: string) => {
      try {
        await i18n.changeLanguage(lang);
      } catch (error) {
        console.error('Failed to change language:', error);
      }
    },
    [i18n]
  );

  const availableLanguages = Object.keys(i18n.options.resources || {});

  return {
    t: t as (key: I18nKey, options?: TOptions) => string,
    language: i18n.language,
    changeLanguage,
    availableLanguages,
  };
}

// src/hooks/useFormattedDate.ts
import { useCallback } from 'react';
import { useT9n } from './useT9n';

/**
 * Hook for formatting dates with locale awareness
 */
export function useFormattedDate() {
  const { language } = useT9n();

  const formatDate = useCallback(
    (date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
      const dateObj = typeof date === 'string' ? new Date(date) : date;

      return new Intl.DateTimeFormat(language, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        ...options,
      }).format(dateObj);
    },
    [language]
  );

  const formatTime = useCallback(
    (date: Date | string): string => {
      const dateObj = typeof date === 'string' ? new Date(date) : date;

      return new Intl.DateTimeFormat(language, {
        hour: 'numeric',
        minute: 'numeric',
      }).format(dateObj);
    },
    [language]
  );

  const formatDateTime = useCallback(
    (date: Date | string): string => {
      const dateObj = typeof date === 'string' ? new Date(date) : date;

      return new Intl.DateTimeFormat(language, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      }).format(dateObj);
    },
    [language]
  );

  const formatRelativeTime = useCallback(
    (date: Date | string): string => {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      const now = new Date();
      const diff = now.getTime() - dateObj.getTime();

      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      const rtf = new Intl.RelativeTimeFormat(language, { numeric: 'auto' });

      if (days > 0) return rtf.format(-days, 'day');
      if (hours > 0) return rtf.format(-hours, 'hour');
      if (minutes > 0) return rtf.format(-minutes, 'minute');
      return rtf.format(-seconds, 'second');
    },
    [language]
  );

  return {
    formatDate,
    formatTime,
    formatDateTime,
    formatRelativeTime,
  };
}

// src/hooks/useFormattedNumber.ts
import { useCallback } from 'react';
import { useT9n } from './useT9n';

/**
 * Hook for formatting numbers with locale awareness
 */
export function useFormattedNumber() {
  const { language } = useT9n();

  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions): string => {
      return new Intl.NumberFormat(language, options).format(value);
    },
    [language]
  );

  const formatCurrency = useCallback(
    (value: number, currency: string = 'USD'): string => {
      return new Intl.NumberFormat(language, {
        style: 'currency',
        currency,
      }).format(value);
    },
    [language]
  );

  const formatPercent = useCallback(
    (value: number): string => {
      return new Intl.NumberFormat(language, {
        style: 'percent',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value);
    },
    [language]
  );

  const formatCompactNumber = useCallback(
    (value: number): string => {
      return new Intl.NumberFormat(language, {
        notation: 'compact',
        compactDisplay: 'short',
      }).format(value);
    },
    [language]
  );

  return {
    formatNumber,
    formatCurrency,
    formatPercent,
    formatCompactNumber,
  };
}
```

### Language Selector Component

Create language selection UI:

```typescript
// src/components/LanguageSelector/LanguageSelector.tsx
import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useT9n } from '@/hooks/useT9n';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
];

export const LanguageSelector: React.FC = () => {
  const { t, language, changeLanguage } = useT9n();

  const handleLanguageSelect = useCallback(
    async (languageCode: string) => {
      await changeLanguage(languageCode);
    },
    [changeLanguage]
  );

  const renderLanguageItem = useCallback(
    ({ item }: { item: Language }) => {
      const isSelected = language === item.code;

      return (
        <TouchableOpacity
          style={[styles.languageItem, isSelected && styles.selectedItem]}
          onPress={() => handleLanguageSelect(item.code)}
          accessibilityRole="button"
          accessibilityLabel={`Select ${item.name}`}
          accessibilityState={{ selected: isSelected }}
        >
          <Text style={styles.flag}>{item.flag}</Text>
          <View style={styles.languageInfo}>
            <Text style={styles.languageName}>{item.name}</Text>
            <Text style={styles.nativeName}>{item.nativeName}</Text>
          </View>
          {isSelected && (
            <Icon name="checkmark-circle" size={24} color="#007AFF" />
          )}
        </TouchableOpacity>
      );
    },
    [language, handleLanguageSelect]
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('settings.language.title')}</Text>
      <FlatList
        data={LANGUAGES}
        renderItem={renderLanguageItem}
        keyExtractor={(item) => item.code}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 16,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  selectedItem: {
    backgroundColor: '#f0f0f0',
  },
  flag: {
    fontSize: 32,
    marginRight: 12,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  nativeName: {
    fontSize: 14,
    color: '#666',
  },
  separator: {
    height: 1,
    backgroundColor: '#e0e0e0',
  },
});
```

### Pluralization Support

Handle plural forms correctly:

```typescript
// src/i18n/locales/en/plurals.json
{
  "items": {
    "count_zero": "No items",
    "count_one": "{{count}} item",
    "count_other": "{{count}} items"
  },
  "notifications": {
    "count_zero": "No notifications",
    "count_one": "{{count}} notification",
    "count_other": "{{count}} notifications"
  },
  "time": {
    "seconds_one": "{{count}} second ago",
    "seconds_other": "{{count}} seconds ago",
    "minutes_one": "{{count}} minute ago",
    "minutes_other": "{{count}} minutes ago",
    "hours_one": "{{count}} hour ago",
    "hours_other": "{{count}} hours ago",
    "days_one": "{{count}} day ago",
    "days_other": "{{count}} days ago"
  }
}

// Usage in components
// src/components/NotificationBadge/NotificationBadge.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useT9n } from '@/hooks/useT9n';

interface NotificationBadgeProps {
  count: number;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({ count }) => {
  const { t } = useT9n();

  if (count === 0) return null;

  return (
    <View style={styles.badge}>
      <Text style={styles.text}>
        {t('plurals.notifications.count', { count })}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
```

### Accessibility Translation Integration

Integrate i18n with accessibility:

```typescript
// src/components/AccessibleText/AccessibleText.tsx
import React from 'react';
import { Text, TextProps } from 'react-native';
import { useT9n } from '@/hooks/useT9n';
import { I18nKey } from '@/i18n/types';

interface AccessibleTextProps extends TextProps {
  i18nKey: I18nKey;
  i18nOptions?: Record<string, any>;
  accessibilityI18nKey?: I18nKey;
}

/**
 * Text component with integrated i18n and accessibility
 */
export const AccessibleText: React.FC<AccessibleTextProps> = ({
  i18nKey,
  i18nOptions,
  accessibilityI18nKey,
  ...props
}) => {
  const { t } = useT9n();

  const text = t(i18nKey, i18nOptions);
  const accessibilityLabel = accessibilityI18nKey
    ? t(accessibilityI18nKey, i18nOptions)
    : text;

  return (
    <Text
      {...props}
      accessibilityLabel={accessibilityLabel}
      accessible={true}
    >
      {text}
    </Text>
  );
};

// src/components/AccessibleButton/AccessibleButton.tsx
import React, { useCallback } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  TouchableOpacityProps,
} from 'react-native';
import { useT9n } from '@/hooks/useT9n';
import { I18nKey } from '@/i18n/types';

interface AccessibleButtonProps extends TouchableOpacityProps {
  labelI18nKey: I18nKey;
  hintI18nKey?: I18nKey;
  onPress: () => void;
}

/**
 * Button component with integrated i18n and accessibility
 */
export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  labelI18nKey,
  hintI18nKey,
  onPress,
  disabled,
  ...props
}) => {
  const { t } = useT9n();

  const label = t(labelI18nKey);
  const hint = hintI18nKey ? t(hintI18nKey) : undefined;

  return (
    <TouchableOpacity
      {...props}
      onPress={onPress}
      disabled={disabled}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: !!disabled }}
    >
      <Text style={styles.text}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});

// src/i18n/locales/en/accessibility.json
{
  "buttons": {
    "close_hint": "Double tap to close",
    "save_hint": "Double tap to save changes",
    "delete_hint": "Double tap to delete. This action cannot be undone",
    "edit_hint": "Double tap to edit",
    "share_hint": "Double tap to share"
  },
  "inputs": {
    "email_hint": "Enter your email address",
    "password_hint": "Enter your password. Must be at least 8 characters",
    "search_hint": "Enter text to search"
  },
  "navigation": {
    "back_hint": "Go back to previous screen",
    "home_hint": "Go to home screen",
    "profile_hint": "Go to your profile"
  },
  "status": {
    "loading": "Loading content",
    "refreshing": "Refreshing content",
    "error": "An error occurred",
    "empty": "No content available"
  }
}
```

### RTL Support

Add right-to-left language support:

```typescript
// src/utils/rtl.ts
import { I18nManager } from 'react-native';
import i18n from '@/i18n/config';

const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur'];

/**
 * Check if current language is RTL
 */
export const isRTL = (): boolean => {
  const currentLanguage = i18n.language;
  return RTL_LANGUAGES.includes(currentLanguage);
};

/**
 * Force RTL layout if needed
 */
export const forceRTL = async (isRTLLanguage: boolean): Promise<void> => {
  if (I18nManager.isRTL !== isRTLLanguage) {
    I18nManager.forceRTL(isRTLLanguage);
    // Note: App needs restart for RTL to take effect
    // You might want to show a restart prompt
  }
};

/**
 * Get text alignment based on RTL
 */
export const getTextAlign = (): 'left' | 'right' => {
  return isRTL() ? 'right' : 'left';
};

/**
 * Get flex direction based on RTL
 */
export const getFlexDirection = (): 'row' | 'row-reverse' => {
  return isRTL() ? 'row-reverse' : 'row';
};

// src/hooks/useRTL.ts
import { useMemo } from 'react';
import { isRTL, getTextAlign, getFlexDirection } from '@/utils/rtl';

export function useRTL() {
  const rtl = useMemo(() => isRTL(), []);
  const textAlign = useMemo(() => getTextAlign(), []);
  const flexDirection = useMemo(() => getFlexDirection(), []);

  return {
    isRTL: rtl,
    textAlign,
    flexDirection,
  };
}

// Usage in components
// src/components/RTLView/RTLView.tsx
import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { useRTL } from '@/hooks/useRTL';

export const RTLView: React.FC<ViewProps> = ({ style, children, ...props }) => {
  const { flexDirection } = useRTL();

  return (
    <View
      {...props}
      style={[styles.container, { flexDirection }, style]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', // Will be overridden by RTL
  },
});
```

### Translation Key Validation

Validate translation keys at development time:

```typescript
// src/i18n/validator.ts
import en from './locales/en';

type TranslationObject = Record<string, any>;

/**
 * Validate that all translation keys exist in all locales
 */
export function validateTranslations(
  baseTranslations: TranslationObject,
  targetTranslations: TranslationObject,
  locale: string,
  path: string = ''
): string[] {
  const errors: string[] = [];

  for (const key in baseTranslations) {
    const fullPath = path ? `${path}.${key}` : key;

    if (!(key in targetTranslations)) {
      errors.push(`Missing key in ${locale}: ${fullPath}`);
      continue;
    }

    const baseValue = baseTranslations[key];
    const targetValue = targetTranslations[key];

    if (typeof baseValue === 'object' && typeof targetValue === 'object') {
      errors.push(
        ...validateTranslations(baseValue, targetValue, locale, fullPath)
      );
    } else if (typeof baseValue !== typeof targetValue) {
      errors.push(
        `Type mismatch in ${locale}: ${fullPath} (expected ${typeof baseValue}, got ${typeof targetValue})`
      );
    }
  }

  return errors;
}

// Run validation in development
if (__DEV__) {
  import('./locales/es').then((es) => {
    const errors = validateTranslations(en, es.default, 'es');
    if (errors.length > 0) {
      console.warn('Translation validation errors:', errors);
    }
  });
}

// src/i18n/__tests__/translations.test.ts
import en from '../locales/en';
import es from '../locales/es';
import fr from '../locales/fr';
import { validateTranslations } from '../validator';

describe('Translation Validation', () => {
  it('should have all keys in Spanish', () => {
    const errors = validateTranslations(en, es, 'es');
    expect(errors).toEqual([]);
  });

  it('should have all keys in French', () => {
    const errors = validateTranslations(en, fr, 'fr');
    expect(errors).toEqual([]);
  });

  it('should have consistent types across locales', () => {
    const errors = validateTranslations(en, es, 'es');
    const typeErrors = errors.filter((e) => e.includes('Type mismatch'));
    expect(typeErrors).toEqual([]);
  });
});
```

## Implementation Guidelines

### Translation Organization

1. **Namespace Structure**: Group translations by feature or domain
2. **Flat vs Nested**: Balance between flat keys and nested objects
3. **Key Naming**: Use descriptive, hierarchical key names
4. **Reusability**: Extract common translations to shared namespace
5. **Context**: Include context in key names when needed

### Translation Quality

1. **Native Speakers**: Use native speakers for translations
2. **Context Comments**: Add comments explaining context
3. **Placeholders**: Use clear placeholder names
4. **Pluralization**: Support all plural forms for each language
5. **Gender**: Consider gender variations if needed

### Performance

1. **Lazy Loading**: Load translations lazily if app is large
2. **Caching**: Cache language preference locally
3. **Bundle Size**: Keep translation files reasonable size
4. **Tree Shaking**: Remove unused translations in production
5. **Async Loading**: Load translations asynchronously

### Accessibility

1. **Screen Readers**: Provide clear accessibility labels
2. **Hints**: Add helpful hints for interactive elements
3. **Announcements**: Use accessibility announcements for state changes
4. **RTL Support**: Properly support RTL languages
5. **Voice Control**: Ensure labels work with voice control

## Anti-Patterns to Avoid

### Don't Hardcode Strings

```typescript
// Bad: Hardcoded strings
<Text>Welcome to MyApp</Text>

// Good: Use translations
<Text>{t('common.welcome')}</Text>
```

### Don't Concatenate Translations

```typescript
// Bad: Concatenating translations
const message = t('hello') + ' ' + t('world');

// Good: Single translation with interpolation
const message = t('greeting', { name: 'world' });
```

### Don't Use Generic Keys

```typescript
// Bad: Generic keys without context
t('title')
t('button')

// Good: Descriptive keys with context
t('profile.title')
t('auth.login.submit_button')
```

### Don't Forget Pluralization

```typescript
// Bad: Manual plural handling
const text = count === 1 ? '1 item' : `${count} items`;

// Good: Use i18n pluralization
const text = t('items.count', { count });
```

### Don't Skip Accessibility Translations

```typescript
// Bad: No accessibility label
<TouchableOpacity onPress={handlePress}>
  <Text>{t('save')}</Text>
</TouchableOpacity>

// Good: Include accessibility label and hint
<TouchableOpacity
  onPress={handlePress}
  accessibilityLabel={t('common.save')}
  accessibilityHint={t('accessibility.buttons.save_hint')}
>
  <Text>{t('common.save')}</Text>
</TouchableOpacity>
```

## Related Implementers

- **accessibility.md**: Accessibility with translations
- **testing.md**: Testing i18n implementations
- **performance-optimization.md**: Optimizing translation loading
- **platform-specific.md**: Platform-specific locale handling
- **data-fetching.md**: Fetching translations from API
