---
domain: testing
description: Verify testing quality using Kotest, MockK, and Testcontainers for comprehensive test coverage
---

# Testing Verifier

Comprehensive verification checklist for Kotlin microservice testing quality using Kotest, MockK, and Testcontainers.

## Verification Criteria

### 1. Test Coverage Requirements

**Minimum Requirements:**
- ✅ Unit test coverage ≥80% for business logic
- ✅ Integration tests for all repositories
- ✅ API tests for all REST endpoints
- ✅ Coroutine tests for async operations

**How to Verify:**

```bash
# Run tests with coverage (Gradle)
./gradlew test jacocoTestReport

# View coverage report
open build/reports/jacoco/test/html/index.html

# Check coverage percentage
./gradlew test jacocoTestCoverageVerification
```

**Alternative with Kover:**
```bash
# Run Kover coverage
./gradlew koverHtmlReport

# View report
open build/reports/kover/html/index.html
```

**Search for Coverage Configuration:**
```bash
# Find Jacoco or Kover configuration
grep -r "jacoco\|kover" build.gradle.kts
```

**Expected Output:**
```
BUILD SUCCESSFUL in 12s
Coverage: 84.2%
```

**Verify Coverage Thresholds:**
```kotlin
// In build.gradle.kts
kover {
    verify {
        rule {
            minBound(80) // Minimum 80% coverage
        }
    }
}
```

### 2. Kotest DescribeSpec Pattern

**Requirement:** All unit and service tests must use Kotest's DescribeSpec with proper describe/it structure.

**Verify Pattern:**
```kotlin
class ServiceTest : DescribeSpec({
    val repository = mockk<Repository>()
    val service = Service(repository)

    beforeEach {
        clearAllMocks()
    }

    describe("functionName") {
        it("should perform expected behavior") {
            // Given
            val input = TestData()
            coEvery { repository.method(input) } returns expectedResult

            // When
            val result = service.function(input)

            // Then
            result shouldBe expectedResult
            coVerify(exactly = 1) { repository.method(input) }
        }

        it("should handle error case") {
            // Test error handling
        }
    }
})
```

**Check for DescribeSpec Usage:**
```bash
# Find DescribeSpec test files
grep -r "class.*:.*DescribeSpec" --include="*Test.kt"

# Verify describe/it structure
grep -r "describe\(\"" --include="*Test.kt" | wc -l
grep -r "it\(\"should" --include="*Test.kt" | wc -l
```

**Validation Criteria:**
- ✅ All test classes extend DescribeSpec (or other Kotest spec)
- ✅ Tests organized with describe blocks for each function
- ✅ Tests use it blocks with descriptive names
- ✅ Each test follows Given-When-Then structure
- ✅ beforeEach used for mock cleanup
- ✅ Tests are readable and self-documenting

**Anti-Pattern to Flag:**
```kotlin
// ❌ Bad - JUnit style with Kotest
class ServiceTest : DescribeSpec({
    @Test
    fun testFunction() {  // Wrong - mixing JUnit with Kotest
        val result = service.function()
        assertEquals(expected, result)  // Wrong - use Kotest matchers
    }
})
```

### 3. MockK Usage and Verification

**Requirement:** All mocking must use MockK with proper coEvery/coVerify for suspend functions.

**Verify Pattern:**
```kotlin
describe("service with mocked dependencies") {
    it("should mock suspend function correctly") {
        // Given
        val mockRepo = mockk<Repository>()
        coEvery { mockRepo.findById(any()) } returns testEntity

        // When
        val result = service.process(id)

        // Then
        coVerify(exactly = 1) { mockRepo.findById(id) }
        coVerify(exactly = 0) { mockRepo.delete(any()) }
    }
}
```

**Check for MockK Patterns:**
```bash
# Verify MockK usage
grep -r "mockk<" --include="*Test.kt" | wc -l

# Check for proper cleanup
grep -r "clearAllMocks()" --include="*Test.kt" | wc -l

# Verify coEvery usage for suspend functions
grep -r "coEvery" --include="*Test.kt" | wc -l

# Verify coVerify usage
grep -r "coVerify" --include="*Test.kt" | wc -l
```

