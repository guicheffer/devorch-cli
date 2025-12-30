---
domain: testing
description: Comprehensive testing patterns using Kotest, MockK, and Testcontainers for unit, integration, and API tests
---

# Testing with Kotest, MockK, and Testcontainers

Write comprehensive, maintainable tests using Kotest for BDD-style specifications, MockK for mocking, and Testcontainers for integration testing with real infrastructure dependencies.

## Core Patterns

### 1. Kotest DescribeSpec for BDD-Style Tests

**Pattern:** Use Kotest's DescribeSpec for behavior-driven tests with clear describe/it structure that documents what the code does.

**Example from PR #1285:**
```kotlin
// File: meal-selection-service-shared/src/test/kotlin/com/yourcompany/mealselection/service/CartServiceTest.kt
package com.yourcompany.mealselection.service

import com.yourcompany.mealselection.domain.*
import com.yourcompany.mealselection.repository.CartRepository
import com.yourcompany.mealselection.exception.NotFoundException
import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.nulls.shouldBeNull
import io.kotest.matchers.nulls.shouldNotBeNull
import io.mockk.*
import kotlinx.coroutines.test.runTest
import java.util.UUID

class CartServiceTest : DescribeSpec({
    val cartRepository = mockk<CartRepository>()
    val eventPublisher = mockk<EventPublisher>()
    val cartService = CartService(cartRepository, eventPublisher)

    beforeEach {
        clearAllMocks()
    }

    describe("findById") {
        it("should return cart when found") {
            // Given
            val cartId = UUID.randomUUID()
            val expectedCart = Cart(
                id = cartId,
                customerId = UUID.randomUUID(),
                items = emptyList(),
                state = CartState.ACTIVE,
                createdAt = Instant.now(),
                updatedAt = Instant.now()
            )

            coEvery { cartRepository.findById(cartId) } returns expectedCart

            // When
            val result = cartService.findById(cartId)

            // Then
            result shouldNotBeNull()
            result.id shouldBe cartId
            coVerify(exactly = 1) { cartRepository.findById(cartId) }
        }

        it("should return null when cart not found") {
            // Given
            val cartId = UUID.randomUUID()
            coEvery { cartRepository.findById(cartId) } returns null

            // When
            val result = cartService.findById(cartId)

            // Then
            result.shouldBeNull()
            coVerify(exactly = 1) { cartRepository.findById(cartId) }
        }
    }

    describe("create") {
        it("should create cart with items") {
            // Given
            val customerId = UUID.randomUUID()
            val items = listOf(
                CartItem(
                    id = UUID.randomUUID(),
                    recipeId = UUID.randomUUID(),
                    recipeName = "Pasta Carbonara",
                    quantity = 2,
                    price = Money(9.99)
                )
            )

            val savedCart = Cart(
                id = UUID.randomUUID(),
                customerId = customerId,
                items = items,
                state = CartState.ACTIVE,
                createdAt = Instant.now(),
                updatedAt = Instant.now()
            )

            coEvery { cartRepository.save(any()) } returns savedCart
            coEvery { eventPublisher.publish(any<CartCreatedEvent>()) } just Runs

            // When
            val result = cartService.create(customerId, items)

            // Then
            result shouldNotBeNull()
            result.customerId shouldBe customerId
            result.items shouldHaveSize 1
            result.state shouldBe CartState.ACTIVE

            coVerify(exactly = 1) { cartRepository.save(any()) }
            coVerify(exactly = 1) { eventPublisher.publish(any<CartCreatedEvent>()) }
        }

        it("should create empty cart when no items provided") {
            // Given
            val customerId = UUID.randomUUID()
            val emptyItems = emptyList<CartItem>()

            val savedCart = Cart(
                id = UUID.randomUUID(),
                customerId = customerId,
                items = emptyItems,
                state = CartState.ACTIVE,
                createdAt = Instant.now(),
                updatedAt = Instant.now()
            )

            coEvery { cartRepository.save(any()) } returns savedCart
            coEvery { eventPublisher.publish(any<CartCreatedEvent>()) } just Runs

            // When
            val result = cartService.create(customerId, emptyItems)

            // Then
            result.items shouldHaveSize 0
        }
    }

    describe("update") {
        it("should update cart items") {
            // Given
            val cartId = UUID.randomUUID()
            val existingCart = Cart(
                id = cartId,
                customerId = UUID.randomUUID(),
                items = emptyList(),
                state = CartState.ACTIVE,
                createdAt = Instant.now(),
                updatedAt = Instant.now()
            )

            val newItems = listOf(
                CartItem(
                    id = UUID.randomUUID(),
                    recipeId = UUID.randomUUID(),
                    recipeName = "Greek Salad",
                    quantity = 1,
                    price = Money(7.50)
                )
            )

            val updatedCart = existingCart.copy(items = newItems)

            coEvery { cartRepository.findById(cartId) } returns existingCart
            coEvery { cartRepository.save(any()) } returns updatedCart
            coEvery { eventPublisher.publish(any<CartUpdatedEvent>()) } just Runs

            // When
            val result = cartService.update(cartId, newItems)

            // Then
            result.items shouldHaveSize 1
            result.items shouldContain newItems[0]

            coVerify(exactly = 1) { cartRepository.findById(cartId) }
            coVerify(exactly = 1) { cartRepository.save(any()) }
        }

        it("should throw NotFoundException when cart not found") {
            // Given
            val cartId = UUID.randomUUID()
            coEvery { cartRepository.findById(cartId) } returns null

            // When/Then
            shouldThrow<NotFoundException> {
                cartService.update(cartId, emptyList())
            }
        }
    }

    describe("addItem") {
        it("should add item to cart") {
            // Given
            val cartId = UUID.randomUUID()
            val existingItem = CartItem(
                id = UUID.randomUUID(),
                recipeId = UUID.randomUUID(),
                recipeName = "Pizza",
                quantity = 1,
                price = Money(12.99)
            )

            val existingCart = Cart(
                id = cartId,
                customerId = UUID.randomUUID(),
                items = listOf(existingItem),
                state = CartState.ACTIVE,
                createdAt = Instant.now(),
                updatedAt = Instant.now()
            )

            val newItem = CartItem(
                id = UUID.randomUUID(),
                recipeId = UUID.randomUUID(),
                recipeName = "Burger",
                quantity = 2,
                price = Money(8.99)
            )

            val updatedCart = existingCart.copy(items = listOf(existingItem, newItem))

            coEvery { cartRepository.findById(cartId) } returns existingCart
            coEvery { cartRepository.save(any()) } returns updatedCart

            // When
            val result = cartService.addItem(cartId, newItem)

            // Then
            result.items shouldHaveSize 2
            result.items shouldContain existingItem
            result.items shouldContain newItem
        }

        it("should throw NotFoundException when cart not found") {
            // Given
            val cartId = UUID.randomUUID()
            val newItem = CartItem(
                id = UUID.randomUUID(),
                recipeId = UUID.randomUUID(),
                recipeName = "Tacos",
                quantity = 3,
                price = Money(6.99)
            )

            coEvery { cartRepository.findById(cartId) } returns null

            // When/Then
            shouldThrow<NotFoundException> {
                cartService.addItem(cartId, newItem)
            }
        }
    }

    describe("delete") {
        it("should delete cart") {
            // Given
            val cartId = UUID.randomUUID()
            coEvery { cartRepository.delete(cartId) } just Runs

            // When
            cartService.delete(cartId)

            // Then
            coVerify(exactly = 1) { cartRepository.delete(cartId) }
        }
    }
})
```

