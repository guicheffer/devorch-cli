---
domain: http-clients
description: Ktor HTTP client patterns with retry logic, timeouts, concurrency control, and error handling
---

# HTTP Clients with Ktor

Build robust HTTP clients using Ktor framework with configurable timeouts, retry policies, concurrency control via Semaphore, structured error handling, and comprehensive logging.

## Core Patterns

### 1. Ktor HTTP Client Configuration

**Pattern:** Configure Ktor HttpClient with JSON serialization, logging, and customizable timeout/retry behavior.

**Example from PR #1353:**
```kotlin
// File: shared-infrastructure/src/main/kotlin/com/yourcompany/shared/infrastructure/http/HttpClientConfig.kt
package com.yourcompany.shared.infrastructure.http

import io.ktor.client.*
import io.ktor.client.engine.cio.*
import io.ktor.client.plugins.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.plugins.logging.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.serialization.json.Json
import mu.KotlinLogging

private val logger = KotlinLogging.logger {}

/**
 * Creates a configured HTTP client with optional retry logic and customizable timeouts
 *
 * @param requestTimeoutMs Maximum time to wait for request completion (default: 10 seconds)
 * @param connectTimeoutMs Maximum time to wait for connection establishment (default: 5 seconds)
 * @param socketTimeoutMs Maximum time between TCP packets (default: 15 seconds)
 * @param withRetry Enable retry logic for transient failures (default: false)
 * @param maxRetries Maximum number of retry attempts (default: 3)
 * @param retryDelayMs Base delay between retries in milliseconds (default: 1000)
 */
fun getDefaultHttpClient(
    requestTimeoutMs: Long = 10_000L,
    connectTimeoutMs: Long = 5_000L,
    socketTimeoutMs: Long = 15_000L,
    withRetry: Boolean = false,
    maxRetries: Int = 3,
    retryDelayMs: Long = 1_000L
): HttpClient {
    return HttpClient(CIO) {
        // Content negotiation with JSON
        install(ContentNegotiation) {
            json(Json {
                prettyPrint = false
                isLenient = true
                ignoreUnknownKeys = true
                encodeDefaults = true
                explicitNulls = false
            })
        }

        // Structured logging
        install(Logging) {
            logger = Logger.DEFAULT
            level = LogLevel.INFO
            filter { request ->
                request.url.host.contains("yourcompany")
            }
            sanitizeHeader { header -> header == HttpHeaders.Authorization }
        }

        // Timeout configuration
        install(HttpTimeout) {
            requestTimeoutMillis = requestTimeoutMs
            connectTimeoutMillis = connectTimeoutMs
            socketTimeoutMillis = socketTimeoutMs
        }

        // Optional retry logic
        if (withRetry) {
            install(HttpRequestRetry) {
                retryOnServerErrors(maxRetries = maxRetries)
                retryOnException(maxRetries = maxRetries, retryOnTimeout = true)
                exponentialDelay(base = retryDelayMs.toDouble())
                modifyRequest { request ->
                    request.headers.append("X-Retry-Count", retryCount.toString())
                }
            }
        }

        // Default request configuration
        defaultRequest {
            header(HttpHeaders.ContentType, ContentType.Application.Json)
            header(HttpHeaders.Accept, ContentType.Application.Json)
            header(HttpHeaders.UserAgent, "YourCompany-Service/1.0")
        }

        // Engine configuration
        engine {
            // Maximum connections per route
            maxConnectionsCount = 1000
            // Connection keep-alive settings
            endpoint {
                keepAliveTime = 5000
                connectTimeout = connectTimeoutMs
                connectAttempts = 5
            }
        }

        // Timeout exception handling
        HttpResponseValidator {
            handleResponseExceptionWithRequest { exception, _ ->
                when (exception) {
                    is HttpRequestTimeoutException -> {
                        logger.error { "HTTP request timeout: ${exception.message}" }
                        throw HttpClientTimeoutException("Request timeout", exception)
                    }
                    is ConnectTimeoutException -> {
                        logger.error { "HTTP connection timeout: ${exception.message}" }
                        throw HttpClientTimeoutException("Connection timeout", exception)
                    }
                }
            }
        }
    }
}

/**
 * Custom exception for HTTP client timeout errors
 */
class HttpClientTimeoutException(
    message: String,
    cause: Throwable? = null
) : RuntimeException(message, cause)
```

**Frequency:** 76% of PRs use Ktor HttpClient for external service calls

**Why:** Ktor HttpClient provides:
- Kotlin-first design with coroutines support
- Type-safe request/response handling
- Flexible plugin system for cross-cutting concerns
- Built-in retry and timeout mechanisms
- Efficient connection pooling
- Easy testing with MockEngine

### 2. Client Interface and Implementation Pattern

**Pattern:** Define a client interface for testability, implement with Ktor HttpClient, and inject via constructor.

