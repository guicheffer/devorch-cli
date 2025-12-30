---
domain: error-handling
description: Verify comprehensive error handling patterns including ErrorBoundary components, React Query error callbacks, graceful degradation, and error monitoring
---

# Error Handling Verification

Verify that implementation follows robust error handling patterns with proper error boundaries, query error callbacks, graceful degradation strategies, and comprehensive error tracking.

## Verification Checklist

### 1. ErrorBoundary Component Usage

**Requirement:** All feature components must be wrapped in ErrorBoundary with specific scope strings for error tracking and isolation.

**Verification Steps:**

✅ **Check ErrorBoundary imports and wrapping:**
```typescript
// ✅ Required
import { ErrorBoundary } from '@/libs/error-boundary';

return (
  <ErrorBoundary
    scope="recipe-detail-recipe-detail.customer-reviews"
    fallback={<></>}
  >
    <CustomerReviewsComponent />
  </ErrorBoundary>
);

// ❌ Missing error boundary
return <CustomerReviewsComponent />;
```

✅ **Verify scope naming convention:**
```typescript
// ✅ Correct - descriptive scope with feature hierarchy
<ErrorBoundary
  scope="checkout-delivery-options.delivery-date-selector"
  fallback={<DeliveryErrorFallback />}
>

<ErrorBoundary
  scope="order-review-section.promotions-applied"
  fallback={<></>}
>

// ❌ Incorrect - generic or missing scope
<ErrorBoundary scope="component">
<ErrorBoundary scope="error">
<ErrorBoundary>  {/* Missing scope */}
```

**Scope Naming Pattern:** `{feature}-{sub-feature}.{component-name}`
- First part: Feature or space name (e.g., "checkout", "recipe-detail", "order-review")
- Second part: Sub-feature or section (optional)
- Third part: Specific component name

✅ **Verify fallback UI:**
```typescript
// ✅ Good - custom fallback component
<ErrorBoundary
  scope="cart-summary.total-calculation"
  fallback={<CartErrorState onRetry={handleRetry} />}
>

// ✅ Acceptable - empty fallback for non-critical features
<ErrorBoundary
  scope="recommended-products.carousel"
  fallback={<></>}
>

// ✅ Good - inline fallback with context
<ErrorBoundary
  scope="user-profile.avatar"
  fallback={
    <Box padding="global.md-1">
      <Text color="shared-alias.neutral.foreground.default">
        Unable to load profile
      </Text>
    </Box>
  }
>

// ❌ Incorrect - no fallback specified
<ErrorBoundary scope="feature.component">
```

✅ **Check error boundary placement:**
```typescript
// ✅ Correct - wraps feature sections independently
return (
  <Box>
    <ErrorBoundary scope="order-summary.plan-section" fallback={<></>}>
      <YourPlanSection productSpecs={productSpecs} price={price} />
    </ErrorBoundary>

    <ErrorBoundary scope="order-summary.promotions-section" fallback={<></>}>
      <PromotionsAppliedSection hasDiscount={hasDiscount} />
    </ErrorBoundary>

    <ErrorBoundary scope="order-summary.total-section" fallback={<></>}>
      <FirstBoxTotalSection price={price} />
    </ErrorBoundary>
  </Box>
);

// ❌ Incorrect - single boundary around everything (cascading failures)
return (
  <ErrorBoundary scope="order-summary" fallback={<></>}>
    <Box>
      <YourPlanSection productSpecs={productSpecs} price={price} />
      <PromotionsAppliedSection hasDiscount={hasDiscount} />
      <FirstBoxTotalSection price={price} />
    </Box>
  </ErrorBoundary>
);
```

**How to Verify:**
```bash
# Check all feature components have error boundaries
grep -r "export.*Component" app/features/new-feature/ | \
  xargs -I {} grep -L "ErrorBoundary" {}

# Verify scope naming patterns
grep -r "scope=" app/features/new-feature/ | \
  grep -v -E 'scope="[a-z-]+\.[a-z-]+"'

# Check for missing fallback props
grep -r "<ErrorBoundary" app/features/new-feature/ | \
  grep -v "fallback="
```

**Expected Result:**
- Every feature component wrapped in ErrorBoundary (85% frequency)
- All boundaries have descriptive scope strings
- All boundaries have fallback UI (even if empty `<></>`)

---

