---
domain: observability
description: Observability patterns with SLF4J logging, MDC context, Micrometer metrics, OpenTelemetry integration, and Prometheus monitoring
---

# Observability

Implement comprehensive observability using SLF4J with Logback for structured logging, MDC for correlation IDs, Micrometer metrics with Prometheus registry, OpenTelemetry auto-instrumentation, and distributed tracing patterns.

## Core Patterns

### 1. Structured Logging with SLF4J and Kotlin-Logging

**Pattern:** Use kotlin-logging (mu.KotlinLogging) wrapper for SLF4J with structured logging, MDC context propagation, and log levels based on environment.

**Example from PR #1283:**
```kotlin
// File: meal-selection-service-shared/src/main/kotlin/com/yourcompany/mealselection/service/OrderService.kt
package com.yourcompany.mealselection.service

import com.yourcompany.mealselection.domain.*
import com.yourcompany.mealselection.repository.*
import mu.KotlinLogging
import org.slf4j.MDC
import java.util.UUID

private val logger = KotlinLogging.logger {}

class OrderService(
    private val orderRepository: OrderRepository,
    private val cartRepository: CartRepository,
    private val eventPublisher: EventPublisher
) {
    /**
     * Process order with structured logging and MDC context
     */
    suspend fun processOrder(orderId: UUID, customerId: UUID): Order {
        // Add correlation context for all logs in this request
        MDC.put("orderId", orderId.toString())
        MDC.put("customerId", customerId.toString())

        try {
            logger.info { "Starting order processing orderId=$orderId customerId=$customerId" }

            val cart = cartRepository.findByCustomerId(customerId)
                ?: throw NotFoundException("Cart not found for customer: $customerId")

            logger.debug { "Found cart cartId=${cart.id} itemCount=${cart.items.size}" }

            val order = Order.fromCart(cart, orderId)

            logger.debug { "Created order from cart totalAmount=${order.totalAmount}" }

            val savedOrder = orderRepository.save(order)

            logger.info {
                "Order processing completed successfully orderId=$orderId " +
                "status=${savedOrder.status} totalAmount=${savedOrder.totalAmount}"
            }

            eventPublisher.publish(OrderCreatedEvent(savedOrder))

            return savedOrder
        } catch (e: Exception) {
            logger.error(e) { "Order processing failed orderId=$orderId customerId=$customerId" }
            throw e
        } finally {
            // Always clear MDC to prevent context leaks
            MDC.clear()
        }
    }

    /**
     * Batch processing with individual error logging
     */
    suspend fun processBatchOrders(orderIds: List<UUID>): BatchResult {
        logger.info { "Starting batch order processing count=${orderIds.size}" }

        val results = orderIds.mapIndexed { index, orderId ->
            MDC.put("batchIndex", index.toString())
            MDC.put("orderId", orderId.toString())

            try {
                val order = orderRepository.findById(orderId)
                    ?: throw NotFoundException("Order not found: $orderId")

                processOrder(order.id, order.customerId)
                logger.debug { "Batch order processed successfully index=$index orderId=$orderId" }
                BatchResult.Success(orderId)
            } catch (e: Exception) {
                logger.warn(e) { "Batch order processing failed index=$index orderId=$orderId error=${e.message}" }
                BatchResult.Failure(orderId, e.message ?: "Unknown error")
            } finally {
                MDC.remove("batchIndex")
                MDC.remove("orderId")
            }
        }

        val successCount = results.count { it is BatchResult.Success }
        val failureCount = results.count { it is BatchResult.Failure }

        logger.info {
            "Batch order processing completed totalCount=${orderIds.size} " +
            "successCount=$successCount failureCount=$failureCount"
        }

        return BatchResult(results)
    }

    /**
     * Log with different levels based on conditions
     */
    suspend fun validateOrder(orderId: UUID): ValidationResult {
        MDC.put("orderId", orderId.toString())

        try {
            val order = orderRepository.findById(orderId)
                ?: return ValidationResult.NotFound.also {
                    logger.warn { "Validation failed: order not found orderId=$orderId" }
                }

            if (order.items.isEmpty()) {
                logger.warn { "Validation failed: empty order orderId=$orderId" }
                return ValidationResult.Invalid("Order has no items")
            }

            if (order.totalAmount.amount <= 0) {
                logger.error { "Validation failed: invalid total orderId=$orderId totalAmount=${order.totalAmount}" }
                return ValidationResult.Invalid("Invalid total amount")
            }

            logger.debug { "Order validation passed orderId=$orderId" }
            return ValidationResult.Valid
        } finally {
            MDC.clear()
        }
    }
}

sealed class BatchResult {
    data class Success(val orderId: UUID) : BatchResult()
    data class Failure(val orderId: UUID, val error: String) : BatchResult()
}

sealed class ValidationResult {
    object Valid : ValidationResult()
    object NotFound : ValidationResult()
    data class Invalid(val reason: String) : ValidationResult()
}
```

**Frequency:** 100% of services use kotlin-logging wrapper for SLF4J

**Why:** kotlin-logging provides:
- Lazy evaluation of log messages (only evaluated if log level is enabled)
- Kotlin-idiomatic lambda syntax for structured logging
- Automatic toString() handling for objects
- Zero overhead for disabled log levels
- Full compatibility with SLF4J ecosystem

**Log Level Guidelines:**
- `ERROR` - System failures, unrecoverable errors, data corruption
- `WARN` - Recoverable errors, degraded functionality, validation failures
- `INFO` - Business events, request/response summaries, significant state changes
- `DEBUG` - Detailed execution flow, intermediate states, debugging information
- `TRACE` - Very detailed debugging, typically disabled in production

### 2. MDC (Mapped Diagnostic Context) for Correlation

**Pattern:** Use MDC to propagate correlation IDs, user context, and request metadata across threads and coroutines for distributed tracing.

