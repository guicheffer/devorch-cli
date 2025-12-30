---
domain: doctrine-orm
description: Doctrine ORM entity mapping with YAML, lifecycle callbacks, entity relations (OneToMany, ManyToOne, ManyToMany), query optimization, and entity repositories
---

# Doctrine ORM Implementer

You are responsible for implementing Doctrine ORM patterns for robust object-relational mapping, entity management, and database operations.

## Core Patterns

### 1. Entity Mapping with YAML Pattern

**Pattern:** Define entity-to-database mappings using YAML configuration files for clean separation of concerns.

**Frequency:** Found in 90% of analyzed PRs

**Priority:** Critical

**Example from PR #7315:**
```yaml
# config/doctrine/Subscription.orm.yml
Hellofresh\Business\Entity\Subscription:
    type: entity
    table: subscriptions
    repositoryClass: Hellofresh\Business\Repository\SubscriptionsRepository

    id:
        id:
            type: integer
            generator:
                strategy: AUTO

    fields:
        customerPlanId:
            type: string
            length: 255
            unique: true
            column: customer_plan_id

        customerId:
            type: string
            length: 255
            column: customer_id

        status:
            type: string
            length: 50
            options:
                default: 'active'

        boxPrice:
            type: decimal
            precision: 10
            scale: 2
            column: box_price

        deliveryInterval:
            type: integer
            column: delivery_interval
            options:
                comment: 'Delivery interval in days'

        deliveryTime:
            type: string
            length: 100
            nullable: true
            column: delivery_time

        deliveryWeekday:
            type: integer
            nullable: true
            column: delivery_weekday
            options:
                comment: '0=Sunday, 6=Saturday'

        deliveryStart:
            type: datetime
            nullable: true
            column: delivery_start

        pauseEnd:
            type: datetime
            nullable: true
            column: pause_end

        endDate:
            type: datetime
            nullable: true
            column: end_date

        country:
            type: string
            length: 2
            options:
                fixed: true
                comment: 'ISO 3166-1 alpha-2 country code'

        createdAt:
            type: datetime
            column: created_at

        updatedAt:
            type: datetime
            column: updated_at

    oneToMany:
        orders:
            targetEntity: Hellofresh\Business\Entity\Order
            mappedBy: subscription
            cascade: ['persist']
            orphanRemoval: false

        items:
            targetEntity: Hellofresh\Business\Entity\SubscriptionItem
            mappedBy: subscription
            cascade: ['persist', 'remove']
            orphanRemoval: true
            orderBy:
                position: ASC

    manyToOne:
        initialOrder:
            targetEntity: Hellofresh\Business\Entity\Order
            inversedBy: ~
            joinColumn:
                name: initial_order_id
                referencedColumnName: id
                nullable: true
                onDelete: SET NULL

    indexes:
        idx_customer_id:
            columns: [customer_id]
        idx_customer_status:
            columns: [customer_id, status]
        idx_country_status:
            columns: [country, status]
        idx_delivery_start:
            columns: [delivery_start]
        idx_created_at:
            columns: [created_at]

    uniqueConstraints:
        uniq_customer_plan_id:
            columns: [customer_plan_id]

    lifecycleCallbacks:
        prePersist: [setCreatedAt, setUpdatedAt]
        preUpdate: [setUpdatedAt]
```

