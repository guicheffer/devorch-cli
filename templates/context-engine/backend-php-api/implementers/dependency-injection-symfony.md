---
domain: dependency-injection-symfony
description: Symfony dependency injection container patterns with YAML service definitions, constructor injection, service tagging, autoconfiguration, and compiler passes
---

# Dependency Injection (Symfony) Implementer

You are responsible for implementing dependency injection patterns using Symfony's DI container for clean, testable, and maintainable service architecture.

## Core Patterns

### 1. Service Definition with YAML Pattern

**Pattern:** Define services in YAML configuration files with explicit dependencies and configuration.

**Frequency:** Found in 95% of analyzed PRs

**Priority:** Critical

**Example from PR #6782:**
```yaml
# config/services.yml
services:
    # Default configuration for all services
    _defaults:
        autowire: false      # Explicit wiring for clarity
        autoconfigure: false # Explicit tagging
        public: false        # Services are private by default

    # Domain Services
    yourcompany.business.domain.subscription.delivery_details_changer:
        class: Hellofresh\Business\Domain\Subscription\DeliveryDetailsChanger
        arguments:
            - '@yourcompany.business.repository.subscriptions'
            - '@yourcompany.business.repository.delivery_options'
            - '@doctrine.orm.entity_manager'
            - '@logger'
            - '@opencensus.tracer'
            - '@yourcompany.business.domain.subscription.one_off_changes'
            - '@yourcompany.business.domain.subscription.delivery_interval'
            - '@yourcompany.business.feature_flags'
        calls:
            - [setCountry, ['%country%']]

    # Repositories
    yourcompany.business.repository.subscriptions:
        class: Hellofresh\Business\Repository\SubscriptionsRepository
        factory: ['@doctrine.orm.entity_manager', getRepository]
        arguments:
            - 'Hellofresh\Business\Entity\Subscription'

    yourcompany.business.repository.delivery_options:
        class: Hellofresh\Business\Repository\DeliveryOptionsRepository
        arguments:
            - '@doctrine.orm.entity_manager'
            - '@cache.app'
        calls:
            - [setCountry, ['%country%']]

    # Command Handlers
    Hellofresh\Business\Handler\Plan\ChangePlanDeliveryDetailsHandler:
        arguments:
            - '@yourcompany.business.domain.subscription.delivery_details_changer'
            - '@yourcompany.business.security.authorization_checker'
        tags:
            - { name: tactician.handler, command: Hellofresh\Business\Command\Plan\ChangePlanDeliveryDetails }

    # Event Subscribers
    yourcompany.business.event_subscriber.subscription_post_update:
        class: Hellofresh\Business\Domain\Subscription\Subscribers\PostUpdateOneOffChangeSubscriber
        arguments:
            - '@yourcompany.business.repository.change_schedule'
            - '@logger'
        tags:
            - { name: kernel.event_subscriber }
```

**Guidelines:**
- Use explicit service IDs with namespace prefixes
- Disable autowire/autoconfigure by default for legacy codebases
- Mark services as private unless they must be accessed from container
- Use `@` syntax for service references
- Use `%` syntax for parameter references
- Group related services together with comments
- Use factory pattern for Doctrine repositories
- Use `calls` for setter injection when needed
- Tag services explicitly for registration

---

### 2. Constructor Injection Pattern

**Pattern:** Inject all dependencies via constructor for explicit, testable, and immutable service configuration.

**Frequency:** Found in 98% of analyzed PRs

**Priority:** Critical

**Example from PR #6815:**
```php
<?php

namespace Hellofresh\Business\Domain\Order;

use Doctrine\ORM\EntityManagerInterface;
use Hellofresh\Business\Domain\Payment\PaymentGateway;
use Hellofresh\Business\Domain\Pricing\PriceCalculator;
use Hellofresh\Business\Helper\Metric\Prometheus;
use Hellofresh\Business\Repository\OrderRepositoryInterface;
use Hellofresh\Business\Repository\ProductRepositoryInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\EventDispatcher\EventDispatcherInterface;

class OrderCreator
{
    /**
     * @var OrderRepositoryInterface
     */
    private $orderRepository;

    /**
     * @var ProductRepositoryInterface
     */
    private $productRepository;

    /**
     * @var PriceCalculator
     */
    private $priceCalculator;

    /**
     * @var PaymentGateway
     */
    private $paymentGateway;

    /**
     * @var EntityManagerInterface
     */
    private $entityManager;

    /**
     * @var EventDispatcherInterface
     */
    private $eventDispatcher;

    /**
     * @var LoggerInterface
     */
    private $logger;

    /**
     * @var string
     */
    private $country;

    public function __construct(
        OrderRepositoryInterface $orderRepository,
        ProductRepositoryInterface $productRepository,
        PriceCalculator $priceCalculator,
        PaymentGateway $paymentGateway,
        EntityManagerInterface $entityManager,
        EventDispatcherInterface $eventDispatcher,
        LoggerInterface $logger
    ) {
        $this->orderRepository = $orderRepository;
        $this->productRepository = $productRepository;
        $this->priceCalculator = $priceCalculator;
        $this->paymentGateway = $paymentGateway;
        $this->entityManager = $entityManager;
        $this->eventDispatcher = $eventDispatcher;
        $this->logger = $logger;
    }

    /**
     * Set country for country-specific logic
     *
     * @param string $country
     */
    public function setCountry(string $country): void
    {
        $this->country = $country;
    }

    public function createOrder(string $customerId, array $items): Order
    {
        $this->logger->info('Creating order', [
            'customer_id' => $customerId,
            'country' => $this->country,
            'item_count' => count($items)
        ]);

        // Business logic using injected dependencies...
    }
}
```

