---
domain: import-organization
description: Import organization with path aliases, import grouping, barrel exports, and module structure
---

# Import Organization

Organize imports using @ path aliases, consistent import grouping, barrel exports, and clear module boundaries for maintainable codebases.

## Core Patterns

### 1. Path Aliases with @ Prefix

**Pattern:** All absolute imports use @ path aliases for internal modules. No relative imports for cross-module dependencies.

**Example from PR #60776:**
```typescript
// ✅ Good - Use @ aliases for cross-module imports
import { Box, Text } from '@/libs/zest';
import { useT9n } from '@/libs/translation';
import type { VoucherInfoResult } from '@/data-access/voucher';
import { useVoucherInfo } from '@/data-access/voucher';
import { useGetPricePresentation } from '@/data-access/price-presentation';

// ✅ Good - Use relative imports only within same module
import { useFormatPrice } from '../../hooks/useFormatPrice';
import { renderPrice } from './utils';
```

**Path alias structure:**
```typescript
// Common @ path prefixes
@/libs/*                    // Shared libraries and utilities
@/features/*                // Feature modules
@/data-access/*             // API integration layer
@/spaces/*                  // Space-specific modules
@/whitelabel-libraries/*    // Whitelabel configuration
@/libs/zest                 // Design system
@/libs/zest-support/icons   // Icon library
```

**tsconfig.json configuration:**
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["app/*"],
      "@/libs/*": ["app/libs/*"],
      "@/features/*": ["app/features/*"],
      "@/data-access/*": ["app/data-access/*"],
      "@/spaces/*": ["app/spaces/*"]
    }
  }
}
```

**Frequency:** 100% of cross-module imports

**Why:**
- Eliminates brittle relative paths (../../../libs/zest)
- Clear module boundaries and dependencies
- Easy refactoring and file moving
- Consistent import style across codebase
- IDE autocomplete support

**Example from PR #60695:**
```typescript
import React, { useState } from 'react';

import { Box, Text, Button } from '@/libs/zest';

interface NPSQuestionProps {
  question: string;
  selectedRating: number | null;
  onRatingSelect: (rating: number) => void;
}

const NPSQuestion: React.FC<NPSQuestionProps> = ({
  question,
  selectedRating,
  onRatingSelect,
}) => {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      marginTop="global.md-1"
      marginBottom="global.md-3"
    >
      <Text textAlign="center">{question}</Text>
      {/* Component implementation */}
    </Box>
  );
};
```

### 2. Import Grouping Order

**Pattern:** Imports are grouped in specific order with blank lines separating groups. Groups: 1) external libraries, 2) @ aliases (internal modules), 3) relative imports.

**Standard import order:**
```typescript
// Group 1: External libraries (npm packages)
import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { useAtom } from 'jotai';

// Group 2: @ path aliases (internal modules)
// Sub-group 2a: Shared libraries
import { Box, Text, Button } from '@/libs/zest';
import { useT9n } from '@/libs/translation';
import { useSelectedLocale } from '@/libs/locale';

// Sub-group 2b: Data access layer
import { useVoucherInfo } from '@/data-access/voucher';
import type { VoucherInfoResult } from '@/data-access/voucher';
import { useGetPricePresentation } from '@/data-access/price-presentation';

// Sub-group 2c: Feature modules
import { useCartContext } from '@/libs/cart';
import { useChatFeature } from '@/features/global-chat-feature';

// Group 3: Relative imports (same module)
import { useFormatPrice } from '../../hooks/useFormatPrice';
import { renderPrice } from '../utils';
import type { ComponentProps } from './types';
```

**Detailed example from PR #60718:**
```typescript
// External libraries
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'react-query';
import { useAtom } from 'jotai';

// Internal modules - libs
import { Box, Text } from '@/libs/zest';
import { useT9n } from '@/libs/translation';
import { useCartContext } from '@/libs/cart';
import { useLocalStorage } from '@/libs/local-storage';
import { formatDate } from '@/libs/date-fns';

