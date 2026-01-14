---
domain: command-handler-pattern
description: Command/Handler pattern using command bus for business logic execution with Symfony dependency injection
---

# Command/Handler Pattern Implementer

You are responsible for implementing the Command/Handler pattern for executing business operations in a structured, testable, and maintainable way.

## Core Patterns

### 1. Command Definition Pattern

**Pattern:** Define immutable command objects that encapsulate request parameters and context.

**Frequency:** Found in 80% of analyzed PRs

**Priority:** Critical

**Example from PR #6654:**
```php
<?php

namespace YourCompany\Business\Command\Plan;

use YourCompany\Business\Command\Command;
use YourCompany\Business\Security\SecurityTokenInterface;

class ChangePlanDeliveryDetails extends Command
{
    /**
     * @var string
     */
    public $customerPlanId;

    /**
     * @var string|null
     */
    public $deliveryTime;

    /**
     * @var int|null
     */
    public $deliveryInterval;

    /**
     * @var string|null
     */
    public $firstDeliveryOptionHandle;

    /**
     * @var string|null
     */
    public $firstDeliveryDate;

    /**
     * @var string|null
     */
    public $deliveryStart;

    public function __construct(
        SecurityTokenInterface $token,
        string $customerPlanId,
        string $deliveryTime = null,
        int $deliveryInterval = null,
        string $firstDeliveryOptionHandle = null,
        string $firstDeliveryDate = null,
        string $deliveryStart = null
    ) {
        parent::__construct($token);

        $this->customerPlanId = $customerPlanId;
        $this->deliveryTime = $deliveryTime;
        $this->deliveryInterval = $deliveryInterval;
        $this->firstDeliveryOptionHandle = $firstDeliveryOptionHandle;
        $this->firstDeliveryDate = $firstDeliveryDate;
        $this->deliveryStart = $deliveryStart;
    }
}
```

**Guidelines:**
- Commands should be immutable after construction
- Include SecurityToken for authorization context
- Use public properties for simplicity (legacy pattern)
- Type-hint all parameters strictly
- Document with PHPDoc for IDE support
- Commands contain NO business logic
- Commands are serializable for async processing

---

### 2. Command Handler Pattern

**Pattern:** Create dedicated handler classes that execute domain logic for each command.

**Frequency:** Found in 80% of analyzed PRs

**Priority:** Critical

**Example from PR #6654:**
```php
<?php

namespace YourCompany\Business\Handler\Plan;

use YourCompany\Business\Command\Plan\ChangePlanDeliveryDetails;
use YourCompany\Business\Domain\Subscription\DeliveryDetailsChanger;
use YourCompany\Business\Domain\Subscription\ReactivationSource;
use YourCompany\Business\Entity\Subscription;
use YourCompany\Business\Security\AuthorizationCheckerInterface;

class ChangePlanDeliveryDetailsHandler
{
    /**
     * @var DeliveryDetailsChanger
     */
    private $deliveryDetailsChanger;

    /**
     * @var AuthorizationCheckerInterface
     */
    private $authorizationChecker;

    public function __construct(
        DeliveryDetailsChanger $deliveryDetailsChanger,
        AuthorizationCheckerInterface $authorizationChecker
    ) {
        $this->deliveryDetailsChanger = $deliveryDetailsChanger;
        $this->authorizationChecker = $authorizationChecker;
    }

    /**
     * @param ChangePlanDeliveryDetails $command
     * @return Subscription
     * @throws \Throwable
     */
    public function handle(ChangePlanDeliveryDetails $command): Subscription
    {
        // Authorization check
        $this->authorizationChecker->checkSubscriptionAccess(
            $command->customerPlanId,
            $command->getToken()
        );

        // Delegate to domain service
        return $this->deliveryDetailsChanger->change(
            $command->customerPlanId,
            ReactivationSource::SPLITTED_ENDPOINT,
            $command->deliveryTime,
            $command->deliveryInterval,
            $command->firstDeliveryOptionHandle,
            $command->firstDeliveryDate,
            $command->deliveryStart
        );
    }
}
```

