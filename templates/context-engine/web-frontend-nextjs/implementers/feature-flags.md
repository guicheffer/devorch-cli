---
domain: feature-flags
description: Feature flags with Statsig for progressive rollouts, A/B testing, and feature gating
---

# Feature Flags (Statsig)

Implement feature flags using Statsig for progressive feature rollouts, A/B testing, and feature gating. This guide covers the complete pattern from component-level gates to E2E test bypassing.

## Core Patterns

### 1. Statsig Hooks for Feature Gates

**Pattern:** Use `useGate` hook from `statsig-react` to check if a feature is enabled for the current user.

**Example from PR #60787:**
```typescript
import { useGate } from 'statsig-react';

const DirectToAgentButton: React.FC = () => {
  // Check if direct-to-agent feature is enabled
  const isDirectToAgentEnabled = useGate('direct_to_agent_feature');

  if (!isDirectToAgentEnabled) {
    return null; // Feature not enabled, hide component
  }

  return (
    <Button onClick={handleDirectToAgent}>
      Contact Agent Directly
    </Button>
  );
};
```

**Basic Usage Pattern:**
```typescript
import { useGate } from 'statsig-react';

const MyComponent: React.FC = () => {
  // Simple boolean gate check
  const isNewFeatureEnabled = useGate('new_feature_gate');

  return (
    <div>
      {isNewFeatureEnabled ? (
        <NewFeature />
      ) : (
        <OldFeature />
      )}
    </div>
  );
};
```

**Frequency:** 100% of feature flag checks

**Why useGate:**
- Returns boolean value (true/false)
- Automatically tracks exposure events
- Works with Statsig's targeting rules
- Zero config needed for basic gates

**Gate Naming Convention:**
```typescript
// ✅ Good gate names (kebab-case with context)
useGate('checkout-express-delivery')
useGate('recipe-detail-reviews-v2')
useGate('user-preferences-save-button')

// ❌ Avoid unclear names
useGate('new_feature')
useGate('test123')
useGate('enableFlag')
```

### 2. Statsig Configs for Parameterized Features

**Pattern:** Use `useConfig` hook to retrieve configuration parameters for a feature.

**Example from PR #60787:**
```typescript
import { useConfig } from 'statsig-react';

const ChatWidget: React.FC = () => {
  // Get config object with parameters
  const chatConfig = useConfig('chat_widget_config');

  // Access config values with type safety
  const maxIdleTimeMs = chatConfig.get<number>('max_idle_time_ms', 300000);
  const showWelcomeMessage = chatConfig.get<boolean>('show_welcome_message', true);
  const welcomeText = chatConfig.get<string>('welcome_text', 'Hello! How can we help?');
  const agentAvailabilityHours = chatConfig.get<string[]>('availability_hours', ['9am-5pm']);

  return (
    <ChatBox
      idleTimeout={maxIdleTimeMs}
      welcomeMessage={showWelcomeMessage ? welcomeText : undefined}
      availabilityHours={agentAvailabilityHours}
    />
  );
};
```

**Config with Multiple Parameters:**
```typescript
import { useConfig } from 'statsig-react';

const PricingComponent: React.FC = () => {
  const pricingConfig = useConfig('pricing_experiment');

  // Extract multiple related parameters
  const showDiscount = pricingConfig.get<boolean>('show_discount', false);
  const discountPercentage = pricingConfig.get<number>('discount_percentage', 0);
  const badgeColor = pricingConfig.get<string>('badge_color', 'red');
  const ctaText = pricingConfig.get<string>('cta_text', 'Subscribe Now');
  const features = pricingConfig.get<string[]>('included_features', []);

  return (
    <PricingCard
      discount={showDiscount ? discountPercentage : 0}
      badgeColor={badgeColor}
      ctaText={ctaText}
      features={features}
    />
  );
};
```

**Frequency:** 100% of parameterized features

**Why useConfig:**
- Returns typed configuration values
- Supports complex parameter types (objects, arrays)
- Provides default values for safety
- Perfect for A/B test variations
- Allows server-side parameter updates without deployment

