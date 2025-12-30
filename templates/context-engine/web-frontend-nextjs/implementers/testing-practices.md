---
domain: testing-practices
description: Testing with Jest, React Testing Library, and Cypress for unit and E2E tests
---

# Testing Practices

Test React components and features using Jest, React Testing Library, and Cypress.

## Unit Testing with Jest

**Pattern:** Mock dependencies before imports.

**Example from PR #60718:**
```typescript
// Mock all dependencies BEFORE imports
jest.mock('jotai');
jest.mock('@/data-access/delivery-options');
jest.mock('@/libs/cart');

import { renderHook } from '@testing-library/react-hooks';
import { useDeliveryOptionsManager } from './useDeliveryOptionsManager';

describe('useDeliveryOptionsManager', () => {
  it('should initialize with default state', () => {
    const { result } = renderHook(() => useDeliveryOptionsManager());
    expect(result.current.isLoading).toBe(true);
  });
});
```

## Testing Components

```typescript
import { render, screen } from '@testing-library/react';
import { Component } from './Component';

describe('Component', () => {
  it('should display title', () => {
    render(<Component title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

## E2E Testing with Cypress

**Example from PR #60717:**
```typescript
describe('Extended Funnel Flow', () => {
  beforeEach(() => {
    cy.bootstrap();
    cy.bypassExperimentationSetup({
      experimentKey: 'test-experiment',
      returnDesiredObject: {
        variationKey: 'variation_1',
      },
    });
  });

  afterEach(() => {
    cy.teardown();
  });

  it('should complete checkout flow', () => {
    cy.visit('/plans');
    cy.get('[data-test-id="plan-card"]').first().click();
    cy.get('[data-test-id="checkout-button"]').click();
  });
});
```

## Guidelines

- Use `data-test-id` for element selection
- Mock all external dependencies
- Test user behavior, not implementation
- Use descriptive test names

## Related Libraries

- `jest`
- `@testing-library/react`
- `@testing-library/react-hooks`
- `cypress`