**Entity Class:**
```php
<?php

namespace Hellofresh\Business\Entity;

class Subscription
{
    /**
     * @var int
     */
    private $id;

    /**
     * @var string
     */
    private $customerPlanId;

    /**
     * @var string
     */
    private $customerId;

    /**
     * @var string
     */
    private $status;

    /**
     * @var float
     */
    private $boxPrice;

    /**
     * @var int
     */
    private $deliveryInterval;

    /**
     * @var string|null
     */
    private $deliveryTime;

    /**
     * @var int|null
     */
    private $deliveryWeekday;

    /**
     * @var \DateTime|null
     */
    private $deliveryStart;

    /**
     * @var \DateTime|null
     */
    private $pauseEnd;

    /**
     * @var \DateTime|null
     */
    private $endDate;

    /**
     * @var string
     */
    private $country;

    /**
     * @var \DateTime
     */
    private $createdAt;

    /**
     * @var \DateTime
     */
    private $updatedAt;

    /**
     * @var Order[]|\Doctrine\Common\Collections\Collection
     */
    private $orders;

    /**
     * @var SubscriptionItem[]|\Doctrine\Common\Collections\Collection
     */
    private $items;

    /**
     * @var Order|null
     */
    private $initialOrder;

    public function __construct()
    {
        $this->orders = new \Doctrine\Common\Collections\ArrayCollection();
        $this->items = new \Doctrine\Common\Collections\ArrayCollection();
        $this->status = 'active';
    }

    // Getters and setters...

    public function getId(): int
    {
        return $this->id;
    }

    public function getCustomerPlanId(): string
    {
        return $this->customerPlanId;
    }

    public function setCustomerPlanId(string $customerPlanId): void
    {
        $this->customerPlanId = $customerPlanId;
    }

    public function isPaused(): bool
    {
        return $this->pauseEnd !== null && $this->pauseEnd > new \DateTime();
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    // Lifecycle callbacks

    /**
     * @PrePersist
     */
    public function setCreatedAt(): void
    {
        $this->createdAt = new \DateTime();
    }

    /**
     * @PrePersist
     * @PreUpdate
     */
    public function setUpdatedAt(): void
    {
        $this->updatedAt = new \DateTime();
    }
}
```

**Guidelines:**
- Use YAML for entity mapping (not annotations)
- Map to snake_case database columns
- Define indexes for query performance
- Use appropriate field types (string, integer, decimal, datetime)
- Set length constraints for strings
- Use nullable: true for optional fields
- Add comments for clarity
- Define lifecycle callbacks for timestamps
- Initialize collections in constructor

---

### 2. Entity Relations Pattern

**Pattern:** Define entity relationships (OneToMany, ManyToOne, ManyToMany) with proper cascade and fetch strategies.

**Frequency:** Found in 88% of analyzed PRs

**Priority:** Critical

**OneToMany Relationship:**
```yaml
# Subscription.orm.yml
Hellofresh\Business\Entity\Subscription:
    oneToMany:
        orders:
            targetEntity: Hellofresh\Business\Entity\Order
            mappedBy: subscription
            cascade: ['persist']
            orphanRemoval: false
            fetch: LAZY

        items:
            targetEntity: Hellofresh\Business\Entity\SubscriptionItem
            mappedBy: subscription
            cascade: ['persist', 'remove']
            orphanRemoval: true
            fetch: LAZY
            orderBy:
                position: ASC
```

**ManyToOne Relationship:**
```yaml
# Order.orm.yml
Hellofresh\Business\Entity\Order:
    manyToOne:
        subscription:
            targetEntity: Hellofresh\Business\Entity\Subscription
            inversedBy: orders
            joinColumn:
                name: subscription_id
                referencedColumnName: id
                nullable: false
                onDelete: CASCADE
            fetch: LAZY

        customer:
            targetEntity: Hellofresh\Business\Entity\Customer
            inversedBy: orders
            joinColumn:
                name: customer_id
                referencedColumnName: id
                nullable: false
                onDelete: RESTRICT
            fetch: EAGER
```

**ManyToMany Relationship:**
```yaml
# Subscription.orm.yml
Hellofresh\Business\Entity\Subscription:
    manyToMany:
        tags:
            targetEntity: Hellofresh\Business\Entity\Tag
            inversedBy: subscriptions
            joinTable:
                name: subscription_tags
                joinColumns:
                    subscription_id:
                        referencedColumnName: id
                        onDelete: CASCADE
                inverseJoinColumns:
                    tag_id:
                        referencedColumnName: id
                        onDelete: CASCADE
            cascade: ['persist']
            fetch: EXTRA_LAZY
```

