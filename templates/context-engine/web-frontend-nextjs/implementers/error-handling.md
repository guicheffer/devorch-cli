---
domain: error-handling
description: Error handling with ErrorBoundary components, React Query error callbacks, and graceful degradation patterns
---

# Error Handling

Handle errors gracefully using ErrorBoundary components with scoped error tracking, React Query error callbacks for API failures, and fallback UI patterns for graceful degradation.

## Core Patterns

### 1. ErrorBoundary Components with Scope

**Pattern:** Wrap components in ErrorBoundary with specific scope strings for error tracking and monitoring.

**Example from PR #60716:**
```typescript
import { ErrorBoundary } from '@/libs/error-boundary';

const RecipeDetailPage: React.FC = () => {
  return (
    <Box>
      <ErrorBoundary
        scope="recipe-detail-recipe-detail.customer-reviews"
        fallback={<></>}
      >
        <CustomerReviewsComponent />
      </ErrorBoundary>

      <ErrorBoundary
        scope="recipe-detail-recipe-detail.recipe-summary"
        fallback={<RecipeSummarySkeleton />}
      >
        <RecipeSummaryComponent />
      </ErrorBoundary>

      <ErrorBoundary
        scope="recipe-detail-recipe-detail.nutrition-info"
        fallback={null}
      >
        <NutritionInfoComponent />
      </ErrorBoundary>
    </Box>
  );
};
```

**Scope Naming Convention:**
```typescript
// Pattern: {space/feature}-{page/section}.{component}
"recipe-detail-recipe-detail.customer-reviews"
"checkout-payment-page.payment-methods"
"subscription-management-delivery.delivery-options"
"global-chat-feature.chat-widget"
```

**Different Fallback Strategies:**
```typescript
// 1. Empty fallback - hide component completely
<ErrorBoundary scope="optional-feature" fallback={<></>}>
  <OptionalFeature />
</ErrorBoundary>

// 2. Skeleton/loading state - maintain layout
<ErrorBoundary scope="important-section" fallback={<Skeleton />}>
  <ImportantSection />
</ErrorBoundary>

// 3. Error message - inform user
<ErrorBoundary
  scope="critical-feature"
  fallback={
    <Box padding="global.md-1">
      <Text color="shared-alias.negative.foreground.default">
        Something went wrong. Please try again later.
      </Text>
    </Box>
  }
>
  <CriticalFeature />
</ErrorBoundary>

// 4. Null fallback - remove from DOM completely
<ErrorBoundary scope="enhancement" fallback={null}>
  <Enhancement />
</ErrorBoundary>
```

**Frequency:** 85% of feature components

**Why:** ErrorBoundary with scope provides:
- Isolated error handling - one component failure doesn't crash the entire page
- Error tracking with context - scope identifies exactly where errors occur
- Graceful degradation - users can continue using other parts of the application
- Better monitoring - errors grouped by scope in error tracking tools

### 2. React Query onError Callbacks

**Pattern:** Handle API errors through React Query's onError callback to update local error state and trigger UI feedback.

**Example from PR #60776:**
```typescript
import { useState } from 'react';
import { useVoucherInfo } from '@/data-access/voucher';
import { useGetPricePresentation } from '@/data-access/price-presentation';

const OrderReviewSection: React.FC<OrderReviewSectionProps> = ({
  couponCode,
  productSku,
  price,
}) => {
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: voucherData, isLoading: isLoadingVoucher } = useVoucherInfo(
    couponCode,
    {
      suspense: false,
      enabled: !!couponCode,
      onError: (error) => {
        setHasError(true);
        setErrorMessage('Unable to load voucher information');
        console.error('Voucher fetch error:', error);
      },
    }
  );

  const {
    data: pricePresentationData,
    isLoading: isLoadingPrice,
  } = useGetPricePresentation(
    { productSku, price, couponCode },
    {
      suspense: false,
      enabled: !!couponCode,
      onError: (error) => {
        setHasError(true);
        setErrorMessage('Unable to load pricing details');
        console.error('Price presentation error:', error);
      },
    }
  );

  // Show error UI
  if (hasError) {
    return (
      <Box padding="global.md-1">
        <Text color="shared-alias.negative.foreground.default">
          {errorMessage || 'An error occurred'}
        </Text>
        <Button.Secondary
          size="sm"
          onClick={() => {
            setHasError(false);
            setErrorMessage(null);
            // Retry logic could trigger refetch
          }}
        >
          Try Again
        </Button.Secondary>
      </Box>
    );
  }

  // Show loading state
  if (isLoadingVoucher || isLoadingPrice) {
    return <OrderReviewSkeleton />;
  }

  // Render normal content
  return (
    <Box>
      {/* Component content */}
    </Box>
  );
};
```

