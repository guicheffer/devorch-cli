---
domain: data-access-layer
description: Verify correct data access patterns, React Query usage, typed schemas, and API integration patterns
---

# Data Access Layer Verification

Verify that implementation follows proper data access patterns with TypeScript schemas, React Query hooks, and clean separation between API logic and UI components.

## Verification Checklist

### 1. Data-Access Module Organization

**Requirement:** All API integrations must be organized in `@/data-access/*` modules with proper structure and exports.

**Verification Steps:**

✅ **Check module structure:**
```typescript
// ✅ Required structure
app/data-access/voucher/
  ├── index.ts                 // Public API exports
  ├── schema.ts                // Zod schemas and types
  ├── useVoucherInfo.ts        // React Query hooks
  └── api.ts                   // Raw API calls

// ❌ Incorrect - API logic in component files
app/features/checkout/
  └── components/
      └── VoucherSection.tsx   // Contains fetch() calls
```

✅ **Check index.ts exports hooks and types:**
```typescript
// ✅ Correct - barrel exports
// File: app/data-access/voucher/index.ts
export { useVoucherInfo } from './useVoucherInfo';
export { useApplyVoucher } from './useApplyVoucher';

export type {
  VoucherInfoResult,
  VoucherError,
  ApplyVoucherParams,
} from './schema';

// ❌ Incorrect - no barrel exports
// Components import directly from internal files
import { useVoucherInfo } from '@/data-access/voucher/useVoucherInfo';
```

✅ **Check separation of concerns:**
```typescript
// ✅ Correct - API logic separate from UI
// File: app/data-access/delivery-options/api.ts
export const fetchDeliveryOptions = async (
  params: GetDeliveryOptionsParams
): Promise<DeliveryOptionsResult> => {
  const response = await fetch(`/api/delivery-options`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return deliveryOptionsSchema.parse(await response.json());
};

// File: app/data-access/delivery-options/useDeliveryOptions.ts
export const useDeliveryOptions = (
  params: GetDeliveryOptionsParams,
  options?: UseQueryOptions
) => {
  return useQuery(
    ['deliveryOptions', params],
    () => fetchDeliveryOptions(params),
    options
  );
};

// ❌ Incorrect - fetch in component
const MyComponent = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/delivery-options')
      .then(res => res.json())
      .then(setData);
  }, []);
};
```

**How to Verify:**
```bash
# Check data-access module structure
ls -la app/data-access/*/

# Verify no fetch/API calls in components
grep -r "fetch(" app/features/
grep -r "axios(" app/features/
grep -r "useEffect.*fetch" app/features/

# Verify barrel exports exist
find app/data-access -name "index.ts" -exec echo {} \; -exec cat {} \;
```

**Expected Result:**
- Each data-access module has index.ts with exports
- No fetch/axios calls in component files
- Clean separation between API and UI layers

---

### 2. TypeScript Schemas with Zod

**Requirement:** All data-access modules must define TypeScript schemas using Zod for runtime validation.

**Verification Steps:**

✅ **Check Zod schema definitions:**
```typescript
// ✅ Correct - Zod schemas with validation
// File: app/data-access/voucher/schema.ts
import { z } from 'zod';

export const voucherInfoSchema = z.object({
  code: z.string(),
  discount: z.number().positive(),
  type: z.enum(['percentage', 'fixed_amount', 'free_shipping']),
  expiresAt: z.string().datetime().optional(),
  restrictions: z.object({
    minOrderValue: z.number().optional(),
    maxUses: z.number().optional(),
  }).optional(),
});

export type VoucherInfo = z.infer<typeof voucherInfoSchema>;

export const voucherErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
});

export type VoucherError = z.infer<typeof voucherErrorSchema>;

// ❌ Incorrect - plain TypeScript interfaces without validation
export interface VoucherInfo {
  code: string;
  discount: number;
  type: string;
  expiresAt?: string;
}
```

