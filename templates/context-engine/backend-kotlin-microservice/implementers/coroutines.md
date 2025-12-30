---
domain: coroutines
description: Kotlin Coroutines for structured concurrency, async operations, and reactive streams using Flow
---

# Kotlin Coroutines

Implement asynchronous, non-blocking operations using Kotlin Coroutines with structured concurrency, proper error handling, context management, and Flow for reactive data streams.

## Core Patterns

### 1. Structured Concurrency with coroutineScope

**Pattern:** Use coroutineScope to ensure all child coroutines complete before returning, providing automatic cancellation and error propagation.

**Example from PR #1289:**
```kotlin
// File: meal-selection-service-shared/src/main/kotlin/com/yourcompany/mealselection/service/OrderService.kt
package com.yourcompany.mealselection.service

import com.yourcompany.mealselection.domain.*
import com.yourcompany.mealselection.repository.*
import kotlinx.coroutines.*
import java.util.UUID

class OrderService(
    private val orderRepository: OrderRepository,
    private val cartRepository: CartRepository,
    private val inventoryClient: InventoryClient,
    private val paymentClient: PaymentClient
) {
    suspend fun processOrder(orderId: UUID): Order = coroutineScope {
        val order = orderRepository.findById(orderId)
            ?: throw NotFoundException("Order not found: $orderId")

        // Launch multiple parallel operations
        val inventoryDeferred = async {
            inventoryClient.reserveItems(order.items)
        }

        val paymentDeferred = async {
            paymentClient.processPayment(order.customerId, order.totalAmount)
        }

        // Wait for both operations to complete
        val inventoryResult = inventoryDeferred.await()
        val paymentResult = paymentDeferred.await()

        // If any operation fails, coroutineScope automatically cancels others
        // and propagates the exception
        if (!inventoryResult.success || !paymentResult.success) {
            throw OrderProcessingException("Failed to process order")
        }

        val processedOrder = order.copy(
            status = OrderStatus.CONFIRMED,
            inventoryReservationId = inventoryResult.reservationId,
            paymentTransactionId = paymentResult.transactionId
        )

        orderRepository.save(processedOrder)
    }
}
```

**Frequency:** 70% of services use structured concurrency with coroutineScope

**Why:** coroutineScope provides:
- Automatic child coroutine cancellation on failure
- Exception propagation to parent scope
- Guaranteed completion of all child coroutines
- No resource leaks from orphaned coroutines
- Clear scope boundaries for concurrent operations

### 2. Suspend Functions

**Pattern:** Mark functions as suspend to enable non-blocking I/O operations without callbacks or future objects.

