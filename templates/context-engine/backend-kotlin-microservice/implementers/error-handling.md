---
domain: error-handling
description: Error handling patterns using custom exception hierarchies, Ktor StatusPages, MDC tracking, Result types, and validation
---

# Error Handling in Kotlin Microservices

Implement robust error handling using custom exception hierarchies, global exception handlers with Ktor StatusPages, MDC (Mapped Diagnostic Context) for request tracking, Result types for functional error handling, and comprehensive validation patterns.

## Core Patterns

### 1. Custom Exception Hierarchy

**Pattern:** Define a hierarchical exception structure that maps to HTTP status codes and provides detailed error context.

**Example from PR #1271:**
```kotlin
// File: meal-selection-service-domain/src/main/kotlin/com/yourcompany/mealselection/exception/Exceptions.kt
package com.yourcompany.mealselection.exception

/**
 * Base exception for all domain-related errors
 */
sealed class DomainException(
    message: String,
    cause: Throwable? = null
) : RuntimeException(message, cause)

/**
 * Resource not found (404)
 */
class NotFoundException(
    message: String,
    val resourceType: String? = null,
    val resourceId: String? = null
) : DomainException(message) {
    constructor(resourceType: String, resourceId: String) :
        this("$resourceType not found: $resourceId", resourceType, resourceId)
}

/**
 * Business rule validation failure (400)
 */
class ValidationException(
    message: String,
    val errors: Map<String, String> = emptyMap(),
    val errorCode: String? = null
) : DomainException(message) {
    constructor(field: String, error: String) :
        this("Validation failed", mapOf(field to error))

    fun hasErrors(): Boolean = errors.isNotEmpty()

    fun getError(field: String): String? = errors[field]
}

/**
 * Business rule constraint violation (409)
 */
class ConflictException(
    message: String,
    val conflictType: String? = null
) : DomainException(message)

/**
 * Unauthorized access (401)
 */
class UnauthorizedException(
    message: String = "Unauthorized access",
    val reason: String? = null
) : DomainException(message)

/**
 * Forbidden action (403)
 */
class ForbiddenException(
    message: String = "Forbidden",
    val requiredPermission: String? = null
) : DomainException(message)

/**
 * Business logic error (422)
 */
class BusinessRuleException(
    message: String,
    val ruleName: String? = null
) : DomainException(message)

/**
 * External service failure (502)
 */
class ServiceException(
    message: String,
    val serviceName: String,
    cause: Throwable? = null
) : DomainException(message, cause)

/**
 * Rate limiting (429)
 */
class RateLimitException(
    message: String = "Rate limit exceeded",
    val retryAfterSeconds: Long? = null
) : DomainException(message)

/**
 * Request timeout (408)
 */
class TimeoutException(
    message: String = "Request timeout",
    val timeoutMillis: Long? = null
) : DomainException(message)
```

**Domain-Specific Exceptions:**
```kotlin
// File: meal-selection-service-domain/src/main/kotlin/com/yourcompany/mealselection/exception/CartExceptions.kt
package com.yourcompany.mealselection.exception

import java.util.UUID

class CartNotFoundException(cartId: UUID) :
    NotFoundException("Cart", cartId.toString())

class CartLockedException(cartId: UUID) :
    BusinessRuleException("Cart is locked and cannot be modified: $cartId", "cart_locked")

class CartItemLimitExceededException(
    currentCount: Int,
    maxCount: Int
) : BusinessRuleException(
    "Cart item limit exceeded: $currentCount/$maxCount",
    "cart_item_limit"
)

class RecipeAlreadyInCartException(recipeId: UUID) :
    ConflictException("Recipe already in cart: $recipeId", "duplicate_recipe")

class InvalidCartStateException(
    currentState: String,
    expectedState: String
) : BusinessRuleException(
    "Invalid cart state. Expected: $expectedState, Got: $currentState",
    "invalid_cart_state"
)

// File: meal-selection-service-domain/src/main/kotlin/com/yourcompany/mealselection/exception/OrderExceptions.kt
package com.yourcompany.mealselection.exception

import java.util.UUID

class OrderNotFoundException(orderId: UUID) :
    NotFoundException("Order", orderId.toString())

class OrderProcessingException(
    message: String,
    val orderId: UUID? = null,
    cause: Throwable? = null
) : DomainException(message, cause)

class InsufficientInventoryException(
    val recipeId: UUID,
    val requestedQuantity: Int,
    val availableQuantity: Int
) : BusinessRuleException(
    "Insufficient inventory for recipe $recipeId. Requested: $requestedQuantity, Available: $availableQuantity",
    "insufficient_inventory"
)

class PaymentFailedException(
    message: String,
    val transactionId: String? = null,
    cause: Throwable? = null
) : ServiceException(message, "payment-service", cause)

class InventoryServiceException(
    message: String,
    cause: Throwable? = null
) : ServiceException(message, "inventory-service", cause)
```

**Frequency:** 48% of PRs implement or extend custom exceptions

**Why:** Custom exceptions provide:
- Type-safe error handling
- Clear mapping to HTTP status codes
- Rich context for debugging and monitoring
- Domain-specific error semantics
- Separation of technical vs business errors

### 2. Global Exception Handler with StatusPages

**Pattern:** Configure Ktor StatusPages plugin to handle all exceptions centrally with appropriate HTTP responses and logging.