**Guidelines:**
- One handler per command (1:1 mapping)
- Handler contains orchestration logic only
- Inject domain services via constructor
- Always check authorization first
- Delegate business logic to domain services
- Return domain entities, not DTOs
- Type-hint return values
- Document exceptions with @throws

---

### 3. Controller Command Execution Pattern

**Pattern:** Controllers create and execute commands via the command bus.

**Frequency:** Found in 80% of analyzed PRs

**Priority:** Critical

**Example from PR #6654:**
```php
<?php

namespace App\Controllers;

use YourCompany\Business\Command\Plan\ChangePlanDeliveryDetails;
use YourCompany\Business\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;

class PlansController extends AbstractController
{
    /**
     * @SWG\Api(
     *   path="/plans/{id}/changePlanDeliveryDetails",
     *   @SWG\Operation(
     *     method="POST",
     *     summary="Change plan delivery details",
     *     @SWG\Parameter(
     *       name="id",
     *       description="Customer plan ID",
     *       required=true,
     *       type="string",
     *       paramType="path"
     *     ),
     *     @SWG\Parameter(
     *       name="deliveryOption",
     *       description="Delivery option handle",
     *       required=false,
     *       type="string",
     *       paramType="form"
     *     ),
     *     @SWG\Parameter(
     *       name="deliveryInterval",
     *       description="Delivery interval in days",
     *       required=false,
     *       type="integer",
     *       paramType="form"
     *     ),
     *     @SWG\Parameter(
     *       name="firstDeliveryOption",
     *       description="First delivery option handle",
     *       required=false,
     *       type="string",
     *       paramType="form"
     *     ),
     *     @SWG\Parameter(
     *       name="firstDeliveryDate",
     *       description="First delivery date (Y-m-d)",
     *       required=false,
     *       type="string",
     *       paramType="form"
     *     ),
     *     @SWG\Parameter(
     *       name="deliveryStart",
     *       description="Delivery start date (Y-m-d)",
     *       required=false,
     *       type="string",
     *       paramType="form"
     *     ),
     *     @SWG\ResponseMessage(code=200),
     *     @SWG\Partial("error400"),
     *     @SWG\Partial("error404")
     *   )
     * )
     */
    public function postPlanChangeDeliveryDetails(string $customerPlanId): Response
    {
        return $this->jsonResponse($this->execute(new ChangePlanDeliveryDetails(
            $this->getToken(),
            $customerPlanId,
            $this->getInputParam("deliveryOption"),
            $this->getInputParam("deliveryInterval"),
            $this->getInputParam("firstDeliveryOption"),
            $this->getInputParam("firstDeliveryDate"),
            $this->getInputParam("deliveryStart")
        )));
    }
}
```

**Guidelines:**
- Use Swagger/OpenAPI annotations for documentation
- Extract input params using `getInputParam()`
- Pass security token from `$this->getToken()`
- Execute command via `$this->execute()`
- Return JSON response with `$this->jsonResponse()`
- No business logic in controllers
- Controllers are thin orchestration layer

---

### 4. Domain Service Integration Pattern

**Pattern:** Handler delegates to domain services that contain business logic.

**Frequency:** Found in 73% of analyzed PRs

**Priority:** Critical