✅ **Check schema parsing in API calls:**
```typescript
// ✅ Correct - parse API response with schema
export const fetchVoucherInfo = async (code: string): Promise<VoucherInfo> => {
  const response = await fetch(`/api/voucher/${code}`);
  const data = await response.json();
  return voucherInfoSchema.parse(data); // Runtime validation
};

// ❌ Incorrect - no validation
export const fetchVoucherInfo = async (code: string): Promise<VoucherInfo> => {
  const response = await fetch(`/api/voucher/${code}`);
  return await response.json() as VoucherInfo; // No validation!
};
```

✅ **Check enum types are defined:**
```typescript
// ✅ Correct - enum in schema
export const deliveryStatusSchema = z.enum([
  'pending',
  'confirmed',
  'in_transit',
  'delivered',
  'cancelled',
]);

export const DeliveryStatus = deliveryStatusSchema.enum;
export type DeliveryStatus = z.infer<typeof deliveryStatusSchema>;

// Usage in components
if (status === DeliveryStatus.pending) { ... }

// ❌ Incorrect - string literals everywhere
if (status === 'pending') { ... }
```

**How to Verify:**
```bash
# Check for Zod schemas in data-access modules
grep -r "z.object\|z.enum\|z.array" app/data-access/

# Verify schema.parse() is used
grep -r ".parse(" app/data-access/

# Check for unsafe type assertions
grep -r "as.*Type" app/data-access/  # Should be minimal

# Verify z.infer usage
grep -r "z.infer<typeof" app/data-access/
```

**Expected Result:**
- All data-access modules have schema.ts with Zod definitions
- API responses are parsed with `.parse()` or `.safeParse()`
- Types are inferred from schemas using `z.infer<typeof>`
- No unsafe `as Type` assertions without validation

---

### 3. Type Exports from Data-Access Modules

**Requirement:** Data-access modules must export both hooks and types using proper TypeScript export syntax.

**Verification Steps:**

✅ **Check type-only exports:**
```typescript
// ✅ Correct - separate type exports
// File: app/data-access/delivery-options/index.ts
export { useDeliveryOptionsByPostcode } from './useDeliveryOptions';
export { useUpdateDeliveryDate } from './useUpdateDeliveryDate';

export { DeliveryOptionStatusType } from './schema';

export type {
  DeliveryOptionsWithDate,
  DeliveryOption,
  DeliveryDate,
  GetDeliveryOptionsByPostcodeParams,
} from './schema';

// ❌ Incorrect - mixed exports
export {
  useDeliveryOptionsByPostcode,
  DeliveryOptionsWithDate,  // Type exported as value
  DeliveryOption,
} from './schema';
```

✅ **Check type imports in components:**
```typescript
// ✅ Correct - type-only import
import { useVoucherInfo } from '@/data-access/voucher';
import type { VoucherInfoResult } from '@/data-access/voucher';

const MyComponent = () => {
  const { data } = useVoucherInfo(code);
  const handleData = (result: VoucherInfoResult) => { ... };
};

// ✅ Also correct - inline type keyword
import { useVoucherInfo, type VoucherInfoResult } from '@/data-access/voucher';

// ❌ Incorrect - value import for types
import { VoucherInfoResult } from '@/data-access/voucher';
```

✅ **Check enum exports:**
```typescript
// ✅ Correct - enum as both type and value
// File: app/data-access/delivery-options/schema.ts
export enum DeliveryOptionStatusType {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  DELIVERED = 'delivered',
}

// File: app/data-access/delivery-options/index.ts
export { DeliveryOptionStatusType } from './schema';
export type { DeliveryOptionsWithDate } from './schema';

// Usage - enum can be used as both type and value
const status: DeliveryOptionStatusType = DeliveryOptionStatusType.PENDING;
```

**How to Verify:**
```bash
# Check for proper type exports
grep -r "export type {" app/data-access/

# Verify type-only imports in components
grep -r "import type {" app/features/
grep -r "import.*type.*from '@/data-access" app/features/

# Check for incorrect value exports of types
grep -r "export { .*Type.*}" app/data-access/*/index.ts
```

**Expected Result:**
- Types exported using `export type { ... }`
- Components use `import type { ... }` for type-only imports
- Enums exported as values (can be used at runtime)
- No mixed exports of types and values

---

### 4. React Query Hooks with Options

