---
domain: caching-strategies
description: PSR-6 caching strategies for performance optimization with cache invalidation and warming
---

# Caching Strategies Implementer

You are responsible for implementing caching strategies using PSR-6 compliant cache interfaces to optimize application performance and reduce database load.

## Core Patterns

### 1. PSR-6 Cache Interface Pattern

**Pattern:** Use PSR-6 CacheItemPoolInterface for standardized caching across the application.

**Frequency:** Found in 27% of analyzed PRs

**Priority:** Important

**Example:**
```php
<?php

namespace Hellofresh\Infrastructure\Cache;

use Psr\Cache\CacheItemPoolInterface;
use Symfony\Component\Cache\Adapter\RedisAdapter;
use Symfony\Component\Cache\Adapter\TagAwareAdapter;

class CachePoolFactory
{
    /**
     * @var string
     */
    private $redisDs

n;

    public function __construct(string $redisDsn)
    {
        $this->redisDsn = $redisDsn;
    }

    public function createDefaultPool(): CacheItemPoolInterface
    {
        $redis = RedisAdapter::createConnection($this->redisDsn);

        return new TagAwareAdapter(
            new RedisAdapter(
                $redis,
                $namespace = 'app',
                $defaultLifetime = 3600
            )
        );
    }

    public function createSessionPool(): CacheItemPoolInterface
    {
        $redis = RedisAdapter::createConnection($this->redisDsn);

        return new RedisAdapter(
            $redis,
            $namespace = 'sessions',
            $defaultLifetime = 86400 // 24 hours
        );
    }
}
```

**Guidelines:**
- Always use PSR-6 interfaces for portability
- Configure appropriate TTL based on data volatility
- Use namespaces to organize cache keys
- Implement TagAwareAdapter for bulk invalidation
- Consider Redis for high-performance caching

---

### 2. Cache Key Strategy Pattern

**Pattern:** Implement consistent, hierarchical cache key naming conventions.

**Frequency:** Found in 27% of analyzed PRs

**Priority:** Important

**Example:**
```php
<?php

namespace Hellofresh\Infrastructure\Cache;

class CacheKeyGenerator
{
    private const SEPARATOR = ':';
    private const VERSION = 'v1';

    /**
     * Generate cache key for entity by ID
     */
    public function forEntity(string $entityType, $id): string
    {
        return implode(self::SEPARATOR, [
            self::VERSION,
            'entity',
            $entityType,
            (string) $id
        ]);
    }

    /**
     * Generate cache key for entity list with filters
     */
    public function forEntityList(string $entityType, array $filters = []): string
    {
        $filterHash = empty($filters) ? 'all' : md5(serialize($filters));

        return implode(self::SEPARATOR, [
            self::VERSION,
            'list',
            $entityType,
            $filterHash
        ]);
    }

    /**
     * Generate cache key for customer-specific data
     */
    public function forCustomer(string $customerId, string $dataType): string
    {
        return implode(self::SEPARATOR, [
            self::VERSION,
            'customer',
            $customerId,
            $dataType
        ]);
    }

    /**
     * Generate cache key for country-specific data
     */
    public function forCountry(string $countryCode, string $dataType): string
    {
        return implode(self::SEPARATOR, [
            self::VERSION,
            'country',
            strtolower($countryCode),
            $dataType
        ]);
    }

    /**
     * Generate cache key with multiple dimensions
     */
    public function generate(array $parts): string
    {
        return self::VERSION . self::SEPARATOR . implode(self::SEPARATOR, array_map('strval', $parts));
    }
}
```

**Guidelines:**
- Use hierarchical key structure (namespace:type:id)
- Include version prefix for cache invalidation
- Hash complex filter objects for consistency
- Use consistent separators (typically `:`)
- Keep keys readable but not too long
- Document key patterns in code comments

---

### 3. Repository Cache Decorator Pattern

**Pattern:** Wrap repository implementations with caching decorators.

**Frequency:** Found in 27% of analyzed PRs

**Priority:** Important

