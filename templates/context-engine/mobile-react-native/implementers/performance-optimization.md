---
domain: performance-optimization
description: useCallback for handlers, useMemo for computations, FlatList performance, image optimization
---

# Performance Optimization Implementer

This implementer defines patterns for optimizing performance in React Native applications, including proper use of useCallback and useMemo, FlatList optimization, image loading strategies, and memory management techniques.

## Core Patterns

### useCallback for Event Handlers

Memoize event handlers to prevent unnecessary re-renders:

```typescript
// src/components/PostItem/PostItem.tsx
import React, { useCallback, memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Post } from '@/types';

interface PostItemProps {
  post: Post;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onShare: (postId: string) => void;
}

export const PostItem: React.FC<PostItemProps> = memo(({
  post,
  onLike,
  onComment,
  onShare,
}) => {
  // Memoize handlers with useCallback
  const handleLike = useCallback(() => {
    onLike(post.id);
  }, [post.id, onLike]);

  const handleComment = useCallback(() => {
    onComment(post.id);
  }, [post.id, onComment]);

  const handleShare = useCallback(() => {
    onShare(post.id);
  }, [post.id, onShare]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{post.title}</Text>
      <Text style={styles.content}>{post.content}</Text>

      <View style={styles.actions}>
        <TouchableOpacity onPress={handleLike}>
          <Text>Like ({post.likesCount})</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleComment}>
          <Text>Comment ({post.commentsCount})</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleShare}>
          <Text>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

PostItem.displayName = 'PostItem';

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  content: {
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
```

### useMemo for Expensive Computations

Memoize expensive calculations:

```typescript
// src/hooks/useFilteredData.ts
import { useMemo } from 'react';

interface FilterOptions {
  searchQuery?: string;
  category?: string;
  sortBy?: 'date' | 'popularity' | 'name';
  sortOrder?: 'asc' | 'desc';
}

export function useFilteredData<T extends Record<string, any>>(
  data: T[],
  options: FilterOptions,
  searchFields: (keyof T)[]
) {
  const filtered = useMemo(() => {
    let result = [...data];

    // Filter by search query
    if (options.searchQuery) {
      const query = options.searchQuery.toLowerCase();
      result = result.filter((item) =>
        searchFields.some((field) =>
          String(item[field]).toLowerCase().includes(query)
        )
      );
    }

    // Filter by category
    if (options.category) {
      result = result.filter((item) => item.category === options.category);
    }

    // Sort
    if (options.sortBy) {
      result.sort((a, b) => {
        const aValue = a[options.sortBy!];
        const bValue = b[options.sortBy!];

        const comparison = aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        return options.sortOrder === 'desc' ? -comparison : comparison;
      });
    }

    return result;
  }, [data, options.searchQuery, options.category, options.sortBy, options.sortOrder, searchFields]);

  return filtered;
}

// src/components/DataGrid/DataGrid.tsx
import React, { useState, useMemo } from 'react';
import { FlatList } from 'react-native';
import { useFilteredData } from '@/hooks/useFilteredData';

interface DataGridProps<T> {
  data: T[];
  renderItem: (item: T) => React.ReactElement;
}

export function DataGrid<T extends Record<string, any>>({ data, renderItem }: DataGridProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'popularity'>('date');

  const filteredData = useFilteredData(
    data,
    { searchQuery, sortBy },
    ['title', 'description']
  );

  // Memoize render item to prevent recreation
  const memoizedRenderItem = useMemo(
    () => ({ item }: { item: T }) => renderItem(item),
    [renderItem]
  );

  // Memoize key extractor
  const keyExtractor = useMemo(
    () => (item: T) => String(item.id),
    []
  );

  return (
    <FlatList
      data={filteredData}
      renderItem={memoizedRenderItem}
      keyExtractor={keyExtractor}
    />
  );
}
```

### FlatList Optimization

Optimize FlatList performance for large datasets:

