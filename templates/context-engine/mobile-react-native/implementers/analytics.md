---
domain: analytics
description: Custom analytics hooks per feature with useCallback, snake_case event naming, lifecycle tracking
---

# Analytics Implementer

This implementer defines patterns for implementing analytics tracking in React Native applications, including custom analytics hooks per feature, event naming conventions with snake_case, screen tracking, and lifecycle event tracking.

## Core Patterns

### Analytics Client Setup

Configure analytics with multiple providers:

```typescript
// src/analytics/client.ts
import analytics from '@react-native-firebase/analytics';
import { Mixpanel } from 'mixpanel-react-native';
import amplitude from '@amplitude/analytics-react-native';

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
}

export interface AnalyticsUser {
  userId: string;
  properties?: Record<string, any>;
}

class AnalyticsClient {
  private mixpanel?: Mixpanel;
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Initialize Mixpanel
      this.mixpanel = new Mixpanel('YOUR_MIXPANEL_TOKEN');
      await this.mixpanel.init();

      // Initialize Amplitude
      await amplitude.init('YOUR_AMPLITUDE_KEY');

      this.isInitialized = true;
      console.log('Analytics initialized');
    } catch (error) {
      console.error('Failed to initialize analytics:', error);
    }
  }

  /**
   * Track an event across all analytics providers
   */
  async track(event: AnalyticsEvent) {
    if (!this.isInitialized) {
      console.warn('Analytics not initialized');
      return;
    }

    try {
      // Firebase Analytics
      await analytics().logEvent(event.name, event.properties);

      // Mixpanel
      this.mixpanel?.track(event.name, event.properties);

      // Amplitude
      amplitude.track(event.name, event.properties);

      if (__DEV__) {
        console.log('[Analytics]', event.name, event.properties);
      }
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
  }

  /**
   * Track screen view
   */
  async screen(screenName: string, properties?: Record<string, any>) {
    if (!this.isInitialized) return;

    try {
      // Firebase Analytics
      await analytics().logScreenView({
        screen_name: screenName,
        screen_class: screenName,
        ...properties,
      });

      // Mixpanel
      this.mixpanel?.track('screen_view', {
        screen_name: screenName,
        ...properties,
      });

      // Amplitude
      amplitude.track('screen_view', {
        screen_name: screenName,
        ...properties,
      });

      if (__DEV__) {
        console.log('[Analytics] Screen:', screenName, properties);
      }
    } catch (error) {
      console.error('Screen tracking error:', error);
    }
  }

  /**
   * Identify user
   */
  async identify(user: AnalyticsUser) {
    if (!this.isInitialized) return;

    try {
      // Firebase Analytics
      await analytics().setUserId(user.userId);
      if (user.properties) {
        await analytics().setUserProperties(user.properties);
      }

      // Mixpanel
      this.mixpanel?.identify(user.userId);
      if (user.properties) {
        this.mixpanel?.getPeople().set(user.properties);
      }

      // Amplitude
      amplitude.setUserId(user.userId);
      if (user.properties) {
        const identifyEvent = new amplitude.Identify();
        Object.entries(user.properties).forEach(([key, value]) => {
          identifyEvent.set(key, value);
        });
        amplitude.identify(identifyEvent);
      }

      if (__DEV__) {
        console.log('[Analytics] Identify:', user.userId, user.properties);
      }
    } catch (error) {
      console.error('User identification error:', error);
    }
  }

  /**
   * Reset user identity (on logout)
   */
  async reset() {
    if (!this.isInitialized) return;

    try {
      // Mixpanel
      this.mixpanel?.reset();

      // Amplitude
      amplitude.reset();

      if (__DEV__) {
        console.log('[Analytics] Reset');
      }
    } catch (error) {
      console.error('Analytics reset error:', error);
    }
  }

  /**
   * Set user property
   */
  async setUserProperty(key: string, value: any) {
    if (!this.isInitialized) return;

    try {
      // Firebase Analytics
      await analytics().setUserProperty(key, String(value));

      // Mixpanel
      this.mixpanel?.getPeople().set({ [key]: value });

      // Amplitude
      const identifyEvent = new amplitude.Identify();
      identifyEvent.set(key, value);
      amplitude.identify(identifyEvent);
    } catch (error) {
      console.error('Set user property error:', error);
    }
  }
}

export const analyticsClient = new AnalyticsClient();
```

