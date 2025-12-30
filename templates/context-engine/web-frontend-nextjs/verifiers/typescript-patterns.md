---
domain: typescript-patterns
description: Verify TypeScript usage patterns including strict typing, type-only imports, optional chaining, const assertions, and generics
---

# TypeScript Usage Patterns Verification

Verify that implementation follows TypeScript best practices with strict type definitions, proper import patterns, safe property access, and type-safe reusability.

## Verification Checklist

### 1. Strict Type Definitions for All Props

**Requirement:** All component props must have explicit TypeScript types using interface or type alias. No implicit any types allowed.

**Verification Steps:**

✅ **Check explicit prop type definitions:**
```typescript
// ✅ Correct - explicit interface
interface NPSQuestionProps {
  question: string;
  selectedRating: number | null;
  onRatingSelect: (rating: number) => void;
  minValue?: number;
  maxValue?: number;
  scaleLabelMin?: string;
  scaleLabelMid?: string;
  scaleLabelMax?: string;
}

const NPSQuestion: React.FC<NPSQuestionProps> = ({
  question,
  selectedRating,
  onRatingSelect,
  minValue = 0,
  maxValue = 10,
  scaleLabelMin,
  scaleLabelMid,
  scaleLabelMax,
}) => {
  // Component implementation
};

// ✅ Also correct - type alias
export type AddPromotionsSectionProps = {
  couponCode: string;
  productSku: string;
  price: number;
  onVoucherSubmit?: (voucher: string) => void;
  ppsFreeAddonImage: string;
  ppsFreeAddonTitleCopy: string;
  ppsFreeAddonSubtitle: string;
};

const AddPromotionsSection: React.FC<AddPromotionsSectionProps> = ({
  couponCode,
  productSku,
  price,
  onVoucherSubmit,
  ppsFreeAddonImage,
  ppsFreeAddonTitleCopy,
  ppsFreeAddonSubtitle,
}) => {
  // Component implementation
};

// ❌ Incorrect - no prop types
const MyComponent = (props) => {
  return <div>{props.title}</div>;
};

// ❌ Incorrect - implicit any
const MyComponent = ({ title, count }) => {
  return <div>{title}: {count}</div>;
};
```

✅ **Check React.FC type annotation:**
```typescript
// ✅ Correct - explicit React.FC with props
const FirstBoxTotalSection: React.FC<FirstBoxTotalSectionProps> = ({
  hasDiscount,
  isFetchingPrices,
  finalPriceFormatted,
  grandTotalFormatted,
}) => {
  // Component implementation
};

// ❌ Incorrect - missing type annotation
const FirstBoxTotalSection = ({ hasDiscount, finalPrice }) => {
  // Component implementation
};
```

✅ **Check all props are typed:**
```typescript
// ✅ Correct - all properties typed
export type FirstBoxTotalSectionProps = {
  hasDiscount: boolean;              // Required boolean
  isFetchingPrices?: boolean;        // Optional boolean
  finalPriceFormatted: string;       // Required string
  grandTotalFormatted: string;       // Required string
};

// ❌ Incorrect - missing types
export type FirstBoxTotalSectionProps = {
  hasDiscount,
  finalPriceFormatted,
};
```

✅ **Check callback types are explicit:**
```typescript
// ✅ Correct - explicit callback signature
interface NPSQuestionProps {
  onRatingSelect: (rating: number) => void;
  onChange?: (value: string) => Promise<void>;
  onSubmit: (data: FormData) => Promise<{ success: boolean }>;
}

// ❌ Incorrect - untyped callback
interface NPSQuestionProps {
  onRatingSelect: Function;
  onChange?: any;
}
```

**How to Verify:**
```bash
# Check for components without prop types
grep -r "React.FC<" app/features/new-feature/
grep -r "const.*= (" app/features/new-feature/ | grep -v "React.FC"

# Check for any implicit any
grep -r ": any" app/features/new-feature/
grep -r "Function" app/features/new-feature/

# Check TypeScript strict mode is enabled
grep "strict" tsconfig.json
grep "noImplicitAny" tsconfig.json
```

