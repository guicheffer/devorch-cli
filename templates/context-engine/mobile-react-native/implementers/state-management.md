---
domain: state-management
description: Client-side state management using Zustand with Immer middleware, granular selectors, and state machines for async operations
---

# State Management with Zustand

Manage client-side UI state using Zustand with Immer middleware for immutable updates, granular selector hooks for performance, and state machines for async operations. Clear separation between client state (Zustand) and server state (TanStack Query/Apollo).

## Core Patterns

### 1. Zustand Store Organization with Immer Middleware

**Pattern:** Zustand is used exclusively for client-side UI state (not server data). Stores follow a strict directory structure in stores/ with separate files for types, store implementation, and exports. All stores use Immer middleware for immutable updates.

**Example from PR #1780:**
```typescript
// stores/cookbook-faq/types.ts
export interface CookbookFaqState {
  selectedCategory: string | null;
  isFilterOpen: boolean;
  searchQuery: string;
}

export interface CookbookFaqActions {
  setSelectedCategory: (category: string | null) => void;
  toggleFilter: () => void;
  updateSearchQuery: (query: string) => void;
  resetFilters: () => void;
}

export type CookbookFaqStore = CookbookFaqState & {
  actions: CookbookFaqActions;
};

// stores/cookbook-faq/cookbook-faq-store.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { CookbookFaqStore } from './types';

export const useCookbookFaqStore = create(
  immer<CookbookFaqStore>((set) => ({
    selectedCategory: null,
    isFilterOpen: false,
    searchQuery: '',

    actions: {
      setSelectedCategory: (category) =>
        set((state) => {
          state.selectedCategory = category;
        }),

      toggleFilter: () =>
        set((state) => {
          state.isFilterOpen = !state.isFilterOpen;
        }),

      updateSearchQuery: (query) =>
        set((state) => {
          state.searchQuery = query;
        }),

      resetFilters: () =>
        set((state) => {
          state.selectedCategory = null;
          state.isFilterOpen = false;
          state.searchQuery = '';
        }),
    },
  }))
);

// stores/cookbook-faq/index.ts - Export only granular selectors
import { useCookbookFaqStore } from './cookbook-faq-store';

export const useCookbookFaqSelectedCategory = () =>
  useCookbookFaqStore((state) => state.selectedCategory);

export const useCookbookFaqIsFilterOpen = () =>
  useCookbookFaqStore((state) => state.isFilterOpen);

export const useCookbookFaqSearchQuery = () =>
  useCookbookFaqStore((state) => state.searchQuery);

export const useCookbookFaqActions = () =>
  useCookbookFaqStore((state) => state.actions);

export type {
  CookbookFaqState,
  CookbookFaqActions,
  CookbookFaqStore,
} from './types';
```

**Frequency:** 100% of client state management

**Why:** This structure provides:
- Clear separation of concerns (types, store, selectors)
- Type-safe actions and state
- Immutable updates via Immer (mutative syntax, immutable result)
- Performance through granular selectors
- Easy testing and maintainability

**Guidelines:**
- Always use Immer middleware for immutable updates
- Separate files: types.ts, {feature}-store.ts, index.ts
- Group actions in an actions object within state
- Export granular selectors from index.ts, not the main store hook
- Use TypeScript for full type safety

### 2. Granular Selectors for Performance

**Pattern:** Zustand stores export granular selector hooks instead of exposing the main store hook. This ensures components only re-render when their specific data changes. Shallow comparison is used for computed objects.

**Example from PR #1780:**
```typescript
import { shallow } from 'zustand/shallow';

// Granular selector for primitive value
export const useActiveFilterCount = () =>
  useFilterStore((state) => state.activeFilters.length);

// Granular selector for single value
export const useIsFilterOpen = () =>
  useFilterStore((state) => state.isOpen);

// Shallow comparison for computed object
export const useFilterSummary = () =>
  useFilterStore(
    (state) => ({
      hasFilters: state.activeFilters.length > 0,
      count: state.activeFilters.length,
      isLoading: state.isApplyingFilters,
    }),
    shallow // Only re-renders if computed values actually change
  );

// Complex computed selector
export const useFilteredRecipeIds = () =>
  useRecipeListStore(
    (state) =>
      state.recipes
        .filter((r) => state.selectedCategory === null || r.category === state.selectedCategory)
        .map((r) => r.id),
    shallow
  );
```

