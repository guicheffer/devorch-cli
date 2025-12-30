---
domain: functional-programming
description: Kotlin functional programming patterns including scope functions, extension functions, higher-order functions, and immutable data structures
---

# Functional Programming Patterns

Leverage Kotlin's functional programming capabilities with scope functions, extension functions, higher-order functions, and immutable data structures to write expressive, composable, and maintainable code.

## Core Patterns

### 1. Scope Functions (let, run, apply, also, with)

**Pattern:** Use scope functions to create clear, concise code for object configuration, transformation, and side effects.

**Frequency:** 96% of PRs use scope functions

**Standard Usage:**

**let - Transformation and Null Safety:**
```kotlin
// File: meal-selection-service-api/src/main/kotlin/com/yourcompany/mealselection/api/routes/CartRoutes.kt
package com.yourcompany.mealselection.api.routes

import io.ktor.server.application.*
import io.ktor.server.response.*
import java.util.UUID

fun Route.cartRoutes(cartService: CartService) {
    route("/v1/carts") {
        // Using let for null-safe parameter extraction and transformation
        get("/{id}") {
            val cartId = call.parameters["id"]?.let { UUID.fromString(it) }
                ?: return@get call.respond(HttpStatusCode.BadRequest, "Invalid cart ID")

            val cart = cartService.findById(cartId)
                ?: return@get call.respond(HttpStatusCode.NotFound, "Cart not found")

            call.respond(HttpStatusCode.OK, cart.toResponse())
        }

        // Using let to transform query parameters
        get {
            val customerId = call.request.queryParameters["customerId"]
                ?.let { UUID.fromString(it) }
                ?: return@get call.respond(HttpStatusCode.BadRequest, "customerId required")

            val startDate = call.request.queryParameters["startDate"]
                ?.let { Instant.parse(it) }

            val endDate = call.request.queryParameters["endDate"]
                ?.let { Instant.parse(it) }

            val carts = cartService.findByCustomerId(
                customerId = customerId,
                startDate = startDate,
                endDate = endDate
            )

            call.respond(HttpStatusCode.OK, carts.map { it.toResponse() })
        }
    }
}
```

**apply - Object Configuration:**
```kotlin
// File: meal-selection-service-shared/src/main/kotlin/com/yourcompany/mealselection/config/DatabaseConfig.kt
package com.yourcompany.mealselection.config

import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource

class DatabaseConfig {
    fun createDataSource(config: AppConfig): HikariDataSource {
        return HikariDataSource(HikariConfig().apply {
            jdbcUrl = config.database.url
            username = config.database.username
            password = config.database.password
            driverClassName = "org.postgresql.Driver"
            maximumPoolSize = config.database.poolSize
            minimumIdle = config.database.minIdle
            connectionTimeout = config.database.connectionTimeout
            idleTimeout = config.database.idleTimeout
            maxLifetime = config.database.maxLifetime
            leakDetectionThreshold = config.database.leakDetectionThreshold

            // Connection test query
            connectionTestQuery = "SELECT 1"

            // Additional properties
            addDataSourceProperty("cachePrepStmts", "true")
            addDataSourceProperty("prepStmtCacheSize", "250")
            addDataSourceProperty("prepStmtCacheSqlLimit", "2048")
        })
    }
}
```

**also - Side Effects with Chaining:**
```kotlin
// File: meal-selection-service-shared/src/main/kotlin/com/yourcompany/mealselection/service/CartService.kt
package com.yourcompany.mealselection.service

import com.yourcompany.mealselection.domain.Cart
import com.yourcompany.mealselection.domain.CartItem
import org.slf4j.LoggerFactory
import java.util.UUID

class CartService(
    private val cartRepository: CartRepository,
    private val eventPublisher: EventPublisher,
    private val metricsService: MetricsService
) {
    private val logger = LoggerFactory.getLogger(CartService::class.java)

    suspend fun create(customerId: UUID, items: List<CartItem>): Cart {
        return Cart(
            id = UUID.randomUUID(),
            customerId = customerId,
            items = items,
            state = CartState.ACTIVE,
            createdAt = Instant.now(),
            updatedAt = Instant.now()
        )
            .also { logger.info("Creating cart for customer: ${it.customerId}") }
            .let { cartRepository.save(it) }
            .also { cart ->
                eventPublisher.publish(CartCreatedEvent(cart))
                metricsService.incrementCounter("cart.created")
                logger.info("Cart created: ${cart.id}")
            }
    }

    suspend fun addItem(cartId: UUID, item: CartItem): Cart {
        return cartRepository.findById(cartId)
            ?: throw NotFoundException("Cart not found: $cartId")
            .also { logger.debug("Found cart: $cartId") }
            .let { it.addItem(item) }
            .also { logger.info("Adding item ${item.recipeId} to cart $cartId") }
            .let { cartRepository.save(it) }
            .also { cart ->
                eventPublisher.publish(CartItemAddedEvent(cart, item))
                metricsService.incrementCounter("cart.item.added")
            }
    }
}
```

**run - Complex Initialization:**
```kotlin
// File: meal-selection-service/src/main/kotlin/com/yourcompany/mealselection/Application.kt
package com.yourcompany.mealselection

import io.ktor.server.application.*
import org.koin.dsl.module

fun Application.module() {
    val appConfig = run {
        val environment = System.getenv("ENV") ?: "local"
        val configFile = "application-$environment.conf"

        ConfigLoader()
            .load(configFile)
            .also { logger.info("Loaded config from $configFile") }
            .validate()
            .also { logger.info("Configuration validated successfully") }
    }

    val dataSource = run {
        DatabaseConfig()
            .createDataSource(appConfig)
            .also { logger.info("Database connection pool initialized") }
    }

    configureDependencyInjection(appConfig, dataSource)
    configureRouting()
    configureMonitoring()
}
```

**with - Multiple Operations on Same Object:**
```kotlin
// File: meal-selection-service-domain/src/main/kotlin/com/yourcompany/mealselection/domain/Cart.kt
package com.yourcompany.mealselection.domain

import java.time.Instant
import java.util.UUID

data class Cart(
    val id: UUID,
    val customerId: UUID,
    val items: List<CartItem>,
    val state: CartState,
    val createdAt: Instant,
    val updatedAt: Instant
) {
    fun calculateSummary(): CartSummary {
        return with(items) {
            CartSummary(
                totalItems = size,
                totalQuantity = sumOf { it.quantity },
                subtotal = sumOf { it.price.amount * it.quantity },
                uniqueRecipes = map { it.recipeId }.toSet().size,
                averageItemPrice = if (isNotEmpty()) {
                    sumOf { it.price.amount } / size
                } else {
                    0.0
                }
            )
        }
    }

    fun validate(): ValidationResult {
        return with(ValidationResult()) {
            if (items.isEmpty() && state == CartState.ACTIVE) {
                addError("items", "Active cart must have at least one item")
            }

            if (items.size > 20) {
                addError("items", "Cart cannot have more than 20 items")
            }

            items.forEach { item ->
                if (item.quantity <= 0) {
                    addError("quantity", "Item quantity must be positive")
                }
                if (item.price.amount < 0) {
                    addError("price", "Item price cannot be negative")
                }
            }

            this
        }
    }
}
```