**Example from PR #1271:**
```kotlin
// File: meal-selection-service/src/main/kotlin/com/yourcompany/mealselection/plugins/ErrorHandling.kt
package com.yourcompany.mealselection.plugins

import com.yourcompany.mealselection.api.dto.ErrorResponse
import com.yourcompany.mealselection.exception.*
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.plugins.statuspages.*
import io.ktor.server.response.*
import org.slf4j.LoggerFactory
import org.slf4j.MDC

fun Application.configureErrorHandling() {
    val logger = LoggerFactory.getLogger("ErrorHandler")

    install(StatusPages) {
        // Domain exceptions
        exception<NotFoundException> { call, cause ->
            val requestId = MDC.get("requestId") ?: "unknown"
            logger.warn(
                "Resource not found - requestId: $requestId, resource: ${cause.resourceType}, id: ${cause.resourceId}"
            )

            call.respond(
                HttpStatusCode.NotFound,
                ErrorResponse(
                    message = cause.message ?: "Resource not found",
                    code = "NOT_FOUND",
                    requestId = requestId,
                    details = buildMap {
                        cause.resourceType?.let { put("resourceType", it) }
                        cause.resourceId?.let { put("resourceId", it) }
                    }
                )
            )
        }

        exception<ValidationException> { call, cause ->
            val requestId = MDC.get("requestId") ?: "unknown"
            logger.warn(
                "Validation error - requestId: $requestId, errors: ${cause.errors}"
            )

            call.respond(
                HttpStatusCode.BadRequest,
                ErrorResponse(
                    message = cause.message ?: "Validation failed",
                    code = cause.errorCode ?: "VALIDATION_ERROR",
                    requestId = requestId,
                    details = cause.errors
                )
            )
        }

        exception<ConflictException> { call, cause ->
            val requestId = MDC.get("requestId") ?: "unknown"
            logger.warn(
                "Conflict - requestId: $requestId, type: ${cause.conflictType}"
            )

            call.respond(
                HttpStatusCode.Conflict,
                ErrorResponse(
                    message = cause.message ?: "Resource conflict",
                    code = "CONFLICT",
                    requestId = requestId,
                    details = cause.conflictType?.let { mapOf("conflictType" to it) }
                )
            )
        }

        exception<UnauthorizedException> { call, cause ->
            val requestId = MDC.get("requestId") ?: "unknown"
            logger.warn(
                "Unauthorized - requestId: $requestId, reason: ${cause.reason}"
            )

            call.respond(
                HttpStatusCode.Unauthorized,
                ErrorResponse(
                    message = cause.message ?: "Unauthorized",
                    code = "UNAUTHORIZED",
                    requestId = requestId,
                    details = cause.reason?.let { mapOf("reason" to it) }
                )
            )
        }

        exception<ForbiddenException> { call, cause ->
            val requestId = MDC.get("requestId") ?: "unknown"
            logger.warn(
                "Forbidden - requestId: $requestId, permission: ${cause.requiredPermission}"
            )

            call.respond(
                HttpStatusCode.Forbidden,
                ErrorResponse(
                    message = cause.message ?: "Forbidden",
                    code = "FORBIDDEN",
                    requestId = requestId,
                    details = cause.requiredPermission?.let { mapOf("requiredPermission" to it) }
                )
            )
        }

        exception<BusinessRuleException> { call, cause ->
            val requestId = MDC.get("requestId") ?: "unknown"
            logger.warn(
                "Business rule violation - requestId: $requestId, rule: ${cause.ruleName}"
            )

            call.respond(
                HttpStatusCode.UnprocessableEntity,
                ErrorResponse(
                    message = cause.message ?: "Business rule violation",
                    code = cause.ruleName?.uppercase() ?: "BUSINESS_RULE_ERROR",
                    requestId = requestId
                )
            )
        }

        exception<ServiceException> { call, cause ->
            val requestId = MDC.get("requestId") ?: "unknown"
            logger.error(
                "External service error - requestId: $requestId, service: ${cause.serviceName}",
                cause
            )

            call.respond(
                HttpStatusCode.BadGateway,
                ErrorResponse(
                    message = "External service unavailable",
                    code = "SERVICE_ERROR",
                    requestId = requestId,
                    details = mapOf("service" to cause.serviceName)
                )
            )
        }

        exception<RateLimitException> { call, cause ->
            val requestId = MDC.get("requestId") ?: "unknown"
            logger.warn("Rate limit exceeded - requestId: $requestId")

            cause.retryAfterSeconds?.let {
                call.response.header("Retry-After", it.toString())
            }

            call.respond(
                HttpStatusCode.TooManyRequests,
                ErrorResponse(
                    message = cause.message ?: "Rate limit exceeded",
                    code = "RATE_LIMIT_EXCEEDED",
                    requestId = requestId,
                    details = cause.retryAfterSeconds?.let { mapOf("retryAfter" to it.toString()) }
                )
            )
        }

        exception<TimeoutException> { call, cause ->
            val requestId = MDC.get("requestId") ?: "unknown"
            logger.error("Request timeout - requestId: $requestId", cause)

            call.respond(
                HttpStatusCode.RequestTimeout,
                ErrorResponse(
                    message = cause.message ?: "Request timeout",
                    code = "TIMEOUT",
                    requestId = requestId
                )
            )
        }

        // Standard library exceptions
        exception<IllegalArgumentException> { call, cause ->
            val requestId = MDC.get("requestId") ?: "unknown"
            logger.warn("Invalid argument - requestId: $requestId, message: ${cause.message}")

            call.respond(
                HttpStatusCode.BadRequest,
                ErrorResponse(
                    message = cause.message ?: "Invalid argument",
                    code = "INVALID_ARGUMENT",
                    requestId = requestId
                )
            )
        }

        exception<IllegalStateException> { call, cause ->
            val requestId = MDC.get("requestId") ?: "unknown"
            logger.error("Illegal state - requestId: $requestId", cause)

            call.respond(
                HttpStatusCode.InternalServerError,
                ErrorResponse(
                    message = "Internal server error",
                    code = "ILLEGAL_STATE",
                    requestId = requestId
                )
            )
        }

        // Catch-all for unexpected exceptions
        exception<Throwable> { call, cause ->
            val requestId = MDC.get("requestId") ?: "unknown"
            logger.error("Unhandled exception - requestId: $requestId", cause)

            // Don't expose internal error details in production
            val isDevelopment = environment.config.propertyOrNull("ktor.development")
                ?.getString()?.toBoolean() ?: false

            call.respond(
                HttpStatusCode.InternalServerError,
                ErrorResponse(
                    message = if (isDevelopment) {
                        "${cause::class.simpleName}: ${cause.message}"
                    } else {
                        "Internal server error"
                    },
                    code = "INTERNAL_ERROR",
                    requestId = requestId,
                    details = if (isDevelopment) {
                        mapOf("exception" to (cause::class.qualifiedName ?: "Unknown"))
                    } else null
                )
            )
        }
    }
}
```

**Error Response DTO:**
```kotlin
// File: meal-selection-service-api/src/main/kotlin/com/yourcompany/mealselection/api/dto/ErrorResponse.kt
package com.yourcompany.mealselection.api.dto

import kotlinx.serialization.Serializable

@Serializable
data class ErrorResponse(
    val message: String,
    val code: String,
    val requestId: String? = null,
    val timestamp: String = java.time.Instant.now().toString(),
    val details: Map<String, String>? = null
)
```

**Frequency:** 48% of PRs configure or enhance StatusPages error handling

**Why:** StatusPages provides:
- Centralized error handling logic
- Consistent error response format
- Proper HTTP status code mapping
- Comprehensive logging with context
- Environment-specific error detail exposure

### 3. MDC (Mapped Diagnostic Context) for Request Tracking

