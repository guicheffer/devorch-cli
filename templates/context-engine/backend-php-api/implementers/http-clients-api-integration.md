---
domain: http-clients-api-integration
description: HTTP client integration using Guzzle for external API communication with caching, retry logic, and error handling
---

# HTTP Clients & API Integration Implementer

You are responsible for implementing HTTP client integrations for communicating with external services using Guzzle HTTP client.

## Core Patterns

### 1. Guzzle HTTP Client Configuration Pattern

**Pattern:** Configure Guzzle client with base URI, timeouts, and default headers.

**Frequency:** Found in 86% of analyzed PRs

**Priority:** Critical

**Example from PR #6651:**
```php
<?php

namespace YourCompany\Business\Client;

use GuzzleHttp\Client;
use GuzzleHttp\ClientInterface;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Middleware;
use Psr\Log\LoggerInterface;

class HttpClientFactory
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
     * Create HTTP client for external service
     *
     * @param string $baseUri Base URI for the service
     * @param int $timeout Request timeout in seconds
     * @param array $defaultHeaders Default headers for all requests
     * @return ClientInterface
     */
    public function create(
        string $baseUri,
        int $timeout = 5,
        array $defaultHeaders = []
    ): ClientInterface {
        $stack = HandlerStack::create();

        // Add retry middleware
        $stack->push(
            Middleware::retry(
                $this->retryDecider(),
                $this->retryDelay()
            )
        );

        // Add logging middleware
        $stack->push(
            Middleware::log(
                $this->logger,
                new \GuzzleHttp\MessageFormatter(
                    '{method} {uri} HTTP/{version} {code} {res_header_Content-Length}'
                )
            )
        );

        return new Client([
            'base_uri' => $baseUri,
            'timeout' => $timeout,
            'connect_timeout' => 2,
            'http_errors' => true,
            'headers' => array_merge([
                'Accept' => 'application/json',
                'Content-Type' => 'application/json',
                'User-Agent' => 'YourCompany-API/2.0',
            ], $defaultHeaders),
            'handler' => $stack,
        ]);
    }

    /**
     * Retry decider for transient failures
     */
    private function retryDecider(): callable
    {
        return function (
            $retries,
            $request,
            $response = null,
            $exception = null
        ) {
            // Don't retry if we've already retried 3 times
            if ($retries >= 3) {
                return false;
            }

            // Retry on connection exceptions
            if ($exception instanceof \GuzzleHttp\Exception\ConnectException) {
                return true;
            }

            // Retry on 5xx errors
            if ($response && $response->getStatusCode() >= 500) {
                return true;
            }

            // Retry on 429 (rate limit)
            if ($response && $response->getStatusCode() === 429) {
                return true;
            }

            return false;
        };
    }

    /**
     * Retry delay with exponential backoff
     */
    private function retryDelay(): callable
    {
        return function ($retries) {
            // Exponential backoff: 100ms, 200ms, 400ms
            return 100 * pow(2, $retries);
        };
    }
}
```

**Guidelines:**
- Use Guzzle 6+ for HTTP client
- Configure timeouts explicitly (connection + request)
- Add retry middleware for transient failures
- Use exponential backoff for retries
- Log all HTTP requests/responses
- Set User-Agent header
- Enable http_errors for exception throwing
- Configure default headers

---

### 2. Service-Specific Client Pattern

**Pattern:** Create dedicated client classes for each external service.

**Frequency:** Found in 86% of analyzed PRs

**Priority:** Critical