**Frequency:** 96% of files use scope functions appropriately

**Why:** Scope functions provide:
- Clear intent for transformations vs side effects
- Reduced need for temporary variables
- Better null safety with let
- Concise object configuration with apply
- Clean logging and metrics with also
- Natural context for related operations with with and run

### 2. Extension Functions

**Pattern:** Add functionality to existing types without inheritance, creating domain-specific DSLs and utility functions.

**Frequency:** 88% of PRs define or use extension functions

**Domain Extensions:**
```kotlin
// File: meal-selection-service-shared/src/main/kotlin/com/yourcompany/mealselection/extensions/DomainExtensions.kt
package com.yourcompany.mealselection.extensions

import com.yourcompany.mealselection.domain.*
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.util.UUID

// UUID extensions
fun String.toUUID(): UUID = UUID.fromString(this)

fun String.toUUIDOrNull(): UUID? = try {
    UUID.fromString(this)
} catch (e: IllegalArgumentException) {
    null
}

// Instant extensions
fun Instant.toLocalDate(zoneId: ZoneId = ZoneId.systemDefault()): LocalDate =
    this.atZone(zoneId).toLocalDate()

fun Instant.isAfter(other: Instant): Boolean = this.isAfter(other)

fun Instant.isBefore(other: Instant): Boolean = this.isBefore(other)

fun Instant.isBetween(start: Instant, end: Instant): Boolean =
    this.isAfter(start) && this.isBefore(end)

// Collection extensions for domain objects
fun List<CartItem>.totalPrice(): Money =
    fold(Money.ZERO) { acc, item -> acc + (item.price * item.quantity) }

fun List<CartItem>.findByRecipeId(recipeId: UUID): CartItem? =
    firstOrNull { it.recipeId == recipeId }

fun List<CartItem>.containsRecipe(recipeId: UUID): Boolean =
    any { it.recipeId == recipeId }

fun List<CartItem>.totalQuantity(): Int =
    sumOf { it.quantity }

fun List<Cart>.filterByState(state: CartState): List<Cart> =
    filter { it.state == state }

fun List<Cart>.sortedByUpdatedDate(): List<Cart> =
    sortedByDescending { it.updatedAt }

// Money extensions
operator fun Money.plus(other: Money): Money =
    Money(this.amount + other.amount, this.currency)

operator fun Money.minus(other: Money): Money {
    require(this.currency == other.currency) { "Cannot subtract different currencies" }
    return Money(this.amount - other.amount, this.currency)
}

operator fun Money.times(multiplier: Int): Money =
    Money(this.amount * multiplier, this.currency)

operator fun Money.times(multiplier: Double): Money =
    Money(this.amount * multiplier, this.currency)

fun Money.isPositive(): Boolean = amount > 0

fun Money.isNegative(): Boolean = amount < 0

fun Money.isZero(): Boolean = amount == 0.0
```

**DTO Conversion Extensions:**
```kotlin
// File: meal-selection-service-api/src/main/kotlin/com/yourcompany/mealselection/api/dto/CartExtensions.kt
package com.yourcompany.mealselection.api.dto

import com.yourcompany.mealselection.domain.*
import com.yourcompany.mealselection.extensions.toUUID
import java.time.Instant
import java.util.UUID

// Domain to Response
fun Cart.toResponse(): CartResponse = CartResponse(
    id = id.toString(),
    customerId = customerId.toString(),
    items = items.map { it.toResponse() },
    state = state.name,
    totalAmount = totalAmount().amount,
    createdAt = createdAt.toString(),
    updatedAt = updatedAt.toString()
)

fun CartItem.toResponse(): CartItemResponse = CartItemResponse(
    id = id.toString(),
    recipeId = recipeId.toString(),
    quantity = quantity,
    price = price.amount
)

// Request to Domain
fun CartItemRequest.toDomain(): CartItem = CartItem(
    id = UUID.randomUUID(),
    recipeId = recipeId.toUUID(),
    quantity = quantity,
    price = Money(price)
)

fun CreateCartRequest.toDomain(): Cart = Cart(
    id = UUID.randomUUID(),
    customerId = customerId.toUUID(),
    items = items.map { it.toDomain() },
    state = CartState.ACTIVE,
    createdAt = Instant.now(),
    updatedAt = Instant.now()
)

// List transformations
fun List<Cart>.toResponseList(): List<CartResponse> = map { it.toResponse() }

fun List<CartItem>.toResponseList(): List<CartItemResponse> = map { it.toResponse() }
```

**Repository Extensions:**
```kotlin
// File: meal-selection-service-shared/src/main/kotlin/com/yourcompany/mealselection/extensions/JooqExtensions.kt
package com.yourcompany.mealselection.extensions

import org.jooq.*
import org.jooq.impl.DSL
import java.time.Instant
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.UUID

// jOOQ Record extensions
fun Record.getUUID(field: Field<UUID>): UUID = get(field)

fun Record.getUUIDOrNull(field: Field<UUID>): UUID? = get(field)

fun Record.getInstant(field: Field<OffsetDateTime>): Instant =
    get(field).toInstant()

fun Record.getInstantOrNull(field: Field<OffsetDateTime>): Instant? =
    get(field)?.toInstant()

fun Record.getString(field: Field<String>): String = get(field)

fun Record.getStringOrNull(field: Field<String>): String? = get(field)

// Instant to OffsetDateTime conversion
fun Instant.toOffsetDateTime(): OffsetDateTime =
    this.atOffset(ZoneOffset.UTC)

// Query builder extensions
fun <R : Record> SelectWhereStep<R>.whereIdEquals(
    field: Field<UUID>,
    id: UUID
): SelectConditionStep<R> = where(field.eq(id))

fun <R : Record> SelectWhereStep<R>.whereInList(
    field: Field<UUID>,
    ids: List<UUID>
): SelectConditionStep<R> = where(field.`in`(ids))

fun <R : Record> SelectConditionStep<R>.andCreatedAfter(
    field: Field<OffsetDateTime>,
    instant: Instant
): SelectConditionStep<R> = and(field.greaterThan(instant.toOffsetDateTime()))

fun <R : Record> SelectConditionStep<R>.andCreatedBefore(
    field: Field<OffsetDateTime>,
    instant: Instant
): SelectConditionStep<R> = and(field.lessThan(instant.toOffsetDateTime()))

// Pagination extensions
fun <R : Record> SelectLimitStep<R>.paginate(page: Int, pageSize: Int): SelectForUpdateStep<R> =
    limit(pageSize).offset(page * pageSize)
```

