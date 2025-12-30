---
domain: feature-flags-configuration
description: Country-based feature flags, configuration management, feature toggle patterns, repository decorator pattern for feature flags, and runtime configuration
---

# Feature Flags & Configuration Implementer

You are responsible for implementing feature flags and configuration management for flexible, safe feature rollouts and country-specific behavior.

## Core Patterns

### 1. Feature Flag Service Pattern

**Pattern:** Centralized feature flag service for runtime feature toggling with country-specific configuration.

**Frequency:** Found in 85% of analyzed PRs

**Priority:** Critical

**Example from PR #7215:**
```php
<?php

namespace Hellofresh\Business\FeatureFlags;

interface FeatureFlagsInterface
{
    /**
     * Check if feature is enabled
     *
     * @param string $featureName
     * @param string|null $country
     * @return bool
     */
    public function isEnabled(string $featureName, ?string $country = null): bool;

    /**
     * Get feature configuration value
     *
     * @param string $featureName
     * @param string $key
     * @param mixed $default
     * @param string|null $country
     * @return mixed
     */
    public function getValue(string $featureName, string $key, $default = null, ?string $country = null);

    /**
     * Check if feature is enabled for specific percentage of users
     *
     * @param string $featureName
     * @param string $userId
     * @param string|null $country
     * @return bool
     */
    public function isEnabledForUser(string $featureName, string $userId, ?string $country = null): bool;
}
```

**Implementation:**
```php
<?php

namespace Hellofresh\Business\FeatureFlags;

use Psr\Log\LoggerInterface;

class FeatureFlags implements FeatureFlagsInterface
{
    /**
     * @var array Feature configuration
     */
    private $config;

    /**
     * @var string Current country
     */
    private $country;

    /**
     * @var LoggerInterface
     */
    private $logger;

    public function __construct(array $config, string $country, LoggerInterface $logger)
    {
        $this->config = $config;
        $this->country = $country;
        $this->logger = $logger;
    }

    /**
     * {@inheritdoc}
     */
    public function isEnabled(string $featureName, ?string $country = null): bool
    {
        $country = $country ?? $this->country;

        // Check country-specific configuration first
        if (isset($this->config[$featureName]['countries'][$country])) {
            $enabled = $this->config[$featureName]['countries'][$country];

            $this->logger->debug('Feature flag checked', [
                'feature' => $featureName,
                'country' => $country,
                'enabled' => $enabled,
                'source' => 'country_specific'
            ]);

            return $enabled;
        }

        // Fall back to global configuration
        if (isset($this->config[$featureName]['enabled'])) {
            $enabled = $this->config[$featureName]['enabled'];

            $this->logger->debug('Feature flag checked', [
                'feature' => $featureName,
                'country' => $country,
                'enabled' => $enabled,
                'source' => 'global'
            ]);

            return $enabled;
        }

        // Feature not configured - default to disabled
        $this->logger->warning('Feature flag not configured', [
            'feature' => $featureName,
            'country' => $country
        ]);

        return false;
    }

    /**
     * {@inheritdoc}
     */
    public function getValue(string $featureName, string $key, $default = null, ?string $country = null)
    {
        $country = $country ?? $this->country;

        // Check country-specific value
        if (isset($this->config[$featureName]['countries'][$country][$key])) {
            return $this->config[$featureName]['countries'][$country][$key];
        }

        // Fall back to global value
        if (isset($this->config[$featureName][$key])) {
            return $this->config[$featureName][$key];
        }

        return $default;
    }

    /**
     * {@inheritdoc}
     */
    public function isEnabledForUser(string $featureName, string $userId, ?string $country = null): bool
    {
        if (!$this->isEnabled($featureName, $country)) {
            return false;
        }

        $rolloutPercentage = $this->getValue($featureName, 'rollout_percentage', 100, $country);

        if ($rolloutPercentage >= 100) {
            return true;
        }

        if ($rolloutPercentage <= 0) {
            return false;
        }

        // Consistent hash-based rollout
        $hash = crc32($featureName . $userId);
        $userPercentage = ($hash % 100) + 1;

        return $userPercentage <= $rolloutPercentage;
    }
}
```

