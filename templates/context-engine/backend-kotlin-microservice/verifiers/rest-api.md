---
domain: rest-api
description: Verify Ktor REST API implementation with proper routing structure, DTO usage, error handling with StatusPages, content negotiation, and comprehensive testing
---

# REST API Verification

Verify that implementation follows Ktor REST API best practices with proper routing structure, DTO usage instead of exposed domain models, centralized error handling with StatusPages, content negotiation configuration, and comprehensive route testing.

## Verification Checklist

### 1. Ktor Application Setup and Configuration

**Requirement:** Ktor server must be properly configured with Netty engine, content negotiation, StatusPages error handling, and middleware plugins.

**Verification Steps:**

✅ **Check Ktor application setup:**
```kotlin
// ✅ Correct - comprehensive Ktor application setup
// File: src/main/kotlin/com/company/service/Application.kt
package com.company.service

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
            encodeDefaults = true
        })
    }

    install(CallLogging) {
        level = Level.INFO
        filter { call -> !call.request.path().startsWith("/health") }
        mdc("requestId") { UUID.randomUUID().toString() }
    }

    install(StatusPages) {
        exception<NotFoundException> { call, cause ->
            call.respond(
                HttpStatusCode.NotFound,
                ErrorResponse(cause.message ?: "Resource not found")
            )
        }
        exception<ValidationException> { call, cause ->
            call.respond(
                HttpStatusCode.BadRequest,
                ErrorResponse(cause.message ?: "Validation failed", cause.errors)
            )
        }
        exception<Throwable> { call, cause ->
            logger.error("Unhandled exception", cause)
            call.respond(
                HttpStatusCode.InternalServerError,
                ErrorResponse("Internal server error")
            )
        }
    }

    configureRouting()
    configureMonitoring()
}

// ❌ Incorrect - minimal configuration
fun main() {
    embeddedServer(Netty, port = 8080) {
        // No ContentNegotiation
        // No StatusPages
        // No middleware
        routing {
            get("/") { call.respond("OK") }
        }
    }.start(wait = true)
}
```

✅ **Check content negotiation configuration:**
```kotlin
// ✅ Correct - proper JSON configuration
install(ContentNegotiation) {
    json(Json {
        prettyPrint = true              // Format output for readability
        isLenient = true                // Accept lenient JSON parsing
        ignoreUnknownKeys = true        // Ignore extra fields in requests
        encodeDefaults = true           // Include fields with default values
        coerceInputValues = true        // Coerce invalid nulls to defaults
        explicitNulls = false           // Omit null values from output
    })
}

// ❌ Incorrect - default configuration only
install(ContentNegotiation) {
    json()  // Missing configuration options
}
```

✅ **Check server configuration:**
```kotlin
// ✅ Correct - production-ready server configuration
fun main() {
    embeddedServer(
        Netty,
        port = System.getenv("PORT")?.toInt() ?: 8080,
        host = "0.0.0.0",
        module = Application::module,
        configure = {
            // Connection timeout
            requestQueueLimit = 1000
            runningLimit = 100
            shareWorkGroup = false

            // Graceful shutdown
            shutdownGracePeriod = 2000
            shutdownTimeout = 5000
        }
    ).start(wait = true)
}

// ❌ Incorrect - no server configuration
fun main() {
    embeddedServer(Netty, 8080) {
        routing { /* ... */ }
    }.start(wait = true)
}
```

**How to Verify:**
```bash
# Find main application file
find src/main/kotlin -name "Application.kt"

# Check for ContentNegotiation
grep -r "install(ContentNegotiation)" src/main/kotlin/

# Verify StatusPages installation
grep -r "install(StatusPages)" src/main/kotlin/

# Check JSON configuration
grep -r "json(Json" src/main/kotlin/

# Verify server configuration
grep -r "embeddedServer" src/main/kotlin/
```

**Expected Result:**
- Netty server configured with proper settings
- ContentNegotiation installed with JSON configuration
- StatusPages installed for exception handling
- CallLogging configured with MDC
- Server configured with timeouts and graceful shutdown

---

### 2. Routing Structure and Organization

**Requirement:** Routes must be organized using Ktor's routing DSL with proper grouping, path parameters extraction, and separation of concerns.

**Verification Steps:**

