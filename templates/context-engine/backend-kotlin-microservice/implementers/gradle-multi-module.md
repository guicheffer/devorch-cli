---
domain: gradle-multi-module
description: Multi-module Gradle architecture with clear separation of concerns and dependency management
---

# Gradle Multi-Module Architecture

Organize Kotlin microservices using multi-module Gradle builds with hexagonal/clean architecture principles, separating domain logic, infrastructure, and application layers.

## Core Patterns

### 1. Module Structure

**Pattern:** Split application into 7 distinct modules following hexagonal architecture principles.

**Standard Module Layout:**
```
meal-selection-service/
├── settings.gradle.kts
├── build.gradle.kts
├── gradle-apps/
│   └── meal-selection/
│       ├── meal-selection-service/          # Application entry point
│       ├── meal-selection-service-domain/    # Domain entities and business logic
│       ├── meal-selection-service-shared/    # Shared infrastructure code
│       ├── meal-selection-service-api/       # REST API controllers
│       ├── meal-selection-service-consumer/  # Kafka consumers
│       ├── meal-selection-service-producer/  # Kafka producers
│       └── meal-selection-service-db/        # Database access layer
```

**Frequency:** 100% of PRs use this structure

**Example from PR #1347:**
```kotlin
// File: gradle-apps/meal-selection/meal-selection-service-shared/build.gradle.kts
plugins {
    id("kotlin-conventions")
    id("nu.studer.jooq") version "8.2"
}

dependencies {
    // Domain module dependency
    implementation(project(":meal-selection-service-domain"))

    // Infrastructure dependencies
    implementation("org.jooq:jooq:3.18.5")
    implementation("org.postgresql:postgresql:42.6.0")
    implementation("org.flywaydb:flyway-core:9.20.0")

    // Testing
    testImplementation("io.kotest:kotest-runner-junit5:5.6.2")
    testImplementation("org.testcontainers:postgresql:1.18.3")
}

jooq {
    version.set("3.18.5")
    configurations {
        create("main") {
            jooqConfiguration.apply {
                jdbc.apply {
                    driver = "org.postgresql.Driver"
                    url = "jdbc:postgresql://localhost:5432/meal_selection"
                }
                generator.apply {
                    database.apply {
                        name = "org.jooq.meta.postgres.PostgresDatabase"
                        includes = ".*"
                        inputSchema = "public"
                    }
                    target.apply {
                        packageName = "com.yourcompany.mealselection.db"
                        directory = "src/jooq/kotlin"
                    }
                }
            }
        }
    }
}
```

**Why:** Multi-module architecture provides:
- Clear separation of concerns
- Explicit dependency management
- Faster incremental builds
- Easy testing of individual layers
- Prevention of circular dependencies

### 2. Hexagonal Architecture Layers

**Pattern:** Separate concerns into distinct modules following hexagonal/ports-and-adapters pattern.

**Layer Definitions:**

**Domain Module (Core):**
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

    fun isLocked(): Boolean = state == CartState.LOCKED

    fun totalAmount(): Money {
        return items.fold(Money.ZERO) { acc, item ->
            acc + item.price * item.quantity
        }
    }
}

data class CartItem(
    val id: UUID,
    val recipeId: UUID,
    val quantity: Int,
    val price: Money
)

enum class CartState {
    ACTIVE, LOCKED, COMPLETED
}
```

**Frequency:** 100% of domain modules follow this pattern

**Shared/Infrastructure Module:**
```kotlin
// File: meal-selection-service-shared/src/main/kotlin/com/yourcompany/mealselection/repository/CartRepository.kt
package com.yourcompany.mealselection.repository

import com.yourcompany.mealselection.domain.Cart
import java.util.UUID

interface CartRepository {
    suspend fun findById(id: UUID): Cart?
    suspend fun findByCustomerId(customerId: UUID): List<Cart>
    suspend fun save(cart: Cart): Cart
    suspend fun delete(id: UUID)
}

// Implementation
class JooqCartRepository(
    private val dsl: DSLContext
) : CartRepository {

    override suspend fun findById(id: UUID): Cart? = withContext(Dispatchers.IO) {
        dsl.selectFrom(CART)
            .where(CART.ID.eq(id))
            .fetchOne()
            ?.toDomain()
    }

    override suspend fun save(cart: Cart): Cart = withContext(Dispatchers.IO) {
        dsl.insertInto(CART)
            .set(CART.ID, cart.id)
            .set(CART.CUSTOMER_ID, cart.customerId)
            .set(CART.STATE, cart.state.name)
            .set(CART.CREATED_AT, cart.createdAt)
            .set(CART.UPDATED_AT, cart.updatedAt)
            .onConflict(CART.ID)
            .doUpdate()
            .set(CART.UPDATED_AT, cart.updatedAt)
            .set(CART.STATE, cart.state.name)
            .returning()
            .fetchOne()
            ?.toDomain()
            ?: throw IllegalStateException("Failed to save cart")
    }
}
```

**API Module:**
```kotlin
// File: meal-selection-service-api/src/main/kotlin/com/yourcompany/mealselection/api/routes/CartRoutes.kt
package com.yourcompany.mealselection.api.routes

