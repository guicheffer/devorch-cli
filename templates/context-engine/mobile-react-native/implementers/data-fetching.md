---
domain: data-fetching
description: Apollo Client for GraphQL, TanStack Query for REST, query keys, mock data organization
---

# Data Fetching Implementer

This implementer defines patterns for data fetching in React Native applications using Apollo Client for GraphQL and TanStack Query (React Query) for REST APIs, including query key management, caching strategies, and mock data organization.

## Core Patterns

### TanStack Query Configuration

Set up React Query for REST API data fetching:

```typescript
// src/api/queryClient.ts
import { QueryClient } from '@tanstack/react-query';
import { onlineManager } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';

// Configure online manager for React Native
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected);
  });
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true,
      networkMode: 'online',
    },
    mutations: {
      retry: 1,
      networkMode: 'online',
    },
  },
});

// src/providers/QueryProvider.tsx
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/api/queryClient';

interface QueryProviderProps {
  children: React.ReactNode;
}

export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};
```

### Query Key Factory

Organize query keys systematically:

```typescript
// src/api/queryKeys.ts
/**
 * Centralized query key factory for consistent cache management
 */
export const queryKeys = {
  // User queries
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters: Record<string, any>) =>
      [...queryKeys.users.lists(), filters] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
    profile: (userId: string) =>
      [...queryKeys.users.detail(userId), 'profile'] as const,
    posts: (userId: string) =>
      [...queryKeys.users.detail(userId), 'posts'] as const,
  },

  // Post queries
  posts: {
    all: ['posts'] as const,
    lists: () => [...queryKeys.posts.all, 'list'] as const,
    list: (filters: Record<string, any>) =>
      [...queryKeys.posts.lists(), filters] as const,
    details: () => [...queryKeys.posts.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.posts.details(), id] as const,
    comments: (postId: string) =>
      [...queryKeys.posts.detail(postId), 'comments'] as const,
    likes: (postId: string) =>
      [...queryKeys.posts.detail(postId), 'likes'] as const,
  },

  // Feed queries
  feed: {
    all: ['feed'] as const,
    timeline: (userId?: string) =>
      userId ? [...queryKeys.feed.all, 'timeline', userId] as const : [...queryKeys.feed.all, 'timeline'] as const,
    discover: () => [...queryKeys.feed.all, 'discover'] as const,
    trending: () => [...queryKeys.feed.all, 'trending'] as const,
  },

  // Search queries
  search: {
    all: ['search'] as const,
    results: (query: string, type?: string) =>
      type
        ? [...queryKeys.search.all, 'results', query, type] as const
        : [...queryKeys.search.all, 'results', query] as const,
    suggestions: (query: string) =>
      [...queryKeys.search.all, 'suggestions', query] as const,
  },

  // Notification queries
  notifications: {
    all: ['notifications'] as const,
    list: () => [...queryKeys.notifications.all, 'list'] as const,
    unreadCount: () => [...queryKeys.notifications.all, 'unread-count'] as const,
  },
} as const;
```

### REST API Hooks

Create custom hooks for REST API endpoints:

```typescript
// src/api/hooks/useUsers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { api } from '../client';
import type { User, UpdateUserInput } from '@/types';

/**
 * Fetch user by ID
 */
export function useUser(userId: string) {
  return useQuery({
    queryKey: queryKeys.users.detail(userId),
    queryFn: () => api.get<User>(`/users/${userId}`),
    enabled: !!userId,
  });
}

/**
 * Fetch current user profile
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.users.profile('me'),
    queryFn: () => api.get<User>('/users/me'),
  });
}

/**
 * Update user profile
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UpdateUserInput }) =>
      api.put<User>(`/users/${userId}`, data),
    onSuccess: (updatedUser) => {
      // Update user detail cache
      queryClient.setQueryData(
        queryKeys.users.detail(updatedUser.id),
        updatedUser
      );

      // Invalidate user lists
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.lists(),
      });
    },
  });
}

/**
 * Fetch user's posts
 */
export function useUserPosts(userId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.users.posts(userId),
    queryFn: () => api.get<Post[]>(`/users/${userId}/posts`),
    enabled: options?.enabled ?? !!userId,
  });
}

// src/api/hooks/usePosts.ts
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { api } from '../client';
import type { Post, CreatePostInput, PaginatedResponse } from '@/types';

/**
 * Fetch paginated posts (infinite scroll)
 */
export function usePosts(filters?: Record<string, any>) {
  return useInfiniteQuery({
    queryKey: queryKeys.posts.list(filters || {}),
    queryFn: ({ pageParam = 1 }) =>
      api.get<PaginatedResponse<Post>>('/posts', {
        params: { page: pageParam, ...filters },
      }),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
  });
}

/**
 * Fetch single post by ID
 */
export function usePost(postId: string) {
  return useQuery({
    queryKey: queryKeys.posts.detail(postId),
    queryFn: () => api.get<Post>(`/posts/${postId}`),
    enabled: !!postId,
  });
}

/**
 * Create new post
 */
export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePostInput) =>
      api.post<Post>('/posts', data),
    onSuccess: (newPost) => {
      // Invalidate post lists to refetch with new post
      queryClient.invalidateQueries({
        queryKey: queryKeys.posts.lists(),
      });

      // Invalidate user's posts
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.posts(newPost.authorId),
      });

      // Invalidate feed
      queryClient.invalidateQueries({
        queryKey: queryKeys.feed.all,
      });
    },
  });
}

/**
 * Delete post
 */
export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => api.delete(`/posts/${postId}`),
    onSuccess: (_, postId) => {
      // Remove from cache
      queryClient.removeQueries({
        queryKey: queryKeys.posts.detail(postId),
      });

      // Invalidate lists
      queryClient.invalidateQueries({
        queryKey: queryKeys.posts.lists(),
      });
    },
  });
}

/**
 * Like/unlike post with optimistic update
 */
export function useLikePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, liked }: { postId: string; liked: boolean }) =>
      liked ? api.post(`/posts/${postId}/like`) : api.delete(`/posts/${postId}/like`),
    onMutate: async ({ postId, liked }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.posts.detail(postId),
      });

      // Snapshot previous value
      const previousPost = queryClient.getQueryData<Post>(
        queryKeys.posts.detail(postId)
      );

      // Optimistically update
      if (previousPost) {
        queryClient.setQueryData<Post>(
          queryKeys.posts.detail(postId),
          {
            ...previousPost,
            isLiked: liked,
            likesCount: previousPost.likesCount + (liked ? 1 : -1),
          }
        );
      }

      return { previousPost };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousPost) {
        queryClient.setQueryData(
          queryKeys.posts.detail(variables.postId),
          context.previousPost
        );
      }
    },
    onSettled: (data, error, variables) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({
        queryKey: queryKeys.posts.detail(variables.postId),
      });
    },
  });
}
```

### Apollo Client Configuration

Set up Apollo Client for GraphQL:

```typescript
// src/api/apolloClient.ts
import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  ApolloLink,
  from,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/config/constants';

// HTTP link
const httpLink = createHttpLink({
  uri: `${API_BASE_URL}/graphql`,
});

// Auth link - add token to requests
const authLink = setContext(async (_, { headers }) => {
  const token = await AsyncStorage.getItem('@auth:token');

  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

// Error link - handle GraphQL and network errors
const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path, extensions }) => {
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      );

      // Handle authentication errors
      if (extensions?.code === 'UNAUTHENTICATED') {
        // Redirect to login or refresh token
      }
    });
  }

  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
  }
});

// Retry link - retry failed requests
const retryLink = new RetryLink({
  delay: {
    initial: 300,
    max: 5000,
    jitter: true,
  },
  attempts: {
    max: 3,
    retryIf: (error, _operation) => !!error && error.statusCode !== 401,
  },
});

// Cache configuration
const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        feed: {
          keyArgs: ['filters'],
          merge(existing = { items: [] }, incoming) {
            return {
              ...incoming,
              items: [...existing.items, ...incoming.items],
            };
          },
        },
      },
    },
    Post: {
      fields: {
        isLiked: {
          read(value = false) {
            return value;
          },
        },
      },
    },
  },
});

// Create Apollo Client
export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink, retryLink, httpLink]),
  cache,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
    },
    query: {
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
});

// src/providers/ApolloProvider.tsx
import React from 'react';
import { ApolloProvider as BaseApolloProvider } from '@apollo/client';
import { apolloClient } from '@/api/apolloClient';

interface ApolloProviderProps {
  children: React.ReactNode;
}

export const ApolloProvider: React.FC<ApolloProviderProps> = ({ children }) => {
  return (
    <BaseApolloProvider client={apolloClient}>
      {children}
    </BaseApolloProvider>
  );
};
```