✅ **Check route organization:**
```kotlin
// ✅ Correct - well-organized route structure
// File: src/main/kotlin/com/company/service/routes/OrderRoutes.kt
package com.company.service.routes

import com.company.service.api.dto.*
import com.company.service.service.OrderService
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import java.util.UUID

fun Route.orderRoutes(orderService: OrderService) {
    route("/v1/orders") {

        // GET /v1/orders - List orders with optional query params
        get {
            val customerId = call.request.queryParameters["customerId"]
                ?.let { UUID.fromString(it) }
            val status = call.request.queryParameters["status"]

            val orders = when {
                customerId != null -> orderService.findByCustomerId(customerId)
                status != null -> orderService.findByStatus(status)
                else -> orderService.findAll()
            }

            call.respond(HttpStatusCode.OK, orders.map { it.toResponse() })
        }

        // GET /v1/orders/{id} - Get specific order
        get("/{id}") {
            val orderId = call.parameters["id"]?.let { UUID.fromString(it) }
                ?: return@get call.respond(HttpStatusCode.BadRequest, "Invalid order ID")

            val order = orderService.findById(orderId)
                ?: return@get call.respond(HttpStatusCode.NotFound, "Order not found")

            call.respond(HttpStatusCode.OK, order.toResponse())
        }

        // POST /v1/orders - Create new order
        post {
            val request = call.receive<CreateOrderRequest>()

            val order = orderService.create(
                customerId = UUID.fromString(request.customerId),
                items = request.items.map { it.toDomain() }
            )

            call.respond(HttpStatusCode.Created, order.toResponse())
        }

        // PUT /v1/orders/{id} - Update order
        put("/{id}") {
            val orderId = call.parameters["id"]?.let { UUID.fromString(it) }
                ?: return@put call.respond(HttpStatusCode.BadRequest, "Invalid order ID")

            val request = call.receive<UpdateOrderRequest>()

            val order = orderService.update(
                orderId = orderId,
                items = request.items.map { it.toDomain() }
            )

            call.respond(HttpStatusCode.OK, order.toResponse())
        }

        // DELETE /v1/orders/{id} - Delete order
        delete("/{id}") {
            val orderId = call.parameters["id"]?.let { UUID.fromString(it) }
                ?: return@delete call.respond(HttpStatusCode.BadRequest, "Invalid order ID")

            orderService.delete(orderId)
            call.respond(HttpStatusCode.NoContent)
        }

        // Nested resource routes
        route("/{id}/items") {
            // POST /v1/orders/{id}/items - Add item to order
            post {
                val orderId = call.parameters["id"]?.let { UUID.fromString(it) }
                    ?: return@post call.respond(HttpStatusCode.BadRequest, "Invalid order ID")

                val request = call.receive<AddItemRequest>()

                val order = orderService.addItem(
                    orderId = orderId,
                    item = request.toDomain()
                )

                call.respond(HttpStatusCode.OK, order.toResponse())
            }

            // DELETE /v1/orders/{id}/items/{itemId} - Remove item from order
            delete("/{itemId}") {
                val orderId = call.parameters["id"]?.let { UUID.fromString(it) }
                    ?: return@delete call.respond(HttpStatusCode.BadRequest, "Invalid order ID")

                val itemId = call.parameters["itemId"]?.let { UUID.fromString(it) }
                    ?: return@delete call.respond(HttpStatusCode.BadRequest, "Invalid item ID")

                val order = orderService.removeItem(orderId, itemId)
                call.respond(HttpStatusCode.OK, order.toResponse())
            }
        }
    }
}

// ❌ Incorrect - poor route organization
fun Route.orderRoutes(orderService: OrderService) {
    get("/orders") { /* ... */ }              // No versioning
    get("/order/{id}") { /* ... */ }          // Inconsistent naming
    post("/api/orders/create") { /* ... */ }  // Inconsistent prefix

    get("/orders/{id}/items/{itemId}") {      // All routes at top level
        val id = call.parameters["id"]         // No validation
        // Business logic in route handler
        val order = Order(...)
        orderRepository.save(order)
    }
}
```

✅ **Check routing configuration:**
```kotlin
// ✅ Correct - centralized routing configuration
// File: src/main/kotlin/com/company/service/Routing.kt
package com.company.service

import com.company.service.routes.*
import com.company.service.service.*
import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import org.koin.ktor.ext.inject

fun Application.configureRouting() {
    // Inject services using Koin
    val orderService: OrderService by inject()
    val customerService: CustomerService by inject()
    val productService: ProductService by inject()

    routing {
        // Health check endpoint
        get("/health") {
            call.respond(mapOf(
                "status" to "healthy",
                "timestamp" to System.currentTimeMillis()
            ))
        }

        // Readiness probe
        get("/ready") {
            // Check dependencies
            val isReady = orderService.isReady() &&
                         customerService.isReady() &&
                         productService.isReady()

            if (isReady) {
                call.respond(HttpStatusCode.OK, mapOf("ready" to true))
            } else {
                call.respond(HttpStatusCode.ServiceUnavailable, mapOf("ready" to false))
            }
        }

        // API version 1 routes
        orderRoutes(orderService)
        customerRoutes(customerService)
        productRoutes(productService)
    }
}

// ❌ Incorrect - routes defined inline
fun Application.configureRouting() {
    routing {
        get("/orders") { /* ... */ }
        post("/orders") { /* ... */ }
        get("/customers") { /* ... */ }
        // All routes in one file - hard to maintain
    }
}
```