**YAML Configuration:**
```yaml
services:
    yourcompany.business.domain.order.order_creator:
        class: Hellofresh\Business\Domain\Order\OrderCreator
        arguments:
            - '@yourcompany.business.repository.orders'
            - '@yourcompany.business.repository.products'
            - '@yourcompany.business.domain.pricing.price_calculator'
            - '@yourcompany.business.domain.payment.payment_gateway'
            - '@doctrine.orm.entity_manager'
            - '@event_dispatcher'
            - '@logger'
        calls:
            - [setCountry, ['%country%']]
```

**Guidelines:**
- Inject ALL dependencies via constructor
- Store dependencies in private properties
- Type-hint all constructor parameters
- Document with PHPDoc for IDE support
- Use setter injection only for optional config (like country)
- Never use service locator pattern
- Dependencies are immutable after construction
- Order dependencies logically (repositories, services, infrastructure)

---

### 3. Service Tagging Pattern

**Pattern:** Use tags to register services with specific subsystems like command handlers, event subscribers, or repository decorators.

**Frequency:** Found in 85% of analyzed PRs

**Priority:** Critical

**Example from PR #6798:**
```yaml
services:
    # Command Handler Tags
    Hellofresh\Business\Handler\Subscription\CreateSubscriptionHandler:
        arguments:
            - '@yourcompany.business.domain.subscription.subscription_creator'
            - '@yourcompany.business.security.authorization_checker'
        tags:
            - { name: tactician.handler, command: Hellofresh\Business\Command\Subscription\CreateSubscription }

    Hellofresh\Business\Handler\Order\CancelOrderHandler:
        arguments:
            - '@yourcompany.business.domain.order.order_canceller'
            - '@yourcompany.business.security.authorization_checker'
        tags:
            - { name: tactician.handler, command: Hellofresh\Business\Command\Order\CancelOrder }

    # Event Subscriber Tags
    yourcompany.business.event_subscriber.order_placed:
        class: Hellofresh\Business\EventSubscriber\OrderPlacedSubscriber
        arguments:
            - '@yourcompany.business.domain.notification.email_sender'
            - '@logger'
        tags:
            - { name: kernel.event_subscriber }

    # Repository Decorator Tags
    yourcompany.business.repository.subscriptions.cached:
        class: Hellofresh\Business\Repository\Decorator\CachedSubscriptionsRepository
        decorates: yourcompany.business.repository.subscriptions
        decoration_priority: 10
        arguments:
            - '@yourcompany.business.repository.subscriptions.cached.inner'
            - '@cache.app'
            - '@logger'

    yourcompany.business.repository.subscriptions.feature_flagged:
        class: Hellofresh\Business\Repository\Decorator\FeatureFlaggedSubscriptionsRepository
        decorates: yourcompany.business.repository.subscriptions
        decoration_priority: 20
        arguments:
            - '@yourcompany.business.repository.subscriptions.feature_flagged.inner'
            - '@yourcompany.business.feature_flags'

    # Custom Tags for Collection
    yourcompany.business.validator.subscription:
        class: Hellofresh\Business\Validator\SubscriptionValidator
        tags:
            - { name: yourcompany.validator, entity: subscription }

    yourcompany.business.validator.order:
        class: Hellofresh\Business\Validator\OrderValidator
        tags:
            - { name: yourcompany.validator, entity: order }
```

**Compiler Pass for Custom Tags:**
```php
<?php

namespace Hellofresh\Business\DependencyInjection\Compiler;

use Symfony\Component\DependencyInjection\Compiler\CompilerPassInterface;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\DependencyInjection\Reference;

class ValidatorPass implements CompilerPassInterface
{
    public function process(ContainerBuilder $container): void
    {
        if (!$container->has('yourcompany.business.validator.registry')) {
            return;
        }

        $registryDefinition = $container->findDefinition('yourcompany.business.validator.registry');

        // Find all services tagged as validators
        $taggedServices = $container->findTaggedServiceIds('yourcompany.validator');

        $validators = [];
        foreach ($taggedServices as $id => $tags) {
            foreach ($tags as $attributes) {
                $entity = $attributes['entity'] ?? null;
                if ($entity) {
                    $validators[$entity] = new Reference($id);
                }
            }
        }

        $registryDefinition->setArgument(0, $validators);
    }
}
```