**Pattern:** Use SLF4J MDC to propagate request context (request ID, user ID, etc.) through the entire request lifecycle for correlation in logs.

**Example from PR #1278:**
```kotlin
// File: meal-selection-service/src/main/kotlin/com/yourcompany/mealselection/plugins/Monitoring.kt
package com.yourcompany.mealselection.plugins

import io.ktor.server.application.*
import io.ktor.server.plugins.callloging.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import org.slf4j.LoggerFactory
import org.slf4j.MDC
import org.slf4j.event.Level
import java.util.UUID

fun Application.configureMonitoring() {
    val logger = LoggerFactory.getLogger("RequestLogger")

    // Request ID plugin
    install(createApplicationPlugin(name = "RequestIdPlugin") {
        onCall { call ->
            // Extract or generate request ID
            val requestId = call.request.header("X-Request-ID")
                ?: call.request.header("X-Correlation-ID")
                ?: UUID.randomUUID().toString()

            // Store in MDC for logging
            MDC.put("requestId", requestId)

            // Add to response headers
            call.response.headers.append("X-Request-ID", requestId)

            // Extract user context if available
            call.request.header("X-User-ID")?.let { userId ->
                MDC.put("userId", userId)
            }

            // Extract tenant context if available
            call.request.header("X-Tenant-ID")?.let { tenantId ->
                MDC.put("tenantId", tenantId)
            }

            // Track request path and method
            MDC.put("method", call.request.httpMethod.value)
            MDC.put("path", call.request.path())
        }

        onCallRespond { call ->
            // Add response status to MDC
            call.response.status()?.let { status ->
                MDC.put("status", status.value.toString())
            }
        }

        onCallRespond { call ->
            // Clean up MDC after request completes
            MDC.clear()
        }
    })

    // Structured call logging
    install(CallLogging) {
        level = Level.INFO

        // Don't log health checks
        filter { call ->
            !call.request.path().startsWith("/health") &&
            !call.request.path().startsWith("/metrics")
        }

        format { call ->
            val requestId = MDC.get("requestId") ?: "unknown"
            val method = call.request.httpMethod.value
            val path = call.request.path()
            val status = call.response.status()?.value ?: "unknown"
            val duration = call.attributes.getOrNull(DurationKey) ?: 0L

            "requestId=$requestId method=$method path=$path status=$status duration=${duration}ms"
        }

        // Add MDC context
        mdc("requestId") { call ->
            call.request.header("X-Request-ID") ?: UUID.randomUUID().toString()
        }
        mdc("method") { call -> call.request.httpMethod.value }
        mdc("path") { call -> call.request.path() }
        mdc("status") { call -> call.response.status()?.value?.toString() ?: "unknown" }
        mdc("userId") { call -> call.request.header("X-User-ID") }
    }

    // Duration tracking
    install(createApplicationPlugin(name = "DurationPlugin") {
        onCall { call ->
            val startTime = System.currentTimeMillis()
            call.attributes.put(StartTimeKey, startTime)
        }

        onCallRespond { call ->
            val startTime = call.attributes.getOrNull(StartTimeKey) ?: return@onCallRespond
            val duration = System.currentTimeMillis() - startTime
            call.attributes.put(DurationKey, duration)

            // Log slow requests
            if (duration > 1000) {
                logger.warn(
                    "Slow request detected - requestId: ${MDC.get("requestId")}, " +
                    "method: ${call.request.httpMethod.value}, " +
                    "path: ${call.request.path()}, " +
                    "duration: ${duration}ms"
                )
            }
        }
    })
}

private val StartTimeKey = AttributeKey<Long>("StartTime")
private val DurationKey = AttributeKey<Long>("Duration")
```

**MDC Context Propagation in Coroutines:**
```kotlin
// File: meal-selection-service-shared/src/main/kotlin/com/yourcompany/mealselection/context/MDCContext.kt
package com.yourcompany.mealselection.context

import kotlinx.coroutines.ThreadContextElement
import org.slf4j.MDC
import kotlin.coroutines.CoroutineContext

/**
 * Custom CoroutineContext element for MDC propagation across coroutines
 */
class MDCContext(
    private val contextMap: Map<String, String> = MDC.getCopyOfContextMap() ?: emptyMap()
) : ThreadContextElement<Map<String, String>> {

    companion object Key : CoroutineContext.Key<MDCContext>

    override val key: CoroutineContext.Key<MDCContext> = Key

    override fun updateThreadContext(context: CoroutineContext): Map<String, String> {
        val oldContext = MDC.getCopyOfContextMap() ?: emptyMap()
        MDC.setContextMap(contextMap)
        return oldContext
    }

    override fun restoreThreadContext(context: CoroutineContext, oldState: Map<String, String>) {
        MDC.setContextMap(oldState)
    }
}

/**
 * Extension function to easily add MDC context to coroutines
 */
suspend fun <T> withMDCContext(block: suspend () -> T): T {
    return kotlinx.coroutines.withContext(MDCContext()) {
        block()
    }
}
```

**Usage in Services:**
```kotlin
// File: meal-selection-service-shared/src/main/kotlin/com/yourcompany/mealselection/service/OrderService.kt
package com.yourcompany.mealselection.service

import com.yourcompany.mealselection.context.MDCContext
import com.yourcompany.mealselection.domain.*
import com.yourcompany.mealselection.exception.*
import kotlinx.coroutines.*
import org.slf4j.LoggerFactory
import org.slf4j.MDC
import java.util.UUID

class OrderService(
    private val orderRepository: OrderRepository,
    private val cartRepository: CartRepository,
    private val inventoryClient: InventoryClient,
    private val paymentClient: PaymentClient
) {
    private val logger = LoggerFactory.getLogger(javaClass)

    suspend fun processOrder(orderId: UUID): Order = withContext(MDCContext()) {
        // MDC context is automatically propagated
        logger.info("Starting order processing for order: $orderId")

        val order = orderRepository.findById(orderId)
            ?: throw OrderNotFoundException(orderId)

        logger.info("Found order: ${order.id}, customerId: ${order.customerId}")

        try {
            // Parallel operations with MDC context
            val inventoryResult = async {
                logger.info("Reserving inventory for order: $orderId")
                inventoryClient.reserveItems(order.items)
            }

            val paymentResult = async {
                logger.info("Processing payment for order: $orderId")
                paymentClient.processPayment(order.customerId, order.totalAmount)
            }

            val inventory = inventoryResult.await()
            val payment = paymentResult.await()

            logger.info(
                "Order processing completed - orderId: $orderId, " +
                "inventoryReservation: ${inventory.reservationId}, " +
                "paymentTransaction: ${payment.transactionId}"
            )

            val processedOrder = order.copy(
                status = OrderStatus.CONFIRMED,
                inventoryReservationId = inventory.reservationId,
                paymentTransactionId = payment.transactionId
            )

            orderRepository.save(processedOrder)
        } catch (e: Exception) {
            logger.error("Order processing failed for order: $orderId", e)
            throw OrderProcessingException("Failed to process order", orderId, e)
        }
    }
}
```