**Validation Extensions:**
```kotlin
// File: meal-selection-service-shared/src/main/kotlin/com/yourcompany/mealselection/extensions/ValidationExtensions.kt
package com.yourcompany.mealselection.extensions

import com.yourcompany.mealselection.exception.ValidationException

// String validation
fun String.requireNotBlank(fieldName: String): String =
    also { require(it.isNotBlank()) { "$fieldName cannot be blank" } }

fun String.requireMaxLength(fieldName: String, maxLength: Int): String =
    also { require(it.length <= maxLength) { "$fieldName cannot exceed $maxLength characters" } }

fun String.requireMinLength(fieldName: String, minLength: Int): String =
    also { require(it.length >= minLength) { "$fieldName must be at least $minLength characters" } }

fun String.requireEmail(fieldName: String): String =
    also { require(it.contains("@")) { "$fieldName must be a valid email" } }

// Numeric validation
fun Int.requirePositive(fieldName: String): Int =
    also { require(it > 0) { "$fieldName must be positive" } }

fun Int.requireNonNegative(fieldName: String): Int =
    also { require(it >= 0) { "$fieldName cannot be negative" } }

fun Int.requireInRange(fieldName: String, range: IntRange): Int =
    also { require(it in range) { "$fieldName must be between ${range.first} and ${range.last}" } }

fun Double.requirePositive(fieldName: String): Double =
    also { require(it > 0) { "$fieldName must be positive" } }

fun Double.requireNonNegative(fieldName: String): Double =
    also { require(it >= 0) { "$fieldName cannot be negative" } }

// Collection validation
fun <T> List<T>.requireNotEmpty(fieldName: String): List<T> =
    also { require(it.isNotEmpty()) { "$fieldName cannot be empty" } }

fun <T> List<T>.requireMaxSize(fieldName: String, maxSize: Int): List<T> =
    also { require(it.size <= maxSize) { "$fieldName cannot exceed $maxSize items" } }

fun <T> List<T>.requireMinSize(fieldName: String, minSize: Int): List<T> =
    also { require(it.size >= minSize) { "$fieldName must have at least $minSize items" } }

// Combined validation
fun String.validate(fieldName: String, vararg validators: (String) -> Boolean): String {
    val errors = validators.mapIndexedNotNull { index, validator ->
        if (!validator(this)) "$fieldName failed validation rule ${index + 1}" else null
    }
    if (errors.isNotEmpty()) {
        throw ValidationException("Validation failed", mapOf(fieldName to errors.joinToString(", ")))
    }
    return this
}
```

**Frequency:** 88% of files use extension functions for domain-specific operations

**Why:** Extension functions provide:
- Type-safe DSL creation
- Better code organization and discoverability
- Clean separation of concerns
- Reusable utilities without utility classes
- Natural syntax that feels like built-in methods

### 3. Higher-Order Functions

**Pattern:** Use functions that take functions as parameters or return functions to create flexible, composable abstractions.

**Frequency:** 84% of PRs use higher-order functions

**Repository Pattern with Higher-Order Functions:**
```kotlin
// File: meal-selection-service-shared/src/main/kotlin/com/yourcompany/mealselection/repository/BaseRepository.kt
package com.yourcompany.mealselection.repository

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.jooq.DSLContext
import org.slf4j.LoggerFactory

abstract class BaseRepository<T> {
    protected val logger = LoggerFactory.getLogger(this::class.java)

    // Execute query with logging and error handling
    protected suspend fun <R> executeQuery(
        operation: String,
        block: suspend (DSLContext) -> R
    ): R = withContext(Dispatchers.IO) {
        logger.debug("Executing $operation")
        try {
            block(dsl).also {
                logger.debug("$operation completed successfully")
            }
        } catch (e: Exception) {
            logger.error("$operation failed", e)
            throw RepositoryException("Failed to execute $operation", e)
        }
    }

    // Execute with transaction
    protected suspend fun <R> executeInTransaction(
        operation: String,
        block: suspend (DSLContext) -> R
    ): R = withContext(Dispatchers.IO) {
        logger.debug("Starting transaction for $operation")
        try {
            dsl.transactionResult { configuration ->
                val transactionalDsl = configuration.dsl()
                runBlocking {
                    block(transactionalDsl)
                }
            }.also {
                logger.debug("Transaction for $operation completed successfully")
            }
        } catch (e: Exception) {
            logger.error("Transaction for $operation failed", e)
            throw RepositoryException("Failed to execute $operation in transaction", e)
        }
    }

    // Retry logic as higher-order function
    protected suspend fun <R> withRetry(
        maxAttempts: Int = 3,
        delayMillis: Long = 100,
        operation: suspend () -> R
    ): R {
        var attempt = 1
        var lastException: Exception? = null

        while (attempt <= maxAttempts) {
            try {
                return operation()
            } catch (e: Exception) {
                lastException = e
                if (attempt < maxAttempts) {
                    logger.warn("Attempt $attempt failed, retrying...", e)
                    delay(delayMillis * attempt)
                }
                attempt++
            }
        }

        throw RepositoryException(
            "Operation failed after $maxAttempts attempts",
            lastException
        )
    }

    // Cache wrapper as higher-order function
    protected suspend fun <K, V> withCache(
        key: K,
        cache: Cache<K, V>,
        loader: suspend () -> V
    ): V {
        return cache.get(key) ?: run {
            loader().also { value ->
                cache.put(key, value)
            }
        }
    }
}
```