### 2. React Query Error Callbacks

**Requirement:** All React Query hooks must handle errors through onError callbacks that update local error state.

**Verification Steps:**

✅ **Check useQuery error handling:**
```typescript
// ✅ Correct - error callback with state update
const [hasError, setHasError] = useState(false);
const { data: voucherData, isError } = useVoucherInfo(
  couponCode,
  {
    suspense: false,
    enabled: !!couponCode,
    onError: (error) => {
      setHasError(true);
      console.error('Voucher fetch failed:', error);
    },
  }
);

// ❌ Incorrect - no error handling
const { data: voucherData } = useVoucherInfo(couponCode);

// ❌ Incorrect - missing onError callback
const { data: voucherData } = useVoucherInfo(
  couponCode,
  {
    suspense: false,
    enabled: !!couponCode,
  }
);
```

✅ **Verify error state management:**
```typescript
// ✅ Correct - tracking error state separately
const [hasVoucherError, setHasVoucherError] = useState(false);
const [hasPriceError, setHasPriceError] = useState(false);

const { data: voucherData } = useVoucherInfo(
  couponCode,
  {
    suspense: false,
    onError: () => setHasVoucherError(true),
  }
);

const { data: priceData } = useGetPricePresentation(
  { productSku, price },
  {
    suspense: false,
    onError: () => setHasPriceError(true),
  }
);

// ❌ Incorrect - relying only on isError from query
const { data, isError } = useVoucherInfo(couponCode);
// isError resets on refetch, losing error state
```

✅ **Check error callback patterns:**
```typescript
// ✅ Good - comprehensive error handling
const { data, refetch } = useDeliveryOptions(
  postcode,
  {
    suspense: false,
    enabled: !!postcode,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    onError: (error) => {
      setHasError(true);
      setErrorMessage(getErrorMessage(error));
      // Optional: Log to error tracking service
      trackError('delivery-options-fetch-failed', {
        postcode,
        error: error.message,
      });
    },
    onSuccess: () => {
      // Reset error state on successful retry
      setHasError(false);
      setErrorMessage(null);
    },
  }
);

// ✅ Good - different error states for different queries
const [fetchErrors, setFetchErrors] = useState({
  voucher: false,
  pricing: false,
  delivery: false,
});

const { data: voucherData } = useVoucherInfo(couponCode, {
  onError: () => setFetchErrors(prev => ({ ...prev, voucher: true })),
});

const { data: pricingData } = usePricing(productSku, {
  onError: () => setFetchErrors(prev => ({ ...prev, pricing: true })),
});
```

✅ **Verify suspense: false is set:**
```typescript
// ✅ Correct - suspense disabled for error handling
const { data } = useQuery(
  ['key'],
  fetchData,
  {
    suspense: false,  // Required for onError to work
    onError: handleError,
  }
);

// ❌ Incorrect - suspense: true with onError (onError won't be called)
const { data } = useQuery(
  ['key'],
  fetchData,
  {
    suspense: true,
    onError: handleError,  // This won't fire with suspense
  }
);
```

**How to Verify:**
```bash
# Check all useQuery calls have onError
grep -r "useQuery\|useVoucherInfo\|useGetPricePresentation" app/features/new-feature/ -A 10 | \
  grep -L "onError"

# Verify suspense: false when using onError
grep -r "onError:" app/features/new-feature/ -B 5 | \
  grep "suspense: true"

# Check error state declarations
grep -r "useState.*error\|useState.*Error" app/features/new-feature/
```

**Expected Result:**
- 80% of React Query hooks have onError callbacks
- Error state managed with useState
- suspense: false when using error callbacks

---

### 3. Graceful Degradation with Partial Data

**Requirement:** Components must handle partial data gracefully, showing available content even when some data fails to load.

**Verification Steps:**

✅ **Check optional chaining for data access:**
```typescript
// ✅ Correct - safe data access with fallbacks
const isValidReviewSummary =
  (reviewSummaryHighlights?.length ?? 0) > 0 ||
  (reviewSummaryParagraph?.length ?? 0) > 0;

const firstName = userData?.profile?.firstName ?? 'Guest';

const itemCount = cartData?.items?.length ?? 0;

// ❌ Incorrect - direct property access (will throw if undefined)
const isValidReviewSummary =
  reviewSummaryHighlights.length > 0 ||
  reviewSummaryParagraph.length > 0;

const firstName = userData.profile.firstName;
```