**Expected Result:**
- Every component has explicit prop types
- No `any` types (except in very rare, documented cases)
- All callbacks have explicit signatures
- TypeScript strict mode is enabled

---

### 2. Type-Only Imports with 'type' Keyword

**Requirement:** Type imports must use the 'type' keyword to ensure they're removed during transpilation, reducing bundle size.

**Verification Steps:**

✅ **Check type-only imports use 'type' keyword:**
```typescript
// ✅ Correct - separate type import
import type { DeliveryOptionsWithDate } from '@/data-access/delivery-options';
import type { VoucherInfoResult } from '@/data-access/voucher';
import type { ReactNode } from 'react';

// ✅ Also correct - inline type import
import { useVoucherInfo, type VoucherInfoResult } from '@/data-access/voucher';
import { useState, type ReactNode, type FC } from 'react';

// ❌ Incorrect - importing types as values
import { DeliveryOptionsWithDate } from '@/data-access/delivery-options';
import { VoucherInfoResult } from '@/data-access/voucher';
import { ReactNode } from 'react';
```

✅ **Check mixed imports separate types:**
```typescript
// ✅ Correct - types marked with 'type' keyword
import { useDeliveryOptionsByPostcode, type DeliveryOptionsWithDate } from '@/data-access/delivery-options';
import { DeliveryOptionStatusType, type DeliveryOption, type DeliveryDate } from '@/data-access/delivery-options';

// ❌ Incorrect - types and values mixed without 'type' keyword
import { useDeliveryOptionsByPostcode, DeliveryOptionsWithDate } from '@/data-access/delivery-options';
```

✅ **Check enum imports (values, not types):**
```typescript
// ✅ Correct - enums are values, not types
import { DeliveryOptionStatusType } from '@/data-access/delivery-options';

// ✅ Correct - type-only enum type extraction
import { type DeliveryOptionStatusType } from '@/data-access/delivery-options';
type StatusType = typeof DeliveryOptionStatusType[keyof typeof DeliveryOptionStatusType];

// ❌ Incorrect - importing enum as type-only when using its value
import type { DeliveryOptionStatusType } from '@/data-access/delivery-options';
const status = DeliveryOptionStatusType.pending; // Runtime error!
```

✅ **Check re-exports separate types:**
```typescript
// ✅ Correct - separate type exports
export { useDeliveryOptionsBySystemCountry } from './bySystemCountry';
export { DeliveryOptionStatusType } from './schema';
export type {
  DeliveryOptionsWithDate,
  DeliveryOption,
  DeliveryDate,
  GetDeliveryOptionsByPostcodeParams,
} from './schema';

// ❌ Incorrect - exporting types as values
export {
  useDeliveryOptionsBySystemCountry,
  DeliveryOptionsWithDate,  // This is a type!
  DeliveryOption,           // This is a type!
} from './schema';
```

**How to Verify:**
```bash
# Check for type imports without 'type' keyword
grep -r "import {.*[A-Z].*Props.*}" app/features/new-feature/ | grep -v "type"
grep -r "import {.*Interface.*}" app/features/new-feature/ | grep -v "type"
grep -r "import {.*Type.*}" app/features/new-feature/ | grep -v "type"

# Check for proper type exports
grep -r "export {.*Props" app/features/new-feature/ | grep -v "export type"
grep -r "export type {" app/features/new-feature/

# Verify bundle doesn't include type imports
npm run build
grep "TypeScript.*interface" dist/  # Should not exist
```

**Expected Result:**
- All type-only imports use `import type` or inline `type` keyword
- Type exports use `export type { ... }`
- Built bundle doesn't contain type definitions
- Smaller bundle size due to removed type imports