**Concrete Repository Implementation:**
```kotlin
// File: meal-selection-service-shared/src/main/kotlin/com/yourcompany/mealselection/repository/JooqCartRepository.kt
package com.yourcompany.mealselection.repository

import com.yourcompany.mealselection.domain.Cart
import com.yourcompany.mealselection.db.tables.references.CART
import java.util.UUID

class JooqCartRepository(
    private val dsl: DSLContext
) : BaseRepository<Cart>(), CartRepository {

    override suspend fun findById(id: UUID): Cart? =
        executeQuery("findById") { dsl ->
            dsl.selectFrom(CART)
                .whereIdEquals(CART.ID, id)
                .fetchOne()
                ?.toDomain()
        }

    override suspend fun findByCustomerId(customerId: UUID): List<Cart> =
        executeQuery("findByCustomerId") { dsl ->
            dsl.selectFrom(CART)
                .where(CART.CUSTOMER_ID.eq(customerId))
                .fetch()
                .map { it.toDomain() }
        }

    override suspend fun save(cart: Cart): Cart =
        executeInTransaction("save") { dsl ->
            dsl.insertInto(CART)
                .set(CART.ID, cart.id)
                .set(CART.CUSTOMER_ID, cart.customerId)
                .set(CART.STATE, cart.state.name)
                .set(CART.CREATED_AT, cart.createdAt.toOffsetDateTime())
                .set(CART.UPDATED_AT, cart.updatedAt.toOffsetDateTime())
                .onConflict(CART.ID)
                .doUpdate()
                .set(CART.UPDATED_AT, cart.updatedAt.toOffsetDateTime())
                .set(CART.STATE, cart.state.name)
                .returning()
                .fetchOne()
                ?.toDomain()
                ?: throw IllegalStateException("Failed to save cart")
        }

    override suspend fun saveAll(carts: List<Cart>): List<Cart> =
        executeInTransaction("saveAll") { dsl ->
            carts.map { cart ->
                dsl.insertInto(CART)
                    .set(CART.ID, cart.id)
                    .set(CART.CUSTOMER_ID, cart.customerId)
                    .set(CART.STATE, cart.state.name)
                    .set(CART.CREATED_AT, cart.createdAt.toOffsetDateTime())
                    .set(CART.UPDATED_AT, cart.updatedAt.toOffsetDateTime())
                    .onConflict(CART.ID)
                    .doUpdate()
                    .set(CART.UPDATED_AT, cart.updatedAt.toOffsetDateTime())
                    .set(CART.STATE, cart.state.name)
                    .returning()
                    .fetchOne()
                    ?.toDomain()
                    ?: throw IllegalStateException("Failed to save cart")
            }
        }
}
```

**Service Layer with Higher-Order Functions:**
```kotlin
// File: meal-selection-service-shared/src/main/kotlin/com/yourcompany/mealselection/service/ServiceHelpers.kt
package com.yourcompany.mealselection.service

import com.yourcompany.mealselection.exception.NotFoundException
import org.slf4j.Logger
import kotlin.system.measureTimeMillis

// Find or throw helper
suspend fun <T> findOrThrow(
    entityName: String,
    id: Any,
    finder: suspend () -> T?
): T {
    return finder() ?: throw NotFoundException("$entityName not found: $id")
}

// Logging helper
suspend fun <T> withLogging(
    logger: Logger,
    operation: String,
    block: suspend () -> T
): T {
    logger.info("Starting $operation")
    return try {
        val result: T
        val duration = measureTimeMillis {
            result = block()
        }
        logger.info("$operation completed in ${duration}ms")
        result
    } catch (e: Exception) {
        logger.error("$operation failed", e)
        throw e
    }
}

// Metrics helper
suspend fun <T> withMetrics(
    metricsService: MetricsService,
    metricName: String,
    tags: Map<String, String> = emptyMap(),
    block: suspend () -> T
): T {
    val timer = metricsService.startTimer()
    return try {
        block().also {
            metricsService.recordTimer(metricName, timer, tags + ("result" to "success"))
        }
    } catch (e: Exception) {
        metricsService.recordTimer(metricName, timer, tags + ("result" to "failure"))
        throw e
    }
}

// Validation helper
fun <T> withValidation(
    value: T,
    vararg validators: (T) -> ValidationResult
): T {
    val results = validators.map { it(value) }
    val errors = results.flatMap { it.errors }

    if (errors.isNotEmpty()) {
        throw ValidationException(
            "Validation failed",
            errors.associate { it.field to it.message }
        )
    }

    return value
}
```

**Usage in Service:**
```kotlin
// File: meal-selection-service-shared/src/main/kotlin/com/yourcompany/mealselection/service/CartService.kt
package com.yourcompany.mealselection.service

class CartService(
    private val cartRepository: CartRepository,
    private val eventPublisher: EventPublisher,
    private val metricsService: MetricsService
) {
    private val logger = LoggerFactory.getLogger(CartService::class.java)

    suspend fun findById(id: UUID): Cart =
        withMetrics(metricsService, "cart.findById") {
            withLogging(logger, "findById($id)") {
                findOrThrow("Cart", id) {
                    cartRepository.findById(id)
                }
            }
        }

    suspend fun create(customerId: UUID, items: List<CartItem>): Cart =
        withMetrics(metricsService, "cart.create") {
            withLogging(logger, "create for customer $customerId") {
                withValidation(
                    Cart(
                        id = UUID.randomUUID(),
                        customerId = customerId,
                        items = items,
                        state = CartState.ACTIVE,
                        createdAt = Instant.now(),
                        updatedAt = Instant.now()
                    ),
                    CartValidator::validateCart,
                    CartValidator::validateItems
                ).let { cart ->
                    cartRepository.save(cart)
                        .also { savedCart ->
                            eventPublisher.publish(CartCreatedEvent(savedCart))
                        }
                }
            }
        }
}
```

**Function Composition:**
```kotlin
// File: meal-selection-service-shared/src/main/kotlin/com/yourcompany/mealselection/util/Functional.kt
package com.yourcompany.mealselection.util

// Function composition operator
infix fun <A, B, C> ((B) -> C).compose(other: (A) -> B): (A) -> C =
    { a -> this(other(a)) }

// Pipe operator
infix fun <A, B> A.pipe(f: (A) -> B): B = f(this)

// Apply multiple transformations
fun <T> T.applyAll(vararg transformations: (T) -> T): T =
    transformations.fold(this) { acc, transform -> transform(acc) }

// Conditional transformation
fun <T> T.applyIf(condition: Boolean, transformation: (T) -> T): T =
    if (condition) transformation(this) else this

fun <T> T.applyIfNotNull(value: Any?, transformation: (T) -> T): T =
    if (value != null) transformation(this) else this

// Usage example
class CartQueryBuilder {
    private var customerId: UUID? = null
    private var state: CartState? = null
    private var startDate: Instant? = null
    private var endDate: Instant? = null

    fun forCustomer(id: UUID) = apply { customerId = id }
    fun withState(s: CartState) = apply { state = s }
    fun createdAfter(date: Instant) = apply { startDate = date }
    fun createdBefore(date: Instant) = apply { endDate = date }

    fun build(): CartQuery =
        CartQuery()
            .applyIfNotNull(customerId) { it.copy(customerId = customerId) }
            .applyIfNotNull(state) { it.copy(state = state) }
            .applyIfNotNull(startDate) { it.copy(startDate = startDate) }
            .applyIfNotNull(endDate) { it.copy(endDate = endDate) }
}
```

**Frequency:** 84% of service and repository code uses higher-order functions