✅ **Verify conditional rendering with data availability:**
```typescript
// ✅ Correct - renders available sections independently
return (
  <Box display="flex" flexDirection="column" gap="global.sm-2">
    {/* Always show plan section */}
    <YourPlanSection productSpecs={productSpecs} price={price} />

    {/* Only show if voucher data loaded successfully */}
    {voucherData && !hasVoucherError && (
      <PromotionsAppliedSection
        hasDiscount={hasDiscount}
        voucherData={voucherData}
      />
    )}

    {/* Show promotions input even if data failed */}
    <AddPromotionsSection
      couponCode={couponCode}
      productSku={productSku}
      price={price}
      hasError={hasVoucherError}
    />

    {/* Always show total with fallback calculations */}
    <FirstBoxTotalSection
      price={pricingData?.finalPrice ?? price}
      hasDiscount={hasDiscount}
    />
  </Box>
);

// ❌ Incorrect - all-or-nothing rendering
if (!voucherData || !pricingData) {
  return <ErrorState />;
}
return <FullOrderSummary {...allData} />;
```

✅ **Check loading and error state composition:**
```typescript
// ✅ Correct - independent loading/error states per section
const { data: voucherData, isLoading: isLoadingVoucher } = useVoucherInfo(couponCode);
const { data: priceData, isLoading: isLoadingPrice } = usePricing(productSku);

return (
  <Box>
    {/* Show loading state only for specific section */}
    {isLoadingVoucher ? (
      <Skeleton height="40px" />
    ) : voucherData ? (
      <VoucherDisplay data={voucherData} />
    ) : null}

    {/* Other sections render independently */}
    {isLoadingPrice ? (
      <Skeleton height="60px" />
    ) : (
      <PriceDisplay price={priceData?.total ?? basePrice} />
    )}
  </Box>
);

// ❌ Incorrect - single loading state blocks everything
if (isLoadingVoucher || isLoadingPrice) {
  return <LoadingSpinner />;
}
```

✅ **Verify fallback value patterns:**
```typescript
// ✅ Correct - sensible defaults for missing data
const renderPrice = (formattedPrice: string, isFetching: boolean) => {
  if (isFetching) {
    return <Skeleton width="60px" height="20px" />;
  }
  return formattedPrice || '—';  // Em dash for unavailable price
};

const displayName = userData?.name ?? 'Guest';
const itemCount = cartData?.items?.length ?? 0;
const deliveryDate = selectedDate ?? firstAvailableDate ?? 'Not selected';

// ❌ Incorrect - no fallbacks (shows undefined/null in UI)
const displayName = userData?.name;
const itemCount = cartData?.items?.length;
const deliveryDate = selectedDate;
```

✅ **Check retry mechanisms:**
```typescript
// ✅ Good - manual retry for failed queries
const { data, isError, refetch } = useDeliveryOptions(postcode, {
  suspense: false,
  retry: 3,
  onError: () => setHasError(true),
});

if (isError) {
  return (
    <ErrorState
      message="Failed to load delivery options"
      onRetry={refetch}
    />
  );
}

// ✅ Good - retry button in error UI
{hasError && (
  <Box padding="global.md-1">
    <Text color="shared-alias.negative.foreground.default">
      Failed to load voucher information
    </Text>
    <Button.Secondary size="sm" onClick={() => refetch()}>
      Retry
    </Button.Secondary>
  </Box>
)}
```

**How to Verify:**
```bash
# Check for optional chaining usage
grep -r "?\..*??" app/features/new-feature/

# Find components that might not handle partial data
grep -r "if (!.*data)" app/features/new-feature/

# Check for fallback values
grep -r "?? " app/features/new-feature/
```

**Expected Result:**
- Optional chaining used throughout data access
- Conditional rendering allows partial UI display
- Fallback values prevent undefined in UI
- Retry mechanisms for failed queries

---

### 4. Error Logging and Monitoring

**Requirement:** Errors must be logged appropriately for debugging and monitoring purposes.

**Verification Steps:**