**Performance Impact:**
- Using `import type` reduces bundle size by 1-5% on average
- Faster build times due to clearer import intentions
- Better tree-shaking by bundler

---

### 3. Optional Chaining and Nullish Coalescing

**Requirement:** Code must use optional chaining (?.) and nullish coalescing (??) operators for safe property access and default values.

**Verification Steps:**

✅ **Check optional chaining for nested properties:**
```typescript
// ✅ Correct - optional chaining
const isValidReviewSummary =
  (reviewSummaryHighlights?.length ?? 0) > 0 ||
  (reviewSummaryParagraph?.length ?? 0) > 0;

const userName = user?.profile?.name;
const firstItem = items?.[0]?.value;

// ❌ Incorrect - manual null checks
const isValidReviewSummary =
  (reviewSummaryHighlights && reviewSummaryHighlights.length ? reviewSummaryHighlights.length : 0) > 0 ||
  (reviewSummaryParagraph && reviewSummaryParagraph.length ? reviewSummaryParagraph.length : 0) > 0;

const userName = user && user.profile && user.profile.name;
const firstItem = items && items[0] && items[0].value;
```

✅ **Check nullish coalescing for default values:**
```typescript
// ✅ Correct - nullish coalescing (??)
const maxValue = props.maxValue ?? 10;
const items = data?.items ?? [];
const count = response?.count ?? 0;

// ❌ Incorrect - using || (fails for falsy values like 0, '')
const maxValue = props.maxValue || 10;  // 0 becomes 10!
const items = data?.items || [];
const count = response?.count || 0;     // 0 is preserved by ?? but not ||

// ❌ Incorrect - ternary for simple defaults
const maxValue = props.maxValue !== undefined ? props.maxValue : 10;
```

✅ **Check optional chaining with function calls:**
```typescript
// ✅ Correct - optional function call
const result = onSubmit?.(formData);
const value = getData?.()?.value;

// ❌ Incorrect - manual function check
const result = onSubmit ? onSubmit(formData) : undefined;
const value = getData ? getData().value : undefined;
```

✅ **Check safe array access:**
```typescript
// ✅ Correct - safe array operations
const firstDelivery = deliveryOptions?.[0];
const lastItem = items?.[items.length - 1];
const hasItems = items?.length ?? 0 > 0;

// ❌ Incorrect - unsafe array access
const firstDelivery = deliveryOptions[0];  // Crashes if null!
const lastItem = items[items.length - 1];
const hasItems = items.length > 0;
```

✅ **Understand the difference between ?? and ||:**
```typescript
// ?? returns right side only for null/undefined
const value = config.retries ?? 3;
// If retries = 0, value = 0 ✅
// If retries = null, value = 3 ✅

// || returns right side for any falsy value
const value = config.retries || 3;
// If retries = 0, value = 3 ❌ (Wrong! We wanted 0)
// If retries = null, value = 3 ✅

// Real-world example
const allowRetries = settings.allowRetries ?? true;  // ✅ false is preserved
const allowRetries = settings.allowRetries || true;  // ❌ false becomes true!
```

**How to Verify:**
```bash
# Check for manual null checks (should use ?. instead)
grep -r "if (.*&&.*\\.)" app/features/new-feature/
grep -r " ? .*\. : undefined" app/features/new-feature/

# Check for || used instead of ?? for defaults
grep -r "|| \[" app/features/new-feature/
grep -r "|| {" app/features/new-feature/
grep -r "|| 0" app/features/new-feature/

# Verify optional chaining is used
grep -r "\\?\\." app/features/new-feature/
grep -r "\\?\\?" app/features/new-feature/
```

**Expected Result:**
- Optional chaining (?.) used for all potentially null/undefined property access
- Nullish coalescing (??) used for default values (not ||)
- No verbose manual null checks
- Safer code with fewer runtime errors

**Common Patterns:**

