---
domain: state-management
description: Verify Zustand store architecture, Immer middleware, granular selectors, state machines, and client/server state separation
---

# State Management Verification

Verify that Zustand state management implementations follow best practices for store architecture, Immer middleware integration, selector patterns, state machines with discriminated unions, and clear separation between client and server state.

## Verification Checklist

### 1. Zustand Store Structure

**Requirement:** Zustand stores must follow multi-file organization with types.ts, store.ts, and index.ts with granular selectors.

**Verification Steps:**

✅ **Check store directory structure:**
```bash
# ✅ Correct - organized store structure
src/
├── stores/
│   ├── cart/
│   │   ├── types.ts
│   │   ├── store.ts
│   │   ├── index.ts
│   │   └── __tests__/
│   │       └── store.test.ts
│   ├── user/
│   │   ├── types.ts
│   │   ├── store.ts
│   │   └── index.ts
│   └── index.ts

# ❌ Incorrect - single file stores
src/
├── stores/
│   ├── cartStore.ts  # Everything in one file
│   └── userStore.ts
```

✅ **Check types.ts structure:**
```typescript
// ✅ Correct - comprehensive types
// src/stores/cart/types.ts
export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

export interface CartState {
  items: CartItem[];
  total: number;
  isLoading: boolean;
  error: string | null;
}

export interface CartActions {
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  reset: () => void;
}

export type CartStore = CartState & CartActions;

// ❌ Incorrect - mixing state and actions without clear types
export interface CartStore {
  items: any[];  // ❌ Using 'any'
  addItem: Function;  // ❌ Generic Function type
  // No separation of state vs actions
}
```

✅ **Check store.ts implementation:**
```typescript
// ✅ Correct - store with Immer middleware
// src/stores/cart/store.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { CartStore, CartState, CartItem } from './types';

const initialState: CartState = {
  items: [],
  total: 0,
  isLoading: false,
  error: null,
};

export const useCartStore = create<CartStore>()(
  immer((set) => ({
    ...initialState,

    addItem: (item) =>
      set((state) => {
        const existingItem = state.items.find((i) => i.id === item.id);

        if (existingItem) {
          existingItem.quantity += 1;
        } else {
          state.items.push({ ...item, quantity: 1 });
        }

        state.total = state.items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );
      }),

    removeItem: (itemId) =>
      set((state) => {
        state.items = state.items.filter((item) => item.id !== itemId);
        state.total = state.items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );
      }),

    updateQuantity: (itemId, quantity) =>
      set((state) => {
        const item = state.items.find((i) => i.id === itemId);
        if (item) {
          item.quantity = quantity;
          state.total = state.items.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
          );
        }
      }),

    clearCart: () =>
      set((state) => {
        state.items = [];
        state.total = 0;
      }),

    reset: () => set(initialState),
  }))
);

// ❌ Incorrect - no Immer, manual spreading
export const useCartStore = create<CartStore>((set) => ({
  items: [],

  addItem: (item) =>
    set((state) => ({
      ...state,  // ❌ Manual spreading is error-prone
      items: [
        ...state.items,  // ❌ Verbose and complex
        { ...item, quantity: 1 },
      ],
    })),
}));
```

✅ **Check index.ts with granular selectors:**
```typescript
// ✅ Correct - granular selectors for performance
// src/stores/cart/index.ts
export { useCartStore } from './store';
export type { CartStore, CartItem, CartState, CartActions } from './types';

// Granular selectors
export const useCartItems = () => useCartStore((state) => state.items);
export const useCartTotal = () => useCartStore((state) => state.total);
export const useCartItemCount = () =>
  useCartStore((state) =>
    state.items.reduce((sum, item) => sum + item.quantity, 0)
  );
export const useCartIsLoading = () => useCartStore((state) => state.isLoading);
export const useCartActions = () =>
  useCartStore((state) => ({
    addItem: state.addItem,
    removeItem: state.removeItem,
    updateQuantity: state.updateQuantity,
    clearCart: state.clearCart,
  }));

// ❌ Incorrect - no selectors or selecting entire store
export const useCart = () => useCartStore();  // ❌ Will re-render on any state change
```