✅ **Check error logging in callbacks:**
```typescript
// ✅ Correct - descriptive error logging
const { data } = useVoucherInfo(
  couponCode,
  {
    suspense: false,
    onError: (error) => {
      console.error('Voucher fetch failed:', {
        couponCode,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      setHasError(true);
    },
  }
);

// ❌ Incorrect - silent error (no logging)
const { data } = useVoucherInfo(
  couponCode,
  {
    suspense: false,
    onError: () => {
      setHasError(true);  // Error state set but not logged
    },
  }
);

// ❌ Incorrect - minimal context
const { data } = useVoucherInfo(
  couponCode,
  {
    suspense: false,
    onError: (error) => {
      console.error(error);  // No context about what failed
    },
  }
);
```

✅ **Verify error tracking service integration:**
```typescript
// ✅ Good - integration with error tracking (e.g., Sentry)
import { captureException } from '@/libs/error-tracking';

const { data } = useDeliveryOptions(
  postcode,
  {
    suspense: false,
    onError: (error) => {
      // Log to console for development
      console.error('Delivery options fetch failed:', error);

      // Send to error tracking service
      captureException(error, {
        context: 'delivery-options',
        tags: {
          feature: 'checkout',
          postcode,
        },
        extra: {
          userAction: 'delivery-date-selection',
        },
      });

      setHasError(true);
    },
  }
);

// ✅ Good - custom error tracking utility
import { trackError } from '@/libs/analytics';

onError: (error) => {
  trackError('voucher-validation-failed', {
    couponCode,
    errorType: error.name,
    errorMessage: error.message,
  });
  setHasError(true);
}
```

✅ **Check ErrorBoundary error reporting:**
```typescript
// ✅ Good - ErrorBoundary with error reporting
import { ErrorBoundary } from '@/libs/error-boundary';

// The ErrorBoundary component should internally report to error tracking
<ErrorBoundary
  scope="checkout.delivery-options"
  fallback={<DeliveryErrorFallback />}
  onError={(error, errorInfo) => {
    // This callback should be implemented in the ErrorBoundary library
    console.error('Error caught by boundary:', { error, errorInfo });
    captureException(error, {
      context: 'checkout.delivery-options',
      componentStack: errorInfo.componentStack,
    });
  }}
>
  <DeliveryOptionsComponent />
</ErrorBoundary>
```

✅ **Verify user-facing error messages:**
```typescript
// ✅ Correct - friendly error messages for users
const getErrorMessage = (error: Error): string => {
  // Log technical error
  console.error('Technical error:', error);

  // Return user-friendly message
  if (error.message.includes('network')) {
    return 'Unable to connect. Please check your internet connection.';
  }
  if (error.message.includes('timeout')) {
    return 'Request took too long. Please try again.';
  }
  if (error.message.includes('404')) {
    return 'The requested information could not be found.';
  }
  return 'Something went wrong. Please try again later.';
};

{hasError && (
  <Text color="shared-alias.negative.foreground.default">
    {errorMessage || 'An error occurred'}
  </Text>
)}

// ❌ Incorrect - exposing technical errors to users
{hasError && (
  <Text color="shared-alias.negative.foreground.default">
    {error.message}  {/* Shows "Failed to fetch" or stack traces */}
  </Text>
)}
```

✅ **Check development vs production logging:**
```typescript
// ✅ Good - conditional logging based on environment
const logError = (context: string, error: Error, metadata?: object) => {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${context}]`, error, metadata);
  }

  // Always send to monitoring in production
  if (process.env.NODE_ENV === 'production') {
    captureException(error, {
      context,
      extra: metadata,
    });
  }
};

// Usage
onError: (error) => {
  logError('voucher-fetch', error, { couponCode, productSku });
  setHasError(true);
}
```

**How to Verify:**
```bash
# Check error logging presence
grep -r "onError:" app/features/new-feature/ -A 5 | \
  grep "console.error\|captureException\|trackError"

# Verify user-facing error messages
grep -r "error.message" app/features/new-feature/

# Check for error tracking imports
grep -r "from '@/libs/error-tracking'\|from '@/libs/analytics'" app/features/new-feature/
```

**Expected Result:**
- All errors logged with context
- Error tracking service integration for production
- User-friendly error messages (no technical details exposed)
- Development-only verbose logging

---

### 5. Error State UI Patterns

**Requirement:** Error states must provide clear feedback and recovery options to users.

**Verification Steps:**

✅ **Check error state components:**
```typescript
// ✅ Good - dedicated error state component
interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  canRetry?: boolean;
}