### Analytics Hook

Create base analytics hook:

```typescript
// src/hooks/useAnalytics.ts
import { useCallback, useRef } from 'react';
import { analyticsClient, AnalyticsEvent } from '@/analytics/client';

export function useAnalytics() {
  const trackingEnabled = useRef(true);

  const track = useCallback((event: AnalyticsEvent) => {
    if (!trackingEnabled.current) return;
    analyticsClient.track(event);
  }, []);

  const screen = useCallback((screenName: string, properties?: Record<string, any>) => {
    if (!trackingEnabled.current) return;
    analyticsClient.screen(screenName, properties);
  }, []);

  const identify = useCallback((userId: string, properties?: Record<string, any>) => {
    if (!trackingEnabled.current) return;
    analyticsClient.identify({ userId, properties });
  }, []);

  const reset = useCallback(() => {
    analyticsClient.reset();
  }, []);

  const setUserProperty = useCallback((key: string, value: any) => {
    if (!trackingEnabled.current) return;
    analyticsClient.setUserProperty(key, value);
  }, []);

  const disable = useCallback(() => {
    trackingEnabled.current = false;
  }, []);

  const enable = useCallback(() => {
    trackingEnabled.current = true;
  }, []);

  return {
    track,
    screen,
    identify,
    reset,
    setUserProperty,
    disable,
    enable,
  };
}
```

### Screen Tracking

Automatically track screen views:

```typescript
// src/hooks/useScreenTracking.ts
import { useEffect } from 'react';
import { useRoute, useNavigationState } from '@react-navigation/native';
import { useAnalytics } from './useAnalytics';

/**
 * Track screen views automatically
 */
export function useScreenTracking(additionalProperties?: Record<string, any>) {
  const route = useRoute();
  const { screen } = useAnalytics();
  const routeName = useNavigationState((state) => {
    const currentRoute = state.routes[state.index];
    return currentRoute?.name;
  });

  useEffect(() => {
    if (routeName) {
      screen(routeName, {
        ...route.params,
        ...additionalProperties,
      });
    }
  }, [routeName, route.params, additionalProperties, screen]);
}

// Usage in screen components
// src/screens/ProfileScreen.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { useScreenTracking } from '@/hooks/useScreenTracking';

export const ProfileScreen: React.FC = () => {
  useScreenTracking();

  return (
    <View>
      <Text>Profile</Text>
    </View>
  );
};
```

### Feature-Specific Analytics Hooks

Create analytics hooks for each feature:

