---
domain: kotlin-coroutines
description: Verify proper Kotlin Coroutines implementation including structured concurrency, dispatcher usage, error handling, and cancellation patterns
---

# Kotlin Coroutines Verifier

Verify that coroutines follow best practices for structured concurrency, proper dispatcher usage, error handling, and cancellation support.

## Verification Checklist

### 1. Structured Concurrency with coroutineScope

**Requirement:** All concurrent operations must use structured concurrency with `coroutineScope` or `supervisorScope`. Never use `GlobalScope` or unstructured coroutines.

**Verification Steps:**

✅ **Check for GlobalScope usage (anti-pattern):**
```kotlin
// ❌ Incorrect - GlobalScope creates unstructured concurrency
class UserService {
    fun updateUser(userId: String) {
        GlobalScope.launch {  // Leaked coroutine!
            val user = userRepository.findById(userId)
            user?.let { processUser(it) }
        }
    }
}

// ❌ Incorrect - GlobalScope in production code
class NotificationService {
    fun sendNotification(message: String) {
        GlobalScope.launch(Dispatchers.IO) {  // Never completes, no cancellation
            emailService.send(message)
        }
    }
}

// ✅ Correct - structured concurrency with coroutineScope
class UserService(
    private val userRepository: UserRepository,
    private val coroutineScope: CoroutineScope
) {
    suspend fun updateUser(userId: String) = coroutineScope {
        val user = userRepository.findById(userId)
        user?.let { processUser(it) }
    }
}

// ✅ Correct - using injected CoroutineScope
class NotificationService(
    private val emailService: EmailService,
    private val scope: CoroutineScope
) {
    fun sendNotification(message: String) {
        scope.launch {  // Properly scoped, can be cancelled
            emailService.send(message)
        }
    }
}
```

✅ **Check structured concurrency patterns:**
```kotlin
// ✅ Correct - coroutineScope for parallel operations
suspend fun fetchUserData(userId: String): UserData = coroutineScope {
    val userDeferred = async { userRepository.findById(userId) }
    val ordersDeferred = async { orderRepository.findByUserId(userId) }
    val preferencesDeferred = async { preferencesRepository.findByUserId(userId) }

    UserData(
        user = userDeferred.await(),
        orders = ordersDeferred.await(),
        preferences = preferencesDeferred.await()
    )
}

// ✅ Correct - supervisorScope for independent operations
suspend fun processOrders(orderIds: List<String>) = supervisorScope {
    orderIds.map { orderId ->
        async {
            try {
                orderService.process(orderId)
            } catch (e: Exception) {
                logger.error("Failed to process order $orderId", e)
                null
            }
        }
    }.awaitAll()
}

// ❌ Incorrect - no structured concurrency
suspend fun fetchUserData(userId: String): UserData {
    // Launches coroutines without parent scope
    val userJob = launch { userRepository.findById(userId) }  // Won't compile without receiver
    val ordersJob = launch { orderRepository.findByUserId(userId) }

    userJob.join()
    ordersJob.join()
    // Cannot get results!
}

// ❌ Incorrect - using withContext when coroutineScope is needed
suspend fun fetchUserData(userId: String): UserData = withContext(Dispatchers.IO) {
    // This only changes dispatcher, doesn't create structured concurrency
    val user = userRepository.findById(userId)
    val orders = orderRepository.findByUserId(userId)
    UserData(user, orders)  // Sequential, not parallel!
}
```

✅ **Check proper scope injection:**
```kotlin
// ✅ Correct - inject CoroutineScope with lifecycle
@Service
class OrderProcessingService(
    private val orderRepository: OrderRepository,
    @Qualifier("applicationScope") private val scope: CoroutineScope
) {
    fun processOrdersAsync(orderIds: List<String>) {
        scope.launch {
            orderIds.forEach { orderId ->
                try {
                    processOrder(orderId)
                } catch (e: Exception) {
                    logger.error("Failed to process order $orderId", e)
                }
            }
        }
    }

    private suspend fun processOrder(orderId: String) {
        // Processing logic
    }
}

// ✅ Correct - custom scope with SupervisorJob
@Configuration
class CoroutineConfiguration {
    @Bean
    fun applicationScope(): CoroutineScope {
        return CoroutineScope(SupervisorJob() + Dispatchers.Default)
    }

    @PreDestroy
    fun cleanup() {
        applicationScope().cancel()
    }
}

// ❌ Incorrect - creating scope in function
class OrderService {
    fun processOrders() {
        val scope = CoroutineScope(Dispatchers.Default)  // Never cancelled!
        scope.launch {
            // Process orders
        }
    }
}

// ❌ Incorrect - no lifecycle management
@Service
class UserService {
    private val scope = CoroutineScope(Dispatchers.Default)  // Leaks on shutdown

    fun updateUsers() {
        scope.launch {
            // Update logic
        }
    }
}
```

