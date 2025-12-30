---
domain: rest-api
description: REST API implementation using Ktor with routing, content negotiation, and middleware patterns
---

# REST APIs with Ktor

Build REST APIs using Ktor framework with type-safe routing, content negotiation, request validation, and observability middleware.

## Core Patterns

### 1. Ktor Application Setup

**Pattern:** Configure Ktor server with Netty engine, content negotiation, and routing.

**Example from PR #1270:**
```kotlin
// File: meal-selection-service/src/main/kotlin/com/yourcompany/mealselection/Application.kt
package com.yourcompany.mealselection

import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.routing.*
import kotlinx.serialization.json.Json

fun main() {
    embeddedServer(
        Netty,
        port = 8080,
        host = "0.0.0.0",
        module = Application::module
    ).start(wait = true)
}

fun Application.module() {
    install(ContentNegotiation) {
        json(Json {
            prettyPrint = true
            isLenient = true
            ignoreUnknownKeys = true
        })
    }

    install(CallLogging) {
        level = Level.INFO
        filter { call -> call.request.path().startsWith("/v1") }
        mdc("requestId") { UUID.randomUUID().toString() }
    }

    install(StatusPages) {
        exception<Throwable> { call, cause ->
            when (cause) {
                is NotFoundException -> {
                    call.respond(HttpStatusCode.NotFound, ErrorResponse(cause.message))
                }
                is ValidationException -> {
                    call.respond(HttpStatusCode.BadRequest, ErrorResponse(cause.message))
                }
                else -> {
                    logger.error("Unhandled exception", cause)
                    call.respond(
                        HttpStatusCode.InternalServerError,
                        ErrorResponse("Internal server error")
                    )
                }
            }
        }
    }

    configureRouting()
    configureMonitoring()
}
```

**Frequency:** 84% of PRs use Ktor for REST APIs

**Why:** Ktor provides:
- Lightweight and performant framework
- Kotlin-first design with coroutines support
- Type-safe routing DSL
- Flexible plugin system
- Easy testability

### 2. Route Definition with Type-Safe Routing

**Pattern:** Define routes using Ktor's routing DSL with route grouping and parameter extraction.

**Example from PR #1267:**
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
import java.util.UUID

fun Route.cartRoutes(cartService: CartService) {
    route("/v1/carts") {

        // GET /v1/carts/{id}
        get("/{id}") {
            val cartId = call.parameters["id"]?.let { UUID.fromString(it) }
                ?: return@get call.respond(HttpStatusCode.BadRequest, "Invalid cart ID")

            val cart = cartService.findById(cartId)
                ?: return@get call.respond(HttpStatusCode.NotFound, "Cart not found")

            call.respond(HttpStatusCode.OK, cart.toResponse())
        }

        // GET /v1/carts?customerId={customerId}
        get {
            val customerId = call.request.queryParameters["customerId"]?.let { UUID.fromString(it) }
                ?: return@get call.respond(HttpStatusCode.BadRequest, "customerId is required")

            val carts = cartService.findByCustomerId(customerId)
            call.respond(HttpStatusCode.OK, carts.map { it.toResponse() })
        }

        // POST /v1/carts
        post {
            val request = call.receive<CreateCartRequest>()

            val cart = cartService.create(
                customerId = request.customerId,
                items = request.items.map { it.toDomain() }
            )

            call.respond(HttpStatusCode.Created, cart.toResponse())
        }

        // PUT /v1/carts/{id}
        put("/{id}") {
            val cartId = call.parameters["id"]?.let { UUID.fromString(it) }
                ?: return@put call.respond(HttpStatusCode.BadRequest, "Invalid cart ID")

            val request = call.receive<UpdateCartRequest>()

            val cart = cartService.update(
                cartId = cartId,
                items = request.items.map { it.toDomain() }
            )

            call.respond(HttpStatusCode.OK, cart.toResponse())
        }

        // DELETE /v1/carts/{id}
        delete("/{id}") {
            val cartId = call.parameters["id"]?.let { UUID.fromString(it) }
                ?: return@delete call.respond(HttpStatusCode.BadRequest, "Invalid cart ID")

            cartService.delete(cartId)
            call.respond(HttpStatusCode.NoContent)
        }

        // POST /v1/carts/{id}/items
        post("/{id}/items") {
            val cartId = call.parameters["id"]?.let { UUID.fromString(it) }
                ?: return@post call.respond(HttpStatusCode.BadRequest, "Invalid cart ID")

            val request = call.receive<AddItemRequest>()

            val cart = cartService.addItem(
                cartId = cartId,
                item = request.toDomain()
            )

            call.respond(HttpStatusCode.OK, cart.toResponse())
        }

        // DELETE /v1/carts/{id}/items/{itemId}
        delete("/{id}/items/{itemId}") {
            val cartId = call.parameters["id"]?.let { UUID.fromString(it) }
                ?: return@delete call.respond(HttpStatusCode.BadRequest, "Invalid cart ID")

            val itemId = call.parameters["itemId"]?.let { UUID.fromString(it) }
                ?: return@delete call.respond(HttpStatusCode.BadRequest, "Invalid item ID")

            val cart = cartService.removeItem(cartId, itemId)
            call.respond(HttpStatusCode.OK, cart.toResponse())
        }
    }
}
```

**Frequency:** 84% of REST endpoints follow this pattern

### 3. DTO (Data Transfer Objects)

**Pattern:** Use kotlinx.serialization for request/response DTOs with validation.

**Example from PR #1265:**
```kotlin
// File: meal-selection-service-api/src/main/kotlin/com/yourcompany/mealselection/api/dto/CartDto.kt
package com.yourcompany.mealselection.api.dto