**Component usage:**
```typescript
const RecipeFilterScreen = () => {
  // Each selector subscriptions to only what it needs
  const selectedCategory = useCookbookFaqSelectedCategory(); // Only re-renders on category change
  const searchQuery = useCookbookFaqSearchQuery(); // Only re-renders on search change
  const isFilterOpen = useCookbookFaqIsFilterOpen(); // Only re-renders on filter open/close
  const { setSelectedCategory, updateSearchQuery } = useCookbookFaqActions(); // Actions never change

  return (
    <View>
      <SearchInput
        value={searchQuery}
        onChangeText={updateSearchQuery}
      />

      <CategoryFilter
        selected={selectedCategory}
        onSelect={setSelectedCategory}
      />
    </View>
  );
};
```

**Frequency:** 100% of Zustand stores

**Why:** Granular selectors provide:
- Precise re-render control (component only updates when its specific data changes)
- Better performance (fewer unnecessary renders)
- Clear data dependencies in components
- Easier debugging (can see exactly what causes re-renders)

**Guidelines:**
- Never export the main store hook directly
- Create one selector per primitive state value
- Use shallow comparison for computed objects
- Name selectors descriptively: use{StoreName}{PropertyName}
- Export actions as single selector (actions object is stable)

### 3. State Machines for Async Operations

**Pattern:** Async operations use discriminated union types to create state machines, preventing impossible states. This pattern is used for forms, API interactions, and multi-step processes.

**Example from PR #1780:**
```typescript
// State machine for form submission
type SubmissionState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'success'; message: string }
  | { status: 'error'; error: string };

interface FormState {
  formData: FormData;
  submission: SubmissionState;
}

interface FormActions {
  updateFormData: (data: Partial<FormData>) => void;
  submitForm: () => Promise<void>;
  resetSubmission: () => void;
}

type FormStore = FormState & {
  actions: FormActions;
};

const useFormStore = create(
  immer<FormStore>((set, get) => ({
    formData: { name: '', email: '' },
    submission: { status: 'idle' },

    actions: {
      updateFormData: (data) =>
        set((state) => {
          state.formData = { ...state.formData, ...data };
        }),

      submitForm: async () => {
        set((state) => {
          state.submission = { status: 'submitting' };
        });

        try {
          const { formData } = get();
          await validateClientSide(formData);

          set((state) => {
            state.submission = { status: 'success', message: 'Form valid!' };
          });
        } catch (error) {
          set((state) => {
            state.submission = {
              status: 'error',
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          });
        }
      },

      resetSubmission: () =>
        set((state) => {
          state.submission = { status: 'idle' };
        }),
    },
  }))
);

// Granular selectors
export const useFormData = () =>
  useFormStore((state) => state.formData);

export const useSubmissionState = () =>
  useFormStore((state) => state.submission);

export const useFormActions = () =>
  useFormStore((state) => state.actions);
```

**Component usage with state machine:**
```typescript
const FormScreen = () => {
  const formData = useFormData();
  const submissionState = useSubmissionState();
  const { updateFormData, submitForm, resetSubmission } = useFormActions();

  // Render based on state machine status
  const renderSubmitButton = () => {
    switch (submissionState.status) {
      case 'idle':
        return (
          <Button onPress={submitForm}>
            Submit
          </Button>
        );

      case 'submitting':
        return (
          <Button disabled>
            <ActivityIndicator /> Submitting...
          </Button>
        );

      case 'success':
        return (
          <View>
            <Text style={styles.success}>{submissionState.message}</Text>
            <Button onPress={resetSubmission}>Submit Another</Button>
          </View>
        );

      case 'error':
        return (
          <View>
            <Text style={styles.error}>{submissionState.error}</Text>
            <Button onPress={submitForm}>Retry</Button>
          </View>
        );
    }
  };

  return (
    <View>
      <TextInput
        value={formData.name}
        onChangeText={(name) => updateFormData({ name })}
      />
      {renderSubmitButton()}
    </View>
  );
};
```