```typescript
// API responses
const data = response?.data?.items ?? [];
const error = response?.error?.message ?? 'Unknown error';

// React Query results
const deliveryOptions = queryResult?.data?.options ?? [];
const isLoading = queryResult?.isLoading ?? false;

// User-provided props with defaults
const minValue = props.minValue ?? 0;
const maxValue = props.maxValue ?? 10;
const onSubmit = props.onSubmit ?? (() => {});

// Nested object access
const userId = user?.profile?.id;
const addressLine1 = user?.addresses?.[0]?.line1;
const hasPermission = user?.permissions?.includes('admin') ?? false;
```

---

### 4. Const Assertions for Literal Types

**Requirement:** Constant objects and arrays must use 'as const' to create literal types for better type safety and autocomplete.

**Verification Steps:**

✅ **Check const assertions for constant objects:**
```typescript
// ✅ Correct - const assertion creates literal types
export const CHAT_INTENTS = {
  FACTOR_FORM: 'factor_form',
  AGENT: 'agent',
} as const;

export type ChatIntent = typeof CHAT_INTENTS[keyof typeof CHAT_INTENTS];
// Type: 'factor_form' | 'agent' (not string)

// ❌ Incorrect - no const assertion (widened to string)
export const CHAT_INTENTS = {
  FACTOR_FORM: 'factor_form',
  AGENT: 'agent',
};

export type ChatIntent = typeof CHAT_INTENTS[keyof typeof CHAT_INTENTS];
// Type: string (too broad, loses precision)
```

✅ **Check const assertions for configuration objects:**
```typescript
// ✅ Correct - readonly configuration
export const API_ENDPOINTS = {
  USERS: '/api/users',
  PRODUCTS: '/api/products',
  ORDERS: '/api/orders',
} as const;

type Endpoint = typeof API_ENDPOINTS[keyof typeof API_ENDPOINTS];
// Type: '/api/users' | '/api/products' | '/api/orders'

// ✅ Correct - status constants
export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
} as const;

export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];

// ❌ Incorrect - mutable object (can be changed)
export const API_ENDPOINTS = {
  USERS: '/api/users',
  PRODUCTS: '/api/products',
};
// Someone can do: API_ENDPOINTS.USERS = '/wrong/path'
```

✅ **Check const assertions for arrays:**
```typescript
// ✅ Correct - readonly tuple type
const RATING_OPTIONS = [1, 2, 3, 4, 5] as const;
type RatingOption = typeof RATING_OPTIONS[number];
// Type: 1 | 2 | 3 | 4 | 5

// ✅ Correct - readonly string array
const SUPPORTED_LOCALES = ['en-US', 'en-GB', 'de-DE', 'fr-FR'] as const;
type Locale = typeof SUPPORTED_LOCALES[number];
// Type: 'en-US' | 'en-GB' | 'de-DE' | 'fr-FR'

// ❌ Incorrect - mutable array (widened to string[])
const SUPPORTED_LOCALES = ['en-US', 'en-GB', 'de-DE', 'fr-FR'];
type Locale = typeof SUPPORTED_LOCALES[number];
// Type: string (too broad)
```

✅ **Check const assertions in function returns:**
```typescript
// ✅ Correct - const assertion for return value
function getButtonConfig() {
  return {
    variant: 'primary',
    size: 'md',
    disabled: false,
  } as const;
}

type ButtonConfig = ReturnType<typeof getButtonConfig>;
// Type: { readonly variant: 'primary', readonly size: 'md', readonly disabled: false }

// ❌ Incorrect - mutable return type
function getButtonConfig() {
  return {
    variant: 'primary',
    size: 'md',
    disabled: false,
  };
}

type ButtonConfig = ReturnType<typeof getButtonConfig>;
// Type: { variant: string, size: string, disabled: boolean }
```