**Example from PR #1274:**
```kotlin
// File: meal-selection-service-api/src/main/kotlin/com/yourcompany/mealselection/api/Application.kt
package com.yourcompany.mealselection.api

import io.ktor.server.application.*
import io.ktor.server.plugins.callloging.*
import io.ktor.server.request.*
import mu.KotlinLogging
import org.slf4j.MDC
import org.slf4j.event.Level
import java.util.UUID
import kotlin.coroutines.CoroutineContext

private val logger = KotlinLogging.logger {}

fun Application.configureObservability() {
    // Install request ID plugin
    install(createApplicationPlugin(name = "RequestIdPlugin") {
        onCall { call ->
            // Extract or generate request ID
            val requestId = call.request.header("X-Request-ID")
                ?: call.request.header("X-Correlation-ID")
                ?: UUID.randomUUID().toString()

            // Set in MDC for all logs in this request
            MDC.put("requestId", requestId)
            MDC.put("method", call.request.httpMethod.value)
            MDC.put("path", call.request.path())

            // Return request ID in response headers
            call.response.headers.append("X-Request-ID", requestId)

            logger.debug { "Request started requestId=$requestId method=${call.request.httpMethod.value} path=${call.request.path()}" }
        }

        onCallRespond { call ->
            val requestId = MDC.get("requestId")
            val status = call.response.status()?.value

            logger.info {
                "Request completed requestId=$requestId " +
                "method=${call.request.httpMethod.value} " +
                "path=${call.request.path()} " +
                "status=$status"
            }

            // Clear MDC after request
            MDC.clear()
        }
    })

    // Install structured logging with MDC
    install(CallLogging) {
        level = Level.INFO

        // Filter out health checks and metrics endpoints
        filter { call ->
            val path = call.request.path()
            !path.startsWith("/health") &&
            !path.startsWith("/metrics") &&
            !path.startsWith("/prometheus")
        }

        // Custom log format with MDC values
        format { call ->
            val requestId = MDC.get("requestId") ?: "unknown"
            val method = call.request.httpMethod.value
            val path = call.request.path()
            val status = call.response.status()?.value ?: "unknown"
            val duration = call.processingTimeMillis()

            "requestId=$requestId method=$method path=$path status=$status duration=${duration}ms"
        }

        // Add MDC entries that will be included in all logs
        mdc("requestId") { call ->
            call.request.header("X-Request-ID") ?: UUID.randomUUID().toString()
        }
        mdc("method") { call -> call.request.httpMethod.value }
        mdc("path") { call -> call.request.path() }
        mdc("userAgent") { call -> call.request.header("User-Agent") ?: "unknown" }
        mdc("remoteHost") { call -> call.request.origin.remoteHost }
    }
}

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
 * Extension function to run suspending code with MDC context
 */
suspend fun <T> withMDC(
    vararg pairs: Pair<String, String>,
    block: suspend () -> T
): T {
    val contextMap = MDC.getCopyOfContextMap()?.toMutableMap() ?: mutableMapOf()
    pairs.forEach { (key, value) -> contextMap[key] = value }

    return withContext(MDCContext(contextMap)) {
        try {
            block()
        } finally {
            pairs.forEach { (key, _) -> MDC.remove(key) }
        }
    }
}

/**
 * Example service using MDC propagation
 */
class UserService(
    private val userRepository: UserRepository,
    private val emailService: EmailService
) {
    private val logger = KotlinLogging.logger {}

    suspend fun createUser(userData: UserData): User = coroutineScope {
        // MDC context automatically propagates to child coroutines
        val userId = UUID.randomUUID()
        MDC.put("userId", userId.toString())

        logger.info { "Creating user userId=$userId email=${userData.email}" }

        val user = userRepository.save(userData.toUser(userId))

        // Launch background task - MDC context is inherited
        launch {
            // This log will include the userId from parent context
            logger.info { "Sending welcome email userId=$userId" }
            emailService.sendWelcomeEmail(user.email)
        }

        logger.info { "User created successfully userId=$userId" }
        user
    }

    suspend fun updateUserPreferences(userId: UUID, preferences: Preferences) {
        withMDC("userId" to userId.toString(), "operation" to "updatePreferences") {
            logger.info { "Updating user preferences" }
            userRepository.updatePreferences(userId, preferences)
            logger.info { "User preferences updated successfully" }
        }
    }
}
```

**Frequency:** 72% of services use MDC for correlation tracking

**Why:** MDC provides:
- Request-scoped context that automatically appears in all logs
- Distributed tracing correlation across microservices
- Easy debugging by searching logs with correlation ID
- Thread-safe context propagation
- Integration with log aggregation systems (ELK, Datadog, etc.)

**Common MDC Keys:**
- `requestId` - Unique identifier for each request
- `userId` / `customerId` - User/customer context
- `orderId` / `cartId` - Business entity context
- `method` / `path` - HTTP request information
- `traceId` / `spanId` - Distributed tracing identifiers

### 3. Micrometer Metrics with Prometheus

**Pattern:** Use Micrometer for application metrics with Prometheus registry, tracking counters, gauges, timers, and distribution summaries.