✅ **Check parameter extraction and validation:**
```kotlin
// ✅ Correct - proper parameter extraction with validation
get("/{id}") {
    val orderId = call.parameters["id"]?.let {
        try {
            UUID.fromString(it)
        } catch (e: IllegalArgumentException) {
            return@get call.respond(
                HttpStatusCode.BadRequest,
                ErrorResponse("Invalid UUID format for order ID")
            )
        }
    } ?: return@get call.respond(
        HttpStatusCode.BadRequest,
        ErrorResponse("Order ID is required")
    )

    val order = orderService.findById(orderId)
        ?: return@get call.respond(
            HttpStatusCode.NotFound,
            ErrorResponse("Order not found: $orderId")
        )

    call.respond(HttpStatusCode.OK, order.toResponse())
}

// ❌ Incorrect - no validation
get("/{id}") {
    val id = call.parameters["id"]  // Nullable, no validation
    val uuid = UUID.fromString(id)  // Can throw exception
    val order = orderService.findById(uuid)
    call.respond(order)  // Can be null
}
```

**How to Verify:**
```bash
# Find route files
find src/main/kotlin -path "*/routes/*.kt"

# Check for route grouping with route()
grep -r "route(\"/v1/" src/main/kotlin/

# Verify parameter extraction
grep -r "call.parameters\[" src/main/kotlin/

# Check query parameter handling
grep -r "call.request.queryParameters" src/main/kotlin/

# Verify centralized routing configuration
grep -r "fun Application.configureRouting" src/main/kotlin/
```

**Expected Result:**
- Routes organized in separate files by resource
- API versioning (e.g., /v1/)
- Route grouping using route()
- Proper parameter extraction with validation
- Nested routes for sub-resources
- Centralized routing configuration

---

### 3. DTO Usage and Domain Model Separation

**Requirement:** All API endpoints must use DTOs (Data Transfer Objects) for requests and responses. Domain models must never be exposed directly in API responses.

**Verification Steps:**

✅ **Check DTO definitions:**
```kotlin
// ✅ Correct - comprehensive DTO definitions
// File: src/main/kotlin/com/company/service/api/dto/OrderDto.kt
package com.company.service.api.dto

import com.company.service.domain.Order
import com.company.service.domain.OrderItem
import com.company.service.domain.OrderStatus
import com.company.service.domain.Money
import kotlinx.serialization.Serializable
import java.time.Instant
import java.util.UUID

@Serializable
data class CreateOrderRequest(
    val customerId: String,
    val items: List<OrderItemRequest> = emptyList()
) {
    init {
        require(customerId.isNotBlank()) { "customerId cannot be blank" }
        try {
            UUID.fromString(customerId)
        } catch (e: IllegalArgumentException) {
            throw IllegalArgumentException("customerId must be a valid UUID")
        }
    }
}

@Serializable
data class UpdateOrderRequest(
    val items: List<OrderItemRequest>
) {
    init {
        require(items.isNotEmpty()) { "items cannot be empty" }
    }
}

@Serializable
data class OrderItemRequest(
    val productId: String,
    val quantity: Int,
    val price: Double
) {
    init {
        require(productId.isNotBlank()) { "productId cannot be blank" }
        require(quantity > 0) { "quantity must be positive" }
        require(price >= 0) { "price cannot be negative" }
    }

    fun toDomain(): OrderItem = OrderItem(
        id = UUID.randomUUID(),
        productId = UUID.fromString(productId),
        quantity = quantity,
        price = Money(price)
    )
}

@Serializable
data class AddItemRequest(
    val productId: String,
    val quantity: Int,
    val price: Double
) {
    init {
        require(productId.isNotBlank()) { "productId cannot be blank" }
        require(quantity > 0) { "quantity must be positive" }
        require(price >= 0) { "price cannot be negative" }
    }

    fun toDomain(): OrderItem = OrderItem(
        id = UUID.randomUUID(),
        productId = UUID.fromString(productId),
        quantity = quantity,
        price = Money(price)
    )
}

@Serializable
data class OrderResponse(
    val id: String,
    val customerId: String,
    val items: List<OrderItemResponse>,
    val status: String,
    val totalAmount: Double,
    val createdAt: String,
    val updatedAt: String
)

@Serializable
data class OrderItemResponse(
    val id: String,
    val productId: String,
    val quantity: Int,
    val price: Double
)

@Serializable
data class ErrorResponse(
    val message: String,
    val code: String? = null,
    val details: Map<String, String>? = null,
    val timestamp: String = Instant.now().toString()
)

// Extension functions for conversions
fun Order.toResponse(): OrderResponse = OrderResponse(
    id = id.toString(),
    customerId = customerId.toString(),
    items = items.map { it.toResponse() },
    status = status.name,
    totalAmount = totalAmount().amount,
    createdAt = createdAt.toString(),
    updatedAt = updatedAt.toString()
)

fun OrderItem.toResponse(): OrderItemResponse = OrderItemResponse(
    id = id.toString(),
    productId = productId.toString(),
    quantity = quantity,
    price = price.amount
)

// ❌ Incorrect - no DTOs, exposing domain models
// File: routes/OrderRoutes.kt
get("/{id}") {
    val order = orderService.findById(...)
    call.respond(order)  // Exposing domain model directly!
}

post {
    val order = call.receive<Order>()  // Using domain model as request!
    orderService.save(order)
    call.respond(order)
}
```