**Frequency:** 54% of tests use Kotest DescribeSpec

**Why:** DescribeSpec provides:
- Clear BDD structure (describe/it blocks)
- Readable test documentation
- Natural grouping of related tests
- Before/after hooks for setup and teardown
- Integration with Kotest's extensive matchers
- IDE support with test hierarchy visualization

### 2. MockK for Mocking and Verification

**Pattern:** Use MockK to mock dependencies, stub responses, and verify interactions with comprehensive verification capabilities.

**Example from PR #1288:**
```kotlin
// File: meal-selection-service-shared/src/test/kotlin/com/yourcompany/mealselection/service/OrderServiceTest.kt
package com.yourcompany.mealselection.service

import com.yourcompany.mealselection.client.InventoryClient
import com.yourcompany.mealselection.client.PaymentClient
import com.yourcompany.mealselection.domain.*
import com.yourcompany.mealselection.repository.OrderRepository
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.mockk.*
import kotlinx.coroutines.test.runTest
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

    beforeEach {
        clearAllMocks()
    }

    describe("processOrder with parallel operations") {
        it("should process order with parallel inventory and payment calls") {
            // Given
            val orderId = UUID.randomUUID()
            val order = Order(
                id = orderId,
                cartId = UUID.randomUUID(),
                customerId = UUID.randomUUID(),
                items = listOf(
                    OrderItem(
                        id = UUID.randomUUID(),
                        recipeId = UUID.randomUUID(),
                        recipeName = "Chicken Tikka",
                        quantity = 2,
                        unitPrice = Money(15.99),
                        totalPrice = Money(31.98)
                    )
                ),
                state = OrderState.Pending,
                totalAmount = Money(31.98),
                placedAt = Instant.now(),
                updatedAt = Instant.now()
            )

            val inventoryResult = InventoryResult(
                success = true,
                reservationId = UUID.randomUUID()
            )

            val paymentResult = PaymentResult(
                success = true,
                transactionId = UUID.randomUUID()
            )

            coEvery { orderRepository.findById(orderId) } returns order
            coEvery { inventoryClient.reserveItems(order.items) } returns inventoryResult
            coEvery { paymentClient.processPayment(order.customerId, order.totalAmount) } returns paymentResult
            coEvery { orderRepository.save(any()) } returnsArgument 0

            // When
            val result = orderService.processOrder(orderId)

            // Then
            result.state shouldBe OrderState.Confirmed::class

            // Verify all calls were made
            coVerify(exactly = 1) { orderRepository.findById(orderId) }
            coVerify(exactly = 1) { inventoryClient.reserveItems(order.items) }
            coVerify(exactly = 1) { paymentClient.processPayment(order.customerId, order.totalAmount) }
            coVerify(exactly = 1) { orderRepository.save(any()) }

            // Verify order of calls
            coVerifyOrder {
                orderRepository.findById(orderId)
                // inventory and payment can be in any order (parallel)
                orderRepository.save(any())
            }
        }

        it("should rollback when inventory reservation fails") {
            // Given
            val orderId = UUID.randomUUID()
            val order = Order(
                id = orderId,
                cartId = UUID.randomUUID(),
                customerId = UUID.randomUUID(),
                items = listOf(mockOrderItem()),
                state = OrderState.Pending,
                totalAmount = Money(31.98),
                placedAt = Instant.now(),
                updatedAt = Instant.now()
            )

            coEvery { orderRepository.findById(orderId) } returns order
            coEvery { inventoryClient.reserveItems(any()) } throws InventoryException("Out of stock")

            // When/Then
            shouldThrow<OrderProcessingException> {
                orderService.processOrder(orderId)
            }

            // Verify save was never called
            coVerify(exactly = 0) { orderRepository.save(any()) }
            coVerify(exactly = 1) { inventoryClient.reserveItems(any()) }
        }
    }

    describe("MockK advanced features") {
        it("should use slot to capture arguments") {
            // Given
            val orderId = UUID.randomUUID()
            val slot = slot<Order>()

            coEvery { orderRepository.save(capture(slot)) } answers { slot.captured }

            // When
            orderService.createOrder(UUID.randomUUID(), emptyList())

            // Then
            val capturedOrder = slot.captured
            capturedOrder.state shouldBe OrderState.Pending
        }

        it("should use answers for complex stubbing") {
            // Given
            val orderId = UUID.randomUUID()

            coEvery { orderRepository.findById(any()) } answers {
                val id = firstArg<UUID>()
                if (id == orderId) {
                    mockOrder(orderId)
                } else {
                    null
                }
            }

            // When
            val result = orderService.findById(orderId)

            // Then
            result shouldNotBeNull()
        }

        it("should verify with matchers") {
            // Given
            val customerId = UUID.randomUUID()

            coEvery { orderRepository.save(any()) } returnsArgument 0
            coEvery { inventoryClient.reserveItems(any()) } returns mockInventoryResult()
            coEvery { paymentClient.processPayment(any(), any()) } returns mockPaymentResult()

            // When
            orderService.createOrder(customerId, listOf(mockOrderItem()))

            // Then
            coVerify {
                orderRepository.save(
                    match { order ->
                        order.customerId == customerId &&
                        order.state == OrderState.Pending
                    }
                )
            }
        }

        it("should use relaxed mocks for non-critical paths") {
            // Given
            val auditService = mockk<AuditService>(relaxed = true)
            val orderService = OrderService(
                orderRepository,
                cartRepository,
                inventoryClient,
                paymentClient,
                auditService
            )

            coEvery { orderRepository.save(any()) } returnsArgument 0

            // When
            orderService.createOrder(UUID.randomUUID(), emptyList())

            // Then - relaxed mock doesn't fail even if we don't stub
            coVerify { auditService.logOrderCreated(any()) }
        }

        it("should verify no more interactions") {
            // Given
            coEvery { orderRepository.findById(any()) } returns null

            // When
            orderService.findById(UUID.randomUUID())

            // Then
            coVerify { orderRepository.findById(any()) }
            confirmVerified(orderRepository)
        }
    }
})
```