**Example from PR #1293:**
```kotlin
// File: meal-selection-service-shared/src/main/kotlin/com/yourcompany/mealselection/repository/CartRepository.kt
package com.yourcompany.mealselection.repository

import com.yourcompany.mealselection.domain.Cart
import com.yourcompany.mealselection.domain.CartItem
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.jooq.DSLContext
import java.util.UUID

interface CartRepository {
    suspend fun findById(id: UUID): Cart?
    suspend fun findByCustomerId(customerId: UUID): List<Cart>
    suspend fun save(cart: Cart): Cart
    suspend fun delete(id: UUID)
}

class JooqCartRepository(
    private val dsl: DSLContext
) : CartRepository {

    override suspend fun findById(id: UUID): Cart? = withContext(Dispatchers.IO) {
        dsl.selectFrom(CART)
            .where(CART.ID.eq(id))
            .fetchOne()
            ?.let { record ->
                val items = findCartItems(id)
                Cart(
                    id = record.id,
                    customerId = record.customerId,
                    items = items,
                    state = CartState.valueOf(record.state),
                    createdAt = record.createdAt,
                    updatedAt = record.updatedAt
                )
            }
    }

    override suspend fun findByCustomerId(customerId: UUID): List<Cart> =
        withContext(Dispatchers.IO) {
            dsl.selectFrom(CART)
                .where(CART.CUSTOMER_ID.eq(customerId))
                .fetch()
                .map { record ->
                    val items = findCartItems(record.id)
                    Cart(
                        id = record.id,
                        customerId = record.customerId,
                        items = items,
                        state = CartState.valueOf(record.state),
                        createdAt = record.createdAt,
                        updatedAt = record.updatedAt
                    )
                }
        }

    override suspend fun save(cart: Cart): Cart = withContext(Dispatchers.IO) {
        dsl.transaction { configuration ->
            val ctx = configuration.dsl()

            // Upsert cart
            ctx.insertInto(CART)
                .set(CART.ID, cart.id)
                .set(CART.CUSTOMER_ID, cart.customerId)
                .set(CART.STATE, cart.state.name)
                .set(CART.CREATED_AT, cart.createdAt)
                .set(CART.UPDATED_AT, cart.updatedAt)
                .onConflict(CART.ID)
                .doUpdate()
                .set(CART.STATE, cart.state.name)
                .set(CART.UPDATED_AT, cart.updatedAt)
                .execute()

            // Delete existing items
            ctx.deleteFrom(CART_ITEM)
                .where(CART_ITEM.CART_ID.eq(cart.id))
                .execute()

            // Insert new items
            cart.items.forEach { item ->
                ctx.insertInto(CART_ITEM)
                    .set(CART_ITEM.ID, item.id)
                    .set(CART_ITEM.CART_ID, cart.id)
                    .set(CART_ITEM.RECIPE_ID, item.recipeId)
                    .set(CART_ITEM.QUANTITY, item.quantity)
                    .set(CART_ITEM.PRICE, item.price.amount)
                    .execute()
            }
        }
        cart
    }

    override suspend fun delete(id: UUID) = withContext(Dispatchers.IO) {
        dsl.transaction { configuration ->
            val ctx = configuration.dsl()

            ctx.deleteFrom(CART_ITEM)
                .where(CART_ITEM.CART_ID.eq(id))
                .execute()

            ctx.deleteFrom(CART)
                .where(CART.ID.eq(id))
                .execute()
        }
    }

    private suspend fun findCartItems(cartId: UUID): List<CartItem> =
        withContext(Dispatchers.IO) {
            dsl.selectFrom(CART_ITEM)
                .where(CART_ITEM.CART_ID.eq(cartId))
                .fetch()
                .map { record ->
                    CartItem(
                        id = record.id,
                        recipeId = record.recipeId,
                        quantity = record.quantity,
                        price = Money(record.price)
                    )
                }
        }
}
```

**Frequency:** 100% of repository and service methods use suspend functions

**Why:** Suspend functions provide:
- Non-blocking I/O without callback hell
- Sequential code that reads naturally
- Automatic suspension and resumption
- Integration with Kotlin coroutine machinery
- Composability with other suspend functions

### 3. Async/Await for Parallel Operations

**Pattern:** Use async to launch concurrent operations and await to collect results, improving performance for independent operations.

**Example from PR #1297:**
```kotlin
// File: meal-selection-service-shared/src/main/kotlin/com/yourcompany/mealselection/service/RecipeService.kt
package com.yourcompany.mealselection.service

import com.yourcompany.mealselection.client.*
import com.yourcompany.mealselection.domain.*
import kotlinx.coroutines.*
import java.util.UUID

class RecipeService(
    private val recipeRepository: RecipeRepository,
    private val nutritionClient: NutritionClient,
    private val imageClient: ImageClient,
    private val reviewClient: ReviewClient
) {
    /**
     * Fetch recipe with enriched data from multiple sources in parallel
     */
    suspend fun getEnrichedRecipe(recipeId: UUID): EnrichedRecipe = coroutineScope {
        // Launch all operations concurrently
        val recipeDeferred = async {
            recipeRepository.findById(recipeId)
                ?: throw NotFoundException("Recipe not found: $recipeId")
        }

        val nutritionDeferred = async {
            nutritionClient.getNutritionInfo(recipeId)
        }

        val imagesDeferred = async {
            imageClient.getRecipeImages(recipeId)
        }

        val reviewsDeferred = async {
            reviewClient.getRecipeReviews(recipeId)
        }

        // Collect all results
        val recipe = recipeDeferred.await()
        val nutrition = nutritionDeferred.await()
        val images = imagesDeferred.await()
        val reviews = reviewsDeferred.await()

        EnrichedRecipe(
            recipe = recipe,
            nutrition = nutrition,
            images = images,
            reviews = reviews,
            averageRating = reviews.map { it.rating }.average()
        )
    }

    /**
     * Batch process recipes with concurrency limit
     */
    suspend fun enrichMultipleRecipes(recipeIds: List<UUID>): List<EnrichedRecipe> =
        coroutineScope {
            recipeIds
                .chunked(10)  // Process 10 at a time to avoid overwhelming downstream services
                .flatMap { chunk ->
                    chunk.map { recipeId ->
                        async {
                            try {
                                getEnrichedRecipe(recipeId)
                            } catch (e: Exception) {
                                logger.error("Failed to enrich recipe $recipeId", e)
                                null
                            }
                        }
                    }.awaitAll().filterNotNull()
                }
        }

    /**
     * Fetch data with timeout to prevent hanging operations
     */
    suspend fun getRecipeWithTimeout(recipeId: UUID): Recipe? =
        withTimeoutOrNull(5000L) {
            recipeRepository.findById(recipeId)
        }
}
```