**Example from PR #6654:**
```php
<?php

namespace YourCompany\Business\Domain\Subscription;

use Doctrine\ORM\EntityManagerInterface;
use YourCompany\Business\Entity\Subscription;
use YourCompany\Business\Exception\BadRequestException;
use YourCompany\Business\Helper\Metric\Prometheus;
use YourCompany\Business\Metrics\TraceHelper;
use YourCompany\Business\Repository\DeliveryOptionsRepositoryInterface;
use YourCompany\Business\Repository\SubscriptionsRepositoryInterface;
use InvalidArgumentException;
use OpenCensus\Trace\Tracer\TracerInterface;
use Psr\Log\LoggerInterface;

class DeliveryDetailsChanger
{
    /**
     * @var SubscriptionsRepositoryInterface
     */
    private $subscriptionsRepository;

    /**
     * @var DeliveryOptionsRepositoryInterface
     */
    private $deliveryOptionsRepository;

    /**
     * @var EntityManagerInterface
     */
    private $entityManager;

    /**
     * @var LoggerInterface
     */
    private $logger;

    /**
     * @var TracerInterface
     */
    private $tracer;

    /**
     * @var OneOffChanges
     */
    private $oneOffChanges;

    /**
     * @var SubscriptionDeliveryInterval
     */
    private $subscriptionDeliveryInterval;

    public function __construct(
        SubscriptionsRepositoryInterface $subscriptionsRepository,
        DeliveryOptionsRepositoryInterface $deliveryOptionsRepository,
        EntityManagerInterface $entityManager,
        LoggerInterface $logger,
        TracerInterface $tracer,
        OneOffChanges $oneOffChanges,
        SubscriptionDeliveryInterval $subscriptionDeliveryInterval
    ) {
        $this->subscriptionsRepository = $subscriptionsRepository;
        $this->deliveryOptionsRepository = $deliveryOptionsRepository;
        $this->entityManager = $entityManager;
        $this->logger = $logger;
        $this->tracer = $tracer;
        $this->oneOffChanges = $oneOffChanges;
        $this->subscriptionDeliveryInterval = $subscriptionDeliveryInterval;
    }

    /**
     * Change delivery details for a subscription
     *
     * @param string $planId The subscription/plan ID
     * @param string $source The source of the change request
     * @param string|null $deliveryOptionHandle The delivery option handle (time)
     * @param int|null $deliveryInterval The delivery interval
     * @param string|null $firstDeliveryOptionHandle The first delivery option handle
     * @param string|null $firstDeliveryDate The first delivery date
     * @param string|null $deliveryStart The new delivery start date (Y-m-d format)
     * @return Subscription
     * @throws \Throwable
     */
    public function change(
        string $planId,
        string $source,
        string $deliveryOptionHandle = null,
        int $deliveryInterval = null,
        string $firstDeliveryOptionHandle = null,
        string $firstDeliveryDate = null,
        string $deliveryStart = null
    ): Subscription {
        $span = $this->startSpan($this->tracer, 'subscriptionsRepository.findByCustomerPlanId');
        $subscription = $this->subscriptionsRepository->findByCustomerPlanId($planId);
        $this->endSpan($span);

        if (!$subscription) {
            throw new BadRequestException('Subscription not found');
        }

        // No-op if neither delivery option nor interval provided
        if (!$deliveryOptionHandle && !$deliveryInterval) {
            return clone $subscription;
        }

        // Handle first delivery option for reactivation
        if ($firstDeliveryOptionHandle && $firstDeliveryDate) {
            $this->handleFirstDeliveryOption(
                $subscription,
                $firstDeliveryOptionHandle,
                $deliveryOptionHandle,
                $firstDeliveryDate
            );
        }

        // Begin transaction
        $this->entityManager->beginTransaction();

        try {
            // Validate and apply delivery option
            if ($deliveryOptionHandle) {
                $deliveryOption = $this->deliveryOptionsRepository->findByHandle($deliveryOptionHandle);

                if (!$deliveryOption) {
                    throw new BadRequestException('Delivery option not found');
                }

                if ($deliveryOption->getType() === 'TYPE_NEXT_DAY_DELIVERY') {
                    throw new BadRequestException('Cannot set NDD as plan delivery option');
                }

                if ($deliveryOption->getCountry() !== $this->country) {
                    throw new BadRequestException('Delivery option country mismatch');
                }

                $subscription->setDeliveryTime($deliveryOption->getHandle());
                $subscription->setDeliveryWeekday($deliveryOption->getDeliveryDay());

                $this->logger->info('Delivery time and weekday set on subscription');
            }

            // Handle delivery start date change
            if ($deliveryStart) {
                $this->handleDeliveryStartChange($subscription, $deliveryStart, $deliveryOption);
            }

            // Handle interval change
            if ($deliveryInterval !== null) {
                if ($subscription->getDeliveryInterval() !== $deliveryInterval
                    && $subscription->getEndlessPausedAt()) {
                    throw new InvalidArgumentException(
                        'Cannot change interval while subscription is endlessly paused'
                    );
                }

                $this->subscriptionDeliveryInterval->change($subscription, $deliveryInterval);
            }

            // Persist changes
            $this->subscriptionsRepository->save($subscription);

            // Write history
            $this->writeSubscriptionHistory($subscription, $oldSubscription);

            // Dispatch events
            $this->dispatchPostUpdateEvents($subscription, $oldSubscription);

            // Write subscription event
            $this->writeSubscriptionEvent($subscription, $oldSubscription);

            // Commit transaction
            $this->entityManager->commit();

            // Record metrics
            Prometheus::histogram(
                'subscription_delivery_details_change_duration_seconds',
                'Duration of delivery details change',
                ['country' => $this->country, 'source' => $source, 'result' => 'success']
            );

            return $subscription;
        } catch (\Throwable $e) {
            $this->entityManager->rollback();

            Prometheus::histogram(
                'subscription_delivery_details_change_duration_seconds',
                'Duration of delivery details change',
                ['country' => $this->country, 'source' => $source, 'result' => 'failure']
            );

            throw $e;
        }
    }

    private function handleFirstDeliveryOption(
        Subscription $subscription,
        string $firstDeliveryOptionHandle,
        string $deliveryOptionHandle,
        string $firstDeliveryDate
    ): void {
        if ($firstDeliveryOptionHandle === $deliveryOptionHandle) {
            throw new BadRequestException(
                'First delivery option must differ from delivery option'
            );
        }

        $firstDeliveryOption = $this->deliveryOptionsRepository->findByHandle($firstDeliveryOptionHandle);

        if (!$firstDeliveryOption) {
            throw new BadRequestException('First delivery option not found');
        }

        if ($firstDeliveryOption->getType() === 'TYPE_PLAN') {
            throw new BadRequestException('First delivery option cannot be PLAN type');
        }

        // Validate cutoff
        $week = new Week($firstDeliveryDate);
        $cutoffValid = CutoffWeek::isWeekActionableForDeliveryOption(
            $week,
            $subscription->getPostcode(),
            $firstDeliveryOption,
            $this->cutoffRepository
        );

        if (!$cutoffValid) {
            throw new BadRequestException('First delivery option is past cutoff');
        }

        // Create one-off for first delivery
        $this->oneOffChanges->createForSubscription(
            $subscription,
            $week,
            null,
            null,
            $firstDeliveryOption,
            ReactivationSource::SPLITTED_ENDPOINT,
            false,
            false // skipValidation
        );
    }

    private function handleDeliveryStartChange(
        Subscription $subscription,
        string $deliveryStart,
        DeliveryOption $deliveryOption
    ): void {
        $deliveryStartDate = new \DateTime($deliveryStart);
        $oldDeliveryStartDate = $subscription->getDeliveryStart();

        $subscription->setDeliveryStart($deliveryStartDate);

        $initialOrder = $subscription->getInitialOrder();
        $initialDeliveryOptionChanged = false;

        if ($initialOrder) {
            $initialDeliveryDate = $initialOrder->getDeliveryStart();

            if ($initialDeliveryDate
                && $initialDeliveryDate->format('Y-m-d') !== $deliveryStartDate->format('Y-m-d')) {
                $initialDeliveryOptionChanged = true;
                $this->logger->info('Delivery start date changed from initial order', [
                    'initial_delivery_date' => $initialDeliveryDate->format('Y-m-d'),
                    'new_delivery_date' => $deliveryStartDate->format('Y-m-d')
                ]);
            }

            if ($initialOrder->getDeliveryTime() !== $deliveryOption->getHandle()) {
                $initialDeliveryOptionChanged = true;
                $this->logger->info('Delivery time changed from initial order', [
                    'initial_delivery_time' => $initialOrder->getDeliveryTime(),
                    'new_delivery_time' => $deliveryOption->getHandle()
                ]);
            }
        }

        $this->logger->info('Delivery start date set on subscription', [
            'delivery_start' => $deliveryStart,
            'initial_delivery_option_changed' => $initialDeliveryOptionChanged
        ]);

        if ($initialDeliveryOptionChanged) {
            // Create one-off changes for delivery start difference
            $this->createOneOffChangesForDeliveryStart(
                $subscription,
                $oldDeliveryStartDate,
                $deliveryStartDate,
                $deliveryOption
            );
        }
    }

    private function startSpan(TracerInterface $tracer, string $name)
    {
        return TraceHelper::startSpan($tracer, $name);
    }

    private function endSpan($span): void
    {
        if ($span) {
            $span->finish();
        }
    }
}
```