**How to Verify:**
```bash
# Check store directories have required files
find src/stores -mindepth 1 -maxdepth 1 -type d | while read dir; do
  store=$(basename "$dir")
  test -f "$dir/types.ts" || echo "❌ Missing types.ts in $dir"
  test -f "$dir/store.ts" || echo "❌ Missing store.ts in $dir"
  test -f "$dir/index.ts" || echo "❌ Missing index.ts in $dir"
done

# Check for Immer middleware usage
find src/stores -name "store.ts" | xargs grep "immer" && echo "✅ Using Immer" || echo "❌ Not using Immer"

# Check for granular selectors in index.ts
find src/stores -name "index.ts" | xargs grep "useCartStore((state)" | wc -l

# Check for anti-pattern of selecting entire store
find src -name "*.tsx" -o -name "*.ts" | xargs grep "useCartStore()" | grep -v "useCartStore((state)" && echo "❌ Selecting entire store" || echo "✅ Using granular selectors"
```

---

### 2. Immer Middleware Integration

**Requirement:** All Zustand stores must use Immer middleware for safe mutable updates.

**Verification Steps:**

✅ **Check Immer middleware setup:**
```typescript
// ✅ Correct - Immer middleware with proper typing
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export const useUserStore = create<UserStore>()(
  immer((set) => ({
    profile: null,
    preferences: {
      notifications: true,
      darkMode: false,
    },

    updatePreferences: (prefs) =>
      set((state) => {
        // Mutate directly - Immer handles immutability
        state.preferences.notifications = prefs.notifications ?? state.preferences.notifications;
        state.preferences.darkMode = prefs.darkMode ?? state.preferences.darkMode;
      }),

    setProfile: (profile) =>
      set((state) => {
        state.profile = profile;
      }),
  }))
);

// ❌ Incorrect - manual spreading without Immer
export const useUserStore = create<UserStore>((set) => ({
  profile: null,
  preferences: { notifications: true, darkMode: false },

  updatePreferences: (prefs) =>
    set((state) => ({
      ...state,
      preferences: {
        ...state.preferences,  // ❌ Verbose and error-prone
        ...prefs,
      },
    })),
}));
```

✅ **Check nested state updates with Immer:**
```typescript
// ✅ Correct - Immer makes nested updates simple
export const useOrderStore = create<OrderStore>()(
  immer((set) => ({
    orders: [],

    updateOrderStatus: (orderId, status) =>
      set((state) => {
        const order = state.orders.find((o) => o.id === orderId);
        if (order) {
          order.status = status;  // Direct mutation - Immer handles it
          order.updatedAt = new Date().toISOString();
        }
      }),

    updateOrderItem: (orderId, itemId, quantity) =>
      set((state) => {
        const order = state.orders.find((o) => o.id === orderId);
        if (order) {
          const item = order.items.find((i) => i.id === itemId);
          if (item) {
            item.quantity = quantity;  // Nested mutation - simple with Immer
          }
        }
      }),
  }))
);

// ❌ Incorrect - manual spreading for nested updates
updateOrderItem: (orderId, itemId, quantity) =>
  set((state) => ({
    ...state,
    orders: state.orders.map((order) =>
      order.id === orderId
        ? {
            ...order,
            items: order.items.map((item) =>
              item.id === itemId
                ? { ...item, quantity }
                : item
            ),
          }
        : order
    ),
  })),
```

**How to Verify:**
```bash
# Check all stores use Immer
find src/stores -name "store.ts" | while read file; do
  grep -q "immer" "$file" || echo "❌ $file not using Immer"
done

# Check for manual spreading pattern (anti-pattern with Immer available)
find src/stores -name "store.ts" | xargs grep "set((state) => ({ ...state" && echo "❌ Found manual spreading" || echo "✅ Using Immer mutations"

# Verify Immer is installed
grep -q "immer" package.json && echo "✅ Immer installed" || echo "❌ Immer not installed"
```

---

### 3. Granular Selectors

**Requirement:** Stores must export granular selectors to prevent unnecessary re-renders.

**Verification Steps:**