const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  canRetry = true,
}) => (
  <Box
    display="flex"
    flexDirection="column"
    alignItems="center"
    padding="global.lg-1"
    gap="global.md-1"
  >
    <WarningOutline32 color="shared-alias.negative.foreground.default" />
    <Text type="heading-md" textAlign="center">
      {title}
    </Text>
    <Text
      type="body-md-regular"
      color="global.gray.600"
      textAlign="center"
    >
      {message}
    </Text>
    {canRetry && onRetry && (
      <Button.Secondary size="md" onClick={onRetry}>
        Try Again
      </Button.Secondary>
    )}
  </Box>
);

// Usage
{hasError && (
  <ErrorState
    message="Unable to load delivery options"
    onRetry={refetch}
  />
)}
```

✅ **Verify inline error messages:**
```typescript
// ✅ Correct - inline error with context
{hasVoucherError && (
  <Box
    padding="global.sm-2"
    backgroundColor="shared-alias.negative.background.subtle"
    borderRadius="global.sm"
  >
    <Box display="flex" gap="global.xs" alignItems="center">
      <AlertCircleOutline24 color="shared-alias.negative.foreground.default" />
      <Text
        type="body-sm-regular"
        color="shared-alias.negative.foreground.default"
      >
        Unable to validate voucher code. Please try again or continue without it.
      </Text>
    </Box>
  </Box>
)}

// ❌ Incorrect - plain text error (no visual hierarchy)
{hasVoucherError && (
  <Text>Error loading voucher</Text>
)}
```

✅ **Check loading skeleton for error recovery:**
```typescript
// ✅ Good - skeleton during retry/refetch
const { data, isLoading, isError, isFetching, refetch } = useQuery(
  ['delivery-options', postcode],
  () => fetchDeliveryOptions(postcode),
  {
    suspense: false,
    onError: () => setHasError(true),
  }
);

if (isLoading || isFetching) {
  return (
    <Box display="flex" flexDirection="column" gap="global.sm-2">
      <Skeleton height="40px" />
      <Skeleton height="60px" />
      <Skeleton height="40px" />
    </Box>
  );
}

if (isError) {
  return <ErrorState message="Failed to load" onRetry={refetch} />;
}

return <DeliveryOptionsContent data={data} />;
```

✅ **Verify error state accessibility:**
```typescript
// ✅ Correct - accessible error messages
{hasError && (
  <Box
    role="alert"
    aria-live="polite"
    data-test-id="error-message"
  >
    <Text color="shared-alias.negative.foreground.default">
      {errorMessage}
    </Text>
  </Box>
)}

// ❌ Incorrect - missing accessibility attributes
{hasError && (
  <div>
    <span style={{ color: 'red' }}>{errorMessage}</span>
  </div>
)}
```

**How to Verify:**
```bash
# Check for error state components
grep -r "ErrorState\|ErrorFallback" app/features/new-feature/

# Verify error UI uses Zest components
grep -r "hasError" app/features/new-feature/ -A 5 | \
  grep -E "Box|Text|Button"

# Check accessibility attributes
grep -r "hasError" app/features/new-feature/ -A 5 | \
  grep "role=\"alert\"\|aria-live"
```

**Expected Result:**
- Dedicated error state components with retry options
- Error messages use design system components
- Accessible error announcements
- Clear visual hierarchy for errors

---

### 6. Network Error Handling

**Requirement:** Network-specific errors must be handled with appropriate retry logic and user feedback.

**Verification Steps:**

✅ **Check retry configuration:**
```typescript
// ✅ Correct - exponential backoff retry strategy
const { data } = useQuery(
  ['delivery-options', postcode],
  () => fetchDeliveryOptions(postcode),
  {
    suspense: false,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    onError: (error) => {
      console.error('Delivery options fetch failed after 3 retries:', error);
      setHasError(true);
    },
  }
);

// ✅ Good - conditional retry based on error type
const { data } = useQuery(
  ['user-profile'],
  fetchUserProfile,
  {
    suspense: false,
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors (client errors)
      if (error.status >= 400 && error.status < 500) {
        return false;
      }
      // Retry up to 3 times for 5xx errors (server errors)
      return failureCount < 3;
    },
    retryDelay: 1000,
  }
);