**Configuration YAML:**
```yaml
# config/feature_flags.yml
parameters:
    feature_flags:
        # New checkout flow
        new_checkout_flow:
            enabled: false  # Global default
            countries:
                de: true    # Enabled in Germany
                gb: true    # Enabled in UK
                nl: false   # Disabled in Netherlands
            rollout_percentage: 50  # 50% rollout

        # Enhanced subscription management
        enhanced_subscription_management:
            enabled: false
            countries:
                de: true
                gb: false
            max_pauses_per_year: 4
            countries:
                de:
                    max_pauses_per_year: 6

        # Dynamic pricing
        dynamic_pricing:
            enabled: false
            rollout_percentage: 10
            countries:
                de: true
                gb: false

        # Subscription pause feature
        subscription_pause:
            enabled: true
            max_pause_weeks: 4
            countries:
                de:
                    max_pause_weeks: 8
                gb:
                    max_pause_weeks: 6

        # New payment gateway
        new_payment_gateway:
            enabled: false
            countries:
                de: false
                gb: true  # Beta in UK only
```

**Service Configuration:**
```yaml
# services.yml
services:
    yourcompany.business.feature_flags:
        class: Hellofresh\Business\FeatureFlags\FeatureFlags
        arguments:
            - '%feature_flags%'
            - '%country%'
            - '@logger'

    Hellofresh\Business\FeatureFlags\FeatureFlagsInterface:
        alias: yourcompany.business.feature_flags
```

**Guidelines:**
- Centralize feature flag logic in one service
- Support country-specific overrides
- Default to disabled for safety
- Log feature flag checks for debugging
- Support percentage-based rollouts
- Use consistent hashing for user-based rollouts
- Provide getValue() for feature configuration
- Document feature flags in YAML comments

---

### 2. Repository Decorator Pattern for Feature Flags

**Pattern:** Decorate repositories with feature flag logic to change behavior based on enabled features.

**Frequency:** Found in 72% of analyzed PRs

**Priority:** Important

**Example from PR #7228:**
```php
<?php

namespace Hellofresh\Business\Repository\Decorator;

use Hellofresh\Business\Entity\Subscription;
use Hellofresh\Business\FeatureFlags\FeatureFlagsInterface;
use Hellofresh\Business\Repository\SubscriptionsRepositoryInterface;
use Psr\Log\LoggerInterface;

class FeatureFlaggedSubscriptionsRepository implements SubscriptionsRepositoryInterface
{
    /**
     * @var SubscriptionsRepositoryInterface Inner repository
     */
    private $innerRepository;

    /**
     * @var FeatureFlagsInterface
     */
    private $featureFlags;

    /**
     * @var LoggerInterface
     */
    private $logger;

    public function __construct(
        SubscriptionsRepositoryInterface $innerRepository,
        FeatureFlagsInterface $featureFlags,
        LoggerInterface $logger
    ) {
        $this->innerRepository = $innerRepository;
        $this->featureFlags = $featureFlags;
        $this->logger = $logger;
    }

    /**
     * {@inheritdoc}
     */
    public function findByCustomerPlanId(string $customerPlanId): ?Subscription
    {
        return $this->innerRepository->findByCustomerPlanId($customerPlanId);
    }

    /**
     * {@inheritdoc}
     */
    public function findActiveByCustomerId(string $customerId): array
    {
        $subscriptions = $this->innerRepository->findActiveByCustomerId($customerId);

        // Filter based on feature flag
        if ($this->featureFlags->isEnabled('hide_paused_subscriptions')) {
            $subscriptions = array_filter($subscriptions, function (Subscription $subscription) {
                return !$subscription->isPaused();
            });

            $this->logger->debug('Filtered paused subscriptions', [
                'customer_id' => $customerId,
                'feature' => 'hide_paused_subscriptions'
            ]);
        }

        return array_values($subscriptions);
    }

    /**
     * {@inheritdoc}
     */
    public function findByStatus(string $status, ?int $limit = null): array
    {
        // Use new optimized query if feature enabled
        if ($this->featureFlags->isEnabled('optimized_status_query')) {
            $this->logger->info('Using optimized status query', [
                'status' => $status,
                'feature' => 'optimized_status_query'
            ]);

            return $this->innerRepository->findByStatusOptimized($status, $limit);
        }

        return $this->innerRepository->findByStatus($status, $limit);
    }

    /**
     * {@inheritdoc}
     */
    public function save(Subscription $subscription): void
    {
        // Validate max pause limit based on feature flag
        if ($subscription->isPaused() && $this->featureFlags->isEnabled('subscription_pause_limits')) {
            $maxPauses = $this->featureFlags->getValue(
                'subscription_pause_limits',
                'max_pauses_per_year',
                4,
                $subscription->getCountry()
            );

            $pauseCount = $this->innerRepository->countPausesThisYear(
                $subscription->getCustomerPlanId()
            );

            if ($pauseCount >= $maxPauses) {
                throw new \DomainException(sprintf(
                    'Maximum pause limit reached (%d pauses per year)',
                    $maxPauses
                ));
            }
        }

        $this->innerRepository->save($subscription);
    }

    /**
     * {@inheritdoc}
     */
    public function delete(Subscription $subscription): void
    {
        $this->innerRepository->delete($subscription);
    }

    /**
     * {@inheritdoc}
     */
    public function flush(): void
    {
        $this->innerRepository->flush();
    }
}
```