**Example from PR #6651:**
```php
<?php

namespace YourCompany\Business\BoxSku;

use GuzzleHttp\ClientInterface;
use GuzzleHttp\Exception\GuzzleException;
use YourCompany\Business\Helper\Http\ResponseParser;
use Psr\Cache\CacheItemPoolInterface;
use Psr\Cache\InvalidArgumentException;
use Psr\Log\LoggerInterface;

class BoxSkuConfigRetriever
{
    private const RCS_COUNTRY = 'global';
    private const RCS_PROJECT_BOX_SKU = 'box-sku';
    private const RCS_LOCALE = 'en_US';

    private const CONFIG_CART_SERVICE_BOX_SIZE_SOURCE_OF_TRUTH = 'cartServiceBoxSizeSourceOfTruth';
    private const CONFIG_CART_SERVICE_BOX_SIZE_SOURCE_OF_TRUTH_ROLLOUT_BLOCK_ONEOFFS =
        'CartServiceBoxSizeSourceOfTruthRolloutBlockOneoffs';
    private const CONFIG_IS_CACHE_ENABLED_PER_MARKET = 'isCacheEnabledPerMarket';

    private const CACHE_TTL_SECONDS = 1;
    private const CACHE_KEY_PREFIX = 'boxSkuConfig';

    /**
     * @var ClientInterface
     */
    private $httpClient;

    /**
     * @var LoggerInterface
     */
    private $logger;

    /**
     * @var CacheItemPoolInterface
     */
    private $cache;

    public function __construct(
        ClientInterface $httpClient,
        CacheItemPoolInterface $cache,
        LoggerInterface $logger
    ) {
        $this->httpClient = $httpClient;
        $this->cache = $cache;
        $this->logger = $logger;
    }

    /**
     * Check if cart is source of truth for the given market
     *
     * @param string $market Market code (e.g. 'US', 'DE')
     * @return bool
     * @throws \Throwable When RCS communication fails
     */
    public function isCartSourceOfTruthForMarket(string $market): bool
    {
        $configuration = $this->getBoxSkuConfiguration($market);

        if (!isset($configuration[self::CONFIG_CART_SERVICE_BOX_SIZE_SOURCE_OF_TRUTH])) {
            $this->logger->debug('Cart service box size source of truth configuration not found');
            return false;
        }

        $configurationValue = $configuration[self::CONFIG_CART_SERVICE_BOX_SIZE_SOURCE_OF_TRUTH];
        $markets = $this->parseCommaSeparatedMarkets($configurationValue);

        return in_array(strtolower($market), $markets, true);
    }

    /**
     * Check if rollout is blocked for the given market
     *
     * @param string $market Market code
     * @return bool
     * @throws \Throwable When RCS communication fails
     */
    public function isRolloutBlockedForMarket(string $market): bool
    {
        $configuration = $this->getBoxSkuConfiguration($market);

        if (!isset($configuration[self::CONFIG_CART_SERVICE_BOX_SIZE_SOURCE_OF_TRUTH_ROLLOUT_BLOCK_ONEOFFS])) {
            $this->logger->debug('Cart service box size source of truth rollout block configuration not found');
            return false;
        }

        $configurationValue = $configuration[self::CONFIG_CART_SERVICE_BOX_SIZE_SOURCE_OF_TRUTH_ROLLOUT_BLOCK_ONEOFFS];
        $markets = $this->parseCommaSeparatedMarkets($configurationValue);

        return in_array(strtolower($market), $markets, true);
    }

    /**
     * Get box-sku configuration from RCS with caching
     *
     * @param string $country Country code
     * @return array Configuration array
     * @throws \Throwable When RCS communication fails
     */
    private function getBoxSkuConfiguration(string $country): array
    {
        $cacheKey = $this->generateCacheKey($country, self::RCS_PROJECT_BOX_SKU);

        try {
            // Check cache first
            $cachedItem = $this->cache->getItem($cacheKey);
            if ($cachedItem->isHit()) {
                $this->logger->info('BoxSkuConfigRetriever: Cache HIT', [
                    'country' => $country,
                    'cache_key' => $cacheKey
                ]);
                return $cachedItem->get();
            }

            // Fetch from RCS
            $configuration = $this->fetchFromRCS($country);

            // Cache if enabled for market
            if ($this->isCacheEnabledForMarket($country, $configuration)) {
                // Double-check cache to avoid race condition
                $cachedItem = $this->cache->getItem($cacheKey);
                if ($cachedItem->isHit()) {
                    $this->logger->info('BoxSkuConfigRetriever: Cache HIT during recheck', [
                        'country' => $country,
                        'cache_key' => $cacheKey
                    ]);
                    return $cachedItem->get();
                }

                $cachedItem->set($configuration)->expiresAfter(self::CACHE_TTL_SECONDS);
                $this->cache->save($cachedItem);

                $this->logger->info('BoxSkuConfigRetriever: RCS call + Cache STORED', [
                    'country' => $country,
                    'cache_key' => $cacheKey
                ]);
            } else {
                $this->cache->deleteItem($cacheKey);
                $this->logger->info('BoxSkuConfigRetriever: RCS call (Cache DISABLED)', [
                    'country' => $country,
                    'cache_key' => $cacheKey
                ]);
            }

            return $configuration;
        } catch (InvalidArgumentException $e) {
            $this->logger->warning('Invalid cache key, falling back to RCS only', [
                'cache_key' => $cacheKey,
                'exception' => $e->getMessage()
            ]);
            return $this->fetchFromRCS($country);
        } catch (GuzzleException $e) {
            $this->logger->error('Failed to fetch box-sku configuration from RCS', [
                'country' => $country,
                'exception' => $e,
            ]);
            throw $e;
        }
    }

    /**
     * Fetch configuration from RCS
     *
     * @param string $country Country code
     * @return array Configuration array
     * @throws GuzzleException
     */
    private function fetchFromRCS(string $country): array
    {
        $response = $this->httpClient->request('GET', 'configurations', [
            'query' => [
                'country' => self::RCS_COUNTRY,
                'project' => self::RCS_PROJECT_BOX_SKU,
                'locale' => self::RCS_LOCALE,
            ],
        ]);

        $configuration = ResponseParser::json($response);

        return $configuration;
    }

    /**
     * Check if cache is enabled for the given market
     *
     * @param string $market Market code
     * @param array $configuration Configuration array
     * @return bool
     */
    private function isCacheEnabledForMarket(string $market, array $configuration): bool
    {
        if (!isset($configuration[self::CONFIG_IS_CACHE_ENABLED_PER_MARKET])) {
            return false;
        }

        $configValue = $configuration[self::CONFIG_IS_CACHE_ENABLED_PER_MARKET];
        $enabledMarkets = $this->parseCommaSeparatedMarkets($configValue);

        return in_array(strtolower($market), $enabledMarkets, true);
    }

    /**
     * Parse comma-separated list of markets
     *
     * @param string $value Comma-separated markets
     * @return array Array of lowercase market codes
     */
    private function parseCommaSeparatedMarkets(string $value): array
    {
        $markets = array_map('trim', explode(',', $value));
        $markets = array_map('strtolower', $markets);
        $markets = array_filter($markets); // Remove empty strings

        return array_values($markets);
    }

    /**
     * Generate cache key for configuration
     *
     * @param string $country Country code
     * @param string $project Project name
     * @return string Cache key
     */
    private function generateCacheKey(string $country, string $project): string
    {
        return sprintf(
            '%s:%s:%s',
            self::CACHE_KEY_PREFIX,
            $project,
            strtolower($country)
        );
    }
}
```