✅ **Check selector patterns:**
```typescript
// ✅ Correct - granular selectors prevent unnecessary re-renders
// src/stores/cart/index.ts
export const useCartItems = () => useCartStore((state) => state.items);
export const useCartTotal = () => useCartStore((state) => state.total);
export const useCartItemById = (id: string) =>
  useCartStore((state) => state.items.find((item) => item.id === id));

// Component only re-renders when total changes
export const CartTotal: React.FC = () => {
  const total = useCartTotal();  // ✅ Granular selector
  return <Text>${total.toFixed(2)}</Text>;
};

// ❌ Incorrect - selecting entire store
export const CartTotal: React.FC = () => {
  const store = useCartStore();  // ❌ Re-renders on ANY store change
  return <Text>${store.total.toFixed(2)}</Text>;
};
```

✅ **Check selector with parameters:**
```typescript
// ✅ Correct - parameterized selectors
export const useCartItemById = (id: string) =>
  useCartStore(
    useCallback((state) => state.items.find((item) => item.id === id), [id])
  );

export const useIsItemInCart = (productId: string) =>
  useCartStore(
    useCallback(
      (state) => state.items.some((item) => item.productId === productId),
      [productId]
    )
  );

// Usage in component
const CartButton: React.FC<{ productId: string }> = ({ productId }) => {
  const isInCart = useIsItemInCart(productId);  // ✅ Only re-renders when this specific item changes
  return <Button label={isInCart ? 'In Cart' : 'Add to Cart'} />;
};

// ❌ Incorrect - no parameterized selector
const CartButton: React.FC<{ productId: string }> = ({ productId }) => {
  const items = useCartItems();  // ❌ Re-renders when ANY item changes
  const isInCart = items.some((item) => item.productId === productId);
  return <Button label={isInCart ? 'In Cart' : 'Add to Cart'} />;
};
```

✅ **Check action-only selectors:**
```typescript
// ✅ Correct - selector for actions only (never causes re-renders)
export const useCartActions = () =>
  useCartStore(
    useCallback(
      (state) => ({
        addItem: state.addItem,
        removeItem: state.removeItem,
        updateQuantity: state.updateQuantity,
      }),
      []
    )
  );

// Component never re-renders from store changes
const AddToCartButton: React.FC<{ product: Product }> = ({ product }) => {
  const { addItem } = useCartActions();  // ✅ Stable reference

  const handlePress = useCallback(() => {
    addItem(product);
  }, [product, addItem]);

  return <Button onPress={handlePress} label="Add to Cart" />;
};

// ❌ Incorrect - including state with actions
export const useCart = () => useCartStore();  // ❌ Includes state - causes re-renders
```

**How to Verify:**
```bash
# Check for granular selectors in store index files
find src/stores -name "index.ts" | xargs grep "useCartStore((state) =>" | wc -l

# Check components use granular selectors
find src -name "*.tsx" | xargs grep "useCartStore((state)" | wc -l

# Check for anti-pattern of selecting entire store
find src -name "*.tsx" | xargs grep "= useCartStore()" && echo "❌ Selecting entire store" || echo "✅ Using selectors"

# Check for action-only selectors
find src/stores -name "index.ts" | xargs grep "useCallback.*addItem.*removeItem"
```

---

### 4. State Machines with Discriminated Unions

**Requirement:** Async operations must use state machines with discriminated unions for type-safe state transitions.

**Verification Steps:**

✅ **Check state machine types:**
```typescript
// ✅ Correct - discriminated union for async states
// src/stores/recipes/types.ts
export type RecipesState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: Recipe[]; lastFetched: string }
  | { status: 'error'; error: string };

export interface RecipesStore {
  recipesState: RecipesState;
  fetchRecipes: () => Promise<void>;
  reset: () => void;
}

// ❌ Incorrect - boolean flags (not type-safe)
export interface RecipesStore {
  recipes: Recipe[];
  isLoading: boolean;  // ❌ Can be loading AND have error
  error: string | null;  // ❌ Can have recipes AND error
  // Impossible states are possible!
}
```