**Error State Management Patterns:**
```typescript
// 1. Simple boolean flag
const [hasError, setHasError] = useState(false);

// 2. Error message state
const [errorMessage, setErrorMessage] = useState<string | null>(null);

// 3. Typed error state
type ErrorState = {
  hasError: boolean;
  message: string | null;
  code?: string;
  retryable?: boolean;
};
const [error, setError] = useState<ErrorState>({
  hasError: false,
  message: null,
});

// 4. Multiple error sources
const [voucherError, setVoucherError] = useState(false);
const [priceError, setPriceError] = useState(false);
const hasAnyError = voucherError || priceError;
```

**Frequency:** 80% of data-fetching hooks

**Why:** onError callbacks enable:
- Fine-grained error handling per query
- Custom error messages for different failure types
- User feedback and retry mechanisms
- Error logging and analytics
- Preventing suspense-based error boundaries when not desired

### 3. Conditional Data Fetching with Error States

**Pattern:** Combine enabled option with error handling to prevent cascading failures.

**Example:**
```typescript
import { useState } from 'react';
import { useQuery } from 'react-query';

const DeliveryOptionsManager: React.FC = () => {
  const [postcodeError, setPostcodeError] = useState(false);
  const [deliveryError, setDeliveryError] = useState(false);

  // First query - validate postcode
  const {
    data: postcodeValidation,
    isSuccess: isPostcodeValid,
  } = useQuery(
    ['validatePostcode', postcode],
    () => validatePostcode(postcode),
    {
      enabled: !!postcode,
      onError: (error) => {
        setPostcodeError(true);
        console.error('Postcode validation failed:', error);
      },
    }
  );

  // Second query - only fetch if postcode is valid
  const {
    data: deliveryOptions,
    isLoading: isLoadingDelivery,
  } = useQuery(
    ['deliveryOptions', postcode],
    () => fetchDeliveryOptions(postcode),
    {
      enabled: isPostcodeValid && !postcodeError, // Conditional fetch
      onError: (error) => {
        setDeliveryError(true);
        console.error('Delivery options fetch failed:', error);
      },
    }
  );

  // Error UI for postcode
  if (postcodeError) {
    return (
      <Box>
        <Text color="shared-alias.negative.foreground.default">
          Invalid postcode. Please check and try again.
        </Text>
      </Box>
    );
  }

  // Error UI for delivery options
  if (deliveryError) {
    return (
      <Box>
        <Text color="shared-alias.negative.foreground.default">
          Unable to load delivery options for your area.
        </Text>
      </Box>
    );
  }

  return <DeliveryOptionsDisplay options={deliveryOptions} />;
};
```

**Frequency:** 85% of dependent queries

### 4. Graceful Degradation with Partial Data

**Pattern:** Continue rendering with partial data when non-critical API calls fail.

**Example:**
```typescript
const ProductDetailsPage: React.FC = () => {
  const [reviewsError, setReviewsError] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState(false);

  // Critical data - must succeed
  const { data: product, isLoading } = useQuery(
    ['product', productId],
    () => fetchProduct(productId),
    {
      suspense: false,
      onError: (error) => {
        // Critical error - ErrorBoundary will catch
        throw error;
      },
    }
  );

  // Optional data - can fail gracefully
  const { data: reviews } = useQuery(
    ['reviews', productId],
    () => fetchReviews(productId),
    {
      suspense: false,
      enabled: !!product,
      onError: (error) => {
        setReviewsError(true);
        console.warn('Reviews unavailable:', error);
        // Don't throw - allow page to continue
      },
    }
  );

  const { data: recommendations } = useQuery(
    ['recommendations', productId],
    () => fetchRecommendations(productId),
    {
      suspense: false,
      enabled: !!product,
      onError: (error) => {
        setRecommendationsError(true);
        console.warn('Recommendations unavailable:', error);
      },
    }
  );

  if (isLoading) {
    return <ProductSkeleton />;
  }

  return (
    <Box>
      {/* Critical content always shows */}
      <ProductDetails product={product} />

      {/* Optional content with graceful failure */}
      {!reviewsError && reviews && (
        <ReviewsSection reviews={reviews} />
      )}
      {reviewsError && (
        <Box padding="global.sm-2">
          <Text type="body-sm-regular" color="global.gray.600">
            Customer reviews are temporarily unavailable.
          </Text>
        </Box>
      )}

      {!recommendationsError && recommendations && (
        <RecommendationsSection recommendations={recommendations} />
      )}
      {/* Silently hide recommendations if they fail */}
    </Box>
  );
};
```