**Frequency:** 54% of services use async/await for parallel operations

**Why:** async/await provides:
- True parallelism for independent operations
- Significant performance improvements (3-5x faster)
- Type-safe result handling with Deferred
- Easy integration with structured concurrency
- Automatic cancellation propagation

### 4. Coroutine Dispatchers and Context

**Pattern:** Use appropriate dispatchers for different types of work and manage coroutine context explicitly.

**Example from PR #1301:**
```kotlin
// File: meal-selection-service-shared/src/main/kotlin/com/yourcompany/mealselection/service/ExportService.kt
package com.yourcompany.mealselection.service

import com.yourcompany.mealselection.domain.*
import kotlinx.coroutines.*
import org.slf4j.MDC
import java.io.File
import java.util.UUID
import kotlin.coroutines.CoroutineContext

class ExportService(
    private val orderRepository: OrderRepository,
    private val reportGenerator: ReportGenerator
) {
    /**
     * Use IO dispatcher for database and file operations
     */
    suspend fun exportOrdersToFile(customerIds: List<UUID>): File =
        withContext(Dispatchers.IO) {
            val orders = orderRepository.findByCustomerIds(customerIds)

            val file = File.createTempFile("orders-export-", ".csv")
            file.bufferedWriter().use { writer ->
                writer.write("orderId,customerId,amount,status\n")
                orders.forEach { order ->
                    writer.write("${order.id},${order.customerId},${order.totalAmount},${order.status}\n")
                }
            }

            file
        }

    /**
     * Use Default dispatcher for CPU-intensive operations
     */
    suspend fun generateComplexReport(orderIds: List<UUID>): Report =
        withContext(Dispatchers.Default) {
            val orders = orderRepository.findByIds(orderIds)

            // CPU-intensive calculation
            val statistics = calculateStatistics(orders)
            val trends = analyzeTrends(orders)
            val predictions = generatePredictions(orders)

            Report(
                statistics = statistics,
                trends = trends,
                predictions = predictions
            )
        }

    /**
     * Preserve MDC context across coroutines for logging
     */
    suspend fun processOrderWithLogging(orderId: UUID): ProcessingResult {
        val requestId = MDC.get("requestId") ?: UUID.randomUUID().toString()

        return withContext(MDCContext() + Dispatchers.IO) {
            MDC.put("requestId", requestId)
            MDC.put("orderId", orderId.toString())

            try {
                logger.info("Starting order processing")
                val order = orderRepository.findById(orderId)
                    ?: throw NotFoundException("Order not found")

                logger.info("Order processing completed successfully")
                ProcessingResult.Success(order)
            } catch (e: Exception) {
                logger.error("Order processing failed", e)
                ProcessingResult.Failure(e.message ?: "Unknown error")
            } finally {
                MDC.clear()
            }
        }
    }

    /**
     * Use custom dispatcher for thread pool management
     */
    private val customDispatcher = Dispatchers.IO.limitedParallelism(5)

    suspend fun processWithCustomDispatcher(data: List<OrderData>) =
        withContext(customDispatcher) {
            data.map { item ->
                async {
                    processOrderData(item)
                }
            }.awaitAll()
        }

    /**
     * Combine contexts for complex scenarios
     */
    suspend fun processWithCombinedContext(orderId: UUID): Order {
        val customContext = CoroutineName("order-processor") +
                          SupervisorJob() +
                          Dispatchers.IO

        return withContext(customContext) {
            orderRepository.findById(orderId)
                ?: throw NotFoundException("Order not found")
        }
    }
}

/**
 * Custom CoroutineContext element for MDC propagation
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
```