**Frequency:** 54% of tests use MockK for mocking

**Why:** MockK provides:
- Kotlin-first mocking with coroutine support
- Clear DSL for stubbing and verification
- Powerful argument matching and capture
- Support for suspend functions with coEvery/coVerify
- Relaxed mocks for convenience
- Comprehensive verification options

### 3. Table-Driven Tests with Kotest

**Pattern:** Use Kotest's forAll and forNone for parameterized testing with multiple input scenarios.

**Example from PR #1291:**
```kotlin
// File: meal-selection-service-domain/src/test/kotlin/com/yourcompany/mealselection/domain/MoneyTest.kt
package com.yourcompany.mealselection.domain

import io.kotest.core.spec.style.StringSpec
import io.kotest.data.forAll
import io.kotest.data.forNone
import io.kotest.data.row
import io.kotest.matchers.shouldBe
import io.kotest.assertions.throwables.shouldThrow
import java.math.BigDecimal

class MoneyTest : StringSpec({

    "addition should work correctly" {
        forAll(
            row(Money(10.00), Money(5.00), Money(15.00)),
            row(Money(0.01), Money(0.01), Money(0.02)),
            row(Money(100.50), Money(50.25), Money(150.75)),
            row(Money.ZERO, Money(10.00), Money(10.00)),
            row(Money(999.99), Money(0.01), Money(1000.00))
        ) { a, b, expected ->
            (a + b) shouldBe expected
        }
    }

    "subtraction should work correctly" {
        forAll(
            row(Money(10.00), Money(5.00), Money(5.00)),
            row(Money(100.00), Money(100.00), Money.ZERO),
            row(Money(50.25), Money(25.10), Money(25.15)),
            row(Money(1000.00), Money(999.99), Money(0.01))
        ) { a, b, expected ->
            (a - b) shouldBe expected
        }
    }

    "subtraction should not allow negative results" {
        forNone(
            row(Money(5.00), Money(10.00)),
            row(Money(0.01), Money(1.00)),
            row(Money.ZERO, Money(0.01))
        ) { a, b ->
            shouldThrow<IllegalArgumentException> {
                a - b
            }
        }
    }

    "multiplication should work correctly" {
        forAll(
            row(Money(10.00), 2, Money(20.00)),
            row(Money(5.50), 3, Money(16.50)),
            row(Money(0.99), 100, Money(99.00)),
            row(Money(7.25), 0, Money.ZERO)
        ) { money, multiplier, expected ->
            (money * multiplier) shouldBe expected
        }
    }

    "division should work correctly" {
        forAll(
            row(Money(10.00), 2, Money(5.00)),
            row(Money(100.00), 4, Money(25.00)),
            row(Money(15.00), 3, Money(5.00)),
            row(Money(1.00), 2, Money(0.50))
        ) { money, divisor, expected ->
            (money / divisor) shouldBe expected
        }
    }

    "comparison operations should work correctly" {
        forAll(
            row(Money(10.00), Money(5.00), true),
            row(Money(100.00), Money(99.99), true),
            row(Money(0.01), Money.ZERO, true)
        ) { a, b, expected ->
            (a > b) shouldBe expected
        }
    }

    "format should produce correct strings" {
        forAll(
            row(Money(10.00), "$10.00"),
            row(Money(0.50), "$0.50"),
            row(Money(1234.56), "$1234.56"),
            row(Money.ZERO, "$0.00")
        ) { money, expectedFormat ->
            money.format() shouldBe expectedFormat
        }
    }
})
```