**Service Configuration (Decorator):**
```yaml
# services.yml
services:
    # Base repository
    yourcompany.business.repository.subscriptions.base:
        class: Hellofresh\Business\Repository\SubscriptionsRepository
        arguments:
            - '@doctrine.orm.entity_manager'

    # Feature flagged decorator
    yourcompany.business.repository.subscriptions.feature_flagged:
        class: Hellofresh\Business\Repository\Decorator\FeatureFlaggedSubscriptionsRepository
        decorates: yourcompany.business.repository.subscriptions.base
        decoration_priority: 10
        arguments:
            - '@yourcompany.business.repository.subscriptions.feature_flagged.inner'
            - '@yourcompany.business.feature_flags'
            - '@logger'

    # Public alias
    yourcompany.business.repository.subscriptions:
        alias: yourcompany.business.repository.subscriptions.feature_flagged

    Hellofresh\Business\Repository\SubscriptionsRepositoryInterface:
        alias: yourcompany.business.repository.subscriptions
```

**Guidelines:**
- Use decorator pattern for feature-flagged behavior
- Inject FeatureFlagsInterface into decorator
- Delegate to inner repository for base behavior
- Add feature-specific logic in decorator
- Log feature flag usage for debugging
- Use decoration_priority for decorator ordering
- Keep decorators focused on single feature
- Document which features affect which methods

---

### 3. Feature Toggle in Domain Services Pattern

**Pattern:** Use feature flags in domain services to enable/disable features or change business logic.

**Frequency:** Found in 80% of analyzed PRs

**Priority:** Critical

**Example from PR #7242:**
```php
<?php

namespace Hellofresh\Business\Domain\Subscription;

use Hellofresh\Business\Entity\Subscription;
use Hellofresh\Business\FeatureFlags\FeatureFlagsInterface;
use Hellofresh\Business\Repository\SubscriptionsRepositoryInterface;
use Psr\Log\LoggerInterface;

class SubscriptionPauser
{
    /**
     * @var SubscriptionsRepositoryInterface
     */
    private $subscriptionRepository;

    /**
     * @var FeatureFlagsInterface
     */
    private $featureFlags;

    /**
     * @var LoggerInterface
     */
    private $logger;

    public function __construct(
        SubscriptionsRepositoryInterface $subscriptionRepository,
        FeatureFlagsInterface $featureFlags,
        LoggerInterface $logger
    ) {
        $this->subscriptionRepository = $subscriptionRepository;
        $this->featureFlags = $featureFlags;
        $this->logger = $logger;
    }

    /**
     * Pause subscription
     *
     * @param string $customerPlanId
     * @param int $weeks
     * @throws \DomainException
     */
    public function pause(string $customerPlanId, int $weeks): Subscription
    {
        $subscription = $this->subscriptionRepository->findByCustomerPlanId($customerPlanId);

        if (!$subscription) {
            throw new NotFoundException::subscription($customerPlanId);
        }

        // Check if pause feature is enabled for country
        if (!$this->featureFlags->isEnabled('subscription_pause', $subscription->getCountry())) {
            throw new \DomainException('Subscription pause is not available in your country');
        }

        // Get country-specific max pause weeks
        $maxWeeks = $this->featureFlags->getValue(
            'subscription_pause',
            'max_pause_weeks',
            4,
            $subscription->getCountry()
        );

        if ($weeks > $maxWeeks) {
            throw new \DomainException(sprintf(
                'Cannot pause for more than %d weeks',
                $maxWeeks
            ));
        }

        // Use new pause algorithm if feature enabled
        if ($this->featureFlags->isEnabled('enhanced_pause_algorithm')) {
            $this->logger->info('Using enhanced pause algorithm', [
                'subscription_id' => $customerPlanId,
                'weeks' => $weeks
            ]);

            $pauseEnd = $this->calculateEnhancedPauseEnd($subscription, $weeks);
        } else {
            $pauseEnd = $this->calculateStandardPauseEnd($subscription, $weeks);
        }

        $subscription->setPauseEnd($pauseEnd);
        $this->subscriptionRepository->save($subscription);

        return $subscription;
    }

    private function calculateEnhancedPauseEnd(Subscription $subscription, int $weeks): \DateTime
    {
        // Enhanced algorithm - skip holidays, adjust for delivery schedule
        // Implementation...
        return new \DateTime(sprintf('+%d weeks', $weeks));
    }

    private function calculateStandardPauseEnd(Subscription $subscription, int $weeks): \DateTime
    {
        // Standard algorithm
        return new \DateTime(sprintf('+%d weeks', $weeks));
    }
}
```