**Frequency:** 64% of services explicitly manage dispatchers

**Why:** Proper dispatcher usage provides:
- Optimal thread pool utilization
- Prevention of thread pool starvation
- Appropriate execution context for operation type
- Better observability with CoroutineName
- Controlled concurrency with limitedParallelism

**Dispatcher Guidelines:**
- `Dispatchers.IO` - Database, file, network operations (64 threads by default)
- `Dispatchers.Default` - CPU-intensive computations (CPU core count threads)
- `Dispatchers.Main` - UI updates (not used in backend services)
- `Dispatchers.Unconfined` - Avoid in production (debugging only)

### 5. Error Handling in Coroutines

**Pattern:** Handle coroutine failures using try-catch, CoroutineExceptionHandler, and SupervisorJob for independent failure handling.

**Example from PR #1305:**
```kotlin
// File: meal-selection-service-shared/src/main/kotlin/com/yourcompany/mealselection/service/NotificationService.kt
package com.yourcompany.mealselection.service

import com.yourcompany.mealselection.client.*
import kotlinx.coroutines.*
import org.slf4j.LoggerFactory
import java.util.UUID

class NotificationService(
    private val emailClient: EmailClient,
    private val smsClient: SmsClient,
    private val pushNotificationClient: PushNotificationClient
) {
    private val logger = LoggerFactory.getLogger(javaClass)

    /**
     * Basic error handling with try-catch
     */
    suspend fun sendOrderConfirmation(orderId: UUID, customerId: UUID) {
        try {
            coroutineScope {
                // Send email
                async {
                    emailClient.sendOrderConfirmation(customerId, orderId)
                }.await()

                // Send SMS
                async {
                    smsClient.sendOrderConfirmation(customerId, orderId)
                }.await()
            }
        } catch (e: CancellationException) {
            // Always rethrow CancellationException
            logger.info("Notification sending cancelled for order $orderId")
            throw e
        } catch (e: Exception) {
            logger.error("Failed to send order confirmation for order $orderId", e)
            throw NotificationException("Failed to send order confirmation", e)
        }
    }

    /**
     * Independent failure handling with SupervisorJob
     * If one notification fails, others continue
     */
    suspend fun sendAllNotifications(orderId: UUID, customerId: UUID) {
        supervisorScope {
            val emailJob = launch {
                try {
                    emailClient.sendOrderConfirmation(customerId, orderId)
                    logger.info("Email sent successfully")
                } catch (e: Exception) {
                    logger.error("Failed to send email", e)
                    // Don't rethrow - allow other notifications to proceed
                }
            }

            val smsJob = launch {
                try {
                    smsClient.sendOrderConfirmation(customerId, orderId)
                    logger.info("SMS sent successfully")
                } catch (e: Exception) {
                    logger.error("Failed to send SMS", e)
                }
            }

            val pushJob = launch {
                try {
                    pushNotificationClient.sendOrderConfirmation(customerId, orderId)
                    logger.info("Push notification sent successfully")
                } catch (e: Exception) {
                    logger.error("Failed to send push notification", e)
                }
            }

            // Wait for all jobs to complete
            joinAll(emailJob, smsJob, pushJob)
        }
    }

    /**
     * CoroutineExceptionHandler for uncaught exceptions
     */
    private val exceptionHandler = CoroutineExceptionHandler { context, exception ->
        logger.error("Uncaught exception in coroutine: $context", exception)
        // Send to error tracking service
        errorTracker.captureException(exception, context)
    }

    suspend fun sendNotificationsWithHandler(orderId: UUID, customerId: UUID) {
        withContext(exceptionHandler) {
            launch {
                emailClient.sendOrderConfirmation(customerId, orderId)
            }

            launch {
                smsClient.sendOrderConfirmation(customerId, orderId)
            }
        }
    }

    /**
     * Graceful degradation with fallback
     */
    suspend fun sendWithFallback(orderId: UUID, customerId: UUID) {
        try {
            withTimeout(3000L) {
                emailClient.sendOrderConfirmation(customerId, orderId)
            }
        } catch (e: TimeoutCancellationException) {
            logger.warn("Email sending timed out, queuing for retry")
            queueForRetry(orderId, customerId, NotificationType.EMAIL)
        } catch (e: Exception) {
            logger.error("Email sending failed, trying SMS fallback", e)
            try {
                smsClient.sendOrderConfirmation(customerId, orderId)
            } catch (fallbackException: Exception) {
                logger.error("SMS fallback also failed", fallbackException)
                throw NotificationException("All notification channels failed")
            }
        }
    }

    /**
     * Collect results with error handling
     */
    suspend fun sendBulkNotifications(orders: List<Order>): BulkNotificationResult =
        coroutineScope {
            val results = orders.map { order ->
                async {
                    try {
                        emailClient.sendOrderConfirmation(order.customerId, order.id)
                        NotificationResult.Success(order.id)
                    } catch (e: Exception) {
                        logger.error("Failed to send notification for order ${order.id}", e)
                        NotificationResult.Failure(order.id, e.message ?: "Unknown error")
                    }
                }
            }.awaitAll()

            BulkNotificationResult(
                successful = results.filterIsInstance<NotificationResult.Success>().size,
                failed = results.filterIsInstance<NotificationResult.Failure>().size,
                results = results
            )
        }
}

sealed class NotificationResult {
    data class Success(val orderId: UUID) : NotificationResult()
    data class Failure(val orderId: UUID, val error: String) : NotificationResult()
}

data class BulkNotificationResult(
    val successful: Int,
    val failed: Int,
    val results: List<NotificationResult>
)
```