**Example from PR #1335:**
```kotlin
// File: meal-selection-service-shared/src/main/kotlin/com/yourcompany/mealselection/metrics/MetricsProvider.kt
package com.yourcompany.mealselection.metrics

import io.micrometer.core.instrument.*
import io.micrometer.prometheus.PrometheusConfig
import io.micrometer.prometheus.PrometheusMeterRegistry
import mu.KotlinLogging

private val logger = KotlinLogging.logger {}

/**
 * Centralized metrics provider using Micrometer with Prometheus registry
 */
object MetricsProvider {
    private val registry: PrometheusMeterRegistry by lazy {
        PrometheusMeterRegistry(PrometheusConfig.DEFAULT).apply {
            config().commonTags(
                "application", "meal-selection-service",
                "environment", System.getenv("ENVIRONMENT") ?: "unknown"
            )
        }
    }

    /**
     * Get the Prometheus registry for scraping
     */
    fun getRegistry(): PrometheusMeterRegistry = registry

    /**
     * Get the scrape endpoint content
     */
    fun scrape(): String = registry.scrape()

    /**
     * Create or get a counter metric
     */
    fun counter(
        name: String,
        description: String,
        vararg tags: Pair<String, String>
    ): Counter {
        return Counter.builder(name)
            .description(description)
            .tags(tags.flatMap { listOf(it.first, it.second) })
            .register(registry)
    }

    /**
     * Create or get a gauge metric
     */
    fun <T> gauge(
        name: String,
        description: String,
        obj: T,
        valueFunction: (T) -> Number,
        vararg tags: Pair<String, String>
    ): T {
        Gauge.builder(name, obj, valueFunction)
            .description(description)
            .tags(tags.flatMap { listOf(it.first, it.second) })
            .register(registry)
        return obj
    }

    /**
     * Create or get a timer metric
     */
    fun timer(
        name: String,
        description: String,
        vararg tags: Pair<String, String>
    ): Timer {
        return Timer.builder(name)
            .description(description)
            .tags(tags.flatMap { listOf(it.first, it.second) })
            .register(registry)
    }

    /**
     * Create or get a distribution summary metric
     */
    fun distributionSummary(
        name: String,
        description: String,
        vararg tags: Pair<String, String>
    ): DistributionSummary {
        return DistributionSummary.builder(name)
            .description(description)
            .tags(tags.flatMap { listOf(it.first, it.second) })
            .register(registry)
    }

    /**
     * Record a counter increment
     */
    fun incrementCounter(
        name: String,
        description: String = "",
        vararg tags: Pair<String, String>
    ) {
        counter(name, description, *tags).increment()
    }

    /**
     * Record a timer with automatic measurement
     */
    suspend fun <T> recordTimer(
        name: String,
        description: String = "",
        vararg tags: Pair<String, String>,
        block: suspend () -> T
    ): T {
        val sample = Timer.start(registry)
        return try {
            block()
        } finally {
            sample.stop(timer(name, description, *tags))
        }
    }
}

/**
 * Service using metrics
 */
class CartService(
    private val cartRepository: CartRepository,
    private val validationService: ValidationService
) {
    private val logger = KotlinLogging.logger {}

    // Define metrics as class properties
    private val cartCreatedCounter = MetricsProvider.counter(
        name = "meal_selection_service_cart_created_total",
        description = "Total number of carts created",
        "operation" to "create"
    )

    private val cartValidationCounter = MetricsProvider.counter(
        name = "meal_selection_service_validation_failure_count_total",
        description = "Total number of validation failures"
    )

    private val cartSizeGauge = MetricsProvider.gauge(
        name = "meal_selection_service_cart_items_gauge",
        description = "Number of items in cart",
        obj = this,
        valueFunction = { 0.0 } // Will be updated dynamically
    )

    private val cartProcessingTimer = MetricsProvider.timer(
        name = "meal_selection_service_cart_processing_duration_seconds",
        description = "Time taken to process cart operations"
    )

    /**
     * Create cart with metrics
     */
    suspend fun createCart(customerId: UUID, items: List<CartItem>): Cart {
        return MetricsProvider.recordTimer(
            name = "meal_selection_service_cart_processing_duration_seconds",
            description = "Time taken to create cart",
            "operation" to "create",
            "market_code" to extractMarketCode(customerId)
        ) {
            logger.info { "Creating cart customerId=$customerId itemCount=${items.size}" }

            try {
                // Validate cart
                validationService.validateCart(items)

                val cart = Cart(
                    id = UUID.randomUUID(),
                    customerId = customerId,
                    items = items,
                    createdAt = Instant.now()
                )

                val savedCart = cartRepository.save(cart)

                // Increment success counter
                MetricsProvider.incrementCounter(
                    name = "meal_selection_service_cart_created_total",
                    description = "Carts created successfully",
                    "operation" to "create",
                    "market_code" to extractMarketCode(customerId),
                    "status" to "success"
                )

                // Record cart size distribution
                MetricsProvider.distributionSummary(
                    name = "meal_selection_service_cart_size_distribution",
                    description = "Distribution of cart sizes",
                    "market_code" to extractMarketCode(customerId)
                ).record(items.size.toDouble())

                logger.info { "Cart created successfully cartId=${savedCart.id}" }
                savedCart
            } catch (e: ItemLimitExceededException) {
                logger.warn { "Cart creation failed: item limit exceeded customerId=$customerId" }

                MetricsProvider.incrementCounter(
                    name = "meal_selection_service_validation_failure_count_total",
                    description = "Validation failures",
                    "operation" to "save",
                    "market_code" to extractMarketCode(customerId),
                    "reason" to "item_limit_exceeded"
                )

                throw e
            } catch (e: CartLimitExceededException) {
                logger.warn { "Cart creation failed: cart limit exceeded customerId=$customerId" }

                MetricsProvider.incrementCounter(
                    name = "meal_selection_service_validation_failure_count_total",
                    description = "Validation failures",
                    "operation" to "save",
                    "market_code" to extractMarketCode(customerId),
                    "reason" to "cart_limit_exceeded"
                )

                throw e
            } catch (e: Exception) {
                logger.error(e) { "Cart creation failed unexpectedly customerId=$customerId" }

                MetricsProvider.incrementCounter(
                    name = "meal_selection_service_cart_created_total",
                    description = "Cart creation attempts",
                    "operation" to "create",
                    "market_code" to extractMarketCode(customerId),
                    "status" to "error"
                )

                throw e
            }
        }
    }

    /**
     * Get cart with cache hit/miss metrics
     */
    suspend fun getCart(cartId: UUID): Cart? {
        val cached = cacheService.get(cartId)

        if (cached != null) {
            MetricsProvider.incrementCounter(
                name = "meal_selection_service_cache_hits_total",
                description = "Cache hits",
                "cache" to "cart"
            )
            return cached
        }

        MetricsProvider.incrementCounter(
            name = "meal_selection_service_cache_misses_total",
            description = "Cache misses",
            "cache" to "cart"
        )

        return cartRepository.findById(cartId)
    }

    private fun extractMarketCode(customerId: UUID): String {
        // Extract market code logic
        return "us" // Simplified
    }
}

/**
 * Exception classes for validation failures
 */
class ItemLimitExceededException(
    val itemType: String,
    val limit: Int,
    val actual: Int
) : RuntimeException("Item limit exceeded for $itemType: limit=$limit, actual=$actual")

class CartLimitExceededException(
    val limitType: String,
    val limit: Int,
    val actual: Int
) : RuntimeException("Cart limit exceeded for $limitType: limit=$limit, actual=$actual")
```