**MockK Best Practices Checklist:**
- ✅ Use `mockk<Type>()` for creating mocks
- ✅ Use `coEvery` for suspend functions
- ✅ Use `coVerify` for suspend function verification
- ✅ Call `clearAllMocks()` in beforeEach
- ✅ Use `just Runs` for Unit-returning functions
- ✅ Use `returnsArgument 0` when returning input
- ✅ Use `slot<T>()` to capture arguments
- ✅ Use `answers` for complex stubbing logic

**Advanced MockK Patterns:**
```kotlin
describe("advanced MockK patterns") {
    it("should use slot for argument capture") {
        val slot = slot<Entity>()
        coEvery { repo.save(capture(slot)) } returns Unit

        service.create(data)

        val captured = slot.captured
        captured.field shouldBe expectedValue
    }

    it("should use answers for conditional responses") {
        coEvery { repo.findById(any()) } answers {
            val id = firstArg<UUID>()
            if (id == validId) entity else null
        }
    }

    it("should verify call order") {
        service.processWorkflow()

        coVerifyOrder {
            repo.validate(any())
            repo.save(any())
            publisher.publish(any())
        }
    }

    it("should use relaxed mocks when appropriate") {
        val logger = mockk<Logger>(relaxed = true)
        // All calls return defaults, no need to stub
    }
}
```

**Anti-Patterns to Flag:**

❌ **Missing coEvery for suspend functions:**
```kotlin
// ❌ Bad - every instead of coEvery
every { repository.findById(id) } returns entity  // Won't work for suspend
```

❌ **Not clearing mocks:**
```kotlin
// ❌ Bad - state bleeds between tests
class ServiceTest : DescribeSpec({
    val repository = mockk<Repository>()
    // Missing: clearAllMocks() in beforeEach
})
```

❌ **Over-verification:**
```kotlin
// ❌ Bad - verifying internal implementation
it("should call private method") {
    service.publicMethod()
    verify { service["privateMethod"]() }  // Testing internals
}
```

### 4. Table-Driven Tests with Kotest

**Requirement:** Tests with multiple similar scenarios should use forAll/forNone for parameterized testing.

**Verify Pattern:**
```kotlin
describe("validation rules") {
    test("should accept valid inputs") {
        forAll(
            row(Money(10.00), true),
            row(Money(100.50), true),
            row(Money(0.01), true),
            row(Money.ZERO, true)
        ) { amount, expected ->
            validator.isValid(amount) shouldBe expected
        }
    }

    test("should reject invalid inputs") {
        forNone(
            row(Money(-1.00)),
            row(Money(-100.00))
        ) { amount ->
            validator.isValid(amount)  // Should be false
        }
    }
}
```

**Check for Table-Driven Tests:**
```bash
# Find forAll usage
grep -r "forAll(" --include="*Test.kt" | wc -l

# Find forNone usage
grep -r "forNone(" --include="*Test.kt" | wc -l

# Find row usage
grep -r "row(" --include="*Test.kt" | wc -l
```

**When to Use Table-Driven Tests:**
- ✅ Testing multiple input/output combinations
- ✅ Validation logic with various scenarios
- ✅ Edge cases and boundary conditions
- ✅ State transitions
- ✅ Mathematical operations
- ✅ Format/parsing operations

**Complex Table-Driven Example:**
```kotlin
data class TestCase(
    val initialState: State,
    val action: Action,
    val expectedState: State,
    val shouldSucceed: Boolean
)

test("state transitions") {
    forAll(
        row(State.ACTIVE, Action.LOCK, State.LOCKED, true),
        row(State.LOCKED, Action.COMPLETE, State.COMPLETED, true),
        row(State.COMPLETED, Action.LOCK, State.COMPLETED, false)
    ) { initial, action, expected, shouldSucceed ->
        val entity = createEntity(state = initial)

        if (shouldSucceed) {
            val result = entity.transition(action)
            result.state shouldBe expected
        } else {
            shouldThrow<IllegalStateException> {
                entity.transition(action)
            }
        }
    }
}
```

### 5. Testcontainers Integration Tests

**Requirement:** Repository tests must use Testcontainers with real database instances.