```typescript
// src/features/auth/analytics.ts
import { useCallback } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';

/**
 * Analytics hook for authentication features
 */
export function useAuthAnalytics() {
  const { track } = useAnalytics();

  const trackLoginAttempt = useCallback((method: 'email' | 'google' | 'apple') => {
    track({
      name: 'login_attempt',
      properties: {
        method,
        timestamp: Date.now(),
      },
    });
  }, [track]);

  const trackLoginSuccess = useCallback((method: 'email' | 'google' | 'apple', userId: string) => {
    track({
      name: 'login_success',
      properties: {
        method,
        user_id: userId,
        timestamp: Date.now(),
      },
    });
  }, [track]);

  const trackLoginFailure = useCallback((
    method: 'email' | 'google' | 'apple',
    errorCode: string
  ) => {
    track({
      name: 'login_failure',
      properties: {
        method,
        error_code: errorCode,
        timestamp: Date.now(),
      },
    });
  }, [track]);

  const trackSignupAttempt = useCallback((method: 'email' | 'google' | 'apple') => {
    track({
      name: 'signup_attempt',
      properties: {
        method,
        timestamp: Date.now(),
      },
    });
  }, [track]);

  const trackSignupSuccess = useCallback((method: 'email' | 'google' | 'apple', userId: string) => {
    track({
      name: 'signup_success',
      properties: {
        method,
        user_id: userId,
        timestamp: Date.now(),
      },
    });
  }, [track]);

  const trackSignupFailure = useCallback((
    method: 'email' | 'google' | 'apple',
    errorCode: string
  ) => {
    track({
      name: 'signup_failure',
      properties: {
        method,
        error_code: errorCode,
        timestamp: Date.now(),
      },
    });
  }, [track]);

  const trackLogout = useCallback(() => {
    track({
      name: 'logout',
      properties: {
        timestamp: Date.now(),
      },
    });
  }, [track]);

  const trackPasswordReset = useCallback((success: boolean) => {
    track({
      name: 'password_reset',
      properties: {
        success,
        timestamp: Date.now(),
      },
    });
  }, [track]);

  return {
    trackLoginAttempt,
    trackLoginSuccess,
    trackLoginFailure,
    trackSignupAttempt,
    trackSignupSuccess,
    trackSignupFailure,
    trackLogout,
    trackPasswordReset,
  };
}

// src/features/posts/analytics.ts
import { useCallback } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';

/**
 * Analytics hook for post features
 */
export function usePostAnalytics() {
  const { track } = useAnalytics();

  const trackPostView = useCallback((postId: string, authorId: string) => {
    track({
      name: 'post_view',
      properties: {
        post_id: postId,
        author_id: authorId,
        timestamp: Date.now(),
      },
    });
  }, [track]);

  const trackPostCreate = useCallback((postId: string, postType: string) => {
    track({
      name: 'post_create',
      properties: {
        post_id: postId,
        post_type: postType,
        timestamp: Date.now(),
      },
    });
  }, [track]);

  const trackPostLike = useCallback((postId: string, authorId: string, liked: boolean) => {
    track({
      name: liked ? 'post_like' : 'post_unlike',
      properties: {
        post_id: postId,
        author_id: authorId,
        timestamp: Date.now(),
      },
    });
  }, [track]);

  const trackPostShare = useCallback((
    postId: string,
    shareMethod: 'copy' | 'twitter' | 'facebook' | 'instagram'
  ) => {
    track({
      name: 'post_share',
      properties: {
        post_id: postId,
        share_method: shareMethod,
        timestamp: Date.now(),
      },
    });
  }, [track]);

  const trackPostComment = useCallback((postId: string, commentId: string) => {
    track({
      name: 'post_comment',
      properties: {
        post_id: postId,
        comment_id: commentId,
        timestamp: Date.now(),
      },
    });
  }, [track]);

  const trackPostBookmark = useCallback((postId: string, bookmarked: boolean) => {
    track({
      name: bookmarked ? 'post_bookmark' : 'post_unbookmark',
      properties: {
        post_id: postId,
        timestamp: Date.now(),
      },
    });
  }, [track]);

  const trackPostDelete = useCallback((postId: string) => {
    track({
      name: 'post_delete',
      properties: {
        post_id: postId,
        timestamp: Date.now(),
      },
    });
  }, [track]);

  return {
    trackPostView,
    trackPostCreate,
    trackPostLike,
    trackPostShare,
    trackPostComment,
    trackPostBookmark,
    trackPostDelete,
  };
}

// src/features/profile/analytics.ts
import { useCallback } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';

/**
 * Analytics hook for profile features
 */
export function useProfileAnalytics() {
  const { track } = useAnalytics();

  const trackProfileView = useCallback((userId: string, viewerUserId?: string) => {
    track({
      name: 'profile_view',
      properties: {
        user_id: userId,
        viewer_user_id: viewerUserId,
        timestamp: Date.now(),
      },
    });
  }, [track]);

  const trackProfileEdit = useCallback((fields: string[]) => {
    track({
      name: 'profile_edit',
      properties: {
        fields_edited: fields,
        timestamp: Date.now(),
      },
    });
  }, [track]);

  const trackFollowUser = useCallback((userId: string, followed: boolean) => {
    track({
      name: followed ? 'user_follow' : 'user_unfollow',
      properties: {
        user_id: userId,
        timestamp: Date.now(),
      },
    });
  }, [track]);

  const trackAvatarUpdate = useCallback((uploadMethod: 'camera' | 'gallery') => {
    track({
      name: 'avatar_update',
      properties: {
        upload_method: uploadMethod,
        timestamp: Date.now(),
      },
    });
  }, [track]);

  const trackBlockUser = useCallback((userId: string) => {
    track({
      name: 'user_block',
      properties: {
        user_id: userId,
        timestamp: Date.now(),
      },
    });
  }, [track]);

  const trackReportUser = useCallback((userId: string, reason: string) => {
    track({
      name: 'user_report',
      properties: {
        user_id: userId,
        reason,
        timestamp: Date.now(),
      },
    });
  }, [track]);

  return {
    trackProfileView,
    trackProfileEdit,
    trackFollowUser,
    trackAvatarUpdate,
    trackBlockUser,
    trackReportUser,
  };
}
```