**Frequency:** 48% of PRs implement or use MDC for request tracking

**Why:** MDC provides:
- Request correlation across service boundaries
- Easy troubleshooting with request ID
- Consistent logging context
- Support for distributed tracing
- Thread-safe context propagation

### 4. Result Types for Functional Error Handling

**Pattern:** Use Result type to represent success or failure without exceptions for expected error cases.

**Example from PR #1285:**
```kotlin
// File: meal-selection-service-domain/src/main/kotlin/com/yourcompany/mealselection/domain/Result.kt
package com.yourcompany.mealselection.domain

/**
 * Sealed class representing either success or failure
 */
sealed class Result<out T> {
    data class Success<T>(val value: T) : Result<T>()
    data class Failure(val error: Error) : Result<Nothing>()

    fun isSuccess(): Boolean = this is Success
    fun isFailure(): Boolean = this is Failure

    fun getOrNull(): T? = when (this) {
        is Success -> value
        is Failure -> null
    }

    fun getOrThrow(): T = when (this) {
        is Success -> value
        is Failure -> throw error.toException()
    }

    fun getOrElse(defaultValue: T): T = when (this) {
        is Success -> value
        is Failure -> defaultValue
    }

    fun getOrElse(defaultValue: (Error) -> T): T = when (this) {
        is Success -> value
        is Failure -> defaultValue(error)
    }

    inline fun <R> map(transform: (T) -> R): Result<R> = when (this) {
        is Success -> Success(transform(value))
        is Failure -> this
    }

    inline fun <R> flatMap(transform: (T) -> Result<R>): Result<R> = when (this) {
        is Success -> transform(value)
        is Failure -> this
    }

    inline fun onSuccess(action: (T) -> Unit): Result<T> {
        if (this is Success) action(value)
        return this
    }

    inline fun onFailure(action: (Error) -> Unit): Result<T> {
        if (this is Failure) action(error)
        return this
    }

    inline fun recover(transform: (Error) -> T): Result<T> = when (this) {
        is Success -> this
        is Failure -> Success(transform(error))
    }

    inline fun recoverWith(transform: (Error) -> Result<T>): Result<T> = when (this) {
        is Success -> this
        is Failure -> transform(error)
    }
}

/**
 * Error type with code and message
 */
data class Error(
    val code: String,
    val message: String,
    val details: Map<String, String> = emptyMap(),
    val cause: Throwable? = null
) {
    fun toException(): DomainException = when (code) {
        "NOT_FOUND" -> NotFoundException(message)
        "VALIDATION_ERROR" -> ValidationException(message, details)
        "CONFLICT" -> ConflictException(message)
        "UNAUTHORIZED" -> UnauthorizedException(message)
        "FORBIDDEN" -> ForbiddenException(message)
        "BUSINESS_RULE_ERROR" -> BusinessRuleException(message)
        "SERVICE_ERROR" -> ServiceException(message, details["service"] ?: "unknown", cause)
        else -> DomainException(message, cause)
    }

    companion object {
        fun notFound(message: String): Error =
            Error("NOT_FOUND", message)

        fun validation(message: String, errors: Map<String, String> = emptyMap()): Error =
            Error("VALIDATION_ERROR", message, errors)

        fun conflict(message: String): Error =
            Error("CONFLICT", message)

        fun businessRule(message: String, rule: String? = null): Error =
            Error("BUSINESS_RULE_ERROR", message, rule?.let { mapOf("rule" to it) } ?: emptyMap())

        fun service(serviceName: String, message: String, cause: Throwable? = null): Error =
            Error("SERVICE_ERROR", message, mapOf("service" to serviceName), cause)
    }
}

/**
 * Extension functions for working with Result
 */
fun <T> Result<T>.fold(
    onSuccess: (T) -> Unit,
    onFailure: (Error) -> Unit
) {
    when (this) {
        is Result.Success -> onSuccess(value)
        is Result.Failure -> onFailure(error)
    }
}

fun <T> Result<T>.mapError(transform: (Error) -> Error): Result<T> = when (this) {
    is Result.Success -> this
    is Result.Failure -> Result.Failure(transform(error))
}

/**
 * Combine multiple results
 */
fun <T> List<Result<T>>.combine(): Result<List<T>> {
    val values = mutableListOf<T>()
    for (result in this) {
        when (result) {
            is Result.Success -> values.add(result.value)
            is Result.Failure -> return result
        }
    }
    return Result.Success(values)
}

/**
 * Helper functions to create Results
 */
fun <T> success(value: T): Result<T> = Result.Success(value)
fun failure(error: Error): Result<Nothing> = Result.Failure(error)

/**
 * Catch exceptions and convert to Result
 */
inline fun <T> resultOf(block: () -> T): Result<T> = try {
    Result.Success(block())
} catch (e: DomainException) {
    Result.Failure(Error(e::class.simpleName ?: "ERROR", e.message ?: "Unknown error", cause = e))
} catch (e: Exception) {
    Result.Failure(Error("INTERNAL_ERROR", e.message ?: "Unknown error", cause = e))
}

/**
 * Suspend version for coroutines
 */
suspend inline fun <T> suspendResultOf(crossinline block: suspend () -> T): Result<T> = try {
    Result.Success(block())
} catch (e: DomainException) {
    Result.Failure(Error(e::class.simpleName ?: "ERROR", e.message ?: "Unknown error", cause = e))
} catch (e: Exception) {
    Result.Failure(Error("INTERNAL_ERROR", e.message ?: "Unknown error", cause = e))
}
```