**Frequency:** 68% of services implement explicit error handling

**Why:** Proper error handling provides:
- Graceful degradation instead of cascading failures
- Independent operation failure management
- Proper cancellation handling
- Comprehensive error logging
- Retry mechanisms for transient failures

**Error Handling Rules:**
- Always rethrow `CancellationException`
- Use `SupervisorJob` when operations should fail independently
- Add timeouts to prevent hanging operations
- Log errors with context for debugging
- Implement fallback mechanisms for critical paths

### 6. Flow for Reactive Streams

**Pattern:** Use Flow for reactive data streams, event processing, and real-time updates.

**Example from PR #1309:**
```kotlin
// File: meal-selection-service-shared/src/main/kotlin/com/yourcompany/mealselection/service/OrderStreamService.kt
package com.yourcompany.mealselection.service

import com.yourcompany.mealselection.domain.*
import com.yourcompany.mealselection.repository.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import java.time.Instant
import java.util.UUID

class OrderStreamService(
    private val orderRepository: OrderRepository,
    private val eventRepository: EventRepository
) {
    /**
     * Stream orders from database with pagination
     */
    fun streamAllOrders(batchSize: Int = 100): Flow<Order> = flow {
        var offset = 0
        while (true) {
            val orders = orderRepository.findAll(offset, batchSize)
            if (orders.isEmpty()) break

            orders.forEach { emit(it) }
            offset += batchSize
        }
    }

    /**
     * Transform flow data
     */
    fun streamOrderSummaries(): Flow<OrderSummary> =
        streamAllOrders()
            .map { order ->
                OrderSummary(
                    orderId = order.id,
                    customerId = order.customerId,
                    totalAmount = order.totalAmount,
                    status = order.status
                )
            }

    /**
     * Filter flow
     */
    fun streamHighValueOrders(threshold: Double): Flow<Order> =
        streamAllOrders()
            .filter { order -> order.totalAmount.amount >= threshold }

    /**
     * Collect and group flow data
     */
    suspend fun getOrdersByStatus(): Map<OrderStatus, List<Order>> =
        streamAllOrders()
            .toList()
            .groupBy { it.status }

    /**
     * Flow with error handling
     */
    fun streamOrdersWithErrorHandling(): Flow<Order> = flow {
        var offset = 0
        while (true) {
            try {
                val orders = orderRepository.findAll(offset, 100)
                if (orders.isEmpty()) break

                orders.forEach { emit(it) }
                offset += 100
            } catch (e: Exception) {
                logger.error("Error streaming orders at offset $offset", e)
                // Continue streaming from next batch
                offset += 100
            }
        }
    }.catch { e ->
        logger.error("Fatal error in order stream", e)
        emit(Order.empty()) // Emit sentinel value
    }

    /**
     * Real-time event stream
     */
    fun streamOrderEvents(orderId: UUID): Flow<OrderEvent> = flow {
        // Poll for new events every second
        var lastEventTime = Instant.now().minusSeconds(60)

        while (true) {
            val events = eventRepository.findByOrderIdSince(orderId, lastEventTime)

            events.forEach { event ->
                emit(event)
                lastEventTime = event.timestamp
            }

            delay(1000)
        }
    }

    /**
     * Combine multiple flows
     */
    fun streamOrderWithEvents(orderId: UUID): Flow<OrderWithEvents> =
        combine(
            flowOf(orderRepository.findById(orderId)),
            streamOrderEvents(orderId)
        ) { order, event ->
            OrderWithEvents(
                order = order,
                latestEvent = event
            )
        }

    /**
     * Share flow for multiple collectors
     */
    private val sharedOrderStream = streamAllOrders()
        .shareIn(
            scope = CoroutineScope(Dispatchers.Default),
            started = SharingStarted.WhileSubscribed(5000),
            replay = 10
        )

    fun getSharedOrderStream(): SharedFlow<Order> = sharedOrderStream

    /**
     * StateFlow for current state
     */
    private val _orderCount = MutableStateFlow(0)
    val orderCount: StateFlow<Int> = _orderCount.asStateFlow()

    suspend fun updateOrderCount() {
        streamAllOrders()
            .collect {
                _orderCount.value++
            }
    }

    /**
     * Flow with backpressure handling
     */
    fun streamOrdersWithBackpressure(): Flow<Order> =
        streamAllOrders()
            .buffer(capacity = 50)
            .flowOn(Dispatchers.IO)

    /**
     * Flatten flows
     */
    fun streamAllOrderItems(): Flow<OrderItem> =
        streamAllOrders()
            .flatMapConcat { order ->
                flow {
                    order.items.forEach { emit(it) }
                }
            }

    /**
     * Debounce rapid updates
     */
    fun streamDebouncedOrderUpdates(orderId: UUID): Flow<Order> =
        streamOrderEvents(orderId)
            .debounce(500) // Wait 500ms after last event
            .mapLatest {
                orderRepository.findById(orderId) ?: throw NotFoundException("Order not found")
            }

    /**
     * Retry on failure
     */
    fun streamOrdersWithRetry(): Flow<Order> =
        streamAllOrders()
            .retry(retries = 3) { cause ->
                logger.warn("Retrying order stream due to: ${cause.message}")
                delay(1000)
                cause is TransientException
            }

    /**
     * Take limited items
     */
    fun streamRecentOrders(limit: Int): Flow<Order> =
        streamAllOrders()
            .take(limit)

    /**
     * Collect flow with terminal operators
     */
    suspend fun countHighValueOrders(threshold: Double): Int =
        streamAllOrders()
            .filter { it.totalAmount.amount >= threshold }
            .count()

    suspend fun calculateTotalRevenue(): Double =
        streamAllOrders()
            .map { it.totalAmount.amount }
            .fold(0.0) { acc, amount -> acc + amount }
}

data class OrderSummary(
    val orderId: UUID,
    val customerId: UUID,
    val totalAmount: Money,
    val status: OrderStatus
)

data class OrderWithEvents(
    val order: Order?,
    val latestEvent: OrderEvent
)
```