**Frequency:** 90% of async client operations

**Why:** State machines prevent:
- Impossible states (can't be loading and have error at same time)
- Type errors (TypeScript ensures correct properties for each status)
- Complex boolean combinations (isLoading && !error && !success)
- Unclear state transitions

**Guidelines:**
- Use discriminated unions with status field
- Define all possible states explicitly
- Include relevant data with each state (error message, success data)
- Use switch statements for exhaustive handling
- TypeScript will error if you miss a case

### 4. Client State vs Server State Separation

**Pattern:** Clear separation between client state (Zustand) and server state (TanStack Query/Apollo). Zustand stores NEVER contain API data, only UI interaction state, selections, and form data. Server data is accessed via React Query or GraphQL hooks.

**Example from PR #1780:**
```typescript
// ❌ FORBIDDEN - Don't store server data in Zustand
interface BadStore {
  users: User[]; // This should be in TanStack Query
  currentUser: User; // This should be from API
  recipes: Recipe[]; // This should be from GraphQL
  isLoadingUsers: boolean; // Duplicate of React Query loading state
}

// ✅ CORRECT - Only client state in Zustand
interface GoodStore {
  // UI interaction state
  selectedRecipeId: string | null; // Client selection state
  viewMode: 'grid' | 'list'; // Client UI preference
  sortBy: 'name' | 'date'; // Client sort preference

  // Temporary client-side data
  favoriteRecipeIds: string[]; // Client-side temporary favorites
  recentSearches: string[]; // Client-side search history

  // Form data (not yet submitted to server)
  draftRecipe: Partial<Recipe> | null;

  // UI state
  isFilterPanelOpen: boolean;
  selectedFilters: string[];
}

// ✅ CORRECT - Combine in component
const RecipeListScreen = () => {
  // Server state from TanStack Query
  const { data: recipes, isLoading } = useRecipesQuery();

  // Client state from Zustand
  const selectedRecipeId = useRecipeListSelectedId();
  const viewMode = useRecipeListViewMode();
  const sortBy = useRecipeListSortBy();
  const { setSelectedRecipeId, setViewMode } = useRecipeListActions();

  // Combine server and client state
  const selectedRecipe = recipes?.find((r) => r.id === selectedRecipeId);

  return (
    <View>
      <ViewModePicker value={viewMode} onChange={setViewMode} />

      <RecipeGrid
        recipes={recipes}
        selectedId={selectedRecipeId}
        viewMode={viewMode}
        sortBy={sortBy}
        onSelect={setSelectedRecipeId}
      />

      {selectedRecipe && <RecipeDetailModal recipe={selectedRecipe} />}
    </View>
  );
};
```

**Frequency:** 100% of data management

**Why:** Separation provides:
- Single source of truth for server data (React Query cache)
- Automatic cache invalidation and refetching
- No sync issues between Zustand and server
- Clear responsibility boundaries
- Better performance (React Query handles optimizations)

**Guidelines:**
- NEVER store API response data in Zustand
- Use Zustand for: UI state, selections, form drafts, temporary data
- Use React Query/Apollo for: server data, mutations, cache
- Combine server and client state in components
- Zustand actions can trigger React Query mutations/refetches

### 5. Persisted State with AsyncStorage

**Pattern:** Some client state needs persistence across app restarts. Use Zustand's persist middleware with AsyncStorage for user preferences and settings.

**Example:**
```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserPreferencesState {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  notificationsEnabled: boolean;
  defaultView: 'grid' | 'list';
}

interface UserPreferencesActions {
  setTheme: (theme: UserPreferencesState['theme']) => void;
  setLanguage: (language: string) => void;
  toggleNotifications: () => void;
  setDefaultView: (view: UserPreferencesState['defaultView']) => void;
}

type UserPreferencesStore = UserPreferencesState & {
  actions: UserPreferencesActions;
};

export const useUserPreferencesStore = create(
  persist(
    immer<UserPreferencesStore>((set) => ({
      // Default values
      theme: 'auto',
      language: 'en',
      notificationsEnabled: true,
      defaultView: 'grid',

      actions: {
        setTheme: (theme) =>
          set((state) => {
            state.theme = theme;
          }),

        setLanguage: (language) =>
          set((state) => {
            state.language = language;
          }),

        toggleNotifications: () =>
          set((state) => {
            state.notificationsEnabled = !state.notificationsEnabled;
          }),

        setDefaultView: (view) =>
          set((state) => {
            state.defaultView = view;
          }),
      },
    })),
    {
      name: 'user-preferences-storage', // Storage key
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist state, not actions
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
        notificationsEnabled: state.notificationsEnabled,
        defaultView: state.defaultView,
      }),
    }
  )
);

// Granular selectors
export const useTheme = () =>
  useUserPreferencesStore((state) => state.theme);

export const useLanguage = () =>
  useUserPreferencesStore((state) => state.language);

export const useNotificationsEnabled = () =>
  useUserPreferencesStore((state) => state.notificationsEnabled);

export const useDefaultView = () =>
  useUserPreferencesStore((state) => state.defaultView);

export const useUserPreferencesActions = () =>
  useUserPreferencesStore((state) => state.actions);
```

**Frequency:** 80% of user preference stores

**Guidelines:**
- Use persist middleware for user preferences and settings
- Use AsyncStorage as storage backend (React Native)
- Use partialize to exclude actions from persistence
- Use descriptive storage key names
- Handle hydration in app initialization

## Implementation Guidelines

### Store File Structure

**Standard store directory:**
```
stores/
├── recipe-list/
│   ├── types.ts               # TypeScript interfaces
│   ├── recipe-list-store.ts   # Zustand store implementation
│   ├── index.ts               # Public API with granular selectors
│   └── __tests__/
│       └── recipe-list-store.test.ts
├── cookbook-faq/
│   ├── types.ts
│   ├── cookbook-faq-store.ts
│   └── index.ts
└── user-preferences/
    ├── types.ts
    ├── user-preferences-store.ts
    └── index.ts
```

### Store Initialization and Reset

**Pattern for store reset:**
```typescript
// types.ts
export interface RecipeListState {
  recipes: Recipe[];
  selectedId: string | null;
  viewMode: 'grid' | 'list';
}

// Default state as constant
export const DEFAULT_RECIPE_LIST_STATE: RecipeListState = {
  recipes: [],
  selectedId: null,
  viewMode: 'grid',
};

// Store with reset action
const useRecipeListStore = create(
  immer<RecipeListStore>((set) => ({
    ...DEFAULT_RECIPE_LIST_STATE,

    actions: {
      // ... other actions

      reset: () =>
        set((state) => {
          Object.assign(state, DEFAULT_RECIPE_LIST_STATE);
        }),
    },
  }))
);
```

### Testing Zustand Stores

**Unit tests for stores:**
```typescript
import { renderHook, act } from '@testing-library/react';
import {
  useCookbookFaqSelectedCategory,
  useCookbookFaqActions,
} from '../index';
import { useCookbookFaqStore } from '../cookbook-faq-store';

describe('CookbookFaq Store', () => {
  // Reset store before each test
  beforeEach(() => {
    act(() => {
      useCookbookFaqStore.setState({
        selectedCategory: null,
        isFilterOpen: false,
        searchQuery: '',
      });
    });
  });

  it('should update selected category', () => {
    const { result: actionsResult } = renderHook(() => useCookbookFaqActions());
    const { result: categoryResult } = renderHook(() =>
      useCookbookFaqSelectedCategory()
    );

    expect(categoryResult.current).toBeNull();

    act(() => {
      actionsResult.current.setSelectedCategory('appetizers');
    });

    expect(categoryResult.current).toBe('appetizers');
  });

  it('should reset all filters', () => {
    // Setup initial state
    act(() => {
      const actions = useCookbookFaqStore.getState().actions;
      actions.setSelectedCategory('desserts');
      actions.toggleFilter();
      actions.updateSearchQuery('chocolate');
    });

    // Verify state is set
    expect(useCookbookFaqStore.getState().selectedCategory).toBe('desserts');
    expect(useCookbookFaqStore.getState().isFilterOpen).toBe(true);
    expect(useCookbookFaqStore.getState().searchQuery).toBe('chocolate');

    // Reset
    act(() => {
      useCookbookFaqStore.getState().actions.resetFilters();
    });

    // Verify state is reset
    expect(useCookbookFaqStore.getState().selectedCategory).toBeNull();
    expect(useCookbookFaqStore.getState().isFilterOpen).toBe(false);
    expect(useCookbookFaqStore.getState().searchQuery).toBe('');
  });

  it('should only re-render when selected data changes', () => {
    const renderSpy = jest.fn();

    const { rerender } = renderHook(() => {
      const category = useCookbookFaqSelectedCategory();
      renderSpy();
      return category;
    });

    expect(renderSpy).toHaveBeenCalledTimes(1);

    // Change unrelated state
    act(() => {
      useCookbookFaqStore.getState().actions.updateSearchQuery('test');
    });

    // Should not re-render because selectedCategory didn't change
    expect(renderSpy).toHaveBeenCalledTimes(1);

    // Change selected category
    act(() => {
      useCookbookFaqStore.getState().actions.setSelectedCategory('appetizers');
    });

    // Should re-render because selectedCategory changed
    expect(renderSpy).toHaveBeenCalledTimes(2);
  });
});
```

## Anti-Patterns to Avoid

❌ **Don't store server data in Zustand:**
```typescript
// ❌ Bad - storing API data in Zustand
const useRecipeStore = create((set) => ({
  recipes: [],
  isLoading: false,

  fetchRecipes: async () => {
    set({ isLoading: true });
    const data = await api.getRecipes();
    set({ recipes: data, isLoading: false });
  },
}));
```

✅ **Use React Query for server data:**
```typescript
// ✅ Good - server data in React Query
const { data: recipes, isLoading } = useRecipesQuery();

// Zustand only for client state
const selectedId = useRecipeListSelectedId();
```

❌ **Don't export the main store hook:**
```typescript
// ❌ Bad - exporting main store causes unnecessary re-renders
export const useRecipeStore = create(...);

// Component subscribes to entire store
const Component = () => {
  const store = useRecipeStore(); // Re-renders on any state change!
  return <View />;
};
```

✅ **Export granular selectors:**
```typescript
// ✅ Good - granular selectors
export const useSelectedRecipeId = () =>
  useRecipeStore((state) => state.selectedId);

// Component subscribes to only what it needs
const Component = () => {
  const selectedId = useSelectedRecipeId(); // Only re-renders when selectedId changes
  return <View />;
};
```

❌ **Don't use boolean flags for async states:**
```typescript
// ❌ Bad - can have impossible states
interface BadState {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  data: Data | null;
  error: string | null;
}
// Can be { isLoading: true, isSuccess: true } - impossible!
```

✅ **Use discriminated unions (state machines):**
```typescript
// ✅ Good - impossible states are impossible
type GoodState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: Data }
  | { status: 'error'; error: string };
```

## Related Implementers

- **react-native-components.md** - Components that consume Zustand state
- **data-fetching.md** - TanStack Query and Apollo Client for server state
- **testing.md** - Testing strategies for Zustand stores
- **typescript.md** - TypeScript patterns for type-safe stores
- **performance-optimization.md** - Performance optimization with granular selectors