**Verify Pattern:**
```kotlin
@Testcontainers
class RepositoryIntegrationTest : DescribeSpec({

    val postgres = PostgreSQLContainer<Nothing>("postgres:15-alpine").apply {
        withDatabaseName("testdb")
        withUsername("test")
        withPassword("test")
    }

    lateinit var dsl: DSLContext
    lateinit var repository: Repository

    beforeSpec {
        postgres.start()

        dsl = DSL.using(
            postgres.jdbcUrl,
            postgres.username,
            postgres.password,
            SQLDialect.POSTGRES
        )

        runMigrations(dsl)
        repository = JooqRepository(dsl)
    }

    afterSpec {
        postgres.stop()
    }

    beforeEach {
        // Clean database before each test
        dsl.deleteFrom(TABLE).execute()
    }

    describe("repository operations") {
        it("should save and retrieve entity") {
            val entity = createTestEntity()

            repository.save(entity)
            val retrieved = repository.findById(entity.id)

            retrieved shouldNotBeNull()
            retrieved?.id shouldBe entity.id
        }
    }
})
```

**Check for Testcontainers Usage:**
```bash
# Find Testcontainers annotation
grep -r "@Testcontainers" --include="*Test.kt"

# Find container declarations
grep -r "PostgreSQLContainer\|MongoDBContainer\|KafkaContainer" --include="*Test.kt"

# Verify container lifecycle
grep -r "beforeSpec.*start()\|afterSpec.*stop()" --include="*Test.kt"
```

**Testcontainers Checklist:**
- ✅ @Testcontainers annotation present
- ✅ Container declared with proper configuration
- ✅ Container started in beforeSpec
- ✅ Container stopped in afterSpec
- ✅ Database cleaned between tests (beforeEach)
- ✅ Migrations run on container start
- ✅ Real database operations tested (not mocked)

**Multi-Container Setup:**
```kotlin
@Testcontainers
class IntegrationTest : DescribeSpec({

    val network = Network.newNetwork()

    val postgres = PostgreSQLContainer<Nothing>("postgres:15-alpine").apply {
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
})
```

**Anti-Patterns to Flag:**

❌ **Not cleaning database between tests:**
```kotlin
// ❌ Bad - tests will interfere with each other
beforeEach {
    // Missing: dsl.deleteFrom(TABLE).execute()
}
```

❌ **Using H2 instead of real database:**
```kotlin
// ❌ Bad - not testing real database behavior
val dataSource = H2DataSource()  // Use Testcontainers instead
```

### 6. Coroutine Testing with runTest

**Requirement:** All tests involving coroutines must use runTest for proper virtual time handling.

**Verify Pattern:**
```kotlin
describe("async operations") {
    it("should handle concurrent operations") = runTest {
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

    it("should handle timeout") = runTest {
        coEvery { slowService.call() } coAnswers {
            delay(5000)
            "result"
        }

        shouldThrow<TimeoutCancellationException> {
            withTimeout(1000) {
                slowService.call()
            }
        }
    }
}
```

**Check for Coroutine Testing:**
```bash
# Find runTest usage
grep -r "= runTest {" --include="*Test.kt" | wc -l

# Find delay usage in tests
grep -r "delay(" --include="*Test.kt"

# Check for advanceUntilIdle usage
grep -r "advanceUntilIdle()" --include="*Test.kt"
```

**Coroutine Testing Best Practices:**
- ✅ Use `runTest` for all coroutine tests
- ✅ Use `advanceUntilIdle()` to advance virtual time
- ✅ Use `currentTime` to verify timing
- ✅ Test timeout scenarios with `withTimeout`
- ✅ Test cancellation with `cancel()`
- ✅ Verify coroutine context propagation

**Advanced Coroutine Testing:**
```kotlin
describe("coroutine timing and cancellation") {
    it("should advance virtual time") = runTest {
        val job = launch {
            delay(1000)
            processTask()
        }

        advanceTimeBy(500)
        job.isActive shouldBe true

        advanceTimeBy(500)
        job.isCompleted shouldBe true
    }

    it("should handle cancellation") = runTest {
        val job = launch {
            try {
                delay(1000)
                processTask()
            } catch (e: CancellationException) {
                cleanup()
                throw e
            }
        }

        advanceTimeBy(500)
        job.cancel()

        coVerify { cleanup() }
    }

    it("should test parallel execution") = runTest {
        val start = currentTime

        val results = coroutineScope {
            listOf(
                async { heavyOperation1() },
                async { heavyOperation2() },
                async { heavyOperation3() }
            ).awaitAll()
        }

        val elapsed = currentTime - start
        elapsed shouldBeLessThan 1000  // Should run in parallel
    }
}
```