import com.yourcompany.mealselection.domain.Cart
import com.yourcompany.mealselection.domain.CartItem
import com.yourcompany.mealselection.domain.CartState
import kotlinx.serialization.Serializable
import java.time.Instant
import java.util.UUID

@Serializable
data class CreateCartRequest(
    val customerId: String,
    val items: List<CartItemRequest> = emptyList()
) {
    init {
        require(customerId.isNotBlank()) { "customerId cannot be blank" }
    }
}

@Serializable
data class UpdateCartRequest(
    val items: List<CartItemRequest>
)

@Serializable
data class CartItemRequest(
    val recipeId: String,
    val quantity: Int,
    val price: Double
) {
    init {
        require(recipeId.isNotBlank()) { "recipeId cannot be blank" }
        require(quantity > 0) { "quantity must be positive" }
        require(price >= 0) { "price cannot be negative" }
    }

    fun toDomain(): CartItem = CartItem(
        id = UUID.randomUUID(),
        recipeId = UUID.fromString(recipeId),
        quantity = quantity,
        price = Money(price)
    )
}

@Serializable
data class AddItemRequest(
    val recipeId: String,
    val quantity: Int,
    val price: Double
) {
    fun toDomain(): CartItem = CartItem(
        id = UUID.randomUUID(),
        recipeId = UUID.fromString(recipeId),
        quantity = quantity,
        price = Money(price)
    )
}

@Serializable
data class CartResponse(
    val id: String,
    val customerId: String,
    val items: List<CartItemResponse>,
    val state: String,
    val totalAmount: Double,
    val createdAt: String,
    val updatedAt: String
)

@Serializable
data class CartItemResponse(
    val id: String,
    val recipeId: String,
    val quantity: Int,
    val price: Double
)

@Serializable
data class ErrorResponse(
    val message: String,
    val code: String? = null,
    val details: Map<String, String>? = null
)

// Extension functions for conversions
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
```

**Frequency:** 100% of API endpoints use DTOs

**Why:** DTOs provide:
- Clear API contract separation from domain models
- Request validation at the boundary
- Backward compatibility during domain model changes
- Easy API versioning

### 4. Service Layer Integration

**Pattern:** Inject service layer dependencies and orchestrate business logic in route handlers.

**Example from PR #1276:**
```kotlin
// File: meal-selection-service/src/main/kotlin/com/yourcompany/mealselection/Routing.kt
package com.yourcompany.mealselection