**How to Verify:**
```bash
# Check for GlobalScope usage (should be ZERO in production code)
grep -r "GlobalScope" src/main/ --include="*.kt"

# Find coroutineScope usage (should be present)
grep -r "coroutineScope\|supervisorScope" src/main/ --include="*.kt"

# Check for CoroutineScope injection
grep -r "CoroutineScope" src/main/ --include="*.kt" | grep -E "val|var"

# Find async usage without parent scope
grep -r "async\s*{" src/main/ --include="*.kt"

# Check for proper scope configuration
grep -r "@Bean.*CoroutineScope\|@Component.*CoroutineScope" src/main/ --include="*.kt"
```

**Expected Result:**
- Zero `GlobalScope` usages in production code
- All concurrent operations use `coroutineScope` or `supervisorScope`
- `CoroutineScope` properly injected and lifecycle-managed
- No orphaned coroutines that can't be cancelled
- Parent-child coroutine relationships properly established

---

### 2. Proper Dispatcher Usage

**Requirement:** Use appropriate dispatchers for different types of work: `Dispatchers.IO` for blocking I/O, `Dispatchers.Default` for CPU-intensive work, `Dispatchers.Main` for UI updates (Android).

**Verification Steps:**

✅ **Check Dispatchers.IO for blocking operations:**
```kotlin
// ✅ Correct - Dispatchers.IO for database operations
class UserRepository(private val database: Database) {
    suspend fun findById(id: String): User? = withContext(Dispatchers.IO) {
        database.query("SELECT * FROM users WHERE id = ?", id)
            .executeAsList()
            .firstOrNull()
            ?.toUser()
    }

    suspend fun save(user: User): Unit = withContext(Dispatchers.IO) {
        database.execute(
            "INSERT INTO users (id, name, email) VALUES (?, ?, ?)",
            user.id, user.name, user.email
        )
    }
}

// ✅ Correct - Dispatchers.IO for file operations
class FileStorageService {
    suspend fun readFile(path: String): String = withContext(Dispatchers.IO) {
        File(path).readText()
    }

    suspend fun writeFile(path: String, content: String) = withContext(Dispatchers.IO) {
        File(path).writeText(content)
    }
}

// ✅ Correct - Dispatchers.IO for HTTP client calls
class ExternalApiClient(private val httpClient: HttpClient) {
    suspend fun fetchUser(userId: String): User = withContext(Dispatchers.IO) {
        httpClient.get("https://api.example.com/users/$userId")
            .body<User>()
    }
}

// ❌ Incorrect - no dispatcher for blocking operation
class UserRepository(private val database: Database) {
    suspend fun findById(id: String): User? {
        return database.query("SELECT * FROM users WHERE id = ?", id)
            .executeAsList()  // Blocking call without Dispatchers.IO!
            .firstOrNull()
            ?.toUser()
    }
}

// ❌ Incorrect - Default dispatcher for I/O operation
class FileService {
    suspend fun readFile(path: String): String = withContext(Dispatchers.Default) {
        File(path).readText()  // Wrong dispatcher for I/O!
    }
}
```

✅ **Check Dispatchers.Default for CPU-intensive work:**
```kotlin
// ✅ Correct - Dispatchers.Default for CPU-bound operations
class DataProcessor {
    suspend fun processLargeDataset(data: List<Record>): ProcessedData =
        withContext(Dispatchers.Default) {
            data.map { record ->
                // Complex computation
                computeStatistics(record)
            }.reduce { acc, stats ->
                acc.merge(stats)
            }
        }

    suspend fun compressData(data: ByteArray): ByteArray =
        withContext(Dispatchers.Default) {
            Gzip.compress(data)
        }
}

// ✅ Correct - Dispatchers.Default for parallel computation
class ImageProcessor {
    suspend fun processImages(images: List<Image>): List<ProcessedImage> =
        withContext(Dispatchers.Default) {
            images.map { image ->
                async {
                    applyFilters(image)
                    resize(image)
                    optimize(image)
                }
            }.awaitAll()
        }
}

// ❌ Incorrect - IO dispatcher for CPU-intensive work
class DataProcessor {
    suspend fun processLargeDataset(data: List<Record>) =
        withContext(Dispatchers.IO) {  // Wrong! This is CPU-bound, not I/O
            data.map { record ->
                computeStatistics(record)
            }.reduce { acc, stats -> acc.merge(stats) }
        }
}

// ❌ Incorrect - no dispatcher for CPU-intensive work
class EncryptionService {
    suspend fun encrypt(data: String): String {
        return AES.encrypt(data)  // CPU-intensive without proper dispatcher
    }
}
```