**Guidelines:**
- One client class per external service
- Inject HttpClient via constructor
- Inject PSR-6 cache for response caching
- Inject PSR-3 logger for observability
- Use constants for configuration keys
- Implement caching with TTL
- Handle cache race conditions
- Parse responses using helper classes
- Type-hint all method signatures
- Document exceptions with @throws
- Log cache hits/misses
- Return domain-specific types

---

### 3. Response Parser Pattern

**Pattern:** Use helper classes to parse and validate HTTP responses.

**Frequency:** Found in 82% of analyzed PRs

**Priority:** Critical

**Example:**
```php
<?php

namespace YourCompany\Business\Helper\Http;

use GuzzleHttp\Exception\BadResponseException;
use Psr\Http\Message\ResponseInterface;

class ResponseParser
{
    /**
     * Parse JSON response
     *
     * @param ResponseInterface $response HTTP response
     * @return array Parsed JSON as array
     * @throws BadResponseException When response is not JSON
     */
    public static function json(ResponseInterface $response): array
    {
        $body = (string) $response->getBody();

        $data = json_decode($body, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new BadResponseException(
                sprintf('Invalid JSON response: %s', json_last_error_msg()),
                new \GuzzleHttp\Psr7\Request('GET', ''),
                $response
            );
        }

        return $data;
    }

    /**
     * Parse JSON response and extract specific field
     *
     * @param ResponseInterface $response HTTP response
     * @param string $field Field name to extract
     * @return mixed Field value
     * @throws BadResponseException When field is missing
     */
    public static function jsonField(ResponseInterface $response, string $field)
    {
        $data = self::json($response);

        if (!array_key_exists($field, $data)) {
            throw new BadResponseException(
                sprintf('Missing required field: %s', $field),
                new \GuzzleHttp\Psr7\Request('GET', ''),
                $response
            );
        }

        return $data[$field];
    }

    /**
     * Check if response is successful (2xx status)
     *
     * @param ResponseInterface $response HTTP response
     * @return bool True if successful
     */
    public static function isSuccessful(ResponseInterface $response): bool
    {
        $statusCode = $response->getStatusCode();
        return $statusCode >= 200 && $statusCode < 300;
    }

    /**
     * Get status code from response
     *
     * @param ResponseInterface $response HTTP response
     * @return int Status code
     */
    public static function statusCode(ResponseInterface $response): int
    {
        return $response->getStatusCode();
    }

    /**
     * Parse response as plain text
     *
     * @param ResponseInterface $response HTTP response
     * @return string Response body as string
     */
    public static function text(ResponseInterface $response): string
    {
        return (string) $response->getBody();
    }
}
```