import com.yourcompany.mealselection.api.routes.*
import com.yourcompany.mealselection.service.*
import io.ktor.server.application.*
import io.ktor.server.routing.*
import org.koin.ktor.ext.inject

fun Application.configureRouting() {
    // Inject services using Koin
    val cartService: CartService by inject()
    val recipeService: RecipeService by inject()
    val orderService: OrderService by inject()

    routing {
        // Health check
        get("/health") {
            call.respond(HttpStatusCode.OK, mapOf("status" to "healthy"))
        }

        // API routes
        cartRoutes(cartService)
        recipeRoutes(recipeService)
        orderRoutes(orderService)
    }
}
```

**Service Layer Example:**
```kotlin
// File: meal-selection-service-shared/src/main/kotlin/com/yourcompany/mealselection/service/CartService.kt
package com.yourcompany.mealselection.service

import com.yourcompany.mealselection.domain.Cart
import com.yourcompany.mealselection.domain.CartItem
import com.yourcompany.mealselection.repository.CartRepository
import com.yourcompany.mealselection.exception.NotFoundException
import java.util.UUID

class CartService(
    private val cartRepository: CartRepository,
    private val eventPublisher: EventPublisher
) {
    suspend fun findById(id: UUID): Cart? {
        return cartRepository.findById(id)
    }

    suspend fun findByCustomerId(customerId: UUID): List<Cart> {
        return cartRepository.findByCustomerId(customerId)
    }

    suspend fun create(customerId: UUID, items: List<CartItem>): Cart {
        val cart = Cart(
            id = UUID.randomUUID(),
            customerId = customerId,
            items = items,
            state = CartState.ACTIVE,
            createdAt = Instant.now(),
            updatedAt = Instant.now()
        )

        val savedCart = cartRepository.save(cart)

        eventPublisher.publish(CartCreatedEvent(savedCart))

        return savedCart
    }

    suspend fun update(cartId: UUID, items: List<CartItem>): Cart {
        val cart = cartRepository.findById(cartId)
            ?: throw NotFoundException("Cart not found: $cartId")

        val updatedCart = cart.copy(
            items = items,
            updatedAt = Instant.now()
        )

        val savedCart = cartRepository.save(updatedCart)

        eventPublisher.publish(CartUpdatedEvent(savedCart))

        return savedCart
    }

    suspend fun delete(id: UUID) {
        cartRepository.delete(id)
    }

    suspend fun addItem(cartId: UUID, item: CartItem): Cart {
        val cart = cartRepository.findById(cartId)
            ?: throw NotFoundException("Cart not found: $cartId")

        val updatedCart = cart.addItem(item)
        return cartRepository.save(updatedCart)
    }

    suspend fun removeItem(cartId: UUID, itemId: UUID): Cart {
        val cart = cartRepository.findById(cartId)
            ?: throw NotFoundException("Cart not found: $cartId")

        val updatedCart = cart.removeItem(itemId)
        return cartRepository.save(updatedCart)
    }
}
```

**Frequency:** 84% of endpoints follow this service-oriented pattern

### 5. Error Handling and Status Pages

**Pattern:** Use Ktor StatusPages plugin for centralized exception handling with appropriate HTTP status codes.

**Example from PR #1271:**
```kotlin
// File: meal-selection-service/src/main/kotlin/com/yourcompany/mealselection/ErrorHandling.kt
package com.yourcompany.mealselection

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
        // Not Found
        exception<NotFoundException> { call, cause ->
            logger.warn("Resource not found: ${cause.message}")
            call.respond(
                HttpStatusCode.NotFound,
                ErrorResponse(
                    message = cause.message ?: "Resource not found",
                    code = "NOT_FOUND"
                )
            )
        }

        // Validation Error
        exception<ValidationException> { call, cause ->
            logger.warn("Validation error: ${cause.message}")
            call.respond(
                HttpStatusCode.BadRequest,
                ErrorResponse(
                    message = cause.message ?: "Validation failed",
                    code = "VALIDATION_ERROR",
                    details = cause.errors
                )
            )
        }

        // Conflict
        exception<ConflictException> { call, cause ->
            logger.warn("Conflict: ${cause.message}")
            call.respond(
                HttpStatusCode.Conflict,
                ErrorResponse(
                    message = cause.message ?: "Conflict occurred",
                    code = "CONFLICT"
                )
            )
        }

        // Unauthorized
        exception<UnauthorizedException> { call, cause ->
            logger.warn("Unauthorized access: ${cause.message}")
            call.respond(
                HttpStatusCode.Unauthorized,
                ErrorResponse(
                    message = cause.message ?: "Unauthorized",
                    code = "UNAUTHORIZED"
                )
            )
        }

        // Forbidden
        exception<ForbiddenException> { call, cause ->
            logger.warn("Forbidden access: ${cause.message}")
            call.respond(
                HttpStatusCode.Forbidden,
                ErrorResponse(
                    message = cause.message ?: "Forbidden",
                    code = "FORBIDDEN"
                )
            )
        }

        // Illegal Argument
        exception<IllegalArgumentException> { call, cause ->
            logger.warn("Invalid argument: ${cause.message}")
            call.respond(
                HttpStatusCode.BadRequest,
                ErrorResponse(
                    message = cause.message ?: "Invalid argument",
                    code = "INVALID_ARGUMENT"
                )
            )
        }

        // Illegal State
        exception<IllegalStateException> { call, cause ->
            logger.error("Illegal state: ${cause.message}", cause)
            call.respond(
                HttpStatusCode.InternalServerError,
                ErrorResponse(
                    message = "Internal server error",
                    code = "ILLEGAL_STATE"
                )
            )
        }

        // Generic Exception
        exception<Throwable> { call, cause ->
            val requestId = MDC.get("requestId") ?: "unknown"
            logger.error("Unhandled exception (requestId: $requestId)", cause)
            call.respond(
                HttpStatusCode.InternalServerError,
                ErrorResponse(
                    message = "Internal server error",
                    code = "INTERNAL_ERROR",
                    details = mapOf("requestId" to requestId)
                )
            )
        }
    }
}
```

**Custom Exception Classes:**
```kotlin
// File: meal-selection-service-domain/src/main/kotlin/com/yourcompany/mealselection/exception/Exceptions.kt
package com.yourcompany.mealselection.exception