**Service Layer Usage:**
```kotlin
// File: meal-selection-service-shared/src/main/kotlin/com/yourcompany/mealselection/service/RecipeService.kt
package com.yourcompany.mealselection.service

import com.yourcompany.mealselection.domain.*
import com.yourcompany.mealselection.repository.*
import kotlinx.coroutines.*
import org.slf4j.LoggerFactory
import java.util.UUID

class RecipeService(
    private val recipeRepository: RecipeRepository,
    private val nutritionClient: NutritionClient,
    private val imageClient: ImageClient
) {
    private val logger = LoggerFactory.getLogger(javaClass)

    /**
     * Fetch recipe with error handling using Result
     */
    suspend fun getRecipe(recipeId: UUID): Result<Recipe> = suspendResultOf {
        recipeRepository.findById(recipeId)
            ?: throw NotFoundException("Recipe", recipeId.toString())
    }

    /**
     * Enrich recipe with data from external services
     * Returns partial data if some services fail
     */
    suspend fun getEnrichedRecipe(recipeId: UUID): Result<EnrichedRecipe> = suspendResultOf {
        val recipe = recipeRepository.findById(recipeId)
            ?: throw NotFoundException("Recipe", recipeId.toString())

        coroutineScope {
            // Fetch nutrition info (optional)
            val nutritionResult = async {
                resultOf { nutritionClient.getNutritionInfo(recipeId) }
            }

            // Fetch images (optional)
            val imagesResult = async {
                resultOf { imageClient.getRecipeImages(recipeId) }
            }

            val nutrition = nutritionResult.await()
            val images = imagesResult.await()

            // Log failures but don't fail the entire operation
            nutrition.onFailure { error ->
                logger.warn("Failed to fetch nutrition info for recipe $recipeId: ${error.message}")
            }
            images.onFailure { error ->
                logger.warn("Failed to fetch images for recipe $recipeId: ${error.message}")
            }

            EnrichedRecipe(
                recipe = recipe,
                nutrition = nutrition.getOrNull(),
                images = images.getOrNull()
            )
        }
    }

    /**
     * Validate recipe data and return Result with detailed errors
     */
    fun validateRecipe(recipe: Recipe): Result<Recipe> {
        val errors = mutableMapOf<String, String>()

        if (recipe.name.isBlank()) {
            errors["name"] = "Recipe name cannot be blank"
        }

        if (recipe.ingredients.isEmpty()) {
            errors["ingredients"] = "Recipe must have at least one ingredient"
        }

        if (recipe.prepTimeMinutes < 0) {
            errors["prepTimeMinutes"] = "Preparation time cannot be negative"
        }

        if (recipe.cookTimeMinutes < 0) {
            errors["cookTimeMinutes"] = "Cook time cannot be negative"
        }

        return if (errors.isEmpty()) {
            Result.Success(recipe)
        } else {
            Result.Failure(Error.validation("Recipe validation failed", errors))
        }
    }

    /**
     * Batch operation with individual Results
     */
    suspend fun getRecipes(recipeIds: List<UUID>): List<Result<Recipe>> = coroutineScope {
        recipeIds.map { recipeId ->
            async {
                suspendResultOf {
                    recipeRepository.findById(recipeId)
                        ?: throw NotFoundException("Recipe", recipeId.toString())
                }
            }
        }.awaitAll()
    }

    /**
     * Chain operations with flatMap
     */
    suspend fun createAndPublishRecipe(recipeData: RecipeData): Result<Recipe> {
        return validateRecipe(recipeData.toRecipe())
            .flatMap { recipe ->
                suspendResultOf { recipeRepository.save(recipe) }
            }
            .flatMap { savedRecipe ->
                suspendResultOf { publishRecipeEvent(savedRecipe) }
                    .map { savedRecipe }
            }
            .onSuccess { recipe ->
                logger.info("Recipe created and published: ${recipe.id}")
            }
            .onFailure { error ->
                logger.error("Failed to create recipe: ${error.message}")
            }
    }

    /**
     * Recover from specific errors
     */
    suspend fun getRecipeWithFallback(recipeId: UUID): Result<Recipe> {
        return getRecipe(recipeId)
            .recover { error ->
                logger.warn("Recipe not found, returning default: ${error.message}")
                Recipe.default()
            }
    }
}

data class EnrichedRecipe(
    val recipe: Recipe,
    val nutrition: NutritionInfo?,
    val images: List<String>?
)
```

**Frequency:** 24% of PRs use Result types for functional error handling

**Why:** Result types provide:
- Explicit error handling in type signatures
- Composable error handling with map/flatMap
- No exception overhead for expected errors
- Railway-oriented programming pattern
- Partial success scenarios (graceful degradation)

### 5. Request Validation with Detailed Errors

**Pattern:** Validate requests at the boundary with comprehensive error messages and field-level details.