// ❌ Incorrect - no retry configuration
const { data } = useQuery(['key'], fetchData);
```

✅ **Verify network error detection:**
```typescript
// ✅ Good - checking for network errors specifically
const { data, error } = useQuery(
  ['delivery-options'],
  fetchDeliveryOptions,
  {
    suspense: false,
    onError: (error) => {
      if (error.message.includes('network') || error.message.includes('fetch')) {
        setErrorType('network');
        setErrorMessage('Unable to connect. Please check your internet connection.');
      } else if (error.status === 500) {
        setErrorType('server');
        setErrorMessage('Server error. Please try again later.');
      } else {
        setErrorType('unknown');
        setErrorMessage('Something went wrong. Please try again.');
      }
    },
  }
);

// Display different UI based on error type
{errorType === 'network' && (
  <ErrorState
    icon={<WifiOffOutline32 />}
    message="No internet connection"
    onRetry={refetch}
  />
)}
```

✅ **Check timeout configuration:**
```typescript
// ✅ Good - custom timeout for slow networks
const { data } = useQuery(
  ['delivery-options', postcode],
  async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please try again');
      }
      throw error;
    }
  },
  {
    suspense: false,
    retry: 2,
  }
);
```

**How to Verify:**
```bash
# Check retry configurations
grep -r "useQuery" app/features/new-feature/ -A 10 | \
  grep -E "retry:|retryDelay:"