**Requirement:** Data-fetching hooks must accept React Query options as parameters and pass them to useQuery/useMutation.

**Verification Steps:**

✅ **Check hook signature accepts options:**
```typescript
// ✅ Correct - accepts React Query options
import { useQuery, UseQueryOptions } from 'react-query';

export const useVoucherInfo = (
  couponCode: string,
  options?: UseQueryOptions<VoucherInfoResult, VoucherError>
) => {
  return useQuery<VoucherInfoResult, VoucherError>(
    ['voucher', couponCode],
    () => fetchVoucherInfo(couponCode),
    {
      suspense: false,
      ...options,  // Spread user options
    }
  );
};

// ❌ Incorrect - no options parameter
export const useVoucherInfo = (couponCode: string) => {
  return useQuery(
    ['voucher', couponCode],
    () => fetchVoucherInfo(couponCode)
  );
};
```

✅ **Check common options are supported:**
```typescript
// ✅ Correct - supports all React Query options
const { data, isLoading, error } = useVoucherInfo(code, {
  suspense: false,           // Suspense mode
  enabled: !!code,           // Conditional fetching
  staleTime: 5 * 60 * 1000, // Cache duration
  retry: 3,                  // Retry failed requests
  onSuccess: (data) => {     // Success callback
    console.log('Voucher loaded', data);
  },
  onError: (error) => {      // Error callback
    setHasError(true);
  },
});

// ❌ Incorrect - hardcoded options, can't customize
export const useVoucherInfo = (couponCode: string) => {
  return useQuery(
    ['voucher', couponCode],
    () => fetchVoucherInfo(couponCode),
    {
      suspense: false,  // Always false, can't change
      enabled: true,    // Always enabled, can't disable
    }
  );
};
```

✅ **Check mutations accept options:**
```typescript
// ✅ Correct - mutation with options
import { useMutation, UseMutationOptions } from 'react-query';

export const useApplyVoucher = (
  options?: UseMutationOptions<ApplyVoucherResult, VoucherError, string>
) => {
  return useMutation<ApplyVoucherResult, VoucherError, string>(
    (code: string) => applyVoucher(code),
    options
  );
};

// Usage
const mutation = useApplyVoucher({
  onSuccess: (data) => {
    toast.success('Voucher applied!');
  },
  onError: (error) => {
    toast.error(error.message);
  },
});
```

**How to Verify:**
```bash
# Check hooks accept options parameter
grep -r "UseQueryOptions\|UseMutationOptions" app/data-access/

# Verify options are spread into useQuery
grep -r "...options" app/data-access/

# Check for hardcoded options (potential issue)
grep -r "useQuery.*{$" -A 5 app/data-access/
```

**Expected Result:**
- All data hooks accept `options` parameter
- Options are typed with UseQueryOptions/UseMutationOptions
- User options are spread into useQuery/useMutation
- No hardcoded options that prevent customization

---

### 5. Conditional Data Fetching with enabled Option

**Requirement:** Data fetching must be conditionally enabled based on required parameters being present.

**Verification Steps:**

✅ **Check enabled option for required params:**
```typescript
// ✅ Correct - fetch only when couponCode exists
const { data: voucherData } = useVoucherInfo(
  couponCode,
  {
    suspense: false,
    enabled: !!couponCode,  // Only fetch if code is present
    onError: () => {
      setHasError(true);
    },
  }
);

// ✅ Correct - multiple conditions
const { data: pricingData } = useGetPricePresentation(
  { productSku, price, couponCode },
  {
    suspense: false,
    enabled: !!productSku && !!couponCode,  // Both required
  }
);

// ❌ Incorrect - fetches even with null/undefined params
const { data: voucherData } = useVoucherInfo(couponCode);  // Fetches with undefined!
```

✅ **Check dependent queries:**
```typescript
// ✅ Correct - second query depends on first
const { data: user } = useUser(userId, {
  enabled: !!userId,
});

const { data: preferences } = useUserPreferences(
  user?.id,
  {
    enabled: !!user?.id,  // Only fetch after user is loaded
  }
);

// ❌ Incorrect - race condition
const { data: user } = useUser(userId);
const { data: preferences } = useUserPreferences(user?.id);  // May fetch before user loads
```

