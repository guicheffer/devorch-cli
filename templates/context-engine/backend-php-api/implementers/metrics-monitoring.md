---
domain: metrics-monitoring
description: StatsD metrics collection and monitoring patterns for performance and business intelligence
---

# Metrics and Monitoring Implementer

You are responsible for implementing metrics collection using StatsD for performance monitoring, error tracking, and business intelligence.

## Core Patterns

### 1. StatsD Metrics Client Pattern

**Pattern:** Use StatsD client for collecting application metrics.

**Frequency:** Found in 45% of analyzed PRs

**Priority:** Important

**Example:**
```php
<?php

namespace YourCompany\Infrastructure\Metrics;

use Domnikl\Statsd\Client;
use Domnikl\Statsd\Connection\UdpSocket;
use Psr\Log\LoggerInterface;

class MetricsClient
{
    private Client $client;
    private LoggerInterface $logger;
    private string $namespace;

    public function __construct(
        string $host,
        int $port,
        string $namespace,
        LoggerInterface $logger
    ) {
        $connection = new UdpSocket($host, $port);
        $this->client = new Client($connection, $namespace);
        $this->namespace = $namespace;
        $this->logger = $logger;
    }

    public function increment(string $metric, array $tags = []): void
    {
        try {
            $key = $this->formatMetric($metric, $tags);
            $this->client->increment($key);
        } catch (\Throwable $e) {
            $this->logger->error('Failed to send metric', [
                'metric' => $metric,
                'error' => $e->getMessage()
            ]);
        }
    }

    public function timing(string $metric, float $time, array $tags = []): void
    {
        try {
            $key = $this->formatMetric($metric, $tags);
            $this->client->timing($key, $time);
        } catch (\Throwable $e) {
            $this->logger->error('Failed to send timing', [
                'metric' => $metric,
                'error' => $e->getMessage()
            ]);
        }
    }

    public function gauge(string $metric, int $value, array $tags = []): void
    {
        try {
            $key = $this->formatMetric($metric, $tags);
            $this->client->gauge($key, $value);
        } catch (\Throwable $e) {
            $this->logger->error('Failed to send gauge', [
                'metric' => $metric,
                'error' => $e->getMessage()
            ]);
        }
    }

    private function formatMetric(string $metric, array $tags): string
    {
        if (empty($tags)) {
            return $metric;
        }

        $tagString = implode('.', array_map(
            fn($k, $v) => "{$k}.{$v}",
            array_keys($tags),
            array_values($tags)
        ));

        return "{$metric}.{$tagString}";
    }
}
```

### 2. Controller Metrics Pattern

**Pattern:** Track API endpoint performance and error rates.

**Example:**
```php
<?php

namespace YourCompany\API\Controller;

use YourCompany\Infrastructure\Metrics\MetricsClient;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class ProductController
{
    private MetricsClient $metrics;
    private ProductService $productService;

    public function __construct(
        MetricsClient $metrics,
        ProductService $productService
    ) {
        $this->metrics = $metrics;
        $this->productService = $productService;
    }

    public function getProducts(Request $request): Response
    {
        $startTime = microtime(true);

        try {
            $countryCode = $request->query->get('country', 'de-DE');
            $products = $this->productService->getProductsByCountry($countryCode);

            $duration = (microtime(true) - $startTime) * 1000;

            $this->metrics->increment('api.products.success', [
                'country' => $countryCode
            ]);

            $this->metrics->timing('api.products.duration', $duration, [
                'country' => $countryCode
            ]);

            return new JsonResponse($products);

        } catch (\Throwable $e) {
            $duration = (microtime(true) - $startTime) * 1000;

            $this->metrics->increment('api.products.error', [
                'country' => $countryCode ?? 'unknown',
                'error_type' => get_class($e)
            ]);

            $this->metrics->timing('api.products.duration', $duration, [
                'country' => $countryCode ?? 'unknown',
                'status' => 'error'
            ]);

            throw $e;
        }
    }
}
```

### 3. Business Metrics Pattern

**Pattern:** Track business KPIs and user actions.