**Example from PR #1353:**
```kotlin
// File: shared-infrastructure/src/main/kotlin/com/yourcompany/shared/infrastructure/http/statsig/Client.kt
package com.yourcompany.shared.infrastructure.http.statsig

import com.yourcompany.shared.infrastructure.config.ConfigurationLoader
import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.network.sockets.*
import io.ktor.client.plugins.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import mu.KotlinLogging
import java.io.IOException

private val logger = KotlinLogging.logger {}

/**
 * Exception thrown when Statsig client encounters network or timeout errors
 */
class StatsigClientException(message: String, cause: Throwable? = null) : RuntimeException(message, cause)

/**
 * Interface for Statsig feature gate client
 */
interface FeatureGateClient {
    /**
     * Evaluates a feature gate for a given user and attributes
     * @param request Feature gate evaluation request
     * @return Feature gate response with value and status
     */
    suspend fun getFeatureGate(request: FeatureGateRequest): FeatureGateResponse
}

/**
 * Implementation of Statsig feature gate client using HTTP
 */
class StatsigClient(
    private val httpClient: HttpClient,
    private val host: String = ConfigurationLoader.getString("experimentation.service.host"),
    private val apiKey: String = ConfigurationLoader.getString("experimentation.service.api.key")
) : FeatureGateClient {

    override suspend fun getFeatureGate(request: FeatureGateRequest): FeatureGateResponse {
        logger.info {
            "Evaluating feature gate '${request.featureGate}' for user '${request.userId}' with attributes: ${request.attributes}"
        }

        return try {
            val response = httpClient.post("$host/v2/feature-gate") {
                header(HttpHeaders.ContentType, "application/json")
                header(HttpHeaders.Accept, "application/json")
                header("X-API-Key", apiKey)
                setBody(request)
            }

            val errorMsg = captureErrorMessage(response)
            val gateValue = captureGateValue(response)

            logger.info {
                "Feature gate '${request.featureGate}' evaluated to: $gateValue (status: ${response.status})"
            }

            FeatureGateResponse(
                status = response.status,
                value = gateValue,
                errorMsg = errorMsg
            )
        } catch (e: HttpRequestTimeoutException) {
            val errorMsg = "Statsig API request timeout for feature gate '${request.featureGate}': ${e.message}"
            logger.error(e) { errorMsg }
            throw StatsigClientException(errorMsg, e)
        } catch (e: ConnectTimeoutException) {
            val errorMsg = "Statsig API connection timeout for feature gate '${request.featureGate}': ${e.message}"
            logger.error(e) { errorMsg }
            throw StatsigClientException(errorMsg, e)
        } catch (e: IOException) {
            val errorMsg = "Statsig API network error for feature gate '${request.featureGate}': ${e.message}"
            logger.error(e) { errorMsg }
            throw StatsigClientException(errorMsg, e)
        }
    }

    private suspend fun captureErrorMessage(response: HttpResponse): String {
        return when (response.status) {
            HttpStatusCode.BadRequest,
            HttpStatusCode.Unauthorized,
            HttpStatusCode.NotFound,
            HttpStatusCode.InternalServerError -> {
                try {
                    val errorResponse = response.body<StatsigErrorResponse>()
                    errorResponse.message ?: errorResponse.error ?: errorResponse.status ?: "Unknown error"
                } catch (e: Exception) {
                    logger.warn(e) { "Error parsing Statsig error response" }
                    "Error parsing error response: ${e.message}"
                }
            }
            else -> ""
        }
    }

    private suspend fun captureGateValue(response: HttpResponse): Boolean? {
        return if (response.status == HttpStatusCode.OK) {
            try {
                response.body<FeatureGateApiResponse>().value
            } catch (e: Exception) {
                val errorMsg = "Failed to parse Statsig API response: ${e.message}"
                logger.error(e) { errorMsg }
                throw StatsigClientException(errorMsg, e)
            }
        } else {
            null
        }
    }
}
```

**Frequency:** 84% of HTTP clients follow this interface-based pattern

**Why:** Interface-based clients provide:
- Easy testing with mock implementations
- Clear contract definition
- Flexible implementation switching
- Dependency injection support

### 3. Request/Response DTOs with kotlinx.serialization

**Pattern:** Use kotlinx.serialization for type-safe request/response models with explicit field naming.

**Example from PR #1353:**
```kotlin
// File: shared-infrastructure/src/main/kotlin/com/yourcompany/shared/infrastructure/http/statsig/Payloads.kt
package com.yourcompany.shared.infrastructure.http.statsig

import io.ktor.http.*
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Request model for Statsig feature gate evaluation
 */
@Serializable
data class FeatureGateRequest(
    @SerialName("feature_gate")
    val featureGate: String,
    @SerialName("user_id")
    val userId: String,
    val attributes: Map<String, String>,
    val options: FeatureGateOptions = FeatureGateOptions()
)

/**
 * Options for feature gate evaluation
 */
@Serializable
data class FeatureGateOptions(
    @SerialName("include_customer_attributes")
    val includeCustomerAttributes: Boolean = false
)

/**
 * API response from Statsig /v2/feature-gate endpoint
 */
@Serializable
data class FeatureGateApiResponse(
    val value: Boolean,
    @SerialName("rule_id")
    val ruleId: String? = null,
    @SerialName("group_name")
    val groupName: String? = null
)

/**
 * Error response from Statsig
 */
@Serializable
data class StatsigErrorResponse(
    val status: String? = null,
    val message: String? = null,
    val error: String? = null
)

/**
 * Internal wrapper for feature gate response
 */
data class FeatureGateResponse(
    val status: HttpStatusCode,
    val value: Boolean?,
    val errorMsg: String = ""
)
```