// Internal modules - data access
import { useDeliveryOptionsByPostcode } from '@/data-access/delivery-options';
import type { DeliveryOptionsWithDate } from '@/data-access/delivery-options';
import { DeliveryOptionStatusType } from '@/data-access/delivery-options';
import { useCustomerAddress } from '@/data-access/customer';

// Relative imports
import { useDeliveryOptionsManager } from './hooks/useDeliveryOptionsManager';
import { calculateDeliveryDate } from './utils/dateCalculations';
import type { DeliveryState } from './types';
```

**Frequency:** 95% of files

**Import order within groups:**
Within each group, imports are typically organized:
1. Component/hook imports
2. Type imports (marked with `type` keyword)
3. Constant/enum imports
4. Alphabetically by module path

**Example:**
```typescript
// @ aliases group - organized by import type and path
import { Box, Text } from '@/libs/zest';                          // Component imports
import { useT9n } from '@/libs/translation';                      // Hook imports
import type { VoucherInfoResult } from '@/data-access/voucher';  // Type imports
import { DeliveryOptionStatusType } from '@/data-access/delivery-options'; // Enum/constant imports
```

### 3. Barrel Exports with index.ts

**Pattern:** Modules export their public API through index.ts barrel files that re-export from internal files.

**Example from PR #60787:**
```typescript
// File: app/features/global-chat-feature/index.ts
// Barrel export - public API of the module

// Component exports
export { default as ChatWidget } from './components/chat-widget/ChatWidget';
export { default as ChatBubble } from './components/chat-bubble/ChatBubble';

// Hook exports
export { useGlobalChatFeatureEnabled } from './hooks/useGlobalChatFeatureEnabled';
export { useChatFeature } from './store/useChatFeature';

// Constant exports
export { CHAT_INTENTS } from './constants';

// Type exports (use 'export type' for type-only exports)
export type { ChatIntent } from './constants';
export type { ChatState, ChatMessage } from './store/state';
```

**Example from PR #60718:**
```typescript
// File: app/data-access/delivery-options/index.ts
// Barrel export for data-access module

// Hook exports
export { useDeliveryOptionsBySystemCountry } from './bySystemCountry';
export { useDeliveryOptionsByPostcode } from './byPostcode';

// Enum exports
export { DeliveryOptionStatusType } from './schema';

// Type exports (grouped together)
export type {
  DeliveryOptionsWithDate,
  DeliveryOption,
  DeliveryDate,
  GetDeliveryOptionsByPostcodeParams,
  DeliveryTimeSlot,
} from './schema';
```

**Module internal structure:**
```
app/features/global-chat-feature/
  components/
    chat-bubble/
      ChatBubble.tsx              # Internal component
      ChatBubble.test.tsx
    chat-widget/
      ChatWidget.tsx              # Internal component
      ChatWidget.test.tsx
  hooks/
    useGlobalChatFeatureEnabled.ts  # Internal hook
  store/
    useChatFeature.ts             # Internal store
    state.ts                      # Internal types
  constants.ts                    # Internal constants
  index.ts                        # PUBLIC API - barrel export
```

**Usage from outside the module:**
```typescript
// ✅ Good - Import from barrel export
import {
  ChatWidget,
  ChatBubble,
  useChatFeature,
  CHAT_INTENTS,
  type ChatState,
} from '@/features/global-chat-feature';