**Example from PR #1268:**
```kotlin
// File: meal-selection-service-api/src/main/kotlin/com/yourcompany/mealselection/api/validation/Validator.kt
package com.yourcompany.mealselection.api.validation

import com.yourcompany.mealselection.exception.ValidationException
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

/**
 * Validation DSL for building validation rules
 */
class Validator<T>(private val value: T) {
    private val errors = mutableMapOf<String, String>()

    fun validate(field: String, rule: ValidationRule<T>): Validator<T> {
        rule.validate(value)?.let { error ->
            errors[field] = error
        }
        return this
    }

    fun validateField(field: String, fieldValue: Any?, vararg rules: FieldValidationRule<Any?>): Validator<T> {
        for (rule in rules) {
            rule.validate(fieldValue)?.let { error ->
                errors[field] = error
                break // Stop at first error for this field
            }
        }
        return this
    }

    fun isValid(): Boolean = errors.isEmpty()

    fun throwIfInvalid() {
        if (errors.isNotEmpty()) {
            throw ValidationException("Validation failed", errors)
        }
    }

    fun getErrors(): Map<String, String> = errors.toMap()
}

/**
 * Validation rule for the entire object
 */
fun interface ValidationRule<T> {
    fun validate(value: T): String?
}

/**
 * Validation rule for a field
 */
fun interface FieldValidationRule<T> {
    fun validate(value: T): String?
}

/**
 * Common field validation rules
 */
object ValidationRules {
    fun required(): FieldValidationRule<Any?> = FieldValidationRule { value ->
        when {
            value == null -> "Field is required"
            value is String && value.isBlank() -> "Field cannot be blank"
            value is Collection<*> && value.isEmpty() -> "Field cannot be empty"
            else -> null
        }
    }

    fun notBlank(): FieldValidationRule<String?> = FieldValidationRule { value ->
        if (value.isNullOrBlank()) "Field cannot be blank" else null
    }

    fun minLength(min: Int): FieldValidationRule<String?> = FieldValidationRule { value ->
        if (value != null && value.length < min) {
            "Field must be at least $min characters"
        } else null
    }

    fun maxLength(max: Int): FieldValidationRule<String?> = FieldValidationRule { value ->
        if (value != null && value.length > max) {
            "Field must be at most $max characters"
        } else null
    }

    fun pattern(regex: Regex, message: String): FieldValidationRule<String?> = FieldValidationRule { value ->
        if (value != null && !regex.matches(value)) message else null
    }

    fun email(): FieldValidationRule<String?> = pattern(
        Regex("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$"),
        "Invalid email format"
    )

    fun uuid(): FieldValidationRule<String?> = FieldValidationRule { value ->
        if (value != null) {
            try {
                UUID.fromString(value)
                null
            } catch (e: IllegalArgumentException) {
                "Invalid UUID format"
            }
        } else null
    }

    fun min(min: Number): FieldValidationRule<Number?> = FieldValidationRule { value ->
        if (value != null && value.toDouble() < min.toDouble()) {
            "Field must be at least $min"
        } else null
    }

    fun max(max: Number): FieldValidationRule<Number?> = FieldValidationRule { value ->
        if (value != null && value.toDouble() > max.toDouble()) {
            "Field must be at most $max"
        } else null
    }

    fun range(min: Number, max: Number): FieldValidationRule<Number?> = FieldValidationRule { value ->
        if (value != null) {
            val num = value.toDouble()
            when {
                num < min.toDouble() -> "Field must be at least $min"
                num > max.toDouble() -> "Field must be at most $max"
                else -> null
            }
        } else null
    }

    fun positive(): FieldValidationRule<Number?> = FieldValidationRule { value ->
        if (value != null && value.toDouble() <= 0) {
            "Field must be positive"
        } else null
    }

    fun notEmpty(): FieldValidationRule<Collection<*>?> = FieldValidationRule { value ->
        if (value != null && value.isEmpty()) "Field cannot be empty" else null
    }

    fun size(min: Int, max: Int): FieldValidationRule<Collection<*>?> = FieldValidationRule { value ->
        if (value != null) {
            when {
                value.size < min -> "Field must have at least $min items"
                value.size > max -> "Field must have at most $max items"
                else -> null
            }
        } else null
    }

    fun futureDate(): FieldValidationRule<String?> = FieldValidationRule { value ->
        if (value != null) {
            try {
                val date = LocalDate.parse(value)
                if (!date.isAfter(LocalDate.now())) {
                    "Date must be in the future"
                } else null
            } catch (e: Exception) {
                "Invalid date format"
            }
        } else null
    }

    fun pastDate(): FieldValidationRule<String?> = FieldValidationRule { value ->
        if (value != null) {
            try {
                val date = LocalDate.parse(value)
                if (!date.isBefore(LocalDate.now())) {
                    "Date must be in the past"
                } else null
            } catch (e: Exception) {
                "Invalid date format"
            }
        } else null
    }

    fun isoDateTime(): FieldValidationRule<String?> = FieldValidationRule { value ->
        if (value != null) {
            try {
                Instant.parse(value)
                null
            } catch (e: Exception) {
                "Invalid ISO-8601 date-time format"
            }
        } else null
    }
}

/**
 * Extension function to create validator
 */
fun <T> T.validator(): Validator<T> = Validator(this)

/**
 * Inline validation function
 */
inline fun <T> validate(value: T, block: Validator<T>.() -> Unit): Validator<T> {
    return Validator(value).apply(block)
}
```

**DTO Validation Example:**
```kotlin
// File: meal-selection-service-api/src/main/kotlin/com/yourcompany/mealselection/api/dto/CartDto.kt
package com.yourcompany.mealselection.api.dto

import com.yourcompany.mealselection.api.validation.*
import com.yourcompany.mealselection.domain.*
import kotlinx.serialization.Serializable
import java.util.UUID

@Serializable
data class CreateCartRequest(
    val customerId: String,
    val items: List<CartItemRequest> = emptyList()
) {
    fun validate() {
        validate(this) {
            validateField("customerId", customerId, ValidationRules.required(), ValidationRules.uuid())
            validateField("items", items, ValidationRules.size(0, 50))
        }.throwIfInvalid()

        // Validate each item
        items.forEachIndexed { index, item ->
            try {
                item.validate()
            } catch (e: ValidationException) {
                throw ValidationException(
                    "Validation failed for item at index $index",
                    e.errors.mapKeys { "items[$index].${it.key}" }
                )
            }
        }
    }

    fun toDomain(): CartData = CartData(
        customerId = UUID.fromString(customerId),
        items = items.map { it.toDomain() }
    )
}

@Serializable
data class CartItemRequest(
    val recipeId: String,
    val recipeName: String,
    val quantity: Int,
    val price: Double
) {
    fun validate() {
        validate(this) {
            validateField("recipeId", recipeId, ValidationRules.required(), ValidationRules.uuid())
            validateField("recipeName", recipeName, ValidationRules.required(), ValidationRules.minLength(1), ValidationRules.maxLength(200))
            validateField("quantity", quantity, ValidationRules.required(), ValidationRules.range(1, 10))
            validateField("price", price, ValidationRules.required(), ValidationRules.min(0))
        }.throwIfInvalid()
    }

    fun toDomain(): CartItem = CartItem(
        id = UUID.randomUUID(),
        recipeId = UUID.fromString(recipeId),
        recipeName = recipeName,
        quantity = quantity,
        price = Money(price)
    )
}

@Serializable
data class UpdateCartRequest(
    val items: List<CartItemRequest>
) {
    fun validate() {
        validate(this) {
            validateField("items", items, ValidationRules.required(), ValidationRules.size(1, 50))
        }.throwIfInvalid()

        items.forEachIndexed { index, item ->
            try {
                item.validate()
            } catch (e: ValidationException) {
                throw ValidationException(
                    "Validation failed for item at index $index",
                    e.errors.mapKeys { "items[$index].${it.key}" }
                )
            }
        }
    }
}
```

**Route Handler with Validation:**
```kotlin
// File: meal-selection-service-api/src/main/kotlin/com/yourcompany/mealselection/api/routes/CartRoutes.kt
package com.yourcompany.mealselection.api.routes

import com.yourcompany.mealselection.api.dto.*
import com.yourcompany.mealselection.service.CartService
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import org.slf4j.LoggerFactory
import java.util.UUID

fun Route.cartRoutes(cartService: CartService) {
    val logger = LoggerFactory.getLogger("CartRoutes")

    route("/v1/carts") {
        post {
            val request = call.receive<CreateCartRequest>()

            // Validate request
            request.validate()

            val cart = cartService.create(request.toDomain())

            call.respond(HttpStatusCode.Created, cart.toResponse())
        }

        put("/{id}") {
            val cartId = call.parameters["id"]?.let { UUID.fromString(it) }
                ?: return@put call.respond(HttpStatusCode.BadRequest, "Invalid cart ID")

            val request = call.receive<UpdateCartRequest>()

            // Validate request
            request.validate()

            val cart = cartService.update(cartId, request.items.map { it.toDomain() })

            call.respond(HttpStatusCode.OK, cart.toResponse())
        }
    }
}
```

