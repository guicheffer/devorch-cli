---
domain: state-management
description: State management using React Query for server state and Jotai for client state
---

# State Management

Manage application state using React Query for server state and Jotai for client state.

## Core Patterns

### 1. React Query for Server State

**Pattern:** Use React Query (`useQuery`, `useMutation`) for all API data fetching and caching.

**Example from PR #60776:**
```typescript
import { useQuery } from 'react-query';
import { useVoucherInfo } from '@/data-access/voucher';

const { data: voucherData, isLoading, error } = useVoucherInfo(
  couponCode,
  {
    suspense: false,
    enabled: !!couponCode,
    onError: () => {
      setHasError(true);
    },
  }
);
```

**Common options:**
- `enabled` - Conditional fetching
- `suspense: false` - Disable React Suspense
- `onError` - Error callback
- `staleTime` - Cache duration

### 2. Jotai for Client State

**Pattern:** Use Jotai atoms for global client state (UI state, user preferences).

**Example from PR #60718:**
```typescript
import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';

export const deliveryOptionsStateAtom = atomWithStorage(
  'deliveryOptionsState',
  {
    selectedDelivery: null,
    isLoading: true,
  }
);

// In component
const [deliveryState, setDeliveryState] = useAtom(deliveryOptionsStateAtom);
const deliveryState = useAtomValue(deliveryOptionsStateAtom); // Read-only
const setDeliveryState = useSetAtom(deliveryOptionsStateAtom); // Write-only
```

### 3. Custom Hooks for Business Logic

**Pattern:** Extract complex state logic into custom hooks.

**Example:**
```typescript
const useVoucherSavings = (
  voucherData: VoucherData,
  price: number
) => {
  const savingsAmount = voucherData?.discount || 0;
  const savingsText = `Save ${formatPrice(savingsAmount)}`;

  return {
    savingsAmount,
    savingsText,
    hasSavings: savingsAmount > 0,
  };
};

// Usage
const voucherSavings = useVoucherSavings(voucherData, price);
```

### 4. Context for Feature State

**Pattern:** Use React Context for feature-specific state.

**Example:**
```typescript
import { useCartContext } from '@/libs/cart';
import { useChatFeature } from '@/features/global-chat-feature';

const { cartId, productSku } = useCartContext();
const { openChat, state } = useChatFeature();
```

## Guidelines

- **Server state** → React Query
- **Client state** → Jotai
- **Feature state** → React Context
- **Form state** → Local useState or React Hook Form

## Related Libraries

- `react-query` - Server state management
- `jotai` - Atomic client state
- `jotai/utils` - Jotai utilities (atomWithStorage, etc)

## See Also

- **data-access-layer** - For React Query hooks
- **react-component-architecture** - For custom hooks