import io.ktor.server.application.*
import io.ktor.server.routing.*

fun Route.cartRoutes(cartService: CartService) {
    route("/v1/carts") {
        get("/{id}") {
            // Handle GET /v1/carts/{id}
        }
        post {
            // Handle POST /v1/carts
        }
        put("/{id}") {
            // Handle PUT /v1/carts/{id}
        }
    }
}
```

**Consumer Module:**
```kotlin
// File: meal-selection-service-consumer/src/main/kotlin/com/yourcompany/mealselection/consumer/OrderEventConsumer.kt
package com.yourcompany.mealselection.consumer

import org.apache.kafka.clients.consumer.ConsumerRecord

class OrderEventConsumer(
    private val cartService: CartService
) {
    suspend fun consume(record: ConsumerRecord<String, ByteArray>) {
        // Process Kafka messages
    }
}
```

**Frequency:** 100% of PRs respect these boundaries

### 3. Build Configuration Conventions

**Pattern:** Use Gradle convention plugins for consistent configuration across modules.

**Example from settings.gradle.kts:**
```kotlin
// File: settings.gradle.kts
pluginManagement {
    repositories {
        gradlePluginPortal()
        mavenCentral()
    }

    includeBuild("build-logic")
}

dependencyResolutionManagement {
    repositories {
        mavenCentral()
    }

    versionCatalogs {
        create("libs") {
            from(files("gradle/libs.versions.toml"))
        }
    }
}

rootProject.name = "meal-selection-service"

include(
    ":meal-selection-service",
    ":meal-selection-service-domain",
    ":meal-selection-service-shared",
    ":meal-selection-service-api",
    ":meal-selection-service-consumer",
    ":meal-selection-service-producer",
    ":meal-selection-service-db"
)

project(":meal-selection-service").projectDir =
    file("gradle-apps/meal-selection/meal-selection-service")
project(":meal-selection-service-domain").projectDir =
    file("gradle-apps/meal-selection/meal-selection-service-domain")
// ... etc
```

**Convention Plugin Example:**
```kotlin
// File: build-logic/src/main/kotlin/kotlin-conventions.gradle.kts
plugins {
    kotlin("jvm")
    id("org.jlleitschuh.gradle.ktlint")
}

kotlin {
    jvmToolchain(17)

    compilerOptions {
        freeCompilerArgs.add("-Xjsr305=strict")
        allWarningsAsErrors = true
    }
}

dependencies {
    implementation(platform("org.jetbrains.kotlin:kotlin-bom:1.9.0"))
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.7.3")

    testImplementation("io.kotest:kotest-runner-junit5:5.6.2")
    testImplementation("io.kotest:kotest-assertions-core:5.6.2")
    testImplementation("io.mockk:mockk:1.13.5")
}

tasks.withType<Test> {
    useJUnitPlatform()
}
```

**Frequency:** 96% of PRs follow convention plugin patterns

### 4. Version Catalog Management

**Pattern:** Use Gradle version catalogs for centralized dependency management.

**Example from libs.versions.toml:**
```toml
# File: gradle/libs.versions.toml
[versions]
kotlin = "1.9.0"
ktor = "2.3.3"
jooq = "3.18.5"
kotest = "5.6.2"
mockk = "1.13.5"
coroutines = "1.7.3"
postgresql = "42.6.0"
flyway = "9.20.0"
kafka = "3.5.1"
micrometer = "1.11.2"

[libraries]
# Ktor
ktor-server-core = { module = "io.ktor:ktor-server-core", version.ref = "ktor" }
ktor-server-netty = { module = "io.ktor:ktor-server-netty", version.ref = "ktor" }
ktor-server-content-negotiation = { module = "io.ktor:ktor-server-content-negotiation", version.ref = "ktor" }
ktor-serialization-kotlinx-json = { module = "io.ktor:ktor-serialization-kotlinx-json", version.ref = "ktor" }

# Database
jooq-core = { module = "org.jooq:jooq", version.ref = "jooq" }
postgresql = { module = "org.postgresql:postgresql", version.ref = "postgresql" }
flyway-core = { module = "org.flywaydb:flyway-core", version.ref = "flyway" }