✅ **Check dispatcher doesn't override when unnecessary:**
```kotlin
// ✅ Correct - no dispatcher override for suspend functions
class UserService(
    private val userRepository: UserRepository  // Already uses Dispatchers.IO
) {
    suspend fun getUser(id: String): User? {
        return userRepository.findById(id)  // Let repository handle dispatcher
    }
}

// ✅ Correct - dispatcher only at boundary
class OrderController(private val orderService: OrderService) {
    suspend fun getOrder(id: String): OrderResponse = coroutineScope {
        val order = orderService.findById(id)  // Service/repo handle dispatchers
        OrderResponse.from(order)
    }
}

// ❌ Incorrect - redundant dispatcher override
class UserService(private val userRepository: UserRepository) {
    suspend fun getUser(id: String): User? = withContext(Dispatchers.IO) {
        userRepository.findById(id)  // Already using Dispatchers.IO internally!
    }
}

// ❌ Incorrect - dispatcher switching everywhere
class OrderService(
    private val orderRepository: OrderRepository,
    private val userRepository: UserRepository
) {
    suspend fun processOrder(orderId: String) = withContext(Dispatchers.IO) {
        val order = withContext(Dispatchers.IO) {  // Redundant!
            orderRepository.findById(orderId)
        }
        val user = withContext(Dispatchers.IO) {  // Redundant!
            userRepository.findById(order.userId)
        }
        // Process order
    }
}
```

✅ **Check custom dispatcher configuration:**
```kotlin
// ✅ Correct - custom dispatcher for specific workload
@Configuration
class DispatcherConfiguration {
    @Bean
    fun databaseDispatcher(): CoroutineDispatcher {
        return Executors.newFixedThreadPool(10) { Thread(it, "db-pool") }
            .asCoroutineDispatcher()
    }

    @Bean
    fun externalApiDispatcher(): CoroutineDispatcher {
        return Executors.newFixedThreadPool(20) { Thread(it, "api-pool") }
            .asCoroutineDispatcher()
    }
}

@Repository
class UserRepository(
    @Qualifier("databaseDispatcher") private val dbDispatcher: CoroutineDispatcher
) {
    suspend fun findById(id: String): User? = withContext(dbDispatcher) {
        database.queryForObject("SELECT * FROM users WHERE id = ?", id)
    }
}

// ❌ Incorrect - creating dispatcher in function
class UserRepository {
    suspend fun findById(id: String): User? {
        val dispatcher = Executors.newSingleThreadExecutor()
            .asCoroutineDispatcher()  // Creates new thread pool every call!
        return withContext(dispatcher) {
            database.query(id)
        }
    }
}
```

**How to Verify:**
```bash
# Check Dispatchers.IO for I/O operations
grep -r "Dispatchers.IO" src/main/ --include="*.kt"

# Check Dispatchers.Default for CPU-bound operations
grep -r "Dispatchers.Default" src/main/ --include="*.kt"

# Find withContext usage
grep -r "withContext" src/main/ --include="*.kt"

# Find database operations without dispatcher
grep -r "database\.\|jdbc\.\|query\.\|execute\." src/main/ --include="*.kt" -A 2 | grep -v "Dispatchers.IO"

# Check for custom dispatcher configuration
grep -r "@Bean.*Dispatcher\|asCoroutineDispatcher" src/main/ --include="*.kt"
```

**Expected Result:**
- All blocking I/O uses `Dispatchers.IO`
- CPU-intensive work uses `Dispatchers.Default`
- No redundant dispatcher switching
- Custom dispatchers properly configured and injected
- Database/file/network operations properly dispatched

---

### 3. Suspend Functions vs Blocking Functions

**Requirement:** Use suspend functions for asynchronous operations. Never use `runBlocking` in production code except in main() or test code.

**Verification Steps:**

✅ **Check suspend function usage:**
```kotlin
// ✅ Correct - suspend functions for async operations
class UserService(private val userRepository: UserRepository) {
    suspend fun getUser(id: String): User? {
        return userRepository.findById(id)
    }

    suspend fun createUser(user: User): User {
        return userRepository.save(user)
    }

    suspend fun updateUser(user: User): User {
        val existing = userRepository.findById(user.id)
            ?: throw NotFoundException("User not found")
        return userRepository.update(user)
    }
}

// ✅ Correct - suspend functions in controller
@RestController
@RequestMapping("/api/users")
class UserController(private val userService: UserService) {
    @GetMapping("/{id}")
    suspend fun getUser(@PathVariable id: String): ResponseEntity<UserResponse> {
        val user = userService.getUser(id)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(UserResponse.from(user))
    }

    @PostMapping
    suspend fun createUser(@RequestBody request: CreateUserRequest): ResponseEntity<UserResponse> {
        val user = userService.createUser(request.toUser())
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(UserResponse.from(user))
    }
}

// ❌ Incorrect - using runBlocking in service
class UserService(private val userRepository: UserRepository) {
    fun getUser(id: String): User? = runBlocking {  // Blocks thread!
        userRepository.findById(id)
    }
}

// ❌ Incorrect - runBlocking in controller
@RestController
class UserController(private val userService: UserService) {
    @GetMapping("/{id}")
    fun getUser(@PathVariable id: String): ResponseEntity<UserResponse> = runBlocking {
        val user = userService.getUser(id)  // Blocks request thread!
        ResponseEntity.ok(UserResponse.from(user))
    }
}
```