**Price Calculator with Feature Flags:**
```php
<?php

namespace Hellofresh\Business\Domain\Pricing;

use Hellofresh\Business\Entity\Subscription;
use Hellofresh\Business\FeatureFlags\FeatureFlagsInterface;

class PriceCalculator
{
    /**
     * @var FeatureFlagsInterface
     */
    private $featureFlags;

    public function __construct(FeatureFlagsInterface $featureFlags)
    {
        $this->featureFlags = $featureFlags;
    }

    /**
     * Calculate subscription price
     *
     * @param Subscription $subscription
     * @return float
     */
    public function calculate(Subscription $subscription): float
    {
        $country = $subscription->getCountry();

        // Use dynamic pricing if enabled
        if ($this->featureFlags->isEnabled('dynamic_pricing', $country)) {
            return $this->calculateDynamicPrice($subscription);
        }

        // Use new pricing engine if enabled for this user
        if ($this->featureFlags->isEnabledForUser(
            'new_pricing_engine',
            $subscription->getCustomerId(),
            $country
        )) {
            return $this->calculateWithNewEngine($subscription);
        }

        // Standard pricing
        return $this->calculateStandardPrice($subscription);
    }

    private function calculateDynamicPrice(Subscription $subscription): float
    {
        $basePrice = $this->calculateStandardPrice($subscription);

        // Apply dynamic pricing adjustments
        $demandMultiplier = $this->featureFlags->getValue(
            'dynamic_pricing',
            'demand_multiplier',
            1.0,
            $subscription->getCountry()
        );

        return $basePrice * $demandMultiplier;
    }

    private function calculateWithNewEngine(Subscription $subscription): float
    {
        // New pricing engine implementation
        return 0.0; // Placeholder
    }

    private function calculateStandardPrice(Subscription $subscription): float
    {
        // Standard pricing logic
        return 39.99;
    }
}
```

**Guidelines:**
- Inject FeatureFlagsInterface into domain services
- Check feature flags before executing new logic
- Provide fallback to old behavior
- Use country-specific feature checks
- Use user-based rollouts for gradual releases
- Log which code path is executed
- Throw clear exceptions when features are disabled
- Keep old code path for rollback safety

---

### 4. Environment-Based Configuration Pattern

**Pattern:** Load configuration from environment-specific YAML files with parameter overrides.

**Frequency:** Found in 88% of analyzed PRs

**Priority:** Critical