```typescript
// src/components/OptimizedFlatList/OptimizedFlatList.tsx
import React, { useCallback, memo } from 'react';
import { FlatList, View, ActivityIndicator, StyleSheet, ViewToken } from 'react-native';

interface OptimizedFlatListProps<T> {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactElement;
  keyExtractor: (item: T, index: number) => string;
  onEndReached?: () => void;
  loading?: boolean;
  ItemSeparatorComponent?: React.ComponentType;
  ListEmptyComponent?: React.ComponentType;
  estimatedItemSize?: number;
}

export function OptimizedFlatList<T>({
  data,
  renderItem,
  keyExtractor,
  onEndReached,
  loading = false,
  ItemSeparatorComponent,
  ListEmptyComponent,
  estimatedItemSize = 100,
}: OptimizedFlatListProps<T>) {
  // Memoized render item
  const memoizedRenderItem = useCallback(
    ({ item, index }: { item: T; index: number }) => renderItem(item, index),
    [renderItem]
  );

  // Memoized key extractor
  const memoizedKeyExtractor = useCallback(
    (item: T, index: number) => keyExtractor(item, index),
    [keyExtractor]
  );

  // Memoized end reached handler
  const handleEndReached = useCallback(() => {
    if (!loading && onEndReached) {
      onEndReached();
    }
  }, [loading, onEndReached]);

  // Memoized viewability config
  const viewabilityConfig = useCallback(
    () => ({
      itemVisiblePercentThreshold: 50,
      minimumViewTime: 500,
    }),
    []
  );

  // Track viewable items for analytics/lazy loading
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      // Handle viewable items (e.g., track impressions, preload data)
      if (__DEV__) {
        console.log('Viewable items:', viewableItems.length);
      }
    },
    []
  );

  // Footer component for loading indicator
  const ListFooterComponent = useCallback(() => {
    if (!loading) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" />
      </View>
    );
  }, [loading]);

  return (
    <FlatList
      data={data}
      renderItem={memoizedRenderItem}
      keyExtractor={memoizedKeyExtractor}
      // Performance optimizations
      removeClippedSubviews={true} // Unmount off-screen items
      maxToRenderPerBatch={10} // Render 10 items per batch
      updateCellsBatchingPeriod={50} // Batch updates every 50ms
      initialNumToRender={10} // Initial render count
      windowSize={10} // Number of screens to render
      getItemLayout={(data, index) => ({
        length: estimatedItemSize,
        offset: estimatedItemSize * index,
        index,
      })}
      // Callbacks
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig()}
      // Components
      ItemSeparatorComponent={ItemSeparatorComponent}
      ListFooterComponent={ListFooterComponent}
      ListEmptyComponent={ListEmptyComponent}
      // Performance
      disableVirtualization={false}
    />
  );
}

const styles = StyleSheet.create({
  footer: {
    padding: 16,
    alignItems: 'center',
  },
});

// Example usage
// src/screens/FeedScreen.tsx
import React, { useCallback } from 'react';
import { View } from 'react-native';
import { OptimizedFlatList } from '@/components/OptimizedFlatList';
import { PostItem } from '@/components/PostItem';
import { usePosts } from '@/api/hooks/usePosts';

export const FeedScreen: React.FC = () => {
  const { data, isLoading, fetchNextPage } = usePosts();
  const posts = data?.pages.flatMap((page) => page.data) || [];

  const renderItem = useCallback(
    (post: Post) => <PostItem post={post} />,
    []
  );

  const keyExtractor = useCallback(
    (post: Post) => post.id,
    []
  );

  return (
    <View style={{ flex: 1 }}>
      <OptimizedFlatList
        data={posts}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        onEndReached={fetchNextPage}
        loading={isLoading}
        estimatedItemSize={200}
      />
    </View>
  );
};
```

### Image Optimization

Optimize image loading and caching:

```typescript
// src/components/OptimizedImage/OptimizedImage.tsx
import React, { useState, useCallback } from 'react';
import { View, Image, ActivityIndicator, StyleSheet, ImageProps } from 'react-native';
import FastImage, { FastImageProps, ResizeMode } from 'react-native-fast-image';

interface OptimizedImageProps extends Omit<FastImageProps, 'source'> {
  uri: string;
  width?: number;
  height?: number;
  resizeMode?: ResizeMode;
  placeholder?: React.ReactNode;
  fallback?: React.ReactNode;
  priority?: 'low' | 'normal' | 'high';
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  uri,
  width,
  height,
  resizeMode = 'cover',
  placeholder,
  fallback,
  priority = 'normal',
  style,
  ...props
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleLoadStart = useCallback(() => {
    setLoading(true);
    setError(false);
  }, []);

  const handleLoad = useCallback(() => {
    setLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setLoading(false);
    setError(true);
  }, []);

  if (error && fallback) {
    return <View style={[styles.container, style]}>{fallback}</View>;
  }

  return (
    <View style={[styles.container, style, { width, height }]}>
      <FastImage
        {...props}
        source={{
          uri,
          priority: FastImage.priority[priority],
        }}
        style={[StyleSheet.absoluteFill, { width, height }]}
        resizeMode={resizeMode}
        onLoadStart={handleLoadStart}
        onLoad={handleLoad}
        onError={handleError}
      />
      {loading && (placeholder || (
        <View style={styles.placeholder}>
          <ActivityIndicator size="small" />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
});

// Image caching utilities
// src/utils/imageCache.ts
import FastImage from 'react-native-fast-image';

export const imageCacheUtils = {
  /**
   * Preload images for better performance
   */
  preload: (urls: string[]) => {
    FastImage.preload(
      urls.map((url) => ({
        uri: url,
        priority: FastImage.priority.high,
      }))
    );
  },

  /**
   * Clear image cache
   */
  clearCache: async () => {
    await FastImage.clearMemoryCache();
    await FastImage.clearDiskCache();
  },

  /**
   * Get cache size
   */
  getCacheSize: async () => {
    // Implementation depends on your caching strategy
  },
};

// Thumbnail generation
// src/utils/thumbnails.ts
export function getThumbnailUrl(originalUrl: string, size: number): string {
  // Use image CDN or API to generate thumbnails
  // Example: Cloudinary, Imgix, or your own service
  return `${originalUrl}?w=${size}&h=${size}&fit=crop`;
}

export function getResponsiveImageUrl(
  originalUrl: string,
  width: number,
  pixelDensity: number = 1
): string {
  const targetWidth = Math.ceil(width * pixelDensity);
  return `${originalUrl}?w=${targetWidth}&q=80`;
}

// Usage with responsive images
// src/components/ResponsiveImage/ResponsiveImage.tsx
import React from 'react';
import { useWindowDimensions, PixelRatio } from 'react-native';
import { OptimizedImage } from '../OptimizedImage';
import { getResponsiveImageUrl } from '@/utils/thumbnails';

interface ResponsiveImageProps {
  uri: string;
  aspectRatio?: number;
}

export const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  uri,
  aspectRatio = 1,
}) => {
  const { width: windowWidth } = useWindowDimensions();
  const pixelDensity = PixelRatio.get();

  const responsiveUri = getResponsiveImageUrl(uri, windowWidth, pixelDensity);
  const height = windowWidth / aspectRatio;

  return (
    <OptimizedImage
      uri={responsiveUri}
      width={windowWidth}
      height={height}
      priority="high"
    />
  );
};
```

### React.memo and Component Optimization

Optimize component rendering with React.memo:

```typescript
// src/components/UserCard/UserCard.tsx
import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { OptimizedImage } from '../OptimizedImage';
import type { User } from '@/types';

interface UserCardProps {
  user: User;
  onPress?: (userId: string) => void;
  showFollowButton?: boolean;
}

// Custom comparison function for memo
const areEqual = (prevProps: UserCardProps, nextProps: UserCardProps) => {
  return (
    prevProps.user.id === nextProps.user.id &&
    prevProps.user.name === nextProps.user.name &&
    prevProps.user.avatar === nextProps.user.avatar &&
    prevProps.user.isFollowing === nextProps.user.isFollowing &&
    prevProps.showFollowButton === nextProps.showFollowButton
  );
};

export const UserCard = memo<UserCardProps>(({
  user,
  onPress,
  showFollowButton = true,
}) => {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress?.(user.id)}
    >
      <OptimizedImage
        uri={user.avatar}
        width={50}
        height={50}
        style={styles.avatar}
        resizeMode="cover"
      />
      <View style={styles.info}>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.bio}>{user.bio}</Text>
      </View>
      {showFollowButton && (
        <TouchableOpacity style={styles.followButton}>
          <Text style={styles.followText}>
            {user.isFollowing ? 'Following' : 'Follow'}
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}, areEqual);

UserCard.displayName = 'UserCard';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
  },
  avatar: {
    borderRadius: 25,
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  bio: {
    fontSize: 14,
    color: '#666',
  },
  followButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  followText: {
    color: '#fff',
    fontWeight: '600',
  },
});
```