✅ **Check runBlocking is only in main() or tests:**
```kotlin
// ✅ Correct - runBlocking only in main()
fun main() = runBlocking {
    val application = SpringApplication(Application::class.java)
    application.run()

    // Await shutdown
    Runtime.getRuntime().addShutdownHook(Thread {
        runBlocking {
            // Cleanup
        }
    })
}

// ✅ Correct - runBlocking in test
class UserServiceTest {
    @Test
    fun `should create user successfully`() = runBlocking {
        val user = User(id = "123", name = "John")
        val result = userService.createUser(user)

        assertEquals("123", result.id)
        assertEquals("John", result.name)
    }
}

// ❌ Incorrect - runBlocking in business logic
class OrderProcessor {
    fun processOrder(orderId: String) {
        runBlocking {  // Blocking production code!
            val order = orderRepository.findById(orderId)
            processOrderItems(order.items)
        }
    }
}

// ❌ Incorrect - runBlocking in scheduled task
@Scheduled(fixedRate = 60000)
fun cleanupExpiredOrders() {
    runBlocking {  // Blocks scheduler thread!
        orderRepository.deleteExpired()
    }
}
```

✅ **Check async function calls are awaited:**
```kotlin
// ✅ Correct - properly awaiting async results
suspend fun processOrderWithValidation(orderId: String): Order = coroutineScope {
    val orderDeferred = async { orderRepository.findById(orderId) }
    val validationDeferred = async { validationService.validate(orderId) }

    val order = orderDeferred.await()
    val validation = validationDeferred.await()

    if (!validation.isValid) {
        throw ValidationException(validation.errors)
    }

    order
}

// ✅ Correct - awaitAll for multiple async operations
suspend fun processOrders(orderIds: List<String>): List<Order> = coroutineScope {
    orderIds.map { orderId ->
        async { orderRepository.findById(orderId) }
    }.awaitAll()
}

// ❌ Incorrect - not awaiting async results
suspend fun processOrder(orderId: String): Order = coroutineScope {
    async { orderRepository.findById(orderId) }  // Returns Deferred, not Order!
    // Missing .await()
}

// ❌ Incorrect - fire-and-forget async (lost result)
suspend fun updateUsers(userIds: List<String>) = coroutineScope {
    userIds.forEach { userId ->
        async {  // Result is lost!
            userRepository.update(userId)
        }
    }
    // async jobs continue after function returns
}
```

**How to Verify:**
```bash
# Find runBlocking usage in production code (should only be in main() or Application.kt)
grep -r "runBlocking" src/main/ --include="*.kt" | grep -v "Application.kt" | grep -v "main()"

# Check for suspend functions
grep -r "suspend fun" src/main/ --include="*.kt" | wc -l

# Find async without await
grep -r "async\s*{" src/main/ --include="*.kt" -A 5 | grep -v "await()"

# Check for blocking calls in suspend functions
grep -r "suspend fun" src/main/ --include="*.kt" -A 10 | grep "Thread.sleep\|.get()\|.block()"
```

**Expected Result:**
- All asynchronous operations use suspend functions
- `runBlocking` only in main() or test code
- All `async` calls properly awaited with `.await()` or `.awaitAll()`
- No blocking calls (Thread.sleep, .get(), .block()) in suspend functions

---

### 4. Error Handling in Coroutines

**Requirement:** Properly handle exceptions in coroutines using try-catch, CoroutineExceptionHandler, or supervisorScope for independent failures.

**Verification Steps:**

✅ **Check exception handling in coroutines:**
```kotlin
// ✅ Correct - try-catch in suspend function
class UserService(private val userRepository: UserRepository) {
    suspend fun getUser(id: String): Result<User> = try {
        val user = userRepository.findById(id)
            ?: return Result.failure(NotFoundException("User not found"))
        Result.success(user)
    } catch (e: Exception) {
        logger.error("Failed to get user $id", e)
        Result.failure(e)
    }
}

// ✅ Correct - try-catch in async operations
suspend fun fetchUserData(userId: String): UserData = coroutineScope {
    val userDeferred = async {
        try {
            userRepository.findById(userId)
        } catch (e: Exception) {
            logger.error("Failed to fetch user", e)
            null
        }
    }

    val ordersDeferred = async {
        try {
            orderRepository.findByUserId(userId)
        } catch (e: Exception) {
            logger.error("Failed to fetch orders", e)
            emptyList()
        }
    }

    UserData(
        user = userDeferred.await(),
        orders = ordersDeferred.await()
    )
}

// ❌ Incorrect - no exception handling
class UserService(private val userRepository: UserRepository) {
    suspend fun getUser(id: String): User {
        return userRepository.findById(id)  // Exception propagates unhandled
    }
}

// ❌ Incorrect - swallowing exceptions
suspend fun processOrders(orderIds: List<String>) = coroutineScope {
    orderIds.forEach { orderId ->
        launch {
            try {
                orderService.process(orderId)
            } catch (e: Exception) {
                // Swallowed! No logging, no recovery
            }
        }
    }
}
```