// ❌ Bad - Import from internal files
import ChatWidget from '@/features/global-chat-feature/components/chat-widget/ChatWidget';
import { useChatFeature } from '@/features/global-chat-feature/store/useChatFeature';
```

**Frequency:** 85% of feature modules and data-access modules

**Benefits:**
- Clear public API boundary
- Easy to refactor internal structure
- Single import statement for module
- Prevents accidental coupling to internal implementation
- Better tree-shaking support

### 4. Type-Only Imports with 'type' Keyword

**Pattern:** Type imports use the `type` keyword to ensure they're removed during transpilation. This improves build performance and bundle size.

**Two syntaxes for type imports:**

**Syntax 1: Import type statement**
```typescript
// ✅ Good - Import type statement for all types
import type { DeliveryOptionsWithDate } from '@/data-access/delivery-options';
import type { VoucherInfoResult } from '@/data-access/voucher';
import type { ComponentProps } from './types';
```

**Syntax 2: Inline type keyword**
```typescript
// ✅ Good - Inline type keyword when mixing types and values
import { useVoucherInfo, type VoucherInfoResult } from '@/data-access/voucher';
import { Box, Text, type BoxProps } from '@/libs/zest';
```

**Example from PR #60776:**
```typescript
import React from 'react';

// Inline type imports mixed with value imports
import { useVoucherInfo, type VoucherInfoResult } from '@/data-access/voucher';
import { Box, Text, type BoxProps } from '@/libs/zest';

// Separate type import when only importing types
import type { PricePresentationData } from '@/data-access/price-presentation';
```

**Example from PR #60718:**
```typescript
// Type-only import statement
import type { DeliveryOptionsWithDate } from '@/data-access/delivery-options';

// Mixed import with inline type
import {
  useDeliveryOptionsByPostcode,
  DeliveryOptionStatusType,
  type DeliveryOption,
  type DeliveryDate,
} from '@/data-access/delivery-options';
```

**Exporting types:**
```typescript
// File: app/data-access/delivery-options/schema.ts
export interface DeliveryOption {
  id: string;
  date: string;
  timeSlot: string;
}

export type DeliveryOptionsWithDate = {
  deliveryDate: DeliveryDate;
  options: DeliveryOption[];
};

// File: app/data-access/delivery-options/index.ts
// Re-export types with 'export type'
export type {
  DeliveryOption,
  DeliveryOptionsWithDate,
  DeliveryDate,
} from './schema';

// Re-export values normally
export { DeliveryOptionStatusType } from './schema';
```

**Frequency:** 95% of type imports

**Why:**
- Explicitly marks type-only imports
- Removed during transpilation (no runtime cost)
- Prevents circular dependency issues
- Better IDE support for type-only imports
- TypeScript compiler optimization

### 5. Dynamic Imports with Next.js dynamic()

**Pattern:** Components use Next.js dynamic imports for code splitting and lazy loading, especially for heavy components.

**Example from PR #60716:**
```typescript
import dynamic from 'next/dynamic';

// Simple dynamic import
const ReviewSummary = dynamic(() => import('./components/ReviewSummary'));
const ReviewCarousel = dynamic(() => import('./components/ReviewCarousel'));

// Dynamic import with options
const HeavyComponent = dynamic(
  () => import('./components/HeavyComponent'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false, // Disable server-side rendering
  }
);

// Dynamic import from different module
const Utensils = dynamic(
  () => import('@/spaces/recipe-detail/modules/main/components/Utensils')
);

// Usage in component
const RecipeDetailPage: React.FC = () => {
  return (
    <Box>
      <ReviewSummary />
      <ReviewCarousel />
      <Utensils />
    </Box>
  );
};
```

**When to use dynamic imports:**
```typescript
// ✅ Good candidates for dynamic imports
// 1. Heavy third-party libraries
const ChartComponent = dynamic(() => import('./ChartComponent')); // Uses recharts

// 2. Components below the fold
const FooterSection = dynamic(() => import('./FooterSection'));

// 3. Conditionally rendered components
const AdminPanel = dynamic(() => import('./AdminPanel'));

// 4. Modal/drawer components
const CheckoutModal = dynamic(() => import('./CheckoutModal'));

// ❌ Don't use dynamic imports for
// 1. Critical above-the-fold content
const Hero = () => import('./Hero'); // ❌ User sees delay

// 2. Small components
const Button = dynamic(() => import('./Button')); // ❌ Overhead not worth it