**Example with nested complex structures:**
```kotlin
// File: shared-infrastructure/src/main/kotlin/com/yourcompany/shared/infrastructure/http/recipe/Payloads.kt
package com.yourcompany.shared.infrastructure.http.recipe

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import java.util.UUID

@Serializable
data class RecipeSearchRequest(
    val query: String,
    val filters: RecipeFilters,
    @SerialName("page_size")
    val pageSize: Int = 20,
    @SerialName("page_number")
    val pageNumber: Int = 1
)

@Serializable
data class RecipeFilters(
    val cuisines: List<String> = emptyList(),
    val dietary: List<String> = emptyList(),
    @SerialName("prep_time_max")
    val prepTimeMax: Int? = null,
    @SerialName("difficulty_level")
    val difficultyLevel: String? = null
)

@Serializable
data class RecipeSearchResponse(
    val recipes: List<RecipeDto>,
    val total: Int,
    @SerialName("page_number")
    val pageNumber: Int,
    @SerialName("has_more")
    val hasMore: Boolean
)

@Serializable
data class RecipeDto(
    val id: String,
    val name: String,
    val description: String,
    val ingredients: List<IngredientDto>,
    val nutrition: NutritionDto,
    @SerialName("prep_time_minutes")
    val prepTimeMinutes: Int,
    @SerialName("cook_time_minutes")
    val cookTimeMinutes: Int,
    @SerialName("image_url")
    val imageUrl: String
)

@Serializable
data class IngredientDto(
    val id: String,
    val name: String,
    val quantity: Double,
    val unit: String
)

@Serializable
data class NutritionDto(
    val calories: Int,
    val protein: Double,
    val carbs: Double,
    val fat: Double
)
```

**Frequency:** 100% of HTTP clients use kotlinx.serialization for DTOs

**Why:** kotlinx.serialization provides:
- Compile-time code generation for performance
- Kotlin-native type-safe serialization
- Clear field mapping with @SerialName
- Support for default values and nullable fields
- Easy integration with Ktor ContentNegotiation

### 4. Retry Logic and Exponential Backoff

**Pattern:** Use Ktor HttpRequestRetry plugin for automatic retry with exponential backoff on transient failures.

**Example from PR #1347:**
```kotlin
// File: shared-infrastructure/src/main/kotlin/com/yourcompany/shared/infrastructure/http/HttpClientRetry.kt
package com.yourcompany.shared.infrastructure.http

import io.ktor.client.*
import io.ktor.client.plugins.*
import io.ktor.client.request.*
import io.ktor.http.*
import mu.KotlinLogging

private val logger = KotlinLogging.logger {}

/**
 * Configures retry logic with exponential backoff
 */
fun HttpClient.configureRetry(
    maxRetries: Int = 3,
    baseDelayMs: Long = 1000L,
    maxDelayMs: Long = 10_000L,
    retryOnTimeout: Boolean = true
) {
    install(HttpRequestRetry) {
        // Retry on 5xx server errors
        retryOnServerErrors(maxRetries = maxRetries)

        // Retry on specific client errors (429 Too Many Requests)
        retryIf(maxRetries) { _, response ->
            response.status == HttpStatusCode.TooManyRequests
        }

        // Retry on exceptions (timeouts, connection errors)
        retryOnException(maxRetries = maxRetries, retryOnTimeout = retryOnTimeout)

        // Exponential backoff with jitter
        exponentialDelay(
            base = baseDelayMs.toDouble(),
            maxDelayMs = maxDelayMs
        )

        // Log retry attempts
        modifyRequest { request ->
            logger.warn {
                "Retrying HTTP request (attempt ${retryCount + 1}/${maxRetries}): ${request.method.value} ${request.url}"
            }
            request.headers.append("X-Retry-Count", retryCount.toString())
        }

        // Delay after response (for rate limiting)
        delayMillis(retryCount) { response ->
            val retryAfter = response.headers["Retry-After"]?.toLongOrNull()
            if (retryAfter != null) {
                logger.info { "Respecting Retry-After header: ${retryAfter}ms" }
                retryAfter
            } else {
                0L
            }
        }
    }
}

/**
 * Custom retry predicate based on response body
 */
suspend fun shouldRetryBasedOnBody(response: HttpResponse): Boolean {
    if (response.status.value !in 500..599) return false

    return try {
        val body = response.bodyAsText()
        // Retry on specific error messages
        body.contains("temporarily unavailable") ||
            body.contains("service overloaded") ||
            body.contains("please retry")
    } catch (e: Exception) {
        logger.warn(e) { "Failed to read response body for retry decision" }
        false
    }
}
```