### App Lifecycle Tracking

Track app lifecycle events:

```typescript
// src/hooks/useAppLifecycleTracking.ts
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAnalytics } from './useAnalytics';

/**
 * Track app lifecycle events (foreground, background)
 */
export function useAppLifecycleTracking() {
  const { track } = useAnalytics();
  const appState = useRef(AppState.currentState);
  const sessionStartTime = useRef(Date.now());

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        // App went to background
        const sessionDuration = Date.now() - sessionStartTime.current;
        track({
          name: 'app_background',
          properties: {
            session_duration: sessionDuration,
            timestamp: Date.now(),
          },
        });
      }

      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground
        sessionStartTime.current = Date.now();
        track({
          name: 'app_foreground',
          properties: {
            timestamp: Date.now(),
          },
        });
      }

      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Track initial app launch
    track({
      name: 'app_launch',
      properties: {
        timestamp: Date.now(),
      },
    });

    return () => {
      subscription.remove();
    };
  }, [track]);
}

// src/hooks/useSessionTracking.ts
import { useEffect, useRef } from 'react';
import { useAnalytics } from './useAnalytics';

/**
 * Track user session duration
 */
export function useSessionTracking() {
  const { track } = useAnalytics();
  const sessionStartTime = useRef(Date.now());
  const eventCount = useRef(0);

  useEffect(() => {
    return () => {
      // Track session end
      const sessionDuration = Date.now() - sessionStartTime.current;
      track({
        name: 'session_end',
        properties: {
          session_duration: sessionDuration,
          event_count: eventCount.current,
          timestamp: Date.now(),
        },
      });
    };
  }, [track]);

  const incrementEventCount = () => {
    eventCount.current += 1;
  };

  return { incrementEventCount };
}
```

### Error Tracking

Track errors and exceptions:

```typescript
// src/analytics/errorTracking.ts
import { analyticsClient } from './client';
import crashlytics from '@react-native-firebase/crashlytics';

export interface ErrorEvent {
  error: Error;
  context?: Record<string, any>;
  fatal?: boolean;
}

/**
 * Track errors to analytics and crash reporting
 */
export async function trackError(event: ErrorEvent) {
  const { error, context, fatal = false } = event;

  try {
    // Track to analytics
    await analyticsClient.track({
      name: 'error_occurred',
      properties: {
        error_message: error.message,
        error_stack: error.stack,
        error_name: error.name,
        fatal,
        ...context,
        timestamp: Date.now(),
      },
    });

    // Track to Crashlytics
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        crashlytics().setAttribute(key, String(value));
      });
    }

    if (fatal) {
      crashlytics().recordError(error);
    } else {
      crashlytics().log(`Non-fatal error: ${error.message}`);
    }
  } catch (trackingError) {
    console.error('Failed to track error:', trackingError);
  }
}

// src/hooks/useErrorTracking.ts
import { useCallback } from 'react';
import { trackError, ErrorEvent } from '@/analytics/errorTracking';

export function useErrorTracking() {
  const logError = useCallback((event: ErrorEvent) => {
    trackError(event);
  }, []);

  const logWarning = useCallback((message: string, context?: Record<string, any>) => {
    trackError({
      error: new Error(message),
      context: { ...context, level: 'warning' },
      fatal: false,
    });
  }, []);

  return { logError, logWarning };
}
```