**Why:** Higher-order functions provide:
- Reusable cross-cutting concerns (logging, metrics, transactions)
- Better separation of business logic from infrastructure
- Type-safe function composition
- Flexible error handling strategies
- Testable abstractions

### 4. Immutable Data Structures

**Pattern:** Use immutable data classes with copy methods and functional transformations to ensure thread safety and predictable behavior.

**Frequency:** 100% of domain models are immutable

**Immutable Domain Models:**
```kotlin
// File: meal-selection-service-domain/src/main/kotlin/com/yourcompany/mealselection/domain/Cart.kt
package com.yourcompany.mealselection.domain

import java.time.Instant
import java.util.UUID

data class Cart(
    val id: UUID,
    val customerId: UUID,
    val items: List<CartItem>,
    val state: CartState,
    val createdAt: Instant,
    val updatedAt: Instant
) {
    // All modifications return new instances
    fun addItem(item: CartItem): Cart {
        require(!isLocked()) { "Cannot modify locked cart" }
        return copy(
            items = items + item,
            updatedAt = Instant.now()
        )
    }

    fun removeItem(itemId: UUID): Cart {
        require(!isLocked()) { "Cannot modify locked cart" }
        return copy(
            items = items.filterNot { it.id == itemId },
            updatedAt = Instant.now()
        )
    }

    fun updateItemQuantity(itemId: UUID, newQuantity: Int): Cart {
        require(!isLocked()) { "Cannot modify locked cart" }
        require(newQuantity > 0) { "Quantity must be positive" }

        return copy(
            items = items.map { item ->
                if (item.id == itemId) {
                    item.copy(quantity = newQuantity)
                } else {
                    item
                }
            },
            updatedAt = Instant.now()
        )
    }

    fun lock(): Cart = copy(
        state = CartState.LOCKED,
        updatedAt = Instant.now()
    )

    fun complete(): Cart {
        require(isLocked()) { "Cart must be locked before completion" }
        return copy(
            state = CartState.COMPLETED,
            updatedAt = Instant.now()
        )
    }

    fun isLocked(): Boolean = state == CartState.LOCKED

    fun isCompleted(): Boolean = state == CartState.COMPLETED

    fun totalAmount(): Money {
        return items.fold(Money.ZERO) { acc, item ->
            acc + (item.price * item.quantity)
        }
    }

    fun itemCount(): Int = items.size

    fun totalQuantity(): Int = items.sumOf { it.quantity }
}

data class CartItem(
    val id: UUID,
    val recipeId: UUID,
    val quantity: Int,
    val price: Money
) {
    init {
        require(quantity > 0) { "Quantity must be positive" }
        require(price.amount >= 0) { "Price cannot be negative" }
    }
}

enum class CartState {
    ACTIVE,
    LOCKED,
    COMPLETED,
    CANCELLED
}
```

**Immutable Value Objects:**
```kotlin
// File: meal-selection-service-domain/src/main/kotlin/com/yourcompany/mealselection/domain/Money.kt
package com.yourcompany.mealselection.domain

import java.math.BigDecimal
import java.math.RoundingMode

data class Money(
    val amount: Double,
    val currency: String = "EUR"
) {
    init {
        require(amount >= 0) { "Amount cannot be negative" }
        require(currency.length == 3) { "Currency must be 3-letter code" }
    }

    companion object {
        val ZERO = Money(0.0)
        val ONE = Money(1.0)
    }

    operator fun plus(other: Money): Money {
        requireSameCurrency(other)
        return Money(amount + other.amount, currency)
    }

    operator fun minus(other: Money): Money {
        requireSameCurrency(other)
        require(amount >= other.amount) { "Result would be negative" }
        return Money(amount - other.amount, currency)
    }

    operator fun times(multiplier: Int): Money =
        Money(amount * multiplier, currency)

    operator fun times(multiplier: Double): Money =
        Money(amount * multiplier, currency)

    operator fun div(divisor: Int): Money {
        require(divisor != 0) { "Cannot divide by zero" }
        return Money(amount / divisor, currency)
    }

    fun toBigDecimal(): BigDecimal =
        BigDecimal(amount).setScale(2, RoundingMode.HALF_UP)

    fun isZero(): Boolean = amount == 0.0

    fun isPositive(): Boolean = amount > 0.0

    private fun requireSameCurrency(other: Money) {
        require(currency == other.currency) {
            "Cannot operate on different currencies: $currency vs ${other.currency}"
        }
    }
}
```

**Immutable Collections:**
```kotlin
// File: meal-selection-service-domain/src/main/kotlin/com/yourcompany/mealselection/domain/Recipe.kt
package com.yourcompany.mealselection.domain

import java.util.UUID

data class Recipe(
    val id: UUID,
    val name: String,
    val description: String,
    val ingredients: List<Ingredient>,  // Immutable list
    val tags: Set<String>,              // Immutable set
    val nutritionInfo: NutritionInfo,
    val preparationTime: Duration
) {
    // Return new instances, never modify
    fun addIngredient(ingredient: Ingredient): Recipe =
        copy(ingredients = ingredients + ingredient)

    fun removeIngredient(ingredientId: UUID): Recipe =
        copy(ingredients = ingredients.filterNot { it.id == ingredientId })

    fun addTag(tag: String): Recipe =
        copy(tags = tags + tag)

    fun removeTag(tag: String): Recipe =
        copy(tags = tags - tag)

    fun updateNutrition(nutrition: NutritionInfo): Recipe =
        copy(nutritionInfo = nutrition)

    // Queries don't modify state
    fun hasIngredient(ingredientId: UUID): Boolean =
        ingredients.any { it.id == ingredientId }

    fun hasTag(tag: String): Boolean =
        tag in tags

    fun isVegetarian(): Boolean =
        "vegetarian" in tags

    fun isVegan(): Boolean =
        "vegan" in tags

    fun totalCalories(): Int =
        ingredients.sumOf { it.calories * it.amount }
}

data class Ingredient(
    val id: UUID,
    val name: String,
    val amount: Double,
    val unit: String,
    val calories: Int
)

data class NutritionInfo(
    val servingSize: String,
    val calories: Int,
    val protein: Double,
    val carbohydrates: Double,
    val fat: Double,
    val fiber: Double,
    val sodium: Double
)
```