// 3. Components needed for initial render
const Layout = dynamic(() => import('./Layout')); // ❌ Causes layout shift
```

**Frequency:** 45% of components (used selectively)

## Implementation Guidelines

### Setting Up Path Aliases

**1. Configure tsconfig.json:**
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["app/*"],
      "@/libs/*": ["app/libs/*"],
      "@/features/*": ["app/features/*"],
      "@/data-access/*": ["app/data-access/*"],
      "@/spaces/*": ["app/spaces/*"],
      "@/whitelabel-libraries/*": ["app/whitelabel-libraries/*"]
    }
  }
}
```

**2. Configure Next.js (next.config.js):**
```javascript
module.exports = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'app'),
    };
    return config;
  },
};
```

**3. Configure Jest (jest.config.js):**
```javascript
module.exports = {
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/app/$1',
    '^@/libs/(.*)$': '<rootDir>/app/libs/$1',
    '^@/features/(.*)$': '<rootDir>/app/features/$1',
    '^@/data-access/(.*)$': '<rootDir>/app/data-access/$1',
  },
};
```

### Creating Barrel Exports

**Step 1: Identify module boundary**
```
app/features/checkout/
  components/
    PaymentForm.tsx
    DeliveryOptions.tsx
  hooks/
    useCheckout.ts
  store/
    checkoutStore.ts
  types.ts
  index.ts  # Barrel export goes here
```

**Step 2: Create index.ts with public API**
```typescript
// File: app/features/checkout/index.ts

// Export components
export { default as PaymentForm } from './components/PaymentForm';
export { default as DeliveryOptions } from './components/DeliveryOptions';

// Export hooks
export { useCheckout } from './hooks/useCheckout';

// Export types
export type {
  CheckoutState,
  PaymentMethod,
  DeliveryAddress,
} from './types';

// Export stores
export { checkoutStore } from './store/checkoutStore';
```

**Step 3: Use barrel exports**
```typescript
// In other modules - import from barrel
import {
  PaymentForm,
  DeliveryOptions,
  useCheckout,
  type CheckoutState,
} from '@/features/checkout';
```

### Import Organization Checklist

When adding imports to a file, follow this order:

```typescript
// ✅ Complete import organization example

// 1. React and core framework imports
import React, { useState, useEffect, useCallback } from 'react';
import { GetServerSideProps } from 'next';
import dynamic from 'next/dynamic';

// 2. External library imports (alphabetical)
import { useAtom } from 'jotai';
import { useQuery, useMutation } from 'react-query';

// 3. Design system and UI libraries
import { Box, Text, Button } from '@/libs/zest';
import { CheckCircle24 } from '@/libs/zest-support/icons/generated/24';

// 4. Shared utility libraries
import { useT9n } from '@/libs/translation';
import { useSelectedLocale } from '@/libs/locale';
import { formatDate } from '@/libs/date-fns';
import { useCartContext } from '@/libs/cart';

// 5. Data access layer
import { useVoucherInfo, type VoucherInfoResult } from '@/data-access/voucher';
import { useGetPricePresentation } from '@/data-access/price-presentation';
import type { PricePresentationData } from '@/data-access/price-presentation';

// 6. Feature modules
import { useChatFeature, CHAT_INTENTS } from '@/features/global-chat-feature';

// 7. Configuration
import { useCheckoutConfig } from '@/whitelabel-libraries/config/checkout';

// 8. Relative imports - hooks
import { useDeliveryOptionsManager } from '../../hooks/useDeliveryOptionsManager';
import { useFormatPrice } from '../../hooks/useFormatPrice';

// 9. Relative imports - utils
import { calculateDeliveryDate } from '../utils/dateCalculations';
import { renderPrice } from './utils';

// 10. Relative imports - types
import type { ComponentProps } from './types';
```

## Testing Import Organization

### ESLint Configuration