**Guidelines:**
- Domain services contain pure business logic
- Inject all dependencies via constructor
- Use repositories for data access
- Use EntityManager for transactions
- Use distributed tracing for observability
- Log important state changes
- Record metrics for monitoring
- Validate inputs thoroughly
- Throw domain exceptions with clear messages
- Return domain entities
- Follow single responsibility principle

---

### 5. Command Bus Registration Pattern

**Pattern:** Register command-handler mappings in dependency injection configuration.

**Frequency:** Found in 80% of analyzed PRs

**Priority:** Critical

**Example configuration:**
```yaml
# services.yml
services:
    # Command Handlers
    YourCompany\Business\Handler\Plan\ChangePlanDeliveryDetailsHandler:
        arguments:
            - '@yourcompany.business.domain.subscription.delivery_details_changer'
            - '@yourcompany.business.security.authorization_checker'
        tags:
            - { name: tactician.handler, command: YourCompany\Business\Command\Plan\ChangePlanDeliveryDetails }

    # Domain Services
    yourcompany.business.domain.subscription.delivery_details_changer:
        class: YourCompany\Business\Domain\Subscription\DeliveryDetailsChanger
        arguments:
            - '@yourcompany.business.repository.subscriptions'
            - '@yourcompany.business.repository.delivery_options'
            - '@doctrine.orm.entity_manager'
            - '@logger'
            - '@opencensus.tracer'
            - '@yourcompany.business.domain.subscription.one_off_changes'
            - '@yourcompany.business.domain.subscription.delivery_interval'
```