**Example:**
```php
<?php

namespace Hellofresh\Infrastructure\Repository\Cached;

use Hellofresh\Domain\Repository\ProductRepositoryInterface;
use Hellofresh\Domain\Entity\Product;
use Hellofresh\Infrastructure\Cache\CacheKeyGenerator;
use Psr\Cache\CacheItemPoolInterface;
use Psr\Log\LoggerInterface;

class CachedProductRepository implements ProductRepositoryInterface
{
    /**
     * @var ProductRepositoryInterface
     */
    private $decorated;

    /**
     * @var CacheItemPoolInterface
     */
    private $cache;

    /**
     * @var CacheKeyGenerator
     */
    private $keyGenerator;

    /**
     * @var LoggerInterface
     */
    private $logger;

    /**
     * @var int Cache TTL in seconds
     */
    private $ttl = 3600;

    public function __construct(
        ProductRepositoryInterface $decorated,
        CacheItemPoolInterface $cache,
        CacheKeyGenerator $keyGenerator,
        LoggerInterface $logger
    ) {
        $this->decorated = $decorated;
        $this->cache = $cache;
        $this->keyGenerator = $keyGenerator;
        $this->logger = $logger;
    }

    public function findById(string $id): ?Product
    {
        $key = $this->keyGenerator->forEntity('product', $id);
        $item = $this->cache->getItem($key);

        if ($item->isHit()) {
            $this->logger->debug('Cache hit', ['key' => $key]);
            return $item->get();
        }

        $this->logger->debug('Cache miss', ['key' => $key]);
        $product = $this->decorated->findById($id);

        if ($product !== null) {
            $item->set($product);
            $item->expiresAfter($this->ttl);
            $this->cache->save($item);
        }

        return $product;
    }

    public function findByCountry(string $countryCode): array
    {
        $key = $this->keyGenerator->forCountry($countryCode, 'products');
        $item = $this->cache->getItem($key);

        if ($item->isHit()) {
            return $item->get();
        }

        $products = $this->decorated->findByCountry($countryCode);

        $item->set($products);
        $item->expiresAfter($this->ttl);
        $this->cache->save($item);

        return $products;
    }

    public function save(Product $product): void
    {
        $this->decorated->save($product);

        // Invalidate entity cache
        $key = $this->keyGenerator->forEntity('product', $product->getId());
        $this->cache->deleteItem($key);

        // Invalidate list caches (could be more selective)
        $this->invalidateProductLists();
    }

    public function delete(string $id): void
    {
        $this->decorated->delete($id);

        $key = $this->keyGenerator->forEntity('product', $id);
        $this->cache->deleteItem($key);

        $this->invalidateProductLists();
    }

    private function invalidateProductLists(): void
    {
        // Clear all list caches for this entity type
        $pattern = $this->keyGenerator->generate(['list', 'product']);

        // Note: Pattern-based deletion requires cache adapter support
        // For Redis, you might use SCAN + DEL commands
        $this->logger->info('Invalidating product list caches');
    }
}
```

**Guidelines:**
- Implement the same interface as the decorated repository
- Cache read operations (find*, get*)
- Invalidate cache on write operations (save, update, delete)
- Log cache hits/misses for monitoring
- Use appropriate TTL based on data staleness tolerance
- Consider cache warming strategies for critical data

---

### 4. Tagged Cache Invalidation Pattern

**Pattern:** Use cache tags for efficient bulk invalidation.

**Frequency:** Found in 27% of analyzed PRs

**Priority:** Important

