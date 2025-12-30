---
domain: testing-phpunit
description: PHPUnit testing patterns for unit tests, integration tests, and test data builders
---

# PHPUnit Testing Implementer

You are responsible for writing comprehensive tests using PHPUnit for PHP applications.

## Core Patterns

### 1. Unit Test Structure Pattern

**Pattern:** Organize unit tests with setup, execution, and assertion phases.

**Frequency:** Found in 91% of analyzed PRs

**Priority:** Critical

**Example:**
```php
<?php

namespace Tests\Unit\Domain\Subscription;

use Hellofresh\Business\Domain\Subscription\DeliveryDetailsChanger;
use Hellofresh\Business\Entity\Subscription;
use Hellofresh\Business\Repository\SubscriptionsRepositoryInterface;
use PHPUnit\Framework\TestCase;

class DeliveryDetailsChangerTest extends TestCase
{
    private $subscriptionsRepository;
    private $deliveryOptionsRepository;
    private $entityManager;
    private $logger;
    private $tracer;
    private $oneOffChanges;
    private $deliveryInterval;
    private $changer;

    protected function setUp(): void
    {
        $this->subscriptionsRepository = $this->createMock(SubscriptionsRepositoryInterface::class);
        $this->deliveryOptionsRepository = $this->createMock(DeliveryOptionsRepositoryInterface::class);
        $this->entityManager = $this->createMock(EntityManagerInterface::class);
        $this->logger = $this->createMock(LoggerInterface::class);
        $this->tracer = $this->createMock(TracerInterface::class);
        $this->oneOffChanges = $this->createMock(OneOffChanges::class);
        $this->deliveryInterval = $this->createMock(SubscriptionDeliveryInterval::class);

        $this->changer = new DeliveryDetailsChanger(
            $this->subscriptionsRepository,
            $this->deliveryOptionsRepository,
            $this->entityManager,
            $this->logger,
            $this->tracer,
            $this->oneOffChanges,
            $this->deliveryInterval
        );
    }

    public function testChangeUpdatesDeliveryTime(): void
    {
        // Given: A subscription exists
        $subscription = $this->createMockSubscription();
        $deliveryOption = $this->createMockDeliveryOption('evening', 'Wednesday');

        $this->subscriptionsRepository
            ->expects($this->once())
            ->method('findByCustomerPlanId')
            ->with('plan-123')
            ->willReturn($subscription);

        $this->deliveryOptionsRepository
            ->expects($this->once())
            ->method('findByHandle')
            ->with('evening')
            ->willReturn($deliveryOption);

        $this->entityManager
            ->expects($this->once())
            ->method('beginTransaction');

        $this->entityManager
            ->expects($this->once())
            ->method('commit');

        // When: Delivery details are changed
        $result = $this->changer->change(
            'plan-123',
            'WEB',
            'evening',
            null,
            null,
            null,
            null
        );

        // Then: Subscription is updated
        $this->assertInstanceOf(Subscription::class, $result);
        $this->assertEquals('evening', $result->getDeliveryTime());
        $this->assertEquals('Wednesday', $result->getDeliveryWeekday());
    }

    public function testChangeRollsBackOnException(): void
    {
        $subscription = $this->createMockSubscription();

        $this->subscriptionsRepository
            ->method('findByCustomerPlanId')
            ->willReturn($subscription);

        $this->deliveryOptionsRepository
            ->method('findByHandle')
            ->willThrowException(new \RuntimeException('Database error'));

        $this->entityManager
            ->expects($this->once())
            ->method('beginTransaction');

        $this->entityManager
            ->expects($this->once())
            ->method('rollback');

        $this->entityManager
            ->expects($this->never())
            ->method('commit');

        $this->expectException(\RuntimeException::class);

        $this->changer->change('plan-123', 'WEB', 'evening');
    }

    private function createMockSubscription(): Subscription
    {
        $subscription = $this->createMock(Subscription::class);
        $subscription->method('getCustomerPlanId')->willReturn('plan-123');
        $subscription->method('getDeliveryTime')->willReturn('morning');
        $subscription->method('getDeliveryWeekday')->willReturn('Monday');
        return $subscription;
    }

    private function createMockDeliveryOption(string $handle, string $day): DeliveryOption
    {
        $option = $this->createMock(DeliveryOption::class);
        $option->method('getHandle')->willReturn($handle);
        $option->method('getDeliveryDay')->willReturn($day);
        $option->method('getType')->willReturn('TYPE_PLAN');
        $option->method('getCountry')->willReturn('US');
        return $option;
    }
}
```