✅ **Check CoroutineExceptionHandler usage:**
```kotlin
// ✅ Correct - CoroutineExceptionHandler for global handling
@Configuration
class CoroutineConfiguration {
    @Bean
    fun coroutineExceptionHandler(): CoroutineExceptionHandler {
        return CoroutineExceptionHandler { context, exception ->
            logger.error("Uncaught coroutine exception in $context", exception)
            // Send to error tracking service
            errorTracker.captureException(exception)
        }
    }

    @Bean
    fun applicationScope(
        exceptionHandler: CoroutineExceptionHandler
    ): CoroutineScope {
        return CoroutineScope(
            SupervisorJob() +
            Dispatchers.Default +
            exceptionHandler
        )
    }
}

// ✅ Correct - exception handler for background jobs
class NotificationService(
    private val scope: CoroutineScope,
    private val exceptionHandler: CoroutineExceptionHandler
) {
    fun sendNotificationAsync(message: String) {
        scope.launch(exceptionHandler) {
            try {
                emailService.send(message)
            } catch (e: Exception) {
                logger.error("Failed to send notification", e)
                throw e  // Re-throw to exception handler
            }
        }
    }
}

// ❌ Incorrect - no exception handler for background jobs
class NotificationService(private val scope: CoroutineScope) {
    fun sendNotificationAsync(message: String) {
        scope.launch {
            emailService.send(message)  // Exceptions lost!
        }
    }
}
```

✅ **Check supervisorScope for independent operations:**
```kotlin
// ✅ Correct - supervisorScope for independent tasks
suspend fun processAllOrders(orderIds: List<String>): ProcessingResult = supervisorScope {
    val results = orderIds.map { orderId ->
        async {
            try {
                orderService.process(orderId)
                ProcessingStatus.Success(orderId)
            } catch (e: Exception) {
                logger.error("Failed to process order $orderId", e)
                ProcessingStatus.Failed(orderId, e)
            }
        }
    }.awaitAll()

    ProcessingResult(
        successful = results.filterIsInstance<ProcessingStatus.Success>(),
        failed = results.filterIsInstance<ProcessingStatus.Failed>()
    )
}

// ✅ Correct - supervisorScope prevents cascading failures
suspend fun fetchAllUserData(userIds: List<String>): List<UserData> = supervisorScope {
    userIds.map { userId ->
        async {
            try {
                userService.getUserData(userId)
            } catch (e: Exception) {
                logger.warn("Failed to fetch user $userId", e)
                null
            }
        }
    }.awaitAll().filterNotNull()
}

// ❌ Incorrect - coroutineScope causes cascading failure
suspend fun processOrders(orderIds: List<String>) = coroutineScope {
    orderIds.map { orderId ->
        async {
            orderService.process(orderId)  // One failure cancels all!
        }
    }.awaitAll()
}

// ❌ Incorrect - no error recovery
suspend fun fetchUserData(userIds: List<String>) = coroutineScope {
    userIds.map { userId ->
        async {
            userService.getUserData(userId)  // One failure fails entire batch
        }
    }.awaitAll()
}
```

✅ **Check proper error propagation:**
```kotlin
// ✅ Correct - errors wrapped with context
class OrderService(private val orderRepository: OrderRepository) {
    suspend fun processOrder(orderId: String): Order = try {
        val order = orderRepository.findById(orderId)
            ?: throw NotFoundException("Order $orderId not found")

        validateOrder(order)
        processOrderItems(order)
        updateOrderStatus(order)

        order
    } catch (e: NotFoundException) {
        logger.warn("Order not found: $orderId")
        throw e
    } catch (e: ValidationException) {
        logger.warn("Order validation failed: $orderId", e)
        throw OrderProcessingException("Validation failed for order $orderId", e)
    } catch (e: Exception) {
        logger.error("Failed to process order $orderId", e)
        throw OrderProcessingException("Failed to process order $orderId", e)
    }
}

// ✅ Correct - Result type for error handling
class UserService {
    suspend fun getUser(id: String): Result<User> = withContext(Dispatchers.IO) {
        runCatching {
            userRepository.findById(id)
                ?: throw NotFoundException("User not found")
        }.onFailure { e ->
            logger.error("Failed to get user $id", e)
        }
    }
}

// ❌ Incorrect - catching Exception and not re-throwing
class OrderService {
    suspend fun processOrder(orderId: String): Order? = try {
        orderRepository.findById(orderId)
    } catch (e: Exception) {
        logger.error("Error", e)
        null  // Loses error information!
    }
}
```

**How to Verify:**
```bash
# Find coroutines without error handling
grep -r "launch\s*{" src/main/ --include="*.kt" -A 5 | grep -v "try\|catch"

# Check for CoroutineExceptionHandler
grep -r "CoroutineExceptionHandler" src/main/ --include="*.kt"

# Find supervisorScope usage
grep -r "supervisorScope" src/main/ --include="*.kt"

# Check for swallowed exceptions
grep -r "catch.*Exception" src/main/ --include="*.kt" -A 2 | grep -E "^\s*}\s*$"

# Find Result type usage
grep -r "Result<" src/main/ --include="*.kt"
```