**Entity Usage:**
```php
<?php

// OneToMany
$subscription = new Subscription();
$order = new Order();
$order->setSubscription($subscription);
$subscription->getOrders()->add($order);

// ManyToOne
$order = new Order();
$order->setSubscription($subscription);
$order->setCustomer($customer);

// ManyToMany
$subscription = new Subscription();
$tag = new Tag();
$subscription->getTags()->add($tag);
```

**Guidelines:**
- Use mappedBy on the "one" side of OneToMany
- Use inversedBy on the "many" side of ManyToOne
- Always define joinColumn with onDelete strategy
- Use CASCADE for dependent children
- Use RESTRICT to prevent accidental deletion
- Use SET NULL for optional relations
- Use LAZY fetch for performance (default)
- Use EAGER only for always-needed relations
- Use EXTRA_LAZY for large collections
- Set orphanRemoval: true for owned children
- Use cascade: ['persist', 'remove'] for owned children

---

### 3. Lifecycle Callbacks Pattern

**Pattern:** Use Doctrine lifecycle callbacks to automatically manage entity state changes.

**Frequency:** Found in 78% of analyzed PRs

**Priority:** Important

**Example from PR #7335:**
```yaml
# Subscription.orm.yml
Hellofresh\Business\Entity\Subscription:
    lifecycleCallbacks:
        prePersist: [setCreatedAt, setUpdatedAt, generateCustomerPlanId]
        preUpdate: [setUpdatedAt, validateState]
        postPersist: [logCreation]
        postUpdate: [logUpdate]
        preRemove: [validateDeletion]
        postRemove: [logDeletion]
        postLoad: [initializeTransientFields]
```

**Entity Implementation:**
```php
<?php

namespace Hellofresh\Business\Entity;

use Psr\Log\LoggerInterface;

class Subscription
{
    /**
     * @var LoggerInterface Injected via listener
     */
    private $logger;

    /**
     * Set logger (injected by entity listener)
     */
    public function setLogger(LoggerInterface $logger): void
    {
        $this->logger = $logger;
    }

    /**
     * @PrePersist
     */
    public function setCreatedAt(): void
    {
        $this->createdAt = new \DateTime();
    }

    /**
     * @PrePersist
     * @PreUpdate
     */
    public function setUpdatedAt(): void
    {
        $this->updatedAt = new \DateTime();
    }

    /**
     * @PrePersist
     */
    public function generateCustomerPlanId(): void
    {
        if (!$this->customerPlanId) {
            $this->customerPlanId = sprintf(
                '%s-%s',
                $this->customerId,
                uniqid()
            );
        }
    }

    /**
     * @PreUpdate
     */
    public function validateState(): void
    {
        if ($this->status === 'cancelled' && $this->pauseEnd !== null) {
            throw new \LogicException('Cannot pause a cancelled subscription');
        }
    }

    /**
     * @PostPersist
     */
    public function logCreation(): void
    {
        if ($this->logger) {
            $this->logger->info('Subscription created', [
                'customer_plan_id' => $this->customerPlanId,
                'customer_id' => $this->customerId,
            ]);
        }
    }

    /**
     * @PostUpdate
     */
    public function logUpdate(): void
    {
        if ($this->logger) {
            $this->logger->info('Subscription updated', [
                'customer_plan_id' => $this->customerPlanId,
            ]);
        }
    }

    /**
     * @PreRemove
     */
    public function validateDeletion(): void
    {
        if ($this->isActive()) {
            throw new \LogicException('Cannot delete active subscription');
        }
    }

    /**
     * @PostRemove
     */
    public function logDeletion(): void
    {
        if ($this->logger) {
            $this->logger->warning('Subscription deleted', [
                'customer_plan_id' => $this->customerPlanId,
            ]);
        }
    }

    /**
     * @PostLoad
     */
    public function initializeTransientFields(): void
    {
        // Initialize transient fields after loading from database
        $this->computedField = $this->calculateSomething();
    }
}
```