✅ **Check DTO usage in routes:**
```kotlin
// ✅ Correct - using DTOs for requests and responses
post("/v1/orders") {
    val request = call.receive<CreateOrderRequest>()  // DTO for request

    val order = orderService.create(
        customerId = UUID.fromString(request.customerId),
        items = request.items.map { it.toDomain() }  // Convert to domain
    )

    call.respond(HttpStatusCode.Created, order.toResponse())  // DTO for response
}

get("/v1/orders/{id}") {
    val orderId = call.parameters["id"]?.let { UUID.fromString(it) }
        ?: return@get call.respond(HttpStatusCode.BadRequest, "Invalid order ID")

    val order = orderService.findById(orderId)
        ?: return@get call.respond(HttpStatusCode.NotFound, "Order not found")

    call.respond(HttpStatusCode.OK, order.toResponse())  // DTO for response
}

// ❌ Incorrect - exposing domain models
post("/v1/orders") {
    val order = call.receive<Order>()  // Domain model as request
    orderService.save(order)
    call.respond(order)  // Domain model as response
}
```

✅ **Check DTO validation:**
```kotlin
// ✅ Correct - validation in DTO init blocks
@Serializable
data class CreateOrderRequest(
    val customerId: String,
    val deliveryDate: String,
    val items: List<OrderItemRequest>
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

        if (items.isEmpty()) {
            errors["items"] = "items cannot be empty"
        }

        if (items.size > 100) {
            errors["items"] = "items cannot exceed 100"
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

// ❌ Incorrect - no validation
@Serializable
data class CreateOrderRequest(
    val customerId: String,
    val items: List<OrderItemRequest>
)  // No validation at all
```

**How to Verify:**
```bash
# Find DTO definitions
find src/main/kotlin -path "*/api/dto/*.kt"

# Check for @Serializable annotation
grep -r "@Serializable" src/main/kotlin/

# Verify DTO conversion functions
grep -r "fun.*toResponse()" src/main/kotlin/
grep -r "fun.*toDomain()" src/main/kotlin/

# Check for domain model exposure (should find none)
grep -r "call.respond.*domain\." src/main/kotlin/

# Verify request DTOs are used
grep -r "call.receive<.*Request>" src/main/kotlin/

# Check validation in DTOs
grep -r "init {" src/main/kotlin/ -A 5 | grep -E "require|errors"
```

**Expected Result:**
- All DTOs marked with @Serializable
- Separate request and response DTOs
- Validation in DTO init blocks
- Conversion functions (toResponse, toDomain)
- No domain models exposed in API
- ErrorResponse DTO for error handling

---

### 4. Error Handling with StatusPages

**Requirement:** Application must use Ktor's StatusPages plugin for centralized exception handling with proper HTTP status codes and error responses.

**Verification Steps:**

✅ **Check StatusPages configuration:**
```kotlin
// ✅ Correct - comprehensive StatusPages configuration
// File: src/main/kotlin/com/company/service/ErrorHandling.kt
package com.company.service

import com.company.service.api.dto.ErrorResponse
import com.company.service.exception.*
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
            logger.warn("Validation error: ${cause.message}", cause)
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

        // Illegal Argument (Bad Request)
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

        // Illegal State (Internal Error)
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

        // Generic Exception (Internal Error)
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

// ❌ Incorrect - no error handling
fun Application.module() {
    install(ContentNegotiation) { json() }
    // No StatusPages!
    routing { /* ... */ }
}

// ❌ Incorrect - minimal error handling
install(StatusPages) {
    exception<Throwable> { call, cause ->
        call.respond(HttpStatusCode.InternalServerError, "Error")
    }
}  // Only catches generic exceptions, no specific handling
```

✅ **Check custom exception classes:**
```kotlin
// ✅ Correct - domain-specific exception classes
// File: src/main/kotlin/com/company/service/exception/Exceptions.kt
package com.company.service.exception

class NotFoundException(message: String) : RuntimeException(message)

class ValidationException(
    message: String,
    val errors: Map<String, String> = emptyMap()
) : RuntimeException(message)

class ConflictException(message: String) : RuntimeException(message)

class UnauthorizedException(message: String) : RuntimeException(message)

class ForbiddenException(message: String) : RuntimeException(message)

// ❌ Incorrect - using generic exceptions
throw RuntimeException("Not found")  // Should use NotFoundException
throw Exception("Invalid input")     // Should use ValidationException
```