**Example:**
```php
<?php

namespace Hellofresh\Infrastructure\Cache;

use Symfony\Contracts\Cache\TagAwareCacheInterface;
use Symfony\Contracts\Cache\ItemInterface;

class TaggedCacheManager
{
    /**
     * @var TagAwareCacheInterface
     */
    private $cache;

    /**
     * @var CacheKeyGenerator
     */
    private $keyGenerator;

    public function __construct(
        TagAwareCacheInterface $cache,
        CacheKeyGenerator $keyGenerator
    ) {
        $this->cache = $cache;
        $this->keyGenerator = $keyGenerator;
    }

    /**
     * Cache item with tags
     */
    public function get(string $key, callable $callback, array $tags = [], int $ttl = 3600)
    {
        return $this->cache->get(
            $key,
            function (ItemInterface $item) use ($callback, $tags, $ttl) {
                $item->expiresAfter($ttl);

                if (!empty($tags)) {
                    $item->tag($tags);
                }

                return $callback($item);
            }
        );
    }

    /**
     * Cache product data with entity and country tags
     */
    public function cacheProduct(string $productId, string $countryCode, callable $loader): array
    {
        $key = $this->keyGenerator->forEntity('product', $productId);

        $tags = [
            'product',
            "product_{$productId}",
            "country_{$countryCode}",
        ];

        return $this->get($key, $loader, $tags);
    }

    /**
     * Cache recipe data with multiple tags
     */
    public function cacheRecipe(string $recipeId, array $categories, callable $loader): array
    {
        $key = $this->keyGenerator->forEntity('recipe', $recipeId);

        $tags = [
            'recipe',
            "recipe_{$recipeId}",
        ];

        foreach ($categories as $category) {
            $tags[] = "category_{$category}";
        }

        return $this->get($key, $loader, $tags);
    }

    /**
     * Invalidate all items with specific tag
     */
    public function invalidateTag(string $tag): bool
    {
        return $this->cache->invalidateTags([$tag]);
    }

    /**
     * Invalidate multiple tags
     */
    public function invalidateTags(array $tags): bool
    {
        return $this->cache->invalidateTags($tags);
    }

    /**
     * Invalidate all caches for a product
     */
    public function invalidateProduct(string $productId): void
    {
        $this->invalidateTags([
            'product',
            "product_{$productId}",
        ]);
    }

    /**
     * Invalidate all caches for a country
     */
    public function invalidateCountry(string $countryCode): void
    {
        $this->invalidateTag("country_{$countryCode}");
    }

    /**
     * Invalidate all caches for a category
     */
    public function invalidateCategory(string $category): void
    {
        $this->invalidateTag("category_{$category}");
    }
}
```

**Guidelines:**
- Use hierarchical tags (entity type, entity ID, dimensions)
- Tag data by all relevant dimensions
- Implement invalidation helper methods
- Consider tag proliferation impact
- Use TagAwareAdapter for Redis/Memcached
- Document tag naming conventions

---

### 5. Cache Warming Pattern

**Pattern:** Proactively populate cache before first request.

**Frequency:** Found in 15% of analyzed PRs

**Priority:** Recommended