**Entity Listener for Dependency Injection:**
```php
<?php

namespace Hellofresh\Business\EventListener;

use Doctrine\ORM\Event\LifecycleEventArgs;
use Hellofresh\Business\Entity\Subscription;
use Psr\Log\LoggerInterface;

class SubscriptionEntityListener
{
    /**
     * @var LoggerInterface
     */
    private $logger;

    public function __construct(LoggerInterface $logger)
    {
        $this->logger = $logger;
    }

    /**
     * @PostLoad
     */
    public function postLoad(Subscription $subscription, LifecycleEventArgs $args): void
    {
        $subscription->setLogger($this->logger);
    }
}
```

**Service Configuration:**
```yaml
# services.yml
services:
    yourcompany.business.event_listener.subscription_entity:
        class: Hellofresh\Business\EventListener\SubscriptionEntityListener
        arguments:
            - '@logger'
        tags:
            - { name: doctrine.orm.entity_listener, entity: Hellofresh\Business\Entity\Subscription, event: postLoad }
```

**Lifecycle Events:**
- **prePersist**: Before entity is persisted (INSERT)
- **postPersist**: After entity is persisted
- **preUpdate**: Before entity is updated (UPDATE)
- **postUpdate**: After entity is updated
- **preRemove**: Before entity is removed (DELETE)
- **postRemove**: After entity is removed
- **postLoad**: After entity is loaded from database

**Guidelines:**
- Use prePersist/preUpdate for timestamps
- Use preUpdate for validation
- Use postLoad for computed fields
- Don't perform heavy operations in callbacks
- Use entity listeners for dependencies (logger, services)
- Throw exceptions in pre* callbacks to prevent operation
- Log important events in post* callbacks

---

### 4. Query Optimization Pattern

**Pattern:** Optimize Doctrine queries to prevent N+1 problems and improve performance.

**Frequency:** Found in 82% of analyzed PRs

**Priority:** Critical

**Example from PR #7348:**
```php
<?php

namespace Hellofresh\Business\Repository;

use Hellofresh\Business\Entity\Subscription;

class SubscriptionsRepository extends EntityRepository
{
    /**
     * Find subscriptions with eager-loaded relations (prevent N+1)
     *
     * @param string $customerId
     * @return Subscription[]
     */
    public function findByCustomerIdWithRelations(string $customerId): array
    {
        return $this->createQueryBuilder('s')
            ->select('s', 'o', 'i', 'p')  // Select all needed entities
            ->leftJoin('s.orders', 'o')  // Eager load orders
            ->leftJoin('s.items', 'i')  // Eager load items
            ->leftJoin('i.product', 'p')  // Eager load products
            ->where('s.customerId = :customerId')
            ->setParameter('customerId', $customerId)
            ->orderBy('s.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Find subscriptions with partial objects (optimize memory)
     *
     * @param array $criteria
     * @return array Partial subscription data
     */
    public function findPartialByCriteria(array $criteria): array
    {
        $qb = $this->createQueryBuilder('s')
            ->select('PARTIAL s.{id, customerPlanId, customerId, status, boxPrice}');

        if (isset($criteria['country'])) {
            $qb->andWhere('s.country = :country')
                ->setParameter('country', $criteria['country']);
        }

        return $qb->getQuery()->getResult();
    }

    /**
     * Count with query builder (efficient)
     *
     * @param string $status
     * @return int
     */
    public function countByStatus(string $status): int
    {
        return (int) $this->createQueryBuilder('s')
            ->select('COUNT(s.id)')
            ->where('s.status = :status')
            ->setParameter('status', $status)
            ->getQuery()
            ->getSingleScalarResult();
    }

    /**
     * Find with fetch join (one query instead of N+1)
     *
     * @param array $ids
     * @return Subscription[]
     */
    public function findByIdsWithItems(array $ids): array
    {
        if (empty($ids)) {
            return [];
        }

        return $this->createQueryBuilder('s')
            ->select('s', 'i')
            ->leftJoin('s.items', 'i')
            ->where('s.id IN (:ids)')
            ->setParameter('ids', $ids)
            ->getQuery()
            ->getResult();
    }

    /**
     * Find with pagination and optimization
     *
     * @param int $limit
     * @param int $offset
     * @return Subscription[]
     */
    public function findPaginated(int $limit, int $offset): array
    {
        return $this->createQueryBuilder('s')
            ->setMaxResults($limit)
            ->setFirstResult($offset)
            ->orderBy('s.createdAt', 'DESC')
            ->getQuery()
            ->setHint(\Doctrine\ORM\Query::HINT_FORCE_PARTIAL_LOAD, true)
            ->getResult();
    }

    /**
     * Find with index hints for performance
     *
     * @param string $customerId
     * @param string $status
     * @return Subscription[]
     */
    public function findByCustomerAndStatusOptimized(string $customerId, string $status): array
    {
        // Use DQL with index hint
        $dql = 'SELECT s FROM ' . Subscription::class . ' s USE INDEX (idx_customer_status) '
             . 'WHERE s.customerId = :customerId AND s.status = :status';

        return $this->getEntityManager()
            ->createQuery($dql)
            ->setParameter('customerId', $customerId)
            ->setParameter('status', $status)
            ->getResult();
    }
}
```

