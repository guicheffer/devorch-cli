---
domain: typescript-patterns
description: TypeScript usage patterns including strict typing, type-only imports, and generics
---

# TypeScript Patterns

Write type-safe code following YourCompany TypeScript conventions.

## Core Patterns

### 1. Strict Type Definitions

**Pattern:** Explicit types for all props, no `any`.

```typescript
interface ComponentProps {
  title: string;
  count: number;
  onAction: (id: string) => void;
  optional?: boolean;
}
```

### 2. Type-Only Imports

**Pattern:** Use `type` keyword for type imports.

```typescript
import type { DeliveryOption } from '@/data-access/delivery-options';
import { type VoucherData } from '@/data-access/voucher';
```

### 3. Optional Chaining and Nullish Coalescing

```typescript
const count = reviewHighlights?.length ?? 0;
const title = data?.title ?? 'Default';
```

### 4. Const Assertions

```typescript
export const CHAT_INTENTS = {
  FACTOR_FORM: 'factor_form',
  AGENT: 'agent',
} as const;

export type ChatIntent = typeof CHAT_INTENTS[keyof typeof CHAT_INTENTS];
```

### 5. Generics for Reusability

```typescript
interface ApiResponse<T> {
  data: T;
  status: number;
}

interface ListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}
```

## See Also

- **react-component-architecture** - For component typing
- **data-access-layer** - For API type exports