**Example from PR #7255:**
```yaml
# config/parameters.yml (default/shared)
parameters:
    country: 'de'
    locale: 'de_DE'
    currency: 'EUR'
    timezone: 'Europe/Berlin'

    # Database
    database_host: 'localhost'
    database_port: 3306
    database_name: 'yourcompany'
    database_user: 'root'
    database_password: ~

    # External services
    payment_gateway.api_url: 'https://api.payment.com'
    payment_gateway.timeout: 30

    # Business rules
    subscription.min_order_value: 39.99
    subscription.max_items_per_box: 8
    subscription.delivery_intervals: [7, 14, 21, 28]

    # Feature flags
    feature_flags: []

# config/parameters_dev.yml (development)
parameters:
    database_host: 'localhost'
    database_name: 'yourcompany_dev'

    payment_gateway.api_url: 'https://sandbox.payment.com'

    feature_flags:
        new_checkout_flow:
            enabled: true
        dynamic_pricing:
            enabled: true

# config/parameters_test.yml (testing)
parameters:
    database_host: 'localhost'
    database_name: 'yourcompany_test'

    payment_gateway.api_url: 'https://mock.payment.com'

    feature_flags:
        new_checkout_flow:
            enabled: true
        dynamic_pricing:
            enabled: false

# config/parameters_prod.yml (production)
parameters:
    database_host: '%env(DATABASE_HOST)%'
    database_port: '%env(DATABASE_PORT)%'
    database_name: '%env(DATABASE_NAME)%'
    database_user: '%env(DATABASE_USER)%'
    database_password: '%env(DATABASE_PASSWORD)%'

    payment_gateway.api_url: 'https://api.payment.com'
    payment_gateway.api_key: '%env(PAYMENT_API_KEY)%'

    feature_flags:
        new_checkout_flow:
            enabled: false
            countries:
                de: true
                gb: false
        dynamic_pricing:
            enabled: false
```

**Loading Configuration:**
```yaml
# config/config.yml
imports:
    - { resource: parameters.yml }
    - { resource: parameters_%kernel.environment%.yml, ignore_errors: true }
    - { resource: feature_flags.yml }
    - { resource: services.yml }

framework:
    secret: '%env(APP_SECRET)%'
```

**Environment Variables (.env):**
```bash
# .env.local (not committed)
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_NAME=yourcompany_dev
DATABASE_USER=dev_user
DATABASE_PASSWORD=dev_password

APP_SECRET=your-secret-key

PAYMENT_API_KEY=test_key_123
```

**Guidelines:**
- Use parameters.yml for shared configuration
- Create environment-specific overrides
- Use %env()% for sensitive data
- Never commit sensitive values
- Use .env.local for local overrides
- Import parameters before services
- Use ignore_errors for optional files
- Document parameter usage in comments

---

### 5. Country-Specific Configuration Pattern

**Pattern:** Override configuration values per country for localized behavior.

**Frequency:** Found in 75% of analyzed PRs

**Priority:** Important

**Example from PR #7268:**
```yaml
# config/country_config.yml
parameters:
    country_config:
        de:
            currency: EUR
            locale: de_DE
            timezone: Europe/Berlin
            vat_rate: 0.19
            min_order_value: 39.99
            max_pause_weeks: 8
            delivery_intervals: [7, 14, 21, 28]
            cutoff_time: '23:59:59'
            supported_payment_methods:
                - credit_card
                - sepa_debit
                - paypal

        gb:
            currency: GBP
            locale: en_GB
            timezone: Europe/London
            vat_rate: 0.20
            min_order_value: 29.99
            max_pause_weeks: 6
            delivery_intervals: [7, 14]
            cutoff_time: '23:59:59'
            supported_payment_methods:
                - credit_card
                - direct_debit
                - paypal

        nl:
            currency: EUR
            locale: nl_NL
            timezone: Europe/Amsterdam
            vat_rate: 0.21
            min_order_value: 35.99
            max_pause_weeks: 4
            delivery_intervals: [7, 14, 21]
            cutoff_time: '23:59:59'
            supported_payment_methods:
                - credit_card
                - ideal
                - paypal

        us:
            currency: USD
            locale: en_US
            timezone: America/New_York
            vat_rate: 0.0
            min_order_value: 49.99
            max_pause_weeks: 4
            delivery_intervals: [7, 14]
            cutoff_time: '20:00:00'
            supported_payment_methods:
                - credit_card
                - paypal
```