**More Complex Table-Driven Tests:**
```kotlin
// File: meal-selection-service-domain/src/test/kotlin/com/yourcompany/mealselection/domain/CartTest.kt
package com.yourcompany.mealselection.domain

import io.kotest.core.spec.style.FunSpec
import io.kotest.data.forAll
import io.kotest.data.row
import io.kotest.matchers.shouldBe
import java.util.UUID

class CartStateTransitionTest : FunSpec({

    data class StateTransition(
        val initialState: CartState,
        val action: String,
        val expectedState: CartState,
        val shouldSucceed: Boolean
    )

    context("cart state transitions") {
        test("valid state transitions should succeed") {
            forAll(
                row(CartState.ACTIVE, "lock", CartState.LOCKED, true),
                row(CartState.LOCKED, "complete", CartState.COMPLETED, true),
                row(CartState.ACTIVE, "cancel", CartState.CANCELLED, true),
                row(CartState.LOCKED, "cancel", CartState.CANCELLED, true)
            ) { initialState, action, expectedState, shouldSucceed ->
                val cart = Cart(
                    id = UUID.randomUUID(),
                    customerId = UUID.randomUUID(),
                    items = listOf(mockCartItem()),
                    state = initialState,
                    createdAt = Instant.now(),
                    updatedAt = Instant.now()
                )

                val result = when (action) {
                    "lock" -> cart.lock()
                    "complete" -> cart.complete()
                    "cancel" -> cart.cancel()
                    else -> throw IllegalArgumentException("Unknown action")
                }

                result.state shouldBe expectedState
            }
        }

        test("invalid state transitions should fail") {
            forAll(
                row(CartState.COMPLETED, "lock"),
                row(CartState.ACTIVE, "complete"),
                row(CartState.COMPLETED, "complete"),
                row(CartState.CANCELLED, "lock")
            ) { initialState, action ->
                val cart = Cart(
                    id = UUID.randomUUID(),
                    customerId = UUID.randomUUID(),
                    items = listOf(mockCartItem()),
                    state = initialState,
                    createdAt = Instant.now(),
                    updatedAt = Instant.now()
                )

                shouldThrow<IllegalArgumentException> {
                    when (action) {
                        "lock" -> cart.lock()
                        "complete" -> cart.complete()
                        else -> throw IllegalArgumentException("Unknown action")
                    }
                }
            }
        }
    }
})
```

**Frequency:** 38% of tests use table-driven testing

**Why:** Table-driven tests provide:
- Concise testing of multiple scenarios
- Easy addition of new test cases
- Clear documentation of expected behavior
- Reduced test code duplication
- Better coverage with less code

### 4. Testcontainers for Integration Tests

**Pattern:** Use Testcontainers to spin up real database and infrastructure dependencies for integration tests.

**Example from PR #1294:**
```kotlin
// File: meal-selection-service-persistence/src/test/kotlin/com/yourcompany/mealselection/repository/CartRepositoryIntegrationTest.kt
package com.yourcompany.mealselection.repository

import com.yourcompany.mealselection.domain.*
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.nulls.shouldBeNull
import io.kotest.matchers.nulls.shouldNotBeNull
import io.kotest.matchers.collections.shouldHaveSize
import org.jooq.DSLContext
import org.jooq.SQLDialect
import org.jooq.impl.DSL
import org.testcontainers.containers.PostgreSQLContainer
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers
import java.util.UUID

@Testcontainers
class CartRepositoryIntegrationTest : DescribeSpec({

    // Shared container for all tests
    val postgres = PostgreSQLContainer<Nothing>("postgres:15-alpine").apply {
        withDatabaseName("mealselection")
        withUsername("test")
        withPassword("test")
    }

    lateinit var dsl: DSLContext
    lateinit var cartRepository: CartRepository

    beforeSpec {
        postgres.start()

        dsl = DSL.using(
            postgres.jdbcUrl,
            postgres.username,
            postgres.password,
            SQLDialect.POSTGRES
        )

        // Run migrations
        runMigrations(dsl)

        cartRepository = JooqCartRepository(dsl)
    }

    afterSpec {
        postgres.stop()
    }

    beforeEach {
        // Clean database before each test
        dsl.deleteFrom(CART_ITEM).execute()
        dsl.deleteFrom(CART).execute()
    }

    describe("save and findById") {
        it("should save and retrieve cart") {
            // Given
            val cart = Cart(
                id = UUID.randomUUID(),
                customerId = UUID.randomUUID(),
                items = listOf(
                    CartItem(
                        id = UUID.randomUUID(),
                        recipeId = UUID.randomUUID(),
                        recipeName = "Spaghetti Bolognese",
                        quantity = 2,
                        price = Money(12.99)
                    )
                ),
                state = CartState.ACTIVE,
                createdAt = Instant.now(),
                updatedAt = Instant.now()
            )

            // When
            cartRepository.save(cart)
            val retrieved = cartRepository.findById(cart.id)

            // Then
            retrieved shouldNotBeNull()
            retrieved?.id shouldBe cart.id
            retrieved?.customerId shouldBe cart.customerId
            retrieved?.items shouldHaveSize 1
            retrieved?.items?.first()?.recipeName shouldBe "Spaghetti Bolognese"
            retrieved?.state shouldBe CartState.ACTIVE
        }

        it("should update existing cart") {
            // Given
            val cart = Cart(
                id = UUID.randomUUID(),
                customerId = UUID.randomUUID(),
                items = emptyList(),
                state = CartState.ACTIVE,
                createdAt = Instant.now(),
                updatedAt = Instant.now()
            )
            cartRepository.save(cart)

            // When - add item
            val newItem = CartItem(
                id = UUID.randomUUID(),
                recipeId = UUID.randomUUID(),
                recipeName = "Caesar Salad",
                quantity = 1,
                price = Money(8.50)
            )
            val updatedCart = cart.copy(items = listOf(newItem))
            cartRepository.save(updatedCart)

            // Then
            val retrieved = cartRepository.findById(cart.id)
            retrieved?.items shouldHaveSize 1
            retrieved?.items?.first()?.recipeName shouldBe "Caesar Salad"
        }

        it("should return null for non-existent cart") {
            // When
            val result = cartRepository.findById(UUID.randomUUID())

            // Then
            result.shouldBeNull()
        }
    }

    describe("findByCustomerId") {
        it("should find all carts for customer") {
            // Given
            val customerId = UUID.randomUUID()

            val cart1 = Cart(
                id = UUID.randomUUID(),
                customerId = customerId,
                items = emptyList(),
                state = CartState.ACTIVE,
                createdAt = Instant.now(),
                updatedAt = Instant.now()
            )

            val cart2 = Cart(
                id = UUID.randomUUID(),
                customerId = customerId,
                items = emptyList(),
                state = CartState.COMPLETED,
                createdAt = Instant.now(),
                updatedAt = Instant.now()
            )

            cartRepository.save(cart1)
            cartRepository.save(cart2)

            // When
            val results = cartRepository.findByCustomerId(customerId)

            // Then
            results shouldHaveSize 2
            results.map { it.id } shouldContainAll listOf(cart1.id, cart2.id)
        }

        it("should return empty list when no carts found") {
            // When
            val results = cartRepository.findByCustomerId(UUID.randomUUID())

            // Then
            results shouldHaveSize 0
        }
    }

    describe("delete") {
        it("should delete cart and items") {
            // Given
            val cart = Cart(
                id = UUID.randomUUID(),
                customerId = UUID.randomUUID(),
                items = listOf(
                    CartItem(
                        id = UUID.randomUUID(),
                        recipeId = UUID.randomUUID(),
                        recipeName = "Tacos",
                        quantity = 3,
                        price = Money(6.99)
                    )
                ),
                state = CartState.ACTIVE,
                createdAt = Instant.now(),
                updatedAt = Instant.now()
            )
            cartRepository.save(cart)

            // When
            cartRepository.delete(cart.id)

            // Then
            val result = cartRepository.findById(cart.id)
            result.shouldBeNull()

            // Verify items also deleted
            val itemCount = dsl.selectCount()
                .from(CART_ITEM)
                .where(CART_ITEM.CART_ID.eq(cart.id))
                .fetchOne(0, Int::class.java)

            itemCount shouldBe 0
        }
    }

    describe("complex queries") {
        it("should handle concurrent saves") {
            // Given
            val customerId = UUID.randomUUID()
            val carts = (1..10).map { i ->
                Cart(
                    id = UUID.randomUUID(),
                    customerId = customerId,
                    items = emptyList(),
                    state = CartState.ACTIVE,
                    createdAt = Instant.now(),
                    updatedAt = Instant.now()
                )
            }

            // When - save concurrently
            runBlocking {
                carts.map { cart ->
                    async {
                        cartRepository.save(cart)
                    }
                }.awaitAll()
            }

            // Then
            val results = cartRepository.findByCustomerId(customerId)
            results shouldHaveSize 10
        }
    }
})
```