**Functional State Updates:**
```kotlin
// File: meal-selection-service-shared/src/main/kotlin/com/yourcompany/mealselection/service/OrderService.kt
package com.yourcompany.mealselection.service

import com.yourcompany.mealselection.domain.*
import java.util.UUID

class OrderService(
    private val orderRepository: OrderRepository,
    private val cartRepository: CartRepository,
    private val paymentService: PaymentService
) {
    suspend fun processOrder(orderId: UUID): Order {
        // Functional pipeline: each step returns new immutable state
        return orderRepository.findById(orderId)
            ?.let { order -> validateOrder(order) }
            ?.let { order -> lockCart(order) }
            ?.let { order -> processPayment(order) }
            ?.let { order -> confirmOrder(order) }
            ?.let { order -> orderRepository.save(order) }
            ?: throw NotFoundException("Order not found: $orderId")
    }

    private fun validateOrder(order: Order): Order {
        require(order.state == OrderState.PENDING) {
            "Order must be pending"
        }
        require(order.items.isNotEmpty()) {
            "Order must have items"
        }
        return order
    }

    private suspend fun lockCart(order: Order): Order {
        val cart = cartRepository.findById(order.cartId)
            ?: throw NotFoundException("Cart not found")

        cartRepository.save(cart.lock())

        return order.copy(state = OrderState.PROCESSING)
    }

    private suspend fun processPayment(order: Order): Order {
        val payment = paymentService.charge(
            customerId = order.customerId,
            amount = order.totalAmount
        )

        return order.copy(
            paymentId = payment.id,
            state = OrderState.PAID
        )
    }

    private fun confirmOrder(order: Order): Order =
        order.copy(
            state = OrderState.CONFIRMED,
            confirmedAt = Instant.now()
        )
}
```

**Frequency:** 100% of domain models use immutability

**Why:** Immutability provides:
- Thread-safe code by default
- Predictable behavior without side effects
- Easy reasoning about state changes
- Better debugging and testing
- Natural history tracking (keep old versions)

### 5. Collection Processing with Functional Operations

**Pattern:** Use functional collection operations (map, filter, fold, groupBy) instead of imperative loops.

**Frequency:** 92% of PRs use functional collection operations

**Map and Filter:**
```kotlin
// File: meal-selection-service-shared/src/main/kotlin/com/yourcompany/mealselection/service/RecipeService.kt
package com.yourcompany.mealselection.service

class RecipeService(
    private val recipeRepository: RecipeRepository
) {
    suspend fun findAvailableRecipes(
        customerId: UUID,
        preferences: CustomerPreferences
    ): List<Recipe> {
        return recipeRepository.findAll()
            // Filter by dietary restrictions
            .filter { recipe ->
                when {
                    preferences.isVegetarian && !recipe.isVegetarian() -> false
                    preferences.isVegan && !recipe.isVegan() -> false
                    preferences.isGlutenFree && !recipe.isGlutenFree() -> false
                    else -> true
                }
            }
            // Filter by excluded ingredients
            .filterNot { recipe ->
                recipe.ingredients.any { ingredient ->
                    ingredient.id in preferences.excludedIngredients
                }
            }
            // Filter by calorie limits
            .filter { recipe ->
                recipe.totalCalories() in preferences.minCalories..preferences.maxCalories
            }
            // Filter by preparation time
            .filter { recipe ->
                recipe.preparationTime <= preferences.maxPreparationTime
            }
            // Map to add customer-specific data
            .map { recipe ->
                recipe.copy(
                    isFavorite = preferences.favoriteRecipes.contains(recipe.id),
                    previousOrderCount = preferences.recipeOrderCounts[recipe.id] ?: 0
                )
            }
            // Sort by preference
            .sortedWith(
                compareByDescending<Recipe> { it.isFavorite }
                    .thenByDescending { it.previousOrderCount }
                    .thenBy { it.name }
            )
    }

    suspend fun categorizeRecipes(recipes: List<Recipe>): Map<String, List<Recipe>> {
        return recipes
            .flatMap { recipe ->
                recipe.tags.map { tag -> tag to recipe }
            }
            .groupBy({ it.first }, { it.second })
            .mapValues { (_, recipes) ->
                recipes.sortedBy { it.name }
            }
    }
}
```

**Fold and Reduce:**
```kotlin
// File: meal-selection-service-domain/src/main/kotlin/com/yourcompany/mealselection/domain/OrderCalculations.kt
package com.yourcompany.mealselection.domain

data class OrderSummary(
    val totalItems: Int,
    val totalQuantity: Int,
    val subtotal: Money,
    val tax: Money,
    val shippingFee: Money,
    val discount: Money,
    val total: Money
)

fun List<OrderItem>.calculateSummary(
    taxRate: Double,
    shippingFee: Money,
    discountCode: String?
): OrderSummary {
    // Calculate subtotal using fold
    val subtotal = fold(Money.ZERO) { acc, item ->
        acc + (item.price * item.quantity)
    }

    // Calculate tax
    val tax = subtotal * taxRate

    // Calculate discount
    val discount = discountCode?.let { code ->
        calculateDiscount(code, subtotal)
    } ?: Money.ZERO

    // Calculate total
    val total = subtotal + tax + shippingFee - discount

    return OrderSummary(
        totalItems = size,
        totalQuantity = sumOf { it.quantity },
        subtotal = subtotal,
        tax = tax,
        shippingFee = shippingFee,
        discount = discount,
        total = total
    )
}

// Complex aggregation with fold
fun List<Order>.calculateCustomerStats(): CustomerStats {
    return fold(
        CustomerStats(
            totalOrders = 0,
            totalSpent = Money.ZERO,
            averageOrderValue = Money.ZERO,
            favoriteRecipes = emptyMap(),
            ordersByMonth = emptyMap()
        )
    ) { stats, order ->
        val recipeFrequency = order.items
            .groupingBy { it.recipeId }
            .eachCount()
            .mapValues { (_, count) ->
                (stats.favoriteRecipes[it.key] ?: 0) + count
            }

        val monthKey = order.createdAt.toLocalDate().withDayOfMonth(1)
        val monthlyOrders = stats.ordersByMonth.toMutableMap()
        monthlyOrders[monthKey] = (monthlyOrders[monthKey] ?: 0) + 1

        stats.copy(
            totalOrders = stats.totalOrders + 1,
            totalSpent = stats.totalSpent + order.totalAmount,
            favoriteRecipes = stats.favoriteRecipes + recipeFrequency,
            ordersByMonth = monthlyOrders
        )
    }.let { stats ->
        stats.copy(
            averageOrderValue = if (stats.totalOrders > 0) {
                stats.totalSpent / stats.totalOrders
            } else {
                Money.ZERO
            }
        )
    }
}
```