**Frequency:** 70% of pages with optional content

### 5. Error Logging and Monitoring

**Pattern:** Log errors with context for debugging and monitoring.

**Example:**
```typescript
import { logError } from '@/libs/error-logging';

const CheckoutPaymentSection: React.FC = () => {
  const { data: paymentMethods } = useQuery(
    ['paymentMethods'],
    fetchPaymentMethods,
    {
      onError: (error) => {
        // Log with context
        logError({
          message: 'Payment methods fetch failed',
          error,
          context: {
            component: 'CheckoutPaymentSection',
            userId: user?.id,
            cartId: cart?.id,
            timestamp: new Date().toISOString(),
          },
          severity: 'high', // This is a critical flow
        });

        // Show user-friendly message
        setErrorMessage('Unable to load payment methods');
      },
    }
  );
};

// Error logging utility
type ErrorLog = {
  message: string;
  error: Error | unknown;
  context: Record<string, unknown>;
  severity: 'low' | 'medium' | 'high' | 'critical';
};

export const logError = ({ message, error, context, severity }: ErrorLog) => {
  // Console log for development
  console.error(message, {
    error,
    context,
    severity,
  });

  // Send to error tracking service (Sentry, etc)
  if (typeof window !== 'undefined' && window.Sentry) {
    window.Sentry.captureException(error, {
      tags: {
        severity,
        component: context.component,
      },
      extra: context,
    });
  }

  // Analytics event for monitoring
  if (typeof window !== 'undefined' && window.analytics) {
    window.analytics.track('Error Occurred', {
      message,
      severity,
      ...context,
    });
  }
};
```

**Frequency:** 60% of error handlers

## Implementation Guidelines

### When to Use ErrorBoundary

Use ErrorBoundary for:
- ✅ Feature sections that can fail independently
- ✅ Third-party components (chat widgets, analytics)
- ✅ Dynamic content from CMS
- ✅ Optional enhancements (reviews, recommendations)
- ✅ Lazy-loaded components

Don't use ErrorBoundary for:
- ❌ Critical page content (use suspense + error pages)
- ❌ Form fields (use validation instead)
- ❌ Small, stable components
- ❌ Components that should crash the app on error

### When to Use onError Callbacks

Use onError callbacks for:
- ✅ API calls that need custom error messages
- ✅ Queries that should update local error state
- ✅ Non-critical data fetching
- ✅ Operations with retry logic
- ✅ Error logging and analytics

Don't use onError for:
- ❌ Critical data (let ErrorBoundary catch)
- ❌ When you want default React Query error handling
- ❌ When suspense mode is appropriate

### Error Message Guidelines

**User-Facing Messages:**
```typescript
// ❌ Bad - technical details exposed
"Error: Network request failed with status 500"
"TypeError: Cannot read property 'data' of undefined"

// ✅ Good - user-friendly and actionable
"Unable to load your delivery options"
"Something went wrong. Please try again."
"This feature is temporarily unavailable"
```

**Log Messages (Internal):**
```typescript
// ✅ Good - detailed for debugging
console.error('Delivery options fetch failed', {
  error: error.message,
  statusCode: error.status,
  endpoint: '/api/delivery-options',
  params: { postcode, productSku },
  userId: user?.id,
});
```

### Error State Patterns

**1. Simple Boolean Flag:**
```typescript
// Use when you only need to know if error occurred
const [hasError, setHasError] = useState(false);

if (hasError) {
  return <ErrorMessage />;
}
```

**2. Error Message State:**
```typescript
// Use when you need custom error messages
const [errorMessage, setErrorMessage] = useState<string | null>(null);

onError: (error) => {
  if (error.status === 404) {
    setErrorMessage('Item not found');
  } else if (error.status === 403) {
    setErrorMessage('Access denied');
  } else {
    setErrorMessage('An error occurred');
  }
}
```