**Config vs Gate Decision:**
```typescript
// ✅ Use Gate for simple on/off toggles
const isFeatureEnabled = useGate('new_checkout_flow');

// ✅ Use Config for parameterized features
const checkoutConfig = useConfig('checkout_experiment');
const variant = checkoutConfig.get<string>('variant', 'control');
const timeout = checkoutConfig.get<number>('timeout_ms', 5000);

// ✅ Combine both for complex features
const isFeatureEnabled = useGate('new_checkout_flow');
const checkoutConfig = useConfig('checkout_experiment');

if (isFeatureEnabled) {
  const variant = checkoutConfig.get<string>('variant', 'control');
  // Render based on variant
}
```

### 3. Experiment Bypass in Cypress Tests

**Pattern:** Use `cy.bypassExperimentationSetup` to control feature flag states during E2E testing.

**Example from PR #60717:**
```typescript
describe('Extended Funnel Flow E2E', () => {
  beforeEach(() => {
    cy.bootstrap();

    // Set up feature flag state for test
    cy.bypassExperimentationSetup({
      experimentKey: 'uscro-7882_extended-funnel-test',
      returnDesiredObject: {
        variationKey: 'variation_1',
        parameters: {
          show_shipping_options: true,
          enable_express_checkout: true,
        },
      },
    });
  });

  afterEach(() => {
    cy.teardown();
  });

  it('should complete extended funnel with new features enabled', () => {
    cy.visit('/plans');

    // Test expects features to be enabled
    cy.get('[data-test-id="express-checkout-button"]').should('be.visible');
    cy.get('[data-test-id="shipping-options"]').should('be.visible');
  });
});
```

**Testing Different Variations:**
```typescript
describe('Pricing Page A/B Test', () => {
  describe('Control Variation', () => {
    beforeEach(() => {
      cy.bootstrap();
      cy.bypassExperimentationSetup({
        experimentKey: 'pricing_page_experiment',
        returnDesiredObject: {
          variationKey: 'control',
          parameters: {
            show_discount: false,
            cta_text: 'Subscribe Now',
          },
        },
      });
    });

    afterEach(() => {
      cy.teardown();
    });

    it('should show control pricing layout', () => {
      cy.visit('/pricing');
      cy.get('[data-test-id="pricing-cta"]').should('contain', 'Subscribe Now');
      cy.get('[data-test-id="discount-badge"]').should('not.exist');
    });
  });

  describe('Treatment Variation', () => {
    beforeEach(() => {
      cy.bootstrap();
      cy.bypassExperimentationSetup({
        experimentKey: 'pricing_page_experiment',
        returnDesiredObject: {
          variationKey: 'treatment',
          parameters: {
            show_discount: true,
            discount_percentage: 20,
            cta_text: 'Get 20% Off',
          },
        },
      });
    });

    afterEach(() => {
      cy.teardown();
    });

    it('should show treatment pricing layout with discount', () => {
      cy.visit('/pricing');
      cy.get('[data-test-id="pricing-cta"]').should('contain', 'Get 20% Off');
      cy.get('[data-test-id="discount-badge"]').should('be.visible');
      cy.get('[data-test-id="discount-badge"]').should('contain', '20%');
    });
  });
});
```

**Testing Feature Gate States:**
```typescript
describe('Feature Flag Testing', () => {
  it('should render new feature when gate is enabled', () => {
    cy.bootstrap();
    cy.bypassExperimentationSetup({
      experimentKey: 'new_checkout_flow',
      returnDesiredObject: {
        variationKey: 'enabled',
        parameters: {},
      },
    });

    cy.visit('/checkout');
    cy.get('[data-test-id="new-checkout-ui"]').should('be.visible');
  });

  it('should render old feature when gate is disabled', () => {
    cy.bootstrap();
    cy.bypassExperimentationSetup({
      experimentKey: 'new_checkout_flow',
      returnDesiredObject: {
        variationKey: 'disabled',
        parameters: {},
      },
    });

    cy.visit('/checkout');
    cy.get('[data-test-id="old-checkout-ui"]').should('be.visible');
  });
});
```

**Frequency:** 90% of E2E tests involving feature flags

**Why Bypass in Tests:**
- Ensures deterministic test results
- Tests specific feature variations
- Avoids flaky tests from random assignment
- Validates both enabled and disabled states
- Simulates production targeting rules

### 4. Feature Flag Component Composition

**Pattern:** Compose feature-gated components with fallbacks for when features are disabled.