**Guidelines:**
- Use Symfony service configuration
- Register handlers with `tactician.handler` tag
- Map command class to handler via tag
- Inject all dependencies explicitly
- Use service IDs for domain services
- Keep configuration organized by domain

---

### 6. Transaction Management Pattern

**Pattern:** Use Doctrine EntityManager for database transactions within handlers.

**Frequency:** Found in 75% of analyzed PRs

**Priority:** Critical

**Example from PR #6654:**
```php
public function change(string $planId, string $source, ...): Subscription
{
    // ... load entities ...

    $this->entityManager->beginTransaction();

    try {
        // Perform all mutations
        $subscription->setDeliveryTime($deliveryOption->getHandle());
        $subscription->setDeliveryWeekday($deliveryOption->getDeliveryDay());

        // Persist changes
        $this->subscriptionsRepository->save($subscription);

        // Write audit log
        $this->writeSubscriptionHistory($subscription, $oldSubscription);

        // Dispatch domain events
        $this->dispatchPostUpdateEvents($subscription, $oldSubscription);

        // Write event log
        $this->writeSubscriptionEvent($subscription, $oldSubscription);

        // Commit transaction
        $this->entityManager->commit();

        // Record success metrics
        $this->recordMetrics('success');

        return $subscription;
    } catch (\Throwable $e) {
        $this->entityManager->rollback();

        // Record failure metrics
        $this->recordMetrics('failure');

        throw $e;
    }
}
```

**Guidelines:**
- Always use explicit transactions for multi-step operations
- Begin transaction before any mutations
- Commit only after all operations succeed
- Rollback on any exception
- Record metrics after commit/rollback
- Never commit partial state
- Use transactions for consistency guarantees