**Frequency:** 44% of services implement Micrometer metrics

**Why:** Micrometer provides:
- Vendor-neutral metrics facade
- Native Prometheus integration
- Multiple metric types (counter, gauge, timer, summary)
- Automatic JVM and system metrics
- Easy integration with monitoring systems

**Metric Types:**
- **Counter** - Monotonically increasing value (requests, errors, events)
- **Gauge** - Current value that can go up or down (queue size, active connections)
- **Timer** - Duration and rate of events (request latency, operation duration)
- **Distribution Summary** - Distribution of values (request size, response size)

**Metric Naming Convention:**
```
<namespace>_<subsystem>_<metric>_<unit>_<type>
```

Examples:
- `meal_selection_service_cart_created_total` - Counter
- `meal_selection_service_validation_failure_count_total` - Counter
- `meal_selection_service_cart_processing_duration_seconds` - Timer
- `meal_selection_service_cache_hits_total` - Counter

### 4. OpenTelemetry Auto-Instrumentation

**Pattern:** Use OpenTelemetry Java agent for automatic instrumentation of HTTP requests, database calls, and distributed tracing.

**Example from PR #1265:**
```kotlin
// File: meal-selection-service-handlers/src/main/kotlin/com/yourcompany/mealselection/handlers/Application.kt
package com.yourcompany.mealselection.handlers

import io.opentelemetry.api.GlobalOpenTelemetry
import io.opentelemetry.api.trace.Span
import io.opentelemetry.api.trace.SpanKind
import io.opentelemetry.api.trace.Tracer
import io.opentelemetry.context.Context
import mu.KotlinLogging
import kotlin.system.measureTimeMillis

private val logger = KotlinLogging.logger {}

/**
 * OpenTelemetry integration for distributed tracing
 */
object OpenTelemetryConfig {
    private val tracer: Tracer by lazy {
        GlobalOpenTelemetry.getTracer("meal-selection-service", "1.0.0")
    }

    fun getTracer(): Tracer = tracer

    /**
     * Create a span for manual instrumentation
     */
    fun <T> withSpan(
        operationName: String,
        attributes: Map<String, String> = emptyMap(),
        block: (Span) -> T
    ): T {
        val span = tracer.spanBuilder(operationName)
            .setSpanKind(SpanKind.INTERNAL)
            .startSpan()

        return try {
            // Add attributes to span
            attributes.forEach { (key, value) ->
                span.setAttribute(key, value)
            }

            // Make span current in context
            Context.current().with(span).makeCurrent().use {
                block(span)
            }
        } catch (e: Exception) {
            // Record exception in span
            span.recordException(e)
            span.setStatus(io.opentelemetry.api.trace.StatusCode.ERROR, e.message ?: "Error")
            throw e
        } finally {
            span.end()
        }
    }

    /**
     * Create a span for suspend functions
     */
    suspend fun <T> withSpanSuspend(
        operationName: String,
        attributes: Map<String, String> = emptyMap(),
        block: suspend (Span) -> T
    ): T {
        val span = tracer.spanBuilder(operationName)
            .setSpanKind(SpanKind.INTERNAL)
            .startSpan()

        return try {
            attributes.forEach { (key, value) ->
                span.setAttribute(key, value)
            }

            Context.current().with(span).makeCurrent().use {
                block(span)
            }
        } catch (e: Exception) {
            span.recordException(e)
            span.setStatus(io.opentelemetry.api.trace.StatusCode.ERROR, e.message ?: "Error")
            throw e
        } finally {
            span.end()
        }
    }
}

/**
 * Handler with OpenTelemetry instrumentation
 */
class MealPlansHandler(
    private val mealPlansService: MealPlansService,
    private val cartRepository: CartRepository
) {
    private val logger = KotlinLogging.logger {}

    /**
     * Handle meal plan event with tracing
     */
    suspend fun handleMealPlanEvent(event: MealPlanEvent) {
        OpenTelemetryConfig.withSpanSuspend(
            operationName = "handle_meal_plan_event",
            attributes = mapOf(
                "event.type" to event.type.name,
                "event.id" to event.id.toString(),
                "menu.id" to event.menuId,
                "customer.plan.id" to event.customerPlanId
            )
        ) { span ->
            val duration = measureTimeMillis {
                logger.info {
                    "Processing meal plan event " +
                    "eventType=${event.type} " +
                    "eventId=${event.id} " +
                    "menuId=${event.menuId}"
                }

                try {
                    // Process event
                    when (event.type) {
                        EventType.MEAL_PLAN_CREATED -> handleMealPlanCreated(event, span)
                        EventType.MEAL_PLAN_UPDATED -> handleMealPlanUpdated(event, span)
                        EventType.MEAL_PLAN_DELETED -> handleMealPlanDeleted(event, span)
                    }

                    // Add success attribute
                    span.setAttribute("event.status", "success")

                    logger.info { "Meal plan event processed successfully eventId=${event.id}" }
                } catch (e: Exception) {
                    span.setAttribute("event.status", "failed")
                    span.setAttribute("error.message", e.message ?: "Unknown error")
                    logger.error(e) { "Failed to process meal plan event eventId=${event.id}" }
                    throw e
                }
            }

            // Record duration
            span.setAttribute("event.duration.ms", duration)

            logger.debug { "Event processing took ${duration}ms eventId=${event.id}" }
        }
    }

    private suspend fun handleMealPlanCreated(event: MealPlanEvent, parentSpan: Span) {
        OpenTelemetryConfig.withSpanSuspend(
            operationName = "create_cart_from_meal_plan",
            attributes = mapOf(
                "menu.id" to event.menuId,
                "customer.plan.id" to event.customerPlanId
            )
        ) { span ->
            val cart = cartRepository.findByMenuId(event.menuId)

            if (cart != null) {
                span.setAttribute("cart.id", cart.id.toString())
                span.setAttribute("cart.items.count", cart.items.size.toLong())
                logger.debug { "Found existing cart cartId=${cart.id}" }
            } else {
                logger.debug { "No cart found, creating new cart" }
                val newCart = cartRepository.create(event.toCart())
                span.setAttribute("cart.id", newCart.id.toString())
                span.setAttribute("cart.created", true)
            }
        }
    }

    private suspend fun handleMealPlanUpdated(event: MealPlanEvent, parentSpan: Span) {
        OpenTelemetryConfig.withSpanSuspend(
            operationName = "update_cart_from_meal_plan"
        ) { span ->
            val cart = cartRepository.findByMenuId(event.menuId)
                ?: throw NotFoundException("Cart not found for menuId: ${event.menuId}")

            span.setAttribute("cart.id", cart.id.toString())
            span.setAttribute("cart.items.before", cart.items.size.toLong())

            val updatedCart = cart.copy(items = event.toCartItems())
            cartRepository.update(updatedCart)

            span.setAttribute("cart.items.after", updatedCart.items.size.toLong())
        }
    }

    private suspend fun handleMealPlanDeleted(event: MealPlanEvent, parentSpan: Span) {
        OpenTelemetryConfig.withSpanSuspend(
            operationName = "delete_cart_from_meal_plan"
        ) { span ->
            val cart = cartRepository.findByMenuId(event.menuId)

            if (cart != null) {
                span.setAttribute("cart.id", cart.id.toString())
                cartRepository.delete(cart.id)
                span.setAttribute("cart.deleted", true)
            } else {
                span.setAttribute("cart.deleted", false)
                logger.debug { "No cart to delete for menuId=${event.menuId}" }
            }
        }
    }
}
```