**Guidelines:**
- Use static methods for stateless parsing
- Validate JSON before returning
- Throw BadResponseException for invalid responses
- Provide specialized methods for common cases
- Always decode with associative arrays (true flag)
- Check json_last_error() for parsing errors

---

### 4. Request Builder Pattern

**Pattern:** Build complex requests with fluent interface.

**Frequency:** Found in 73% of analyzed PRs

**Priority:** Important

**Example:**
```php
<?php

namespace YourCompany\Business\Client\DeliveryService;

use GuzzleHttp\ClientInterface;
use GuzzleHttp\Exception\GuzzleException;
use Psr\Log\LoggerInterface;

class DeliveryServiceClient
{
    /**
     * @var ClientInterface
     */
    private $httpClient;

    /**
     * @var LoggerInterface
     */
    private $logger;

    public function __construct(
        ClientInterface $httpClient,
        LoggerInterface $logger
    ) {
        $this->httpClient = $httpClient;
        $this->logger = $logger;
    }

    /**
     * Get available delivery windows for address
     *
     * @param string $postcode Postal code
     * @param string $country Country code
     * @param string $productFamily Product family handle
     * @param \DateTime|null $startDate Start date for window search
     * @return array Array of delivery windows
     * @throws GuzzleException
     */
    public function getDeliveryWindows(
        string $postcode,
        string $country,
        string $productFamily,
        ?\DateTime $startDate = null
    ): array {
        $query = [
            'postcode' => $postcode,
            'country' => $country,
            'product_family' => $productFamily,
        ];

        if ($startDate) {
            $query['start_date'] = $startDate->format('Y-m-d');
        }

        $this->logger->info('Fetching delivery windows', [
            'postcode' => $postcode,
            'country' => $country,
            'product_family' => $productFamily,
        ]);

        try {
            $response = $this->httpClient->request('GET', '/v1/delivery-windows', [
                'query' => $query,
                'headers' => [
                    'X-Request-ID' => $this->generateRequestId(),
                ],
            ]);

            $data = ResponseParser::json($response);

            $this->logger->info('Delivery windows fetched successfully', [
                'count' => count($data['windows'] ?? []),
            ]);

            return $data['windows'] ?? [];
        } catch (GuzzleException $e) {
            $this->logger->error('Failed to fetch delivery windows', [
                'postcode' => $postcode,
                'country' => $country,
                'exception' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Create delivery booking
     *
     * @param array $bookingData Booking data
     * @return array Created booking
     * @throws GuzzleException
     */
    public function createBooking(array $bookingData): array
    {
        $this->logger->info('Creating delivery booking', [
            'customer_id' => $bookingData['customer_id'] ?? null,
            'delivery_date' => $bookingData['delivery_date'] ?? null,
        ]);

        try {
            $response = $this->httpClient->request('POST', '/v1/bookings', [
                'json' => $bookingData,
                'headers' => [
                    'X-Request-ID' => $this->generateRequestId(),
                    'X-Idempotency-Key' => $this->generateIdempotencyKey($bookingData),
                ],
            ]);

            $data = ResponseParser::json($response);

            $this->logger->info('Delivery booking created successfully', [
                'booking_id' => $data['id'] ?? null,
            ]);

            return $data;
        } catch (GuzzleException $e) {
            $this->logger->error('Failed to create delivery booking', [
                'exception' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Update delivery booking
     *
     * @param string $bookingId Booking ID
     * @param array $updateData Update data
     * @return array Updated booking
     * @throws GuzzleException
     */
    public function updateBooking(string $bookingId, array $updateData): array
    {
        $this->logger->info('Updating delivery booking', [
            'booking_id' => $bookingId,
        ]);

        try {
            $response = $this->httpClient->request('PATCH', "/v1/bookings/{$bookingId}", [
                'json' => $updateData,
                'headers' => [
                    'X-Request-ID' => $this->generateRequestId(),
                ],
            ]);

            $data = ResponseParser::json($response);

            $this->logger->info('Delivery booking updated successfully', [
                'booking_id' => $bookingId,
            ]);

            return $data;
        } catch (GuzzleException $e) {
            $this->logger->error('Failed to update delivery booking', [
                'booking_id' => $bookingId,
                'exception' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Cancel delivery booking
     *
     * @param string $bookingId Booking ID
     * @return void
     * @throws GuzzleException
     */
    public function cancelBooking(string $bookingId): void
    {
        $this->logger->info('Cancelling delivery booking', [
            'booking_id' => $bookingId,
        ]);

        try {
            $this->httpClient->request('DELETE', "/v1/bookings/{$bookingId}", [
                'headers' => [
                    'X-Request-ID' => $this->generateRequestId(),
                ],
            ]);

            $this->logger->info('Delivery booking cancelled successfully', [
                'booking_id' => $bookingId,
            ]);
        } catch (GuzzleException $e) {
            $this->logger->error('Failed to cancel delivery booking', [
                'booking_id' => $bookingId,
                'exception' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Generate unique request ID for tracing
     *
     * @return string Request ID
     */
    private function generateRequestId(): string
    {
        return sprintf(
            '%s-%s',
            date('YmdHis'),
            bin2hex(random_bytes(8))
        );
    }

    /**
     * Generate idempotency key for create/update operations
     *
     * @param array $data Request data
     * @return string Idempotency key
     */
    private function generateIdempotencyKey(array $data): string
    {
        return hash('sha256', json_encode($data));
    }
}
```