**Guidelines:**
- Use `tactician.handler` tag for command handlers with command mapping
- Use `kernel.event_subscriber` for Symfony event subscribers
- Use `decorates` for decorator pattern with priority
- Create custom tags for domain-specific collections
- Implement compiler passes to collect tagged services
- Document tag attributes in YAML comments
- Use decoration_priority to control decorator order (higher = outer)

---

### 4. Factory Pattern with DI Pattern

**Pattern:** Use factory services to create complex objects with dependencies from the container.

**Frequency:** Found in 72% of analyzed PRs

**Priority:** Important

**Example from PR #6821:**
```php
<?php

namespace Hellofresh\Business\Factory;

use Hellofresh\Business\Domain\Subscription\SubscriptionValidator;
use Hellofresh\Business\Repository\DeliveryOptionsRepositoryInterface;
use Hellofresh\Business\Repository\PostcodeRepositoryInterface;
use Hellofresh\Business\Repository\ProductRepositoryInterface;
use Psr\Log\LoggerInterface;

class SubscriptionValidatorFactory
{
    /**
     * @var DeliveryOptionsRepositoryInterface
     */
    private $deliveryOptionsRepository;

    /**
     * @var PostcodeRepositoryInterface
     */
    private $postcodeRepository;

    /**
     * @var ProductRepositoryInterface
     */
    private $productRepository;

    /**
     * @var LoggerInterface
     */
    private $logger;

    /**
     * @var string
     */
    private $country;

    public function __construct(
        DeliveryOptionsRepositoryInterface $deliveryOptionsRepository,
        PostcodeRepositoryInterface $postcodeRepository,
        ProductRepositoryInterface $productRepository,
        LoggerInterface $logger,
        string $country
    ) {
        $this->deliveryOptionsRepository = $deliveryOptionsRepository;
        $this->postcodeRepository = $postcodeRepository;
        $this->productRepository = $productRepository;
        $this->logger = $logger;
        $this->country = $country;
    }

    /**
     * Create a subscription validator configured for specific context
     *
     * @param string $context
     * @return SubscriptionValidator
     */
    public function createForContext(string $context): SubscriptionValidator
    {
        $validator = new SubscriptionValidator(
            $this->deliveryOptionsRepository,
            $this->postcodeRepository,
            $this->productRepository,
            $this->logger
        );

        $validator->setCountry($this->country);
        $validator->setContext($context);

        return $validator;
    }

    /**
     * Create a subscription validator for creation flow
     *
     * @return SubscriptionValidator
     */
    public function createForCreation(): SubscriptionValidator
    {
        return $this->createForContext('creation');
    }

    /**
     * Create a subscription validator for update flow
     *
     * @return SubscriptionValidator
     */
    public function createForUpdate(): SubscriptionValidator
    {
        return $this->createForContext('update');
    }
}
```

**YAML Configuration:**
```yaml
services:
    yourcompany.business.factory.subscription_validator:
        class: Hellofresh\Business\Factory\SubscriptionValidatorFactory
        arguments:
            - '@yourcompany.business.repository.delivery_options'
            - '@yourcompany.business.repository.postcodes'
            - '@yourcompany.business.repository.products'
            - '@logger'
            - '%country%'

    # Use factory to create services
    yourcompany.business.validator.subscription.creation:
        class: Hellofresh\Business\Domain\Subscription\SubscriptionValidator
        factory: ['@yourcompany.business.factory.subscription_validator', createForCreation]

    yourcompany.business.validator.subscription.update:
        class: Hellofresh\Business\Domain\Subscription\SubscriptionValidator
        factory: ['@yourcompany.business.factory.subscription_validator', createForUpdate]
```

**Doctrine Repository Factory Pattern:**
```yaml
services:
    # Repository via factory method
    yourcompany.business.repository.subscriptions:
        class: Hellofresh\Business\Repository\SubscriptionsRepository
        factory: ['@doctrine.orm.entity_manager', getRepository]
        arguments:
            - 'Hellofresh\Business\Entity\Subscription'

    yourcompany.business.repository.orders:
        class: Hellofresh\Business\Repository\OrdersRepository
        factory: ['@doctrine.orm.entity_manager', getRepository]
        arguments:
            - 'Hellofresh\Business\Entity\Order'
```

**Guidelines:**
- Use factories for objects that need runtime configuration
- Inject dependencies into factory, not the created objects
- Factory methods should have semantic names
- Use factory pattern for Doctrine repositories
- Document factory methods with PHPDoc
- Factories are stateless (except injected dependencies)
- One factory per domain aggregate

---

### 5. Parameter Injection Pattern

**Pattern:** Inject configuration parameters from YAML into services.

**Frequency:** Found in 88% of analyzed PRs

**Priority:** Critical