**Anti-Patterns to Flag:**

❌ **Using Thread.sleep:**
```kotlin
// ❌ Bad - blocks thread, doesn't work with virtual time
it("should wait for async") {
    service.processAsync()
    Thread.sleep(1000)  // Wrong!
    verify { completed }
}
```

❌ **Not using runTest:**
```kotlin
// ❌ Bad - test completes before coroutine
it("should process") {
    launch {  // Test ends before this completes
        service.process()
    }
}
```

### 7. Ktor Route Testing

**Requirement:** All REST endpoints must have tests using testApplication.

**Verify Pattern:**
```kotlin
class RouteTest : DescribeSpec({
    val service = mockk<Service>()

    beforeEach {
        clearAllMocks()
    }

    describe("GET /v1/resource/{id}") {
        it("should return resource when found") {
            // Given
            val id = UUID.randomUUID()
            coEvery { service.findById(id) } returns testEntity

            testApplication {
                application {
                    configureContentNegotiation()
                    routing {
                        resourceRoutes(service)
                    }
                }

                val client = createClient {
                    install(ContentNegotiation) {
                        json()
                    }
                }

                // When
                val response = client.get("/v1/resource/$id")

                // Then
                response.status shouldBe HttpStatusCode.OK
                val body = response.body<ResourceResponse>()
                body.id shouldBe id.toString()
            }
        }

        it("should return 404 when not found") {
            coEvery { service.findById(any()) } returns null

            testApplication {
                application {
                    configureContentNegotiation()
                    routing {
                        resourceRoutes(service)
                    }
                }

                val response = client.get("/v1/resource/${UUID.randomUUID()}")

                response.status shouldBe HttpStatusCode.NotFound
            }
        }
    }
})
```

**Check for Route Testing:**
```bash
# Find testApplication usage
grep -r "testApplication {" --include="*Test.kt" | wc -l

# Verify HTTP status assertions
grep -r "response.status shouldBe HttpStatusCode" --include="*Test.kt" | wc -l

# Check for route definitions
grep -r "describe(\"GET\|POST\|PUT\|DELETE" --include="*Test.kt"
```

**Route Testing Checklist:**
- ✅ All endpoints have corresponding tests
- ✅ Success cases tested (2xx status codes)
- ✅ Error cases tested (4xx, 5xx status codes)
- ✅ Request body validation tested
- ✅ Response body structure verified
- ✅ Content negotiation tested
- ✅ Authentication/authorization tested (if applicable)

**Complete Route Test Example:**
```kotlin
describe("POST /v1/carts") {
    it("should create cart with valid request") {
        val request = CreateCartRequest(
            customerId = UUID.randomUUID().toString(),
            items = listOf(
                CartItemRequest(
                    recipeId = UUID.randomUUID().toString(),
                    quantity = 2,
                    price = 9.99
                )
            )
        )

        coEvery { service.create(any(), any()) } returns createdCart

        testApplication {
            application {
                configureContentNegotiation()
                routing {
                    cartRoutes(service)
                }
            }

            val client = createClient {
                install(ContentNegotiation) { json() }
            }

            val response = client.post("/v1/carts") {
                contentType(ContentType.Application.Json)
                setBody(request)
            }

            response.status shouldBe HttpStatusCode.Created
            response.headers["Location"] shouldNotBeNull()
        }
    }

    it("should return 400 for invalid request") {
        testApplication {
            application {
                configureContentNegotiation()
                routing {
                    cartRoutes(service)
                }
            }

            val response = client.post("/v1/carts") {
                contentType(ContentType.Application.Json)
                setBody("""{"items": []}""")  // Missing customerId
            }

            response.status shouldBe HttpStatusCode.BadRequest
        }
    }
}
```

### 8. Test Fixtures and Builders

**Requirement:** Tests should use shared fixtures and builder functions for consistent test data creation.