```javascript
// .eslintrc.js
module.exports = {
  plugins: ['import'],
  rules: {
    // Enforce import order
    'import/order': [
      'error',
      {
        groups: [
          'builtin',  // Node built-in modules
          'external', // External npm packages
          'internal', // @ path aliases
          'parent',   // ../
          'sibling',  // ./
          'index',    // ./index
          'type',     // Type imports
        ],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
        pathGroups: [
          {
            pattern: '@/libs/**',
            group: 'internal',
            position: 'before',
          },
          {
            pattern: '@/data-access/**',
            group: 'internal',
            position: 'after',
          },
        ],
      },
    ],

    // Enforce type-only imports
    '@typescript-eslint/consistent-type-imports': [
      'error',
      {
        prefer: 'type-imports',
        disallowTypeAnnotations: true,
      },
    ],

    // Disallow relative imports for cross-module deps
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['../**/libs/*', '../../../*'],
            message: 'Use @ path aliases instead of relative imports for cross-module dependencies',
          },
        ],
      },
    ],
  },
};
```

### Testing Import Resolution

```typescript
// File: app/features/checkout/__tests__/imports.test.ts
describe('Import resolution', () => {
  it('should resolve @ path aliases', () => {
    // This test verifies path aliases work in Jest
    const { Box } = require('@/libs/zest');
    expect(Box).toBeDefined();
  });

  it('should resolve barrel exports', () => {
    const checkout = require('@/features/checkout');
    expect(checkout.PaymentForm).toBeDefined();
    expect(checkout.useCheckout).toBeDefined();
  });
});
```

## Anti-Patterns to Avoid

### ❌ Anti-Pattern 1: Deep Relative Imports

```typescript
// ❌ Bad - deep relative imports
import { Box } from '../../../../libs/zest';
import { useT9n } from '../../../libs/translation';
import { useVoucherInfo } from '../../../../data-access/voucher';

// ✅ Good - use @ aliases
import { Box } from '@/libs/zest';
import { useT9n } from '@/libs/translation';
import { useVoucherInfo } from '@/data-access/voucher';
```

**Why it's bad:**
- Breaks when files are moved
- Hard to read and maintain
- Makes refactoring difficult
- No clear module boundaries

### ❌ Anti-Pattern 2: Importing from Internal Files

```typescript
// ❌ Bad - importing from module internals
import ChatWidget from '@/features/global-chat-feature/components/chat-widget/ChatWidget';
import { useChatFeature } from '@/features/global-chat-feature/store/useChatFeature';

// ✅ Good - import from barrel export
import { ChatWidget, useChatFeature } from '@/features/global-chat-feature';
```

**Why it's bad:**
- Couples to internal structure
- Breaks module encapsulation
- Makes refactoring harder
- Defeats purpose of barrel exports

### ❌ Anti-Pattern 3: Missing Type Keyword

```typescript
// ❌ Bad - importing types as values
import { VoucherInfoResult } from '@/data-access/voucher';
import { DeliveryOption } from '@/data-access/delivery-options';

// ✅ Good - use type keyword
import type { VoucherInfoResult } from '@/data-access/voucher';
import type { DeliveryOption } from '@/data-access/delivery-options';

// ✅ Also good - inline type keyword
import { useVoucherInfo, type VoucherInfoResult } from '@/data-access/voucher';
```

**Why it's bad:**
- Larger bundle size
- Potential circular dependency issues
- Slower TypeScript compilation
- Runtime imports for compile-time types

### ❌ Anti-Pattern 4: Disorganized Import Groups

```typescript
// ❌ Bad - mixed import groups
import { Box } from '@/libs/zest';
import React from 'react';
import { useVoucherInfo } from '@/data-access/voucher';
import { useQuery } from 'react-query';
import type { VoucherInfoResult } from '@/data-access/voucher';
import { useT9n } from '@/libs/translation';

// ✅ Good - organized import groups
import React from 'react';
import { useQuery } from 'react-query';

import { Box } from '@/libs/zest';
import { useT9n } from '@/libs/translation';

import { useVoucherInfo, type VoucherInfoResult } from '@/data-access/voucher';
```

