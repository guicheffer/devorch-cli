---
domain: react-component-architecture
description: Patterns for building React components with TypeScript, functional components, and composition
---

# React Component Architecture

Build React components following YourCompany web frontend patterns using functional components, TypeScript, and composition.

## Core Patterns

### 1. Functional Components with TypeScript Props

**Pattern:** All components use functional components with explicit TypeScript interfaces or type aliases for props.

**Example from PR #60695:**
```typescript
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
  return (
    <Box display="flex" flexDirection="column">
      <Text>{question}</Text>
      {/* Component content */}
    </Box>
  );
};
```

**Frequency:** 100% of components

### 2. Type Aliases Over Interfaces

**Pattern:** Recent components prefer `export type` over `export interface` for props definitions.

**Example from PR #60724:**
```typescript
// ✅ Preferred
export type AddPromotionsSectionProps = {
  couponCode: string;
  productSku: string;
  price: number;
  onVoucherSubmit?: (voucher: string) => void;
};

// ❌ Older style
export interface AddPromotionsSectionProps {
  couponCode: string;
  productSku: string;
}
```

**Frequency:** 85% of new components

**Why:** Type aliases provide more flexibility and better integration with utility types.

### 3. Component Composition

**Pattern:** Components are composed by passing sections and sub-components as JSX, maintaining clear hierarchy and separation of concerns.

**Example from PR #60776:**
```typescript
const OrderReviewSection: React.FC<OrderReviewSectionProps> = ({
  productSpecs,
  price,
  couponCode,
  productSku,
}) => {
  return (
    <Box
      data-test-id="order-review-section"
      display="flex"
      flexDirection="column"
      gap="global.sm-2"
    >
      <YourPlanSection
        productSpecs={productSpecs}
        price={price}
      />

      {showPromotionsAppliedSection && (
        <PromotionsAppliedSection
          hasDiscount={hasDiscount}
          price={price}
          paidPrice={paidPrice}
        />
      )}

      <AddPromotionsSection
        couponCode={couponCode}
        productSku={productSku}
      />

      <Divider />

      <FirstBoxTotalSection
        hasDiscount={hasDiscount}
        price={price}
      />
    </Box>
  );
};
```

**Frequency:** 90% of container components

**Benefits:**
- Clear component hierarchy
- Easy to test individual sections
- Reusable sub-components

### 4. Dynamic Imports with Next.js

**Pattern:** Use Next.js `dynamic()` for code splitting and lazy loading heavy components.

**Example from PR #60716:**
```typescript
import dynamic from 'next/dynamic';

const ReviewSummary = dynamic(() => import('./components/ReviewSummary'));
const ReviewCarousel = dynamic(() => import('./components/ReviewCarousel'));

const Utensils = dynamic(
  () => import('@/spaces/recipe-detail/modules/main/components/Utensils')
);

export const RecipeDetail: React.FC = () => {
  return (
    <div>
      <ReviewSummary />
      <ReviewCarousel />
      <Utensils />
    </div>
  );
};
```

**Frequency:** 45% of heavy/optional components

**Use cases:**
- Heavy third-party libraries
- Components below the fold
- Conditionally rendered features

## Implementation Guidelines

### Component File Structure

```typescript
// 1. Imports (external, internal, relative)
import React, { useState } from 'react';
import { Box, Text } from '@/libs/zest';
import { useT9n } from '@/libs/translation';
import type { SomeType } from '@/data-access/module';

// 2. Type definitions
export type ComponentProps = {
  title: string;
  onAction: () => void;
  optional?: boolean;
};

// 3. Component implementation
export const Component: React.FC<ComponentProps> = ({
  title,
  onAction,
  optional = false,
}) => {
  // 4. Hooks
  const { translate } = useT9n('namespace');
  const [state, setState] = useState(false);

  // 5. Event handlers
  const handleClick = () => {
    setState(true);
    onAction();
  };

  // 6. Render
  return (
    <Box>
      <Text>{title}</Text>
    </Box>
  );
};
```

### Default Props

Use default parameter values in destructuring:

```typescript
const Component: React.FC<Props> = ({
  size = 'medium',
  variant = 'primary',
  disabled = false,
}) => {
  // ...
};
```

### Conditional Rendering

Use logical AND (`&&`) for single conditions, ternary for alternatives:

```typescript
// Single condition
{isLoading && <LoadingSpinner />}

// Alternative rendering
{hasError ? <ErrorMessage /> : <Content />}

// Multiple conditions
{showSection && !isHidden && (
  <Section />
)}
```

## Related Libraries

- `react` - Core React library
- `@types/react` - TypeScript types for React
- `next/dynamic` - Dynamic imports for code splitting

## Testing Considerations

- Export prop types for test mocking
- Use `data-test-id` attributes for test selection
- Mock complex sub-components in tests

## See Also

- **styling-design-system** - For Zest component usage
- **typescript-patterns** - For advanced TypeScript patterns
- **testing-practices** - For component testing patterns