**Example:**
```php
<?php

namespace Hellofresh\Infrastructure\Cache;

use Hellofresh\Domain\Repository\ProductRepositoryInterface;
use Hellofresh\Domain\Repository\RecipeRepositoryInterface;
use Psr\Cache\CacheItemPoolInterface;
use Psr\Log\LoggerInterface;

class CacheWarmer
{
    /**
     * @var CacheItemPoolInterface
     */
    private $cache;

    /**
     * @var ProductRepositoryInterface
     */
    private $productRepository;

    /**
     * @var RecipeRepositoryInterface
     */
    private $recipeRepository;

    /**
     * @var CacheKeyGenerator
     */
    private $keyGenerator;

    /**
     * @var LoggerInterface
     */
    private $logger;

    public function __construct(
        CacheItemPoolInterface $cache,
        ProductRepositoryInterface $productRepository,
        RecipeRepositoryInterface $recipeRepository,
        CacheKeyGenerator $keyGenerator,
        LoggerInterface $logger
    ) {
        $this->cache = $cache;
        $this->productRepository = $productRepository;
        $this->recipeRepository = $recipeRepository;
        $this->keyGenerator = $keyGenerator;
        $this->logger = $logger;
    }

    /**
     * Warm cache for all active countries
     */
    public function warmProductsCache(array $countryCodes): int
    {
        $warmed = 0;

        foreach ($countryCodes as $countryCode) {
            try {
                $key = $this->keyGenerator->forCountry($countryCode, 'products');
                $products = $this->productRepository->findByCountry($countryCode);

                $item = $this->cache->getItem($key);
                $item->set($products);
                $item->expiresAfter(3600);
                $this->cache->save($item);

                $warmed++;
                $this->logger->info('Warmed products cache', [
                    'country' => $countryCode,
                    'count' => count($products)
                ]);
            } catch (\Throwable $e) {
                $this->logger->error('Failed to warm products cache', [
                    'country' => $countryCode,
                    'error' => $e->getMessage()
                ]);
            }
        }

        return $warmed;
    }

    /**
     * Warm cache for popular recipes
     */
    public function warmPopularRecipesCache(int $limit = 50): int
    {
        try {
            $key = $this->keyGenerator->generate(['recipes', 'popular', $limit]);
            $recipes = $this->recipeRepository->findPopular($limit);

            $item = $this->cache->getItem($key);
            $item->set($recipes);
            $item->expiresAfter(1800); // 30 minutes
            $this->cache->save($item);

            $this->logger->info('Warmed popular recipes cache', [
                'count' => count($recipes)
            ]);

            return 1;
        } catch (\Throwable $e) {
            $this->logger->error('Failed to warm popular recipes cache', [
                'error' => $e->getMessage()
            ]);
            return 0;
        }
    }

    /**
     * Warm all critical caches
     */
    public function warmAll(): array
    {
        $stats = [
            'products' => 0,
            'recipes' => 0,
            'errors' => 0
        ];

        $countryCodes = ['de-DE', 'nl-NL', 'be-BE', 'at-AT', 'ch-CH'];

        try {
            $stats['products'] = $this->warmProductsCache($countryCodes);
        } catch (\Throwable $e) {
            $stats['errors']++;
            $this->logger->error('Cache warming failed for products', [
                'error' => $e->getMessage()
            ]);
        }

        try {
            $stats['recipes'] = $this->warmPopularRecipesCache();
        } catch (\Throwable $e) {
            $stats['errors']++;
            $this->logger->error('Cache warming failed for recipes', [
                'error' => $e->getMessage()
            ]);
        }

        return $stats;
    }
}
```

**Guidelines:**
- Warm critical data used on every request
- Run cache warming after deployments
- Schedule periodic warming for volatile data
- Use CLI commands or cron jobs for warming
- Monitor warming performance and duration
- Implement warming priorities (critical first)
- Handle warming failures gracefully

---

### 6. Cache-Aside Pattern

**Pattern:** Implement lazy loading with cache-aside (read-through) pattern.

**Frequency:** Found in 27% of analyzed PRs

**Priority:** Important