**Expected Result:**
- All coroutines have proper error handling
- `CoroutineExceptionHandler` configured for global error handling
- `supervisorScope` used for independent operations
- Exceptions properly logged with context
- No swallowed exceptions without logging
- Errors wrapped with domain context

---

### 5. Cancellation Handling

**Requirement:** Coroutines must properly handle cancellation. Check for cancellation in long-running operations and clean up resources on cancellation.

**Verification Steps:**

✅ **Check cancellation-aware code:**
```kotlin
// ✅ Correct - checking isActive in loop
suspend fun processLargeDataset(items: List<Item>) = withContext(Dispatchers.Default) {
    items.forEach { item ->
        ensureActive()  // Throws CancellationException if cancelled
        processItem(item)
    }
}

// ✅ Correct - using yield() for cancellation checks
suspend fun calculateStatistics(data: List<Record>): Statistics =
    withContext(Dispatchers.Default) {
        var sum = 0.0
        var count = 0

        data.forEach { record ->
            yield()  // Check for cancellation and allow other coroutines to run
            sum += record.value
            count++
        }

        Statistics(sum / count)
    }

// ✅ Correct - cancellable suspending operations
suspend fun downloadFile(url: String, destination: File) = withContext(Dispatchers.IO) {
    val connection = URL(url).openConnection()

    try {
        connection.inputStream.use { input ->
            destination.outputStream().use { output ->
                val buffer = ByteArray(8192)
                var bytesRead: Int

                while (isActive && input.read(buffer).also { bytesRead = it } != -1) {
                    output.write(buffer, 0, bytesRead)
                }
            }
        }
    } catch (e: CancellationException) {
        destination.delete()  // Cleanup on cancellation
        throw e
    }
}

// ❌ Incorrect - no cancellation checks
suspend fun processLargeDataset(items: List<Item>) = withContext(Dispatchers.Default) {
    items.forEach { item ->
        processItem(item)  // Never checks for cancellation!
    }
}

// ❌ Incorrect - blocking loop without cancellation
suspend fun pollForUpdates() = withContext(Dispatchers.IO) {
    while (true) {  // Never checks isActive
        Thread.sleep(1000)
        checkForUpdates()
    }
}
```

✅ **Check proper resource cleanup on cancellation:**
```kotlin
// ✅ Correct - using finally for cleanup
suspend fun processWithCleanup(orderId: String) {
    var resource: Resource? = null
    try {
        resource = acquireResource()
        processOrder(orderId, resource)
    } finally {
        resource?.close()  // Cleanup even on cancellation
    }
}

// ✅ Correct - using use() for auto-cleanup
suspend fun processFile(path: String) = withContext(Dispatchers.IO) {
    File(path).inputStream().use { input ->
        processInputStream(input)
    }  // Automatically closed even on cancellation
}

// ✅ Correct - invokeOnCompletion for cleanup
class DatabaseConnection {
    private var connection: Connection? = null

    suspend fun execute(query: String) = coroutineScope {
        connection = openConnection()

        // Register cleanup handler
        currentCoroutineContext().job.invokeOnCompletion { cause ->
            if (cause is CancellationException) {
                logger.info("Query cancelled, closing connection")
            }
            connection?.close()
        }

        connection!!.executeQuery(query)
    }
}

// ❌ Incorrect - no cleanup on cancellation
suspend fun processFile(path: String) {
    val file = File(path).inputStream()
    processInputStream(file)
    file.close()  // Never reached if cancelled!
}

// ❌ Incorrect - swallowing cancellation
suspend fun processOrders(orderIds: List<String>) {
    try {
        orderIds.forEach { processOrder(it) }
    } catch (e: Exception) {
        logger.error("Error", e)  // Catches CancellationException!
    }
}
```

✅ **Check cancellation propagation:**
```kotlin
// ✅ Correct - re-throwing CancellationException
suspend fun processOrder(orderId: String) {
    try {
        val order = orderRepository.findById(orderId)
        validateOrder(order)
        saveOrder(order)
    } catch (e: CancellationException) {
        logger.info("Order processing cancelled: $orderId")
        throw e  // Must re-throw!
    } catch (e: Exception) {
        logger.error("Failed to process order $orderId", e)
        throw e
    }
}

// ✅ Correct - specific exception types
suspend fun fetchData(id: String): Data {
    try {
        return dataRepository.fetch(id)
    } catch (e: IOException) {
        logger.error("IO error fetching data", e)
        throw DataFetchException(e)
    } catch (e: TimeoutException) {
        logger.warn("Timeout fetching data", e)
        throw DataFetchException(e)
    }
    // CancellationException propagates automatically
}

// ❌ Incorrect - catching CancellationException
suspend fun processOrder(orderId: String) {
    try {
        val order = orderRepository.findById(orderId)
        saveOrder(order)
    } catch (e: Exception) {  // Catches CancellationException!
        logger.error("Error", e)
        // CancellationException not re-thrown!
    }
}

// ❌ Incorrect - converting cancellation to null
suspend fun getData(id: String): Data? = try {
    dataRepository.fetch(id)
} catch (e: Exception) {
    null  // CancellationException converted to null!
}
```