**3. Structured Error State:**
```typescript
// Use for complex error handling
type ErrorState = {
  hasError: boolean;
  message: string | null;
  code?: string;
  retryable: boolean;
  details?: Record<string, unknown>;
};

const [error, setError] = useState<ErrorState>({
  hasError: false,
  message: null,
  retryable: true,
});

onError: (err) => {
  setError({
    hasError: true,
    message: getUserFriendlyMessage(err),
    code: err.code,
    retryable: isRetryable(err),
    details: err.details,
  });
}
```

## Testing Error Handling

### Unit Tests for Error Callbacks

```typescript
import { renderHook, waitFor } from '@testing-library/react-hooks';
import { QueryClient, QueryClientProvider } from 'react-query';
import { useVoucherInfo } from '@/data-access/voucher';

const mockFetch = jest.fn();
jest.mock('@/data-access/voucher', () => ({
  useVoucherInfo: jest.fn(),
}));

describe('OrderReviewSection error handling', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  it('should set error state when voucher fetch fails', async () => {
    // Mock the hook to return an error
    (useVoucherInfo as jest.Mock).mockImplementation((code, options) => {
      // Trigger onError callback
      options.onError?.(new Error('Network error'));
      return {
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
      };
    });

    const { result } = renderHook(
      () => {
        const [hasError, setHasError] = useState(false);
        useVoucherInfo('CODE123', {
          onError: () => setHasError(true),
        });
        return hasError;
      },
      {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        ),
      }
    );

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });
});
```

### Integration Tests with Error Boundaries

```typescript
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '@/libs/error-boundary';

const ThrowError = () => {
  throw new Error('Test error');
};

describe('ErrorBoundary', () => {
  it('should render fallback when child component throws', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    render(
      <ErrorBoundary
        scope="test-component"
        fallback={<div>Error occurred</div>}
      >
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Error occurred')).toBeInTheDocument();
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should render children when no error occurs', () => {
    render(
      <ErrorBoundary
        scope="test-component"
        fallback={<div>Error occurred</div>}
      >
        <div>Success content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Success content')).toBeInTheDocument();
    expect(screen.queryByText('Error occurred')).not.toBeInTheDocument();
  });
});
```

### E2E Tests for Error Scenarios

```cypress
describe('Order review with API errors', () => {
  beforeEach(() => {
    cy.bootstrap();
  });

  it('should show error message when voucher API fails', () => {
    // Intercept and fail the voucher API call
    cy.intercept('GET', '/api/voucher/*', {
      statusCode: 500,
      body: { error: 'Internal server error' },
    }).as('voucherFail');

    cy.visit('/checkout');
    cy.get('[data-test-id="coupon-input"]').type('CODE123');
    cy.get('[data-test-id="apply-coupon"]').click();

    cy.wait('@voucherFail');

    cy.get('[data-test-id="error-message"]')
      .should('be.visible')
      .and('contain', 'Unable to apply coupon');
  });

  it('should allow retry after error', () => {
    let callCount = 0;
    cy.intercept('GET', '/api/voucher/*', (req) => {
      callCount++;
      if (callCount === 1) {
        req.reply({ statusCode: 500 });
      } else {
        req.reply({ statusCode: 200, body: { valid: true } });
      }
    }).as('voucherRetry');

    cy.visit('/checkout');
    cy.get('[data-test-id="coupon-input"]').type('CODE123');
    cy.get('[data-test-id="apply-coupon"]').click();

    cy.get('[data-test-id="error-message"]').should('be.visible');
    cy.get('[data-test-id="retry-button"]').click();

    cy.wait('@voucherRetry');
    cy.get('[data-test-id="success-message"]').should('be.visible');
  });
});
```

## Error UI Components

### Inline Error Message

```typescript
import { Box, Text } from '@/libs/zest';
import { AlertCircleOutline24 } from '@/libs/zest-support/icons/generated/24';

type InlineErrorProps = {
  message: string;
  onRetry?: () => void;
};

export const InlineError: React.FC<InlineErrorProps> = ({
  message,
  onRetry,
}) => {
  return (
    <Box
      display="flex"
      alignItems="center"
      gap="global.xs"
      padding="global.sm-2"
      backgroundColor="shared-alias.negative.background.default"
      borderRadius="global.sm-1"
    >
      <AlertCircleOutline24
        color="shared-alias.negative.foreground.default"
      />
      <Box flex="1">
        <Text
          type="body-sm-regular"
          color="shared-alias.negative.foreground.default"
        >
          {message}
        </Text>
      </Box>
      {onRetry && (
        <Button.Secondary size="sm" onClick={onRetry}>
          Try Again
        </Button.Secondary>
      )}
    </Box>
  );
};
```