---

### 7. Event Dispatching Pattern

**Pattern:** Dispatch domain events after successful state changes.

**Frequency:** Found in 68% of analyzed PRs

**Priority:** Important

**Example from PR #6666:**
```php
use Symfony\Component\EventDispatcher\EventDispatcherInterface;

class DeliveryDetailsChanger
{
    private $eventDispatcher;

    private function dispatchPostUpdateEvents(
        Subscription $newSubscription,
        Subscription $oldSubscription
    ): void {
        $event = new NextDayDeliverySubscriptionPostUpdate(
            $oldSubscription,
            $newSubscription,
            $this->nddWeek
        );

        $this->eventDispatcher->dispatch(
            SubscriptionEvents::POST_DELIVERY_DETAILS_UPDATE_WITH_NDD,
            $event
        );

        $this->logger->info('Dispatched POST_DELIVERY_DETAILS_UPDATE_WITH_NDD event', [
            'subscription_id' => $newSubscription->getCustomerPlanId(),
            'event_name' => SubscriptionEvents::POST_DELIVERY_DETAILS_UPDATE_WITH_NDD
        ]);
    }
}
```

**Event Subscriber Example:**
```php
<?php

namespace YourCompany\Business\Domain\Subscription\Subscribers;

use YourCompany\Business\Domain\Subscription\Events\NextDayDeliverySubscriptionPostUpdate;
use YourCompany\Business\Domain\Subscription\Events\SubscriptionEvents;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

class PostUpdateOneOffChangeSubscriber implements EventSubscriberInterface
{
    public static function getSubscribedEvents(): array
    {
        return [
            SubscriptionEvents::POST_UPDATE => 'onPostUpdate',
            SubscriptionEvents::POST_DELIVERY_DETAILS_UPDATE => 'onPostDeliveryDetailsUpdate',
            SubscriptionEvents::POST_DELIVERY_DETAILS_UPDATE_WITH_NDD => 'onPostDeliveryDetailsUpdateWithNdd',
        ];
    }

    public function onPostDeliveryDetailsUpdate($event): void
    {
        $subscription = $event->getNewSubscription();

        // Remove pending delivery-option one-offs
        $this->removeDeliveryOptionOneOffs($subscription);

        $this->logger->info('Removed pending delivery-option one-offs', [
            'subscription_id' => $subscription->getCustomerPlanId()
        ]);
    }

    public function onPostDeliveryDetailsUpdateWithNdd(NextDayDeliverySubscriptionPostUpdate $event): void
    {
        $subscription = $event->getNewSubscription();
        $nddWeek = $event->getNddWeek();

        // Retain NDD one-off, remove others
        $this->retainNddOneOff($subscription, $nddWeek);

        $this->logger->info('Retained NDD one-off for first delivery', [
            'subscription_id' => $subscription->getCustomerPlanId(),
            'ndd_week' => $nddWeek
        ]);
    }

    private function removeDeliveryOptionOneOffs(Subscription $subscription): void
    {
        $changeSchedules = $this->changeScheduleRepository->findPendingDeliveryOptionChanges(
            $subscription
        );

        foreach ($changeSchedules as $changeSchedule) {
            $changeSchedule->setDeliveryTime(null);
            $changeSchedule->setDeliveryWeekday(null);
            $this->changeScheduleRepository->save($changeSchedule);
        }
    }
}
```

**Guidelines:**
- Dispatch events after state changes but before commit
- Use event constants from a central class
- Event subscribers are decoupled from core logic
- Subscribers handle side effects (cleanup, notifications)
- Use event objects to carry context
- Log event dispatching for debugging
- Keep subscribers focused on single responsibility

---

## Implementation Guidelines

### Command Naming Conventions

**Pattern:**
- Verb + Noun format: `ChangePlanDeliveryDetails`, `CreateOrder`, `UpdateAddress`
- Commands represent **imperative actions**
- Handler name = Command name + "Handler"
- One command = one action