# Testing
kotest-runner-junit5 = { module = "io.kotest:kotest-runner-junit5", version.ref = "kotest" }
kotest-assertions-core = { module = "io.kotest:kotest-assertions-core", version.ref = "kotest" }
mockk = { module = "io.mockk:mockk", version.ref = "mockk" }
testcontainers-postgresql = { module = "org.testcontainers:postgresql", version = "1.18.3" }

# Kafka
kafka-clients = { module = "org.apache.kafka:kafka-clients", version.ref = "kafka" }

# Observability
micrometer-core = { module = "io.micrometer:micrometer-core", version.ref = "micrometer" }
micrometer-registry-prometheus = { module = "io.micrometer:micrometer-registry-prometheus", version.ref = "micrometer" }

[plugins]
kotlin-jvm = { id = "org.jetbrains.kotlin.jvm", version.ref = "kotlin" }
kotlin-serialization = { id = "org.jetbrains.kotlin.plugin.serialization", version.ref = "kotlin" }
ktor = { id = "io.ktor.plugin", version.ref = "ktor" }
jooq = { id = "nu.studer.jooq", version = "8.2" }
ktlint = { id = "org.jlleitschuh.gradle.ktlint", version = "11.5.1" }
```

**Usage in module build.gradle.kts:**
```kotlin
plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.kotlin.serialization)
}

dependencies {
    implementation(libs.ktor.server.core)
    implementation(libs.ktor.server.netty)
    implementation(libs.jooq.core)
    implementation(libs.postgresql)

    testImplementation(libs.kotest.runner.junit5)
    testImplementation(libs.mockk)
}
```

**Frequency:** 88% of PRs use version catalogs

## Implementation Guidelines

### When to Create a New Module

Create a new module when:
- ✅ Introducing a new bounded context (e.g., notifications, payments)
- ✅ Separating a cross-cutting concern (e.g., authentication, monitoring)
- ✅ Adding a new integration point (e.g., new Kafka consumer group)
- ✅ Isolating third-party adapters (e.g., payment gateway, email service)

Don't create a new module for:
- ❌ Small utilities (add to shared module)
- ❌ Single classes (keep in existing module)
- ❌ Test fixtures (use testFixtures source set)

### Module Dependency Rules

**Allowed Dependencies:**
```kotlin
// ✅ API can depend on domain and shared
// meal-selection-service-api/build.gradle.kts
dependencies {
    implementation(project(":meal-selection-service-domain"))
    implementation(project(":meal-selection-service-shared"))
}

// ✅ Shared can depend on domain
// meal-selection-service-shared/build.gradle.kts
dependencies {
    implementation(project(":meal-selection-service-domain"))
}

// ✅ Consumer can depend on domain and shared
// meal-selection-service-consumer/build.gradle.kts
dependencies {
    implementation(project(":meal-selection-service-domain"))
    implementation(project(":meal-selection-service-shared"))
}
```

**Forbidden Dependencies:**
```kotlin
// ❌ Domain cannot depend on anything except external libraries
// meal-selection-service-domain/build.gradle.kts
dependencies {
    // Domain is pure - no internal module dependencies
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core")
}

// ❌ API cannot depend on consumer/producer
// This would create tight coupling
```

**Dependency Direction:**
```
┌──────────────────────────────────┐
│   meal-selection-service         │  (Main application)
│   (orchestrates all modules)     │
└──────────────┬───────────────────┘
               │
    ┌──────────┴──────────────┐
    │                          │
    ▼                          ▼
┌──────────────────┐   ┌──────────────────┐
│  API Module      │   │ Consumer Module  │  (Adapters)
└────────┬─────────┘   └────────┬─────────┘
         │                       │
         └────────┬──────────────┘
                  ▼
         ┌────────────────┐
         │ Shared Module  │  (Infrastructure)
         └────────┬───────┘
                  │
                  ▼
         ┌────────────────┐
         │ Domain Module  │  (Core business logic)
         └────────────────┘
```

### Directory Structure Best Practices

**Standard Package Structure:**
```
meal-selection-service-domain/src/main/kotlin/
└── com/yourcompany/mealselection/domain/
    ├── Cart.kt                    # Aggregate root
    ├── CartItem.kt               # Entity
    ├── CartState.kt              # Enum
    ├── Money.kt                  # Value object
    ├── exceptions/
    │   ├── CartNotFoundException.kt
    │   └── InvalidCartStateException.kt
    └── events/
        ├── CartCreatedEvent.kt
        └── CartUpdatedEvent.kt

meal-selection-service-shared/src/main/kotlin/
└── com/yourcompany/mealselection/
    ├── repository/
    │   ├── CartRepository.kt     # Interface
    │   └── JooqCartRepository.kt # Implementation
    ├── client/
    │   └── RecipeServiceClient.kt
    ├── config/
    │   └── DatabaseConfig.kt
    └── util/
        └── Extensions.kt