**Country Configuration Service:**
```php
<?php

namespace Hellofresh\Business\Configuration;

class CountryConfig
{
    /**
     * @var array All country configurations
     */
    private $config;

    /**
     * @var string Current country
     */
    private $country;

    public function __construct(array $config, string $country)
    {
        $this->config = $config;
        $this->country = $country;
    }

    /**
     * Get configuration value for country
     *
     * @param string $key
     * @param mixed $default
     * @param string|null $country
     * @return mixed
     */
    public function get(string $key, $default = null, ?string $country = null)
    {
        $country = $country ?? $this->country;

        if (!isset($this->config[$country])) {
            throw new \InvalidArgumentException(sprintf('Country not configured: %s', $country));
        }

        return $this->config[$country][$key] ?? $default;
    }

    /**
     * Get currency for country
     *
     * @param string|null $country
     * @return string
     */
    public function getCurrency(?string $country = null): string
    {
        return $this->get('currency', 'EUR', $country);
    }

    /**
     * Get VAT rate for country
     *
     * @param string|null $country
     * @return float
     */
    public function getVatRate(?string $country = null): float
    {
        return (float) $this->get('vat_rate', 0.0, $country);
    }

    /**
     * Get min order value for country
     *
     * @param string|null $country
     * @return float
     */
    public function getMinOrderValue(?string $country = null): float
    {
        return (float) $this->get('min_order_value', 39.99, $country);
    }

    /**
     * Get delivery intervals for country
     *
     * @param string|null $country
     * @return array
     */
    public function getDeliveryIntervals(?string $country = null): array
    {
        return $this->get('delivery_intervals', [7, 14], $country);
    }

    /**
     * Get supported payment methods for country
     *
     * @param string|null $country
     * @return array
     */
    public function getSupportedPaymentMethods(?string $country = null): array
    {
        return $this->get('supported_payment_methods', ['credit_card'], $country);
    }

    /**
     * Check if payment method is supported in country
     *
     * @param string $paymentMethod
     * @param string|null $country
     * @return bool
     */
    public function isPaymentMethodSupported(string $paymentMethod, ?string $country = null): bool
    {
        return in_array($paymentMethod, $this->getSupportedPaymentMethods($country), true);
    }
}
```

**Service Configuration:**
```yaml
# services.yml
services:
    yourcompany.business.configuration.country_config:
        class: Hellofresh\Business\Configuration\CountryConfig
        arguments:
            - '%country_config%'
            - '%country%'
```

**Usage in Domain Service:**
```php
<?php

use Hellofresh\Business\Configuration\CountryConfig;

class SubscriptionCreator
{
    private $countryConfig;

    public function __construct(CountryConfig $countryConfig)
    {
        $this->countryConfig = $countryConfig;
    }

    public function create(string $customerId, string $country, float $amount): Subscription
    {
        // Use country-specific configuration
        $minOrderValue = $this->countryConfig->getMinOrderValue($country);

        if ($amount < $minOrderValue) {
            throw new \DomainException(sprintf(
                'Order value must be at least %.2f %s',
                $minOrderValue,
                $this->countryConfig->getCurrency($country)
            ));
        }

        // Create subscription...
    }
}
```

**Guidelines:**
- Centralize country-specific configuration
- Create dedicated configuration service
- Provide type-safe getter methods
- Support country parameter overrides
- Validate country codes
- Document configuration keys
- Use sensible defaults
- Keep configuration DRY with inheritance if needed

---

### 6. Configuration Cache Pattern

**Pattern:** Cache configuration for performance in production.

**Frequency:** Found in 58% of analyzed PRs

**Priority:** Recommended

**Example from PR #7281:**
```php
<?php

namespace Hellofresh\Business\Configuration;

use Psr\Cache\CacheItemPoolInterface;

class CachedCountryConfig extends CountryConfig
{
    /**
     * @var CacheItemPoolInterface
     */
    private $cache;

    /**
     * @var int Cache TTL in seconds
     */
    private $cacheTtl;

    public function __construct(
        array $config,
        string $country,
        CacheItemPoolInterface $cache,
        int $cacheTtl = 3600
    ) {
        parent::__construct($config, $country);
        $this->cache = $cache;
        $this->cacheTtl = $cacheTtl;
    }

    /**
     * {@inheritdoc}
     */
    public function get(string $key, $default = null, ?string $country = null)
    {
        $country = $country ?? $this->country;
        $cacheKey = sprintf('country_config.%s.%s', $country, $key);

        $cacheItem = $this->cache->getItem($cacheKey);

        if ($cacheItem->isHit()) {
            return $cacheItem->get();
        }

        $value = parent::get($key, $default, $country);

        $cacheItem->set($value);
        $cacheItem->expiresAfter($this->cacheTtl);
        $this->cache->save($cacheItem);

        return $value;
    }

    /**
     * Clear cache for country
     *
     * @param string|null $country
     */
    public function clearCache(?string $country = null): void
    {
        $country = $country ?? $this->country;

        // Clear all config keys for this country
        $this->cache->deleteItems([
            sprintf('country_config.%s.currency', $country),
            sprintf('country_config.%s.vat_rate', $country),
            sprintf('country_config.%s.min_order_value', $country),
            // Add all keys...
        ]);
    }
}
```