**Verify Pattern:**
```kotlin
// TestFixtures.kt
fun mockCart(
    id: UUID = UUID.randomUUID(),
    customerId: UUID = UUID.randomUUID(),
    items: List<CartItem> = listOf(mockCartItem()),
    state: CartState = CartState.ACTIVE
): Cart = Cart(id, customerId, items, state)

class CartBuilder {
    private var id: UUID = UUID.randomUUID()
    private var items: MutableList<CartItem> = mutableListOf()

    fun withId(id: UUID) = apply { this.id = id }
    fun addItem(item: CartItem) = apply { this.items.add(item) }

    fun build(): Cart = Cart(id, customerId, items, state)
}

fun cart(block: CartBuilder.() -> Unit): Cart =
    CartBuilder().apply(block).build()

// Usage in tests
val testCart = cart {
    withCustomerId(customerId)
    addItem(mockCartItem(recipeName = "Pizza"))
    addItem(mockCartItem(recipeName = "Salad"))
}
```

**Check for Fixtures:**
```bash
# Find test fixture files
find . -name "TestFixtures.kt" -o -name "*Fixtures.kt" -o -name "*TestData.kt"

# Find fixture functions
grep -r "fun mock[A-Z]" --include="*Test*.kt" | wc -l

# Find builder pattern usage
grep -r "class.*Builder" --include="*Test*.kt"
```

**Fixture Checklist:**
- ✅ Shared fixtures defined in separate file
- ✅ Default values provided for all parameters
- ✅ Builder pattern for complex objects
- ✅ Extension functions for fluent API
- ✅ Fixtures used consistently across tests
- ✅ Realistic test data (not "test" or "foo")

### 9. Test Organization and Structure

**Requirement:** Tests must be properly organized by module and follow naming conventions.

**Expected Structure:**
```
module-name/
├── src/
│   ├── main/
│   │   └── kotlin/
│   │       └── com/company/service/
│   └── test/
│       └── kotlin/
│           └── com/company/service/
│               ├── ServiceTest.kt
│               ├── RepositoryIntegrationTest.kt
│               ├── RouteTest.kt
│               └── TestFixtures.kt
```

**Check Test Organization:**
```bash
# Verify test directory structure
find . -type d -name "test/kotlin"

# Check test naming conventions
find . -name "*Test.kt" | grep -v "build/"

# Verify integration test naming
find . -name "*IntegrationTest.kt"

# Check for test resources
find . -path "*/test/resources/*"
```

**Naming Conventions:**
- ✅ Unit tests: `ServiceTest.kt`, `DomainTest.kt`
- ✅ Integration tests: `RepositoryIntegrationTest.kt`
- ✅ API tests: `RouteTest.kt`, `EndpointTest.kt`
- ✅ Fixtures: `TestFixtures.kt` or `TestData.kt`

**Test File Structure:**
```kotlin
// ServiceTest.kt
package com.company.service

import io.kotest.core.spec.style.DescribeSpec

class ServiceTest : DescribeSpec({
    // Setup
    val dependencies = setupDependencies()
    val service = Service(dependencies)

    beforeEach {
        clearAllMocks()
    }

    // Tests grouped by function
    describe("functionA") {
        it("should handle case 1") { }
        it("should handle case 2") { }
    }

    describe("functionB") {
        it("should handle case 1") { }
        it("should handle case 2") { }
    }
})
```

### 10. Kotest Matchers

**Requirement:** Tests must use Kotest matchers instead of JUnit assertions.

**Verify Matcher Usage:**
```kotlin
// ✅ Good - Kotest matchers
result shouldBe expected
result shouldNotBe null
result.shouldBeNull()
result.shouldNotBeNull()
list shouldHaveSize 3
list shouldContain element
list shouldContainAll listOf(a, b)
string shouldStartWith "prefix"
string shouldEndWith "suffix"
number shouldBeGreaterThan 10
number shouldBeLessThan 100
```

**Check for Kotest Matchers:**
```bash
# Find Kotest matcher usage
grep -r "shouldBe\|shouldNotBe\|shouldHaveSize" --include="*Test.kt" | wc -l

# Check for wrong assertions (JUnit/AssertJ)
grep -r "assertEquals\|assertTrue\|assertThat" --include="*Test.kt"
```