**Guidelines:**
- Use `setUp()` for test fixture initialization
- Create mocks in `setUp()` method
- One test method per behavior
- Use descriptive test method names: `test<Action><Condition><ExpectedResult>`
- Follow Given-When-Then structure in comments
- Mock all dependencies
- Assert expected behavior
- Test happy path and error paths
- Use `tearDown()` if needed for cleanup

---

### 2. Data Provider Pattern

**Pattern:** Use data providers to test multiple scenarios with the same test logic.

**Frequency:** Found in 68% of analyzed PRs

**Priority:** Important

**Example:**
```php
<?php

namespace Tests\Unit\Helper;

use Hellofresh\Business\Helper\MarketParser;
use PHPUnit\Framework\TestCase;

class MarketParserTest extends TestCase
{
    /**
     * @dataProvider validMarketsProvider
     */
    public function testParseCommaSeparatedMarkets(string $input, array $expected): void
    {
        $result = MarketParser::parseCommaSeparatedMarkets($input);

        $this->assertEquals($expected, $result);
    }

    public function validMarketsProvider(): array
    {
        return [
            'single market' => ['US', ['us']],
            'multiple markets' => ['US,GB,DE', ['us', 'gb', 'de']],
            'markets with spaces' => [' US , GB , DE ', ['us', 'gb', 'de']],
            'empty string' => ['', []],
            'markets with empty entries' => ['US,,GB', ['us', 'gb']],
            'lowercase markets' => ['us,gb', ['us', 'gb']],
            'mixed case markets' => ['Us,gB,DE', ['us', 'gb', 'de']],
        ];
    }

    /**
     * @dataProvider invalidMarketsProvider
     */
    public function testParseThrowsExceptionForInvalidInput(string $input): void
    {
        $this->expectException(\InvalidArgumentException::class);

        MarketParser::parseCommaSeparatedMarkets($input);
    }

    public function invalidMarketsProvider(): array
    {
        return [
            'null input' => [null],
            'numeric input' => [123],
            'array input' => [[]],
        ];
    }
}
```

**Guidelines:**
- Use `@dataProvider` annotation
- Data provider method returns array of arrays
- Each array entry is test case: `['description' => [args..., expected]]`
- Test edge cases: empty, null, boundary values
- Use descriptive keys for test cases
- Separate providers for valid/invalid cases

---

### 3. Integration Test Pattern

**Pattern:** Test with real database and Symfony container.

**Frequency:** Found in 73% of analyzed PRs

**Priority:** Critical