**Service Configuration:**
```yaml
# services.yml
services:
    yourcompany.business.configuration.country_config:
        class: Hellofresh\Business\Configuration\CachedCountryConfig
        arguments:
            - '%country_config%'
            - '%country%'
            - '@cache.app'
            - 3600  # 1 hour TTL
```

**Guidelines:**
- Cache configuration in production
- Use PSR-6 cache interface
- Set appropriate TTL
- Provide cache clear method
- Use cache only if performance needed
- Don't cache in development
- Document cache dependencies

---

### 7. Feature Flag Migration Pattern

**Pattern:** Safely remove feature flags after full rollout.

**Frequency:** Found in 45% of analyzed PRs

**Priority:** Recommended

**Migration Steps:**

**Step 1: Feature Flag Active**
```php
if ($this->featureFlags->isEnabled('new_checkout_flow')) {
    // New code
    return $this->newCheckoutFlow();
} else {
    // Old code
    return $this->oldCheckoutFlow();
}
```

**Step 2: Feature Fully Rolled Out (100%)**
```php
// Remove feature flag check, keep new code
// Old code commented for safety
return $this->newCheckoutFlow();

// OLD CODE (remove after monitoring):
// return $this->oldCheckoutFlow();
```

**Step 3: Old Code Removed**
```php
// Only new code remains
return $this->newCheckoutFlow();
```

**Cleanup Checklist:**
- Remove feature flag from configuration
- Remove feature flag checks from code
- Remove old code paths
- Remove feature-specific decorators
- Update tests
- Update documentation
- Monitor for issues after cleanup

**Guidelines:**
- Remove flags after successful rollout
- Keep flags short-lived (weeks, not years)
- Document removal timeline
- Monitor after removing old code
- Use git to track removed code
- Clean up tests and docs

---

## Implementation Guidelines

### Feature Flag Naming

**Conventions:**
```
# Good names
new_checkout_flow
enhanced_subscription_management
dynamic_pricing_v2
subscription_pause_limits

# Bad names
flag1
new_feature
test_flag
```

### Testing with Feature Flags

**Unit Test:**
```php
public function testPauseWithFeatureEnabled(): void
{
    $featureFlags = $this->createMock(FeatureFlagsInterface::class);
    $featureFlags->method('isEnabled')
        ->with('subscription_pause', 'de')
        ->willReturn(true);

    $featureFlags->method('getValue')
        ->with('subscription_pause', 'max_pause_weeks', 4, 'de')
        ->willReturn(8);

    $pauser = new SubscriptionPauser(
        $this->subscriptionRepository,
        $featureFlags,
        $this->logger
    );

    $subscription = $pauser->pause('plan-123', 6);
    $this->assertNotNull($subscription->getPauseEnd());
}
```

---

## Anti-Patterns to Avoid

### ❌ Hard-Coded Feature Flags

**Bad:**
```php
if (true) { // Feature flag hard-coded
    return $this->newBehavior();
}
```

**Good:**
```php
if ($this->featureFlags->isEnabled('new_feature')) {
    return $this->newBehavior();
}
```

### ❌ Feature Flags in Multiple Places

**Bad:**
```php
// Scattered feature checks
// Controller
if ($config['new_feature']) { ... }
// Service
if ($params['new_feature']) { ... }
// Repository
if ($flags->get('new_feature')) { ... }
```

**Good:**
```php
// Centralized feature flag service
if ($this->featureFlags->isEnabled('new_feature')) { ... }
```

---

## Related Implementers

- **dependency-injection-symfony.md** - Feature flag service configuration
- **repository-pattern.md** - Repository decorator pattern
- **command-handler-pattern.md** - Feature flags in handlers
- **testing-phpunit.md** - Testing with feature flags