**Helm Configuration for OpenTelemetry:**
```yaml
# File: meal-selection-service-helm/src/main/helm/values-staging.yaml
handlers:
  image:
    repository: yourcompany/meal-selection-service-handlers
    tag: latest

  env:
    - name: OTEL_EXPORTER_OTLP_ENDPOINT
      value: "http://otel-collector:4317"
    - name: OTEL_SERVICE_NAME
      value: "meal-selection-service-handlers"
    - name: OTEL_RESOURCE_ATTRIBUTES
      value: "service.version=1.0.0,deployment.environment=staging"
    - name: OTEL_TRACES_SAMPLER
      value: "parentbased_traceidratio"
    - name: OTEL_TRACES_SAMPLER_ARG
      value: "0.1"  # Sample 10% of traces
    - name: OTEL_METRICS_EXPORTER
      value: "prometheus"
    - name: OTEL_EXPORTER_PROMETHEUS_PORT
      value: "9464"
    - name: OTEL_EXPORTER_PROMETHEUS_HOST
      value: "0.0.0.0"

  # Java agent for auto-instrumentation
  javaOpts: >-
    -javaagent:/opt/opentelemetry-javaagent.jar
    -Dotel.javaagent.extensions=/opt/otel-extensions.jar

  # Prometheus scraping annotations
  podAnnotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "9464"
    prometheus.io/path: "/metrics"

  # Service monitor for Prometheus operator
  serviceMonitor:
    enabled: true
    interval: 30s
    scrapeTimeout: 10s
    path: /metrics
    port: metrics
```

**Frequency:** 44% of modules use OpenTelemetry for distributed tracing

**Why:** OpenTelemetry provides:
- Automatic instrumentation of common libraries (HTTP, gRPC, JDBC)
- Vendor-neutral tracing standard
- Context propagation across services
- Integration with multiple backends (Jaeger, Zipkin, Datadog)
- Comprehensive metric and trace collection

### 5. Prometheus Metrics Exposure

**Pattern:** Expose Prometheus metrics endpoint using Ktor plugin or OpenTelemetry exporter for scraping.

**Example from PR #1276:**
```kotlin
// File: meal-selection-service-sinkers/src/main/kotlin/com/yourcompany/mealselection/sinkers/Application.kt
package com.yourcompany.mealselection.sinkers

import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.server.metrics.micrometer.*
import io.micrometer.prometheus.PrometheusConfig
import io.micrometer.prometheus.PrometheusMeterRegistry
import mu.KotlinLogging

private val logger = KotlinLogging.logger {}

fun main() {
    val prometheusRegistry = PrometheusMeterRegistry(PrometheusConfig.DEFAULT)

    embeddedServer(
        Netty,
        port = 8081,
        host = "0.0.0.0"
    ) {
        configureMonitoring(prometheusRegistry)
        configureRouting()
    }.start(wait = true)
}

fun Application.configureMonitoring(appMicrometerRegistry: PrometheusMeterRegistry) {
    // Install Micrometer plugin
    install(MicrometerMetrics) {
        registry = appMicrometerRegistry

        // Enable JVM metrics
        meterBinders = listOf(
            io.micrometer.core.instrument.binder.jvm.ClassLoaderMetrics(),
            io.micrometer.core.instrument.binder.jvm.JvmMemoryMetrics(),
            io.micrometer.core.instrument.binder.jvm.JvmGcMetrics(),
            io.micrometer.core.instrument.binder.jvm.JvmThreadMetrics(),
            io.micrometer.core.instrument.binder.system.ProcessorMetrics(),
            io.micrometer.core.instrument.binder.system.FileDescriptorMetrics()
        )
    }

    // Expose Prometheus endpoint
    routing {
        get("/prometheus") {
            call.respond(appMicrometerRegistry.scrape())
        }

        get("/metrics") {
            call.respond(appMicrometerRegistry.scrape())
        }

        // Health check endpoint
        get("/health") {
            call.respond(mapOf("status" to "healthy"))
        }

        // Readiness check endpoint
        get("/ready") {
            val isReady = checkReadiness()
            if (isReady) {
                call.respond(mapOf("status" to "ready"))
            } else {
                call.respond(HttpStatusCode.ServiceUnavailable, mapOf("status" to "not ready"))
            }
        }

        // Liveness check endpoint
        get("/live") {
            call.respond(mapOf("status" to "alive"))
        }
    }

    logger.info { "Monitoring endpoints configured at /prometheus, /health, /ready, /live" }
}

private fun checkReadiness(): Boolean {
    // Check if service is ready to accept traffic
    // - Database connections are healthy
    // - Kafka consumers are running
    // - External dependencies are reachable
    return true // Simplified
}

/**
 * ListenerService with dual metrics support (OTEL + Micrometer)
 */
abstract class ListenerService<K, V>(
    protected var consumer: Consumer<K, V>,
    protected val retryConfig: ListenerServiceRetryConfig = retryConfig(),
    private val metricsProvider: MetricsProvider? = null
) : Stoppable {
    protected val isRunning: AtomicBoolean = AtomicBoolean(true)
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private lateinit var job: Job

    // OpenTelemetry metrics (always available via agent)
    private val otelMeter = GlobalOpenTelemetry.getMeter("meal-selection-service")
    private val messagesProcessedCounter = otelMeter
        .counterBuilder("listener_messages_processed_total")
        .setDescription("Total number of messages processed")
        .build()

    private val messagesFailedCounter = otelMeter
        .counterBuilder("listener_messages_failed_total")
        .setDescription("Total number of messages that failed processing")
        .build()

    // Micrometer metrics (optional, for backward compatibility)
    private val micrometerProcessedCounter = metricsProvider?.counter(
        name = "listener_messages_processed_total",
        description = "Total number of messages processed"
    )

    private val micrometerFailedCounter = metricsProvider?.counter(
        name = "listener_messages_failed_total",
        description = "Total number of messages that failed processing"
    )

    protected suspend fun processRecords(records: List<ConsumerRecord<K, V>>) {
        records.forEach { record ->
            try {
                processRecord(record)

                // Record success in both systems
                messagesProcessedCounter.add(
                    1,
                    Attributes.of(
                        AttributeKey.stringKey("topic"), record.topic(),
                        AttributeKey.stringKey("status"), "success"
                    )
                )

                micrometerProcessedCounter?.increment()

                logger.debug {
                    "Record processed successfully " +
                    "topic=${record.topic()} " +
                    "partition=${record.partition()} " +
                    "offset=${record.offset()}"
                }
            } catch (e: Exception) {
                // Record failure in both systems
                messagesFailedCounter.add(
                    1,
                    Attributes.of(
                        AttributeKey.stringKey("topic"), record.topic(),
                        AttributeKey.stringKey("error"), e::class.simpleName ?: "Unknown"
                    )
                )

                micrometerFailedCounter?.increment()

                logger.error(e) {
                    "Record processing failed " +
                    "topic=${record.topic()} " +
                    "partition=${record.partition()} " +
                    "offset=${record.offset()}"
                }

                throw e
            }
        }
    }

    abstract suspend fun processRecord(record: ConsumerRecord<K, V>)
}
```