**Example:**
```php
<?php

namespace Tests\Integration\Handler\Plan;

use Hellofresh\Business\Command\Plan\ChangePlanDeliveryDetails;
use Hellofresh\Business\Handler\Plan\ChangePlanDeliveryDetailsHandler;
use Hellofresh\Business\Entity\Subscription;
use Tests\Integration\IntegrationTestCase;

class ChangePlanDeliveryDetailsHandlerIntegrationTest extends IntegrationTestCase
{
    private $handler;
    private $subscriptionRepository;
    private $subscriptionHistoryRepository;

    protected function setUp(): void
    {
        parent::setUp();

        $this->handler = $this->getContainer()->get(ChangePlanDeliveryDetailsHandler::class);
        $this->subscriptionRepository = $this->getContainer()->get('yourcompany.business.repository.subscriptions');
        $this->subscriptionHistoryRepository = $this->getContainer()->get('yourcompany.business.repository.subscription_history');
    }

    public function testHandleChangesDeliveryDetailsInDatabase(): void
    {
        // Given: A subscription in the database
        $subscription = $this->createTestSubscription([
            'customer_plan_id' => 'test-plan-' . uniqid(),
            'customer_id' => 'customer-123',
            'delivery_time' => 'morning',
            'delivery_weekday' => 'Monday',
            'delivery_interval' => 7,
            'postcode' => '12345',
            'country' => 'US',
        ]);

        $this->entityManager->persist($subscription);
        $this->entityManager->flush();
        $this->entityManager->clear();

        // And: A valid command
        $command = new ChangePlanDeliveryDetails(
            $this->createTokenForCustomer('customer-123'),
            $subscription->getCustomerPlanId(),
            'evening',
            14
        );

        // When: Handler executes the command
        $result = $this->handler->handle($command);

        // Then: Subscription is updated in database
        $this->entityManager->clear();
        $updatedSubscription = $this->subscriptionRepository->findByCustomerPlanId(
            $subscription->getCustomerPlanId()
        );

        $this->assertNotNull($updatedSubscription);
        $this->assertEquals('evening', $updatedSubscription->getDeliveryTime());
        $this->assertEquals('Wednesday', $updatedSubscription->getDeliveryWeekday());
        $this->assertEquals(14, $updatedSubscription->getDeliveryInterval());

        // And: History record is created
        $historyRecords = $this->subscriptionHistoryRepository->findBySubscription($updatedSubscription);
        $this->assertCount(1, $historyRecords);

        $history = $historyRecords[0];
        $this->assertEquals('evening', $history->getRawDelivery()['delivery_time']);
        $this->assertEquals('Wednesday', $history->getRawDelivery()['delivery_weekday']);

        // And: Subscription event is created
        $eventRecords = $this->subscriptionEventRepository->findBySubscription($updatedSubscription);
        $this->assertCount(1, $eventRecords);
    }

    public function testHandleThrowsExceptionWhenSubscriptionNotFound(): void
    {
        $this->expectException(\Hellofresh\Business\Exception\BadRequestException::class);
        $this->expectExceptionMessage('Subscription not found');

        $command = new ChangePlanDeliveryDetails(
            $this->createTokenForCustomer('customer-123'),
            'non-existent-plan'
        );

        $this->handler->handle($command);
    }

    protected function tearDown(): void
    {
        // Clean up test data
        $this->entityManager->clear();

        parent::tearDown();
    }
}
```

**Guidelines:**
- Extend `IntegrationTestCase` base class
- Use real Symfony container
- Use real database (test database)
- Clear entity manager between operations
- Create test data in database
- Assert database state after operations
- Clean up test data in `tearDown()`
- Test transactions and rollbacks
- Test event dispatching and subscribers

---

### 4. Test Data Builder Pattern

**Pattern:** Use builder classes to create test fixtures.

**Frequency:** Found in 64% of analyzed PRs

**Priority:** Important

**Example:**
```php
<?php

namespace Tests\Builders;

use Hellofresh\Business\Entity\Subscription;
use Hellofresh\Business\Entity\DeliveryOption;

class SubscriptionBuilder
{
    private $customerPlanId;
    private $customerId;
    private $deliveryTime;
    private $deliveryWeekday;
    private $deliveryInterval;
    private $postcode;
    private $country;
    private $status;
    private $deliveryStart;

    public function __construct()
    {
        // Default values
        $this->customerPlanId = 'plan-' . uniqid();
        $this->customerId = 'customer-123';
        $this->deliveryTime = 'morning';
        $this->deliveryWeekday = 'Monday';
        $this->deliveryInterval = 7;
        $this->postcode = '12345';
        $this->country = 'US';
        $this->status = 'active';
        $this->deliveryStart = new \DateTime('2024-01-15');
    }

    public function withCustomerPlanId(string $customerPlanId): self
    {
        $this->customerPlanId = $customerPlanId;
        return $this;
    }

    public function withCustomerId(string $customerId): self
    {
        $this->customerId = $customerId;
        return $this;
    }

    public function withDeliveryTime(string $deliveryTime): self
    {
        $this->deliveryTime = $deliveryTime;
        return $this;
    }

    public function withDeliveryWeekday(string $deliveryWeekday): self
    {
        $this->deliveryWeekday = $deliveryWeekday;
        return $this;
    }

    public function withDeliveryInterval(int $deliveryInterval): self
    {
        $this->deliveryInterval = $deliveryInterval;
        return $this;
    }

    public function withPostcode(string $postcode): self
    {
        $this->postcode = $postcode;
        return $this;
    }

    public function withCountry(string $country): self
    {
        $this->country = $country;
        return $this;
    }

    public function withStatus(string $status): self
    {
        $this->status = $status;
        return $this;
    }

    public function withDeliveryStart(\DateTime $deliveryStart): self
    {
        $this->deliveryStart = $deliveryStart;
        return $this;
    }

    public function paused(): self
    {
        $this->status = 'paused';
        return $this;
    }

    public function cancelled(): self
    {
        $this->status = 'cancelled';
        return $this;
    }

    public function build(): Subscription
    {
        $subscription = new Subscription();
        $subscription->setCustomerPlanId($this->customerPlanId);
        $subscription->setCustomerId($this->customerId);
        $subscription->setDeliveryTime($this->deliveryTime);
        $subscription->setDeliveryWeekday($this->deliveryWeekday);
        $subscription->setDeliveryInterval($this->deliveryInterval);
        $subscription->setPostcode($this->postcode);
        $subscription->setCountry($this->country);
        $subscription->setStatus($this->status);
        $subscription->setDeliveryStart($this->deliveryStart);
        $subscription->setCreatedAt(new \DateTime());
        $subscription->setUpdatedAt(new \DateTime());

        return $subscription;
    }
}
```