### Error Page Section

```typescript
import { Box, Text, Button } from '@/libs/zest';

type ErrorSectionProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
  onGoBack?: () => void;
};

export const ErrorSection: React.FC<ErrorSectionProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  onGoBack,
}) => {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      padding="global.lg-1"
      minHeight="400px"
    >
      <Text
        type="heading-md"
        textAlign="center"
        marginBottom="global.sm-2"
      >
        {title}
      </Text>
      <Text
        type="body-md-regular"
        textAlign="center"
        color="global.gray.600"
        marginBottom="global.md-1"
      >
        {message}
      </Text>
      <Box display="flex" gap="global.sm-2">
        {onGoBack && (
          <Button.Secondary onClick={onGoBack}>
            Go Back
          </Button.Secondary>
        )}
        {onRetry && (
          <Button.Primary onClick={onRetry}>
            Try Again
          </Button.Primary>
        )}
      </Box>
    </Box>
  );
};
```

## Anti-Patterns to Avoid

❌ **Don't swallow errors silently:**
```typescript
// ❌ Bad - error is caught but not handled
const { data } = useQuery('data', fetchData, {
  onError: () => {
    // Nothing happens - user has no feedback
  },
});
```

✅ **Always provide feedback or logging:**
```typescript
// ✅ Good - error is handled appropriately
const { data } = useQuery('data', fetchData, {
  onError: (error) => {
    setErrorMessage('Unable to load data');
    logError({
      message: 'Data fetch failed',
      error,
      context: { component: 'MyComponent' },
      severity: 'medium',
    });
  },
});
```

❌ **Don't expose technical details to users:**
```typescript
// ❌ Bad
<Text>Error: Network request failed with status 500</Text>
<Text>TypeError: Cannot read property 'data' of undefined</Text>
```

✅ **Show user-friendly messages:**
```typescript
// ✅ Good
<Text>Unable to load content. Please try again later.</Text>
```

❌ **Don't let errors cascade:**
```typescript
// ❌ Bad - error in voucher fetch causes entire component to fail
const { data: voucherData } = useVoucherInfo(couponCode); // No error handling
const { data: priceData } = useGetPricePresentation({
  // This depends on voucherData but has no safety checks
  voucher: voucherData.code,
});
```

✅ **Isolate error boundaries:**
```typescript
// ✅ Good - errors are contained
const { data: voucherData } = useVoucherInfo(couponCode, {
  onError: () => setVoucherError(true),
});

const { data: priceData } = useGetPricePresentation(
  { voucher: voucherData?.code },
  {
    enabled: !!voucherData && !voucherError,
    onError: () => setPriceError(true),
  }
);
```

❌ **Don't use ErrorBoundary for everything:**
```typescript
// ❌ Bad - unnecessary wrapping
<ErrorBoundary scope="button">
  <Button>Click me</Button>
</ErrorBoundary>
```

✅ **Only wrap components that can fail:**
```typescript
// ✅ Good - wrapping dynamic/risky components
<Button>Click me</Button> {/* No ErrorBoundary needed */}

<ErrorBoundary scope="reviews-widget">
  <ThirdPartyReviewsWidget /> {/* Might fail */}
</ErrorBoundary>
```

❌ **Don't retry indefinitely:**
```typescript
// ❌ Bad - infinite retry loop
const { data } = useQuery('data', fetchData, {
  retry: true, // Will retry forever
  retryDelay: 1000,
});
```

✅ **Limit retry attempts:**
```typescript
// ✅ Good - bounded retries
const { data } = useQuery('data', fetchData, {
  retry: 3, // Max 3 retries
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
});
```

## Related Implementers

- **data-access-layer.md** - React Query configuration and error handling in API hooks
- **state-management.md** - Managing error state with React hooks and Jotai
- **testing-practices.md** - Testing error scenarios and edge cases
- **react-component-architecture.md** - Component composition with error boundaries