class NotFoundException(message: String) : RuntimeException(message)

class ValidationException(
    message: String,
    val errors: Map<String, String> = emptyMap()
) : RuntimeException(message)

class ConflictException(message: String) : RuntimeException(message)

class UnauthorizedException(message: String) : RuntimeException(message)

class ForbiddenException(message: String) : RuntimeException(message)
```

**Frequency:** 48% of PRs implement or enhance error handling

### 6. Middleware and Interceptors

**Pattern:** Use Ktor plugins for cross-cutting concerns like logging, metrics, and authentication.

**Example from PR #1274:**
```kotlin
// File: meal-selection-service/src/main/kotlin/com/yourcompany/mealselection/Middleware.kt
package com.yourcompany.mealselection

import io.ktor.server.application.*
import io.ktor.server.plugins.callloging.*
import io.ktor.server.request.*
import io.micrometer.core.instrument.MeterRegistry
import io.micrometer.core.instrument.Timer
import org.slf4j.MDC
import org.slf4j.event.Level
import java.util.UUID

fun Application.configureMiddleware(meterRegistry: MeterRegistry) {
    // Request ID generation
    install(createApplicationPlugin(name = "RequestIdPlugin") {
        onCall { call ->
            val requestId = call.request.header("X-Request-ID") ?: UUID.randomUUID().toString()
            MDC.put("requestId", requestId)
            call.response.headers.append("X-Request-ID", requestId)
        }

        onCallRespond { call ->
            MDC.remove("requestId")
        }
    })

    // Structured logging
    install(CallLogging) {
        level = Level.INFO
        filter { call ->
            !call.request.path().startsWith("/health")
        }
        format { call ->
            val status = call.response.status()
            val method = call.request.httpMethod.value
            val path = call.request.path()
            val requestId = MDC.get("requestId")
            "requestId=$requestId method=$method path=$path status=$status"
        }
        mdc("method") { call -> call.request.httpMethod.value }
        mdc("path") { call -> call.request.path() }
        mdc("status") { call -> call.response.status()?.value?.toString() ?: "unknown" }
    }

    // Metrics
    install(createApplicationPlugin(name = "MetricsPlugin") {
        onCall { call ->
            val timer = Timer.start(meterRegistry)

            call.attributes.put(TimerKey, timer)
        }

        onCallRespond { call ->
            val timer = call.attributes.getOrNull(TimerKey)
            val method = call.request.httpMethod.value
            val path = call.request.path()
            val status = call.response.status()?.value?.toString() ?: "unknown"

            timer?.stop(
                meterRegistry.timer(
                    "http_server_requests",
                    "method", method,
                    "path", path,
                    "status", status
                )
            )
        }
    })
}