✅ **Check discriminated unions with const:**
```typescript
// ✅ Correct - discriminated union with const
const ACTIONS = {
  ADD_ITEM: { type: 'ADD_ITEM' },
  REMOVE_ITEM: { type: 'REMOVE_ITEM' },
  UPDATE_QUANTITY: { type: 'UPDATE_QUANTITY' },
} as const;

type ActionType = typeof ACTIONS[keyof typeof ACTIONS]['type'];
// Type: 'ADD_ITEM' | 'REMOVE_ITEM' | 'UPDATE_QUANTITY'

// ❌ Incorrect - loses discriminant precision
const ACTIONS = {
  ADD_ITEM: { type: 'ADD_ITEM' },
  REMOVE_ITEM: { type: 'REMOVE_ITEM' },
};
// Type of type property: string (not useful for discriminated unions)
```

**How to Verify:**
```bash
# Check for const objects without 'as const'
grep -r "export const.*= {" app/features/new-feature/ | grep -v "as const"

# Check for constant arrays that should use 'as const'
grep -r "export const.*= \[" app/features/new-feature/ | grep -v "as const"

# Verify const assertions exist
grep -r "as const" app/features/new-feature/
```

**Expected Result:**
- All constant configuration objects use `as const`
- All constant arrays use `as const`
- Type extraction using `typeof` and `keyof`
- Better autocomplete and type checking

**Benefits:**

```typescript
// Without 'as const':
const STATUS = { ACTIVE: 'active', INACTIVE: 'inactive' };
function setStatus(status: string) { }  // Accepts any string
setStatus('wrong_status');  // No error! ❌

// With 'as const':
const STATUS = { ACTIVE: 'active', INACTIVE: 'inactive' } as const;
type Status = typeof STATUS[keyof typeof STATUS];
function setStatus(status: Status) { }  // Only accepts 'active' | 'inactive'
setStatus('wrong_status');  // TypeScript error! ✅
setStatus(STATUS.ACTIVE);   // Works! ✅
```

**Common Patterns:**

```typescript
// Feature flags
export const FEATURE_FLAGS = {
  NEW_CHECKOUT: 'new_checkout',
  REDESIGNED_CART: 'redesigned_cart',
  DARK_MODE: 'dark_mode',
} as const;

// HTTP methods
export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
} as const;

// Query keys (React Query)
export const QUERY_KEYS = {
  USERS: 'users',
  PRODUCTS: 'products',
  CART: 'cart',
} as const;

// Route paths
export const ROUTES = {
  HOME: '/',
  PRODUCTS: '/products',
  CART: '/cart',
  CHECKOUT: '/checkout',
} as const;
```

---

### 5. Generic Types for Reusable Components

**Requirement:** Reusable components and utilities must use TypeScript generics for type-safe flexibility.

**Verification Steps:**

✅ **Check generic components:**
```typescript
// ✅ Correct - generic list component
interface ListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
}

function List<T>({ items, renderItem, keyExtractor, emptyMessage }: ListProps<T>) {
  if (items.length === 0) {
    return <Text>{emptyMessage ?? 'No items'}</Text>;
  }

  return (
    <Box>
      {items.map((item) => (
        <Box key={keyExtractor(item)}>
          {renderItem(item)}
        </Box>
      ))}
    </Box>
  );
}

// Usage with full type safety
<List<Product>
  items={products}
  renderItem={(product) => <ProductCard product={product} />}
  keyExtractor={(product) => product.id}
/>

// ❌ Incorrect - using 'any' instead of generics
interface ListProps {
  items: any[];
  renderItem: (item: any) => React.ReactNode;
}
```

✅ **Check generic API response types:**
```typescript
// ✅ Correct - generic API response wrapper
interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
  timestamp: Date;
}

interface ApiError {
  error: string;
  code: string;
}

type ApiResult<T> = ApiResponse<T> | ApiError;

// Usage
async function fetchUser(id: string): Promise<ApiResult<User>> {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}

async function fetchProducts(): Promise<ApiResult<Product[]>> {
  const response = await fetch('/api/products');
  return response.json();
}

// ❌ Incorrect - duplicating response structure
interface UserResponse {
  data: User;
  status: number;
  message: string;
}

interface ProductResponse {
  data: Product[];
  status: number;
  message: string;
}
```