# Verify timeout handling
grep -r "setTimeout\|AbortController" app/features/new-feature/
```

**Expected Result:**
- Retry logic configured for all network requests
- Network-specific error messages
- Timeout handling for slow connections

---

## Testing Verification

### Unit Tests for Error Handling

```typescript
describe('Error Handling', () => {
  it('should render error boundary fallback when component throws', () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };

    const { getByText } = render(
      <ErrorBoundary scope="test.component" fallback={<div>Error occurred</div>}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(getByText('Error occurred')).toBeInTheDocument();
  });

  it('should call onError callback when query fails', async () => {
    const onError = jest.fn();
    const mockFetch = jest.fn().mockRejectedValue(new Error('Network error'));

    const { result, waitFor } = renderHook(
      () => useQuery(['test'], mockFetch, {
        suspense: false,
        retry: false,
        onError,
      })
    );

    await waitFor(() => result.current.isError);

    expect(onError).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Network error',
    }));
  });

  it('should show error state and allow retry', async () => {
    const mockFetch = jest.fn()
      .mockRejectedValueOnce(new Error('Failed'))
      .mockResolvedValueOnce({ data: 'success' });

    const { getByText, getByTestId } = render(<ComponentWithRetry />);

    // Wait for error state
    await waitFor(() => {
      expect(getByText(/something went wrong/i)).toBeInTheDocument();
    });

    // Click retry button
    const retryButton = getByTestId('retry-button');
    fireEvent.click(retryButton);

    // Wait for success
    await waitFor(() => {
      expect(getByText('success')).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should gracefully handle partial data', () => {
    const partialData = {
      voucher: null,  // Failed to load
      pricing: { total: 29.99 },  // Loaded successfully
    };

    const { getByText, queryByTestId } = render(
      <OrderSummary data={partialData} />
    );

    // Should show price even without voucher
    expect(getByText('€29.99')).toBeInTheDocument();

    // Should not show voucher section
    expect(queryByTestId('voucher-section')).not.toBeInTheDocument();
  });

  it('should use fallback values for missing data', () => {
    const { getByText } = render(
      <UserProfile userData={undefined} />
    );

    // Should show fallback instead of undefined
    expect(getByText('Guest')).toBeInTheDocument();
  });
});
```

### Integration Tests for Error Scenarios

```typescript
describe('Integration: Error Scenarios', () => {
  it('should handle multiple query failures independently', async () => {
    // Mock different endpoints with different results
    mockServer.use(
      rest.get('/api/voucher', (req, res, ctx) => {
        return res(ctx.status(500));
      }),
      rest.get('/api/pricing', (req, res, ctx) => {
        return res(ctx.json({ total: 29.99 }));
      })
    );

    const { getByTestId, queryByTestId } = render(<OrderReviewSection />);

    await waitFor(() => {
      // Voucher section should show error
      expect(getByTestId('voucher-error')).toBeInTheDocument();

      // Pricing section should show successfully
      expect(getByTestId('pricing-display')).toBeInTheDocument();
      expect(getByTestId('pricing-display')).toHaveTextContent('€29.99');

      // Overall component should still render
      expect(queryByTestId('order-review-section')).toBeInTheDocument();
    });
  });

  it('should recover from error on retry', async () => {
    let callCount = 0;
    mockServer.use(
      rest.get('/api/delivery-options', (req, res, ctx) => {
        callCount++;
        if (callCount === 1) {
          return res(ctx.status(500));
        }
        return res(ctx.json({ options: ['Next day', 'Standard'] }));
      })
    );

    const { getByText, getByTestId } = render(<DeliveryOptions />);

    // First load shows error
    await waitFor(() => {
      expect(getByText(/failed to load/i)).toBeInTheDocument();
    });

    // Click retry
    fireEvent.click(getByTestId('retry-button'));

    // Should show data after retry
    await waitFor(() => {
      expect(getByText('Next day')).toBeInTheDocument();
      expect(getByText('Standard')).toBeInTheDocument();
    });
  });
});
```

### E2E Tests with Cypress

```typescript
describe('E2E: Error Handling', () => {
  beforeEach(() => {
    cy.bootstrap();
  });

  afterEach(() => {
    cy.teardown();
  });

  it('should handle network errors gracefully', () => {
    // Intercept and fail API call
    cy.intercept('GET', '/api/delivery-options', {
      statusCode: 500,
      body: { error: 'Internal Server Error' },
    }).as('deliveryOptionsError');

    cy.visit('/checkout');

    // Wait for error response
    cy.wait('@deliveryOptionsError');

    // Should show error message
    cy.get('[data-test-id="delivery-options-error"]')
      .should('be.visible')
      .and('contain', 'Unable to load delivery options');

    // Should show retry button
    cy.get('[data-test-id="retry-button"]').should('be.visible');

    // Other sections should still work
    cy.get('[data-test-id="order-summary"]').should('be.visible');
  });

  it('should retry failed request successfully', () => {
    let requestCount = 0;

    cy.intercept('GET', '/api/voucher-info', (req) => {
      requestCount++;
      if (requestCount === 1) {
        req.reply({ statusCode: 500 });
      } else {
        req.reply({ statusCode: 200, body: { discount: 10 } });
      }
    }).as('voucherInfo');

    cy.visit('/checkout');

    // First request fails
    cy.wait('@voucherInfo');
    cy.get('[data-test-id="voucher-error"]').should('be.visible');

    // Click retry
    cy.get('[data-test-id="retry-button"]').click();

    // Second request succeeds
    cy.wait('@voucherInfo');
    cy.get('[data-test-id="voucher-discount"]')
      .should('be.visible')
      .and('contain', '€10');
  });

  it('should show partial UI when some data fails', () => {
    // Let some endpoints succeed and others fail
    cy.intercept('GET', '/api/pricing', {
      statusCode: 200,
      body: { total: 29.99 },
    });

    cy.intercept('GET', '/api/voucher-info', {
      statusCode: 500,
    });

    cy.visit('/checkout/review');

    // Pricing should display
    cy.get('[data-test-id="total-price"]')
      .should('be.visible')
      .and('contain', '€29.99');

    // Voucher section should show error but not block other content
    cy.get('[data-test-id="voucher-error"]').should('be.visible');

    // User can still proceed
    cy.get('[data-test-id="continue-button"]').should('be.enabled');
  });
});
```

---

## Common Issues and Fixes

### Issue 1: Missing Error Boundaries

**Problem:**
```typescript
// No error boundary wrapping
export const FeatureComponent = () => {
  return <ComplexFeature />;
};
```

**Fix:**
```typescript
import { ErrorBoundary } from '@/libs/error-boundary';

export const FeatureComponent = () => {
  return (
    <ErrorBoundary
      scope="feature.complex-feature"
      fallback={<FeatureErrorState />}
    >
      <ComplexFeature />
    </ErrorBoundary>
  );
};
```

### Issue 2: No Error Callbacks on Queries

**Problem:**
```typescript
const { data } = useVoucherInfo(couponCode);
// Errors are not handled
```

**Fix:**
```typescript
const [hasError, setHasError] = useState(false);
const { data } = useVoucherInfo(
  couponCode,
  {
    suspense: false,
    enabled: !!couponCode,
    onError: (error) => {
      console.error('Voucher fetch failed:', error);
      setHasError(true);
    },
  }
);