✅ **Check timeout handling:**
```kotlin
// ✅ Correct - using withTimeout
suspend fun fetchWithTimeout(url: String): Response = withTimeout(5000) {
    httpClient.get(url)
}

// ✅ Correct - withTimeoutOrNull for optional timeout
suspend fun fetchOrNull(url: String): Response? = withTimeoutOrNull(3000) {
    httpClient.get(url)
}

// ✅ Correct - timeout in configuration
suspend fun processOrder(orderId: String) = withTimeout(30.seconds) {
    val order = orderRepository.findById(orderId)
    validateOrder(order)
    processOrderItems(order)
    saveOrder(order)
}

// ❌ Incorrect - Thread.sleep instead of delay
suspend fun retryWithBackoff(operation: suspend () -> Unit) {
    repeat(3) { attempt ->
        try {
            operation()
            return
        } catch (e: Exception) {
            Thread.sleep(1000L * attempt)  // Not cancellable!
        }
    }
}

// ✅ Correct - delay for cancellable waiting
suspend fun retryWithBackoff(operation: suspend () -> Unit) {
    repeat(3) { attempt ->
        try {
            operation()
            return
        } catch (e: Exception) {
            delay(1000L * attempt)  // Cancellable!
        }
    }
}
```

**How to Verify:**
```bash
# Find long-running operations without cancellation checks
grep -r "while.*true\|forEach\|repeat" src/main/ --include="*.kt" -A 5 | grep -v "isActive\|ensureActive\|yield"

# Check for CancellationException handling
grep -r "CancellationException" src/main/ --include="*.kt"

# Find catch blocks that might swallow cancellation
grep -r "catch.*Exception" src/main/ --include="*.kt" -A 3 | grep -v "CancellationException\|throw"

# Check for finally blocks (cleanup)
grep -r "finally\s*{" src/main/ --include="*.kt"

# Find withTimeout usage
grep -r "withTimeout\|withTimeoutOrNull" src/main/ --include="*.kt"

# Check for Thread.sleep (should use delay instead)
grep -r "Thread.sleep" src/main/ --include="*.kt"

# Find delay usage (correct for cancellable waiting)
grep -r "delay(" src/main/ --include="*.kt"
```

**Expected Result:**
- Long-running operations check `isActive` or use `yield()`
- Resources cleaned up in `finally` blocks or with `use()`
- `CancellationException` never caught and swallowed
- Timeouts use `withTimeout` or `withTimeoutOrNull`
- No `Thread.sleep` in coroutines (use `delay` instead)
- Cleanup handlers registered with `invokeOnCompletion`

---

## Testing Verification

### Unit Tests for Coroutines

```kotlin
// ✅ Correct - testing suspend functions
@Test
fun `should fetch user successfully`() = runBlocking {
    val userId = "123"
    val expected = User(userId, "John Doe")

    coEvery { userRepository.findById(userId) } returns expected

    val result = userService.getUser(userId)

    assertEquals(expected, result)
    coVerify { userRepository.findById(userId) }
}

// ✅ Correct - testing error handling
@Test
fun `should handle repository error`() = runBlocking {
    val userId = "123"

    coEvery { userRepository.findById(userId) } throws DatabaseException("Connection failed")

    val exception = assertThrows<ServiceException> {
        userService.getUser(userId)
    }

    assertTrue(exception.message!!.contains("Connection failed"))
}

// ✅ Correct - testing cancellation
@Test
fun `should handle cancellation gracefully`() = runBlocking {
    val job = launch {
        userService.processLargeDataset(generateLargeDataset())
    }

    delay(100)  // Let it start
    job.cancelAndJoin()

    assertTrue(job.isCancelled)
}

// ✅ Correct - testing with TestDispatcher
@Test
fun `should process orders in parallel`() = runTest {
    val orderIds = listOf("1", "2", "3")

    orderIds.forEach { orderId ->
        coEvery { orderRepository.findById(orderId) } returns Order(orderId)
    }

    val results = orderService.processOrders(orderIds)

    assertEquals(3, results.size)
    coVerify(exactly = 3) { orderRepository.findById(any()) }
}
```

### Testing Structured Concurrency

```kotlin
@Test
fun `should cancel child coroutines when parent is cancelled`() = runTest {
    var childExecuted = false

    val parentJob = launch {
        launch {
            delay(1000)
            childExecuted = true
        }
    }

    delay(100)
    parentJob.cancelAndJoin()

    assertFalse(childExecuted)
}

@Test
fun `supervisorScope should not cancel siblings on failure`() = runTest {
    val results = mutableListOf<String>()

    supervisorScope {
        launch {
            delay(50)
            results.add("first")
        }

        launch {
            throw RuntimeException("Error")
        }

        launch {
            delay(100)
            results.add("third")
        }
    }

    assertEquals(listOf("first", "third"), results)
}
```