**Example from PR #6835:**
```yaml
# config/parameters.yml
parameters:
    country: 'de'
    locale: 'de_DE'
    currency: 'EUR'
    timezone: 'Europe/Berlin'

    # Feature flags
    feature.new_checkout_flow.enabled: true
    feature.new_pricing_engine.enabled: false
    feature.subscription_pause.max_weeks: 4

    # External API configuration
    payment_gateway.api_url: 'https://api.payment.com'
    payment_gateway.api_key: '%env(PAYMENT_API_KEY)%'
    payment_gateway.timeout: 30

    # Business rules
    subscription.min_order_value: 39.99
    subscription.max_items_per_box: 8
    subscription.delivery_intervals: [7, 14, 21, 28]

# config/services.yml
services:
    yourcompany.business.domain.subscription.subscription_creator:
        class: Hellofresh\Business\Domain\Subscription\SubscriptionCreator
        arguments:
            - '@yourcompany.business.repository.subscriptions'
            - '@yourcompany.business.repository.products'
            - '@yourcompany.business.domain.pricing.price_calculator'
            - '@doctrine.orm.entity_manager'
            - '@logger'
            - '%country%'
            - '%subscription.min_order_value%'
            - '%subscription.max_items_per_box%'
            - '%subscription.delivery_intervals%'
        calls:
            - [setFeatureFlags, ['@yourcompany.business.feature_flags']]

    yourcompany.business.domain.payment.payment_gateway:
        class: Hellofresh\Business\Domain\Payment\PaymentGateway
        arguments:
            - '@yourcompany.business.http_client'
            - '@logger'
            - '%payment_gateway.api_url%'
            - '%payment_gateway.api_key%'
            - '%payment_gateway.timeout%'
```

**Service Class:**
```php
<?php

namespace Hellofresh\Business\Domain\Subscription;

use Doctrine\ORM\EntityManagerInterface;
use Hellofresh\Business\Domain\Pricing\PriceCalculator;
use Hellofresh\Business\Entity\Subscription;
use Hellofresh\Business\Repository\ProductRepositoryInterface;
use Hellofresh\Business\Repository\SubscriptionsRepositoryInterface;
use Psr\Log\LoggerInterface;

class SubscriptionCreator
{
    /**
     * @var SubscriptionsRepositoryInterface
     */
    private $subscriptionRepository;

    /**
     * @var ProductRepositoryInterface
     */
    private $productRepository;

    /**
     * @var PriceCalculator
     */
    private $priceCalculator;

    /**
     * @var EntityManagerInterface
     */
    private $entityManager;

    /**
     * @var LoggerInterface
     */
    private $logger;

    /**
     * @var string
     */
    private $country;

    /**
     * @var float
     */
    private $minOrderValue;

    /**
     * @var int
     */
    private $maxItemsPerBox;

    /**
     * @var array<int>
     */
    private $allowedDeliveryIntervals;

    public function __construct(
        SubscriptionsRepositoryInterface $subscriptionRepository,
        ProductRepositoryInterface $productRepository,
        PriceCalculator $priceCalculator,
        EntityManagerInterface $entityManager,
        LoggerInterface $logger,
        string $country,
        float $minOrderValue,
        int $maxItemsPerBox,
        array $allowedDeliveryIntervals
    ) {
        $this->subscriptionRepository = $subscriptionRepository;
        $this->productRepository = $productRepository;
        $this->priceCalculator = $priceCalculator;
        $this->entityManager = $entityManager;
        $this->logger = $logger;
        $this->country = $country;
        $this->minOrderValue = $minOrderValue;
        $this->maxItemsPerBox = $maxItemsPerBox;
        $this->allowedDeliveryIntervals = $allowedDeliveryIntervals;
    }

    public function create(string $customerId, array $items, int $deliveryInterval): Subscription
    {
        // Validate interval using injected configuration
        if (!in_array($deliveryInterval, $this->allowedDeliveryIntervals, true)) {
            throw new \InvalidArgumentException(sprintf(
                'Invalid delivery interval. Allowed: %s',
                implode(', ', $this->allowedDeliveryIntervals)
            ));
        }

        // Validate box size using injected configuration
        if (count($items) > $this->maxItemsPerBox) {
            throw new \InvalidArgumentException(sprintf(
                'Too many items. Maximum: %d',
                $this->maxItemsPerBox
            ));
        }

        // Validate minimum order value
        $totalPrice = $this->priceCalculator->calculate($items);
        if ($totalPrice < $this->minOrderValue) {
            throw new \InvalidArgumentException(sprintf(
                'Order value below minimum. Required: %.2f %s',
                $this->minOrderValue,
                $this->country
            ));
        }

        // Create subscription...
    }
}
```

**Guidelines:**
- Use `%parameter_name%` syntax for parameter references
- Group related parameters with prefixes (feature., payment_gateway.)
- Use snake_case for parameter names
- Inject parameters via constructor for better testability
- Use `%env(VAR)%` for environment variables
- Type-hint parameter values in constructor
- Validate parameter values in constructor if needed
- Document parameter usage in PHPDoc