**Guidelines:**
- Create method per API operation
- Use descriptive method names
- Pass all parameters as typed arguments
- Build request options array
- Add X-Request-ID header for tracing
- Add X-Idempotency-Key for idempotent operations
- Log before and after requests
- Catch and re-throw exceptions with context
- Return parsed response data
- Document exceptions

---

### 5. Error Handling Pattern

**Pattern:** Handle HTTP errors with specific exception types.

**Frequency:** Found in 86% of analyzed PRs

**Priority:** Critical

**Example:**
```php
<?php

namespace YourCompany\Business\Client;

use GuzzleHttp\ClientInterface;
use GuzzleHttp\Exception\ClientException;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Exception\GuzzleException;
use GuzzleHttp\Exception\ServerException;
use YourCompany\Business\Exception\ExternalServiceException;
use YourCompany\Business\Exception\ExternalServiceUnavailableException;
use YourCompany\Business\Exception\NotFoundException;
use YourCompany\Business\Exception\ValidationException;
use Psr\Log\LoggerInterface;

class ResilientHttpClient
{
    /**
     * @var ClientInterface
     */
    private $httpClient;

    /**
     * @var LoggerInterface
     */
    private $logger;

    public function __construct(
        ClientInterface $httpClient,
        LoggerInterface $logger
    ) {
        $this->httpClient = $httpClient;
        $this->logger = $logger;
    }

    /**
     * Execute HTTP request with error handling
     *
     * @param string $method HTTP method
     * @param string $uri Request URI
     * @param array $options Request options
     * @return array Parsed response
     * @throws ExternalServiceException
     * @throws ExternalServiceUnavailableException
     * @throws NotFoundException
     * @throws ValidationException
     */
    public function request(string $method, string $uri, array $options = []): array
    {
        try {
            $response = $this->httpClient->request($method, $uri, $options);
            return ResponseParser::json($response);
        } catch (ClientException $e) {
            return $this->handleClientException($e, $method, $uri);
        } catch (ServerException $e) {
            return $this->handleServerException($e, $method, $uri);
        } catch (ConnectException $e) {
            return $this->handleConnectException($e, $method, $uri);
        } catch (GuzzleException $e) {
            return $this->handleGenericException($e, $method, $uri);
        }
    }

    /**
     * Handle 4xx client errors
     *
     * @param ClientException $e Exception
     * @param string $method HTTP method
     * @param string $uri Request URI
     * @return array
     * @throws NotFoundException
     * @throws ValidationException
     * @throws ExternalServiceException
     */
    private function handleClientException(
        ClientException $e,
        string $method,
        string $uri
    ): array {
        $response = $e->getResponse();
        $statusCode = $response->getStatusCode();
        $body = (string) $response->getBody();

        $this->logger->warning('HTTP client error', [
            'method' => $method,
            'uri' => $uri,
            'status_code' => $statusCode,
            'response_body' => $body,
        ]);

        // Handle specific status codes
        if ($statusCode === 404) {
            throw new NotFoundException('Resource not found');
        }

        if ($statusCode === 400 || $statusCode === 422) {
            $errors = $this->extractValidationErrors($body);
            throw new ValidationException('Validation failed', $errors);
        }

        throw new ExternalServiceException(
            sprintf('External service error: %s', $e->getMessage()),
            $statusCode,
            $e
        );
    }

    /**
     * Handle 5xx server errors
     *
     * @param ServerException $e Exception
     * @param string $method HTTP method
     * @param string $uri Request URI
     * @return array
     * @throws ExternalServiceException
     */
    private function handleServerException(
        ServerException $e,
        string $method,
        string $uri
    ): array {
        $response = $e->getResponse();
        $statusCode = $response->getStatusCode();

        $this->logger->error('HTTP server error', [
            'method' => $method,
            'uri' => $uri,
            'status_code' => $statusCode,
        ]);

        throw new ExternalServiceException(
            sprintf('External service server error: %s', $e->getMessage()),
            $statusCode,
            $e
        );
    }

    /**
     * Handle connection errors
     *
     * @param ConnectException $e Exception
     * @param string $method HTTP method
     * @param string $uri Request URI
     * @return array
     * @throws ExternalServiceUnavailableException
     */
    private function handleConnectException(
        ConnectException $e,
        string $method,
        string $uri
    ): array {
        $this->logger->error('HTTP connection error', [
            'method' => $method,
            'uri' => $uri,
            'exception' => $e->getMessage(),
        ]);

        throw new ExternalServiceUnavailableException(
            sprintf('External service unavailable: %s', $e->getMessage()),
            0,
            $e
        );
    }

    /**
     * Handle generic HTTP errors
     *
     * @param GuzzleException $e Exception
     * @param string $method HTTP method
     * @param string $uri Request URI
     * @return array
     * @throws ExternalServiceException
     */
    private function handleGenericException(
        GuzzleException $e,
        string $method,
        string $uri
    ): array {
        $this->logger->error('HTTP error', [
            'method' => $method,
            'uri' => $uri,
            'exception' => $e->getMessage(),
        ]);

        throw new ExternalServiceException(
            sprintf('External service error: %s', $e->getMessage()),
            0,
            $e
        );
    }

    /**
     * Extract validation errors from response body
     *
     * @param string $body Response body
     * @return array Validation errors
     */
    private function extractValidationErrors(string $body): array
    {
        $data = json_decode($body, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            return [];
        }

        // Common error formats
        if (isset($data['errors']) && is_array($data['errors'])) {
            return $data['errors'];
        }

        if (isset($data['error']) && is_string($data['error'])) {
            return ['error' => $data['error']];
        }

        if (isset($data['message']) && is_string($data['message'])) {
            return ['message' => $data['message']];
        }

        return [];
    }
}
```