**Query Optimization Techniques:**

**1. Eager Loading (Prevent N+1):**
```php
// ❌ Bad - N+1 queries
$subscriptions = $repository->findAll();
foreach ($subscriptions as $subscription) {
    // Each iteration triggers a query!
    $orders = $subscription->getOrders();
}

// ✅ Good - Single query with join
$subscriptions = $repository->createQueryBuilder('s')
    ->select('s', 'o')
    ->leftJoin('s.orders', 'o')
    ->getQuery()
    ->getResult();
```

**2. Partial Objects (Reduce Memory):**
```php
// ❌ Bad - Load entire entity
$subscriptions = $repository->findAll();

// ✅ Good - Only load needed fields
$subscriptions = $repository->createQueryBuilder('s')
    ->select('PARTIAL s.{id, customerPlanId, status}')
    ->getQuery()
    ->getResult();
```

**3. Pagination:**
```php
$query = $repository->createQueryBuilder('s')
    ->orderBy('s.createdAt', 'DESC')
    ->setMaxResults(20)
    ->setFirstResult(40)  // Page 3
    ->getQuery();
```

**4. Query Caching:**
```php
$query = $repository->createQueryBuilder('s')
    ->where('s.country = :country')
    ->setParameter('country', 'de')
    ->getQuery()
    ->setCacheable(true)
    ->setCacheLifetime(3600)  // 1 hour
    ->setResultCacheId('subscriptions_de');
```

**Guidelines:**
- Use select() with joins to prevent N+1
- Use partial objects when you don't need full entity
- Use COUNT() for counting, not count($results)
- Use setMaxResults/setFirstResult for pagination
- Use query caching for expensive queries
- Add database indexes for common queries
- Use EXPLAIN to analyze query performance
- Batch process large datasets

---

### 5. Entity Manager Pattern

**Pattern:** Manage entity lifecycle with EntityManager for persistence, flushing, and transaction control.

**Frequency:** Found in 92% of analyzed PRs

**Priority:** Critical