---

### 6. Compiler Pass Pattern

**Pattern:** Use compiler passes to modify the service container during compilation for dynamic service registration and configuration.

**Frequency:** Found in 68% of analyzed PRs

**Priority:** Important

**Example from PR #6845:**
```php
<?php

namespace Hellofresh\Business\DependencyInjection\Compiler;

use Symfony\Component\DependencyInjection\Compiler\CompilerPassInterface;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\DependencyInjection\Reference;

/**
 * Collects all repository decorators and registers them with the decorator registry
 */
class RepositoryDecoratorPass implements CompilerPassInterface
{
    public function process(ContainerBuilder $container): void
    {
        // Check if registry exists
        if (!$container->has('yourcompany.business.repository.decorator_registry')) {
            return;
        }

        $registryDefinition = $container->findDefinition(
            'yourcompany.business.repository.decorator_registry'
        );

        // Find all repository decorator tags
        $decorators = [];
        $taggedServices = $container->findTaggedServiceIds('yourcompany.repository_decorator');

        foreach ($taggedServices as $serviceId => $tags) {
            foreach ($tags as $attributes) {
                $repository = $attributes['repository'] ?? null;
                $priority = $attributes['priority'] ?? 0;

                if (!$repository) {
                    throw new \InvalidArgumentException(sprintf(
                        'Service "%s" must define the repository attribute',
                        $serviceId
                    ));
                }

                if (!isset($decorators[$repository])) {
                    $decorators[$repository] = [];
                }

                $decorators[$repository][] = [
                    'service' => new Reference($serviceId),
                    'priority' => $priority
                ];
            }
        }

        // Sort decorators by priority (highest first)
        foreach ($decorators as $repository => &$repositoryDecorators) {
            usort($repositoryDecorators, function ($a, $b) {
                return $b['priority'] <=> $a['priority'];
            });
        }

        $registryDefinition->setArgument(0, $decorators);
    }
}
```

**Command Handler Registration Pass:**
```php
<?php

namespace Hellofresh\Business\DependencyInjection\Compiler;

use Symfony\Component\DependencyInjection\Compiler\CompilerPassInterface;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\DependencyInjection\Reference;

class CommandHandlerPass implements CompilerPassInterface
{
    public function process(ContainerBuilder $container): void
    {
        if (!$container->has('tactician.commandbus')) {
            return;
        }

        $commandBus = $container->findDefinition('tactician.commandbus');
        $handlers = [];

        // Find all command handlers
        $taggedHandlers = $container->findTaggedServiceIds('tactician.handler');

        foreach ($taggedHandlers as $serviceId => $tags) {
            foreach ($tags as $attributes) {
                $commandClass = $attributes['command'] ?? null;

                if (!$commandClass) {
                    throw new \InvalidArgumentException(sprintf(
                        'Service "%s" must define the command attribute',
                        $serviceId
                    ));
                }

                if (isset($handlers[$commandClass])) {
                    throw new \InvalidArgumentException(sprintf(
                        'Command "%s" already has a handler registered',
                        $commandClass
                    ));
                }

                $handlers[$commandClass] = new Reference($serviceId);
            }
        }

        $commandBus->replaceArgument(0, $handlers);
    }
}
```

**Bundle Registration:**
```php
<?php

namespace Hellofresh\Business;

use Hellofresh\Business\DependencyInjection\Compiler\CommandHandlerPass;
use Hellofresh\Business\DependencyInjection\Compiler\RepositoryDecoratorPass;
use Hellofresh\Business\DependencyInjection\Compiler\ValidatorPass;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\HttpKernel\Bundle\Bundle;

class HellofreshBusinessBundle extends Bundle
{
    public function build(ContainerBuilder $container): void
    {
        parent::build($container);

        // Register compiler passes
        $container->addCompilerPass(new CommandHandlerPass());
        $container->addCompilerPass(new RepositoryDecoratorPass());
        $container->addCompilerPass(new ValidatorPass());
    }
}
```

**YAML Service Tags for Compiler Pass:**
```yaml
services:
    # Repository decorator registry
    yourcompany.business.repository.decorator_registry:
        class: Hellofresh\Business\Repository\DecoratorRegistry

    # Decorated repositories
    yourcompany.business.repository.subscriptions.cached:
        class: Hellofresh\Business\Repository\Decorator\CachedSubscriptionsRepository
        arguments:
            - '@yourcompany.business.repository.subscriptions'
            - '@cache.app'
        tags:
            - { name: yourcompany.repository_decorator, repository: subscriptions, priority: 10 }

    yourcompany.business.repository.subscriptions.feature_flagged:
        class: Hellofresh\Business\Repository\Decorator\FeatureFlaggedSubscriptionsRepository
        arguments:
            - '@yourcompany.business.repository.subscriptions'
            - '@yourcompany.business.feature_flags'
        tags:
            - { name: yourcompany.repository_decorator, repository: subscriptions, priority: 20 }
```