✅ **Check state machine implementation:**
```typescript
// ✅ Correct - state machine with type-safe transitions
export const useRecipesStore = create<RecipesStore>()(
  immer((set) => ({
    recipesState: { status: 'idle' },

    fetchRecipes: async () => {
      set((state) => {
        state.recipesState = { status: 'loading' };
      });

      try {
        const data = await api.getRecipes();
        set((state) => {
          state.recipesState = {
            status: 'success',
            data,
            lastFetched: new Date().toISOString(),
          };
        });
      } catch (error) {
        set((state) => {
          state.recipesState = {
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        });
      }
    },

    reset: () =>
      set((state) => {
        state.recipesState = { status: 'idle' };
      }),
  }))
);

// ❌ Incorrect - boolean flags without type safety
fetchRecipes: async () => {
  set({ isLoading: true, error: null });

  try {
    const recipes = await api.getRecipes();
    set({ recipes, isLoading: false });  // ❌ Forgot to clear error!
  } catch (error) {
    set({ error: error.message, isLoading: false });  // ❌ Old recipes still present
  }
}
```

✅ **Check type-safe state consumption:**
```typescript
// ✅ Correct - type-safe pattern matching
export const RecipeList: React.FC = () => {
  const recipesState = useRecipesStore((state) => state.recipesState);

  // TypeScript enforces exhaustive checking
  switch (recipesState.status) {
    case 'idle':
      return <Text>Press button to load recipes</Text>;

    case 'loading':
      return <ActivityIndicator />;

    case 'success':
      return (
        <FlatList
          data={recipesState.data}  // ✅ TypeScript knows data exists
          renderItem={({ item }) => <RecipeCard recipe={item} />}
        />
      );

    case 'error':
      return <ErrorView message={recipesState.error} />;  // ✅ TypeScript knows error exists

    default:
      // TypeScript error if we forgot a case!
      const _exhaustive: never = recipesState;
      return null;
  }
};

// ❌ Incorrect - conditional checks with boolean flags
export const RecipeList: React.FC = () => {
  const { recipes, isLoading, error } = useRecipesStore();

  if (isLoading) return <ActivityIndicator />;
  if (error) return <ErrorView message={error} />;
  // ❌ What if isLoading=false, error=null, recipes=[]?
  // Is it "idle" or "no results"? Unclear!
  return <FlatList data={recipes} />;
};
```

**How to Verify:**
```bash
# Check for discriminated union types
find src/stores -name "types.ts" | xargs grep "status.*'idle'.*'loading'.*'success'.*'error'" && echo "✅ Using state machines" || echo "❌ No state machines found"

# Check for boolean flags anti-pattern
find src/stores -name "types.ts" | xargs grep "isLoading.*boolean" && echo "❌ Using boolean flags" || echo "✅ Not using boolean flags"

# Check for exhaustive switch statements
find src -name "*.tsx" | xargs grep -A 20 "switch.*State.status" | grep "default.*never"
```

---

### 5. Client vs Server State Separation

**Requirement:** Client state (Zustand) must be clearly separated from server state (React Query/Apollo).

**Verification Steps:**

✅ **Check clear separation:**
```typescript
// ✅ Correct - Zustand for client state only
// src/stores/ui/store.ts
export const useUIStore = create<UIStore>()(
  immer((set) => ({
    // Pure client state
    sidebarOpen: false,
    selectedTab: 'home',
    theme: 'light',
    showOnboarding: true,

    toggleSidebar: () =>
      set((state) => {
        state.sidebarOpen = !state.sidebarOpen;
      }),

    setSelectedTab: (tab) =>
      set((state) => {
        state.selectedTab = tab;
      }),
  }))
);

// ✅ Correct - React Query for server state
// src/hooks/useRecipes.ts
export const useRecipes = () => {
  return useQuery({
    queryKey: ['recipes'],
    queryFn: api.getRecipes,
    staleTime: 5 * 60 * 1000,  // 5 minutes
  });
};

// Component uses both appropriately
export const RecipeScreen: React.FC = () => {
  const { data: recipes, isLoading } = useRecipes();  // ✅ Server state
  const selectedTab = useUIStore((state) => state.selectedTab);  // ✅ Client state

  return <View>{/* Render */}</View>;
};

// ❌ Incorrect - mixing server data in Zustand
export const useRecipesStore = create<RecipesStore>((set) => ({
  recipes: [],  // ❌ Server data in Zustand
  isLoading: false,

  fetchRecipes: async () => {
    set({ isLoading: true });
    const recipes = await api.getRecipes();
    set({ recipes, isLoading: false });  // ❌ Duplicates React Query functionality
  },
}));
```