**Usage in tests:**
```php
public function testSubscriptionWithCustomDelivery(): void
{
    $subscription = (new SubscriptionBuilder())
        ->withCustomerPlanId('custom-plan-123')
        ->withDeliveryTime('evening')
        ->withDeliveryWeekday('Wednesday')
        ->build();

    $this->assertEquals('evening', $subscription->getDeliveryTime());
    $this->assertEquals('Wednesday', $subscription->getDeliveryWeekday());
}

public function testPausedSubscription(): void
{
    $subscription = (new SubscriptionBuilder())
        ->paused()
        ->build();

    $this->assertEquals('paused', $subscription->getStatus());
}
```

**Guidelines:**
- Create builder class per entity
- Use fluent interface (return `$this`)
- Provide sensible defaults
- Use descriptive method names
- Support method chaining
- Provide shortcut methods (e.g., `paused()`)
- Final `build()` method returns entity
- Keep builders in `Tests\Builders` namespace

---

### 5. Mock Object Pattern

**Pattern:** Use PHPUnit mocks for dependencies.

**Frequency:** Found in 91% of analyzed PRs

**Priority:** Critical

**Example:**
```php
<?php

namespace Tests\Unit\Service;

use Hellofresh\Business\Service\OrderService;
use Hellofresh\Business\Repository\OrderRepositoryInterface;
use Hellofresh\Business\Client\PaymentServiceClient;
use PHPUnit\Framework\TestCase;

class OrderServiceTest extends TestCase
{
    public function testCreateOrderCallsPaymentService(): void
    {
        // Create mocks
        $orderRepository = $this->createMock(OrderRepositoryInterface::class);
        $paymentClient = $this->createMock(PaymentServiceClient::class);

        // Set expectations
        $paymentClient
            ->expects($this->once())
            ->method('createCharge')
            ->with(
                $this->equalTo('customer-123'),
                $this->equalTo(99.99)
            )
            ->willReturn(['charge_id' => 'ch_123']);

        $orderRepository
            ->expects($this->once())
            ->method('save')
            ->with($this->callback(function ($order) {
                return $order->getPaymentId() === 'ch_123';
            }));

        // Create service with mocks
        $service = new OrderService($orderRepository, $paymentClient);

        // Execute
        $order = $service->createOrder('customer-123', 99.99);

        // Assert
        $this->assertEquals('ch_123', $order->getPaymentId());
    }

    public function testCreateOrderThrowsExceptionWhenPaymentFails(): void
    {
        $orderRepository = $this->createMock(OrderRepositoryInterface::class);
        $paymentClient = $this->createMock(PaymentServiceClient::class);

        $paymentClient
            ->method('createCharge')
            ->willThrowException(new \RuntimeException('Payment failed'));

        $orderRepository
            ->expects($this->never())
            ->method('save');

        $service = new OrderService($orderRepository, $paymentClient);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Payment failed');

        $service->createOrder('customer-123', 99.99);
    }
}
```