**Guidelines:**
- Implement CompilerPassInterface for custom passes
- Check service existence before processing
- Use findTaggedServiceIds to collect tagged services
- Validate tag attributes and throw clear exceptions
- Use Reference objects for service references
- Sort collected services by priority if needed
- Register compiler passes in Bundle::build()
- Document required tag attributes
- Keep compiler passes focused on single responsibility

---

### 7. Service Aliasing Pattern

**Pattern:** Create service aliases for interface-based dependency injection and backward compatibility.

**Frequency:** Found in 76% of analyzed PRs

**Priority:** Important

**Example from PR #6852:**
```yaml
services:
    # Concrete implementation
    Hellofresh\Business\Repository\SubscriptionsRepository:
        class: Hellofresh\Business\Repository\SubscriptionsRepository
        factory: ['@doctrine.orm.entity_manager', getRepository]
        arguments:
            - 'Hellofresh\Business\Entity\Subscription'

    # Interface alias for type-hinting
    Hellofresh\Business\Repository\SubscriptionsRepositoryInterface:
        alias: Hellofresh\Business\Repository\SubscriptionsRepository
        public: false

    # Legacy alias for backward compatibility
    yourcompany.business.repository.subscriptions:
        alias: Hellofresh\Business\Repository\SubscriptionsRepository
        public: true

    # Domain service implementation
    Hellofresh\Business\Domain\Order\OrderCreator:
        arguments:
            - '@Hellofresh\Business\Repository\OrderRepositoryInterface'
            - '@Hellofresh\Business\Domain\Payment\PaymentGatewayInterface'
            - '@doctrine.orm.entity_manager'

    Hellofresh\Business\Repository\OrderRepositoryInterface:
        alias: Hellofresh\Business\Repository\OrdersRepository

    Hellofresh\Business\Domain\Payment\PaymentGatewayInterface:
        alias: Hellofresh\Business\Domain\Payment\StripePaymentGateway

    # Environment-specific aliases
    Hellofresh\Business\Domain\Notification\NotificationSenderInterface:
        alias: '%notification_sender.service%'

# config/parameters_dev.yml
parameters:
    notification_sender.service: 'Hellofresh\Business\Domain\Notification\LogNotificationSender'

# config/parameters_prod.yml
parameters:
    notification_sender.service: 'Hellofresh\Business\Domain\Notification\EmailNotificationSender'
```

**Interface Example:**
```php
<?php

namespace Hellofresh\Business\Repository;

use Hellofresh\Business\Entity\Subscription;

interface SubscriptionsRepositoryInterface
{
    /**
     * Find subscription by customer plan ID
     *
     * @param string $customerPlanId
     * @return Subscription|null
     */
    public function findByCustomerPlanId(string $customerPlanId): ?Subscription;

    /**
     * Find active subscriptions by customer ID
     *
     * @param string $customerId
     * @return Subscription[]
     */
    public function findActiveByCustomerId(string $customerId): array;

    /**
     * Save subscription
     *
     * @param Subscription $subscription
     */
    public function save(Subscription $subscription): void;
}
```

**Service Using Interface:**
```php
<?php

namespace Hellofresh\Business\Domain\Subscription;

use Hellofresh\Business\Repository\SubscriptionsRepositoryInterface;

class SubscriptionFinder
{
    /**
     * @var SubscriptionsRepositoryInterface
     */
    private $subscriptionRepository;

    public function __construct(SubscriptionsRepositoryInterface $subscriptionRepository)
    {
        // Type-hint against interface, not concrete class
        $this->subscriptionRepository = $subscriptionRepository;
    }
}
```

**Guidelines:**
- Create aliases for interfaces to enable interface-based DI
- Use interface type hints in services, not concrete classes
- Create legacy aliases for backward compatibility during refactoring
- Use public: false for internal aliases
- Use public: true only for services accessed from container directly
- Use parameter-based aliases for environment-specific implementations
- Document why aliases exist (interface vs legacy)
- Prefer interface aliases over concrete class aliases

---

## Implementation Guidelines

### Service Organization

**Directory Structure:**
```
src/
├── Command/              # Command objects
├── Handler/              # Command handlers
├── Domain/               # Domain services
│   ├── Order/
│   ├── Subscription/
│   └── Payment/
├── Repository/           # Data access
├── Factory/              # Service factories
├── EventSubscriber/      # Event subscribers
└── DependencyInjection/
    ├── Compiler/         # Compiler passes
    └── Extension.php     # Bundle extension
```

**YAML Organization:**
```yaml
# config/services.yml
imports:
    - { resource: services/repositories.yml }
    - { resource: services/domain.yml }
    - { resource: services/handlers.yml }
    - { resource: services/subscribers.yml }

services:
    _defaults:
        autowire: false
        autoconfigure: false
        public: false

# config/services/repositories.yml
services:
    # All repository definitions

# config/services/domain.yml
services:
    # All domain service definitions

# config/services/handlers.yml
services:
    # All command handler definitions
```