**Example from PR #7365:**
```php
<?php

namespace Hellofresh\Business\Domain\Subscription;

use Doctrine\ORM\EntityManagerInterface;
use Hellofresh\Business\Entity\Subscription;
use Hellofresh\Business\Repository\SubscriptionsRepositoryInterface;
use Psr\Log\LoggerInterface;

class SubscriptionCreator
{
    /**
     * @var SubscriptionsRepositoryInterface
     */
    private $subscriptionRepository;

    /**
     * @var EntityManagerInterface
     */
    private $entityManager;

    /**
     * @var LoggerInterface
     */
    private $logger;

    public function __construct(
        SubscriptionsRepositoryInterface $subscriptionRepository,
        EntityManagerInterface $entityManager,
        LoggerInterface $logger
    ) {
        $this->subscriptionRepository = $subscriptionRepository;
        $this->entityManager = $entityManager;
        $this->logger = $logger;
    }

    /**
     * Create subscription with transaction
     *
     * @param string $customerId
     * @param array $items
     * @return Subscription
     */
    public function create(string $customerId, array $items): Subscription
    {
        $this->entityManager->beginTransaction();

        try {
            // Create subscription entity
            $subscription = new Subscription();
            $subscription->setCustomerId($customerId);
            $subscription->setStatus('active');

            // Add items
            foreach ($items as $itemData) {
                $item = new SubscriptionItem();
                $item->setProductId($itemData['productId']);
                $item->setQuantity($itemData['quantity']);
                $item->setSubscription($subscription);

                $subscription->getItems()->add($item);
            }

            // Persist entity
            $this->entityManager->persist($subscription);

            // Flush to database
            $this->entityManager->flush();

            // Commit transaction
            $this->entityManager->commit();

            $this->logger->info('Subscription created', [
                'customer_plan_id' => $subscription->getCustomerPlanId(),
                'item_count' => count($items)
            ]);

            return $subscription;
        } catch (\Throwable $e) {
            $this->entityManager->rollback();

            $this->logger->error('Failed to create subscription', [
                'customer_id' => $customerId,
                'error' => $e->getMessage()
            ]);

            throw $e;
        }
    }

    /**
     * Update multiple subscriptions in batch
     *
     * @param Subscription[] $subscriptions
     */
    public function batchUpdate(array $subscriptions): void
    {
        $batchSize = 50;
        $count = 0;

        foreach ($subscriptions as $subscription) {
            $this->entityManager->persist($subscription);
            $count++;

            if ($count % $batchSize === 0) {
                $this->entityManager->flush();
                $this->entityManager->clear();  // Clear memory
            }
        }

        // Flush remaining
        if ($count % $batchSize !== 0) {
            $this->entityManager->flush();
            $this->entityManager->clear();
        }
    }

    /**
     * Detach entity from EntityManager
     *
     * @param Subscription $subscription
     */
    public function detach(Subscription $subscription): void
    {
        // Detach - entity changes won't be persisted
        $this->entityManager->detach($subscription);
    }

    /**
     * Refresh entity from database
     *
     * @param Subscription $subscription
     */
    public function refresh(Subscription $subscription): void
    {
        // Reload entity from database
        $this->entityManager->refresh($subscription);
    }

    /**
     * Merge detached entity back
     *
     * @param Subscription $subscription
     * @return Subscription Managed entity
     */
    public function merge(Subscription $subscription): Subscription
    {
        return $this->entityManager->merge($subscription);
    }
}
```

**EntityManager Methods:**

- **persist($entity)**: Mark entity for insertion
- **remove($entity)**: Mark entity for deletion
- **flush()**: Execute all pending database operations
- **clear()**: Detach all entities (free memory)
- **detach($entity)**: Detach specific entity
- **refresh($entity)**: Reload entity from database
- **merge($entity)**: Merge detached entity
- **beginTransaction()**: Start transaction
- **commit()**: Commit transaction
- **rollback()**: Rollback transaction

**Guidelines:**
- Always use transactions for multi-step operations
- Flush after persist/remove
- Clear EntityManager in batch operations to prevent memory leaks
- Use refresh to reload entity after external changes
- Use detach to prevent unwanted persistence
- Use merge to re-attach detached entities
- Catch exceptions and rollback transactions
- Log important database operations

---

### 6. Custom Repository Methods Pattern

**Pattern:** Add custom query methods to repositories for domain-specific queries.

**Frequency:** Found in 85% of analyzed PRs

**Priority:** Important