✅ **Check no data fetching in Zustand:**
```typescript
// ✅ Correct - Zustand stores don't fetch data
export const useCartStore = create<CartStore>()(
  immer((set) => ({
    items: [],  // Client-side cart
    addItem: (item) => set((state) => { /* add item */ }),
    // No API calls here!
  }))
);

// ✅ Correct - React Query handles server state
export const useSyncCart = () => {
  const cartItems = useCartItems();

  return useMutation({
    mutationFn: (items: CartItem[]) => api.syncCart(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
};

// ❌ Incorrect - API calls in Zustand
export const useCartStore = create<CartStore>((set) => ({
  items: [],

  syncCart: async () => {
    const response = await api.syncCart(get().items);  // ❌ Fetching in Zustand
    set({ items: response.data });
  },
}));
```

**How to Verify:**
```bash
# Check Zustand stores don't have fetch/API calls
find src/stores -name "store.ts" | xargs grep -E "fetch|axios|api\." && echo "❌ Found API calls in Zustand" || echo "✅ No API calls in Zustand"

# Check for React Query usage
grep -q "@tanstack/react-query" package.json && echo "✅ Using React Query" || echo "❌ Not using React Query"

# Check for Apollo usage
grep -q "@apollo/client" package.json && echo "✅ Using Apollo" || echo "❌ Not using Apollo"

# Check hooks use React Query/Apollo for server data
find src/hooks -name "*.ts" | xargs grep "useQuery\|useMutation\|useQuery" | wc -l
```

---

## Common Issues and Fixes

### Issue 1: Component Re-renders on Unrelated State Changes

**Symptoms:**
- Performance issues
- Unnecessary re-renders

**Root Cause:** Selecting entire store instead of using granular selectors

**Fix:**
```typescript
// ❌ Before
const store = useCartStore();
const total = store.total;  // Re-renders on ANY store change

// ✅ After
const total = useCartStore((state) => state.total);  // Only re-renders when total changes
```

---

### Issue 2: TypeScript Errors with State Updates

**Symptoms:**
```
Type 'Draft<CartItem>' is not assignable to type 'CartItem'
```

**Root Cause:** Missing Immer middleware or incorrect typing

**Fix:**
```typescript
// ✅ Ensure Immer middleware is used
import { immer } from 'zustand/middleware/immer';

export const useCartStore = create<CartStore>()(
  immer((set) => ({
    // ...
  }))
);
```

---

### Issue 3: Race Conditions with Async State

**Symptoms:**
- Stale data displayed
- Error states not clearing properly

**Root Cause:** Using boolean flags instead of state machines

**Fix:**
```typescript
// ❌ Before
interface Store {
  data: Recipe[];
  isLoading: boolean;
  error: string | null;
}

// ✅ After
type RecipesState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: Recipe[] }
  | { status: 'error'; error: string };
```

---

## Anti-Patterns to Avoid

### ❌ Don't Select Entire Store

**Bad:**
```typescript
const store = useCartStore();  // Re-renders on every change
```

**Good:**
```typescript
const items = useCartStore((state) => state.items);  // Only re-renders when items change
```

---

### ❌ Don't Use Boolean Flags for Async State

**Bad:**
```typescript
interface Store {
  isLoading: boolean;
  error: string | null;
  data: Data[];
}
```

**Good:**
```typescript
type State =
  | { status: 'loading' }
  | { status: 'success'; data: Data[] }
  | { status: 'error'; error: string };
```

---

### ❌ Don't Mix Server State in Zustand

**Bad:**
```typescript
// Zustand
fetchRecipes: async () => {
  const recipes = await api.getRecipes();  // ❌ Don't fetch in Zustand
  set({ recipes });
}
```

**Good:**
```typescript
// React Query
export const useRecipes = () => {
  return useQuery({
    queryKey: ['recipes'],
    queryFn: api.getRecipes,
  });
};
```

---

### ❌ Don't Manually Spread with Immer Available

**Bad:**
```typescript
set((state) => ({
  ...state,
  items: [...state.items, newItem],
}));
```

**Good:**
```typescript
set((state) => {
  state.items.push(newItem);  // Immer handles immutability
});
```

---

## Related Verifiers

- **react-native-components.md** - Component hooks verification
- **data-fetching.md** - Server state with React Query/Apollo
- **testing.md** - Store testing with renderHook
- **performance-optimization.md** - Selector optimization