### Performance Tracking

Track performance metrics:

```typescript
// src/analytics/performanceTracking.ts
import perf from '@react-native-firebase/perf';
import { analyticsClient } from './client';

export class PerformanceTracker {
  private traces: Map<string, any> = new Map();

  /**
   * Start tracking a custom trace
   */
  async startTrace(traceName: string) {
    try {
      const trace = await perf().startTrace(traceName);
      this.traces.set(traceName, {
        trace,
        startTime: Date.now(),
      });
    } catch (error) {
      console.error('Failed to start trace:', error);
    }
  }

  /**
   * Stop tracking a custom trace
   */
  async stopTrace(traceName: string, properties?: Record<string, any>) {
    try {
      const traceData = this.traces.get(traceName);
      if (!traceData) return;

      const { trace, startTime } = traceData;
      const duration = Date.now() - startTime;

      // Add custom attributes
      if (properties) {
        Object.entries(properties).forEach(([key, value]) => {
          trace.putAttribute(key, String(value));
        });
      }

      await trace.stop();
      this.traces.delete(traceName);

      // Track to analytics
      await analyticsClient.track({
        name: 'performance_trace',
        properties: {
          trace_name: traceName,
          duration,
          ...properties,
        },
      });
    } catch (error) {
      console.error('Failed to stop trace:', error);
    }
  }

  /**
   * Track API request performance
   */
  async trackApiRequest(endpoint: string, method: string, duration: number, statusCode: number) {
    try {
      await analyticsClient.track({
        name: 'api_request',
        properties: {
          endpoint,
          method,
          duration,
          status_code: statusCode,
          timestamp: Date.now(),
        },
      });
    } catch (error) {
      console.error('Failed to track API request:', error);
    }
  }
}

export const performanceTracker = new PerformanceTracker();

// src/hooks/usePerformanceTracking.ts
import { useEffect, useCallback } from 'react';
import { performanceTracker } from '@/analytics/performanceTracking';

export function usePerformanceTracking(traceName: string, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    performanceTracker.startTrace(traceName);

    return () => {
      performanceTracker.stopTrace(traceName);
    };
  }, [traceName, enabled]);

  const recordMetric = useCallback((properties: Record<string, any>) => {
    performanceTracker.stopTrace(traceName, properties);
    performanceTracker.startTrace(traceName);
  }, [traceName]);

  return { recordMetric };
}
```

### A/B Testing Integration

Integrate analytics with A/B testing:

```typescript
// src/analytics/abTesting.ts
import { analyticsClient } from './client';

interface ExperimentVariant {
  experimentId: string;
  variantId: string;
}

class ABTestingManager {
  private activeExperiments: Map<string, string> = new Map();

  /**
   * Assign user to experiment variant
   */
  async assignVariant(experiment: ExperimentVariant) {
    this.activeExperiments.set(experiment.experimentId, experiment.variantId);

    // Track variant assignment
    await analyticsClient.track({
      name: 'experiment_assigned',
      properties: {
        experiment_id: experiment.experimentId,
        variant_id: experiment.variantId,
        timestamp: Date.now(),
      },
    });

    // Set as user property
    await analyticsClient.setUserProperty(
      `experiment_${experiment.experimentId}`,
      experiment.variantId
    );
  }

  /**
   * Track experiment conversion
   */
  async trackConversion(experimentId: string, conversionType: string, value?: number) {
    const variantId = this.activeExperiments.get(experimentId);
    if (!variantId) return;

    await analyticsClient.track({
      name: 'experiment_conversion',
      properties: {
        experiment_id: experimentId,
        variant_id: variantId,
        conversion_type: conversionType,
        value,
        timestamp: Date.now(),
      },
    });
  }

  /**
   * Get current variant for experiment
   */
  getVariant(experimentId: string): string | undefined {
    return this.activeExperiments.get(experimentId);
  }
}

export const abTestingManager = new ABTestingManager();

// src/hooks/useExperiment.ts
import { useState, useEffect } from 'react';
import { abTestingManager } from '@/analytics/abTesting';

export function useExperiment(experimentId: string, variants: string[]) {
  const [variant, setVariant] = useState<string>(() => {
    // Check if already assigned
    const existing = abTestingManager.getVariant(experimentId);
    if (existing) return existing;

    // Randomly assign
    const randomIndex = Math.floor(Math.random() * variants.length);
    return variants[randomIndex];
  });

  useEffect(() => {
    abTestingManager.assignVariant({
      experimentId,
      variantId: variant,
    });
  }, [experimentId, variant]);

  return variant;
}
```

## Implementation Guidelines

### Event Naming

1. **Snake Case**: Always use snake_case for event names
2. **Verb-Noun**: Use verb_noun pattern (e.g., `button_clicked`, `post_created`)
3. **Consistency**: Maintain consistent naming across features
4. **Namespacing**: Consider prefixing events by feature
5. **Documentation**: Document all events and their properties

### Performance

1. **useCallback**: Always wrap tracking functions in useCallback
2. **Batching**: Batch events when possible
3. **Async Tracking**: Don't block UI for analytics
4. **Error Handling**: Gracefully handle tracking failures
5. **Sampling**: Consider sampling for high-volume events

### Privacy

1. **PII Protection**: Never track personally identifiable information
2. **Opt-Out**: Provide opt-out mechanism for users
3. **GDPR Compliance**: Ensure GDPR compliance
4. **Data Minimization**: Only track necessary data
5. **Anonymization**: Anonymize user data when possible

### Testing

1. **Mock Analytics**: Mock analytics in tests
2. **Event Validation**: Validate event structure
3. **Debug Mode**: Enable detailed logging in development
4. **Analytics Assertions**: Assert analytics calls in tests
5. **E2E Testing**: Test analytics in end-to-end flows

## Anti-Patterns to Avoid

### Don't Track Without useCallback

```typescript
// Bad: Function recreated on every render
const trackClick = () => {
  track({ name: 'button_click' });
};

// Good: Memoized with useCallback
const trackClick = useCallback(() => {
  track({ name: 'button_click' });
}, [track]);
```

### Don't Use Inconsistent Naming

```typescript
// Bad: Mixed naming conventions
track({ name: 'buttonClick' });
track({ name: 'post-created' });
track({ name: 'User Viewed' });

// Good: Consistent snake_case
track({ name: 'button_click' });
track({ name: 'post_created' });
track({ name: 'user_viewed' });
```

### Don't Track PII

```typescript
// Bad: Tracking PII
track({
  name: 'user_signup',
  properties: {
    email: 'user@example.com',
    phone: '+1234567890',
  },
});

// Good: No PII
track({
  name: 'user_signup',
  properties: {
    signup_method: 'email',
  },
});
```

### Don't Block UI for Analytics

```typescript
// Bad: Blocking operation
await track({ name: 'event' });
navigate('NextScreen');

// Good: Fire and forget
track({ name: 'event' });
navigate('NextScreen');
```

### Don't Forget to Initialize

```typescript
// Bad: Using analytics before initialization
track({ name: 'app_launch' });

// Good: Initialize first
await analyticsClient.initialize();
track({ name: 'app_launch' });
```

## Related Implementers

- **navigation.md**: Tracking navigation events
- **data-fetching.md**: Tracking API calls
- **testing.md**: Testing analytics implementations
- **performance-optimization.md**: Performance tracking
- **accessibility.md**: Tracking accessibility usage
