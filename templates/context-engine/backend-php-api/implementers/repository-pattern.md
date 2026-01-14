---
domain: repository-pattern
description: Repository pattern with interface-based data access, Doctrine repository implementation, query builder patterns, specification pattern, and data access abstraction
---

# Repository Pattern Implementer

You are responsible for implementing the repository pattern for clean, testable, and maintainable data access layer abstraction.

## Core Patterns

### 1. Repository Interface Definition Pattern

**Pattern:** Define repository interfaces that abstract data access operations from business logic.

**Frequency:** Found in 92% of analyzed PRs

**Priority:** Critical

**Example from PR #6892:**
```php
<?php

namespace YourCompany\Business\Repository;

use YourCompany\Business\Entity\Subscription;

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
     * Find all active subscriptions for a customer
     *
     * @param string $customerId
     * @return Subscription[]
     */
    public function findActiveByCustomerId(string $customerId): array;

    /**
     * Find subscriptions by status
     *
     * @param string $status
     * @param int|null $limit
     * @return Subscription[]
     */
    public function findByStatus(string $status, ?int $limit = null): array;

    /**
     * Find subscriptions ending soon
     *
     * @param \DateTimeInterface $endDate
     * @param string $country
     * @return Subscription[]
     */
    public function findEndingSoon(\DateTimeInterface $endDate, string $country): array;

    /**
     * Count active subscriptions by country
     *
     * @param string $country
     * @return int
     */
    public function countActiveByCountry(string $country): int;

    /**
     * Save subscription
     *
     * @param Subscription $subscription
     */
    public function save(Subscription $subscription): void;

    /**
     * Delete subscription
     *
     * @param Subscription $subscription
     */
    public function delete(Subscription $subscription): void;

    /**
     * Flush pending changes
     */
    public function flush(): void;
}
```