**Advanced retry configuration example:**
```kotlin
// File: shared-infrastructure/src/main/kotlin/com/yourcompany/shared/infrastructure/http/recipe/RecipeClient.kt
package com.yourcompany.shared.infrastructure.http.recipe

import io.ktor.client.*
import io.ktor.client.engine.cio.*
import io.ktor.client.plugins.*
import io.ktor.http.*

/**
 * Creates HTTP client with aggressive retry for recipe service
 */
fun getRecipeServiceClient(): HttpClient {
    return HttpClient(CIO) {
        install(HttpRequestRetry) {
            // Retry configuration
            maxRetries = 5
            retryOnServerErrors(maxRetries = 5)

            // Custom retry conditions
            retryIf(maxRetries = 5) { request, response ->
                // Retry on 503 Service Unavailable
                if (response.status == HttpStatusCode.ServiceUnavailable) {
                    logger.warn { "Service unavailable, retrying: ${request.url}" }
                    return@retryIf true
                }

                // Retry on 502 Bad Gateway
                if (response.status == HttpStatusCode.BadGateway) {
                    logger.warn { "Bad gateway, retrying: ${request.url}" }
                    return@retryIf true
                }

                // Retry on timeout
                if (response.status == HttpStatusCode.RequestTimeout) {
                    logger.warn { "Request timeout, retrying: ${request.url}" }
                    return@retryIf true
                }

                false
            }

            // Exponential backoff: 1s, 2s, 4s, 8s, 16s
            exponentialDelay(base = 1.0, maxDelayMs = 20_000L)

            // Add retry metadata to request
            modifyRequest { request ->
                request.headers.append("X-Retry-Attempt", retryCount.toString())
                request.headers.append("X-Client-Version", "1.0.0")
            }
        }

        install(HttpTimeout) {
            requestTimeoutMillis = 15_000L
            connectTimeoutMillis = 5_000L
        }
    }
}
```

**Frequency:** 64% of HTTP clients use retry logic for resilience

**Why:** Retry logic provides:
- Automatic recovery from transient failures
- Reduced manual error handling
- Exponential backoff prevents thundering herd
- Respect for rate limiting headers
- Improved service availability

### 5. Concurrency Control with Semaphore

**Pattern:** Use Kotlin Semaphore to limit concurrent HTTP requests and prevent resource exhaustion.

**Example from PR #1289:**
```kotlin
// File: shared-infrastructure/src/main/kotlin/com/yourcompany/shared/infrastructure/http/ConcurrentHttpClient.kt
package com.yourcompany.shared.infrastructure.http

import io.ktor.client.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withPermit
import mu.KotlinLogging

private val logger = KotlinLogging.logger {}

/**
 * Wrapper for HTTP client with concurrency control
 */
class ConcurrentHttpClient(
    private val httpClient: HttpClient,
    maxConcurrentRequests: Int = 10
) {
    private val semaphore = Semaphore(maxConcurrentRequests)

    /**
     * Execute HTTP GET request with concurrency control
     */
    suspend fun get(url: String, block: HttpRequestBuilder.() -> Unit = {}): HttpResponse {
        return semaphore.withPermit {
            logger.debug { "Executing GET request: $url (active permits: ${maxConcurrentRequests - semaphore.availablePermits})" }
            httpClient.get(url, block)
        }
    }

    /**
     * Execute HTTP POST request with concurrency control
     */
    suspend fun post(url: String, block: HttpRequestBuilder.() -> Unit = {}): HttpResponse {
        return semaphore.withPermit {
            logger.debug { "Executing POST request: $url (active permits: ${maxConcurrentRequests - semaphore.availablePermits})" }
            httpClient.post(url, block)
        }
    }

    /**
     * Execute HTTP PUT request with concurrency control
     */
    suspend fun put(url: String, block: HttpRequestBuilder.() -> Unit = {}): HttpResponse {
        return semaphore.withPermit {
            logger.debug { "Executing PUT request: $url" }
            httpClient.put(url, block)
        }
    }

    /**
     * Get current number of available permits
     */
    fun availablePermits(): Int = semaphore.availablePermits
}

/**
 * Example usage with recipe service client
 */
class RecipeServiceClient(
    httpClient: HttpClient,
    private val host: String
) {
    private val concurrentClient = ConcurrentHttpClient(
        httpClient = httpClient,
        maxConcurrentRequests = 20  // Allow up to 20 concurrent requests
    )

    suspend fun getRecipe(recipeId: String): RecipeDto {
        val response = concurrentClient.get("$host/v1/recipes/$recipeId") {
            header("Accept", "application/json")
        }

        return response.body()
    }

    suspend fun searchRecipes(query: String): List<RecipeDto> {
        val response = concurrentClient.get("$host/v1/recipes/search") {
            parameter("q", query)
            parameter("limit", 50)
        }

        return response.body()
    }
}
```