✅ **Check error responses in routes:**
```kotlin
// ✅ Correct - throwing domain exceptions, caught by StatusPages
get("/{id}") {
    val orderId = call.parameters["id"]?.let { UUID.fromString(it) }
        ?: throw IllegalArgumentException("Invalid order ID format")

    val order = orderService.findById(orderId)
        ?: throw NotFoundException("Order not found: $orderId")

    call.respond(HttpStatusCode.OK, order.toResponse())
}

post {
    val request = call.receive<CreateOrderRequest>()  // Validation in DTO init

    val order = orderService.create(
        customerId = UUID.fromString(request.customerId),
        items = request.items.map { it.toDomain() }
    )

    call.respond(HttpStatusCode.Created, order.toResponse())
}

// ❌ Incorrect - manual error handling in routes
get("/{id}") {
    val orderId = call.parameters["id"]?.let { UUID.fromString(it) }
    if (orderId == null) {
        return@get call.respond(
            HttpStatusCode.BadRequest,
            ErrorResponse("Invalid order ID")
        )
    }

    val order = orderService.findById(orderId)
    if (order == null) {
        return@get call.respond(
            HttpStatusCode.NotFound,
            ErrorResponse("Order not found")
        )
    }

    call.respond(HttpStatusCode.OK, order.toResponse())
}  // Duplicating error handling logic
```

**How to Verify:**
```bash
# Check StatusPages configuration
grep -r "install(StatusPages)" src/main/kotlin/

# Verify exception handlers
grep -r "exception<" src/main/kotlin/ -A 5

# Find custom exception classes
find src/main/kotlin -path "*/exception/*.kt"

# Check error response usage
grep -r "ErrorResponse(" src/main/kotlin/

# Verify exceptions are thrown (not manual handling)
grep -r "throw.*Exception" src/main/kotlin/

# Check for manual error responses in routes (should be minimal)
grep -r "call.respond.*HttpStatusCode\\.NotFound" src/main/kotlin/routes/
```

**Expected Result:**
- StatusPages installed in application configuration
- Exception handlers for all common HTTP status codes
- Custom exception classes defined
- ErrorResponse DTO used consistently
- Routes throw exceptions, not manual error handling
- Logging for all exception handlers

---

### 5. Content Negotiation and Serialization

**Requirement:** Application must properly configure content negotiation with kotlinx.serialization for JSON handling.

**Verification Steps:**

✅ **Check content negotiation setup:**
```kotlin
// ✅ Correct - comprehensive content negotiation
install(ContentNegotiation) {
    json(Json {
        prettyPrint = true              // Format JSON output
        isLenient = true                // Accept lenient JSON
        ignoreUnknownKeys = true        // Ignore extra fields
        encodeDefaults = true           // Include default values
        coerceInputValues = true        // Coerce invalid nulls to defaults
        explicitNulls = false           // Omit null values
        allowStructuredMapKeys = true   // Allow complex map keys
        classDiscriminator = "type"     // For polymorphic serialization
    })
}

// ❌ Incorrect - default configuration
install(ContentNegotiation) {
    json()  // Missing configuration
}
```

✅ **Check serialization annotations:**
```kotlin
// ✅ Correct - proper serialization setup
@Serializable
data class OrderResponse(
    val id: String,
    val customerId: String,
    val items: List<OrderItemResponse>,
    val status: String,
    @SerialName("total_amount")  // Custom JSON field name
    val totalAmount: Double,
    @EncodeDefault  // Always include even if default
    val createdAt: String,
    val updatedAt: String
)

// Custom serializers for complex types
@Serializable
data class Money(
    val amount: Double,
    val currency: String = "USD"
)

// ❌ Incorrect - missing @Serializable
data class OrderResponse(  // Not serializable!
    val id: String,
    val items: List<OrderItem>
)
```

✅ **Check content type handling:**
```kotlin
// ✅ Correct - proper content type handling
post {
    val contentType = call.request.contentType()
    if (contentType != ContentType.Application.Json) {
        throw ValidationException("Content-Type must be application/json")
    }

    val request = call.receive<CreateOrderRequest>()
    // ... process request
}

// Set response content type explicitly if needed
call.respond(
    HttpStatusCode.Created,
    order.toResponse()
)  // Content-Type automatically set to application/json

// ❌ Incorrect - no content type checking
post {
    val request = call.receive<CreateOrderRequest>()  // Assumes JSON
    // ... no validation
}
```

**How to Verify:**
```bash
# Check ContentNegotiation configuration
grep -r "install(ContentNegotiation)" src/main/kotlin/ -A 10

# Verify @Serializable usage
grep -r "@Serializable" src/main/kotlin/

# Check for custom serializers
grep -r "@Serializer\|@SerialName" src/main/kotlin/

# Verify JSON configuration
grep -r "json(Json" src/main/kotlin/
```

**Expected Result:**
- ContentNegotiation plugin installed
- JSON configuration with appropriate settings
- All DTOs marked with @Serializable
- Custom serializers for complex types
- Proper content type handling

---

### 6. Route Testing with testApplication

**Requirement:** All routes must be tested using Ktor's testApplication DSL with proper mocking and assertions.

**Verification Steps:**