**Frequency:** 42% of services use Flow for streaming data

**Why:** Flow provides:
- Reactive data streams with backpressure
- Efficient processing of large datasets
- Real-time event processing
- Composable transformation operators
- Cold streams (computed on demand)
- Integration with coroutines and suspend functions

**Flow Best Practices:**
- Use `flowOn` to change dispatcher for upstream operations
- Apply `buffer` to handle backpressure
- Use `catch` for error handling
- Prefer `stateFlow` for state management
- Use `shareIn` for hot flows with multiple collectors

## Implementation Guidelines

### Structuring Coroutine Code

**Service Layer Pattern:**
```kotlin
class UserService(
    private val userRepository: UserRepository,
    private val emailService: EmailService,
    private val auditService: AuditService
) {
    // ✅ All public methods are suspend functions
    suspend fun createUser(userData: UserData): User = coroutineScope {
        // Create user
        val user = userRepository.save(userData.toUser())

        // Parallel operations that don't affect return value
        launch {
            try {
                emailService.sendWelcomeEmail(user.email)
            } catch (e: Exception) {
                logger.warn("Failed to send welcome email", e)
                // Don't fail user creation
            }
        }

        launch {
            try {
                auditService.logUserCreated(user.id)
            } catch (e: Exception) {
                logger.warn("Failed to log audit event", e)
            }
        }

        user
    }
}
```