**Guidelines:**
- Catch specific Guzzle exceptions
- Convert to domain exceptions
- Log all errors with context
- Extract error details from response
- Map HTTP status codes to domain exceptions
- 404 → NotFoundException
- 400/422 → ValidationException
- 5xx → ExternalServiceException
- Connection errors → ExternalServiceUnavailableException

---

### 6. Caching Strategy Pattern

**Pattern:** Implement PSR-6 caching for API responses.

**Frequency:** Found in 82% of analyzed PRs

**Priority:** Important

**Example from PR #6651:**
```php
<?php

namespace YourCompany\Business\Client;

use GuzzleHttp\ClientInterface;
use Psr\Cache\CacheItemPoolInterface;
use Psr\Log\LoggerInterface;

class CachedApiClient
{
    private const CACHE_TTL_SECONDS = 60;
    private const CACHE_KEY_PREFIX = 'api_response';

    /**
     * @var ClientInterface
     */
    private $httpClient;

    /**
     * @var CacheItemPoolInterface
     */
    private $cache;

    /**
     * @var LoggerInterface
     */
    private $logger;

    public function __construct(
        ClientInterface $httpClient,
        CacheItemPoolInterface $cache,
        LoggerInterface $logger
    ) {
        $this->httpClient = $httpClient;
        $this->cache = $cache;
        $this->logger = $logger;
    }

    /**
     * Get data with caching
     *
     * @param string $uri Request URI
     * @param array $query Query parameters
     * @param int $ttl Cache TTL in seconds
     * @return array Response data
     * @throws \Throwable
     */
    public function getCached(string $uri, array $query = [], int $ttl = self::CACHE_TTL_SECONDS): array
    {
        $cacheKey = $this->generateCacheKey($uri, $query);

        try {
            // Check cache
            $cachedItem = $this->cache->getItem($cacheKey);
            if ($cachedItem->isHit()) {
                $this->logger->info('Cache HIT', [
                    'uri' => $uri,
                    'cache_key' => $cacheKey,
                ]);
                return $cachedItem->get();
            }

            // Fetch from API
            $this->logger->info('Cache MISS, fetching from API', [
                'uri' => $uri,
                'cache_key' => $cacheKey,
            ]);

            $response = $this->httpClient->request('GET', $uri, [
                'query' => $query,
            ]);

            $data = ResponseParser::json($response);

            // Store in cache
            $cachedItem->set($data)->expiresAfter($ttl);
            $this->cache->save($cachedItem);

            $this->logger->info('Response cached', [
                'uri' => $uri,
                'cache_key' => $cacheKey,
                'ttl' => $ttl,
            ]);

            return $data;
        } catch (\Psr\Cache\InvalidArgumentException $e) {
            $this->logger->warning('Invalid cache key, falling back to API only', [
                'cache_key' => $cacheKey,
                'exception' => $e->getMessage(),
            ]);

            // Fallback to API without caching
            $response = $this->httpClient->request('GET', $uri, [
                'query' => $query,
            ]);

            return ResponseParser::json($response);
        }
    }

    /**
     * Invalidate cache for URI
     *
     * @param string $uri Request URI
     * @param array $query Query parameters
     * @return void
     */
    public function invalidateCache(string $uri, array $query = []): void
    {
        $cacheKey = $this->generateCacheKey($uri, $query);

        try {
            $this->cache->deleteItem($cacheKey);

            $this->logger->info('Cache invalidated', [
                'uri' => $uri,
                'cache_key' => $cacheKey,
            ]);
        } catch (\Psr\Cache\InvalidArgumentException $e) {
            $this->logger->warning('Failed to invalidate cache', [
                'cache_key' => $cacheKey,
                'exception' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Generate cache key from URI and query
     *
     * @param string $uri Request URI
     * @param array $query Query parameters
     * @return string Cache key
     */
    private function generateCacheKey(string $uri, array $query): string
    {
        $queryString = http_build_query($query);
        $key = sprintf('%s:%s:%s', self::CACHE_KEY_PREFIX, $uri, $queryString);

        // PSR-6 cache keys must be alphanumeric + underscore + dot
        $key = preg_replace('/[^a-zA-Z0-9_\.]/', '_', $key);

        return $key;
    }
}
```