**Common Kotest Matchers:**

**Equality:**
```kotlin
result shouldBe expected
result shouldNotBe unexpected
```

**Null checks:**
```kotlin
value.shouldBeNull()
value.shouldNotBeNull()
```

**Collections:**
```kotlin
list shouldHaveSize 3
list shouldBeEmpty()
list shouldContain element
list shouldContainExactly listOf(a, b, c)
list shouldContainAll listOf(a, b)
map shouldContainKey "key"
map shouldContainValue "value"
```

**Exceptions:**
```kotlin
shouldThrow<IllegalArgumentException> {
    service.invalidOperation()
}

shouldThrowAny {
    service.mayFail()
}

shouldNotThrowAny {
    service.safeOperation()
}
```

**Numeric:**
```kotlin
value shouldBeGreaterThan 10
value shouldBeLessThan 100
value shouldBeInRange 1..10
```

**Strings:**
```kotlin
str shouldStartWith "prefix"
str shouldEndWith "suffix"
str shouldContain "substring"
str shouldMatch Regex("\\d+")
```

**Boolean:**
```kotlin
condition.shouldBeTrue()
condition.shouldBeFalse()
```

**Anti-Pattern to Flag:**
```kotlin
// ❌ Bad - mixing assertion libraries
assertEquals(expected, result)  // JUnit
assertThat(result).isEqualTo(expected)  // AssertJ
assertTrue(condition)  // JUnit

// ✅ Good - Kotest matchers
result shouldBe expected
condition.shouldBeTrue()
```

## Verification Workflow

### Step 1: Run All Tests

```bash
# Run all tests
./gradlew test

# Run tests in specific module
./gradlew :module-name:test

# Run tests with logging
./gradlew test --info

# Run tests in parallel
./gradlew test --parallel --max-workers=4
```

**Expected Output:**
```
BUILD SUCCESSFUL in 45s
325 tests completed, 325 passed
```

### Step 2: Check Test Coverage

```bash
# Generate coverage report
./gradlew test jacocoTestReport

# Verify coverage thresholds
./gradlew jacocoTestCoverageVerification

# View HTML report
open build/reports/jacoco/test/html/index.html
```

**Verify:**
- ✅ Overall coverage ≥80%
- ✅ Service layer coverage ≥90%
- ✅ Repository layer coverage ≥85%
- ✅ Domain logic coverage ≥95%
- ✅ No untested critical paths

### Step 3: Verify Test Quality

**Check test files for:**
- ✅ Descriptive test names ("should do something")
- ✅ Given-When-Then structure
- ✅ Proper mock cleanup (clearAllMocks)
- ✅ No commented-out tests
- ✅ No @Disabled without explanation
- ✅ No println debugging statements

**Run Quality Checks:**
```bash
# Find commented-out tests
grep -r "//.*it(\"" --include="*Test.kt"

# Find disabled tests
grep -r "@Disabled\|xdescribe\|xit(" --include="*Test.kt"

# Find debug statements
grep -r "println\|print(" --include="*Test.kt"

# Find tests without assertions
grep -A 10 'it("' --include="*Test.kt" | grep -v "should"
```

### Step 4: Verify Integration Tests

```bash
# Run integration tests specifically
./gradlew integrationTest

# Check for Testcontainers
grep -r "@Testcontainers" --include="*Test.kt"

# Verify database cleanup
grep -r "beforeEach.*delete\|truncate" --include="*Test.kt"
```

**Integration Test Checklist:**
- ✅ Testcontainers used for real dependencies
- ✅ Database cleaned between tests
- ✅ Migrations applied automatically
- ✅ Network configuration for multi-container setups
- ✅ Proper container lifecycle management

### Step 5: Verify Coroutine Testing

```bash
# Check for runTest usage
grep -r "= runTest {" --include="*Test.kt" | wc -l

# Find async operations being tested
grep -r "async\|launch" --include="*Test.kt" | wc -l

# Check for proper timing control
grep -r "advanceUntilIdle\|advanceTimeBy" --include="*Test.kt"
```

### Step 6: Check Test Performance

```bash
# Run tests with timing
./gradlew test --profile

# View performance report
open build/reports/profile/profile-*.html
```