**Why it's bad:**
- Hard to scan and find imports
- Inconsistent across codebase
- Merge conflict prone
- Makes code reviews harder

### ❌ Anti-Pattern 5: Circular Dependencies

```typescript
// ❌ Bad - circular dependency
// File: app/features/checkout/components/PaymentForm.tsx
import { useDelivery } from '@/features/delivery';

// File: app/features/delivery/hooks/useDelivery.ts
import { useCheckout } from '@/features/checkout';

// ✅ Good - extract shared logic to common module
// File: app/libs/order/index.ts
export const useOrderState = () => { /* shared logic */ };

// File: app/features/checkout/components/PaymentForm.tsx
import { useOrderState } from '@/libs/order';

// File: app/features/delivery/hooks/useDelivery.ts
import { useOrderState } from '@/libs/order';
```

**Why it's bad:**
- Module loading issues
- Hard to test
- Tight coupling
- Build tool errors

### ❌ Anti-Pattern 6: Index.ts Importing from Index.ts

```typescript
// ❌ Bad - barrel export importing from another barrel export
// File: app/features/checkout/index.ts
import { useCart } from '@/features/cart'; // Imports from cart/index.ts
export { PaymentForm } from './components/PaymentForm';

// ✅ Good - import from specific internal files in barrel exports
// File: app/features/checkout/index.ts
export { PaymentForm } from './components/PaymentForm';

// Import from barrels only in component files
// File: app/features/checkout/components/PaymentForm.tsx
import { useCart } from '@/features/cart';
```

**Why it's bad:**
- Increases bundle size
- Harder to tree-shake
- Slower module resolution
- Can cause circular dependencies

## Related Implementers

- **typescript-patterns.md** - For type definitions and TypeScript usage
- **monorepo-structure.md** - For module organization patterns
- **testing-practices.md** - For test import mocking
- **configuration-management.md** - For config module imports
- **data-access-layer.md** - For data-access module structure

## Migration Guide

### Migrating from Relative Imports to @ Aliases

**Step 1: Set up path aliases in tsconfig.json**
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["app/*"]
    }
  }
}
```

**Step 2: Use codemod or find-replace**
```bash
# Find all deep relative imports
grep -r "from '\.\.\/\.\.\/" app/

# Example replacements
# Before: from '../../../libs/zest'
# After:  from '@/libs/zest'
```

**Step 3: Update imports file by file**
```typescript
// Before
import { Box } from '../../../libs/zest';
import { useT9n } from '../../libs/translation';

// After
import { Box } from '@/libs/zest';
import { useT9n } from '@/libs/translation';
```

**Step 4: Update tests**
```typescript
// Update jest.config.js
module.exports = {
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/app/$1',
  },
};
```

### Creating Barrel Exports for Existing Modules

**Step 1: Audit module exports**
```bash
# Find all exports in a module
grep -r "export" app/features/checkout/
```

**Step 2: Create index.ts**
```typescript
// File: app/features/checkout/index.ts

// Re-export components
export { default as PaymentForm } from './components/PaymentForm';
export { default as DeliveryOptions } from './components/DeliveryOptions';

// Re-export hooks
export { useCheckout } from './hooks/useCheckout';

// Re-export types
export type { CheckoutState, PaymentMethod } from './types';
```

**Step 3: Update imports across codebase**
```bash
# Find all imports from this module
grep -r "@/features/checkout/" app/
```

**Step 4: Replace with barrel imports**
```typescript
// Before
import PaymentForm from '@/features/checkout/components/PaymentForm';
import { useCheckout } from '@/features/checkout/hooks/useCheckout';

// After
import { PaymentForm, useCheckout } from '@/features/checkout';
```

## Summary

Import organization provides:
- **Clear module boundaries** with @ path aliases
- **Consistent import structure** with defined grouping order
- **Public APIs** through barrel exports
- **Optimized bundles** with type-only imports
- **Code splitting** with dynamic imports

This makes the codebase more maintainable, refactorable, and scalable.