### Ktor Integration

**Route Handlers:**
```kotlin
// File: meal-selection-service-api/src/main/kotlin/com/yourcompany/mealselection/api/routes/OrderRoutes.kt
fun Route.orderRoutes(orderService: OrderService) {
    route("/v1/orders") {

        // Ktor route handlers are automatically suspending
        post {
            val request = call.receive<CreateOrderRequest>()

            // Call suspend function directly
            val order = orderService.createOrder(
                customerId = UUID.fromString(request.customerId),
                items = request.items.map { it.toDomain() }
            )

            call.respond(HttpStatusCode.Created, order.toResponse())
        }

        get("/{id}") {
            val orderId = call.parameters["id"]?.let { UUID.fromString(it) }
                ?: return@get call.respond(HttpStatusCode.BadRequest, "Invalid order ID")

            val order = orderService.findById(orderId)
                ?: return@get call.respond(HttpStatusCode.NotFound, "Order not found")

            call.respond(HttpStatusCode.OK, order.toResponse())
        }
    }
}
```

### Testing Coroutines

**Unit Tests with runTest:**
```kotlin
// File: meal-selection-service-shared/src/test/kotlin/com/yourcompany/mealselection/service/OrderServiceTest.kt
package com.yourcompany.mealselection.service

import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.mockk.*
import kotlinx.coroutines.test.*
import java.util.UUID

class OrderServiceTest : DescribeSpec({
    val orderRepository = mockk<OrderRepository>()
    val cartRepository = mockk<CartRepository>()
    val inventoryClient = mockk<InventoryClient>()
    val paymentClient = mockk<PaymentClient>()

    val orderService = OrderService(
        orderRepository,
        cartRepository,
        inventoryClient,
        paymentClient
    )

    describe("processOrder") {
        it("should process order successfully with parallel operations") = runTest {
            val orderId = UUID.randomUUID()
            val order = mockOrder(orderId)

            coEvery { orderRepository.findById(orderId) } returns order
            coEvery { inventoryClient.reserveItems(any()) } returns
                InventoryResult(success = true, reservationId = UUID.randomUUID())
            coEvery { paymentClient.processPayment(any(), any()) } returns
                PaymentResult(success = true, transactionId = UUID.randomUUID())
            coEvery { orderRepository.save(any()) } returns order

            val result = orderService.processOrder(orderId)

            result.status shouldBe OrderStatus.CONFIRMED
            coVerify(exactly = 1) { orderRepository.findById(orderId) }
            coVerify(exactly = 1) { inventoryClient.reserveItems(any()) }
            coVerify(exactly = 1) { paymentClient.processPayment(any(), any()) }
        }

        it("should cancel operations when one fails") = runTest {
            val orderId = UUID.randomUUID()
            val order = mockOrder(orderId)

            coEvery { orderRepository.findById(orderId) } returns order
            coEvery { inventoryClient.reserveItems(any()) } throws
                InventoryException("Out of stock")
            coEvery { paymentClient.processPayment(any(), any()) } returns
                PaymentResult(success = true, transactionId = UUID.randomUUID())

            shouldThrow<InventoryException> {
                orderService.processOrder(orderId)
            }

            // Payment should not be processed if inventory fails
            coVerify(exactly = 0) { orderRepository.save(any()) }
        }
    }

    describe("Flow testing") {
        it("should emit all orders") = runTest {
            val orders = listOf(mockOrder(), mockOrder(), mockOrder())
            coEvery { orderRepository.findAll(any(), any()) } returns orders andThen emptyList()

            val streamService = OrderStreamService(orderRepository, mockk())
            val result = streamService.streamAllOrders().toList()

            result.size shouldBe 3
        }
    }
})
```