**Frequency:** 36% of PRs implement comprehensive request validation

**Why:** Detailed validation provides:
- Early error detection at API boundary
- Clear, actionable error messages
- Field-level error reporting
- Consistent validation logic
- Type-safe validation rules

### 6. Error Recovery and Retry Patterns

**Pattern:** Implement retry logic with exponential backoff for transient failures and circuit breaker patterns for cascading failures.

**Example from PR #1291:**
```kotlin
// File: meal-selection-service-shared/src/main/kotlin/com/yourcompany/mealselection/resilience/RetryPolicy.kt
package com.yourcompany.mealselection.resilience

import kotlinx.coroutines.delay
import org.slf4j.LoggerFactory
import kotlin.math.pow
import kotlin.time.Duration
import kotlin.time.Duration.Companion.milliseconds
import kotlin.time.Duration.Companion.seconds

/**
 * Retry policy configuration
 */
data class RetryPolicy(
    val maxAttempts: Int = 3,
    val initialDelay: Duration = 100.milliseconds,
    val maxDelay: Duration = 10.seconds,
    val factor: Double = 2.0,
    val retryOnExceptions: List<Class<out Exception>> = listOf(Exception::class.java)
) {
    companion object {
        val DEFAULT = RetryPolicy()

        val AGGRESSIVE = RetryPolicy(
            maxAttempts = 5,
            initialDelay = 50.milliseconds,
            maxDelay = 5.seconds,
            factor = 1.5
        )

        val CONSERVATIVE = RetryPolicy(
            maxAttempts = 2,
            initialDelay = 500.milliseconds,
            maxDelay = 30.seconds,
            factor = 3.0
        )
    }

    fun shouldRetry(exception: Exception): Boolean {
        return retryOnExceptions.any { it.isInstance(exception) }
    }

    fun calculateDelay(attempt: Int): Duration {
        val delay = initialDelay.inWholeMilliseconds * factor.pow(attempt - 1).toLong()
        return minOf(delay.milliseconds, maxDelay)
    }
}

/**
 * Execute block with retry logic
 */
suspend fun <T> withRetry(
    policy: RetryPolicy = RetryPolicy.DEFAULT,
    operation: String = "operation",
    block: suspend () -> T
): T {
    val logger = LoggerFactory.getLogger("RetryPolicy")
    var lastException: Exception? = null

    repeat(policy.maxAttempts) { attempt ->
        try {
            return block()
        } catch (e: Exception) {
            lastException = e

            if (!policy.shouldRetry(e) || attempt == policy.maxAttempts - 1) {
                logger.error("$operation failed after ${attempt + 1} attempts", e)
                throw e
            }

            val delay = policy.calculateDelay(attempt + 1)
            logger.warn(
                "$operation failed (attempt ${attempt + 1}/${policy.maxAttempts}), " +
                "retrying in ${delay.inWholeMilliseconds}ms",
                e
            )
            delay(delay.inWholeMilliseconds)
        }
    }

    throw lastException ?: IllegalStateException("Retry failed without exception")
}

/**
 * Circuit breaker states
 */
sealed class CircuitBreakerState {
    object Closed : CircuitBreakerState()
    data class Open(val openedAt: Long) : CircuitBreakerState()
    object HalfOpen : CircuitBreakerState()
}

/**
 * Circuit breaker for preventing cascading failures
 */
class CircuitBreaker(
    private val failureThreshold: Int = 5,
    private val resetTimeoutMillis: Long = 60000,
    private val halfOpenAttempts: Int = 3
) {
    private val logger = LoggerFactory.getLogger(javaClass)
    private var state: CircuitBreakerState = CircuitBreakerState.Closed
    private var failureCount = 0
    private var successCount = 0

    suspend fun <T> execute(operation: String, block: suspend () -> T): T {
        when (val currentState = state) {
            is CircuitBreakerState.Closed -> {
                return try {
                    val result = block()
                    onSuccess()
                    result
                } catch (e: Exception) {
                    onFailure(operation)
                    throw e
                }
            }
            is CircuitBreakerState.Open -> {
                if (System.currentTimeMillis() - currentState.openedAt >= resetTimeoutMillis) {
                    logger.info("Circuit breaker transitioning to half-open for operation: $operation")
                    state = CircuitBreakerState.HalfOpen
                    successCount = 0
                    return execute(operation, block)
                } else {
                    throw ServiceException(
                        "Circuit breaker is open for operation: $operation",
                        operation
                    )
                }
            }
            is CircuitBreakerState.HalfOpen -> {
                return try {
                    val result = block()
                    successCount++
                    if (successCount >= halfOpenAttempts) {
                        logger.info("Circuit breaker closing for operation: $operation")
                        state = CircuitBreakerState.Closed
                        failureCount = 0
                    }
                    result
                } catch (e: Exception) {
                    logger.warn("Circuit breaker reopening for operation: $operation")
                    state = CircuitBreakerState.Open(System.currentTimeMillis())
                    throw e
                }
            }
        }
    }

    private fun onSuccess() {
        failureCount = 0
    }

    private fun onFailure(operation: String) {
        failureCount++
        if (failureCount >= failureThreshold) {
            logger.error("Circuit breaker opening for operation: $operation (failures: $failureCount)")
            state = CircuitBreakerState.Open(System.currentTimeMillis())
        }
    }

    fun getState(): CircuitBreakerState = state
    fun getFailureCount(): Int = failureCount
}

/**
 * Client wrapper with retry and circuit breaker
 */
class ResilientClient(
    private val client: HttpClient,
    private val retryPolicy: RetryPolicy = RetryPolicy.DEFAULT,
    private val circuitBreaker: CircuitBreaker = CircuitBreaker()
) {
    private val logger = LoggerFactory.getLogger(javaClass)

    suspend fun <T> execute(
        operation: String,
        block: suspend () -> T
    ): T {
        return circuitBreaker.execute(operation) {
            withRetry(retryPolicy, operation) {
                block()
            }
        }
    }
}
```

**Frequency:** 18% of PRs implement retry or circuit breaker patterns

## Implementation Guidelines

### Exception Design Principles

**Create Domain-Specific Exceptions:**
```kotlin
// ✅ Good - Clear, domain-specific
class CartLockedException(cartId: UUID) :
    BusinessRuleException("Cart is locked: $cartId", "cart_locked")

// ❌ Bad - Generic, less useful
throw Exception("Cart error")
```