✅ **Check disabled queries don't cause errors:**
```typescript
// ✅ Correct - graceful handling when disabled
const { data, isLoading } = useVoucherInfo(
  couponCode,
  { enabled: !!couponCode }
);

if (!couponCode) {
  return <Text>Enter a coupon code</Text>;
}

if (isLoading) {
  return <Spinner />;
}

return <VoucherDisplay data={data} />;

// ❌ Incorrect - no null check, may render undefined data
const { data } = useVoucherInfo(couponCode);
return <VoucherDisplay data={data} />;  // data may be undefined!
```

**How to Verify:**
```bash
# Check for enabled option usage
grep -r "enabled:" app/features/ app/spaces/

# Check for conditional expressions in enabled
grep -r "enabled: !!" app/features/ app/spaces/
grep -r "enabled:.*&&" app/features/ app/spaces/

# Verify queries with nullable params have enabled
grep -r "useQuery.*\?" -A 5 app/data-access/
```

**Expected Result:**
- All queries with optional/nullable params use `enabled` option
- Conditional logic uses boolean coercion (`!!`) or explicit checks
- Dependent queries wait for previous data to load
- Components handle loading and undefined states gracefully

---

### 6. Query Keys Best Practices

**Requirement:** Query keys must be consistent, typed, and include all parameters that affect the query result.

**Verification Steps:**

✅ **Check query key structure:**
```typescript
// ✅ Correct - includes all relevant params
export const useDeliveryOptions = (
  postcode: string,
  date: string,
  options?: UseQueryOptions
) => {
  return useQuery(
    ['deliveryOptions', postcode, date],  // All params in key
    () => fetchDeliveryOptions(postcode, date),
    options
  );
};

// ❌ Incorrect - missing parameters
export const useDeliveryOptions = (
  postcode: string,
  date: string,
  options?: UseQueryOptions
) => {
  return useQuery(
    ['deliveryOptions'],  // Missing postcode and date!
    () => fetchDeliveryOptions(postcode, date),
    options
  );
};
```

✅ **Check query key factories:**
```typescript
// ✅ Correct - centralized query keys
// File: app/data-access/voucher/keys.ts
export const voucherKeys = {
  all: ['voucher'] as const,
  lists: () => [...voucherKeys.all, 'list'] as const,
  list: (filters: VoucherFilters) =>
    [...voucherKeys.lists(), filters] as const,
  details: () => [...voucherKeys.all, 'detail'] as const,
  detail: (code: string) =>
    [...voucherKeys.details(), code] as const,
};

// Usage
useQuery(voucherKeys.detail(code), () => fetchVoucher(code));

// ❌ Incorrect - hardcoded keys everywhere
useQuery(['voucher', code], ...);  // Repeated in many places
useQuery(['voucherInfo', code], ...);  // Inconsistent naming
```

✅ **Check object params are serializable:**
```typescript
// ✅ Correct - plain object in key
const params = { sku: 'ABC123', size: 'M' };
useQuery(['product', params], () => fetchProduct(params));

// ❌ Incorrect - non-serializable object
const component = <MyComponent />;
useQuery(['product', component], ...);  // React elements not serializable!

const fn = () => {};
useQuery(['product', fn], ...);  // Functions not serializable!
```

**How to Verify:**
```bash
# Check for query key factories
find app/data-access -name "keys.ts" -o -name "*Keys.ts"

# Verify query keys include parameters
grep -r "useQuery(" app/data-access/ -A 1

# Check for inconsistent key naming
grep -r "useQuery(\[" app/ | cut -d: -f2 | sort | uniq -c
```

**Expected Result:**
- Query keys include all parameters affecting the result
- Key factories used for complex key management
- Consistent naming across related queries
- All key values are serializable

---

### 7. Error Handling Patterns

**Requirement:** Data-access hooks must handle errors gracefully with typed error responses.

**Verification Steps:**