✅ **Check route unit tests:**
```kotlin
// ✅ Correct - comprehensive route testing
// File: src/test/kotlin/com/company/service/routes/OrderRoutesTest.kt
package com.company.service.routes

import com.company.service.api.dto.*
import com.company.service.domain.*
import com.company.service.service.OrderService
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.string.shouldContain
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.server.testing.*
import io.mockk.*
import kotlinx.serialization.json.Json
import kotlinx.serialization.encodeToString
import kotlinx.serialization.decodeFromString
import java.time.Instant
import java.util.UUID

class OrderRoutesTest : DescribeSpec({
    val orderService = mockk<OrderService>()

    beforeEach {
        clearAllMocks()
    }

    describe("GET /v1/orders/{id}") {
        it("should return order when found") {
            val orderId = UUID.randomUUID()
            val order = Order(
                id = orderId,
                customerId = UUID.randomUUID(),
                items = listOf(
                    OrderItem(
                        id = UUID.randomUUID(),
                        productId = UUID.randomUUID(),
                        quantity = 2,
                        price = Money(10.0)
                    )
                ),
                status = OrderStatus.PENDING,
                createdAt = Instant.now(),
                updatedAt = Instant.now()
            )

            coEvery { orderService.findById(orderId) } returns order

            testApplication {
                application {
                    configureErrorHandling()
                    configureRouting(orderService)
                }

                val response = client.get("/v1/orders/$orderId")

                response.status shouldBe HttpStatusCode.OK
                response.contentType() shouldBe ContentType.Application.Json

                val responseBody = Json.decodeFromString<OrderResponse>(response.bodyAsText())
                responseBody.id shouldBe orderId.toString()
                responseBody.items.size shouldBe 1
            }

            coVerify(exactly = 1) { orderService.findById(orderId) }
        }

        it("should return 404 when order not found") {
            val orderId = UUID.randomUUID()

            coEvery { orderService.findById(orderId) } returns null

            testApplication {
                application {
                    configureErrorHandling()
                    configureRouting(orderService)
                }

                val response = client.get("/v1/orders/$orderId")

                response.status shouldBe HttpStatusCode.NotFound
                response.bodyAsText() shouldContain "not found"
            }

            coVerify(exactly = 1) { orderService.findById(orderId) }
        }

        it("should return 400 for invalid UUID") {
            testApplication {
                application {
                    configureErrorHandling()
                    configureRouting(orderService)
                }

                val response = client.get("/v1/orders/invalid-uuid")

                response.status shouldBe HttpStatusCode.BadRequest
            }
        }
    }

    describe("POST /v1/orders") {
        it("should create order successfully") {
            val request = CreateOrderRequest(
                customerId = UUID.randomUUID().toString(),
                items = listOf(
                    OrderItemRequest(
                        productId = UUID.randomUUID().toString(),
                        quantity = 2,
                        price = 10.0
                    )
                )
            )

            val createdOrder = Order(
                id = UUID.randomUUID(),
                customerId = UUID.fromString(request.customerId),
                items = request.items.map { it.toDomain() },
                status = OrderStatus.PENDING,
                createdAt = Instant.now(),
                updatedAt = Instant.now()
            )

            coEvery {
                orderService.create(any(), any())
            } returns createdOrder

            testApplication {
                application {
                    configureErrorHandling()
                    configureRouting(orderService)
                }

                val response = client.post("/v1/orders") {
                    contentType(ContentType.Application.Json)
                    setBody(Json.encodeToString(request))
                }

                response.status shouldBe HttpStatusCode.Created

                val responseBody = Json.decodeFromString<OrderResponse>(response.bodyAsText())
                responseBody.customerId shouldBe request.customerId
            }

            coVerify(exactly = 1) { orderService.create(any(), any()) }
        }

        it("should return 400 for invalid request") {
            testApplication {
                application {
                    configureErrorHandling()
                    configureRouting(orderService)
                }

                val response = client.post("/v1/orders") {
                    contentType(ContentType.Application.Json)
                    setBody("""{"customerId": ""}""")  // Invalid
                }

                response.status shouldBe HttpStatusCode.BadRequest
            }
        }
    }

    describe("PUT /v1/orders/{id}") {
        it("should update order successfully") {
            val orderId = UUID.randomUUID()
            val request = UpdateOrderRequest(
                items = listOf(
                    OrderItemRequest(
                        productId = UUID.randomUUID().toString(),
                        quantity = 3,
                        price = 15.0
                    )
                )
            )

            val updatedOrder = Order(
                id = orderId,
                customerId = UUID.randomUUID(),
                items = request.items.map { it.toDomain() },
                status = OrderStatus.PENDING,
                createdAt = Instant.now(),
                updatedAt = Instant.now()
            )

            coEvery {
                orderService.update(orderId, any())
            } returns updatedOrder

            testApplication {
                application {
                    configureErrorHandling()
                    configureRouting(orderService)
                }

                val response = client.put("/v1/orders/$orderId") {
                    contentType(ContentType.Application.Json)
                    setBody(Json.encodeToString(request))
                }

                response.status shouldBe HttpStatusCode.OK
            }

            coVerify(exactly = 1) { orderService.update(orderId, any()) }
        }
    }

    describe("DELETE /v1/orders/{id}") {
        it("should delete order successfully") {
            val orderId = UUID.randomUUID()

            coEvery { orderService.delete(orderId) } just Runs

            testApplication {
                application {
                    configureErrorHandling()
                    configureRouting(orderService)
                }

                val response = client.delete("/v1/orders/$orderId")

                response.status shouldBe HttpStatusCode.NoContent
            }

            coVerify(exactly = 1) { orderService.delete(orderId) }
        }
    }
})

// ❌ Incorrect - no tests
// No test file exists for routes

// ❌ Incorrect - minimal testing
class OrderRoutesTest {
    @Test
    fun testGetOrder() = testApplication {
        val response = client.get("/v1/orders/123")
        assertEquals(200, response.status.value)
    }  // No mocking, no comprehensive assertions
}
```