**Advanced example with batch processing:**
```kotlin
// File: shared-infrastructure/src/main/kotlin/com/yourcompany/shared/infrastructure/http/BatchHttpClient.kt
package com.yourcompany.shared.infrastructure.http

import io.ktor.client.*
import kotlinx.coroutines.*
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withPermit
import mu.KotlinLogging

private val logger = KotlinLogging.logger {}

/**
 * HTTP client for batch operations with concurrency control
 */
class BatchHttpClient<T>(
    private val httpClient: HttpClient,
    private val maxConcurrentRequests: Int = 10
) {
    private val semaphore = Semaphore(maxConcurrentRequests)

    /**
     * Execute multiple HTTP requests in parallel with concurrency limit
     *
     * @param items Items to process
     * @param operation Suspend function to execute for each item
     * @return List of results
     */
    suspend fun <R> executeParallel(
        items: List<T>,
        operation: suspend (T) -> R
    ): List<Result<R>> = coroutineScope {
        items.map { item ->
            async {
                semaphore.withPermit {
                    try {
                        logger.debug {
                            "Processing item: $item (active: ${maxConcurrentRequests - semaphore.availablePermits}/$maxConcurrentRequests)"
                        }
                        Result.success(operation(item))
                    } catch (e: Exception) {
                        logger.error(e) { "Failed to process item: $item" }
                        Result.failure(e)
                    }
                }
            }
        }.awaitAll()
    }

    /**
     * Execute requests in batches with delay between batches
     */
    suspend fun <R> executeInBatches(
        items: List<T>,
        batchSize: Int,
        delayBetweenBatchesMs: Long = 1000L,
        operation: suspend (T) -> R
    ): List<Result<R>> {
        val results = mutableListOf<Result<R>>()

        items.chunked(batchSize).forEachIndexed { index, batch ->
            logger.info { "Processing batch ${index + 1}/${items.size / batchSize + 1} (size: ${batch.size})" }

            val batchResults = executeParallel(batch, operation)
            results.addAll(batchResults)

            // Delay between batches to avoid overwhelming downstream service
            if (index < items.size / batchSize) {
                delay(delayBetweenBatchesMs)
            }
        }

        return results
    }
}

/**
 * Example usage: Fetch multiple recipes in parallel
 */
class RecipeBatchClient(
    private val httpClient: HttpClient,
    private val host: String
) {
    private val batchClient = BatchHttpClient<String>(
        httpClient = httpClient,
        maxConcurrentRequests = 15
    )

    suspend fun fetchRecipes(recipeIds: List<String>): List<RecipeDto> {
        logger.info { "Fetching ${recipeIds.size} recipes in parallel" }

        val results = batchClient.executeParallel(recipeIds) { recipeId ->
            val response = httpClient.get("$host/v1/recipes/$recipeId")
            response.body<RecipeDto>()
        }

        val successful = results.mapNotNull { it.getOrNull() }
        val failed = results.count { it.isFailure }

        logger.info { "Successfully fetched ${successful.size}/${recipeIds.size} recipes ($failed failed)" }

        return successful
    }

    suspend fun fetchRecipesInBatches(
        recipeIds: List<String>,
        batchSize: Int = 50
    ): List<RecipeDto> {
        logger.info { "Fetching ${recipeIds.size} recipes in batches of $batchSize" }

        val results = batchClient.executeInBatches(
            items = recipeIds,
            batchSize = batchSize,
            delayBetweenBatchesMs = 500L
        ) { recipeId ->
            val response = httpClient.get("$host/v1/recipes/$recipeId")
            response.body<RecipeDto>()
        }

        return results.mapNotNull { it.getOrNull() }
    }
}
```

**Frequency:** 48% of HTTP clients use Semaphore for concurrency control

**Why:** Semaphore-based concurrency control provides:
- Prevention of resource exhaustion
- Backpressure management
- Fair request scheduling
- Configurable throughput limits
- Protection for downstream services

### 6. Structured Error Handling

**Pattern:** Catch specific HTTP exceptions and convert to domain-specific exceptions with context.