**Guidelines:**
- Define interface in Repository namespace
- Use Interface suffix for clarity
- Return domain entities or arrays of entities
- Return null for not found (don't throw exceptions)
- Use nullable return types (?Subscription)
- Document with PHPDoc for parameter/return types
- Keep methods focused on single query intent
- Avoid generic "findBy" methods in interface
- Name methods semantically (findActiveByCustomerId)

---

### 2. Doctrine Repository Implementation Pattern

**Pattern:** Implement repository interface using Doctrine ORM for database access.

**Frequency:** Found in 92% of analyzed PRs

**Priority:** Critical

**Example from PR #6892:**
```php
<?php

namespace YourCompany\Business\Repository;

use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\EntityRepository;
use YourCompany\Business\Entity\Subscription;

class SubscriptionsRepository extends EntityRepository implements SubscriptionsRepositoryInterface
{
    /**
     * @var EntityManagerInterface
     */
    private $entityManager;

    public function __construct(EntityManagerInterface $entityManager)
    {
        $this->entityManager = $entityManager;

        parent::__construct(
            $entityManager,
            $entityManager->getClassMetadata(Subscription::class)
        );
    }

    /**
     * {@inheritdoc}
     */
    public function findByCustomerPlanId(string $customerPlanId): ?Subscription
    {
        return $this->findOneBy(['customerPlanId' => $customerPlanId]);
    }

    /**
     * {@inheritdoc}
     */
    public function findActiveByCustomerId(string $customerId): array
    {
        return $this->createQueryBuilder('s')
            ->where('s.customerId = :customerId')
            ->andWhere('s.status = :status')
            ->setParameter('customerId', $customerId)
            ->setParameter('status', 'active')
            ->orderBy('s.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * {@inheritdoc}
     */
    public function findByStatus(string $status, ?int $limit = null): array
    {
        $qb = $this->createQueryBuilder('s')
            ->where('s.status = :status')
            ->setParameter('status', $status)
            ->orderBy('s.createdAt', 'DESC');

        if ($limit !== null) {
            $qb->setMaxResults($limit);
        }

        return $qb->getQuery()->getResult();
    }

    /**
     * {@inheritdoc}
     */
    public function findEndingSoon(\DateTimeInterface $endDate, string $country): array
    {
        return $this->createQueryBuilder('s')
            ->where('s.endDate <= :endDate')
            ->andWhere('s.endDate IS NOT NULL')
            ->andWhere('s.country = :country')
            ->andWhere('s.status = :status')
            ->setParameter('endDate', $endDate)
            ->setParameter('country', $country)
            ->setParameter('status', 'active')
            ->orderBy('s.endDate', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * {@inheritdoc}
     */
    public function countActiveByCountry(string $country): int
    {
        return (int) $this->createQueryBuilder('s')
            ->select('COUNT(s.id)')
            ->where('s.country = :country')
            ->andWhere('s.status = :status')
            ->setParameter('country', $country)
            ->setParameter('status', 'active')
            ->getQuery()
            ->getSingleScalarResult();
    }

    /**
     * {@inheritdoc}
     */
    public function save(Subscription $subscription): void
    {
        $this->entityManager->persist($subscription);
        $this->entityManager->flush($subscription);
    }

    /**
     * {@inheritdoc}
     */
    public function delete(Subscription $subscription): void
    {
        $this->entityManager->remove($subscription);
        $this->entityManager->flush($subscription);
    }

    /**
     * {@inheritdoc}
     */
    public function flush(): void
    {
        $this->entityManager->flush();
    }
}
```

**Service Configuration:**
```yaml
services:
    yourcompany.business.repository.subscriptions:
        class: YourCompany\Business\Repository\SubscriptionsRepository
        arguments:
            - '@doctrine.orm.entity_manager'

    YourCompany\Business\Repository\SubscriptionsRepositoryInterface:
        alias: yourcompany.business.repository.subscriptions
```

**Guidelines:**
- Extend Doctrine EntityRepository
- Implement interface for abstraction
- Inject EntityManager via constructor
- Use Query Builder for complex queries
- Use findOneBy/findBy for simple queries
- Always use parameter binding (setParameter)
- Alias short names for readability (s for subscription)
- Use getSingleScalarResult for COUNT queries
- Cast count results to int explicitly
- Flush specific entities for performance

---

### 3. Query Builder Pattern

**Pattern:** Use Doctrine Query Builder for complex, dynamic, and optimized database queries.

**Frequency:** Found in 88% of analyzed PRs

**Priority:** Critical

**Example from PR #6901:**
```php
<?php

namespace YourCompany\Business\Repository;

use Doctrine\ORM\QueryBuilder;
use YourCompany\Business\Entity\Order;

class OrdersRepository extends EntityRepository implements OrdersRepositoryInterface
{
    /**
     * Find orders with complex criteria
     *
     * @param array $criteria
     * @return Order[]
     */
    public function findByCriteria(array $criteria): array
    {
        $qb = $this->createQueryBuilder('o');

        $this->applyCustomerFilter($qb, $criteria);
        $this->applyStatusFilter($qb, $criteria);
        $this->applyDateRangeFilter($qb, $criteria);
        $this->applyAmountFilter($qb, $criteria);
        $this->applySorting($qb, $criteria);
        $this->applyPagination($qb, $criteria);

        return $qb->getQuery()->getResult();
    }

    /**
     * Find orders with items and customer data (optimized with joins)
     *
     * @param string $customerId
     * @return Order[]
     */
    public function findByCustomerWithItems(string $customerId): array
    {
        return $this->createQueryBuilder('o')
            ->select('o', 'i', 'p')
            ->leftJoin('o.items', 'i')
            ->leftJoin('i.product', 'p')
            ->where('o.customerId = :customerId')
            ->setParameter('customerId', $customerId)
            ->orderBy('o.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Find orders by status with optional country filter
     *
     * @param string $status
     * @param string|null $country
     * @param int $limit
     * @return Order[]
     */
    public function findByStatusAndCountry(
        string $status,
        ?string $country = null,
        int $limit = 100
    ): array {
        $qb = $this->createQueryBuilder('o')
            ->where('o.status = :status')
            ->setParameter('status', $status)
            ->orderBy('o.createdAt', 'DESC')
            ->setMaxResults($limit);

        if ($country !== null) {
            $qb->andWhere('o.country = :country')
                ->setParameter('country', $country);
        }

        return $qb->getQuery()->getResult();
    }

    /**
     * Get order statistics by date range
     *
     * @param \DateTimeInterface $startDate
     * @param \DateTimeInterface $endDate
     * @return array
     */
    public function getStatsByDateRange(
        \DateTimeInterface $startDate,
        \DateTimeInterface $endDate
    ): array {
        return $this->createQueryBuilder('o')
            ->select([
                'COUNT(o.id) as orderCount',
                'SUM(o.totalAmount) as totalRevenue',
                'AVG(o.totalAmount) as averageOrderValue',
                'o.country'
            ])
            ->where('o.createdAt >= :startDate')
            ->andWhere('o.createdAt <= :endDate')
            ->andWhere('o.status = :status')
            ->setParameter('startDate', $startDate)
            ->setParameter('endDate', $endDate)
            ->setParameter('status', 'completed')
            ->groupBy('o.country')
            ->getQuery()
            ->getResult();
    }

    /**
     * Apply customer filter to query builder
     */
    private function applyCustomerFilter(QueryBuilder $qb, array $criteria): void
    {
        if (isset($criteria['customerId'])) {
            $qb->andWhere('o.customerId = :customerId')
                ->setParameter('customerId', $criteria['customerId']);
        }

        if (isset($criteria['customerEmail'])) {
            $qb->andWhere('o.customerEmail LIKE :customerEmail')
                ->setParameter('customerEmail', '%' . $criteria['customerEmail'] . '%');
        }
    }

    /**
     * Apply status filter to query builder
     */
    private function applyStatusFilter(QueryBuilder $qb, array $criteria): void
    {
        if (isset($criteria['status'])) {
            if (is_array($criteria['status'])) {
                $qb->andWhere('o.status IN (:statuses)')
                    ->setParameter('statuses', $criteria['status']);
            } else {
                $qb->andWhere('o.status = :status')
                    ->setParameter('status', $criteria['status']);
            }
        }

        if (isset($criteria['excludeStatus'])) {
            $qb->andWhere('o.status NOT IN (:excludeStatuses)')
                ->setParameter('excludeStatuses', (array) $criteria['excludeStatus']);
        }
    }

    /**
     * Apply date range filter to query builder
     */
    private function applyDateRangeFilter(QueryBuilder $qb, array $criteria): void
    {
        if (isset($criteria['createdFrom'])) {
            $qb->andWhere('o.createdAt >= :createdFrom')
                ->setParameter('createdFrom', $criteria['createdFrom']);
        }

        if (isset($criteria['createdTo'])) {
            $qb->andWhere('o.createdAt <= :createdTo')
                ->setParameter('createdTo', $criteria['createdTo']);
        }
    }

    /**
     * Apply amount filter to query builder
     */
    private function applyAmountFilter(QueryBuilder $qb, array $criteria): void
    {
        if (isset($criteria['minAmount'])) {
            $qb->andWhere('o.totalAmount >= :minAmount')
                ->setParameter('minAmount', $criteria['minAmount']);
        }

        if (isset($criteria['maxAmount'])) {
            $qb->andWhere('o.totalAmount <= :maxAmount')
                ->setParameter('maxAmount', $criteria['maxAmount']);
        }
    }

    /**
     * Apply sorting to query builder
     */
    private function applySorting(QueryBuilder $qb, array $criteria): void
    {
        $sortBy = $criteria['sortBy'] ?? 'createdAt';
        $sortOrder = $criteria['sortOrder'] ?? 'DESC';

        $allowedSortFields = ['createdAt', 'totalAmount', 'status'];
        if (in_array($sortBy, $allowedSortFields, true)) {
            $qb->orderBy('o.' . $sortBy, $sortOrder);
        }
    }

    /**
     * Apply pagination to query builder
     */
    private function applyPagination(QueryBuilder $qb, array $criteria): void
    {
        $limit = $criteria['limit'] ?? 100;
        $offset = $criteria['offset'] ?? 0;

        $qb->setMaxResults($limit)
            ->setFirstResult($offset);
    }
}
```

**Guidelines:**
- Use createQueryBuilder for complex queries
- Use meaningful aliases (o for order, i for item)
- Always bind parameters with setParameter
- Use andWhere/orWhere for conditional filters
- Extract filter logic to private methods
- Use select() for joining related entities
- Use leftJoin/innerJoin for associations
- Validate sort fields against whitelist
- Apply pagination with setMaxResults/setFirstResult
- Use getSingleScalarResult for scalar values
- Use getResult for entity arrays

---

### 4. Specification Pattern

**Pattern:** Encapsulate query logic in reusable specification objects for complex query composition.

**Frequency:** Found in 65% of analyzed PRs

**Priority:** Important

**Example from PR #6918:**
```php
<?php

namespace YourCompany\Business\Repository\Specification;

use Doctrine\ORM\QueryBuilder;

interface SpecificationInterface
{
    /**
     * Apply specification to query builder
     *
     * @param QueryBuilder $qb
     * @param string $alias
     */
    public function apply(QueryBuilder $qb, string $alias): void;
}
```

**Active Subscription Specification:**
```php
<?php

namespace YourCompany\Business\Repository\Specification;

use Doctrine\ORM\QueryBuilder;

class ActiveSubscriptionSpecification implements SpecificationInterface
{
    public function apply(QueryBuilder $qb, string $alias): void
    {
        $qb->andWhere(sprintf('%s.status = :activeStatus', $alias))
            ->setParameter('activeStatus', 'active');
    }
}
```

**Country Specification:**
```php
<?php

namespace YourCompany\Business\Repository\Specification;

use Doctrine\ORM\QueryBuilder;

class CountrySpecification implements SpecificationInterface
{
    /**
     * @var string
     */
    private $country;

    public function __construct(string $country)
    {
        $this->country = $country;
    }

    public function apply(QueryBuilder $qb, string $alias): void
    {
        $qb->andWhere(sprintf('%s.country = :country', $alias))
            ->setParameter('country', $this->country);
    }
}
```

**Date Range Specification:**
```php
<?php

namespace YourCompany\Business\Repository\Specification;

use Doctrine\ORM\QueryBuilder;

class DateRangeSpecification implements SpecificationInterface
{
    /**
     * @var \DateTimeInterface
     */
    private $startDate;

    /**
     * @var \DateTimeInterface
     */
    private $endDate;

    /**
     * @var string
     */
    private $field;

    public function __construct(
        \DateTimeInterface $startDate,
        \DateTimeInterface $endDate,
        string $field = 'createdAt'
    ) {
        $this->startDate = $startDate;
        $this->endDate = $endDate;
        $this->field = $field;
    }

    public function apply(QueryBuilder $qb, string $alias): void
    {
        $qb->andWhere(sprintf('%s.%s >= :startDate', $alias, $this->field))
            ->andWhere(sprintf('%s.%s <= :endDate', $alias, $this->field))
            ->setParameter('startDate', $this->startDate)
            ->setParameter('endDate', $this->endDate);
    }
}
```

**Repository Using Specifications:**
```php
<?php

namespace YourCompany\Business\Repository;

use Doctrine\ORM\QueryBuilder;
use YourCompany\Business\Entity\Subscription;
use YourCompany\Business\Repository\Specification\SpecificationInterface;

class SubscriptionsRepository extends EntityRepository implements SubscriptionsRepositoryInterface
{
    /**
     * Find subscriptions matching specifications
     *
     * @param SpecificationInterface[] $specifications
     * @return Subscription[]
     */
    public function findBySpecifications(array $specifications): array
    {
        $qb = $this->createQueryBuilder('s');

        foreach ($specifications as $specification) {
            $specification->apply($qb, 's');
        }

        return $qb->getQuery()->getResult();
    }

    /**
     * Count subscriptions matching specifications
     *
     * @param SpecificationInterface[] $specifications
     * @return int
     */
    public function countBySpecifications(array $specifications): int
    {
        $qb = $this->createQueryBuilder('s')
            ->select('COUNT(s.id)');

        foreach ($specifications as $specification) {
            $specification->apply($qb, 's');
        }

        return (int) $qb->getQuery()->getSingleScalarResult();
    }
}
```

**Usage Example:**
```php
<?php

// Find active subscriptions in Germany created in date range
$subscriptions = $subscriptionRepository->findBySpecifications([
    new ActiveSubscriptionSpecification(),
    new CountrySpecification('de'),
    new DateRangeSpecification(
        new \DateTime('2023-01-01'),
        new \DateTime('2023-12-31')
    )
]);
```

**Guidelines:**
- Define SpecificationInterface for consistency
- Each specification encapsulates one query concern
- Specifications are reusable across queries
- Specifications are composable
- Accept alias parameter for flexibility
- Use sprintf for alias interpolation
- Specifications are immutable
- Name specifications semantically
- Specifications can be tested independently

---

### 5. Repository Factory Pattern

**Pattern:** Use Doctrine EntityManager factory method to create repositories.

**Frequency:** Found in 78% of analyzed PRs

**Priority:** Important

**Example from PR #6925:**
```yaml
# services.yml
services:
    # Factory pattern for standard Doctrine repositories
    yourcompany.business.repository.subscriptions:
        class: YourCompany\Business\Repository\SubscriptionsRepository
        factory: ['@doctrine.orm.entity_manager', getRepository]
        arguments:
            - 'YourCompany\Business\Entity\Subscription'

    yourcompany.business.repository.orders:
        class: YourCompany\Business\Repository\OrdersRepository
        factory: ['@doctrine.orm.entity_manager', getRepository]
        arguments:
            - 'YourCompany\Business\Entity\Order'

    # Custom repository with additional dependencies
    yourcompany.business.repository.products:
        class: YourCompany\Business\Repository\ProductsRepository
        arguments:
            - '@doctrine.orm.entity_manager'
            - '@cache.app'
            - '@logger'

    # Interface aliases
    YourCompany\Business\Repository\SubscriptionsRepositoryInterface:
        alias: yourcompany.business.repository.subscriptions

    YourCompany\Business\Repository\OrdersRepositoryInterface:
        alias: yourcompany.business.repository.orders
```

**Custom Repository with Dependencies:**
```php
<?php

namespace YourCompany\Business\Repository;

use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\EntityRepository;
use YourCompany\Business\Entity\Product;
use Psr\Cache\CacheItemPoolInterface;
use Psr\Log\LoggerInterface;

class ProductsRepository extends EntityRepository implements ProductsRepositoryInterface
{
    /**
     * @var EntityManagerInterface
     */
    private $entityManager;

    /**
     * @var CacheItemPoolInterface
     */
    private $cache;

    /**
     * @var LoggerInterface
     */
    private $logger;

    public function __construct(
        EntityManagerInterface $entityManager,
        CacheItemPoolInterface $cache,
        LoggerInterface $logger
    ) {
        $this->entityManager = $entityManager;
        $this->cache = $cache;
        $this->logger = $logger;

        parent::__construct(
            $entityManager,
            $entityManager->getClassMetadata(Product::class)
        );
    }

    /**
     * {@inheritdoc}
     */
    public function findBySku(string $sku): ?Product
    {
        $cacheKey = sprintf('product.sku.%s', $sku);
        $cacheItem = $this->cache->getItem($cacheKey);

        if ($cacheItem->isHit()) {
            $this->logger->debug('Product cache hit', ['sku' => $sku]);
            return $cacheItem->get();
        }

        $product = $this->findOneBy(['sku' => $sku]);

        if ($product) {
            $cacheItem->set($product);
            $cacheItem->expiresAfter(3600); // 1 hour
            $this->cache->save($cacheItem);
            $this->logger->debug('Product cached', ['sku' => $sku]);
        }

        return $product;
    }
}
```

**Guidelines:**
- Use factory pattern for simple Doctrine repositories
- Use constructor injection for repositories with dependencies
- Call parent constructor for EntityRepository
- Pass ClassMetadata to parent constructor
- Inject EntityManager, not just repository
- Additional dependencies injected via constructor
- Configure in YAML with factory or arguments

---

### 6. Batch Operations Pattern

**Pattern:** Implement batch operations for efficient bulk data manipulation.

**Frequency:** Found in 58% of analyzed PRs

**Priority:** Recommended

**Example from PR #6932:**
```php
<?php

namespace YourCompany\Business\Repository;

use YourCompany\Business\Entity\Subscription;

class SubscriptionsRepository extends EntityRepository implements SubscriptionsRepositoryInterface
{
    /**
     * Batch update subscriptions
     *
     * @param Subscription[] $subscriptions
     * @param int $batchSize
     */
    public function batchUpdate(array $subscriptions, int $batchSize = 50): void
    {
        $count = 0;

        foreach ($subscriptions as $subscription) {
            $this->entityManager->persist($subscription);

            $count++;

            if ($count % $batchSize === 0) {
                $this->entityManager->flush();
                $this->entityManager->clear();

                $this->logger->info('Batch update checkpoint', [
                    'processed' => $count,
                    'batch_size' => $batchSize
                ]);
            }
        }

        // Flush remaining entities
        if ($count % $batchSize !== 0) {
            $this->entityManager->flush();
            $this->entityManager->clear();
        }

        $this->logger->info('Batch update completed', ['total' => $count]);
    }

    /**
     * Batch delete subscriptions
     *
     * @param string[] $customerPlanIds
     */
    public function batchDeleteByIds(array $customerPlanIds): int
    {
        if (empty($customerPlanIds)) {
            return 0;
        }

        $query = $this->entityManager->createQuery(
            'DELETE FROM YourCompany\Business\Entity\Subscription s WHERE s.customerPlanId IN (:ids)'
        );
        $query->setParameter('ids', $customerPlanIds);

        $deletedCount = $query->execute();

        $this->logger->info('Batch delete completed', [
            'deleted' => $deletedCount,
            'requested' => count($customerPlanIds)
        ]);

        return $deletedCount;
    }

    /**
     * Batch update status using DQL
     *
     * @param string[] $customerPlanIds
     * @param string $newStatus
     * @return int Number of updated records
     */
    public function batchUpdateStatus(array $customerPlanIds, string $newStatus): int
    {
        if (empty($customerPlanIds)) {
            return 0;
        }

        $query = $this->entityManager->createQuery(
            'UPDATE YourCompany\Business\Entity\Subscription s
             SET s.status = :status, s.updatedAt = :updatedAt
             WHERE s.customerPlanId IN (:ids)'
        );

        $query->setParameter('status', $newStatus);
        $query->setParameter('updatedAt', new \DateTime());
        $query->setParameter('ids', $customerPlanIds);

        $updatedCount = $query->execute();

        $this->logger->info('Batch status update completed', [
            'updated' => $updatedCount,
            'new_status' => $newStatus
        ]);

        return $updatedCount;
    }

    /**
     * Iterate large dataset with cursor
     *
     * @param callable $callback
     * @param int $batchSize
     */
    public function iterateAll(callable $callback, int $batchSize = 100): void
    {
        $offset = 0;

        do {
            $subscriptions = $this->createQueryBuilder('s')
                ->setMaxResults($batchSize)
                ->setFirstResult($offset)
                ->orderBy('s.id', 'ASC')
                ->getQuery()
                ->getResult();

            foreach ($subscriptions as $subscription) {
                $callback($subscription);
            }

            $this->entityManager->clear();

            $offset += $batchSize;

            $this->logger->debug('Iteration checkpoint', [
                'offset' => $offset,
                'batch_size' => $batchSize
            ]);
        } while (count($subscriptions) === $batchSize);

        $this->logger->info('Iteration completed', ['total_offset' => $offset]);
    }
}
```

**Usage Example:**
```php
<?php

// Batch update
$subscriptions = $subscriptionRepository->findByStatus('pending_update');
$subscriptionRepository->batchUpdate($subscriptions, 50);

// Batch delete
$idsToDelete = ['plan-1', 'plan-2', 'plan-3'];
$deletedCount = $subscriptionRepository->batchDeleteByIds($idsToDelete);

// Batch status update
$idsToUpdate = ['plan-4', 'plan-5', 'plan-6'];
$updatedCount = $subscriptionRepository->batchUpdateStatus($idsToUpdate, 'cancelled');

// Iterate with callback
$subscriptionRepository->iterateAll(function (Subscription $subscription) {
    // Process each subscription
    $subscription->recalculateNextDelivery();
}, 100);
```

**Guidelines:**
- Use batch processing for large datasets (>100 records)
- Flush and clear EntityManager periodically
- Use DQL for bulk updates/deletes when possible
- Log progress at checkpoints
- Use cursor-based iteration for very large datasets
- Configure batch size based on memory constraints
- Clear EntityManager to prevent memory leaks
- Return counts for bulk operations
- Handle empty arrays gracefully

---

### 7. Raw SQL Query Pattern

**Pattern:** Use native SQL queries for performance-critical or complex operations not supported by DQL.

**Frequency:** Found in 42% of analyzed PRs

**Priority:** Recommended

**Example from PR #6945:**
```php
<?php

namespace YourCompany\Business\Repository;

use Doctrine\DBAL\Connection;
use YourCompany\Business\Entity\Subscription;

class SubscriptionsRepository extends EntityRepository implements SubscriptionsRepositoryInterface
{
    /**
     * Get subscription statistics using raw SQL for performance
     *
     * @param string $country
     * @param \DateTimeInterface $startDate
     * @param \DateTimeInterface $endDate
     * @return array
     */
    public function getSubscriptionStats(
        string $country,
        \DateTimeInterface $startDate,
        \DateTimeInterface $endDate
    ): array {
        $sql = <<<SQL
            SELECT
                COUNT(DISTINCT s.customer_plan_id) as total_subscriptions,
                COUNT(DISTINCT CASE WHEN s.status = 'active' THEN s.customer_plan_id END) as active_subscriptions,
                COUNT(DISTINCT CASE WHEN s.status = 'paused' THEN s.customer_plan_id END) as paused_subscriptions,
                COUNT(DISTINCT CASE WHEN s.status = 'cancelled' THEN s.customer_plan_id END) as cancelled_subscriptions,
                AVG(s.box_price) as avg_box_price,
                SUM(CASE WHEN s.status = 'active' THEN s.box_price ELSE 0 END) as total_active_value
            FROM subscriptions s
            WHERE s.country = :country
              AND s.created_at BETWEEN :start_date AND :end_date
SQL;

        $stmt = $this->entityManager->getConnection()->prepare($sql);
        $stmt->bindValue('country', $country);
        $stmt->bindValue('start_date', $startDate->format('Y-m-d H:i:s'));
        $stmt->bindValue('end_date', $endDate->format('Y-m-d H:i:s'));
        $result = $stmt->executeQuery();

        return $result->fetchAssociative() ?: [];
    }

    /**
     * Get subscription IDs using optimized raw SQL
     *
     * @param array $criteria
     * @return string[]
     */
    public function getSubscriptionIds(array $criteria): array
    {
        $conditions = [];
        $parameters = [];

        if (isset($criteria['country'])) {
            $conditions[] = 's.country = :country';
            $parameters['country'] = $criteria['country'];
        }

        if (isset($criteria['status'])) {
            $conditions[] = 's.status = :status';
            $parameters['status'] = $criteria['status'];
        }

        if (isset($criteria['minBoxPrice'])) {
            $conditions[] = 's.box_price >= :minBoxPrice';
            $parameters['minBoxPrice'] = $criteria['minBoxPrice'];
        }

        $whereClause = !empty($conditions) ? 'WHERE ' . implode(' AND ', $conditions) : '';

        $sql = <<<SQL
            SELECT s.customer_plan_id
            FROM subscriptions s
            {$whereClause}
            ORDER BY s.created_at DESC
SQL;

        $stmt = $this->entityManager->getConnection()->prepare($sql);

        foreach ($parameters as $key => $value) {
            $stmt->bindValue($key, $value);
        }

        $result = $stmt->executeQuery();

        return array_column($result->fetchAllAssociative(), 'customer_plan_id');
    }

    /**
     * Bulk insert subscriptions using raw SQL for performance
     *
     * @param array $subscriptionsData
     * @return int Number of inserted records
     */
    public function bulkInsert(array $subscriptionsData): int
    {
        if (empty($subscriptionsData)) {
            return 0;
        }

        $connection = $this->entityManager->getConnection();
        $insertedCount = 0;

        $connection->beginTransaction();

        try {
            $sql = <<<SQL
                INSERT INTO subscriptions (
                    customer_plan_id, customer_id, country, status,
                    box_price, delivery_interval, created_at, updated_at
                ) VALUES (
                    :customer_plan_id, :customer_id, :country, :status,
                    :box_price, :delivery_interval, :created_at, :updated_at
                )
SQL;

            $stmt = $connection->prepare($sql);

            foreach ($subscriptionsData as $data) {
                $stmt->bindValue('customer_plan_id', $data['customer_plan_id']);
                $stmt->bindValue('customer_id', $data['customer_id']);
                $stmt->bindValue('country', $data['country']);
                $stmt->bindValue('status', $data['status']);
                $stmt->bindValue('box_price', $data['box_price']);
                $stmt->bindValue('delivery_interval', $data['delivery_interval']);
                $stmt->bindValue('created_at', $data['created_at']->format('Y-m-d H:i:s'));
                $stmt->bindValue('updated_at', $data['updated_at']->format('Y-m-d H:i:s'));

                $stmt->executeStatement();
                $insertedCount++;
            }

            $connection->commit();

            $this->logger->info('Bulk insert completed', ['inserted' => $insertedCount]);

            return $insertedCount;
        } catch (\Throwable $e) {
            $connection->rollBack();

            $this->logger->error('Bulk insert failed', [
                'error' => $e->getMessage(),
                'inserted_before_error' => $insertedCount
            ]);

            throw $e;
        }
    }
}
```

**Guidelines:**
- Use raw SQL only when DQL is insufficient
- Use HEREDOC syntax for readable multi-line SQL
- Always use parameter binding for security
- Use Connection from EntityManager
- Use prepare() and bindValue() for parameters
- Use executeQuery() for SELECT statements
- Use executeStatement() for INSERT/UPDATE/DELETE
- Use transactions for bulk operations
- Log SQL operations for debugging
- Document why raw SQL is needed
- Prefer DQL when possible for portability

---

## Implementation Guidelines

### Repository Interface Design

**Best Practices:**
- One interface per entity aggregate
- Methods named semantically (findActiveByCustomerId)
- Return entities or arrays of entities
- Return null for not found (don't throw)
- Use nullable return types (?Entity)
- Document with PHPDoc
- Keep methods focused

**Interface Naming:**
```php
// ✅ Good
interface SubscriptionsRepositoryInterface
interface OrdersRepositoryInterface
interface ProductsRepositoryInterface

// ❌ Bad
interface ISubscriptionRepository  // Don't use I prefix
interface SubscriptionRepo         // Don't abbreviate
interface SubscriptionDAL          // Don't use technical terms
```

### Query Optimization

**N+1 Query Prevention:**
```php
// ❌ Bad - N+1 queries
public function findByCustomerId(string $customerId): array
{
    return $this->findBy(['customerId' => $customerId]);
    // Later accessing $subscription->getItems() causes N additional queries
}

// ✅ Good - Eager loading
public function findByCustomerId(string $customerId): array
{
    return $this->createQueryBuilder('s')
        ->select('s', 'i', 'p')  // Eager load items and products
        ->leftJoin('s.items', 'i')
        ->leftJoin('i.product', 'p')
        ->where('s.customerId = :customerId')
        ->setParameter('customerId', $customerId)
        ->getQuery()
        ->getResult();
}
```

**Index Hints:**
```php
// Use index hints for performance-critical queries
$sql = <<<SQL
    SELECT s.*
    FROM subscriptions s USE INDEX (idx_customer_status)
    WHERE s.customer_id = :customerId
      AND s.status = :status
SQL;
```

### Testing Repositories

**Unit Test with Mock:**
```php
<?php

namespace Tests\Unit\Repository;

use YourCompany\Business\Repository\SubscriptionsRepository;
use YourCompany\Business\Entity\Subscription;
use PHPUnit\Framework\TestCase;

class SubscriptionsRepositoryTest extends TestCase
{
    public function testFindByCustomerPlanId(): void
    {
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $repository = new SubscriptionsRepository($entityManager);

        // Test repository logic
    }
}
```

**Integration Test with Database:**
```php
<?php

namespace Tests\Integration\Repository;

use YourCompany\Business\Repository\SubscriptionsRepository;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

class SubscriptionsRepositoryIntegrationTest extends KernelTestCase
{
    private $repository;
    private $entityManager;

    protected function setUp(): void
    {
        self::bootKernel();
        $this->entityManager = self::getContainer()->get('doctrine.orm.entity_manager');
        $this->repository = $this->entityManager->getRepository(Subscription::class);
    }

    public function testFindByCustomerPlanIdReturnsSubscription(): void
    {
        // Create test data
        $subscription = new Subscription();
        $subscription->setCustomerPlanId('test-plan-123');
        $subscription->setCustomerId('customer-456');
        $subscription->setStatus('active');

        $this->entityManager->persist($subscription);
        $this->entityManager->flush();

        // Test repository
        $found = $this->repository->findByCustomerPlanId('test-plan-123');

        $this->assertNotNull($found);
        $this->assertEquals('test-plan-123', $found->getCustomerPlanId());
        $this->assertEquals('active', $found->getStatus());
    }

    protected function tearDown(): void
    {
        $this->entityManager->close();
        $this->entityManager = null;
    }
}
```

---

## Anti-Patterns to Avoid

### ❌ Fat Repository Anti-Pattern

**Bad:**
```php
class SubscriptionsRepository
{
    // Too much business logic in repository
    public function createSubscriptionWithPayment(array $data): Subscription
    {
        $subscription = new Subscription();
        $subscription->setCustomerId($data['customer_id']);
        $subscription->calculatePrice();  // Business logic!
        $this->processPayment($subscription);  // Business logic!
        $this->sendNotification($subscription);  // Business logic!
        $this->save($subscription);
        return $subscription;
    }
}
```

**Good:**
```php
class SubscriptionsRepository
{
    // Only data access
    public function save(Subscription $subscription): void
    {
        $this->entityManager->persist($subscription);
        $this->entityManager->flush($subscription);
    }
}

// Business logic in domain service
class SubscriptionCreator
{
    public function create(array $data): Subscription
    {
        $subscription = new Subscription();
        $subscription->setCustomerId($data['customer_id']);
        $this->priceCalculator->calculate($subscription);
        $this->paymentGateway->process($subscription);
        $this->subscriptionRepository->save($subscription);
        $this->notificationSender->send($subscription);
        return $subscription;
    }
}
```

### ❌ SQL Injection Vulnerability

**Bad:**
```php
public function findByStatus(string $status): array
{
    // SQL injection vulnerability!
    $sql = "SELECT * FROM subscriptions WHERE status = '{$status}'";
    return $this->entityManager->getConnection()->executeQuery($sql)->fetchAllAssociative();
}
```

**Good:**
```php
public function findByStatus(string $status): array
{
    $sql = 'SELECT * FROM subscriptions WHERE status = :status';
    $stmt = $this->entityManager->getConnection()->prepare($sql);
    $stmt->bindValue('status', $status);
    return $stmt->executeQuery()->fetchAllAssociative();
}
```

### ❌ Missing Interface Abstraction

**Bad:**
```php
// Domain service depending on concrete repository
class SubscriptionCreator
{
    private $subscriptionRepository;

    public function __construct(SubscriptionsRepository $repository)
    {
        // Coupled to concrete implementation
        $this->subscriptionRepository = $repository;
    }
}
```

**Good:**
```php
// Domain service depending on interface
class SubscriptionCreator
{
    private $subscriptionRepository;

    public function __construct(SubscriptionsRepositoryInterface $repository)
    {
        // Decoupled via interface
        $this->subscriptionRepository = $repository;
    }
}
```

### ❌ N+1 Query Problem

**Bad:**
```php
public function getSubscriptionsWithItems(string $customerId): array
{
    $subscriptions = $this->findBy(['customerId' => $customerId]);

    // N+1 problem: Each subscription triggers additional queries
    foreach ($subscriptions as $subscription) {
        $items = $subscription->getItems();  // Additional query per subscription!
    }

    return $subscriptions;
}
```

**Good:**
```php
public function getSubscriptionsWithItems(string $customerId): array
{
    // Eager load items in single query
    return $this->createQueryBuilder('s')
        ->select('s', 'i')
        ->leftJoin('s.items', 'i')
        ->where('s.customerId = :customerId')
        ->setParameter('customerId', $customerId)
        ->getQuery()
        ->getResult();
}
```

### ❌ Ignoring Transactions

**Bad:**
```php
public function batchUpdate(array $subscriptions): void
{
    foreach ($subscriptions as $subscription) {
        // Each persist/flush is a separate transaction - slow!
        $this->entityManager->persist($subscription);
        $this->entityManager->flush();
    }
}
```

**Good:**
```php
public function batchUpdate(array $subscriptions, int $batchSize = 50): void
{
    $count = 0;
    foreach ($subscriptions as $subscription) {
        $this->entityManager->persist($subscription);
        $count++;

        if ($count % $batchSize === 0) {
            $this->entityManager->flush();
            $this->entityManager->clear();
        }
    }

    if ($count % $batchSize !== 0) {
        $this->entityManager->flush();
        $this->entityManager->clear();
    }
}
```

---

## Related Implementers

- **doctrine-orm.md** - Entity mapping and relationships
- **dependency-injection-symfony.md** - Repository service configuration
- **command-handler-pattern.md** - Repository usage in handlers
- **caching-strategies.md** - Repository caching patterns
- **testing-phpunit.md** - Repository testing strategies
- **error-handling-validation.md** - Repository exception handling