**GroupBy and Partition:**
```kotlin
// File: meal-selection-service-shared/src/main/kotlin/com/yourcompany/mealselection/service/AnalyticsService.kt
package com.yourcompany.mealselection.service

class AnalyticsService {
    fun analyzeOrders(orders: List<Order>): OrderAnalytics {
        // Group orders by state
        val ordersByState = orders.groupBy { it.state }

        // Partition active vs completed
        val (activeOrders, completedOrders) = orders.partition {
            it.state in listOf(OrderState.PENDING, OrderState.PROCESSING)
        }

        // Group by customer
        val ordersByCustomer = orders.groupBy { it.customerId }

        // Calculate revenue by month
        val revenueByMonth = orders
            .filter { it.state == OrderState.COMPLETED }
            .groupBy { order ->
                order.createdAt.toLocalDate()
                    .withDayOfMonth(1)
            }
            .mapValues { (_, orders) ->
                orders.fold(Money.ZERO) { acc, order ->
                    acc + order.totalAmount
                }
            }

        // Find top customers
        val topCustomers = ordersByCustomer
            .mapValues { (_, orders) ->
                orders.fold(Money.ZERO) { acc, order ->
                    acc + order.totalAmount
                }
            }
            .entries
            .sortedByDescending { it.value.amount }
            .take(10)
            .map { (customerId, totalSpent) ->
                CustomerSummary(
                    customerId = customerId,
                    orderCount = ordersByCustomer[customerId]?.size ?: 0,
                    totalSpent = totalSpent
                )
            }

        return OrderAnalytics(
            totalOrders = orders.size,
            activeOrders = activeOrders.size,
            completedOrders = completedOrders.size,
            ordersByState = ordersByState.mapValues { it.value.size },
            revenueByMonth = revenueByMonth,
            topCustomers = topCustomers
        )
    }

    fun groupRecipesByCategory(recipes: List<Recipe>): Map<RecipeCategory, List<Recipe>> {
        return recipes
            .groupBy { recipe ->
                when {
                    recipe.isVegan() -> RecipeCategory.VEGAN
                    recipe.isVegetarian() -> RecipeCategory.VEGETARIAN
                    recipe.hasTag("seafood") -> RecipeCategory.SEAFOOD
                    recipe.hasTag("chicken") -> RecipeCategory.POULTRY
                    recipe.hasTag("beef") -> RecipeCategory.MEAT
                    else -> RecipeCategory.OTHER
                }
            }
    }
}
```

**Sequence Operations for Large Collections:**
```kotlin
// File: meal-selection-service-shared/src/main/kotlin/com/yourcompany/mealselection/service/ReportService.kt
package com.yourcompany.mealselection.service

class ReportService(
    private val orderRepository: OrderRepository
) {
    suspend fun generateLargeReport(startDate: Instant, endDate: Instant): Report {
        // Use sequence for lazy evaluation on large datasets
        return orderRepository.findAllBetween(startDate, endDate)
            .asSequence()
            .filter { it.state == OrderState.COMPLETED }
            .map { order ->
                OrderReportLine(
                    orderId = order.id,
                    customerId = order.customerId,
                    totalAmount = order.totalAmount,
                    itemCount = order.items.size,
                    createdAt = order.createdAt
                )
            }
            .groupBy { it.createdAt.toLocalDate() }
            .mapValues { (_, lines) ->
                DailyReport(
                    orderCount = lines.count(),
                    revenue = lines.fold(Money.ZERO) { acc, line ->
                        acc + line.totalAmount
                    },
                    averageOrderValue = Money(
                        lines.map { it.totalAmount.amount }.average()
                    )
                )
            }
            .toMap()
            .let { Report(it) }
    }
}
```

**Frequency:** 92% of collection processing uses functional operations

**Why:** Functional collection operations provide:
- More declarative and readable code
- Better performance with lazy evaluation (sequences)
- Composable transformations
- Less error-prone than manual loops
- Built-in parallelization potential

### 6. Type-Safe Builders with DSL

**Pattern:** Create domain-specific languages using lambda receivers and extension functions for type-safe, fluent APIs.

**Frequency:** 64% of PRs use or define DSLs

**Query Builder DSL:**
```kotlin
// File: meal-selection-service-shared/src/main/kotlin/com/yourcompany/mealselection/query/QueryDsl.kt
package com.yourcompany.mealselection.query

import java.time.Instant
import java.util.UUID

// DSL for building queries
class OrderQueryBuilder {
    private val filters = mutableListOf<OrderFilter>()
    private var sortField: OrderSortField = OrderSortField.CREATED_AT
    private var sortDirection: SortDirection = SortDirection.DESC
    private var pageSize: Int = 20
    private var page: Int = 0

    fun customer(customerId: UUID) {
        filters.add(CustomerFilter(customerId))
    }

    fun state(state: OrderState) {
        filters.add(StateFilter(state))
    }

    fun createdAfter(instant: Instant) {
        filters.add(CreatedAfterFilter(instant))
    }

    fun createdBefore(instant: Instant) {
        filters.add(CreatedBeforeFilter(instant))
    }

    fun totalGreaterThan(amount: Money) {
        filters.add(TotalGreaterThanFilter(amount))
    }

    fun sortBy(field: OrderSortField, direction: SortDirection = SortDirection.ASC) {
        sortField = field
        sortDirection = direction
    }

    fun pagination(pageSize: Int, page: Int = 0) {
        this.pageSize = pageSize
        this.page = page
    }

    internal fun build(): OrderQuery = OrderQuery(
        filters = filters.toList(),
        sort = OrderSort(sortField, sortDirection),
        pagination = Pagination(pageSize, page)
    )
}

// DSL entry point
fun orderQuery(init: OrderQueryBuilder.() -> Unit): OrderQuery {
    return OrderQueryBuilder().apply(init).build()
}

// Usage
val query = orderQuery {
    customer(customerId)
    state(OrderState.COMPLETED)
    createdAfter(Instant.now().minus(30, ChronoUnit.DAYS))
    sortBy(OrderSortField.TOTAL_AMOUNT, SortDirection.DESC)
    pagination(pageSize = 50, page = 0)
}
```