{hasError && (
  <ErrorMessage
    message="Unable to load voucher information"
    onRetry={refetch}
  />
)}
```

### Issue 3: All-or-Nothing Data Rendering

**Problem:**
```typescript
if (!voucherData || !pricingData || !deliveryData) {
  return <FullPageError />;
}
return <FullOrderSummary {...allData} />;
```

**Fix:**
```typescript
return (
  <Box>
    {/* Always show plan section */}
    <PlanSection />

    {/* Conditionally show voucher section */}
    {voucherData && <VoucherSection data={voucherData} />}
    {!voucherData && hasVoucherError && (
      <InlineError message="Voucher info unavailable" />
    )}

    {/* Show pricing with fallback */}
    <PricingSection price={pricingData?.total ?? basePrice} />

    {/* Show delivery or error inline */}
    {deliveryData ? (
      <DeliverySection data={deliveryData} />
    ) : hasDeliveryError ? (
      <InlineError message="Delivery options unavailable" />
    ) : (
      <Skeleton height="60px" />
    )}
  </Box>
);
```

### Issue 4: Exposing Technical Errors to Users

**Problem:**
```typescript
{hasError && (
  <Text color="red">
    {error.message}  {/* "Failed to fetch", "Network error", etc. */}
  </Text>
)}
```

**Fix:**
```typescript
const getUserFriendlyMessage = (error: Error): string => {
  console.error('Technical error:', error);  // Log for debugging

  if (error.message.includes('network')) {
    return 'Unable to connect. Please check your internet connection.';
  }
  if (error.message.includes('timeout')) {
    return 'Request took too long. Please try again.';
  }
  return 'Something went wrong. Please try again later.';
};

{hasError && (
  <Text color="shared-alias.negative.foreground.default">
    {getUserFriendlyMessage(error)}
  </Text>
)}
```

### Issue 5: No Retry Logic

**Problem:**
```typescript
const { data, isError } = useQuery(['key'], fetchData);

if (isError) {
  return <div>Error occurred</div>;  // No way to retry
}
```

**Fix:**
```typescript
const { data, isError, refetch } = useQuery(
  ['key'],
  fetchData,
  {
    suspense: false,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  }
);

if (isError) {
  return (
    <ErrorState
      message="Failed to load data"
      onRetry={refetch}
    />
  );
}
```

### Issue 6: Silent Failures

**Problem:**
```typescript
const { data } = useQuery(
  ['key'],
  fetchData,
  {
    onError: () => {
      setHasError(true);  // Error not logged anywhere
    },
  }
);
```

**Fix:**
```typescript
const { data } = useQuery(
  ['key'],
  fetchData,
  {
    onError: (error) => {
      console.error('Data fetch failed:', {
        key: 'key',
        error: error.message,
        timestamp: new Date().toISOString(),
      });

      // Send to monitoring service in production
      if (process.env.NODE_ENV === 'production') {
        captureException(error, {
          context: 'data-fetch',
          tags: { feature: 'checkout' },
        });
      }

      setHasError(true);
    },
  }
);
```

---

## Verification Summary

**Before marking implementation as complete, verify:**

- [ ] All feature components wrapped in ErrorBoundary with scope (85% frequency)
- [ ] All ErrorBoundary components have descriptive scope strings
- [ ] All ErrorBoundary components have fallback UI
- [ ] All React Query hooks have onError callbacks (80% frequency)
- [ ] Error state managed with useState
- [ ] suspense: false when using onError callbacks
- [ ] Optional chaining used for all data access
- [ ] Fallback values prevent undefined in UI
- [ ] Conditional rendering allows partial UI display
- [ ] Retry mechanisms implemented for failed queries
- [ ] Errors logged with context and metadata
- [ ] User-friendly error messages (no technical details)
- [ ] Error tracking service integration (production)
- [ ] Error state components with retry options
- [ ] Accessible error announcements (role="alert", aria-live)
- [ ] Retry configuration with exponential backoff
- [ ] Network-specific error detection and handling

**Related Verifiers:**
- **react-component-architecture.md** - Component error boundary placement
- **state-management.md** - Error state with React Query and Jotai
- **data-access-layer.md** - API error handling patterns
- **testing-practices.md** - Error scenario test coverage