**Example:**
```typescript
import { useGate } from 'statsig-react';
import { Suspense } from 'react';
import { ErrorBoundary } from '@/libs/error-boundary';

const CheckoutPage: React.FC = () => {
  const isNewCheckoutEnabled = useGate('new_checkout_flow');
  const isExpressDeliveryEnabled = useGate('express_delivery');

  return (
    <Box>
      {isNewCheckoutEnabled ? (
        <ErrorBoundary
          scope="checkout-new-flow"
          fallback={<LegacyCheckoutFlow />}
        >
          <Suspense fallback={<CheckoutSkeleton />}>
            <NewCheckoutFlow />
          </Suspense>
        </ErrorBoundary>
      ) : (
        <LegacyCheckoutFlow />
      )}

      {isExpressDeliveryEnabled && (
        <ExpressDeliveryOptions />
      )}
    </Box>
  );
};
```

**Progressive Enhancement Pattern:**
```typescript
import { useGate, useConfig } from 'statsig-react';

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  // Base feature
  const showReviews = useGate('product_reviews');

  // Enhanced features
  const showRatingSummary = useGate('product_rating_summary');
  const showReviewImages = useGate('product_review_images');

  // Configuration for review display
  const reviewConfig = useConfig('product_review_config');
  const maxReviewsToShow = reviewConfig.get<number>('max_reviews', 3);
  const sortOrder = reviewConfig.get<string>('sort_order', 'most_helpful');

  return (
    <Card>
      <ProductImage src={product.image} />
      <ProductTitle>{product.name}</ProductTitle>
      <ProductPrice>{product.price}</ProductPrice>

      {showReviews && (
        <ReviewsSection>
          {showRatingSummary && (
            <RatingSummary rating={product.rating} />
          )}

          <ReviewList
            reviews={product.reviews}
            maxReviews={maxReviewsToShow}
            sortOrder={sortOrder}
            showImages={showReviewImages}
          />
        </ReviewsSection>
      )}
    </Card>
  );
};
```

**Frequency:** 85% of components with multiple related feature flags

## Implementation Guidelines

### Setting Up Statsig Provider

**App-level setup:**
```typescript
// app/providers/StatsigProvider.tsx
import { StatsigProvider as StatsigReactProvider } from 'statsig-react';
import { useEffect, useState } from 'react';

interface StatsigProviderProps {
  children: React.ReactNode;
}

export const StatsigProvider: React.FC<StatsigProviderProps> = ({ children }) => {
  const [user, setUser] = useState({
    userID: 'anonymous',
  });

  useEffect(() => {
    // Get user information from auth
    const userId = getUserId(); // Your auth logic
    const email = getUserEmail();
    const country = getUserCountry();

    setUser({
      userID: userId || 'anonymous',
      email,
      country,
      custom: {
        locale: getLocale(),
        brand: getBrand(),
      },
    });
  }, []);

  return (
    <StatsigReactProvider
      sdkKey={process.env.NEXT_PUBLIC_STATSIG_CLIENT_KEY!}
      user={user}
      waitForInitialization={false} // Don't block rendering
      options={{
        environment: {
          tier: process.env.NEXT_PUBLIC_ENV, // 'live', 'stage', 'local'
        },
        initTimeoutMs: 3000,
      }}
    >
      {children}
    </StatsigReactProvider>
  );
};
```

**Root app integration:**
```typescript
// app/pages/_app.tsx
import { StatsigProvider } from '@/providers/StatsigProvider';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <StatsigProvider>
      <Component {...pageProps} />
    </StatsigProvider>
  );
}

export default MyApp;
```

### When to Use Feature Flags

Use feature flags for:
- ✅ Progressive rollouts of new features
- ✅ A/B testing experiments
- ✅ Kill switches for problematic features
- ✅ Gradual migrations (old → new system)
- ✅ Market-specific features (per-country rollout)
- ✅ Beta features for specific user segments
- ✅ Time-limited promotions

Don't use feature flags for:
- ❌ Static configuration (use config hooks instead)
- ❌ Translations (use useT9n instead)
- ❌ Environment variables (use process.env)
- ❌ User preferences (use state management)
- ❌ Long-lived architectural decisions

### Feature Flag Lifecycle

**1. Initial Development (Flag ON in dev, OFF in prod):**
```typescript
// In Statsig console:
// Gate: "new_payment_flow"
// Rules:
//   - Environment = 'local' → 100% enabled
//   - Environment = 'stage' → 100% enabled
//   - Environment = 'live' → 0% enabled

const PaymentPage: React.FC = () => {
  const isNewPaymentFlowEnabled = useGate('new_payment_flow');

  return isNewPaymentFlowEnabled ? (
    <NewPaymentFlow />
  ) : (
    <OldPaymentFlow />
  );
};
```