**Performance Thresholds:**
- ✅ Unit tests: <50ms per test
- ✅ Integration tests: <5s per test
- ✅ API tests: <1s per test
- ✅ Total test suite: <2 minutes

**Flag Slow Tests:**
```bash
# Find tests taking longer than 1 second
./gradlew test --info | grep -E "Test.*took [0-9]+\.[0-9]+ secs" | awk '$4 > 1'
```

## Common Test Anti-Patterns to Flag

### ❌ Testing Implementation Details

```kotlin
// ❌ Bad - testing private methods
it("should call internal validation") {
    val service = spyk(Service())

    service.publicMethod()

    verify { service["privateMethod"]() }  // Testing internals
}
```

**Fix:** Test behavior through public API only.

### ❌ Sharing Mutable State

```kotlin
// ❌ Bad - shared mutable state between tests
class ServiceTest : DescribeSpec({
    val sharedCart = mockCart()  // Reused across tests

    it("test 1") {
        sharedCart.addItem(item)  // Mutates shared state
    }

    it("test 2") {
        sharedCart.items shouldHaveSize 0  // Fails due to test 1
    }
})
```

**Fix:** Create fresh instances in each test.

### ❌ Not Using runTest

```kotlin
// ❌ Bad - test completes before coroutine
it("should process async") {
    launch {
        service.process()  // Test ends before this completes
    }
}
```

**Fix:**
```kotlin
// ✅ Good
it("should process async") = runTest {
    service.process()
    advanceUntilIdle()
}
```

### ❌ Over-Mocking

```kotlin
// ❌ Bad - mocking everything including value objects
it("should calculate total") {
    val money1 = mockk<Money>()
    val money2 = mockk<Money>()
    every { money1 + money2 } returns mockk()

    // Testing mocks, not real behavior
}
```

**Fix:** Use real objects for value types, mock only external dependencies.

### ❌ Testing Multiple Concerns

```kotlin
// ❌ Bad - testing too many things
it("should create order and send email and update inventory") {
    val order = service.createOrder(cart)

    order shouldNotBeNull()
    verify { emailService.send(any()) }
    verify { inventoryService.reserve(any()) }
    verify { paymentService.charge(any()) }
}
```

**Fix:** Split into separate focused tests.

### ❌ Ignoring Errors in Tests

```kotlin
// ❌ Bad - ignoring potential errors
it("should process") {
    val result = service.process(input)  // What if this throws?
    result shouldBe expected
}
```

**Fix:**
```kotlin
// ✅ Good
it("should process successfully") {
    shouldNotThrowAny {
        val result = service.process(input)
        result shouldBe expected
    }
}
```

### ❌ Large Monolithic Tests

```kotlin
// ❌ Bad - 200+ line test with everything
it("should test entire user lifecycle") {
    // User registration
    // Email verification
    // Profile update
    // Order creation
    // Payment processing
    // ... 150 more lines
}
```

**Fix:** Break into separate tests with clear focus.

### ❌ Not Testing Error Cases

```kotlin
// ❌ Bad - only happy path
describe("createUser") {
    it("should create user with valid data") {
        // Only tests success case
    }
    // Missing: validation errors, database errors, etc.
}
```

**Fix:** Add error case tests.

### ❌ Brittle Assertions

```kotlin
// ❌ Bad - fragile string comparison
it("should format message") {
    val message = service.formatMessage(user)
    message shouldBe "Welcome, John! Today is 2024-01-15."  // Breaks with any change
}
```

**Fix:** Assert on structure, not exact strings.

### ❌ Flaky Tests

```kotlin
// ❌ Bad - timing-dependent test
it("should complete within time") {
    val start = System.currentTimeMillis()
    service.process()
    val elapsed = System.currentTimeMillis() - start
    elapsed shouldBeLessThan 1000  // Flaky on slow machines
}
```

**Fix:** Use virtual time with runTest.

## Security and Data Verification

### Test Data Safety

**Check for:**
- ✅ No real credentials in test code
- ✅ No production data in test fixtures
- ✅ Sensitive data properly redacted
- ✅ Test databases isolated from production

**Verify:**
```bash
# Check for hardcoded credentials
grep -ri "password.*=.*\"" --include="*Test*.kt"
grep -ri "api[_-]?key.*=.*\"" --include="*Test*.kt"

# Check for production URLs
grep -ri "prod\|production" --include="*Test*.kt"
```