**Example:**
```php
<?php

namespace Hellofresh\Application\Service;

use Hellofresh\Domain\Repository\RecipeRepositoryInterface;
use Hellofresh\Domain\Entity\Recipe;
use Hellofresh\Infrastructure\Cache\CacheKeyGenerator;
use Psr\Cache\CacheItemPoolInterface;
use Psr\Log\LoggerInterface;

class RecipeService
{
    /**
     * @var RecipeRepositoryInterface
     */
    private $repository;

    /**
     * @var CacheItemPoolInterface
     */
    private $cache;

    /**
     * @var CacheKeyGenerator
     */
    private $keyGenerator;

    /**
     * @var LoggerInterface
     */
    private $logger;

    private const CACHE_TTL = 3600; // 1 hour

    public function __construct(
        RecipeRepositoryInterface $repository,
        CacheItemPoolInterface $cache,
        CacheKeyGenerator $keyGenerator,
        LoggerInterface $logger
    ) {
        $this->repository = $repository;
        $this->cache = $cache;
        $this->keyGenerator = $keyGenerator;
        $this->logger = $logger;
    }

    /**
     * Get recipe with cache-aside pattern
     */
    public function getRecipe(string $id): ?Recipe
    {
        $key = $this->keyGenerator->forEntity('recipe', $id);
        $item = $this->cache->getItem($key);

        // 1. Check cache
        if ($item->isHit()) {
            $this->logger->debug('Recipe cache hit', ['id' => $id]);
            return $item->get();
        }

        $this->logger->debug('Recipe cache miss', ['id' => $id]);

        // 2. Load from database
        $recipe = $this->repository->findById($id);

        if ($recipe === null) {
            // Cache negative result with shorter TTL
            $item->set(null);
            $item->expiresAfter(300); // 5 minutes
            $this->cache->save($item);
            return null;
        }

        // 3. Store in cache
        $item->set($recipe);
        $item->expiresAfter(self::CACHE_TTL);
        $this->cache->save($item);

        return $recipe;
    }

    /**
     * Get multiple recipes with cache-aside
     */
    public function getRecipes(array $ids): array
    {
        $recipes = [];
        $missedIds = [];

        // 1. Try to get from cache
        foreach ($ids as $id) {
            $key = $this->keyGenerator->forEntity('recipe', $id);
            $item = $this->cache->getItem($key);

            if ($item->isHit()) {
                $recipe = $item->get();
                if ($recipe !== null) {
                    $recipes[$id] = $recipe;
                }
            } else {
                $missedIds[] = $id;
            }
        }

        // 2. Load missed items from database
        if (!empty($missedIds)) {
            $loadedRecipes = $this->repository->findByIds($missedIds);

            foreach ($loadedRecipes as $recipe) {
                $recipes[$recipe->getId()] = $recipe;

                // 3. Store in cache
                $key = $this->keyGenerator->forEntity('recipe', $recipe->getId());
                $item = $this->cache->getItem($key);
                $item->set($recipe);
                $item->expiresAfter(self::CACHE_TTL);
                $this->cache->save($item);
            }
        }

        $this->logger->info('Loaded recipes', [
            'requested' => count($ids),
            'cached' => count($ids) - count($missedIds),
            'loaded' => count($missedIds)
        ]);

        return $recipes;
    }

    /**
     * Update recipe and invalidate cache
     */
    public function updateRecipe(Recipe $recipe): void
    {
        $this->repository->save($recipe);

        // Invalidate cache
        $key = $this->keyGenerator->forEntity('recipe', $recipe->getId());
        $this->cache->deleteItem($key);

        $this->logger->info('Recipe updated and cache invalidated', [
            'id' => $recipe->getId()
        ]);
    }
}
```

**Guidelines:**
- Check cache first (cache-aside)
- Load from source on cache miss
- Store loaded data in cache
- Cache negative results with shorter TTL
- Batch load for multiple IDs
- Log cache hit/miss ratios
- Invalidate cache after updates

---

### 7. Stampede Prevention Pattern

**Pattern:** Prevent cache stampede (thundering herd) using locking or early expiration.

**Frequency:** Found in 10% of analyzed PRs

**Priority:** Recommended