**Examples:**
- `CreateCustomerSubscription` / `CreateCustomerSubscriptionHandler`
- `CancelOrder` / `CancelOrderHandler`
- `ApplyVoucher` / `ApplyVoucherHandler`
- `UpdatePaymentMethod` / `UpdatePaymentMethodHandler`

### Handler Responsibility

**Handlers should:**
- Validate authorization
- Orchestrate domain service calls
- Handle transaction boundaries
- Catch and transform exceptions
- Return domain entities

**Handlers should NOT:**
- Contain business logic
- Access database directly
- Create entities
- Calculate business rules
- Format output

### Domain Service Responsibility

**Domain services should:**
- Contain business logic
- Validate business rules
- Manage transactions
- Dispatch domain events
- Write audit logs
- Record metrics

**Domain services should NOT:**
- Access HTTP request/response
- Handle authorization
- Format JSON
- Access session
- Call controllers

### Testing Command Handlers

**Unit Test Pattern:**
```php
<?php

namespace Tests\Unit\Handler\Plan;

use YourCompany\Business\Command\Plan\ChangePlanDeliveryDetails;
use YourCompany\Business\Domain\Subscription\DeliveryDetailsChanger;
use YourCompany\Business\Handler\Plan\ChangePlanDeliveryDetailsHandler;
use YourCompany\Business\Security\AuthorizationCheckerInterface;
use PHPUnit\Framework\TestCase;

class ChangePlanDeliveryDetailsHandlerTest extends TestCase
{
    private $deliveryDetailsChanger;
    private $authorizationChecker;
    private $handler;

    protected function setUp(): void
    {
        $this->deliveryDetailsChanger = $this->createMock(DeliveryDetailsChanger::class);
        $this->authorizationChecker = $this->createMock(AuthorizationCheckerInterface::class);

        $this->handler = new ChangePlanDeliveryDetailsHandler(
            $this->deliveryDetailsChanger,
            $this->authorizationChecker
        );
    }

    public function testHandleChangesDeliveryDetails(): void
    {
        $command = new ChangePlanDeliveryDetails(
            $this->createMockToken(),
            'customer-plan-123',
            'delivery-option-morning',
            7,
            null,
            null,
            null
        );

        $expectedSubscription = $this->createMockSubscription();

        $this->authorizationChecker
            ->expects($this->once())
            ->method('checkSubscriptionAccess')
            ->with('customer-plan-123', $command->getToken());

        $this->deliveryDetailsChanger
            ->expects($this->once())
            ->method('change')
            ->with(
                'customer-plan-123',
                'SPLITTED_ENDPOINT',
                'delivery-option-morning',
                7,
                null,
                null,
                null
            )
            ->willReturn($expectedSubscription);

        $result = $this->handler->handle($command);

        $this->assertSame($expectedSubscription, $result);
    }

    public function testHandleThrowsWhenAuthorizationFails(): void
    {
        $this->expectException(UnauthorizedException::class);

        $command = new ChangePlanDeliveryDetails(
            $this->createMockToken(),
            'customer-plan-123',
            'delivery-option-morning'
        );

        $this->authorizationChecker
            ->expects($this->once())
            ->method('checkSubscriptionAccess')
            ->willThrowException(new UnauthorizedException());

        $this->handler->handle($command);
    }
}
```

### Integration Test Pattern