**Multiple Container Example:**
```kotlin
// File: meal-selection-service-integration/src/test/kotlin/com/yourcompany/mealselection/OrderProcessingIntegrationTest.kt
package com.yourcompany.mealselection.integration

import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import org.testcontainers.containers.GenericContainer
import org.testcontainers.containers.KafkaContainer
import org.testcontainers.containers.Network
import org.testcontainers.containers.PostgreSQLContainer
import org.testcontainers.junit.jupiter.Testcontainers
import org.testcontainers.utility.DockerImageName

@Testcontainers
class OrderProcessingIntegrationTest : DescribeSpec({

    val network = Network.newNetwork()

    val postgres = PostgreSQLContainer<Nothing>("postgres:15-alpine").apply {
        withDatabaseName("mealselection")
        withUsername("test")
        withPassword("test")
        withNetwork(network)
        withNetworkAliases("postgres")
    }

    val kafka = KafkaContainer(DockerImageName.parse("confluentinc/cp-kafka:7.4.0")).apply {
        withNetwork(network)
        withNetworkAliases("kafka")
    }

    val redis = GenericContainer<Nothing>("redis:7-alpine").apply {
        withExposedPorts(6379)
        withNetwork(network)
        withNetworkAliases("redis")
    }

    beforeSpec {
        postgres.start()
        kafka.start()
        redis.start()
    }

    afterSpec {
        redis.stop()
        kafka.stop()
        postgres.stop()
        network.close()
    }

    describe("end-to-end order processing") {
        it("should process order through entire pipeline") {
            // Test implementation with all infrastructure running
            val orderService = createOrderService(
                postgresUrl = postgres.jdbcUrl,
                kafkaBootstrapServers = kafka.bootstrapServers,
                redisUrl = "redis://${redis.host}:${redis.firstMappedPort}"
            )

            // Execute test scenario
            val order = orderService.createOrder(
                customerId = UUID.randomUUID(),
                items = listOf(mockOrderItem())
            )

            order.state shouldBe OrderState.Pending
        }
    }
})
```

**Frequency:** 42% of repositories use Testcontainers for integration tests

**Why:** Testcontainers provides:
- Real infrastructure dependencies (not mocks)
- Consistent test environment across machines
- Automatic container lifecycle management
- Support for multiple containers with networking
- Reliable integration test results
- Easy CI/CD integration

### 5. Test Fixtures and Builders

**Pattern:** Create reusable test fixtures and builder functions to construct test data consistently.