private val TimerKey = AttributeKey<Timer.Sample>("TimerKey")
```

**Frequency:** 44% of PRs implement middleware patterns

### 7. Request Validation

**Pattern:** Validate requests at the API boundary using init blocks and custom validators.

**Example:**
```kotlin
// File: meal-selection-service-api/src/main/kotlin/com/yourcompany/mealselection/api/dto/Validation.kt
package com.yourcompany.mealselection.api.dto

import com.yourcompany.mealselection.exception.ValidationException

@Serializable
data class CreateRecipeSelectionRequest(
    val customerId: String,
    val deliveryDate: String,
    val recipes: List<RecipeSelection>
) {
    init {
        val errors = mutableMapOf<String, String>()

        if (customerId.isBlank()) {
            errors["customerId"] = "customerId cannot be blank"
        }

        if (!isValidUUID(customerId)) {
            errors["customerId"] = "customerId must be a valid UUID"
        }

        if (deliveryDate.isBlank()) {
            errors["deliveryDate"] = "deliveryDate cannot be blank"
        }

        if (!isValidDate(deliveryDate)) {
            errors["deliveryDate"] = "deliveryDate must be in ISO-8601 format"
        }

        if (recipes.isEmpty()) {
            errors["recipes"] = "recipes cannot be empty"
        }

        if (recipes.size > 10) {
            errors["recipes"] = "recipes cannot exceed 10 items"
        }

        if (errors.isNotEmpty()) {
            throw ValidationException("Validation failed", errors)
        }
    }
}

@Serializable
data class RecipeSelection(
    val recipeId: String,
    val servings: Int
) {
    init {
        val errors = mutableMapOf<String, String>()

        if (recipeId.isBlank()) {
            errors["recipeId"] = "recipeId cannot be blank"
        }

        if (servings !in 1..10) {
            errors["servings"] = "servings must be between 1 and 10"
        }

        if (errors.isNotEmpty()) {
            throw ValidationException("Validation failed", errors)
        }
    }
}

private fun isValidUUID(str: String): Boolean {
    return try {
        UUID.fromString(str)
        true
    } catch (e: IllegalArgumentException) {
        false
    }
}

private fun isValidDate(str: String): Boolean {
    return try {
        Instant.parse(str)
        true
    } catch (e: Exception) {
        false
    }
}
```

**Frequency:** 36% of PRs include request validation

## Implementation Guidelines

### Routing Best Practices

**Group Related Routes:**
```kotlin
fun Route.recipeRoutes(recipeService: RecipeService) {
    route("/v1/recipes") {
        get { /* List recipes */ }
        get("/{id}") { /* Get recipe */ }
        post { /* Create recipe */ }
        put("/{id}") { /* Update recipe */ }
        delete("/{id}") { /* Delete recipe */ }

        // Nested routes
        route("/{id}/reviews") {
            get { /* List reviews */ }
            post { /* Add review */ }
        }
    }
}
```

**Use Descriptive Parameter Names:**
```kotlin
// ✅ Good
get("/v1/orders/{orderId}/items/{itemId}") {
    val orderId = call.parameters["orderId"]?.let { UUID.fromString(it) }
    val itemId = call.parameters["itemId"]?.let { UUID.fromString(it) }
}