✅ **Check generic hooks:**
```typescript
// ✅ Correct - generic form hook
interface UseFormOptions<T> {
  initialValues: T;
  validate?: (values: T) => Partial<Record<keyof T, string>>;
  onSubmit: (values: T) => void | Promise<void>;
}

function useForm<T extends Record<string, any>>({
  initialValues,
  validate,
  onSubmit,
}: UseFormOptions<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

  const handleChange = <K extends keyof T>(field: K, value: T[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  return { values, errors, handleChange, handleSubmit };
}

// Usage with type safety
interface LoginForm {
  email: string;
  password: string;
}

const { values, handleChange } = useForm<LoginForm>({
  initialValues: { email: '', password: '' },
  onSubmit: async (data) => {
    // data is typed as LoginForm
  },
});

// handleChange is fully typed
handleChange('email', 'test@example.com');  // ✅
handleChange('email', 123);                  // ❌ TypeScript error
handleChange('invalid', 'value');            // ❌ TypeScript error

// ❌ Incorrect - no generics
function useForm(initialValues: any) {
  // No type safety
}
```

✅ **Check generic utility types:**
```typescript
// ✅ Correct - generic utility functions
function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach((key) => {
    result[key] = obj[key];
  });
  return result;
}

function omit<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj };
  keys.forEach((key) => {
    delete result[key];
  });
  return result;
}

// Usage
interface User {
  id: string;
  name: string;
  email: string;
  password: string;
}

const publicUser = omit(user, ['password']);
// Type: { id: string; name: string; email: string }

const nameAndEmail = pick(user, ['name', 'email']);
// Type: { name: string; email: string }

// ❌ Incorrect - returning 'any'
function pick(obj: any, keys: string[]): any {
  // Lost all type information
}
```

✅ **Check generic context providers:**
```typescript
// ✅ Correct - generic context with type safety
interface StoreContext<T> {
  state: T;
  setState: (updates: Partial<T>) => void;
  reset: () => void;
}

function createStoreContext<T>(initialState: T) {
  const Context = createContext<StoreContext<T> | undefined>(undefined);

  const Provider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, setState] = useState<T>(initialState);

    const updateState = (updates: Partial<T>) => {
      setState((prev) => ({ ...prev, ...updates }));
    };

    const reset = () => setState(initialState);

    return (
      <Context.Provider value={{ state, setState: updateState, reset }}>
        {children}
      </Context.Provider>
    );
  };

  const useStore = () => {
    const context = useContext(Context);
    if (!context) {
      throw new Error('useStore must be used within Provider');
    }
    return context;
  };

  return { Provider, useStore };
}

// Usage with full type safety
interface CartState {
  items: CartItem[];
  total: number;
}

const { Provider: CartProvider, useStore: useCart } = createStoreContext<CartState>({
  items: [],
  total: 0,
});

// In component
const { state, setState } = useCart();
setState({ items: newItems });  // ✅ Fully typed
setState({ invalid: 'field' });  // ❌ TypeScript error
```

✅ **Check constrained generics:**
```typescript
// ✅ Correct - generic with constraints
interface HasId {
  id: string;
}

function findById<T extends HasId>(items: T[], id: string): T | undefined {
  return items.find((item) => item.id === id);
}

// Works with any type that has an 'id' field
const user = findById(users, 'user-123');
const product = findById(products, 'prod-456');

// ❌ Incorrect - trying to use without constraint
function findById<T>(items: T[], id: string): T | undefined {
  return items.find((item) => item.id === id);  // Error: T doesn't have 'id'
}
```