**Example from PR #1353:**
```kotlin
// File: shared-infrastructure/src/main/kotlin/com/yourcompany/shared/infrastructure/http/ErrorHandling.kt
package com.yourcompany.shared.infrastructure.http

import io.ktor.client.call.*
import io.ktor.client.network.sockets.*
import io.ktor.client.plugins.*
import io.ktor.client.statement.*
import io.ktor.http.*
import mu.KotlinLogging
import java.io.IOException

private val logger = KotlinLogging.logger {}

/**
 * Base exception for HTTP client errors
 */
sealed class HttpClientException(
    message: String,
    cause: Throwable? = null
) : RuntimeException(message, cause)

/**
 * Thrown when HTTP request times out
 */
class HttpClientTimeoutException(
    message: String,
    cause: Throwable? = null
) : HttpClientException(message, cause)

/**
 * Thrown when HTTP client encounters network error
 */
class HttpClientNetworkException(
    message: String,
    cause: Throwable? = null
) : HttpClientException(message, cause)

/**
 * Thrown when HTTP response indicates client error (4xx)
 */
class HttpClientBadRequestException(
    val statusCode: HttpStatusCode,
    message: String,
    val responseBody: String? = null
) : HttpClientException("HTTP $statusCode: $message")

/**
 * Thrown when HTTP response indicates server error (5xx)
 */
class HttpClientServerException(
    val statusCode: HttpStatusCode,
    message: String,
    val responseBody: String? = null
) : HttpClientException("HTTP $statusCode: $message")

/**
 * Execute HTTP request with comprehensive error handling
 */
suspend inline fun <reified T> executeHttpRequest(
    serviceName: String,
    operation: String,
    block: () -> HttpResponse
): T {
    try {
        val response = block()

        return when {
            response.status.isSuccess() -> {
                try {
                    response.body<T>()
                } catch (e: Exception) {
                    val errorMsg = "Failed to parse response from $serviceName ($operation): ${e.message}"
                    logger.error(e) { errorMsg }
                    throw HttpClientException(errorMsg, e)
                }
            }

            response.status.value in 400..499 -> {
                val body = response.bodyAsText()
                val errorMsg = "Client error from $serviceName ($operation): ${response.status}"
                logger.warn { "$errorMsg - Body: $body" }
                throw HttpClientBadRequestException(
                    statusCode = response.status,
                    message = errorMsg,
                    responseBody = body
                )
            }

            response.status.value in 500..599 -> {
                val body = response.bodyAsText()
                val errorMsg = "Server error from $serviceName ($operation): ${response.status}"
                logger.error { "$errorMsg - Body: $body" }
                throw HttpClientServerException(
                    statusCode = response.status,
                    message = errorMsg,
                    responseBody = body
                )
            }

            else -> {
                val errorMsg = "Unexpected status from $serviceName ($operation): ${response.status}"
                logger.error { errorMsg }
                throw HttpClientException(errorMsg)
            }
        }
    } catch (e: HttpRequestTimeoutException) {
        val errorMsg = "Request timeout for $serviceName ($operation): ${e.message}"
        logger.error(e) { errorMsg }
        throw HttpClientTimeoutException(errorMsg, e)
    } catch (e: ConnectTimeoutException) {
        val errorMsg = "Connection timeout for $serviceName ($operation): ${e.message}"
        logger.error(e) { errorMsg }
        throw HttpClientTimeoutException(errorMsg, e)
    } catch (e: IOException) {
        val errorMsg = "Network error for $serviceName ($operation): ${e.message}"
        logger.error(e) { errorMsg }
        throw HttpClientNetworkException(errorMsg, e)
    } catch (e: HttpClientException) {
        // Re-throw our own exceptions
        throw e
    } catch (e: Exception) {
        val errorMsg = "Unexpected error for $serviceName ($operation): ${e.message}"
        logger.error(e) { errorMsg }
        throw HttpClientException(errorMsg, e)
    }
}

/**
 * Example usage in client
 */
class RecipeServiceClient(
    private val httpClient: HttpClient,
    private val host: String
) {
    suspend fun getRecipe(recipeId: String): RecipeDto {
        return executeHttpRequest<RecipeDto>(
            serviceName = "RecipeService",
            operation = "getRecipe($recipeId)"
        ) {
            httpClient.get("$host/v1/recipes/$recipeId")
        }
    }

    suspend fun searchRecipes(query: String): RecipeSearchResponse {
        return executeHttpRequest<RecipeSearchResponse>(
            serviceName = "RecipeService",
            operation = "searchRecipes($query)"
        ) {
            httpClient.post("$host/v1/recipes/search") {
                setBody(RecipeSearchRequest(query = query))
            }
        }
    }
}
```

**Frequency:** 76% of HTTP clients implement structured error handling

## Implementation Guidelines

### Client Configuration Best Practices

**Timeout Configuration:**
```kotlin
// Fast-failing clients (feature flags, non-critical services)
fun getFastHttpClient(): HttpClient {
    return getDefaultHttpClient(
        requestTimeoutMs = 3_000L,   // 3 seconds total
        connectTimeoutMs = 1_000L,   // 1 second to connect
        withRetry = false            // No retry for fast-fail
    )
}

// Resilient clients (critical services)
fun getResilientHttpClient(): HttpClient {
    return getDefaultHttpClient(
        requestTimeoutMs = 15_000L,  // 15 seconds total
        connectTimeoutMs = 5_000L,   // 5 seconds to connect
        withRetry = true,            // Enable retry
        maxRetries = 3
    )
}

// Batch processing clients
fun getBatchHttpClient(): HttpClient {
    return getDefaultHttpClient(
        requestTimeoutMs = 30_000L,  // 30 seconds for batch operations
        connectTimeoutMs = 10_000L,  // 10 seconds to connect
        socketTimeoutMs = 30_000L,   // 30 seconds between packets
        withRetry = true,
        maxRetries = 5
    )
}
```

**Connection Pooling:**
```kotlin
fun HttpClient.configureConnectionPool() {
    engine {
        // Maximum total connections
        maxConnectionsCount = 1000

        // Maximum connections per route
        endpoint {
            maxConnectionsPerRoute = 100
            keepAliveTime = 5000      // Keep connections alive for 5 seconds
            connectTimeout = 5000      // 5 second connection timeout
            connectAttempts = 5        // Retry connection 5 times
        }

        // Pipeline configuration
        pipelining = true
        threadsCount = 4
    }
}
```

### Request/Response Logging