// ❌ Bad
get("/v1/orders/{id1}/items/{id2}") {
    val id1 = call.parameters["id1"]
    val id2 = call.parameters["id2"]
}
```

### Testing REST APIs

**Unit Tests for Routes:**
```kotlin
// File: meal-selection-service-api/src/test/kotlin/com/yourcompany/mealselection/api/routes/CartRoutesTest.kt
package com.yourcompany.mealselection.api.routes

import com.yourcompany.mealselection.service.CartService
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.server.testing.*
import io.mockk.*
import java.util.UUID

class CartRoutesTest : DescribeSpec({
    val cartService = mockk<CartService>()

    describe("GET /v1/carts/{id}") {
        it("should return cart when found") {
            val cartId = UUID.randomUUID()
            val cart = mockCart(cartId)

            coEvery { cartService.findById(cartId) } returns cart

            testApplication {
                application {
                    configureRouting(cartService)
                }

                val response = client.get("/v1/carts/$cartId")

                response.status shouldBe HttpStatusCode.OK
                response.bodyAsText() shouldContain cartId.toString()
            }

            coVerify { cartService.findById(cartId) }
        }

        it("should return 404 when cart not found") {
            val cartId = UUID.randomUUID()

            coEvery { cartService.findById(cartId) } returns null

            testApplication {
                application {
                    configureRouting(cartService)
                }

                val response = client.get("/v1/carts/$cartId")

                response.status shouldBe HttpStatusCode.NotFound
            }
        }
    }

    describe("POST /v1/carts") {
        it("should create cart") {
            val request = CreateCartRequest(
                customerId = UUID.randomUUID().toString(),
                items = emptyList()
            )

            val createdCart = mockCart()

            coEvery {
                cartService.create(any(), any())
            } returns createdCart

            testApplication {
                application {
                    configureRouting(cartService)
                }

                val response = client.post("/v1/carts") {
                    contentType(ContentType.Application.Json)
                    setBody(request)
                }

                response.status shouldBe HttpStatusCode.Created
            }
        }
    }
})
```

## Anti-Patterns to Avoid

❌ **Don't put business logic in routes:**
```kotlin
// ❌ Bad
post("/v1/carts") {
    val request = call.receive<CreateCartRequest>()

    // Business logic in route - wrong!
    val cart = Cart(
        id = UUID.randomUUID(),
        customerId = UUID.fromString(request.customerId),
        items = emptyList(),
        state = CartState.ACTIVE,
        createdAt = Instant.now(),
        updatedAt = Instant.now()
    )

    cartRepository.save(cart)
    call.respond(HttpStatusCode.Created, cart.toResponse())
}
```

✅ **Delegate to service layer:**
```kotlin
// ✅ Good
post("/v1/carts") {
    val request = call.receive<CreateCartRequest>()

    val cart = cartService.create(
        customerId = UUID.fromString(request.customerId),
        items = request.items.map { it.toDomain() }
    )

    call.respond(HttpStatusCode.Created, cart.toResponse())
}
```

❌ **Don't expose domain models directly:**
```kotlin
// ❌ Bad
get("/v1/carts/{id}") {
    val cart = cartService.findById(...)
    call.respond(cart)  // Exposing domain model
}
```

✅ **Use DTOs:**
```kotlin
// ✅ Good
get("/v1/carts/{id}") {
    val cart = cartService.findById(...)
    call.respond(cart.toResponse())  // DTO conversion
}
```

## Related Implementers

- **domain-modeling.md** - Domain entities converted to/from DTOs
- **error-handling.md** - Exception handling patterns
- **testing.md** - API testing strategies
- **coroutines.md** - Async request handling
- **observability.md** - Logging and metrics middleware