### Input Validation Tests

**Verify:**
- ✅ SQL injection prevention tested
- ✅ XSS prevention tested (if applicable)
- ✅ Path traversal prevention tested
- ✅ Large input handling tested
- ✅ Invalid UUID/ID handling tested

## Checklist Summary

Use this checklist during verification:

### Core Testing Requirements
- [ ] Overall test coverage ≥80%
- [ ] All tests use Kotest specs (DescribeSpec, FunSpec, etc.)
- [ ] All tests follow Given-When-Then structure
- [ ] MockK used for all mocking with proper coEvery/coVerify
- [ ] clearAllMocks() called in beforeEach
- [ ] Table-driven tests used for multiple scenarios
- [ ] All tests pass: `./gradlew test`

### Integration Testing
- [ ] Testcontainers used for all infrastructure dependencies
- [ ] Database cleaned between tests
- [ ] Container lifecycle properly managed
- [ ] Migrations applied automatically
- [ ] No usage of H2 or in-memory databases for integration tests

### Coroutine Testing
- [ ] All coroutine tests use runTest
- [ ] Virtual time used (advanceUntilIdle, advanceTimeBy)
- [ ] Timeout scenarios tested
- [ ] Cancellation tested
- [ ] No Thread.sleep in tests

### API Testing
- [ ] All endpoints have tests
- [ ] testApplication used for Ktor tests
- [ ] HTTP status codes verified
- [ ] Request/response bodies validated
- [ ] Error cases tested (4xx, 5xx)

### Test Quality
- [ ] Kotest matchers used (not JUnit/AssertJ)
- [ ] No commented-out tests
- [ ] No @Disabled without explanation
- [ ] No debug println statements
- [ ] Test fixtures used consistently
- [ ] Tests are independent and isolated

### Organization
- [ ] Tests in proper directory structure
- [ ] Naming conventions followed
- [ ] Test fixtures in separate files
- [ ] Integration tests clearly marked

### Performance
- [ ] Unit tests complete in <50ms each
- [ ] Integration tests complete in <5s each
- [ ] Total suite runs in <2 minutes
- [ ] No flaky tests

## Reporting Verification Results

**Format:**
```markdown
## Testing Verification Report

### Coverage
- Overall: 84% ✅
- Domain Logic: 96% ✅
- Service Layer: 91% ✅
- Repository Layer: 87% ✅
- API Layer: 78% ⚠️ (target: 80%)

### Test Quality
- Kotest DescribeSpec: Yes ✅
- MockK with coEvery/coVerify: Yes ✅
- Table-driven tests: Yes ✅
- Testcontainers: Yes ✅
- runTest for coroutines: Yes ✅
- Kotest matchers: Partial ⚠️ (some JUnit assertions found)

### Test Organization
- Proper directory structure: Yes ✅
- Naming conventions: Yes ✅
- Test fixtures: Yes ✅
- Integration test separation: Yes ✅

### Performance
- Unit test average: 32ms ✅
- Integration test average: 3.2s ✅
- Total suite time: 1m 45s ✅

### Issues Found
1. API layer coverage at 78%, needs 2% more to reach 80%
2. Found 15 JUnit assertions that should use Kotest matchers
3. OrderService missing error case tests for payment failures
4. CartRepositoryIntegrationTest not cleaning database in beforeEach

### Recommendations
1. Add tests for remaining API endpoints (CartController line 145-167)
2. Replace JUnit assertions with Kotest matchers in ServiceTest.kt
3. Add payment failure scenarios to OrderServiceTest.kt
4. Add database cleanup in CartRepositoryIntegrationTest.kt beforeEach block
```

## Related Verifiers

No other verifiers currently defined for this boilerplate.

## See Also

- **implementers/testing.md** - Testing patterns and examples
- **implementers/coroutines.md** - Async testing patterns
- **implementers/domain-modeling.md** - Testing domain entities
- **implementers/rest-api.md** - Testing Ktor routes
- [Kotest Documentation](https://kotest.io/)
- [MockK Documentation](https://mockk.io/)
- [Testcontainers Documentation](https://www.testcontainers.org/)