**Guidelines:**
- Use PSR-6 CacheItemPoolInterface
- Generate cache keys from URI + query params
- Sanitize cache keys (PSR-6 constraints)
- Log cache hits and misses
- Handle cache exceptions gracefully
- Fall back to API on cache errors
- Provide cache invalidation methods
- Configure TTL per request type

---

## Implementation Guidelines

### Service Registration in Symfony

**Configuration Pattern:**
```yaml
# services.yml
services:
    # HTTP Client Factory
    yourcompany.business.client.http_client_factory:
        class: YourCompany\Business\Client\HttpClientFactory
        arguments:
            - '@logger'

    # Box SKU Configuration Service
    yourcompany.business.box_sku.config_retriever:
        class: YourCompany\Business\BoxSku\BoxSkuConfigRetriever
        arguments:
            - '@yourcompany.business.client.rcs'
            - '@cache.app'
            - '@logger'

    # RCS HTTP Client
    yourcompany.business.client.rcs:
        class: GuzzleHttp\Client
        factory: ['@yourcompany.business.client.http_client_factory', 'create']
        arguments:
            - '%env(RCS_HOST)%'
            - 5
            - []

    # Delivery Service Client
    yourcompany.business.client.delivery_service:
        class: YourCompany\Business\Client\DeliveryService\DeliveryServiceClient
        arguments:
            - '@yourcompany.business.client.delivery_service_http'
            - '@logger'

    # Delivery Service HTTP Client
    yourcompany.business.client.delivery_service_http:
        class: GuzzleHttp\Client
        factory: ['@yourcompany.business.client.http_client_factory', 'create']
        arguments:
            - '%env(DELIVERY_SERVICE_HOST)%'
            - 10
            - { 'Authorization': 'Bearer %env(DELIVERY_SERVICE_TOKEN)%' }
```

### Testing HTTP Clients