✅ **Check typed error responses:**
```typescript
// ✅ Correct - typed error in hook signature
export const useVoucherInfo = (
  couponCode: string,
  options?: UseQueryOptions<VoucherInfoResult, VoucherError>
) => {
  return useQuery<VoucherInfoResult, VoucherError>(
    ['voucher', couponCode],
    async () => {
      const response = await fetch(`/api/voucher/${couponCode}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw voucherErrorSchema.parse(errorData);  // Throw typed error
      }
      return voucherInfoSchema.parse(await response.json());
    },
    options
  );
};

// ❌ Incorrect - untyped errors
export const useVoucherInfo = (couponCode: string) => {
  return useQuery(
    ['voucher', couponCode],
    async () => {
      const response = await fetch(`/api/voucher/${couponCode}`);
      if (!response.ok) {
        throw new Error('Failed');  // Generic error
      }
      return await response.json();
    }
  );
};
```

✅ **Check error callbacks in components:**
```typescript
// ✅ Correct - typed error handling
const [hasError, setHasError] = useState(false);
const [errorMessage, setErrorMessage] = useState('');

const { data: voucherData, error } = useVoucherInfo(
  couponCode,
  {
    suspense: false,
    enabled: !!couponCode,
    onError: (error: VoucherError) => {  // Typed error
      setHasError(true);
      setErrorMessage(error.message);
    },
  }
);

// Display error
{hasError && (
  <Text color="shared-alias.negative.foreground.default">
    {errorMessage}
  </Text>
)}

// ❌ Incorrect - unhandled errors
const { data } = useVoucherInfo(couponCode);
// No error handling!
```

✅ **Check error boundary integration:**
```typescript
// ✅ Correct - error boundaries for critical failures
import { ErrorBoundary } from '@/libs/error-boundary';

const OrderSummary = () => {
  const { data } = useOrderData(orderId, { suspense: true });

  return (
    <ErrorBoundary scope="order-summary" fallback={<ErrorFallback />}>
      <OrderDisplay data={data} />
    </ErrorBoundary>
  );
};

// ❌ Incorrect - no error boundary with suspense
const OrderSummary = () => {
  const { data } = useOrderData(orderId, { suspense: true });
  return <OrderDisplay data={data} />;  // No error boundary!
};
```

**How to Verify:**
```bash
# Check for typed errors in hooks
grep -r "UseQueryOptions<.*,.*>" app/data-access/

# Verify error schemas exist
grep -r "errorSchema" app/data-access/

# Check onError usage in components
grep -r "onError:" app/features/ app/spaces/

# Verify error state handling
grep -r "useState.*error\|error.*useState" app/features/
```

**Expected Result:**
- Errors are typed with Zod schemas
- Components handle errors with onError callbacks
- Error state is displayed to users
- Critical errors wrapped in ErrorBoundary

---

### 8. Mutations and Optimistic Updates

**Requirement:** Mutations must handle loading states, errors, and optimistic updates where appropriate.

**Verification Steps:**

✅ **Check mutation hook structure:**
```typescript
// ✅ Correct - mutation hook with types
import { useMutation, UseMutationOptions, useQueryClient } from 'react-query';

export const useApplyVoucher = (
  options?: UseMutationOptions<ApplyVoucherResult, VoucherError, ApplyVoucherParams>
) => {
  const queryClient = useQueryClient();

  return useMutation<ApplyVoucherResult, VoucherError, ApplyVoucherParams>(
    (params: ApplyVoucherParams) => applyVoucher(params),
    {
      onSuccess: (data, variables) => {
        // Invalidate related queries
        queryClient.invalidateQueries(['voucher', variables.code]);
        queryClient.invalidateQueries(['cart']);
      },
      ...options,
    }
  );
};