**How to Verify:**
```bash
# Check for generic type usage
grep -r "interface.*<T>" app/features/new-feature/
grep -r "function.*<T" app/features/new-feature/
grep -r "React.FC<.*<" app/features/new-feature/

# Check for 'any' usage (should often be generics)
grep -r ": any\[\]" app/features/new-feature/
grep -r "items: any" app/features/new-feature/

# Verify generic constraints
grep -r "<T extends" app/features/new-feature/
```

**Expected Result:**
- Reusable components use generics for type parameters
- API response wrappers use generic types
- Custom hooks use generics for flexibility
- Utility functions use generics with constraints
- No use of `any` where generics would be appropriate

**Benefits:**
- Type safety across different data types
- Better autocomplete and IntelliSense
- Catch errors at compile time
- Self-documenting code
- Easier refactoring

---

## Testing Verification

### Type Checking Tests

```typescript
describe('TypeScript Type Safety', () => {
  it('should have explicit prop types', () => {
    // This test ensures TypeScript compilation catches type errors
    interface TestProps {
      value: number;
      onUpdate: (value: number) => void;
    }

    const TestComponent: React.FC<TestProps> = ({ value, onUpdate }) => {
      return <div onClick={() => onUpdate(value)} />;
    };

    // @ts-expect-error - Should error on missing required props
    render(<TestComponent />);

    // @ts-expect-error - Should error on wrong prop type
    render(<TestComponent value="string" onUpdate={() => {}} />);
  });

  it('should enforce type-only imports', () => {
    // Build-time check - type imports should not be in bundle
    // This is verified by bundler, not runtime test
  });

  it('should handle null safely with optional chaining', () => {
    const data: { user?: { name?: string } } = {};

    // Should not crash
    const name = data.user?.name;
    expect(name).toBeUndefined();

    // With nullish coalescing
    const displayName = data.user?.name ?? 'Anonymous';
    expect(displayName).toBe('Anonymous');
  });

  it('should use const assertions for literal types', () => {
    const STATUS = {
      ACTIVE: 'active',
      INACTIVE: 'inactive',
    } as const;

    type Status = typeof STATUS[keyof typeof STATUS];

    // Function only accepts literal types
    function setStatus(status: Status) {
      return status;
    }

    expect(setStatus(STATUS.ACTIVE)).toBe('active');

    // @ts-expect-error - Should error on invalid literal
    setStatus('invalid');
  });

  it('should support generic components', () => {
    interface Item {
      id: string;
      name: string;
    }

    interface ListProps<T> {
      items: T[];
      renderItem: (item: T) => ReactNode;
    }

    function List<T>({ items, renderItem }: ListProps<T>) {
      return <>{items.map(renderItem)}</>;
    }

    const items: Item[] = [{ id: '1', name: 'Test' }];

    const { container } = render(
      <List<Item>
        items={items}
        renderItem={(item) => <div key={item.id}>{item.name}</div>}
      />
    );

    expect(container.textContent).toBe('Test');
  });
});
```

### TypeScript Compiler Tests

```bash
# Run TypeScript compiler in check mode
npx tsc --noEmit

# Check for type errors in specific feature
npx tsc --noEmit --project tsconfig.json | grep "features/new-feature"

# Verify strict mode is enabled
npx tsc --showConfig | grep -A 5 "compilerOptions"
```

Expected output:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictPropertyInitialization": true
  }
}
```

---

## Common Issues and Fixes

### Issue 1: Implicit Any Types

**Problem:**
```typescript
const MyComponent = ({ data }) => {
  return <div>{data.title}</div>;
};
```

**Fix:**
```typescript
interface MyComponentProps {
  data: {
    title: string;
  };
}

const MyComponent: React.FC<MyComponentProps> = ({ data }) => {
  return <div>{data.title}</div>;
};
```

---

### Issue 2: Type Imports as Values

**Problem:**
```typescript
import { User, Product } from '@/types';  // Both are types

