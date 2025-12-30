---
domain: data-access-layer
description: Organizing API integrations in data-access modules with typed schemas and React Query hooks
---

# Data Access Layer

Organize API integrations in `@/data-access/*` modules with typed schemas and React Query hooks.

## Pattern: Data-Access Modules

**Structure:**
```
app/data-access/
├── voucher/
│   ├── index.ts          # Exports
│   ├── schema.ts         # TypeScript types
│   ├── hooks.ts          # React Query hooks
│   └── api.ts            # API calls
├── delivery-options/
└── price-presentation/
```

**Example from PR #60718:**
```typescript
// app/data-access/delivery-options/index.ts
export { useDeliveryOptionsBySystemCountry } from './hooks';
export { DeliveryOptionStatusType } from './schema';
export type {
  DeliveryOptionsWithDate,
  DeliveryOption,
} from './schema';

// app/data-access/delivery-options/hooks.ts
import { useQuery } from 'react-query';
import { fetchDeliveryOptions } from './api';
import type { DeliveryOptionsWithDate } from './schema';

export const useDeliveryOptionsByPostcode = (
  postcode: string,
  options?: UseQueryOptions
) => {
  return useQuery<DeliveryOptionsWithDate[]>(
    ['deliveryOptions', postcode],
    () => fetchDeliveryOptions(postcode),
    {
      enabled: !!postcode,
      ...options,
    }
  );
};
```

## Guidelines

- One module per API resource
- Export types with `export type`
- Hooks wrap React Query
- All hooks accept `options` parameter

## See Also

- **state-management** - For React Query patterns
- **typescript-patterns** - For type exports