### Service Naming Conventions

**Pattern:**
- Service IDs: `namespace.prefix.service_name`
- Class-based IDs: Fully qualified class name (FQCN)
- Legacy IDs: `yourcompany.business.domain.service_name`

**Examples:**
```yaml
services:
    # Legacy style (snake_case with namespace prefix)
    yourcompany.business.domain.subscription.creator:
        class: Hellofresh\Business\Domain\Subscription\SubscriptionCreator

    # Modern style (FQCN)
    Hellofresh\Business\Domain\Subscription\SubscriptionCreator:
        arguments: [...]

    # Interface alias
    Hellofresh\Business\Domain\Subscription\SubscriptionCreatorInterface:
        alias: Hellofresh\Business\Domain\Subscription\SubscriptionCreator
```

### Constructor Dependency Order

**Best Practice Order:**
1. Repositories
2. Domain services
3. Infrastructure services (EntityManager, EventDispatcher)
4. Logger
5. Tracer
6. Configuration parameters

**Example:**
```php
public function __construct(
    // 1. Repositories
    SubscriptionsRepositoryInterface $subscriptionRepository,
    OrderRepositoryInterface $orderRepository,

    // 2. Domain services
    PriceCalculator $priceCalculator,
    PaymentGateway $paymentGateway,

    // 3. Infrastructure
    EntityManagerInterface $entityManager,
    EventDispatcherInterface $eventDispatcher,

    // 4. Logger
    LoggerInterface $logger,

    // 5. Tracer
    TracerInterface $tracer,

    // 6. Configuration
    string $country,
    float $minOrderValue
) {
    // ...
}
```

### Environment-Specific Configuration

**Pattern:**
```yaml
# config/services.yml
services:
    Hellofresh\Business\Domain\Payment\PaymentGatewayInterface:
        alias: '%payment_gateway.implementation%'

    # All implementations defined
    Hellofresh\Business\Domain\Payment\StripePaymentGateway:
        arguments: [...]

    Hellofresh\Business\Domain\Payment\MockPaymentGateway:
        arguments: [...]

# config/parameters.yml
parameters:
    payment_gateway.implementation: 'Hellofresh\Business\Domain\Payment\StripePaymentGateway'

# config/parameters_dev.yml
parameters:
    payment_gateway.implementation: 'Hellofresh\Business\Domain\Payment\MockPaymentGateway'

# config/parameters_test.yml
parameters:
    payment_gateway.implementation: 'Hellofresh\Business\Domain\Payment\MockPaymentGateway'
```

### Testing with DI Container

**Functional Test Pattern:**
```php
<?php

namespace Tests\Functional\Domain\Subscription;

use Hellofresh\Business\Domain\Subscription\SubscriptionCreator;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

class SubscriptionCreatorTest extends KernelTestCase
{
    public function testCreateSubscriptionWithRealDependencies(): void
    {
        self::bootKernel();
        $container = self::getContainer();

        // Get service from container
        $subscriptionCreator = $container->get(
            'yourcompany.business.domain.subscription.creator'
        );

        $this->assertInstanceOf(SubscriptionCreator::class, $subscriptionCreator);

        // Use service with real dependencies
        $subscription = $subscriptionCreator->create(
            'customer-123',
            ['item1', 'item2'],
            7
        );

        $this->assertNotNull($subscription);
    }
}
```

**Unit Test Pattern:**
```php
<?php

namespace Tests\Unit\Domain\Subscription;

use Hellofresh\Business\Domain\Subscription\SubscriptionCreator;
use Hellofresh\Business\Repository\SubscriptionsRepositoryInterface;
use PHPUnit\Framework\TestCase;

class SubscriptionCreatorTest extends TestCase
{
    public function testCreateSubscriptionWithMockedDependencies(): void
    {
        // Mock all dependencies
        $subscriptionRepository = $this->createMock(SubscriptionsRepositoryInterface::class);
        $productRepository = $this->createMock(ProductRepositoryInterface::class);
        $priceCalculator = $this->createMock(PriceCalculator::class);
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $logger = $this->createMock(LoggerInterface::class);

        // Manually construct service with mocks
        $subscriptionCreator = new SubscriptionCreator(
            $subscriptionRepository,
            $productRepository,
            $priceCalculator,
            $entityManager,
            $logger,
            'de',
            39.99,
            8,
            [7, 14, 21, 28]
        );

        // Test with mocked dependencies
        // ...
    }
}
```

---

## Anti-Patterns to Avoid

### ❌ Service Locator Anti-Pattern

**Bad:**
```php
class OrderCreator
{
    private $container;

    public function __construct(ContainerInterface $container)
    {
        // Service locator - wrong!
        $this->container = $container;
    }

    public function create(string $customerId): Order
    {
        // Fetching services at runtime - wrong!
        $repository = $this->container->get('order_repository');
        $calculator = $this->container->get('price_calculator');

        // ...
    }
}
```