**Test with real database:**
```php
<?php

namespace Tests\Integration\Handler\Plan;

use YourCompany\Business\Command\Plan\ChangePlanDeliveryDetails;
use YourCompany\Business\Handler\Plan\ChangePlanDeliveryDetailsHandler;
use Tests\Integration\IntegrationTestCase;

class ChangePlanDeliveryDetailsHandlerIntegrationTest extends IntegrationTestCase
{
    public function testHandleChangesDeliveryDetailsInDatabase(): void
    {
        // Given: A subscription in the database
        $subscription = $this->createSubscriptionInDatabase([
            'customer_plan_id' => 'test-plan-123',
            'delivery_time' => 'morning',
            'delivery_interval' => 7
        ]);

        // And: A valid command
        $command = new ChangePlanDeliveryDetails(
            $this->createTokenForCustomer($subscription->getCustomerId()),
            'test-plan-123',
            'evening',
            14
        );

        // When: Handler executes the command
        $handler = $this->getContainer()->get(ChangePlanDeliveryDetailsHandler::class);
        $result = $handler->handle($command);

        // Then: Subscription is updated in database
        $this->entityManager->clear();
        $updatedSubscription = $this->subscriptionRepository->findByCustomerPlanId('test-plan-123');

        $this->assertEquals('evening', $updatedSubscription->getDeliveryTime());
        $this->assertEquals(14, $updatedSubscription->getDeliveryInterval());

        // And: History record is created
        $historyRecords = $this->subscriptionHistoryRepository->findBySubscription($updatedSubscription);
        $this->assertCount(1, $historyRecords);
        $this->assertEquals('evening', $historyRecords[0]->getRawDelivery()['delivery_time']);

        // And: Event is created
        $eventRecords = $this->subscriptionEventRepository->findBySubscription($updatedSubscription);
        $this->assertCount(1, $eventRecords);
    }
}
```

---

## Anti-Patterns to Avoid

### ❌ Business Logic in Commands

**Bad:**
```php
class CreateOrder extends Command
{
    public function calculateTotal(): float
    {
        // Business logic in command - wrong!
        $total = 0;
        foreach ($this->items as $item) {
            $total += $item['price'] * $item['quantity'];
        }
        return $total;
    }
}
```

**Good:**
```php
class CreateOrder extends Command
{
    // Commands are data holders only
    public $customerId;
    public $items;
    // No business logic
}
```

### ❌ Handler Accessing Database Directly

**Bad:**
```php
class CreateOrderHandler
{
    public function handle(CreateOrder $command)
    {
        // Direct database access - wrong!
        $stmt = $this->connection->prepare('INSERT INTO orders ...');
        $stmt->execute([...]);
    }
}
```

**Good:**
```php
class CreateOrderHandler
{
    public function handle(CreateOrder $command)
    {
        // Delegate to domain service
        return $this->orderService->createOrder(
            $command->customerId,
            $command->items
        );
    }
}
```

### ❌ Missing Transaction Boundaries

**Bad:**
```php
public function change(string $planId, ...): Subscription
{
    // No transaction - wrong!
    $subscription->setDeliveryTime($time);
    $this->repository->save($subscription);

    // If this fails, subscription is already saved!
    $this->writeHistory($subscription);
}
```

**Good:**
```php
public function change(string $planId, ...): Subscription
{
    $this->entityManager->beginTransaction();

    try {
        $subscription->setDeliveryTime($time);
        $this->repository->save($subscription);
        $this->writeHistory($subscription);

        $this->entityManager->commit();
    } catch (\Throwable $e) {
        $this->entityManager->rollback();
        throw $e;
    }
}
```

### ❌ Forgetting Authorization Checks

**Bad:**
```php
class ChangePlanDeliveryDetailsHandler
{
    public function handle(ChangePlanDeliveryDetails $command)
    {
        // No authorization check - security vulnerability!
        return $this->deliveryDetailsChanger->change(...);
    }
}
```

**Good:**
```php
class ChangePlanDeliveryDetailsHandler
{
    public function handle(ChangePlanDeliveryDetails $command)
    {
        // Always check authorization first
        $this->authorizationChecker->checkSubscriptionAccess(
            $command->customerPlanId,
            $command->getToken()
        );

        return $this->deliveryDetailsChanger->change(...);
    }
}
```

---

## Related Implementers

- **dependency-injection-symfony.md** - Service configuration and wiring
- **testing-phpunit.md** - Testing commands and handlers
- **doctrine-orm.md** - Entity management and repositories
- **error-handling-validation.md** - Exception handling patterns
- **metrics-monitoring.md** - Recording metrics and traces