**Example from PR #7378:**
```php
<?php

namespace Hellofresh\Business\Repository;

use Doctrine\ORM\EntityRepository;
use Hellofresh\Business\Entity\Subscription;

class SubscriptionsRepository extends EntityRepository implements SubscriptionsRepositoryInterface
{
    /**
     * Find subscriptions ending within date range
     *
     * @param \DateTimeInterface $startDate
     * @param \DateTimeInterface $endDate
     * @param string $country
     * @return Subscription[]
     */
    public function findEndingInRange(
        \DateTimeInterface $startDate,
        \DateTimeInterface $endDate,
        string $country
    ): array {
        return $this->createQueryBuilder('s')
            ->where('s.endDate BETWEEN :startDate AND :endDate')
            ->andWhere('s.country = :country')
            ->andWhere('s.status = :status')
            ->setParameter('startDate', $startDate)
            ->setParameter('endDate', $endDate)
            ->setParameter('country', $country)
            ->setParameter('status', 'active')
            ->orderBy('s.endDate', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Find paused subscriptions ready to resume
     *
     * @return Subscription[]
     */
    public function findReadyToResume(): array
    {
        $now = new \DateTime();

        return $this->createQueryBuilder('s')
            ->where('s.pauseEnd IS NOT NULL')
            ->andWhere('s.pauseEnd <= :now')
            ->andWhere('s.status = :status')
            ->setParameter('now', $now)
            ->setParameter('status', 'paused')
            ->getQuery()
            ->getResult();
    }

    /**
     * Count subscriptions by status and country
     *
     * @param string $country
     * @return array Format: ['status' => count]
     */
    public function countByStatusAndCountry(string $country): array
    {
        $results = $this->createQueryBuilder('s')
            ->select('s.status', 'COUNT(s.id) as count')
            ->where('s.country = :country')
            ->setParameter('country', $country)
            ->groupBy('s.status')
            ->getQuery()
            ->getResult();

        $counts = [];
        foreach ($results as $result) {
            $counts[$result['status']] = (int) $result['count'];
        }

        return $counts;
    }

    /**
     * Find subscriptions with high box price
     *
     * @param float $minPrice
     * @param string $country
     * @param int $limit
     * @return Subscription[]
     */
    public function findHighValueSubscriptions(float $minPrice, string $country, int $limit = 100): array
    {
        return $this->createQueryBuilder('s')
            ->where('s.boxPrice >= :minPrice')
            ->andWhere('s.country = :country')
            ->andWhere('s.status = :status')
            ->setParameter('minPrice', $minPrice)
            ->setParameter('country', $country)
            ->setParameter('status', 'active')
            ->orderBy('s.boxPrice', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }

    /**
     * Find subscriptions needing renewal notification
     *
     * @param int $daysAhead
     * @return Subscription[]
     */
    public function findNeedingRenewalNotification(int $daysAhead): array
    {
        $targetDate = new \DateTime(sprintf('+%d days', $daysAhead));

        return $this->createQueryBuilder('s')
            ->where('DATE(s.endDate) = :targetDate')
            ->andWhere('s.status = :status')
            ->setParameter('targetDate', $targetDate->format('Y-m-d'))
            ->setParameter('status', 'active')
            ->getQuery()
            ->getResult();
    }
}
```

**Guidelines:**
- Add domain-specific query methods to repositories
- Use descriptive method names
- Return entities or arrays of entities
- Use QueryBuilder for complex queries
- Always bind parameters
- Add appropriate indexes for custom queries
- Document expected parameters and return types
- Keep queries focused and efficient

---

### 7. Entity Hydration Patterns

**Pattern:** Use different hydration modes for performance optimization.

**Frequency:** Found in 55% of analyzed PRs

**Priority:** Recommended

**Example from PR #7392:**
```php
<?php

namespace Hellofresh\Business\Repository;

use Doctrine\ORM\Query;

class SubscriptionsRepository extends EntityRepository
{
    /**
     * Find as array (hydrate to array, not objects)
     *
     * @param string $customerId
     * @return array
     */
    public function findAsArrayByCustomerId(string $customerId): array
    {
        return $this->createQueryBuilder('s')
            ->where('s.customerId = :customerId')
            ->setParameter('customerId', $customerId)
            ->getQuery()
            ->getResult(Query::HYDRATE_ARRAY);  // Array hydration
    }

    /**
     * Find single scalar value
     *
     * @param string $customerPlanId
     * @return string|null
     */
    public function findStatusById(string $customerPlanId): ?string
    {
        return $this->createQueryBuilder('s')
            ->select('s.status')
            ->where('s.customerPlanId = :customerPlanId')
            ->setParameter('customerPlanId', $customerPlanId)
            ->getQuery()
            ->getSingleScalarResult();  // Scalar hydration
    }

    /**
     * Find with mixed results
     *
     * @param string $country
     * @return array
     */
    public function findWithOrderCount(string $country): array
    {
        return $this->createQueryBuilder('s')
            ->select('s', 'COUNT(o.id) as orderCount')
            ->leftJoin('s.orders', 'o')
            ->where('s.country = :country')
            ->setParameter('country', $country)
            ->groupBy('s.id')
            ->getQuery()
            ->getResult();  // Mixed results: [0] => Subscription, ['orderCount'] => int
    }
}
```