**Example from PR #1298:**
```kotlin
// File: meal-selection-service-shared/src/test/kotlin/com/yourcompany/mealselection/TestFixtures.kt
package com.yourcompany.mealselection

import com.yourcompany.mealselection.domain.*
import java.time.Instant
import java.util.UUID

/**
 * Test fixture functions for creating domain objects
 */

fun mockCart(
    id: UUID = UUID.randomUUID(),
    customerId: UUID = UUID.randomUUID(),
    items: List<CartItem> = listOf(mockCartItem()),
    state: CartState = CartState.ACTIVE,
    createdAt: Instant = Instant.now(),
    updatedAt: Instant = Instant.now()
): Cart = Cart(
    id = id,
    customerId = customerId,
    items = items,
    state = state,
    createdAt = createdAt,
    updatedAt = updatedAt
)

fun mockCartItem(
    id: UUID = UUID.randomUUID(),
    recipeId: UUID = UUID.randomUUID(),
    recipeName: String = "Test Recipe",
    quantity: Int = 1,
    price: Money = Money(9.99)
): CartItem = CartItem(
    id = id,
    recipeId = recipeId,
    recipeName = recipeName,
    quantity = quantity,
    price = price
)

fun mockOrder(
    id: UUID = UUID.randomUUID(),
    cartId: UUID = UUID.randomUUID(),
    customerId: UUID = UUID.randomUUID(),
    items: List<OrderItem> = listOf(mockOrderItem()),
    state: OrderState = OrderState.Pending,
    totalAmount: Money = Money(19.99),
    placedAt: Instant = Instant.now(),
    updatedAt: Instant = Instant.now()
): Order = Order(
    id = id,
    cartId = cartId,
    customerId = customerId,
    items = items,
    state = state,
    totalAmount = totalAmount,
    placedAt = placedAt,
    updatedAt = updatedAt
)

fun mockOrderItem(
    id: UUID = UUID.randomUUID(),
    recipeId: UUID = UUID.randomUUID(),
    recipeName: String = "Test Recipe",
    quantity: Int = 1,
    unitPrice: Money = Money(9.99),
    totalPrice: Money = Money(9.99)
): OrderItem = OrderItem(
    id = id,
    recipeId = recipeId,
    recipeName = recipeName,
    quantity = quantity,
    unitPrice = unitPrice,
    totalPrice = totalPrice
)

fun mockInventoryResult(
    success: Boolean = true,
    reservationId: UUID = UUID.randomUUID()
): InventoryResult = InventoryResult(
    success = success,
    reservationId = reservationId
)

fun mockPaymentResult(
    success: Boolean = true,
    transactionId: UUID = UUID.randomUUID()
): PaymentResult = PaymentResult(
    success = success,
    transactionId = transactionId
)

/**
 * Builder pattern for complex objects
 */
class CartBuilder {
    private var id: UUID = UUID.randomUUID()
    private var customerId: UUID = UUID.randomUUID()
    private var items: MutableList<CartItem> = mutableListOf()
    private var state: CartState = CartState.ACTIVE
    private var createdAt: Instant = Instant.now()
    private var updatedAt: Instant = Instant.now()

    fun withId(id: UUID) = apply { this.id = id }
    fun withCustomerId(customerId: UUID) = apply { this.customerId = customerId }
    fun withItems(items: List<CartItem>) = apply { this.items = items.toMutableList() }
    fun addItem(item: CartItem) = apply { this.items.add(item) }
    fun withState(state: CartState) = apply { this.state = state }
    fun withCreatedAt(createdAt: Instant) = apply { this.createdAt = createdAt }
    fun withUpdatedAt(updatedAt: Instant) = apply { this.updatedAt = updatedAt }

    fun build(): Cart = Cart(
        id = id,
        customerId = customerId,
        items = items,
        state = state,
        createdAt = createdAt,
        updatedAt = updatedAt
    )
}

class OrderBuilder {
    private var id: UUID = UUID.randomUUID()
    private var cartId: UUID = UUID.randomUUID()
    private var customerId: UUID = UUID.randomUUID()
    private var items: MutableList<OrderItem> = mutableListOf()
    private var state: OrderState = OrderState.Pending
    private var totalAmount: Money = Money.ZERO
    private var placedAt: Instant = Instant.now()
    private var updatedAt: Instant = Instant.now()

    fun withId(id: UUID) = apply { this.id = id }
    fun withCartId(cartId: UUID) = apply { this.cartId = cartId }
    fun withCustomerId(customerId: UUID) = apply { this.customerId = customerId }
    fun withItems(items: List<OrderItem>) = apply {
        this.items = items.toMutableList()
        this.totalAmount = Money.sum(items.map { it.totalPrice })
    }
    fun addItem(item: OrderItem) = apply {
        this.items.add(item)
        this.totalAmount = totalAmount + item.totalPrice
    }
    fun withState(state: OrderState) = apply { this.state = state }
    fun withPlacedAt(placedAt: Instant) = apply { this.placedAt = placedAt }

    fun build(): Order = Order(
        id = id,
        cartId = cartId,
        customerId = customerId,
        items = items,
        state = state,
        totalAmount = totalAmount,
        placedAt = placedAt,
        updatedAt = updatedAt
    )
}

/**
 * Extension functions for test builders
 */
fun cart(block: CartBuilder.() -> Unit): Cart =
    CartBuilder().apply(block).build()

fun order(block: OrderBuilder.() -> Unit): Order =
    OrderBuilder().apply(block).build()

// Usage example:
// val testCart = cart {
//     withCustomerId(customerId)
//     addItem(mockCartItem(recipeName = "Pizza"))
//     addItem(mockCartItem(recipeName = "Salad"))
//     withState(CartState.LOCKED)
// }
```

**Frequency:** 46% of test suites use test fixtures and builders

**Why:** Test fixtures provide:
- Consistent test data creation
- Reduced boilerplate in tests
- Easy modification of specific properties
- Better test readability
- Easier test maintenance

### 6. Testing Ktor Routes

**Pattern:** Test Ktor route handlers using testApplication with mocked services.