### GraphQL Hooks

Create hooks for GraphQL queries and mutations:

```typescript
// src/api/graphql/queries.ts
import { gql } from '@apollo/client';

export const GET_USER = gql`
  query GetUser($userId: ID!) {
    user(id: $userId) {
      id
      name
      email
      avatar
      bio
      followersCount
      followingCount
      postsCount
      isFollowing
    }
  }
`;

export const GET_FEED = gql`
  query GetFeed($cursor: String, $limit: Int) {
    feed(cursor: $cursor, limit: $limit) {
      items {
        id
        title
        content
        createdAt
        author {
          id
          name
          avatar
        }
        likesCount
        commentsCount
        isLiked
        isBookmarked
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const GET_POST = gql`
  query GetPost($postId: ID!) {
    post(id: $postId) {
      id
      title
      content
      createdAt
      updatedAt
      author {
        id
        name
        avatar
      }
      likesCount
      commentsCount
      isLiked
      isBookmarked
      comments {
        id
        content
        createdAt
        author {
          id
          name
          avatar
        }
      }
    }
  }
`;

// src/api/graphql/mutations.ts
import { gql } from '@apollo/client';

export const CREATE_POST = gql`
  mutation CreatePost($input: CreatePostInput!) {
    createPost(input: $input) {
      id
      title
      content
      createdAt
      author {
        id
        name
        avatar
      }
    }
  }
`;

export const LIKE_POST = gql`
  mutation LikePost($postId: ID!) {
    likePost(postId: $postId) {
      id
      likesCount
      isLiked
    }
  }
`;

export const UNLIKE_POST = gql`
  mutation UnlikePost($postId: ID!) {
    unlikePost(postId: $postId) {
      id
      likesCount
      isLiked
    }
  }
`;

export const FOLLOW_USER = gql`
  mutation FollowUser($userId: ID!) {
    followUser(userId: $userId) {
      id
      followersCount
      isFollowing
    }
  }
`;

// src/api/hooks/useGraphQLUser.ts
import { useQuery, useMutation } from '@apollo/client';
import { GET_USER } from '../graphql/queries';
import { FOLLOW_USER } from '../graphql/mutations';
import type { User } from '@/types';

interface GetUserData {
  user: User;
}

interface GetUserVariables {
  userId: string;
}

export function useGraphQLUser(userId: string) {
  return useQuery<GetUserData, GetUserVariables>(GET_USER, {
    variables: { userId },
    skip: !userId,
  });
}

export function useFollowUser() {
  return useMutation(FOLLOW_USER, {
    optimisticResponse: ({ userId }) => ({
      followUser: {
        id: userId,
        followersCount: 0, // Will be updated with real data
        isFollowing: true,
        __typename: 'User',
      },
    }),
    update: (cache, { data }) => {
      if (!data?.followUser) return;

      cache.modify({
        id: cache.identify({ __typename: 'User', id: data.followUser.id }),
        fields: {
          isFollowing: () => true,
          followersCount: (count) => count + 1,
        },
      });
    },
  });
}

// src/api/hooks/useGraphQLFeed.ts
import { useQuery } from '@apollo/client';
import { GET_FEED } from '../graphql/queries';
import type { Post, PageInfo } from '@/types';

interface GetFeedData {
  feed: {
    items: Post[];
    pageInfo: PageInfo;
  };
}

interface GetFeedVariables {
  cursor?: string;
  limit?: number;
}

export function useGraphQLFeed(limit: number = 20) {
  const { data, loading, error, fetchMore } = useQuery<
    GetFeedData,
    GetFeedVariables
  >(GET_FEED, {
    variables: { limit },
    notifyOnNetworkStatusChange: true,
  });

  const loadMore = () => {
    if (!data?.feed.pageInfo.hasNextPage) return;

    fetchMore({
      variables: {
        cursor: data.feed.pageInfo.endCursor,
        limit,
      },
    });
  };

  return {
    posts: data?.feed.items || [],
    hasMore: data?.feed.pageInfo.hasNextPage || false,
    loading,
    error,
    loadMore,
  };
}
```

### Mock Data Organization

Organize mock data for development and testing:

```typescript
// src/mocks/data/users.ts
import { User } from '@/types';

export const mockUsers: Record<string, User> = {
  'user-1': {
    id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
    avatar: 'https://i.pravatar.cc/150?img=1',
    bio: 'Software developer passionate about React Native',
    followersCount: 1234,
    followingCount: 567,
    postsCount: 89,
    isFollowing: false,
  },
  'user-2': {
    id: 'user-2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    avatar: 'https://i.pravatar.cc/150?img=2',
    bio: 'Designer and creative thinker',
    followersCount: 2345,
    followingCount: 678,
    postsCount: 156,
    isFollowing: true,
  },
};

export const getUserById = (id: string): User | undefined => {
  return mockUsers[id];
};

export const getAllUsers = (): User[] => {
  return Object.values(mockUsers);
};

// src/mocks/data/posts.ts
import { Post } from '@/types';
import { mockUsers } from './users';

export const mockPosts: Record<string, Post> = {
  'post-1': {
    id: 'post-1',
    title: 'Getting Started with React Native',
    content: 'React Native is an amazing framework...',
    authorId: 'user-1',
    author: mockUsers['user-1'],
    createdAt: new Date('2024-01-15').toISOString(),
    likesCount: 42,
    commentsCount: 12,
    isLiked: false,
    isBookmarked: false,
  },
  'post-2': {
    id: 'post-2',
    title: 'Design Patterns in Mobile Apps',
    content: 'Let\'s explore common design patterns...',
    authorId: 'user-2',
    author: mockUsers['user-2'],
    createdAt: new Date('2024-01-16').toISOString(),
    likesCount: 78,
    commentsCount: 23,
    isLiked: true,
    isBookmarked: true,
  },
};

export const getPostById = (id: string): Post | undefined => {
  return mockPosts[id];
};

export const getAllPosts = (): Post[] => {
  return Object.values(mockPosts);
};

// src/mocks/factories.ts
import { faker } from '@faker-js/faker';
import type { User, Post } from '@/types';

export const createMockUser = (overrides?: Partial<User>): User => ({
  id: faker.string.uuid(),
  name: faker.person.fullName(),
  email: faker.internet.email(),
  avatar: faker.image.avatar(),
  bio: faker.lorem.sentence(),
  followersCount: faker.number.int({ min: 0, max: 10000 }),
  followingCount: faker.number.int({ min: 0, max: 5000 }),
  postsCount: faker.number.int({ min: 0, max: 1000 }),
  isFollowing: faker.datatype.boolean(),
  ...overrides,
});

export const createMockPost = (overrides?: Partial<Post>): Post => {
  const author = createMockUser();

  return {
    id: faker.string.uuid(),
    title: faker.lorem.sentence(),
    content: faker.lorem.paragraphs(3),
    authorId: author.id,
    author,
    createdAt: faker.date.recent().toISOString(),
    likesCount: faker.number.int({ min: 0, max: 1000 }),
    commentsCount: faker.number.int({ min: 0, max: 100 }),
    isLiked: faker.datatype.boolean(),
    isBookmarked: faker.datatype.boolean(),
    ...overrides,
  };
};

export const createMockPosts = (count: number): Post[] => {
  return Array.from({ length: count }, () => createMockPost());
};
```

### Pagination Utilities

Handle pagination patterns consistently:

```typescript
// src/api/hooks/usePagination.ts
import { useState, useCallback } from 'react';
import { FlatList } from 'react-native';

interface UsePaginationOptions<T> {
  data: T[];
  loading: boolean;
  hasMore: boolean;
  loadMore: () => void;
}

export function usePagination<T>({
  data,
  loading,
  hasMore,
  loadMore,
}: UsePaginationOptions<T>) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    // Reset pagination and refetch
    // Implementation depends on your query library
    setRefreshing(false);
  }, []);

  const handleEndReached = useCallback(() => {
    if (!loading && hasMore) {
      loadMore();
    }
  }, [loading, hasMore, loadMore]);

  const flatListProps = {
    data,
    refreshing,
    onRefresh: handleRefresh,
    onEndReached: handleEndReached,
    onEndReachedThreshold: 0.5,
    ListFooterComponent: loading ? <LoadingIndicator /> : null,
  };

  return flatListProps;
}