### Testing Dispatcher Usage

```kotlin
@Test
fun `should use Dispatchers_IO for database operations`() = runTest {
    val dispatcher = Executors.newSingleThreadExecutor()
        .asCoroutineDispatcher()

    var executedOn: String? = null

    withContext(Dispatchers.IO) {
        executedOn = Thread.currentThread().name
    }

    assertTrue(executedOn!!.contains("DefaultDispatcher-worker"))
}

@Test
fun `should use Dispatchers_Default for CPU-bound work`() = runTest {
    var executedOn: String? = null

    withContext(Dispatchers.Default) {
        executedOn = Thread.currentThread().name
    }

    assertTrue(executedOn!!.contains("DefaultDispatcher-worker"))
}
```

---

## Common Issues and Fixes

### Issue 1: GlobalScope Usage

**Problem:**
```kotlin
class NotificationService {
    fun sendNotification(message: String) {
        GlobalScope.launch {
            emailService.send(message)
        }
    }
}
```

**Fix:**
```kotlin
class NotificationService(private val scope: CoroutineScope) {
    fun sendNotification(message: String) {
        scope.launch {
            emailService.send(message)
        }
    }
}
```

### Issue 2: runBlocking in Production Code

**Problem:**
```kotlin
@GetMapping("/{id}")
fun getUser(@PathVariable id: String): User = runBlocking {
    userService.getUser(id)
}
```

**Fix:**
```kotlin
@GetMapping("/{id}")
suspend fun getUser(@PathVariable id: String): User {
    return userService.getUser(id)
}
```

### Issue 3: Wrong Dispatcher for Operation

**Problem:**
```kotlin
suspend fun saveToDatabase(data: Data) = withContext(Dispatchers.Default) {
    database.save(data)  // I/O operation on CPU dispatcher!
}
```

**Fix:**
```kotlin
suspend fun saveToDatabase(data: Data) = withContext(Dispatchers.IO) {
    database.save(data)
}
```

### Issue 4: Not Handling Cancellation

**Problem:**
```kotlin
suspend fun processItems(items: List<Item>) {
    items.forEach { item ->
        processItem(item)  // Never checks for cancellation
    }
}
```

**Fix:**
```kotlin
suspend fun processItems(items: List<Item>) {
    items.forEach { item ->
        ensureActive()  // Throws if cancelled
        processItem(item)
    }
}
```

### Issue 5: Swallowing CancellationException

**Problem:**
```kotlin
suspend fun fetchData(id: String): Data? = try {
    dataRepository.fetch(id)
} catch (e: Exception) {
    null  // Catches CancellationException!
}
```

**Fix:**
```kotlin
suspend fun fetchData(id: String): Data? = try {
    dataRepository.fetch(id)
} catch (e: CancellationException) {
    throw e  // Re-throw cancellation
} catch (e: Exception) {
    logger.error("Failed to fetch data", e)
    null
}
```

### Issue 6: Thread.sleep Instead of delay

**Problem:**
```kotlin
suspend fun retryOperation() {
    repeat(3) {
        try {
            performOperation()
            return
        } catch (e: Exception) {
            Thread.sleep(1000)  // Not cancellable!
        }
    }
}
```

**Fix:**
```kotlin
suspend fun retryOperation() {
    repeat(3) {
        try {
            performOperation()
            return
        } catch (e: Exception) {
            delay(1000)  // Cancellable suspension
        }
    }
}
```

---

## Verification Summary

**Before marking implementation as complete, verify:**

- [ ] Zero `GlobalScope` usage in production code
- [ ] All concurrent operations use `coroutineScope` or `supervisorScope`
- [ ] `CoroutineScope` properly injected and lifecycle-managed
- [ ] `Dispatchers.IO` used for all blocking I/O operations
- [ ] `Dispatchers.Default` used for CPU-intensive work
- [ ] Custom dispatchers properly configured if needed
- [ ] No `runBlocking` in production code (only main() and tests)
- [ ] All async operations properly awaited
- [ ] Try-catch blocks in all coroutines
- [ ] `CoroutineExceptionHandler` configured globally
- [ ] `supervisorScope` used for independent operations
- [ ] No swallowed exceptions without logging
- [ ] Long-running operations check `isActive` or use `yield()`
- [ ] Resources cleaned up with `finally` or `use()`
- [ ] `CancellationException` never caught without re-throwing
- [ ] Timeouts use `withTimeout` or `withTimeoutOrNull`
- [ ] No `Thread.sleep` in coroutines (use `delay`)
- [ ] Tests use `runTest` for coroutine testing
- [ ] Cancellation behavior tested
- [ ] Error handling tested with mocks

**Related Verifiers:**
- **error-handling.md** - Error handling patterns
- **testing.md** - Testing practices
- **dependency-injection.md** - Scope injection patterns