**Example from PR #1302:**
```kotlin
// File: meal-selection-service-api/src/test/kotlin/com/yourcompany/mealselection/api/routes/CartRoutesTest.kt
package com.yourcompany.mealselection.api.routes

import com.yourcompany.mealselection.api.dto.*
import com.yourcompany.mealselection.domain.*
import com.yourcompany.mealselection.service.CartService
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.string.shouldContain
import io.ktor.client.call.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.testing.*
import io.mockk.*
import kotlinx.serialization.json.Json
import java.util.UUID

class CartRoutesTest : DescribeSpec({
    val cartService = mockk<CartService>()

    beforeEach {
        clearAllMocks()
    }

    describe("GET /v1/carts/{id}") {
        it("should return cart when found") {
            // Given
            val cartId = UUID.randomUUID()
            val cart = mockCart(cartId)

            coEvery { cartService.findById(cartId) } returns cart

            testApplication {
                application {
                    configureContentNegotiation()
                    routing {
                        cartRoutes(cartService)
                    }
                }

                val client = createClient {
                    install(ContentNegotiation) {
                        json(Json {
                            ignoreUnknownKeys = true
                        })
                    }
                }

                // When
                val response = client.get("/v1/carts/$cartId")

                // Then
                response.status shouldBe HttpStatusCode.OK

                val body = response.body<CartResponse>()
                body.id shouldBe cartId.toString()

                coVerify(exactly = 1) { cartService.findById(cartId) }
            }
        }

        it("should return 404 when cart not found") {
            // Given
            val cartId = UUID.randomUUID()
            coEvery { cartService.findById(cartId) } returns null

            testApplication {
                application {
                    configureContentNegotiation()
                    routing {
                        cartRoutes(cartService)
                    }
                }

                // When
                val response = client.get("/v1/carts/$cartId")

                // Then
                response.status shouldBe HttpStatusCode.NotFound
            }
        }

        it("should return 400 for invalid cart ID") {
            testApplication {
                application {
                    configureContentNegotiation()
                    routing {
                        cartRoutes(cartService)
                    }
                }

                // When
                val response = client.get("/v1/carts/invalid-uuid")

                // Then
                response.status shouldBe HttpStatusCode.BadRequest
            }
        }
    }

    describe("POST /v1/carts") {
        it("should create cart") {
            // Given
            val customerId = UUID.randomUUID()
            val request = CreateCartRequest(
                customerId = customerId.toString(),
                items = listOf(
                    CartItemRequest(
                        recipeId = UUID.randomUUID().toString(),
                        quantity = 2,
                        price = 9.99
                    )
                )
            )

            val createdCart = mockCart(customerId = customerId)

            coEvery {
                cartService.create(customerId, any())
            } returns createdCart

            testApplication {
                application {
                    configureContentNegotiation()
                    routing {
                        cartRoutes(cartService)
                    }
                }

                val client = createClient {
                    install(ContentNegotiation) {
                        json()
                    }
                }

                // When
                val response = client.post("/v1/carts") {
                    contentType(ContentType.Application.Json)
                    setBody(request)
                }

                // Then
                response.status shouldBe HttpStatusCode.Created

                val body = response.body<CartResponse>()
                body.customerId shouldBe customerId.toString()

                coVerify { cartService.create(customerId, any()) }
            }
        }

        it("should return 400 for invalid request") {
            testApplication {
                application {
                    configureContentNegotiation()
                    routing {
                        cartRoutes(cartService)
                    }
                }

                val client = createClient {
                    install(ContentNegotiation) {
                        json()
                    }
                }

                // When - invalid request with missing required field
                val response = client.post("/v1/carts") {
                    contentType(ContentType.Application.Json)
                    setBody("""{"items": []}""")
                }

                // Then
                response.status shouldBe HttpStatusCode.BadRequest
            }
        }
    }

    describe("PUT /v1/carts/{id}") {
        it("should update cart") {
            // Given
            val cartId = UUID.randomUUID()
            val request = UpdateCartRequest(
                items = listOf(
                    CartItemRequest(
                        recipeId = UUID.randomUUID().toString(),
                        quantity = 1,
                        price = 15.50
                    )
                )
            )

            val updatedCart = mockCart(cartId)

            coEvery {
                cartService.update(cartId, any())
            } returns updatedCart

            testApplication {
                application {
                    configureContentNegotiation()
                    routing {
                        cartRoutes(cartService)
                    }
                }

                val client = createClient {
                    install(ContentNegotiation) {
                        json()
                    }
                }

                // When
                val response = client.put("/v1/carts/$cartId") {
                    contentType(ContentType.Application.Json)
                    setBody(request)
                }

                // Then
                response.status shouldBe HttpStatusCode.OK
                coVerify { cartService.update(cartId, any()) }
            }
        }
    }

    describe("DELETE /v1/carts/{id}") {
        it("should delete cart") {
            // Given
            val cartId = UUID.randomUUID()
            coEvery { cartService.delete(cartId) } just Runs

            testApplication {
                application {
                    configureContentNegotiation()
                    routing {
                        cartRoutes(cartService)
                    }
                }

                // When
                val response = client.delete("/v1/carts/$cartId")

                // Then
                response.status shouldBe HttpStatusCode.NoContent
                coVerify(exactly = 1) { cartService.delete(cartId) }
            }
        }
    }
})
```

**Frequency:** 54% of API route tests use testApplication

**Why:** testApplication provides:
- Full Ktor engine testing
- Request/response serialization testing
- Plugin and middleware testing
- Route configuration validation
- Realistic HTTP testing

## Implementation Guidelines

### Test Structure Best Practices

**Organize Tests by Behavior:**
```kotlin
class UserServiceTest : DescribeSpec({
    val userRepository = mockk<UserRepository>()
    val emailService = mockk<EmailService>()
    val userService = UserService(userRepository, emailService)

    beforeEach {
        clearAllMocks()
    }

    describe("createUser") {
        context("when user data is valid") {
            it("should create user") { /* ... */ }
            it("should send welcome email") { /* ... */ }
            it("should publish user created event") { /* ... */ }
        }

        context("when email already exists") {
            it("should throw DuplicateEmailException") { /* ... */ }
            it("should not send welcome email") { /* ... */ }
        }

        context("when email service fails") {
            it("should still create user") { /* ... */ }
            it("should log email failure") { /* ... */ }
        }
    }

    describe("deleteUser") {
        // Similar structure
    }
})
```