**Example:**
```php
<?php

namespace Hellofresh\Infrastructure\Cache;

use Psr\Cache\CacheItemPoolInterface;
use Symfony\Component\Lock\LockFactory;
use Symfony\Component\Lock\Store\RedisStore;
use Psr\Log\LoggerInterface;

class StampedePreventionCache
{
    /**
     * @var CacheItemPoolInterface
     */
    private $cache;

    /**
     * @var LockFactory
     */
    private $lockFactory;

    /**
     * @var LoggerInterface
     */
    private $logger;

    private const LOCK_TTL = 10; // 10 seconds
    private const GRACE_PERIOD = 60; // 60 seconds

    public function __construct(
        CacheItemPoolInterface $cache,
        LockFactory $lockFactory,
        LoggerInterface $logger
    ) {
        $this->cache = $cache;
        $this->lockFactory = $lockFactory;
        $this->logger = $logger;
    }

    /**
     * Get value with stampede protection using locks
     */
    public function getOrCompute(string $key, callable $callback, int $ttl = 3600)
    {
        $item = $this->cache->getItem($key);

        if ($item->isHit()) {
            return $item->get();
        }

        // Try to acquire lock
        $lock = $this->lockFactory->createLock($key, self::LOCK_TTL);

        if ($lock->acquire()) {
            try {
                // Double-check cache after acquiring lock
                $item = $this->cache->getItem($key);
                if ($item->isHit()) {
                    return $item->get();
                }

                // Compute value
                $value = $callback();

                // Store in cache
                $item->set($value);
                $item->expiresAfter($ttl);
                $this->cache->save($item);

                return $value;
            } finally {
                $lock->release();
            }
        }

        // Failed to acquire lock, wait and retry
        usleep(100000); // 100ms
        return $this->getOrComputeWithTimeout($key, $callback, $ttl);
    }

    /**
     * Get with retry timeout
     */
    private function getOrComputeWithTimeout(string $key, callable $callback, int $ttl, int $retries = 5)
    {
        for ($i = 0; $i < $retries; $i++) {
            $item = $this->cache->getItem($key);

            if ($item->isHit()) {
                return $item->get();
            }

            usleep(100000); // 100ms between retries
        }

        // Fallback: compute without caching
        $this->logger->warning('Cache stampede: computing without cache', ['key' => $key]);
        return $callback();
    }

    /**
     * Get with early expiration (probabilistic)
     */
    public function getWithEarlyExpiration(
        string $key,
        callable $callback,
        int $ttl = 3600,
        float $beta = 1.0
    ) {
        $item = $this->cache->getItem($key);

        if ($item->isHit()) {
            $metadata = $item->getMetadata();
            $createdAt = $metadata['ctime'] ?? time();
            $age = time() - $createdAt;

            // Probabilistically trigger early recomputation
            // to prevent all requests from expiring simultaneously
            $xfetch = log(mt_rand() / mt_getrandmax()) * $beta * $ttl;

            if ($age - $xfetch >= 0) {
                // Recompute in background
                $this->recomputeAsync($key, $callback, $ttl);
            }

            return $item->get();
        }

        // Cache miss: compute and store
        $value = $callback();
        $item->set($value);
        $item->expiresAfter($ttl);
        $this->cache->save($item);

        return $value;
    }

    /**
     * Recompute value asynchronously
     */
    private function recomputeAsync(string $key, callable $callback, int $ttl): void
    {
        // In production, dispatch to message queue
        // For now, recompute synchronously
        try {
            $value = $callback();
            $item = $this->cache->getItem($key);
            $item->set($value);
            $item->expiresAfter($ttl);
            $this->cache->save($item);
        } catch (\Throwable $e) {
            $this->logger->error('Failed to recompute cache', [
                'key' => $key,
                'error' => $e->getMessage()
            ]);
        }
    }
}
```

**Guidelines:**
- Use locks to prevent simultaneous computation
- Implement lock timeout and retry logic
- Consider probabilistic early expiration
- Use short lock TTL (5-10 seconds)
- Log stampede occurrences
- Monitor lock contention
- Fallback to computing without cache if needed

---

## Implementation Guidelines

### Cache Configuration

**Service Definition:**
```yaml
# config/services.yaml
services:
    # Cache pools
    cache.app:
        class: Symfony\Component\Cache\Adapter\RedisAdapter
        arguments:
            - '@redis.connection'
            - 'app'
            - 3600

    cache.tagged:
        class: Symfony\Component\Cache\Adapter\TagAwareAdapter
        arguments:
            - '@cache.app'

    # Cache utilities
    Hellofresh\Infrastructure\Cache\CacheKeyGenerator: ~

    Hellofresh\Infrastructure\Cache\TaggedCacheManager:
        arguments:
            - '@cache.tagged'
            - '@Hellofresh\Infrastructure\Cache\CacheKeyGenerator'

    Hellofresh\Infrastructure\Cache\CacheWarmer:
        arguments:
            - '@cache.app'
            - '@Hellofresh\Domain\Repository\ProductRepositoryInterface'
            - '@Hellofresh\Domain\Repository\RecipeRepositoryInterface'
            - '@Hellofresh\Infrastructure\Cache\CacheKeyGenerator'
            - '@logger'
```

### Cache TTL Guidelines

- **Static data (products, recipes):** 3600s (1 hour)
- **User-specific data (cart, preferences):** 1800s (30 minutes)
- **Session data:** 86400s (24 hours)
- **Frequently changing data (prices, inventory):** 300s (5 minutes)
- **Negative results (not found):** 300s (5 minutes)

### Testing Caching