function processUser(user: User) { }
function processProduct(product: Product) { }
```

**Fix:**
```typescript
import type { User, Product } from '@/types';

function processUser(user: User) { }
function processProduct(product: Product) { }
```

---

### Issue 3: Missing Optional Chaining

**Problem:**
```typescript
const userName = user && user.profile && user.profile.name;

if (data && data.items && data.items.length > 0) {
  // ...
}
```

**Fix:**
```typescript
const userName = user?.profile?.name;

if ((data?.items?.length ?? 0) > 0) {
  // ...
}
```

---

### Issue 4: Using || Instead of ??

**Problem:**
```typescript
const port = config.port || 3000;  // 0 becomes 3000!
const retries = options.retries || 3;  // 0 becomes 3!
const enabled = settings.enabled || true;  // false becomes true!
```

**Fix:**
```typescript
const port = config.port ?? 3000;  // 0 stays 0
const retries = options.retries ?? 3;  // 0 stays 0
const enabled = settings.enabled ?? true;  // false stays false
```

---

### Issue 5: Missing Const Assertions

**Problem:**
```typescript
export const ROUTES = {
  HOME: '/',
  PRODUCTS: '/products',
};

type Route = typeof ROUTES[keyof typeof ROUTES];
// Type: string (too broad!)
```

**Fix:**
```typescript
export const ROUTES = {
  HOME: '/',
  PRODUCTS: '/products',
} as const;

type Route = typeof ROUTES[keyof typeof ROUTES];
// Type: '/' | '/products' (precise!)
```

---

### Issue 6: Not Using Generics

**Problem:**
```typescript
interface ListProps {
  items: any[];
  renderItem: (item: any) => ReactNode;
}

function List({ items, renderItem }: ListProps) {
  return <>{items.map(renderItem)}</>;
}

// No type safety
<List items={products} renderItem={(item) => <div>{item.name}</div>} />
// 'item' is typed as 'any'
```

**Fix:**
```typescript
interface ListProps<T> {
  items: T[];
  renderItem: (item: T) => ReactNode;
}

function List<T>({ items, renderItem }: ListProps<T>) {
  return <>{items.map(renderItem)}</>;
}

// Full type safety
<List<Product>
  items={products}
  renderItem={(item) => <div>{item.name}</div>}
/>
// 'item' is typed as 'Product', autocomplete works!
```

---

### Issue 7: Loose Function Types

**Problem:**
```typescript
interface ComponentProps {
  onChange: Function;  // Too loose!
  onSubmit: any;       // Even worse!
}
```

**Fix:**
```typescript
interface ComponentProps {
  onChange: (value: string) => void;
  onSubmit: (data: FormData) => Promise<void>;
}
```

---

## Verification Summary

**Before marking implementation as complete, verify:**

- [ ] All components have explicit prop types (interface or type alias)
- [ ] All props use React.FC<PropsType> annotation
- [ ] All type imports use 'import type' or inline 'type' keyword
- [ ] Type exports use 'export type { ... }'
- [ ] Optional chaining (?.) used for all potentially null/undefined access
- [ ] Nullish coalescing (??) used for default values (not ||)
- [ ] Const assertions (as const) used for constant objects and arrays
- [ ] Generic types used for reusable components and utilities
- [ ] No implicit 'any' types (check with tsc --noEmit)
- [ ] TypeScript strict mode enabled in tsconfig.json
- [ ] No usage of 'Function' type (use explicit signatures)
- [ ] Callback types have explicit signatures

**TypeScript Configuration Check:**

```bash
# Verify strict mode settings
cat tsconfig.json | grep -A 10 '"compilerOptions"'
```

Expected:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictPropertyInitialization": true,
    "noUncheckedIndexedAccess": true
  }
}
```

**Related Verifiers:**
- **react-component-architecture.md** - Component structure verification
- **data-access-layer.md** - API type definitions
- **testing-practices.md** - Test type safety
- **import-organization.md** - Import patterns including type imports