### State Management Optimization

Optimize state updates and subscriptions:

```typescript
// src/hooks/useOptimizedState.ts
import { useCallback, useReducer, useRef } from 'react';

type StateUpdate<T> = Partial<T> | ((prev: T) => Partial<T>);

/**
 * Optimized state hook that batches updates
 */
export function useOptimizedState<T extends Record<string, any>>(
  initialState: T
) {
  const [state, dispatch] = useReducer(
    (prev: T, update: Partial<T>) => ({ ...prev, ...update }),
    initialState
  );

  const pendingUpdates = useRef<Partial<T>>({});
  const updateTimer = useRef<NodeJS.Timeout | null>(null);

  const setState = useCallback((update: StateUpdate<T>) => {
    const nextUpdate = typeof update === 'function' ? update(state) : update;

    // Batch updates
    pendingUpdates.current = { ...pendingUpdates.current, ...nextUpdate };

    if (updateTimer.current) {
      clearTimeout(updateTimer.current);
    }

    updateTimer.current = setTimeout(() => {
      dispatch(pendingUpdates.current);
      pendingUpdates.current = {};
      updateTimer.current = null;
    }, 16); // Batch updates within one frame
  }, [state]);

  return [state, setState] as const;
}

// src/hooks/useThrottle.ts
import { useCallback, useRef } from 'react';

/**
 * Throttle function calls
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef(Date.now());

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastRun.current >= delay) {
        lastRun.current = now;
        return callback(...args);
      }
    },
    [callback, delay]
  ) as T;
}

// src/hooks/useDebounce.ts
import { useEffect, useRef, useState } from 'react';

/**
 * Debounce value changes
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  return debouncedValue;
}

// Usage example
// src/components/SearchInput/SearchInput.tsx
import React, { useState } from 'react';
import { TextInput } from 'react-native';
import { useDebounce } from '@/hooks/useDebounce';
import { useSearch } from '@/api/hooks/useSearch';

export const SearchInput: React.FC = () => {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const { data: results } = useSearch(debouncedQuery);

  return (
    <TextInput
      value={query}
      onChangeText={setQuery}
      placeholder="Search..."
    />
  );
};
```

### Memory Management

Prevent memory leaks and optimize memory usage:

```typescript
// src/hooks/useMemoryOptimization.ts
import { useEffect, useRef } from 'react';

/**
 * Clean up resources when component unmounts
 */
export function useCleanup(cleanup: () => void) {
  useEffect(() => {
    return cleanup;
  }, [cleanup]);
}

/**
 * Track mounted state to prevent state updates after unmount
 */
export function useIsMounted() {
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  return isMounted;
}

// Usage example
// src/hooks/useSafeAsync.ts
import { useCallback, useState } from 'react';
import { useIsMounted } from './useMemoryOptimization';

export function useSafeAsync<T>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);
  const isMounted = useIsMounted();

  const execute = useCallback(
    async (asyncFunction: () => Promise<T>) => {
      setLoading(true);
      setError(null);

      try {
        const result = await asyncFunction();
        if (isMounted.current) {
          setData(result);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted.current) {
          setError(err as Error);
          setLoading(false);
        }
      }
    },
    [isMounted]
  );

  return { data, loading, error, execute };
}

// src/utils/memoryMonitor.ts
import { AppState, Platform } from 'react-native';

export class MemoryMonitor {
  private listeners: Array<(info: any) => void> = [];

  start() {
    if (Platform.OS === 'ios') {
      // Monitor memory warnings on iOS
      AppState.addEventListener('memoryWarning', () => {
        this.notifyListeners({ type: 'warning' });
      });
    }
  }

  subscribe(listener: (info: any) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(info: any) {
    this.listeners.forEach((listener) => listener(info));
  }
}

export const memoryMonitor = new MemoryMonitor();

// Usage in App
// src/App.tsx
import { useEffect } from 'react';
import { memoryMonitor } from '@/utils/memoryMonitor';
import { queryClient } from '@/api/queryClient';
import { imageCacheUtils } from '@/utils/imageCache';

export const App: React.FC = () => {
  useEffect(() => {
    memoryMonitor.start();

    const unsubscribe = memoryMonitor.subscribe((info) => {
      if (info.type === 'warning') {
        // Clear caches on memory warning
        queryClient.clear();
        imageCacheUtils.clearCache();
      }
    });

    return unsubscribe;
  }, []);

  return <AppNavigator />;
};
```