**Cache Test Example:**
```php
<?php

namespace Tests\Infrastructure\Cache;

use PHPUnit\Framework\TestCase;
use Hellofresh\Infrastructure\Repository\Cached\CachedProductRepository;
use Psr\Cache\CacheItemPoolInterface;
use Prophecy\PhpUnit\ProphecyTrait;

class CachedProductRepositoryTest extends TestCase
{
    use ProphecyTrait;

    public function testFindByIdHitsCache(): void
    {
        $product = $this->createProduct('123');

        $decorated = $this->prophesize(ProductRepositoryInterface::class);
        $decorated->findById('123')->shouldNotBeCalled();

        $item = $this->prophesize(CacheItemInterface::class);
        $item->isHit()->willReturn(true);
        $item->get()->willReturn($product);

        $cache = $this->prophesize(CacheItemPoolInterface::class);
        $cache->getItem('v1:entity:product:123')->willReturn($item->reveal());

        $repository = new CachedProductRepository(
            $decorated->reveal(),
            $cache->reveal(),
            new CacheKeyGenerator(),
            $this->createMock(LoggerInterface::class)
        );

        $result = $repository->findById('123');

        $this->assertSame($product, $result);
    }

    public function testFindByIdMissesCache(): void
    {
        $product = $this->createProduct('123');

        $decorated = $this->prophesize(ProductRepositoryInterface::class);
        $decorated->findById('123')->willReturn($product)->shouldBeCalled();

        $item = $this->prophesize(CacheItemInterface::class);
        $item->isHit()->willReturn(false);
        $item->set($product)->shouldBeCalled();
        $item->expiresAfter(3600)->shouldBeCalled();

        $cache = $this->prophesize(CacheItemPoolInterface::class);
        $cache->getItem('v1:entity:product:123')->willReturn($item->reveal());
        $cache->save($item->reveal())->shouldBeCalled();

        $repository = new CachedProductRepository(
            $decorated->reveal(),
            $cache->reveal(),
            new CacheKeyGenerator(),
            $this->createMock(LoggerInterface::class)
        );

        $result = $repository->findById('123');

        $this->assertSame($product, $result);
    }
}
```

---

## Anti-Patterns to Avoid

❌ **Don't cache everything indiscriminately:**
```php
// ❌ Bad - caching data that changes frequently
$key = 'current_time';
$item = $cache->getItem($key);
if (!$item->isHit()) {
    $item->set(time());
    $item->expiresAfter(3600);
    $cache->save($item);
}
```

✅ **Only cache data with acceptable staleness:**
```php
// ✅ Good - cache data that doesn't change often
$key = 'product_catalog';
$item = $cache->getItem($key);
if (!$item->isHit()) {
    $catalog = $this->repository->getActiveCatalog();
    $item->set($catalog);
    $item->expiresAfter(3600); // OK for relatively static data
    $cache->save($item);
}
```

❌ **Don't use unpredictable cache keys:**
```php
// ❌ Bad - using object hash as key
$key = spl_object_hash($product);
$cache->save($key, $product);
```

✅ **Use deterministic, meaningful keys:**
```php
// ✅ Good - predictable, meaningful key
$key = $keyGenerator->forEntity('product', $product->getId());
$cache->save($key, $product);
```

❌ **Don't forget to invalidate cache:**
```php
// ❌ Bad - updating without invalidation
public function updateProduct(Product $product): void
{
    $this->repository->save($product);
    // Missing cache invalidation!
}
```

✅ **Always invalidate on writes:**
```php
// ✅ Good - invalidate after update
public function updateProduct(Product $product): void
{
    $this->repository->save($product);
    $key = $this->keyGenerator->forEntity('product', $product->getId());
    $this->cache->deleteItem($key);
    $this->cache->invalidateTag('product');
}
```

---

## Related Implementers

- **repository-pattern.md** - Repository implementations that benefit from caching
- **dependency-injection-symfony.md** - Configuring cache services
- **metrics-monitoring.md** - Monitoring cache hit rates and performance
- **api-controllers-routing.md** - Using cached data in controllers
- **doctrine-orm.md** - Database query result caching