✅ **Check integration tests:**
```kotlin
// ✅ Correct - integration tests with real components
// File: src/test/kotlin/com/company/service/integration/OrderApiIntegrationTest.kt
package com.company.service.integration

import com.company.service.api.dto.*
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.server.testing.*
import kotlinx.serialization.json.Json
import kotlinx.serialization.encodeToString
import kotlinx.serialization.decodeFromString

class OrderApiIntegrationTest : DescribeSpec({
    describe("Order API Integration") {
        it("should create, retrieve, update, and delete order") {
            testApplication {
                application {
                    module()  // Load full application
                }

                // Create order
                val createRequest = CreateOrderRequest(
                    customerId = UUID.randomUUID().toString(),
                    items = listOf(
                        OrderItemRequest(
                            productId = UUID.randomUUID().toString(),
                            quantity = 2,
                            price = 10.0
                        )
                    )
                )

                val createResponse = client.post("/v1/orders") {
                    contentType(ContentType.Application.Json)
                    setBody(Json.encodeToString(createRequest))
                }
                createResponse.status shouldBe HttpStatusCode.Created

                val createdOrder = Json.decodeFromString<OrderResponse>(
                    createResponse.bodyAsText()
                )
                val orderId = createdOrder.id

                // Retrieve order
                val getResponse = client.get("/v1/orders/$orderId")
                getResponse.status shouldBe HttpStatusCode.OK

                val retrievedOrder = Json.decodeFromString<OrderResponse>(
                    getResponse.bodyAsText()
                )
                retrievedOrder.id shouldBe orderId

                // Update order
                val updateRequest = UpdateOrderRequest(
                    items = listOf(
                        OrderItemRequest(
                            productId = UUID.randomUUID().toString(),
                            quantity = 3,
                            price = 15.0
                        )
                    )
                )

                val updateResponse = client.put("/v1/orders/$orderId") {
                    contentType(ContentType.Application.Json)
                    setBody(Json.encodeToString(updateRequest))
                }
                updateResponse.status shouldBe HttpStatusCode.OK

                // Delete order
                val deleteResponse = client.delete("/v1/orders/$orderId")
                deleteResponse.status shouldBe HttpStatusCode.NoContent

                // Verify deleted
                val notFoundResponse = client.get("/v1/orders/$orderId")
                notFoundResponse.status shouldBe HttpStatusCode.NotFound
            }
        }
    }
})
```

**How to Verify:**
```bash
# Find route test files
find src/test/kotlin -path "*/routes/*Test.kt"

# Check for testApplication usage
grep -r "testApplication" src/test/kotlin/

# Verify mocking
grep -r "mockk<.*Service>" src/test/kotlin/

# Check HTTP client requests in tests
grep -r "client\\.get\\|client\\.post\\|client\\.put\\|client\\.delete" src/test/kotlin/

# Verify assertions
grep -r "shouldBe\\|assertEquals\\|assert" src/test/kotlin/

# Check integration tests
find src/test/kotlin -path "*/integration/*Test.kt"
```

**Expected Result:**
- Route tests use testApplication
- Services are mocked with mockk
- Tests cover all HTTP methods (GET, POST, PUT, DELETE)
- Tests verify status codes and response bodies
- Tests check error cases (404, 400, etc.)
- Integration tests verify full request/response cycle

---

## Common Issues and Fixes

### Issue 1: Domain Models Exposed in API

**Problem:**
```kotlin
get("/v1/orders/{id}") {
    val order = orderService.findById(...)
    call.respond(order)  // Exposing domain model!
}
```

**Fix:**
```kotlin
get("/v1/orders/{id}") {
    val order = orderService.findById(...)
        ?: throw NotFoundException("Order not found")
    call.respond(HttpStatusCode.OK, order.toResponse())  // Convert to DTO
}
```

### Issue 2: Business Logic in Routes