**Frequency:** 84% of modules expose Prometheus metrics

**Why:** Prometheus metrics provide:
- Standard scraping format for monitoring
- Time-series data collection
- Integration with Grafana dashboards
- Alerting based on metric thresholds
- Long-term metric storage

**Standard Endpoints:**
- `/prometheus` or `/metrics` - Prometheus scrape endpoint
- `/health` - Basic health check
- `/ready` - Readiness probe (can accept traffic)
- `/live` - Liveness probe (process is alive)

### 6. Grafana Dashboard Integration

**Pattern:** Create Grafana dashboards using Prometheus metrics for service monitoring, alerting, and visualization.

**Example Dashboard JSON (conceptual):**
```yaml
# File: meal-selection-service-helm/src/main/helm/grafana-dashboard.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: meal-selection-service-dashboard
  labels:
    grafana_dashboard: "1"
data:
  dashboard.json: |
    {
      "dashboard": {
        "title": "Meal Selection Service - Overview",
        "panels": [
          {
            "title": "Request Rate",
            "targets": [
              {
                "expr": "rate(http_server_requests_total{application=\"meal-selection-service\"}[5m])",
                "legendFormat": "{{method}} {{path}}"
              }
            ],
            "type": "graph"
          },
          {
            "title": "Request Duration (p95)",
            "targets": [
              {
                "expr": "histogram_quantile(0.95, rate(http_server_requests_seconds_bucket{application=\"meal-selection-service\"}[5m]))",
                "legendFormat": "{{method}} {{path}}"
              }
            ],
            "type": "graph"
          },
          {
            "title": "Error Rate",
            "targets": [
              {
                "expr": "rate(http_server_requests_total{application=\"meal-selection-service\",status=~\"5..\"}[5m])",
                "legendFormat": "{{method}} {{path}} {{status}}"
              }
            ],
            "type": "graph"
          },
          {
            "title": "Validation Failures",
            "targets": [
              {
                "expr": "rate(meal_selection_service_validation_failure_count_total[5m])",
                "legendFormat": "{{reason}} {{market_code}}"
              }
            ],
            "type": "graph"
          },
          {
            "title": "Cart Processing Duration",
            "targets": [
              {
                "expr": "histogram_quantile(0.95, rate(meal_selection_service_cart_processing_duration_seconds_bucket[5m]))",
                "legendFormat": "{{operation}} p95"
              },
              {
                "expr": "histogram_quantile(0.99, rate(meal_selection_service_cart_processing_duration_seconds_bucket[5m]))",
                "legendFormat": "{{operation}} p99"
              }
            ],
            "type": "graph"
          },
          {
            "title": "Kafka Consumer Lag",
            "targets": [
              {
                "expr": "kafka_consumer_lag{application=\"meal-selection-service\"}",
                "legendFormat": "{{topic}} {{partition}}"
              }
            ],
            "type": "graph"
          },
          {
            "title": "JVM Memory Usage",
            "targets": [
              {
                "expr": "jvm_memory_used_bytes{application=\"meal-selection-service\",area=\"heap\"}",
                "legendFormat": "Heap Used"
              },
              {
                "expr": "jvm_memory_max_bytes{application=\"meal-selection-service\",area=\"heap\"}",
                "legendFormat": "Heap Max"
              }
            ],
            "type": "graph"
          },
          {
            "title": "GC Pause Time",
            "targets": [
              {
                "expr": "rate(jvm_gc_pause_seconds_sum{application=\"meal-selection-service\"}[5m])",
                "legendFormat": "{{action}} {{cause}}"
              }
            ],
            "type": "graph"
          }
        ]
      }
    }
```