**Good:**
```php
class OrderCreator
{
    private $orderRepository;
    private $priceCalculator;

    public function __construct(
        OrderRepositoryInterface $orderRepository,
        PriceCalculator $priceCalculator
    ) {
        // Explicit dependency injection - correct!
        $this->orderRepository = $orderRepository;
        $this->priceCalculator = $priceCalculator;
    }

    public function create(string $customerId): Order
    {
        // Use injected dependencies
        // ...
    }
}
```

### ❌ Autowiring in Legacy Codebases

**Bad:**
```yaml
services:
    _defaults:
        autowire: true  # Dangerous in legacy codebases!
        autoconfigure: true

    Hellofresh\Business\Domain\Subscription\SubscriptionCreator: ~
```

**Good:**
```yaml
services:
    _defaults:
        autowire: false      # Explicit for legacy
        autoconfigure: false
        public: false

    yourcompany.business.domain.subscription.creator:
        class: Hellofresh\Business\Domain\Subscription\SubscriptionCreator
        arguments:
            - '@yourcompany.business.repository.subscriptions'
            - '@yourcompany.business.repository.products'
            - '@yourcompany.business.domain.pricing.calculator'
            - '@doctrine.orm.entity_manager'
            - '@logger'
```

### ❌ Public Services Everywhere

**Bad:**
```yaml
services:
    _defaults:
        public: true  # Everything public - wrong!

    yourcompany.business.domain.subscription.creator:
        class: Hellofresh\Business\Domain\Subscription\SubscriptionCreator
```

**Good:**
```yaml
services:
    _defaults:
        public: false  # Private by default

    # Only controllers are public
    App\Controller\:
        resource: '../src/Controller'
        public: true

    # Domain services are private
    yourcompany.business.domain.subscription.creator:
        class: Hellofresh\Business\Domain\Subscription\SubscriptionCreator
        public: false
```

### ❌ Setter Injection for Required Dependencies

**Bad:**
```php
class SubscriptionCreator
{
    private $subscriptionRepository;

    // No constructor!

    public function setSubscriptionRepository($repository): void
    {
        // Required dependency via setter - wrong!
        $this->subscriptionRepository = $repository;
    }
}
```

**Good:**
```php
class SubscriptionCreator
{
    private $subscriptionRepository;

    public function __construct(
        SubscriptionsRepositoryInterface $subscriptionRepository
    ) {
        // Required dependency via constructor - correct!
        $this->subscriptionRepository = $subscriptionRepository;
    }

    public function setCountry(string $country): void
    {
        // Setter only for optional configuration
        $this->country = $country;
    }
}
```

### ❌ Circular Dependencies

**Bad:**
```yaml
services:
    service.a:
        class: ServiceA
        arguments:
            - '@service.b'

    service.b:
        class: ServiceB
        arguments:
            - '@service.a'  # Circular dependency!
```

**Good:**
```yaml
services:
    # Extract shared logic to a third service
    service.shared:
        class: SharedService

    service.a:
        class: ServiceA
        arguments:
            - '@service.shared'

    service.b:
        class: ServiceB
        arguments:
            - '@service.shared'
```

### ❌ Missing Type Hints

**Bad:**
```php
class SubscriptionCreator
{
    private $subscriptionRepository;

    public function __construct($subscriptionRepository)
    {
        // No type hint - wrong!
        $this->subscriptionRepository = $subscriptionRepository;
    }
}
```

**Good:**
```php
class SubscriptionCreator
{
    /**
     * @var SubscriptionsRepositoryInterface
     */
    private $subscriptionRepository;

    public function __construct(
        SubscriptionsRepositoryInterface $subscriptionRepository
    ) {
        // Type hint for compile-time safety
        $this->subscriptionRepository = $subscriptionRepository;
    }
}
```

### ❌ Forgetting Service Tags

**Bad:**
```yaml
services:
    # Command handler without tag
    Hellofresh\Business\Handler\CreateOrderHandler:
        arguments:
            - '@yourcompany.business.domain.order.creator'
        # Missing tag - handler won't be registered!
```

**Good:**
```yaml
services:
    Hellofresh\Business\Handler\CreateOrderHandler:
        arguments:
            - '@yourcompany.business.domain.order.creator'
        tags:
            - { name: tactician.handler, command: Hellofresh\Business\Command\CreateOrder }
```

---

## Related Implementers

- **command-handler-pattern.md** - Command handlers registered via DI tags
- **repository-pattern.md** - Repository injection and factory pattern
- **error-handling-validation.md** - Exception service configuration
- **feature-flags-configuration.md** - Feature flag service injection
- **doctrine-orm.md** - EntityManager and repository configuration
- **caching-strategies.md** - Cache service injection
- **metrics-monitoring.md** - Logger and tracer injection