// Usage in component
// src/screens/FeedScreen.tsx
import React from 'react';
import { FlatList, View } from 'react-native';
import { usePosts } from '@/api/hooks/usePosts';
import { usePagination } from '@/api/hooks/usePagination';
import { PostItem } from '@/components/PostItem';

export const FeedScreen: React.FC = () => {
  const { data, isLoading, hasNextPage, fetchNextPage } = usePosts();

  const posts = data?.pages.flatMap((page) => page.data) || [];

  const paginationProps = usePagination({
    data: posts,
    loading: isLoading,
    hasMore: hasNextPage || false,
    loadMore: fetchNextPage,
  });

  return (
    <FlatList
      {...paginationProps}
      renderItem={({ item }) => <PostItem post={item} />}
      keyExtractor={(item) => item.id}
    />
  );
};
```

## Implementation Guidelines

### Query Management

1. **Query Keys**: Use hierarchical query keys with factory pattern
2. **Caching Strategy**: Configure appropriate stale and cache times
3. **Invalidation**: Invalidate queries after mutations
4. **Optimistic Updates**: Use optimistic updates for better UX
5. **Error Handling**: Handle errors consistently across queries

### Performance

1. **Pagination**: Use infinite queries for long lists
2. **Selective Fetching**: Only fetch data when needed (enabled option)
3. **Prefetching**: Prefetch data for better perceived performance
4. **Deduplication**: React Query automatically deduplicates requests
5. **Background Refetching**: Configure appropriate refetch strategies

### GraphQL Best Practices

1. **Fragments**: Use fragments for reusable field selections
2. **Cache Normalization**: Configure proper typePolicies
3. **Optimistic Responses**: Provide optimistic responses for mutations
4. **Pagination**: Use cursor-based pagination for feeds
5. **Error Handling**: Handle GraphQL errors separately from network errors

### Testing

1. **Mock Handlers**: Create MSW handlers for API endpoints
2. **Factory Functions**: Use factories for generating test data
3. **Query Client**: Use separate query client for tests
4. **Cache Isolation**: Reset cache between tests
5. **Loading States**: Test all loading and error states

## Anti-Patterns to Avoid

### Don't Fetch in useEffect

```typescript
// Bad: Manual fetching in useEffect
useEffect(() => {
  fetchUser(userId).then(setUser);
}, [userId]);