**2. Canary Release (5% of prod users):**
```typescript
// In Statsig console:
// Gate: "new_payment_flow"
// Rules:
//   - Environment = 'live' → 5% rollout (random users)
```

**3. Full Rollout (100% of prod users):**
```typescript
// In Statsig console:
// Gate: "new_payment_flow"
// Rules:
//   - Environment = 'live' → 100% enabled
```

**4. Remove Flag (after full rollout):**
```typescript
// Remove flag check, keep only new code
const PaymentPage: React.FC = () => {
  // Feature flag removed - new flow is now permanent
  return <NewPaymentFlow />;
};
```

### Targeting Specific User Segments

**By Country/Locale:**
```typescript
// In Statsig console, create targeting rule:
// Gate: "express_delivery"
// Rules:
//   - Country in ['US', 'CA', 'UK'] → 100% enabled
//   - Otherwise → 0% enabled

const DeliveryOptions: React.FC = () => {
  const isExpressDeliveryAvailable = useGate('express_delivery');

  return (
    <Box>
      <StandardDelivery />
      {isExpressDeliveryAvailable && <ExpressDelivery />}
    </Box>
  );
};
```

**By User ID (for beta testers):**
```typescript
// In Statsig console:
// Gate: "beta_features"
// Rules:
//   - UserID in [list of beta tester IDs] → 100% enabled
//   - Otherwise → 0% enabled

const AppLayout: React.FC = () => {
  const isBetaTester = useGate('beta_features');

  return (
    <Box>
      <Header />
      <MainContent />
      {isBetaTester && <BetaFeaturesBanner />}
    </Box>
  );
};
```

**By Custom Attribute:**
```typescript
// Set custom attributes in StatsigProvider
const user = {
  userID: userId,
  custom: {
    subscriptionTier: 'premium',
    accountAge: daysSinceSignup,
    hasActiveSubscription: true,
  },
};

// In Statsig console:
// Gate: "premium_features"
// Rules:
//   - custom.subscriptionTier = 'premium' → 100% enabled
//   - Otherwise → 0% enabled
```

## Testing Feature Flags

### Unit Tests with Mocked Hooks

```typescript
import { render, screen } from '@testing-library/react';
import { useGate, useConfig } from 'statsig-react';
import MyComponent from './MyComponent';

// Mock statsig-react
jest.mock('statsig-react', () => ({
  useGate: jest.fn(),
  useConfig: jest.fn(),
}));

describe('MyComponent', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('when feature is enabled', () => {
    beforeEach(() => {
      (useGate as jest.Mock).mockReturnValue(true);
    });

    it('should render new feature', () => {
      render(<MyComponent />);
      expect(screen.getByTestId('new-feature')).toBeInTheDocument();
    });
  });

  describe('when feature is disabled', () => {
    beforeEach(() => {
      (useGate as jest.Mock).mockReturnValue(false);
    });

    it('should render old feature', () => {
      render(<MyComponent />);
      expect(screen.getByTestId('old-feature')).toBeInTheDocument();
    });
  });

  describe('with config parameters', () => {
    beforeEach(() => {
      (useGate as jest.Mock).mockReturnValue(true);
      (useConfig as jest.Mock).mockReturnValue({
        get: jest.fn((key, defaultValue) => {
          const values = {
            max_items: 10,
            show_banner: true,
            variant: 'treatment',
          };
          return values[key] ?? defaultValue;
        }),
      });
    });

    it('should use config values', () => {
      render(<MyComponent />);
      expect(screen.getByTestId('max-items')).toHaveTextContent('10');
      expect(screen.getByTestId('banner')).toBeInTheDocument();
    });
  });
});
```

### Integration Tests

```typescript
import { renderHook } from '@testing-library/react-hooks';
import { StatsigProvider } from '@/providers/StatsigProvider';
import { useGate } from 'statsig-react';

describe('Feature flag integration', () => {
  const wrapper = ({ children }) => (
    <StatsigProvider>{children}</StatsigProvider>
  );

  it('should return gate value for user', async () => {
    const { result, waitFor } = renderHook(
      () => useGate('test_feature'),
      { wrapper }
    );

    await waitFor(() => {
      expect(typeof result.current).toBe('boolean');
    });
  });
});
```