// ❌ Incorrect - no cache invalidation
export const useApplyVoucher = () => {
  return useMutation((params) => applyVoucher(params));
  // Stale data in cache!
};
```

✅ **Check optimistic updates:**
```typescript
// ✅ Correct - optimistic update with rollback
export const useUpdateDeliveryDate = () => {
  const queryClient = useQueryClient();

  return useMutation(
    (newDate: string) => updateDeliveryDate(newDate),
    {
      onMutate: async (newDate) => {
        // Cancel outgoing queries
        await queryClient.cancelQueries(['deliveryOptions']);

        // Snapshot previous value
        const previous = queryClient.getQueryData(['deliveryOptions']);

        // Optimistically update
        queryClient.setQueryData(['deliveryOptions'], (old: any) => ({
          ...old,
          selectedDate: newDate,
        }));

        return { previous };
      },
      onError: (err, newDate, context) => {
        // Rollback on error
        if (context?.previous) {
          queryClient.setQueryData(['deliveryOptions'], context.previous);
        }
      },
      onSettled: () => {
        // Refetch to ensure sync
        queryClient.invalidateQueries(['deliveryOptions']);
      },
    }
  );
};
```

✅ **Check mutation usage in components:**
```typescript
// ✅ Correct - handles loading and errors
const ApplyVoucherButton = ({ code }: Props) => {
  const mutation = useApplyVoucher({
    onSuccess: () => {
      toast.success('Voucher applied!');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <Button.Primary
      onClick={() => mutation.mutate({ code })}
      disabled={mutation.isLoading}
    >
      {mutation.isLoading ? 'Applying...' : 'Apply Voucher'}
    </Button.Primary>
  );
};

// ❌ Incorrect - no loading state
const ApplyVoucherButton = ({ code }: Props) => {
  const mutation = useApplyVoucher();

  return (
    <Button.Primary onClick={() => mutation.mutate({ code })}>
      Apply Voucher
    </Button.Primary>
  );
  // Button remains clickable during mutation!
};
```

**How to Verify:**
```bash
# Check for mutation hooks
grep -r "useMutation" app/data-access/

# Verify cache invalidation
grep -r "invalidateQueries\|setQueryData" app/data-access/

# Check mutation usage in components
grep -r "\.mutate\|\.mutateAsync" app/features/ app/spaces/

# Verify loading state handling
grep -r "isLoading.*mutation\|mutation.*isLoading" app/features/
```

**Expected Result:**
- Mutations invalidate related queries
- Optimistic updates have rollback logic
- Components show loading states during mutations
- Errors are handled and displayed to users

---

## Testing Verification

### Unit Tests for Data-Access Hooks

```typescript
import { renderHook, waitFor } from '@testing-library/react-hooks';
import { QueryClient, QueryClientProvider } from 'react-query';
import { useVoucherInfo } from './useVoucherInfo';

describe('useVoucherInfo', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  it('should fetch voucher info when code is provided', async () => {
    const { result } = renderHook(
      () => useVoucherInfo('SUMMER20', { enabled: true }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      code: 'SUMMER20',
      discount: 20,
      type: 'percentage',
    });
  });

  it('should not fetch when enabled is false', () => {
    const { result } = renderHook(
      () => useVoucherInfo('SUMMER20', { enabled: false }),
      { wrapper }
    );

    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('should call onError when fetch fails', async () => {
    const onError = jest.fn();

    const { result } = renderHook(
      () => useVoucherInfo('INVALID', { enabled: true, onError }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'INVALID_VOUCHER',
        message: 'Voucher not found',
      })
    );
  });
});
```

### Integration Tests with Mock API

```typescript
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const server = setupServer(
  rest.get('/api/voucher/:code', (req, res, ctx) => {
    const { code } = req.params;

    if (code === 'VALID') {
      return res(
        ctx.json({
          code: 'VALID',
          discount: 10,
          type: 'percentage',
        })
      );
    }

    return res(
      ctx.status(404),
      ctx.json({
        code: 'VOUCHER_NOT_FOUND',
        message: 'Invalid voucher code',
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('VoucherSection Integration', () => {
  it('should display voucher discount when valid code is entered', async () => {
    render(<VoucherSection />);

    const input = screen.getByLabelText('Voucher Code');
    const button = screen.getByRole('button', { name: 'Apply' });

    await userEvent.type(input, 'VALID');
    await userEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('10% discount applied')).toBeInTheDocument();
    });
  });

  it('should display error when invalid code is entered', async () => {
    render(<VoucherSection />);

    const input = screen.getByLabelText('Voucher Code');
    const button = screen.getByRole('button', { name: 'Apply' });

    await userEvent.type(input, 'INVALID');
    await userEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Invalid voucher code')).toBeInTheDocument();
    });
  });
});
```

### Schema Validation Tests

```typescript
import { voucherInfoSchema, voucherErrorSchema } from './schema';

describe('Voucher Schemas', () => {
  describe('voucherInfoSchema', () => {
    it('should validate correct voucher data', () => {
      const validData = {
        code: 'SUMMER20',
        discount: 20,
        type: 'percentage',
      };

      const result = voucherInfoSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid discount values', () => {
      const invalidData = {
        code: 'SUMMER20',
        discount: -10,  // Negative discount
        type: 'percentage',
      };

      const result = voucherInfoSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid voucher types', () => {
      const invalidData = {
        code: 'SUMMER20',
        discount: 20,
        type: 'invalid_type',
      };

      const result = voucherInfoSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
```

---

## Common Issues and Fixes

### Issue 1: Missing enabled Option

**Problem:**
```typescript
const { data } = useVoucherInfo(couponCode);
// Fetches even when couponCode is undefined!
```

**Fix:**
```typescript
const { data } = useVoucherInfo(couponCode, {
  enabled: !!couponCode,
});
```

### Issue 2: Stale Data After Mutation

**Problem:**
```typescript
const mutation = useMutation((code) => applyVoucher(code));
// Cache not updated after mutation!
```

**Fix:**
```typescript
const queryClient = useQueryClient();
const mutation = useMutation(
  (code) => applyVoucher(code),
  {
    onSuccess: () => {
      queryClient.invalidateQueries(['voucher']);
      queryClient.invalidateQueries(['cart']);
    },
  }
);
```

### Issue 3: Untyped Error Responses

**Problem:**
```typescript
const { error } = useVoucherInfo(code);
// error is type unknown, can't access properties
```

**Fix:**
```typescript
// Define error schema
export const voucherErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
});

export type VoucherError = z.infer<typeof voucherErrorSchema>;

// Type the hook
export const useVoucherInfo = (
  code: string,
  options?: UseQueryOptions<VoucherInfoResult, VoucherError>
) => {
  return useQuery<VoucherInfoResult, VoucherError>(
    ['voucher', code],
    async () => {
      const response = await fetch(`/api/voucher/${code}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw voucherErrorSchema.parse(errorData);
      }
      return voucherInfoSchema.parse(await response.json());
    },
    options
  );
};
```

### Issue 4: Query Keys Missing Parameters

**Problem:**
```typescript
useQuery(['deliveryOptions'], () => fetchDeliveryOptions(postcode, date));
// Same key for different postcodes/dates!
```

**Fix:**
```typescript
useQuery(
  ['deliveryOptions', postcode, date],
  () => fetchDeliveryOptions(postcode, date)
);
```

### Issue 5: No Loading State for Mutations

**Problem:**
```typescript
const mutation = useApplyVoucher();
return (
  <Button onClick={() => mutation.mutate(code)}>
    Apply
  </Button>
);
// Button stays clickable during mutation
```

**Fix:**
```typescript
const mutation = useApplyVoucher();
return (
  <Button
    onClick={() => mutation.mutate(code)}
    disabled={mutation.isLoading}
  >
    {mutation.isLoading ? 'Applying...' : 'Apply'}
  </Button>
);
```

---

## Verification Summary

**Before marking implementation as complete, verify:**

- [ ] All API logic is in `@/data-access/*` modules (not in components)
- [ ] Each module has `index.ts` with exports
- [ ] Zod schemas defined for all data types
- [ ] API responses parsed with `schema.parse()`
- [ ] Types exported using `export type { ... }`
- [ ] Hooks accept React Query options parameter
- [ ] `enabled` option used for conditional fetching
- [ ] Query keys include all relevant parameters
- [ ] Errors are typed and handled gracefully
- [ ] Mutations invalidate related queries
- [ ] Components handle loading/error states
- [ ] Unit tests for hooks exist
- [ ] Integration tests with mock API exist

**Related Verifiers:**
- **react-component-architecture.md** - Component structure verification
- **state-management.md** - State management patterns
- **typescript-patterns.md** - Type safety verification
- **testing-practices.md** - Test coverage verification