**Include Context in Exceptions:**
```kotlin
// ✅ Good - Rich context
class InsufficientInventoryException(
    val recipeId: UUID,
    val requested: Int,
    val available: Int
) : BusinessRuleException(
    "Insufficient inventory for recipe $recipeId. Requested: $requested, Available: $available",
    "insufficient_inventory"
)

// ❌ Bad - No context
throw Exception("Not enough inventory")
```

### Error Response Best Practices

**Consistent Error Format:**
```kotlin
// All errors follow same structure
{
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-01-15T10:30:00Z",
  "details": {
    "customerId": "customerId cannot be blank",
    "items": "items cannot be empty"
  }
}
```

**Environment-Specific Detail Level:**
```kotlin
// Show stack traces in development, hide in production
val isDevelopment = config.propertyOrNull("ktor.development")?.getString()?.toBoolean() ?: false

val errorResponse = if (isDevelopment) {
    ErrorResponse(
        message = exception.message ?: "Error",
        code = "ERROR",
        requestId = requestId,
        details = mapOf(
            "exception" to exception::class.qualifiedName!!,
            "stackTrace" to exception.stackTraceToString()
        )
    )
} else {
    ErrorResponse(
        message = "Internal server error",
        code = "ERROR",
        requestId = requestId
    )
}
```

### Logging Best Practices

**Log at Appropriate Levels:**
```kotlin
// Expected errors - WARN
logger.warn("Cart not found: $cartId")

// Unexpected errors - ERROR
logger.error("Database connection failed", exception)

// Informational - INFO
logger.info("Order processed successfully: $orderId")

// Debugging - DEBUG
logger.debug("Processing cart items: ${cart.items.size}")
```

**Include Context in Logs:**
```kotlin
// ✅ Good - Structured logging
logger.error(
    "Order processing failed - " +
    "orderId: $orderId, " +
    "customerId: $customerId, " +
    "reason: ${exception.message}",
    exception
)

// ❌ Bad - Unclear context
logger.error("Error", exception)
```

## Anti-Patterns to Avoid

❌ **Don't catch all exceptions without rethrowing:**
```kotlin
// ❌ Bad - Swallows all errors silently
try {
    orderService.processOrder(orderId)
} catch (e: Exception) {
    logger.error("Error processing order", e)
    // No rethrow - caller has no idea operation failed!
}
```

✅ **Be specific about what to catch:**
```kotlin
// ✅ Good - Catch specific exceptions
try {
    orderService.processOrder(orderId)
} catch (e: PaymentFailedException) {
    logger.warn("Payment failed for order: $orderId", e)
    throw e
} catch (e: InventoryServiceException) {
    logger.error("Inventory service unavailable", e)
    throw ServiceException("Unable to process order", "order-service", e)
}
```

❌ **Don't expose internal errors to clients:**
```kotlin
// ❌ Bad - Exposes internal details
catch (e: SQLException) {
    call.respond(
        HttpStatusCode.InternalServerError,
        ErrorResponse(message = "SQL Error: ${e.message}")
    )
}
```

✅ **Abstract internal errors:**
```kotlin
// ✅ Good - Generic message, detailed logging
catch (e: SQLException) {
    logger.error("Database error processing order: $orderId", e)
    call.respond(
        HttpStatusCode.InternalServerError,
        ErrorResponse(
            message = "Internal server error",
            code = "DATABASE_ERROR",
            requestId = MDC.get("requestId")
        )
    )
}
```

❌ **Don't use exceptions for control flow:**
```kotlin
// ❌ Bad - Exception for expected case
fun findUser(id: UUID): User {
    val user = userRepository.findById(id)
    if (user == null) {
        throw NotFoundException("User not found")
    }
    return user
}

// Called 1000 times in loop - expensive!
users.forEach { userId ->
    try {
        val user = findUser(userId)
        process(user)
    } catch (e: NotFoundException) {
        // Expected case - shouldn't use exception
    }
}
```

✅ **Use nullable returns for expected cases:**
```kotlin
// ✅ Good - Nullable return for expected absence
fun findUser(id: UUID): User? {
    return userRepository.findById(id)
}

users.forEach { userId ->
    findUser(userId)?.let { user ->
        process(user)
    }
}
```

❌ **Don't ignore cleanup in error cases:**
```kotlin
// ❌ Bad - Resource leak on error
suspend fun processFile(file: File) {
    val stream = file.inputStream()
    // If error occurs, stream never closed
    processData(stream.readBytes())
    stream.close()
}
```

✅ **Always clean up resources:**
```kotlin
// ✅ Good - use() ensures cleanup
suspend fun processFile(file: File) {
    file.inputStream().use { stream ->
        processData(stream.readBytes())
    }
}
```

❌ **Don't create exception without message:**
```kotlin
// ❌ Bad - No context
throw ValidationException()

// ❌ Bad - Generic message
throw ValidationException("Error")
```

✅ **Provide clear, actionable messages:**
```kotlin
// ✅ Good - Clear, specific message
throw ValidationException(
    "Cart validation failed",
    mapOf(
        "items" to "Cart must have at least 1 item",
        "customerId" to "Customer ID is required"
    )
)
```

❌ **Don't log and rethrow at every level:**
```kotlin
// ❌ Bad - Log pollution
suspend fun processOrder(orderId: UUID) {
    try {
        validateOrder(orderId)
    } catch (e: ValidationException) {
        logger.error("Validation failed", e)  // Logged here
        throw e
    }
}

suspend fun createOrder(request: CreateOrderRequest) {
    try {
        processOrder(request.orderId)
    } catch (e: ValidationException) {
        logger.error("Order creation failed", e)  // And here
        throw e
    }
}

// StatusPages logs it again!  // And here
```

✅ **Log once at the appropriate level:**
```kotlin
// ✅ Good - Log at entry point only
suspend fun processOrder(orderId: UUID) {
    validateOrder(orderId)  // Let exception bubble
}

suspend fun createOrder(request: CreateOrderRequest) {
    processOrder(request.orderId)  // Let exception bubble
}

// StatusPages logs once with full context
```

## Related Implementers

- **rest-api.md** - StatusPages integration and error responses
- **domain-modeling.md** - Domain exceptions and validation
- **coroutines.md** - Error handling in async operations
- **functional-programming.md** - Result types and monadic error handling
- **http-clients.md** - Retry policies and circuit breakers for external calls
- **observability.md** - Error tracking, monitoring, and alerting