**Problem:**
```kotlin
post("/v1/orders") {
    val request = call.receive<CreateOrderRequest>()

    // Business logic in route - wrong!
    val order = Order(
        id = UUID.randomUUID(),
        customerId = UUID.fromString(request.customerId),
        items = request.items.map { it.toDomain() },
        status = OrderStatus.PENDING,
        createdAt = Instant.now(),
        updatedAt = Instant.now()
    )

    orderRepository.save(order)
    call.respond(HttpStatusCode.Created, order.toResponse())
}
```

**Fix:**
```kotlin
post("/v1/orders") {
    val request = call.receive<CreateOrderRequest>()

    // Delegate to service layer
    val order = orderService.create(
        customerId = UUID.fromString(request.customerId),
        items = request.items.map { it.toDomain() }
    )

    call.respond(HttpStatusCode.Created, order.toResponse())
}
```

### Issue 3: Manual Error Handling in Routes

**Problem:**
```kotlin
get("/{id}") {
    val orderId = call.parameters["id"]?.let { UUID.fromString(it) }
    if (orderId == null) {
        return@get call.respond(HttpStatusCode.BadRequest, "Invalid ID")
    }

    val order = orderService.findById(orderId)
    if (order == null) {
        return@get call.respond(HttpStatusCode.NotFound, "Order not found")
    }

    call.respond(HttpStatusCode.OK, order.toResponse())
}
```

**Fix:**
```kotlin
get("/{id}") {
    val orderId = call.parameters["id"]?.let { UUID.fromString(it) }
        ?: throw IllegalArgumentException("Invalid order ID")

    val order = orderService.findById(orderId)
        ?: throw NotFoundException("Order not found: $orderId")

    call.respond(HttpStatusCode.OK, order.toResponse())
}  // Exceptions caught by StatusPages
```

### Issue 4: No Content Negotiation

**Problem:**
```kotlin
fun Application.module() {
    // No ContentNegotiation!
    routing {
        get("/orders") {
            val orders = orderService.findAll()
            call.respondText(orders.toString())  // Plain text!
        }
    }
}
```

**Fix:**
```kotlin
fun Application.module() {
    install(ContentNegotiation) {
        json(Json {
            prettyPrint = true
            ignoreUnknownKeys = true
        })
    }

    routing {
        get("/orders") {
            val orders = orderService.findAll()
            call.respond(orders.map { it.toResponse() })  // JSON serialization
        }
    }
}
```

### Issue 5: Missing DTO Validation

**Problem:**
```kotlin
@Serializable
data class CreateOrderRequest(
    val customerId: String,
    val items: List<OrderItemRequest>
)  // No validation
```

**Fix:**
```kotlin
@Serializable
data class CreateOrderRequest(
    val customerId: String,
    val items: List<OrderItemRequest>
) {
    init {
        require(customerId.isNotBlank()) { "customerId cannot be blank" }
        require(isValidUUID(customerId)) { "customerId must be a valid UUID" }
        require(items.isNotEmpty()) { "items cannot be empty" }
    }
}
```

### Issue 6: Routes Not Tested

**Problem:**
```kotlin
// No test file for OrderRoutes.kt
```

**Fix:**
```kotlin
// Create OrderRoutesTest.kt
class OrderRoutesTest : DescribeSpec({
    val orderService = mockk<OrderService>()

    describe("GET /v1/orders/{id}") {
        it("should return order when found") {
            coEvery { orderService.findById(any()) } returns mockOrder()

            testApplication {
                application { configureRouting(orderService) }

                val response = client.get("/v1/orders/${UUID.randomUUID()}")

                response.status shouldBe HttpStatusCode.OK
            }
        }
    }
})
```

---

## Verification Summary

**Before marking REST API implementation as complete, verify:**

- [ ] Ktor server configured with Netty engine
- [ ] ContentNegotiation installed with JSON configuration
- [ ] StatusPages installed for exception handling
- [ ] CallLogging configured with MDC
- [ ] Routes organized in separate files by resource
- [ ] API versioning used (e.g., /v1/)
- [ ] Route grouping using route()
- [ ] Parameter extraction with validation
- [ ] All DTOs marked with @Serializable
- [ ] Request and response DTOs separate
- [ ] DTO validation in init blocks
- [ ] Conversion functions (toResponse, toDomain)
- [ ] No domain models exposed in API responses
- [ ] ErrorResponse DTO defined and used
- [ ] StatusPages handlers for all HTTP status codes
- [ ] Custom exception classes defined
- [ ] Routes throw exceptions (not manual error handling)
- [ ] Health check endpoint implemented
- [ ] Route tests use testApplication
- [ ] Services mocked in route tests
- [ ] Tests cover all HTTP methods
- [ ] Tests verify status codes and response bodies
- [ ] Tests check error cases
- [ ] Integration tests verify full cycle

**Related Verifiers:**
- **domain-modeling.md** - Domain entities and value objects
- **error-handling.md** - Exception handling patterns
- **testing.md** - Testing strategies and coverage
- **coroutines.md** - Async request handling
- **observability.md** - Logging and monitoring