// Good: Use query hooks
const { data: user } = useUser(userId);
```

### Don't Ignore Query Keys

```typescript
// Bad: Generic query keys
useQuery(['user'], fetchUser);

// Good: Specific query keys
useQuery(queryKeys.users.detail(userId), () => fetchUser(userId));
```

### Don't Forget Optimistic Updates

```typescript
// Bad: No optimistic update
const { mutate } = useLikePost();

// Good: Optimistic update
const { mutate } = useMutation({
  mutationFn: likePost,
  onMutate: async (postId) => {
    // Optimistically update UI
  },
});
```

### Don't Over-fetch

```typescript
// Bad: Fetching all posts at once
const { data } = usePosts();

// Good: Use pagination
const { data } = useInfiniteQuery({
  queryKey: ['posts'],
  queryFn: ({ pageParam }) => fetchPosts(pageParam),
  getNextPageParam: (lastPage) => lastPage.nextCursor,
});
```

### Don't Skip Error Handling

```typescript
// Bad: No error handling
const { data } = useUser(userId);

// Good: Handle errors
const { data, error, isError } = useUser(userId);

if (isError) {
  return <ErrorView error={error} />;
}
```

## Related Implementers

- **testing.md**: Testing data fetching with MSW
- **performance-optimization.md**: Optimizing queries and caching
- **analytics.md**: Tracking data fetching events
- **navigation.md**: Fetching data based on navigation
- **internationalization.md**: Localizing API responses