**Unit Test with Mocked Client:**
```php
<?php

namespace Tests\Unit\Client;

use GuzzleHttp\ClientInterface;
use GuzzleHttp\Psr7\Response;
use YourCompany\Business\Client\DeliveryService\DeliveryServiceClient;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;

class DeliveryServiceClientTest extends TestCase
{
    private $httpClient;
    private $logger;
    private $client;

    protected function setUp(): void
    {
        $this->httpClient = $this->createMock(ClientInterface::class);
        $this->logger = $this->createMock(LoggerInterface::class);

        $this->client = new DeliveryServiceClient(
            $this->httpClient,
            $this->logger
        );
    }

    public function testGetDeliveryWindows(): void
    {
        $responseData = [
            'windows' => [
                ['date' => '2024-01-15', 'slots' => ['morning', 'evening']],
                ['date' => '2024-01-16', 'slots' => ['morning']],
            ],
        ];

        $this->httpClient
            ->expects($this->once())
            ->method('request')
            ->with(
                'GET',
                '/v1/delivery-windows',
                $this->callback(function ($options) {
                    return $options['query']['postcode'] === '12345'
                        && $options['query']['country'] === 'US'
                        && $options['query']['product_family'] === 'classic';
                })
            )
            ->willReturn(new Response(200, [], json_encode($responseData)));

        $windows = $this->client->getDeliveryWindows('12345', 'US', 'classic');

        $this->assertCount(2, $windows);
        $this->assertEquals('2024-01-15', $windows[0]['date']);
    }

    public function testCreateBookingThrowsExceptionOnError(): void
    {
        $this->expectException(\GuzzleHttp\Exception\ClientException::class);

        $this->httpClient
            ->expects($this->once())
            ->method('request')
            ->willThrowException(
                new \GuzzleHttp\Exception\ClientException(
                    'Bad Request',
                    new \GuzzleHttp\Psr7\Request('POST', '/v1/bookings'),
                    new Response(400, [], '{"error": "Invalid data"}')
                )
            );

        $this->client->createBooking([]);
    }
}
```

**Integration Test with Real HTTP:**
```php
<?php

namespace Tests\Integration\Client;

use YourCompany\Business\Client\DeliveryService\DeliveryServiceClient;
use Tests\Integration\IntegrationTestCase;

class DeliveryServiceClientIntegrationTest extends IntegrationTestCase
{
    public function testGetDeliveryWindowsFromRealService(): void
    {
        if (!$this->isIntegrationTestEnabled()) {
            $this->markTestSkipped('Integration tests disabled');
        }

        $client = $this->getContainer()->get(DeliveryServiceClient::class);

        $windows = $client->getDeliveryWindows('12345', 'US', 'classic');

        $this->assertIsArray($windows);
        $this->assertNotEmpty($windows);
        $this->assertArrayHasKey('date', $windows[0]);
        $this->assertArrayHasKey('slots', $windows[0]);
    }
}
```

---

## Anti-Patterns to Avoid

### ❌ Not Using Timeout

**Bad:**
```php
$client = new Client([
    'base_uri' => 'https://api.example.com',
    // No timeout - can hang forever!
]);
```

**Good:**
```php
$client = new Client([
    'base_uri' => 'https://api.example.com',
    'timeout' => 5,
    'connect_timeout' => 2,
]);
```

### ❌ Not Handling Exceptions

**Bad:**
```php
public function getConfig(): array
{
    // No exception handling - bubbles up as Guzzle exception
    $response = $this->httpClient->request('GET', '/config');
    return ResponseParser::json($response);
}
```

**Good:**
```php
public function getConfig(): array
{
    try {
        $response = $this->httpClient->request('GET', '/config');
        return ResponseParser::json($response);
    } catch (GuzzleException $e) {
        $this->logger->error('Failed to fetch config', [
            'exception' => $e->getMessage(),
        ]);
        throw new ExternalServiceException('Config fetch failed', 0, $e);
    }
}
```

### ❌ Not Logging Requests

**Bad:**
```php
public function getData(): array
{
    // No logging - hard to debug
    $response = $this->httpClient->request('GET', '/data');
    return ResponseParser::json($response);
}
```

**Good:**
```php
public function getData(): array
{
    $this->logger->info('Fetching data from external API');

    try {
        $response = $this->httpClient->request('GET', '/data');
        $data = ResponseParser::json($response);

        $this->logger->info('Data fetched successfully', [
            'count' => count($data),
        ]);

        return $data;
    } catch (GuzzleException $e) {
        $this->logger->error('Failed to fetch data', [
            'exception' => $e->getMessage(),
        ]);
        throw $e;
    }
}
```

### ❌ Caching Without TTL

**Bad:**
```php
$cachedItem->set($data);
$this->cache->save($cachedItem);
// No expiration - cached forever!
```

**Good:**
```php
$cachedItem->set($data)->expiresAfter(60);
$this->cache->save($cachedItem);
```

---

## Related Implementers

- **error-handling-validation.md** - Exception handling patterns
- **dependency-injection-symfony.md** - Service configuration
- **testing-phpunit.md** - Testing HTTP clients
- **caching-strategies.md** - Advanced caching patterns
- **metrics-monitoring.md** - Request observability