### E2E Tests with Multiple Variations

```typescript
describe('Checkout Flow Experiment', () => {
  const testVariation = (variationKey: string, expectedElements: string[]) => {
    beforeEach(() => {
      cy.bootstrap();
      cy.bypassExperimentationSetup({
        experimentKey: 'checkout_flow_experiment',
        returnDesiredObject: {
          variationKey,
          parameters: getParametersForVariation(variationKey),
        },
      });
    });

    afterEach(() => {
      cy.teardown();
    });

    it(`should render ${variationKey} variation correctly`, () => {
      cy.visit('/checkout');

      expectedElements.forEach((testId) => {
        cy.get(`[data-test-id="${testId}"]`).should('be.visible');
      });
    });
  };

  describe('Control variation', () => {
    testVariation('control', [
      'standard-checkout-form',
      'payment-options',
      'submit-button',
    ]);
  });

  describe('Treatment A - Express checkout', () => {
    testVariation('treatment_a', [
      'express-checkout-form',
      'one-click-payment',
      'express-submit-button',
    ]);
  });

  describe('Treatment B - Split payment', () => {
    testVariation('treatment_b', [
      'standard-checkout-form',
      'split-payment-options',
      'payment-schedule',
      'submit-button',
    ]);
  });
});

function getParametersForVariation(variation: string) {
  const parameters = {
    control: {},
    treatment_a: {
      enable_express: true,
      enable_one_click: true,
    },
    treatment_b: {
      enable_split_payment: true,
      installments: 3,
    },
  };
  return parameters[variation] || {};
}
```

## Advanced Patterns

### Layered Feature Flags

**Pattern:** Use multiple feature flags for complex features with dependencies.

```typescript
import { useGate, useConfig } from 'statsig-react';

const ProductPage: React.FC = () => {
  // Parent feature flag
  const isReviewsEnabled = useGate('product_reviews_v2');

  // Child feature flags (only checked if parent is enabled)
  const showReviewImages = useGate('product_review_images');
  const showReviewVideos = useGate('product_review_videos');
  const showReviewSummary = useGate('product_review_summary_ai');

  // Configuration for the feature
  const reviewConfig = useConfig('product_review_config');
  const maxReviews = reviewConfig.get<number>('max_reviews', 5);

  if (!isReviewsEnabled) {
    return <ProductPageWithoutReviews />;
  }

  return (
    <ProductPageLayout>
      <ProductDetails />

      <ReviewsSection>
        {showReviewSummary && (
          <AIGeneratedSummary reviews={reviews} />
        )}

        <ReviewList
          reviews={reviews}
          maxReviews={maxReviews}
          showImages={showReviewImages}
          showVideos={showReviewVideos}
        />
      </ReviewsSection>
    </ProductPageLayout>
  );
};
```

### Dynamic Config Updates

**Pattern:** Use useEffect to respond to config changes without page reload.

```typescript
import { useConfig } from 'statsig-react';
import { useEffect } from 'react';

const NotificationBanner: React.FC = () => {
  const bannerConfig = useConfig('notification_banner');

  useEffect(() => {
    // Config can be updated server-side in Statsig console
    const message = bannerConfig.get<string>('message', '');
    const variant = bannerConfig.get<string>('variant', 'info');
    const isVisible = bannerConfig.get<boolean>('visible', false);

    if (isVisible && message) {
      // Show banner with updated message
      console.log(`Showing ${variant} banner: ${message}`);
    }
  }, [bannerConfig]); // Re-run when config changes

  const message = bannerConfig.get<string>('message', '');
  const variant = bannerConfig.get<string>('variant', 'info');
  const isVisible = bannerConfig.get<boolean>('visible', false);

  if (!isVisible || !message) {
    return null;
  }

  return (
    <Banner variant={variant}>
      {message}
    </Banner>
  );
};
```

### Feature Flag with Analytics

**Pattern:** Track feature flag exposures and conversions.