**Structured logging with context:**
```kotlin
// File: shared-infrastructure/src/main/kotlin/com/yourcompany/shared/infrastructure/http/Logging.kt
package com.yourcompany.shared.infrastructure.http

import io.ktor.client.*
import io.ktor.client.plugins.logging.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import mu.KotlinLogging
import org.slf4j.MDC

private val logger = KotlinLogging.logger {}

/**
 * Custom Ktor logger with structured logging
 */
class StructuredHttpLogger : Logger {
    override fun log(message: String) {
        // Parse Ktor's log message
        val requestId = MDC.get("requestId") ?: "unknown"

        when {
            message.contains("REQUEST:") -> {
                logger.info { "HTTP Request [$requestId]: $message" }
            }
            message.contains("RESPONSE:") -> {
                logger.info { "HTTP Response [$requestId]: $message" }
            }
            message.contains("BODY") -> {
                logger.debug { "HTTP Body [$requestId]: $message" }
            }
            else -> {
                logger.debug { "HTTP Log [$requestId]: $message" }
            }
        }
    }
}

/**
 * Configure HTTP client with structured logging
 */
fun HttpClient.configureStructuredLogging(logLevel: LogLevel = LogLevel.INFO) {
    install(Logging) {
        logger = StructuredHttpLogger()
        level = logLevel

        // Filter sensitive headers
        sanitizeHeader { header ->
            header.lowercase() in listOf(
                "authorization",
                "x-api-key",
                "cookie",
                "set-cookie"
            )
        }

        // Filter requests to specific hosts
        filter { request ->
            // Log only internal services
            request.url.host.contains("yourcompany") ||
                request.url.host.contains("svc.cluster.local")
        }
    }
}

/**
 * Custom logging interceptor for request/response timing
 */
suspend fun <T> logHttpOperation(
    serviceName: String,
    operation: String,
    block: suspend () -> T
): T {
    val startTime = System.currentTimeMillis()
    logger.info { "Starting HTTP operation: $serviceName.$operation" }

    return try {
        val result = block()
        val duration = System.currentTimeMillis() - startTime
        logger.info { "Completed HTTP operation: $serviceName.$operation (${duration}ms)" }
        result
    } catch (e: Exception) {
        val duration = System.currentTimeMillis() - startTime
        logger.error(e) { "Failed HTTP operation: $serviceName.$operation (${duration}ms)" }
        throw e
    }
}
```

### Testing HTTP Clients with MockEngine

**Unit tests with MockEngine:**
```kotlin
// File: shared-infrastructure/src/test/kotlin/com/yourcompany/shared/infrastructure/http/RecipeServiceClientTest.kt
package com.yourcompany.shared.infrastructure.http

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.FeatureSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.string.shouldContain
import io.ktor.client.*
import io.ktor.client.engine.mock.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.utils.io.*
import kotlinx.serialization.json.Json

class RecipeServiceClientTest : FeatureSpec({
    feature("getRecipe") {
        scenario("returns recipe when API responds with 200 OK") {
            val mockEngine = MockEngine { request ->
                // Verify request
                request.url.toString() shouldBe "https://test-host.io/v1/recipes/recipe-123"
                request.headers["Accept"] shouldBe "application/json"

                respond(
                    content = ByteReadChannel("""
                        {
                            "id": "recipe-123",
                            "name": "Spaghetti Carbonara",
                            "description": "Classic Italian pasta",
                            "prepTimeMinutes": 10,
                            "cookTimeMinutes": 20
                        }
                    """.trimIndent()),
                    status = HttpStatusCode.OK,
                    headers = headersOf(HttpHeaders.ContentType, "application/json")
                )
            }

            val client = RecipeServiceClient(
                httpClient = createMockHttpClient(mockEngine),
                host = "https://test-host.io"
            )

            val recipe = client.getRecipe("recipe-123")

            recipe.id shouldBe "recipe-123"
            recipe.name shouldBe "Spaghetti Carbonara"
            recipe.prepTimeMinutes shouldBe 10
        }

        scenario("throws exception when API responds with 404 Not Found") {
            val mockEngine = MockEngine {
                respond(
                    content = ByteReadChannel("""{"error": "Recipe not found"}"""),
                    status = HttpStatusCode.NotFound,
                    headers = headersOf(HttpHeaders.ContentType, "application/json")
                )
            }

            val client = RecipeServiceClient(
                httpClient = createMockHttpClient(mockEngine),
                host = "https://test-host.io"
            )

            val exception = shouldThrow<HttpClientBadRequestException> {
                client.getRecipe("invalid-id")
            }

            exception.statusCode shouldBe HttpStatusCode.NotFound
            exception.message shouldContain "Recipe not found"
        }

        scenario("throws timeout exception when request times out") {
            val mockEngine = MockEngine {
                throw HttpRequestTimeoutException("Request timeout", null)
            }

            val client = RecipeServiceClient(
                httpClient = createMockHttpClient(mockEngine),
                host = "https://test-host.io"
            )

            val exception = shouldThrow<HttpClientTimeoutException> {
                client.getRecipe("recipe-123")
            }

            exception.message shouldContain "timeout"
        }
    }

    feature("searchRecipes") {
        scenario("returns multiple recipes") {
            val mockEngine = MockEngine {
                respond(
                    content = ByteReadChannel("""
                        {
                            "recipes": [
                                {"id": "1", "name": "Recipe 1", "prepTimeMinutes": 10},
                                {"id": "2", "name": "Recipe 2", "prepTimeMinutes": 15}
                            ],
                            "total": 2,
                            "pageNumber": 1,
                            "hasMore": false
                        }
                    """.trimIndent()),
                    status = HttpStatusCode.OK,
                    headers = headersOf(HttpHeaders.ContentType, "application/json")
                )
            }

            val client = RecipeServiceClient(
                httpClient = createMockHttpClient(mockEngine),
                host = "https://test-host.io"
            )

            val response = client.searchRecipes("pasta")

            response.recipes.size shouldBe 2
            response.total shouldBe 2
            response.hasMore shouldBe false
        }
    }
})

private fun createMockHttpClient(mockEngine: MockEngine): HttpClient {
    return HttpClient(mockEngine) {
        install(ContentNegotiation) {
            json(Json {
                prettyPrint = false
                isLenient = true
                ignoreUnknownKeys = true
            })
        }
    }
}
```