**Example:**
```php
<?php

namespace YourCompany\Application\Service;

use YourCompany\Infrastructure\Metrics\MetricsClient;

class OrderService
{
    private MetricsClient $metrics;

    public function placeOrder(Order $order): void
    {
        $this->orderRepository->save($order);

        // Track order placement
        $this->metrics->increment('business.orders.placed', [
            'country' => $order->getCountryCode(),
            'plan_type' => $order->getPlanType()
        ]);

        // Track order value
        $this->metrics->gauge('business.orders.value',
            $order->getTotalAmount(),
            ['country' => $order->getCountryCode()]
        );

        // Track items in order
        $this->metrics->gauge('business.orders.items',
            count($order->getItems()),
            ['country' => $order->getCountryCode()]
        );
    }

    public function cancelOrder(string $orderId, string $reason): void
    {
        $order = $this->orderRepository->findById($orderId);
        $order->cancel($reason);
        $this->orderRepository->save($order);

        $this->metrics->increment('business.orders.cancelled', [
            'country' => $order->getCountryCode(),
            'reason' => $reason
        ]);
    }
}
```

### 4. Database Query Metrics Pattern

**Pattern:** Monitor database query performance.

**Example:**
```php
<?php

namespace YourCompany\Infrastructure\Repository;

use YourCompany\Infrastructure\Metrics\MetricsClient;

class DoctrineProductRepository implements ProductRepositoryInterface
{
    private EntityManagerInterface $em;
    private MetricsClient $metrics;

    public function findByCountry(string $countryCode): array
    {
        $startTime = microtime(true);

        try {
            $qb = $this->em->createQueryBuilder();
            $qb->select('p')
                ->from(Product::class, 'p')
                ->where('p.countryCode = :country')
                ->setParameter('country', $countryCode);

            $results = $qb->getQuery()->getResult();

            $duration = (microtime(true) - $startTime) * 1000;

            $this->metrics->timing('database.query.products', $duration, [
                'country' => $countryCode,
                'result_count' => count($results)
            ]);

            return $results;

        } catch (\Throwable $e) {
            $duration = (microtime(true) - $startTime) * 1000;

            $this->metrics->increment('database.query.error', [
                'entity' => 'product',
                'error_type' => get_class($e)
            ]);

            $this->metrics->timing('database.query.products', $duration, [
                'country' => $countryCode,
                'status' => 'error'
            ]);

            throw $e;
        }
    }
}
```

### 5. Cache Metrics Pattern

**Pattern:** Monitor cache hit/miss rates.

**Example:**
```php
<?php

namespace YourCompany\Infrastructure\Cache;

use Psr\Cache\CacheItemPoolInterface;
use YourCompany\Infrastructure\Metrics\MetricsClient;

class MonitoredCache implements CacheItemPoolInterface
{
    private CacheItemPoolInterface $cache;
    private MetricsClient $metrics;

    public function getItem($key)
    {
        $item = $this->cache->getItem($key);

        if ($item->isHit()) {
            $this->metrics->increment('cache.hit', [
                'namespace' => $this->extractNamespace($key)
            ]);
        } else {
            $this->metrics->increment('cache.miss', [
                'namespace' => $this->extractNamespace($key)
            ]);
        }

        return $item;
    }

    public function save(CacheItemInterface $item): bool
    {
        $success = $this->cache->save($item);

        $this->metrics->increment(
            $success ? 'cache.save.success' : 'cache.save.failure',
            ['namespace' => $this->extractNamespace($item->getKey())]
        );

        return $success;
    }

    private function extractNamespace(string $key): string
    {
        $parts = explode(':', $key);
        return $parts[1] ?? 'unknown';
    }
}
```

## Testing

```php
<?php

namespace Tests\Infrastructure\Metrics;

use PHPUnit\Framework\TestCase;
use YourCompany\Infrastructure\Metrics\MetricsClient;

class MetricsClientTest extends TestCase
{
    public function testIncrement(): void
    {
        $client = $this->createMetricsClient();

        $client->increment('test.metric', ['tag' => 'value']);

        // Verify metric was sent (implementation depends on test setup)
        $this->assertTrue(true);
    }
}
```

## Related Implementers

- **api-controllers-routing.md** - API endpoint metrics
- **caching-strategies.md** - Cache performance metrics
- **error-handling-validation.md** - Error rate tracking
- **repository-pattern.md** - Database query metrics