**Guidelines:**
- Use `createMock()` to create mocks
- Use `expects()` to set call expectations
- Use `method()` to specify method name
- Use `with()` to specify expected arguments
- Use `willReturn()` to specify return value
- Use `willThrowException()` for exceptions
- Use `$this->callback()` for complex assertions
- Use `$this->never()` to assert method not called
- Use `$this->once()`, `$this->exactly(2)` for call counts

---

### 6. Database Transaction Testing Pattern

**Pattern:** Test transaction boundaries and rollback behavior.

**Frequency:** Found in 59% of analyzed PRs

**Priority:** Important

**Example:**
```php
<?php

namespace Tests\Integration\Domain;

use Hellofresh\Business\Domain\Subscription\DeliveryDetailsChanger;
use Tests\Integration\IntegrationTestCase;

class TransactionBehaviorTest extends IntegrationTestCase
{
    public function testTransactionRollbackOnException(): void
    {
        $subscription = $this->createTestSubscription([
            'customer_plan_id' => 'test-plan-' . uniqid(),
            'delivery_time' => 'morning',
        ]);

        $this->entityManager->persist($subscription);
        $this->entityManager->flush();
        $this->entityManager->clear();

        $originalDeliveryTime = $subscription->getDeliveryTime();

        $changer = $this->getContainer()->get(DeliveryDetailsChanger::class);

        // Force an exception during transaction
        try {
            $changer->change(
                $subscription->getCustomerPlanId(),
                'WEB',
                'invalid-delivery-option' // This will cause an exception
            );
            $this->fail('Expected exception was not thrown');
        } catch (\Exception $e) {
            // Exception expected
        }

        // Verify rollback - subscription should be unchanged
        $this->entityManager->clear();
        $unchangedSubscription = $this->subscriptionRepository->findByCustomerPlanId(
            $subscription->getCustomerPlanId()
        );

        $this->assertEquals($originalDeliveryTime, $unchangedSubscription->getDeliveryTime());

        // Verify no history record created
        $historyRecords = $this->subscriptionHistoryRepository->findBySubscription($unchangedSubscription);
        $this->assertCount(0, $historyRecords);
    }

    public function testTransactionCommitOnSuccess(): void
    {
        $subscription = $this->createTestSubscription([
            'customer_plan_id' => 'test-plan-' . uniqid(),
            'delivery_time' => 'morning',
        ]);

        $this->entityManager->persist($subscription);
        $this->entityManager->flush();
        $this->entityManager->clear();

        $changer = $this->getContainer()->get(DeliveryDetailsChanger::class);

        $changer->change(
            $subscription->getCustomerPlanId(),
            'WEB',
            'evening'
        );

        // Verify commit - all changes persisted
        $this->entityManager->clear();
        $updatedSubscription = $this->subscriptionRepository->findByCustomerPlanId(
            $subscription->getCustomerPlanId()
        );

        $this->assertEquals('evening', $updatedSubscription->getDeliveryTime());

        // Verify history record created
        $historyRecords = $this->subscriptionHistoryRepository->findBySubscription($updatedSubscription);
        $this->assertCount(1, $historyRecords);
    }
}
```

**Guidelines:**
- Test both commit and rollback scenarios
- Clear entity manager before assertions
- Verify database state after operations
- Test that partial changes are rolled back
- Test that all related writes are atomic
- Test concurrent transaction scenarios

---

## Implementation Guidelines

### Test Organization

**Directory Structure:**
```
tests/
├── Unit/
│   ├── Domain/
│   │   ├── Subscription/
│   │   │   ├── DeliveryDetailsChangerTest.php
│   │   │   └── OneOffChangesTest.php
│   │   └── Order/
│   ├── Handler/
│   │   └── Plan/
│   │       └── ChangePlanDeliveryDetailsHandlerTest.php
│   ├── Service/
│   └── Helper/
├── Integration/
│   ├── Handler/
│   │   └── Plan/
│   │       └── ChangePlanDeliveryDetailsHandlerIntegrationTest.php
│   ├── Repository/
│   └── Domain/
├── Builders/
│   ├── SubscriptionBuilder.php
│   ├── OrderBuilder.php
│   └── CustomerBuilder.php
└── bootstrap.php
```