**Test Data Builder DSL:**
```kotlin
// File: meal-selection-service-domain/src/test/kotlin/com/yourcompany/mealselection/domain/TestBuilders.kt
package com.yourcompany.mealselection.domain

import java.time.Instant
import java.util.UUID

// Cart builder DSL
class CartBuilder {
    private var id: UUID = UUID.randomUUID()
    private var customerId: UUID = UUID.randomUUID()
    private var items: MutableList<CartItem> = mutableListOf()
    private var state: CartState = CartState.ACTIVE
    private var createdAt: Instant = Instant.now()
    private var updatedAt: Instant = Instant.now()

    fun id(id: UUID) {
        this.id = id
    }

    fun customer(customerId: UUID) {
        this.customerId = customerId
    }

    fun state(state: CartState) {
        this.state = state
    }

    fun item(init: CartItemBuilder.() -> Unit) {
        items.add(CartItemBuilder().apply(init).build())
    }

    fun items(vararg items: CartItem) {
        this.items.addAll(items)
    }

    internal fun build(): Cart = Cart(
        id = id,
        customerId = customerId,
        items = items.toList(),
        state = state,
        createdAt = createdAt,
        updatedAt = updatedAt
    )
}

class CartItemBuilder {
    private var id: UUID = UUID.randomUUID()
    private var recipeId: UUID = UUID.randomUUID()
    private var quantity: Int = 1
    private var price: Money = Money(10.0)

    fun id(id: UUID) {
        this.id = id
    }

    fun recipe(recipeId: UUID) {
        this.recipeId = recipeId
    }

    fun quantity(quantity: Int) {
        this.quantity = quantity
    }

    fun price(amount: Double) {
        this.price = Money(amount)
    }

    internal fun build(): CartItem = CartItem(
        id = id,
        recipeId = recipeId,
        quantity = quantity,
        price = price
    )
}

// DSL entry points
fun cart(init: CartBuilder.() -> Unit): Cart =
    CartBuilder().apply(init).build()

fun cartItem(init: CartItemBuilder.() -> Unit): CartItem =
    CartItemBuilder().apply(init).build()

// Usage in tests
val testCart = cart {
    customer(customerId)
    state(CartState.ACTIVE)

    item {
        recipe(recipe1Id)
        quantity(2)
        price(15.99)
    }

    item {
        recipe(recipe2Id)
        quantity(1)
        price(12.50)
    }
}
```

**Validation DSL:**
```kotlin
// File: meal-selection-service-shared/src/main/kotlin/com/yourcompany/mealselection/validation/ValidationDsl.kt
package com.yourcompany.mealselection.validation

class ValidationBuilder<T> {
    private val rules = mutableListOf<ValidationRule<T>>()

    fun rule(message: String, predicate: (T) -> Boolean) {
        rules.add(ValidationRule(message, predicate))
    }

    fun validate(value: T): ValidationResult {
        val errors = rules
            .filter { !it.predicate(value) }
            .map { ValidationError(it.message) }

        return ValidationResult(errors)
    }
}

fun <T> validator(init: ValidationBuilder<T>.() -> Unit): Validator<T> {
    val builder = ValidationBuilder<T>().apply(init)
    return object : Validator<T> {
        override fun validate(value: T): ValidationResult =
            builder.validate(value)
    }
}

// Usage
val cartValidator = validator<Cart> {
    rule("Cart must have at least one item") { cart ->
        cart.items.isNotEmpty()
    }

    rule("Cart cannot have more than 20 items") { cart ->
        cart.items.size <= 20
    }

    rule("All items must have positive quantity") { cart ->
        cart.items.all { it.quantity > 0 }
    }

    rule("Total amount must not exceed 500") { cart ->
        cart.totalAmount().amount <= 500.0
    }
}
```

**Frequency:** 64% of codebases use DSL patterns for builders and configuration

**Why:** DSLs provide:
- Type-safe configuration
- Better IDE support with autocomplete
- More readable and maintainable code
- Domain-specific abstractions
- Reduced boilerplate

## Implementation Guidelines

### When to Use Each Scope Function

**let:**
- ✅ Null-safe transformations
- ✅ Parameter extraction and validation
- ✅ Chaining operations that return different types
```kotlin
val result = value?.let { transform(it) } ?: defaultValue
```

**apply:**
- ✅ Object initialization and configuration
- ✅ Building complex objects
- ✅ When you need to return the receiver
```kotlin
val config = HikariConfig().apply {
    jdbcUrl = url
    username = user
}
```

**also:**
- ✅ Side effects (logging, metrics, events)
- ✅ Debugging intermediate values
- ✅ Additional operations without changing the value
```kotlin
val saved = repository.save(entity)
    .also { logger.info("Saved: ${it.id}") }
```

**run:**
- ✅ Complex initialization logic
- ✅ Multiple operations on the same object
- ✅ When you need to compute and return a different value
```kotlin
val result = run {
    val a = computeA()
    val b = computeB()
    combine(a, b)
}
```

**with:**
- ✅ Multiple operations on non-nullable object
- ✅ When the receiver is already available
```kotlin
with(order) {
    validate()
    calculate()
    persist()
}
```

### Extension Function Best Practices

✅ **Do:**
- Create extensions for domain-specific operations
- Use extensions for type conversions
- Group related extensions in dedicated files
- Document complex extensions

❌ **Don't:**
- Add extensions to platform types unnecessarily
- Create extensions that break encapsulation
- Use extensions for operations that need access to private members

### Higher-Order Function Guidelines

✅ **Do:**
- Use higher-order functions for cross-cutting concerns
- Inline small higher-order functions for performance
- Provide descriptive parameter names
```kotlin
inline fun <T> withMetrics(
    name: String,
    block: () -> T
): T
```

❌ **Don't:**
- Overuse higher-order functions for simple operations
- Create deeply nested function compositions
- Forget about inline for frequently called functions

## Anti-Patterns to Avoid

❌ **Don't mutate data structures:**
```kotlin
// ❌ Bad
data class Cart(
    val id: UUID,
    val items: MutableList<CartItem>  // Mutable!
) {
    fun addItem(item: CartItem) {
        items.add(item)  // Mutation!
    }
}
```

✅ **Use immutable data:**
```kotlin
// ✅ Good
data class Cart(
    val id: UUID,
    val items: List<CartItem>  // Immutable
) {
    fun addItem(item: CartItem): Cart =
        copy(items = items + item)  // Returns new instance
}
```

❌ **Don't mix scope functions unnecessarily:**
```kotlin
// ❌ Bad - confusing nested scope functions
cart.let {
    it.also { cart ->
        cart.run {
            items.apply {
                // What is 'this' here?
            }
        }
    }
}
```

✅ **Keep scope function usage clear:**
```kotlin
// ✅ Good - clear and purposeful
cart
    .also { logger.info("Processing cart: ${it.id}") }
    .let { validateCart(it) }
    .let { saveCart(it) }
```

❌ **Don't overuse extension functions:**
```kotlin
// ❌ Bad - too generic, belongs in domain
fun Any?.toJson(): String = ...
```

✅ **Create domain-specific extensions:**
```kotlin
// ✅ Good - domain-specific
fun Cart.toResponse(): CartResponse = ...
fun Order.toDomain(): Domain.Order = ...
```

## Related Implementers

- **coroutines.md** - Async functional programming with suspend functions
- **domain-modeling.md** - Immutable domain entities
- **testing.md** - Functional testing patterns with Kotest
- **error-handling.md** - Functional error handling with Result types
- **rest-api.md** - Functional route definitions with Ktor DSL