**Prometheus Alerts Configuration:**
```yaml
# File: prometheus-alerts.yaml
groups:
  - name: meal-selection-service
    interval: 30s
    rules:
      # High error rate alert
      - alert: HighErrorRate
        expr: |
          rate(http_server_requests_total{
            application="meal-selection-service",
            status=~"5.."
          }[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
          team: shopping-foundation
        annotations:
          summary: "High error rate detected in {{ $labels.application }}"
          description: "Error rate is {{ $value | humanizePercentage }} for {{ $labels.method }} {{ $labels.path }}"

      # Slow request latency alert
      - alert: HighRequestLatency
        expr: |
          histogram_quantile(0.95,
            rate(http_server_requests_seconds_bucket{
              application="meal-selection-service"
            }[5m])
          ) > 2
        for: 5m
        labels:
          severity: warning
          team: shopping-foundation
        annotations:
          summary: "High request latency in {{ $labels.application }}"
          description: "P95 latency is {{ $value }}s for {{ $labels.method }} {{ $labels.path }}"

      # Validation failure spike
      - alert: ValidationFailureSpike
        expr: |
          rate(meal_selection_service_validation_failure_count_total[5m]) > 10
        for: 5m
        labels:
          severity: info
          team: shopping-foundation
        annotations:
          summary: "Validation failure spike in {{ $labels.application }}"
          description: "Validation failures: {{ $value }}/s for reason={{ $labels.reason }} market={{ $labels.market_code }}"

      # High Kafka consumer lag
      - alert: HighKafkaConsumerLag
        expr: |
          kafka_consumer_lag{
            application="meal-selection-service"
          } > 10000
        for: 10m
        labels:
          severity: warning
          team: shopping-foundation
        annotations:
          summary: "High Kafka consumer lag in {{ $labels.application }}"
          description: "Consumer lag is {{ $value }} messages for topic={{ $labels.topic }}"

      # Service down
      - alert: ServiceDown
        expr: up{application="meal-selection-service"} == 0
        for: 1m
        labels:
          severity: critical
          team: shopping-foundation
        annotations:
          summary: "Service {{ $labels.application }} is down"
          description: "Instance {{ $labels.instance }} has been down for more than 1 minute"

      # High memory usage
      - alert: HighMemoryUsage
        expr: |
          (jvm_memory_used_bytes{
            application="meal-selection-service",
            area="heap"
          } / jvm_memory_max_bytes{
            application="meal-selection-service",
            area="heap"
          }) > 0.85
        for: 5m
        labels:
          severity: warning
          team: shopping-foundation
        annotations:
          summary: "High memory usage in {{ $labels.application }}"
          description: "Heap memory usage is {{ $value | humanizePercentage }}"
```

**Frequency:** 36% of services have Grafana dashboard configurations

**Why:** Grafana dashboards provide:
- Real-time visualization of service metrics
- Historical trend analysis
- Alerting based on metric thresholds
- Custom dashboard creation
- Multi-service monitoring

## Implementation Guidelines

### Logging Best Practices

**Use Structured Logging:**
```kotlin
// ✅ Good - Structured key-value pairs
logger.info { "Order created orderId=$orderId customerId=$customerId totalAmount=${order.totalAmount}" }

// ❌ Bad - Unstructured text
logger.info { "Order $orderId was created for customer $customerId with total ${order.totalAmount}" }
```

**Log at Appropriate Levels:**
```kotlin
class OrderService {
    // ERROR: System failures, data corruption
    logger.error(e) { "Database connection failed orderId=$orderId" }

    // WARN: Recoverable errors, degraded functionality
    logger.warn { "External service timeout, using cached data orderId=$orderId" }

    // INFO: Business events, significant state changes
    logger.info { "Order status changed orderId=$orderId oldStatus=$oldStatus newStatus=$newStatus" }

    // DEBUG: Detailed execution flow
    logger.debug { "Fetching order from repository orderId=$orderId" }

    // TRACE: Very detailed debugging (rarely used)
    logger.trace { "Raw database result: $rawData" }
}
```

**Include Context in Logs:**
```kotlin
suspend fun processOrder(orderId: UUID) {
    // Add context to MDC
    MDC.put("orderId", orderId.toString())

    try {
        logger.info { "Processing order" } // orderId is in MDC

        // All logs in this scope will include orderId
        val order = orderRepository.findById(orderId)
        logger.debug { "Order fetched from database" }

        processPayment(order)
        logger.debug { "Payment processed" }

        shipOrder(order)
        logger.info { "Order shipped successfully" }
    } finally {
        MDC.clear()
    }
}
```

### Metrics Best Practices

**Choose the Right Metric Type:**
```kotlin
// Counter - Monotonically increasing
val requestCounter = MetricsProvider.counter(
    name = "http_requests_total",
    description = "Total HTTP requests"
)

// Gauge - Current value
val queueSizeGauge = MetricsProvider.gauge(
    name = "queue_size",
    description = "Current queue size",
    obj = queue,
    valueFunction = { it.size.toDouble() }
)

// Timer - Duration and rate
val processingTimer = MetricsProvider.timer(
    name = "order_processing_duration_seconds",
    description = "Time to process orders"
)

// Distribution Summary - Value distribution
val requestSizeSummary = MetricsProvider.distributionSummary(
    name = "request_size_bytes",
    description = "HTTP request size distribution"
)
```

**Use Meaningful Tags:**
```kotlin
// ✅ Good - Specific, useful tags
MetricsProvider.incrementCounter(
    name = "cart_validation_failures_total",
    "reason" to "item_limit_exceeded",
    "market_code" to "us",
    "operation" to "save"
)

// ❌ Bad - Too many cardinality tags
MetricsProvider.incrementCounter(
    name = "cart_validation_failures_total",
    "customer_id" to customerId.toString(),  // High cardinality!
    "timestamp" to Instant.now().toString()  // Unique per call!
)
```

### MDC Best Practices

**Always Clear MDC:**
```kotlin
// ✅ Good - Use try-finally
suspend fun handleRequest(requestId: String) {
    MDC.put("requestId", requestId)
    try {
        processRequest()
    } finally {
        MDC.clear() // Always clear
    }
}

// ✅ Better - Use helper function
suspend fun handleRequest(requestId: String) {
    withMDC("requestId" to requestId) {
        processRequest()
    }
}
```