```typescript
import { useGate } from 'statsig-react';
import { useAnalytics } from '@/libs/analytics';
import { useEffect } from 'react';

const CheckoutButton: React.FC = () => {
  const isExpressCheckoutEnabled = useGate('express_checkout');
  const { trackEvent } = useAnalytics();

  // Track feature exposure
  useEffect(() => {
    trackEvent('feature_flag_exposed', {
      flag: 'express_checkout',
      enabled: isExpressCheckoutEnabled,
    });
  }, [isExpressCheckoutEnabled]);

  const handleCheckout = () => {
    // Track conversion with feature flag context
    trackEvent('checkout_started', {
      checkout_type: isExpressCheckoutEnabled ? 'express' : 'standard',
      feature_flag: 'express_checkout',
    });

    if (isExpressCheckoutEnabled) {
      startExpressCheckout();
    } else {
      startStandardCheckout();
    }
  };

  return (
    <Button onClick={handleCheckout}>
      {isExpressCheckoutEnabled ? 'Express Checkout' : 'Checkout'}
    </Button>
  );
};
```

## Anti-Patterns to Avoid

### ❌ Don't check feature flags in loops

```typescript
// ❌ Bad - calling useGate in a loop
const ProductGrid: React.FC<{ products }> = ({ products }) => {
  return (
    <Grid>
      {products.map((product) => {
        const showDiscount = useGate('product_discount'); // Wrong!
        return <ProductCard product={product} showDiscount={showDiscount} />;
      })}
    </Grid>
  );
};
```

```typescript
// ✅ Good - call useGate once at component level
const ProductGrid: React.FC<{ products }> = ({ products }) => {
  const showDiscount = useGate('product_discount'); // Call once

  return (
    <Grid>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          showDiscount={showDiscount}
        />
      ))}
    </Grid>
  );
};
```

### ❌ Don't use feature flags for static configuration

```typescript
// ❌ Bad - using feature flag for static config
const ApiClient: React.FC = () => {
  const apiUrlConfig = useConfig('api_url_config');
  const apiUrl = apiUrlConfig.get<string>('url', 'https://api.example.com');

  // This should be environment variable, not feature flag
};
```

```typescript
// ✅ Good - use config hooks for static configuration
import { useApiConfig } from '@/config';

const ApiClient: React.FC = () => {
  const { apiUrl } = useApiConfig(); // From environment config
};
```

### ❌ Don't nest feature flags without purpose

```typescript
// ❌ Bad - unnecessary nesting
const PaymentPage: React.FC = () => {
  const isNewPaymentEnabled = useGate('new_payment_flow');

  if (isNewPaymentEnabled) {
    const isExpressPaymentEnabled = useGate('express_payment');
    // Both flags are independent, no need to nest
  }
};
```

```typescript
// ✅ Good - check flags independently
const PaymentPage: React.FC = () => {
  const isNewPaymentEnabled = useGate('new_payment_flow');
  const isExpressPaymentEnabled = useGate('express_payment');

  if (isNewPaymentEnabled) {
    return <NewPaymentFlow showExpress={isExpressPaymentEnabled} />;
  }

  return <OldPaymentFlow />;
};
```

### ❌ Don't use feature flags for user preferences

```typescript
// ❌ Bad - using feature flag for user preference
const Settings: React.FC = () => {
  const darkModeEnabled = useGate('dark_mode'); // Wrong - this is a user preference
};
```

```typescript
// ✅ Good - use state management for user preferences
import { useUserPreferences } from '@/libs/user-preferences';

const Settings: React.FC = () => {
  const { darkMode, setDarkMode } = useUserPreferences();
};
```

### ❌ Don't forget fallbacks for disabled features

```typescript
// ❌ Bad - no fallback when feature is disabled
const ProductPage: React.FC = () => {
  const showReviews = useGate('product_reviews');

  return (
    <Box>
      <ProductDetails />
      {showReviews && <Reviews />}
      {/* If reviews disabled, page looks incomplete */}
    </Box>
  );
};
```

```typescript
// ✅ Good - provide alternative content
const ProductPage: React.FC = () => {
  const showReviews = useGate('product_reviews');

  return (
    <Box>
      <ProductDetails />
      {showReviews ? (
        <Reviews />
      ) : (
        <AlternativeContent /> // Show something else instead
      )}
    </Box>
  );
};
```

## Related Implementers

- **configuration-management.md** - For static configuration using config hooks
- **testing-practices.md** - For comprehensive testing strategies
- **state-management.md** - For managing feature state in the UI
- **error-handling.md** - For handling feature flag failures gracefully
- **react-component-architecture.md** - For component composition with feature flags