### PHPUnit Configuration

**phpunit.xml:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<phpunit xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:noNamespaceSchemaLocation="https://schema.phpunit.de/9.5/phpunit.xsd"
         bootstrap="tests/bootstrap.php"
         colors="true"
         executionOrder="depends,defects"
         beStrictAboutOutputDuringTests="true"
         beStrictAboutTodoAnnotatedTests="true"
         failOnRisky="true"
         failOnWarning="true">
    <testsuites>
        <testsuite name="unit">
            <directory>tests/Unit</directory>
        </testsuite>
        <testsuite name="integration">
            <directory>tests/Integration</directory>
        </testsuite>
    </testsuites>

    <coverage processUncoveredFiles="true">
        <include>
            <directory suffix=".php">src</directory>
        </include>
        <exclude>
            <directory>src/Client/Production/config</directory>
        </exclude>
    </coverage>

    <php>
        <env name="APP_ENV" value="test"/>
        <env name="DATABASE_URL" value="mysql://root@localhost:3306/test_db"/>
    </php>
</phpunit>
```

### Base Test Classes

**IntegrationTestCase.php:**
```php
<?php

namespace Tests\Integration;

use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;

abstract class IntegrationTestCase extends KernelTestCase
{
    protected EntityManagerInterface $entityManager;
    protected ContainerInterface $container;

    protected function setUp(): void
    {
        self::bootKernel();

        $this->container = self::$kernel->getContainer();
        $this->entityManager = $this->container->get('doctrine.orm.entity_manager');

        $this->entityManager->beginTransaction();
    }

    protected function tearDown(): void
    {
        if ($this->entityManager->getConnection()->isTransactionActive()) {
            $this->entityManager->rollback();
        }

        $this->entityManager->close();
        $this->entityManager = null;

        parent::tearDown();
    }

    protected function getContainer(): ContainerInterface
    {
        return $this->container;
    }
}
```

---

## Anti-Patterns to Avoid

### ❌ Testing Implementation Details

**Bad:**
```php
public function testInternalMethodCalled(): void
{
    $service = new OrderService(...);

    // Testing private method - wrong!
    $reflection = new \ReflectionClass($service);
    $method = $reflection->getMethod('calculateTax');
    $method->setAccessible(true);
    $result = $method->invoke($service, 100);

    $this->assertEquals(10, $result);
}
```

**Good:**
```php
public function testOrderTotalIncludesTax(): void
{
    $service = new OrderService(...);

    // Test public interface
    $order = $service->createOrder(100);

    $this->assertEquals(110, $order->getTotal()); // 100 + 10% tax
}
```

### ❌ Not Cleaning Up Test Data

**Bad:**
```php
public function testCreateSubscription(): void
{
    $subscription = $this->subscriptionRepository->create([...]);

    $this->assertEquals('active', $subscription->getStatus());
    // No cleanup - pollutes database!
}
```

**Good:**
```php
public function testCreateSubscription(): void
{
    $subscription = $this->subscriptionRepository->create([...]);

    $this->assertEquals('active', $subscription->getStatus());

    // Cleanup in tearDown or transaction rollback
}

protected function tearDown(): void
{
    $this->entityManager->rollback();
    parent::tearDown();
}
```

### ❌ Brittle Tests with Too Many Mocks

**Bad:**
```php
public function testComplexWorkflow(): void
{
    $mock1 = $this->createMock(Dep1::class);
    $mock2 = $this->createMock(Dep2::class);
    $mock3 = $this->createMock(Dep3::class);
    // ... 10 more mocks
    // Brittle - breaks when implementation changes
}
```

**Good:**
```php
public function testComplexWorkflow(): void
{
    // Use integration test with real dependencies
    $service = $this->getContainer()->get(MyService::class);
    $result = $service->doWorkflow(...);
    $this->assertTrue($result->isSuccess());
}
```

---

## Related Implementers

- **command-handler-pattern.md** - Testing command handlers
- **repository-pattern.md** - Testing repositories
- **http-clients-api-integration.md** - Testing HTTP clients
- **doctrine-orm.md** - Testing database operations