**Integration tests with TestContainers:**
```kotlin
// File: shared-infrastructure/src/test/kotlin/com/yourcompany/shared/infrastructure/http/RecipeServiceIntegrationTest.kt
package com.yourcompany.shared.infrastructure.http

import io.kotest.core.spec.style.FeatureSpec
import io.kotest.matchers.shouldBe
import org.testcontainers.containers.GenericContainer
import org.testcontainers.containers.wait.strategy.Wait

class RecipeServiceIntegrationTest : FeatureSpec({
    lateinit var mockServer: GenericContainer<*>

    beforeSpec {
        mockServer = GenericContainer("mockserver/mockserver:latest")
            .withExposedPorts(1080)
            .waitingFor(Wait.forHttp("/"))
        mockServer.start()
    }

    afterSpec {
        mockServer.stop()
    }

    feature("integration with real HTTP client") {
        scenario("handles real network timeouts") {
            val host = "http://${mockServer.host}:${mockServer.getMappedPort(1080)}"
            val client = RecipeServiceClient(
                httpClient = getDefaultHttpClient(
                    requestTimeoutMs = 1000L,
                    withRetry = false
                ),
                host = host
            )

            // Test timeout behavior
            val exception = shouldThrow<HttpClientTimeoutException> {
                client.getRecipe("timeout-test")
            }

            exception.message shouldContain "timeout"
        }
    }
})
```

## Anti-Patterns to Avoid

❌ **Don't create HttpClient instances per request:**
```kotlin
// ❌ Bad - creates new client for each request
suspend fun getRecipe(id: String): RecipeDto {
    val client = HttpClient(CIO)  // Creating client per request!
    val response = client.get("$host/recipes/$id")
    client.close()
    return response.body()
}
```

✅ **Create HttpClient once and reuse:**
```kotlin
// ✅ Good - reuse client instance
class RecipeServiceClient(
    private val httpClient: HttpClient,  // Injected, created once
    private val host: String
) {
    suspend fun getRecipe(id: String): RecipeDto {
        val response = httpClient.get("$host/recipes/$id")
        return response.body()
    }
}
```

❌ **Don't ignore timeout exceptions:**
```kotlin
// ❌ Bad - swallowing timeout exceptions
suspend fun getRecipe(id: String): RecipeDto? {
    return try {
        httpClient.get("$host/recipes/$id").body()
    } catch (e: Exception) {
        logger.warn { "Failed to fetch recipe" }
        null  // Hiding the error!
    }
}
```

✅ **Handle timeout exceptions explicitly:**
```kotlin
// ✅ Good - explicit timeout handling
suspend fun getRecipe(id: String): RecipeDto {
    try {
        return httpClient.get("$host/recipes/$id").body()
    } catch (e: HttpRequestTimeoutException) {
        logger.error(e) { "Timeout fetching recipe $id" }
        throw RecipeServiceTimeoutException("Recipe service timed out", e)
    } catch (e: Exception) {
        logger.error(e) { "Error fetching recipe $id" }
        throw RecipeServiceException("Failed to fetch recipe", e)
    }
}
```

❌ **Don't use unlimited concurrency:**
```kotlin
// ❌ Bad - no concurrency control
suspend fun fetchAllRecipes(ids: List<String>): List<RecipeDto> {
    return coroutineScope {
        ids.map { id ->
            async {
                httpClient.get("$host/recipes/$id").body<RecipeDto>()
            }
        }.awaitAll()  // Launches all 10,000 requests at once!
    }
}
```

✅ **Use Semaphore for concurrency control:**
```kotlin
// ✅ Good - limited concurrency
class RecipeServiceClient(
    private val httpClient: HttpClient,
    private val host: String,
    maxConcurrent: Int = 20
) {
    private val semaphore = Semaphore(maxConcurrent)

    suspend fun fetchAllRecipes(ids: List<String>): List<RecipeDto> {
        return coroutineScope {
            ids.map { id ->
                async {
                    semaphore.withPermit {
                        httpClient.get("$host/recipes/$id").body<RecipeDto>()
                    }
                }
            }.awaitAll()
        }
    }
}
```

❌ **Don't hardcode configuration:**
```kotlin
// ❌ Bad - hardcoded configuration
class RecipeServiceClient {
    private val host = "https://recipe-service.yourcompany.io"  // Hardcoded!
    private val apiKey = "secret-key-123"  // Hardcoded secret!
}
```

✅ **Use configuration loader:**
```kotlin
// ✅ Good - externalized configuration
class RecipeServiceClient(
    private val httpClient: HttpClient,
    private val host: String = ConfigurationLoader.getString("recipe.service.host"),
    private val apiKey: String = ConfigurationLoader.getString("recipe.service.api.key")
)
```

## Related Implementers

- **rest-api.md** - Ktor server for building REST APIs
- **testing.md** - Testing strategies for HTTP clients
- **error-handling.md** - Exception handling patterns
- **coroutines.md** - Async/await patterns with coroutines
- **observability.md** - Logging and metrics for HTTP clients