**Propagate MDC in Coroutines:**
```kotlin
suspend fun processOrders(orderIds: List<UUID>) = coroutineScope {
    val contextMap = MDC.getCopyOfContextMap()

    orderIds.map { orderId ->
        async(MDCContext(contextMap)) {
            MDC.put("orderId", orderId.toString())
            try {
                processOrder(orderId)
            } finally {
                MDC.remove("orderId")
            }
        }
    }.awaitAll()
}
```

### Testing Observability

**Test Metrics:**
```kotlin
class CartServiceTest : DescribeSpec({
    val metricsRegistry = SimpleMeterRegistry()
    val cartService = CartService(
        cartRepository = mockk(),
        metricsRegistry = metricsRegistry
    )

    describe("createCart") {
        it("should increment cart created counter") {
            coEvery { cartRepository.save(any()) } returns mockCart()

            cartService.createCart(customerId, items)

            val counter = metricsRegistry.find("cart_created_total").counter()
            counter shouldNotBe null
            counter!!.count() shouldBe 1.0
        }

        it("should record cart processing duration") {
            coEvery { cartRepository.save(any()) } returns mockCart()

            cartService.createCart(customerId, items)

            val timer = metricsRegistry.find("cart_processing_duration_seconds").timer()
            timer shouldNotBe null
            timer!!.count() shouldBe 1L
            timer.totalTime(TimeUnit.MILLISECONDS) shouldBeGreaterThan 0.0
        }
    }
})
```

**Test Logging:**
```kotlin
class OrderServiceTest : DescribeSpec({
    val logCaptor = TestAppender()

    beforeSpec {
        val logger = LoggerFactory.getLogger(OrderService::class.java) as ch.qos.logback.classic.Logger
        logger.addAppender(logCaptor)
        logCaptor.start()
    }

    afterSpec {
        logCaptor.stop()
    }

    describe("processOrder") {
        it("should log order processing") {
            orderService.processOrder(orderId, customerId)

            logCaptor.events.any { event ->
                event.level == Level.INFO &&
                event.message.contains("Order processing completed") &&
                event.mdcPropertyMap["orderId"] == orderId.toString()
            } shouldBe true
        }
    }
})

class TestAppender : AppenderBase<ILoggingEvent>() {
    val events = mutableListOf<ILoggingEvent>()

    override fun append(event: ILoggingEvent) {
        events.add(event)
    }
}
```

## Anti-Patterns to Avoid

❌ **Don't log sensitive data:**
```kotlin
// ❌ Bad - Logs password and credit card
logger.info { "User login: email=${user.email} password=${user.password}" }
logger.info { "Payment processed: cardNumber=${payment.cardNumber}" }
```

✅ **Sanitize sensitive data:**
```kotlin
// ✅ Good - Redact sensitive information
logger.info { "User login: email=${user.email.mask()}" }
logger.info { "Payment processed: cardNumber=${payment.cardNumber.last4()}" }
```

❌ **Don't forget to clear MDC:**
```kotlin
// ❌ Bad - MDC context leaks to other requests
suspend fun handleRequest(requestId: String) {
    MDC.put("requestId", requestId)
    processRequest()
    // Missing MDC.clear()!
}
```

✅ **Always clear MDC:**
```kotlin
// ✅ Good - MDC cleared in finally block
suspend fun handleRequest(requestId: String) {
    MDC.put("requestId", requestId)
    try {
        processRequest()
    } finally {
        MDC.clear()
    }
}
```

❌ **Don't use high-cardinality metric tags:**
```kotlin
// ❌ Bad - Creates millions of unique metrics
MetricsProvider.incrementCounter(
    name = "requests_total",
    "customer_id" to customerId.toString(),     // High cardinality
    "order_id" to orderId.toString(),           // High cardinality
    "timestamp" to Instant.now().toString()     // Unique per call
)
```

✅ **Use low-cardinality tags:**
```kotlin
// ✅ Good - Limited number of tag combinations
MetricsProvider.incrementCounter(
    name = "requests_total",
    "operation" to "create_order",   // Low cardinality
    "status" to "success",           // Low cardinality
    "market" to "us"                 // Low cardinality
)
```

❌ **Don't log in tight loops:**
```kotlin
// ❌ Bad - Logs thousands of times
orders.forEach { order ->
    logger.debug { "Processing order orderId=${order.id}" }
    processOrder(order)
}
```

✅ **Log summary instead:**
```kotlin
// ✅ Good - Single log with summary
logger.info { "Processing batch orderCount=${orders.size}" }
orders.forEach { order ->
    processOrder(order)
}
logger.info { "Batch processing completed successCount=$successCount failureCount=$failureCount" }
```

❌ **Don't block on logging:**
```kotlin
// ❌ Bad - Synchronous expensive logging
logger.info {
    val expensiveData = computeExpensiveData() // Blocks!
    "Data computed: $expensiveData"
}
```

✅ **Use lazy evaluation:**
```kotlin
// ✅ Good - Lazy evaluation with lambda
logger.info {
    // Only evaluated if INFO level is enabled
    "Data computed: ${computeExpensiveData()}"
}

// ✅ Better - Check level first
if (logger.isInfoEnabled) {
    val expensiveData = computeExpensiveData()
    logger.info { "Data computed: $expensiveData" }
}
```

❌ **Don't duplicate metric recording:**
```kotlin
// ❌ Bad - Same metric recorded twice
MetricsProvider.incrementCounter("requests_total", "status" to "success")
// Later in code...
MetricsProvider.incrementCounter("requests_total", "status" to "success")
```

✅ **Record metrics once per event:**
```kotlin
// ✅ Good - Single metric recording
suspend fun processRequest() {
    try {
        val result = doWork()
        MetricsProvider.incrementCounter("requests_total", "status" to "success")
        result
    } catch (e: Exception) {
        MetricsProvider.incrementCounter("requests_total", "status" to "failure")
        throw e
    }
}
```

## Related Implementers

- **rest-api.md** - Ktor middleware for request logging and metrics
- **coroutines.md** - MDC propagation in coroutines with ThreadContextElement
- **http-clients.md** - Client logging and metrics for external service calls
- **error-handling.md** - Logging exceptions with proper context
- **testing.md** - Testing logging and metrics in unit tests
- **kafka-integration.md** - Kafka consumer/producer metrics and tracing