### Bundle Size Optimization

Optimize bundle size with code splitting and lazy loading:

```typescript
// src/utils/lazyLoad.ts
import React, { lazy, Suspense, ComponentType } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

const LoadingFallback: React.FC = () => (
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

/**
 * Lazy load component with suspense
 */
export function lazyLoad<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback: React.ReactNode = <LoadingFallback />
): React.FC<React.ComponentProps<T>> {
  const LazyComponent = lazy(importFunc);

  return (props: React.ComponentProps<T>) => (
    <Suspense fallback={fallback}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

// src/navigation/RootNavigator.tsx
import { lazyLoad } from '@/utils/lazyLoad';

// Lazy load screens
const HomeScreen = lazyLoad(() => import('@/screens/HomeScreen'));
const ProfileScreen = lazyLoad(() => import('@/screens/ProfileScreen'));
const SettingsScreen = lazyLoad(() => import('@/screens/SettingsScreen'));

export const RootNavigator: React.FC = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
};
```

## Implementation Guidelines

### React Hooks Optimization

1. **useCallback**: Wrap event handlers and callbacks
2. **useMemo**: Memoize expensive computations
3. **Dependencies**: Keep dependency arrays minimal and correct
4. **Custom Hooks**: Extract reusable logic
5. **Avoid Premature Optimization**: Profile before optimizing

### FlatList Best Practices

1. **Key Extraction**: Provide stable, unique keys
2. **Item Layout**: Define getItemLayout when possible
3. **Window Size**: Configure appropriate window size
4. **Batch Rendering**: Configure maxToRenderPerBatch
5. **Remove Clipped**: Enable removeClippedSubviews

### Image Performance

1. **Compression**: Compress images before upload
2. **Responsive Images**: Serve appropriately sized images
3. **Lazy Loading**: Load images on demand
4. **Caching**: Use FastImage for automatic caching
5. **Placeholders**: Show placeholders while loading

### Memory Management

1. **Cleanup**: Clean up subscriptions and timers
2. **Mounted State**: Check mounted state before updates
3. **Cache Management**: Clear caches on memory warnings
4. **Large Data**: Stream or paginate large datasets
5. **Profiling**: Use React DevTools Profiler

## Anti-Patterns to Avoid

### Don't Forget useCallback Dependencies

```typescript
// Bad: Missing dependencies
const handleClick = useCallback(() => {
  doSomething(value);
}, []); // Missing 'value' dependency

// Good: Include all dependencies
const handleClick = useCallback(() => {
  doSomething(value);
}, [value]);
```

### Don't Overuse useMemo

```typescript
// Bad: Unnecessary memoization
const doubled = useMemo(() => value * 2, [value]);

// Good: Simple computation, no memoization needed
const doubled = value * 2;
```

### Don't Use Index as Key

```typescript
// Bad: Using index as key
<FlatList
  data={items}
  renderItem={({ item, index }) => <Item key={index} />}
/>

// Good: Use stable unique identifier
<FlatList
  data={items}
  renderItem={({ item }) => <Item key={item.id} />}
/>
```

### Don't Load All Images at Once

```typescript
// Bad: Loading all images immediately
{images.map((url) => (
  <Image source={{ uri: url }} />
))}

// Good: Use FlatList with lazy loading
<FlatList
  data={images}
  renderItem={({ item }) => <OptimizedImage uri={item} />}
/>
```

### Don't Ignore Memory Leaks

```typescript
// Bad: No cleanup
useEffect(() => {
  const subscription = eventEmitter.addListener('event', handler);
}, []);

// Good: Clean up subscriptions
useEffect(() => {
  const subscription = eventEmitter.addListener('event', handler);
  return () => subscription.remove();
}, []);
```

## Related Implementers

- **testing.md**: Performance testing strategies
- **data-fetching.md**: Query optimization
- **navigation.md**: Navigation performance
- **observability.md**: Performance monitoring
- **analytics.md**: Tracking performance metrics