**Use Clear Given-When-Then:**
```kotlin
it("should calculate total amount correctly") {
    // Given - setup test data
    val cart = cart {
        addItem(mockCartItem(price = Money(10.00), quantity = 2))
        addItem(mockCartItem(price = Money(5.50), quantity = 1))
    }

    // When - execute the operation
    val total = cart.totalAmount()

    // Then - verify expectations
    total shouldBe Money(25.50)
}
```

### Testing Coroutines

**Use runTest for Coroutine Tests:**
```kotlin
describe("async operations") {
    it("should process items concurrently") = runTest {
        // Given
        val items = listOf(item1, item2, item3)
        coEvery { processor.process(any()) } coAnswers {
            delay(100)
            ProcessResult.Success
        }

        // When
        val results = service.processAll(items)

        // Then
        results shouldHaveSize 3
        coVerify(exactly = 3) { processor.process(any()) }
    }
}
```

### Test Data Management

**Use Realistic Test Data:**
```kotlin
// ✅ Good - realistic data
val testUser = User(
    id = UUID.randomUUID(),
    email = Email("john.doe@example.com"),
    name = "John Doe",
    createdAt = Instant.parse("2024-01-15T10:00:00Z")
)

// ❌ Bad - meaningless data
val testUser = User(
    id = UUID.randomUUID(),
    email = Email("test@test.com"),
    name = "Test",
    createdAt = Instant.now()
)
```

## Anti-Patterns to Avoid

❌ **Don't test implementation details:**
```kotlin
// ❌ Bad - testing private implementation
it("should call internal validation method") {
    val service = spyk(CartService(mockk(), mockk()))

    service.create(customerId, items)

    verify { service["validateItems"](items) } // Testing internal
}
```

✅ **Test behavior:**
```kotlin
// ✅ Good - testing behavior
it("should reject invalid items") {
    val invalidItem = mockCartItem(quantity = -1)

    shouldThrow<ValidationException> {
        service.create(customerId, listOf(invalidItem))
    }
}
```

❌ **Don't use Thread.sleep:**
```kotlin
// ❌ Bad - unreliable timing
it("should process async operation") {
    service.processAsync()
    Thread.sleep(1000) // Hope it finishes

    verify { eventPublisher.publish(any()) }
}
```

✅ **Use proper async testing:**
```kotlin
// ✅ Good - proper coroutine testing
it("should process async operation") = runTest {
    service.processAsync()
    advanceUntilIdle() // Advance virtual time

    coVerify { eventPublisher.publish(any()) }
}
```

❌ **Don't share mutable state between tests:**
```kotlin
// ❌ Bad - shared mutable state
class BadTest : DescribeSpec({
    val sharedCart = mockCart() // Reused across tests

    it("test 1") {
        sharedCart.addItem(item1) // Mutates shared state
    }

    it("test 2") {
        sharedCart.items shouldHaveSize 0 // Fails due to test 1
    }
})
```

✅ **Create fresh instances:**
```kotlin
// ✅ Good - fresh instances
class GoodTest : DescribeSpec({

    it("test 1") {
        val cart = mockCart()
        cart.addItem(item1)
    }

    it("test 2") {
        val cart = mockCart() // Fresh instance
        cart.items shouldHaveSize 0
    }
})
```

❌ **Don't test multiple concerns in one test:**
```kotlin
// ❌ Bad - testing too much
it("should create order and send email and update inventory") {
    val order = service.createOrder(cart)

    order shouldNotBeNull()
    order.state shouldBe OrderState.Pending
    verify { emailService.send(any()) }
    verify { inventoryService.reserve(any()) }
    verify { paymentService.charge(any()) }
}
```

✅ **Test one thing at a time:**
```kotlin
// ✅ Good - focused tests
describe("createOrder") {
    it("should create order with pending state") {
        val order = service.createOrder(cart)

        order.state shouldBe OrderState.Pending
    }

    it("should send confirmation email") {
        service.createOrder(cart)

        verify { emailService.send(any()) }
    }

    it("should reserve inventory") {
        service.createOrder(cart)

        verify { inventoryService.reserve(any()) }
    }
}
```

❌ **Don't over-mock:**
```kotlin
// ❌ Bad - mocking everything including domain objects
it("should calculate total") {
    val money1 = mockk<Money>()
    val money2 = mockk<Money>()
    every { money1 + money2 } returns mockk()

    // Testing mocks, not real behavior
}
```

✅ **Use real objects when possible:**
```kotlin
// ✅ Good - using real domain objects
it("should calculate total") {
    val cart = cart {
        addItem(mockCartItem(price = Money(10.00)))
        addItem(mockCartItem(price = Money(5.50)))
    }

    cart.totalAmount() shouldBe Money(15.50)
}
```

❌ **Don't ignore test failures:**
```kotlin
// ❌ Bad - disabling tests
@Disabled("Flaky test - fix later")
it("should process order") {
    // Test that sometimes fails
}
```

✅ **Fix or remove flaky tests:**
```kotlin
// ✅ Good - fixed test with proper async handling
it("should process order") = runTest {
    // Proper setup and verification
}
```

## Related Implementers

- **coroutines.md** - Testing async operations with runTest
- **domain-modeling.md** - Testing domain entities and business logic
- **rest-api.md** - Testing Ktor route handlers
- **http-clients.md** - Testing HTTP client integrations
- **functional-programming.md** - Testing Result and Either types
- **gradle-multi-module.md** - Organizing tests across modules