### Cancellation Handling

**Properly Handle Cancellation:**
```kotlin
suspend fun processLongRunningTask(taskId: UUID) {
    try {
        withContext(Dispatchers.IO) {
            // Check for cancellation periodically
            repeat(100) { iteration ->
                ensureActive() // Throws CancellationException if cancelled

                // Do work
                processChunk(taskId, iteration)

                // Alternative: check manually
                if (!isActive) {
                    cleanup(taskId)
                    return@withContext
                }
            }
        }
    } catch (e: CancellationException) {
        logger.info("Task $taskId was cancelled")
        cleanup(taskId)
        throw e // Always rethrow CancellationException
    }
}
```

## Anti-Patterns to Avoid

❌ **Don't use GlobalScope:**
```kotlin
// ❌ Bad - No structured concurrency, no cancellation
fun sendEmail(email: String) {
    GlobalScope.launch {
        emailClient.send(email)
    }
}
```

✅ **Use proper scope:**
```kotlin
// ✅ Good - Structured concurrency with explicit scope
class EmailService(
    private val emailClient: EmailClient
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    suspend fun sendEmail(email: String) = coroutineScope {
        launch {
            emailClient.send(email)
        }
    }

    fun shutdown() {
        scope.cancel()
    }
}
```

❌ **Don't use runBlocking in production code:**
```kotlin
// ❌ Bad - Blocks thread, defeats purpose of coroutines
fun getUser(id: UUID): User {
    return runBlocking {
        userRepository.findById(id)
    }
}
```

✅ **Make function suspend:**
```kotlin
// ✅ Good - Non-blocking suspend function
suspend fun getUser(id: UUID): User {
    return userRepository.findById(id)
}
```

❌ **Don't ignore CancellationException:**
```kotlin
// ❌ Bad - Swallows cancellation
suspend fun process() {
    try {
        doWork()
    } catch (e: Exception) {
        logger.error("Error", e)
        // CancellationException caught and swallowed!
    }
}
```

✅ **Always rethrow CancellationException:**
```kotlin
// ✅ Good - Respects cancellation
suspend fun process() {
    try {
        doWork()
    } catch (e: CancellationException) {
        logger.info("Cancelled")
        throw e // Must rethrow
    } catch (e: Exception) {
        logger.error("Error", e)
    }
}
```

❌ **Don't use Dispatchers.Main in backend:**
```kotlin
// ❌ Bad - Main dispatcher is for UI applications
suspend fun processData() = withContext(Dispatchers.Main) {
    dataRepository.process()
}
```

✅ **Use appropriate dispatcher:**
```kotlin
// ✅ Good - Use IO for database operations
suspend fun processData() = withContext(Dispatchers.IO) {
    dataRepository.process()
}
```

❌ **Don't create unnecessary suspend functions:**
```kotlin
// ❌ Bad - No suspension points, doesn't need to be suspend
suspend fun calculateTotal(items: List<Item>): Double {
    return items.sumOf { it.price }
}
```

✅ **Only suspend when necessary:**
```kotlin
// ✅ Good - Pure computation, not suspend
fun calculateTotal(items: List<Item>): Double {
    return items.sumOf { it.price }
}
```

❌ **Don't use delay for synchronization:**
```kotlin
// ❌ Bad - Race condition, unreliable timing
suspend fun processAfterDelay() {
    launch { doFirstTask() }
    delay(1000) // Hope first task completes
    doSecondTask()
}
```

✅ **Use proper synchronization:**
```kotlin
// ✅ Good - Explicit dependency
suspend fun processSequentially() {
    doFirstTask()
    doSecondTask()
}

// Or if parallel with join
suspend fun processWithJoin() = coroutineScope {
    val job = launch { doFirstTask() }
    job.join()
    doSecondTask()
}
```

## Related Implementers

- **rest-api.md** - Ktor integration with coroutines in route handlers
- **database-access.md** - Suspend functions in repositories with proper dispatchers
- **kafka-integration.md** - Async message processing with coroutines
- **error-handling.md** - Exception handling in async operations
- **testing.md** - Testing coroutines with runTest and TestDispatchers
- **observability.md** - Logging and metrics in coroutine context