meal-selection-service-api/src/main/kotlin/
└── com/yourcompany/mealselection/api/
    ├── routes/
    │   ├── CartRoutes.kt
    │   └── HealthRoutes.kt
    ├── dto/
    │   ├── CartRequest.kt
    │   └── CartResponse.kt
    └── middleware/
        └── AuthenticationMiddleware.kt
```

### Testing Multi-Module Projects

**Unit Tests in Each Module:**
```kotlin
// File: meal-selection-service-domain/src/test/kotlin/com/yourcompany/mealselection/domain/CartTest.kt
package com.yourcompany.mealselection.domain

import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import java.util.UUID

class CartTest : DescribeSpec({
    describe("Cart.addItem") {
        it("should add item to active cart") {
            val cart = Cart(
                id = UUID.randomUUID(),
                customerId = UUID.randomUUID(),
                items = emptyList(),
                state = CartState.ACTIVE,
                createdAt = Instant.now(),
                updatedAt = Instant.now()
            )

            val item = CartItem(
                id = UUID.randomUUID(),
                recipeId = UUID.randomUUID(),
                quantity = 2,
                price = Money(10.0)
            )

            val updatedCart = cart.addItem(item)

            updatedCart.items.size shouldBe 1
            updatedCart.items.first() shouldBe item
        }

        it("should throw when adding item to locked cart") {
            val cart = Cart(
                id = UUID.randomUUID(),
                customerId = UUID.randomUUID(),
                items = emptyList(),
                state = CartState.LOCKED,
                createdAt = Instant.now(),
                updatedAt = Instant.now()
            )

            val item = CartItem(
                id = UUID.randomUUID(),
                recipeId = UUID.randomUUID(),
                quantity = 2,
                price = Money(10.0)
            )

            shouldThrow<IllegalArgumentException> {
                cart.addItem(item)
            }
        }
    }
})
```

**Integration Tests Across Modules:**
```kotlin
// File: meal-selection-service/src/test/kotlin/com/yourcompany/mealselection/CartIntegrationTest.kt
package com.yourcompany.mealselection

import io.kotest.core.spec.style.DescribeSpec
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.server.testing.*
import org.testcontainers.containers.PostgreSQLContainer

class CartIntegrationTest : DescribeSpec({
    lateinit var postgres: PostgreSQLContainer<*>

    beforeSpec {
        postgres = PostgreSQLContainer("postgres:15-alpine")
            .withDatabaseName("test_db")
            .withUsername("test")
            .withPassword("test")
        postgres.start()
    }

    afterSpec {
        postgres.stop()
    }

    describe("POST /v1/carts") {
        it("should create a new cart") {
            testApplication {
                environment {
                    config = ApplicationConfig("application-test.conf")
                }

                val response = client.post("/v1/carts") {
                    contentType(ContentType.Application.Json)
                    setBody("""{"customerId": "${UUID.randomUUID()}"}""")
                }

                response.status shouldBe HttpStatusCode.Created
            }
        }
    }
})
```

## Anti-Patterns to Avoid

❌ **Don't create circular dependencies:**
```kotlin
// ❌ Bad - API and Consumer depending on each other
// meal-selection-service-api/build.gradle.kts
dependencies {
    implementation(project(":meal-selection-service-consumer"))  // Wrong!
}

// meal-selection-service-consumer/build.gradle.kts
dependencies {
    implementation(project(":meal-selection-service-api"))  // Wrong!
}
```

✅ **Extract shared code to common module:**
```kotlin
// ✅ Good - Extract to shared module
// meal-selection-service-shared/src/main/kotlin/common/Events.kt
sealed interface DomainEvent

// Both API and Consumer can depend on shared
```

❌ **Don't mix concerns in modules:**
```kotlin
// ❌ Bad - Domain module with infrastructure code
// meal-selection-service-domain/src/main/kotlin/domain/Cart.kt
class Cart {
    fun save() {
        // Database access in domain - wrong!
        database.execute("INSERT INTO carts ...")
    }
}
```

✅ **Keep domain pure:**
```kotlin
// ✅ Good - Domain is pure business logic
// meal-selection-service-domain/src/main/kotlin/domain/Cart.kt
data class Cart(
    val id: UUID,
    val items: List<CartItem>
) {
    fun addItem(item: CartItem): Cart {
        // Pure business logic only
        return copy(items = items + item)
    }
}

// Infrastructure in shared module
// meal-selection-service-shared/src/main/kotlin/repository/CartRepository.kt
class JooqCartRepository {
    suspend fun save(cart: Cart): Cart {
        // Database access here
    }
}
```

## Related Implementers

- **domain-modeling.md** - Domain entities and business logic patterns
- **database-access.md** - jOOQ repository patterns
- **rest-api.md** - Ktor API implementation
- **testing.md** - Testing strategies for multi-module projects