**Hydration Modes:**
- **HYDRATE_OBJECT** (default): Hydrate to entity objects
- **HYDRATE_ARRAY**: Hydrate to arrays (faster, less memory)
- **HYDRATE_SCALAR**: Hydrate to scalar values
- **HYDRATE_SINGLE_SCALAR**: Single scalar value

**Guidelines:**
- Use HYDRATE_OBJECT for entities you'll modify
- Use HYDRATE_ARRAY for read-only data (faster)
- Use HYDRATE_SCALAR for raw results
- Use HYDRATE_SINGLE_SCALAR for single values
- Array hydration doesn't track changes
- Choose hydration based on use case

---

## Implementation Guidelines

### Entity Best Practices

**Do:**
- Initialize collections in constructor
- Use private properties with getters/setters
- Type-hint all properties in PHPDoc
- Implement lifecycle callbacks for timestamps
- Use named constructors for complex creation
- Add business logic methods (isPaused(), isActive())

**Don't:**
- Put business logic in getters/setters
- Access EntityManager from entities
- Perform queries in entities
- Store non-persistent data without marking transient

### Database Schema Design

**Naming Conventions:**
- Tables: snake_case plural (subscriptions, orders)
- Columns: snake_case (customer_plan_id, created_at)
- Foreign keys: {table}_id (subscription_id)
- Indexes: idx_{columns} (idx_customer_status)
- Unique constraints: uniq_{columns} (uniq_customer_plan_id)

**Index Strategy:**
- Index foreign keys
- Index columns in WHERE clauses
- Index columns in ORDER BY
- Composite indexes for multiple columns
- Don't over-index (slows INSERT/UPDATE)

---

## Anti-Patterns to Avoid

### ❌ N+1 Query Problem

**Bad:**
```php
$subscriptions = $repository->findAll();
foreach ($subscriptions as $subscription) {
    $orders = $subscription->getOrders();  // N queries!
}
```

**Good:**
```php
$subscriptions = $repository->createQueryBuilder('s')
    ->select('s', 'o')
    ->leftJoin('s.orders', 'o')
    ->getQuery()
    ->getResult();
```

### ❌ Business Logic in Entities

**Bad:**
```php
class Subscription
{
    public function save(): void
    {
        // Business logic in entity!
        $this->entityManager->persist($this);
        $this->entityManager->flush();
    }
}
```

**Good:**
```php
// Keep entities as data holders
class Subscription
{
    // Only getters, setters, and simple domain logic
}

// Business logic in service
class SubscriptionCreator
{
    public function save(Subscription $subscription): void
    {
        $this->entityManager->persist($subscription);
        $this->entityManager->flush();
    }
}
```

### ❌ Missing Transactions

**Bad:**
```php
$subscription->setStatus('active');
$this->entityManager->flush();

// If this fails, subscription is already saved!
$this->createInitialOrder($subscription);
```

**Good:**
```php
$this->entityManager->beginTransaction();
try {
    $subscription->setStatus('active');
    $this->entityManager->flush();

    $this->createInitialOrder($subscription);

    $this->entityManager->commit();
} catch (\Throwable $e) {
    $this->entityManager->rollback();
    throw $e;
}
```

---

## Related Implementers

- **repository-pattern.md** - Repository implementation
- **dependency-injection-symfony.md** - EntityManager configuration
- **command-handler-pattern.md** - Transaction management in handlers
- **testing-phpunit.md** - Testing with Doctrine
