---
domain: database-access
description: Verify jOOQ code generation setup, repository pattern implementation, type-safe DSL usage, transaction management, Flyway migrations, and Testcontainers integration
---

# Database Access Verification

Verify that implementation follows proper database access patterns with jOOQ type-safe queries, repository pattern, transaction management, Flyway migrations, and comprehensive Testcontainers-based testing.

## Verification Checklist

### 1. jOOQ Code Generation Configuration

**Requirement:** jOOQ code generator must be configured in build.gradle.kts with proper database connection, schema settings, and Kotlin-specific options.

**Verification Steps:**

✅ **Check jOOQ plugin and dependencies:**
```kotlin
// ✅ Correct - jOOQ plugin and dependencies configured
// File: build.gradle.kts
plugins {
    id("org.jetbrains.kotlin.jvm")
    id("nu.studer.jooq") version "8.2"
}

dependencies {
    // jOOQ runtime dependencies
    implementation("org.jooq:jooq:3.18.7")
    implementation("org.jooq:jooq-kotlin:3.18.7")
    implementation("org.jooq:jooq-kotlin-coroutines:3.18.7")

    // Database driver
    implementation("org.postgresql:postgresql:42.7.1")

    // jOOQ code generation dependency
    jooqGenerator("org.postgresql:postgresql:42.7.1")
}

// ❌ Incorrect - missing jOOQ plugin or dependencies
plugins {
    id("org.jetbrains.kotlin.jvm")
    // No jOOQ plugin!
}

dependencies {
    implementation("org.jooq:jooq:3.18.7")
    // Missing jooq-kotlin and jooq-kotlin-coroutines!
}
```

✅ **Check jOOQ generator configuration:**
```kotlin
// ✅ Correct - complete jOOQ configuration
jooq {
    version.set("3.18.7")

    configurations {
        create("main") {
            jooqConfiguration.apply {
                logging = org.jooq.meta.jaxb.Logging.WARN

                jdbc.apply {
                    driver = "org.postgresql.Driver"
                    url = "jdbc:postgresql://localhost:5432/mydb"
                    user = "db_user"
                    password = "db_password"
                }

                generator.apply {
                    name = "org.jooq.codegen.KotlinGenerator"  // Use Kotlin generator!

                    database.apply {
                        name = "org.jooq.meta.postgres.PostgresDatabase"
                        inputSchema = "public"
                        includes = ".*"
                        excludes = "flyway_schema_history"
                    }

                    generate.apply {
                        isDeprecated = false
                        isRecords = true
                        isImmutablePojos = true
                        isFluentSetters = true
                        isDaos = false  // Use custom repositories

                        // Kotlin-specific settings
                        isKotlinSetterJvmNameAnnotationsOnIsPrefix = true
                        isKotlinNotNullPojoAttributes = true
                        isKotlinNotNullRecordAttributes = true
                    }

                    target.apply {
                        packageName = "com.company.service.db"
                        directory = "src/jooq"
                    }
                }
            }
        }
    }
}

// ❌ Incorrect - using Java generator instead of Kotlin
generator.apply {
    name = "org.jooq.codegen.JavaGenerator"  // Wrong generator!
}
```

✅ **Check forced types for domain mapping:**
```kotlin
// ✅ Correct - domain enum mapping
database.apply {
    forcedTypes.addAll(listOf(
        // Map database enum to Kotlin enum
        ForcedType().apply {
            userType = "com.company.service.domain.OrderStatus"
            enumConverter = true
            includeExpression = ".*\\.order_status"
        },
        // Map UUID columns
        ForcedType().apply {
            userType = "java.util.UUID"
            includeTypes = "UUID"
        },
        // Map JSONB to kotlinx.serialization
        ForcedType().apply {
            userType = "kotlinx.serialization.json.JsonObject"
            includeTypes = "JSONB?"
        }
    ))
}

// ❌ Incorrect - no forced types, using default mappings
database.apply {
    // No forcedTypes configuration - enums become strings!
}
```

✅ **Check compilation dependencies:**
```kotlin
// ✅ Correct - jOOQ generation before compilation
tasks.named<JavaCompile>("compileJava") {
    dependsOn(tasks.named("generateJooq"))
}

tasks.named<org.jetbrains.kotlin.gradle.tasks.KotlinCompile>("compileKotlin") {
    dependsOn(tasks.named("generateJooq"))
}

// ❌ Incorrect - no dependency, compilation may fail
// No dependsOn configuration - generated code might not exist!
```

**How to Verify:**
```bash
# Check for jOOQ plugin in build files
grep -r "nu.studer.jooq" gradle-apps/*/build.gradle.kts

# Verify jOOQ dependencies
grep -r "org.jooq:jooq-kotlin" gradle-apps/*/build.gradle.kts

# Check for generated code directory
find . -path "*/src/jooq/*" -type d

# Verify Kotlin generator is used
grep -r "KotlinGenerator" gradle-apps/*/build.gradle.kts

# Check forced types configuration
grep -r "forcedTypes" gradle-apps/*/build.gradle.kts -A 10
```

**Expected Result:**
- jOOQ plugin version 8.2 or higher configured
- jooq-kotlin and jooq-kotlin-coroutines dependencies present
- KotlinGenerator used instead of JavaGenerator
- Forced types configured for enums and custom types
- Compilation tasks depend on jOOQ generation
- Generated code in src/jooq directory

---

### 2. Repository Pattern Implementation

**Requirement:** Repository interfaces must be defined in domain layer with implementations using jOOQ DSL in infrastructure layer.

**Verification Steps:**

✅ **Check repository interface in domain:**
```kotlin
// ✅ Correct - repository interface in domain layer
// File: src/main/kotlin/com/company/service/domain/OrderRepository.kt
package com.company.service.domain

import java.util.UUID

interface OrderRepository {
    suspend fun findById(id: UUID): Order?
    suspend fun findByCustomerId(customerId: UUID): List<Order>
    suspend fun findByStatus(status: OrderStatus): List<Order>
    suspend fun save(order: Order): Order
    suspend fun update(order: Order): Order
    suspend fun delete(id: UUID): Boolean
}

// ❌ Incorrect - repository in infrastructure layer
// File: src/main/kotlin/com/company/service/infrastructure/JooqOrderRepository.kt
interface OrderRepository {  // Wrong package!
    fun findById(id: UUID): Order?  // Not suspend functions!
}
```

✅ **Check repository implementation with jOOQ:**
```kotlin
// ✅ Correct - implementation in infrastructure with jOOQ DSL
// File: src/main/kotlin/com/company/service/infrastructure/db/JooqOrderRepository.kt
package com.company.service.infrastructure.db

import com.company.service.domain.*
import com.company.service.infrastructure.db.tables.Order.ORDER
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.jooq.DSLContext
import org.slf4j.LoggerFactory
import java.util.UUID

class JooqOrderRepository(
    private val dsl: DSLContext
) : OrderRepository {

    private val logger = LoggerFactory.getLogger(javaClass)

    override suspend fun findById(id: UUID): Order? = withContext(Dispatchers.IO) {
        logger.debug("Finding order by id: $id")

        dsl.selectFrom(ORDER)
            .where(ORDER.ID.eq(id))
            .fetchOne()
            ?.toDomain()
    }

    override suspend fun findByCustomerId(customerId: UUID): List<Order> =
        withContext(Dispatchers.IO) {
            dsl.selectFrom(ORDER)
                .where(ORDER.CUSTOMER_ID.eq(customerId))
                .orderBy(ORDER.CREATED_AT.desc())
                .fetch()
                .map { it.toDomain() }
        }

    override suspend fun save(order: Order): Order = withContext(Dispatchers.IO) {
        logger.debug("Saving order: ${order.id}")

        dsl.insertInto(ORDER)
            .set(ORDER.ID, order.id)
            .set(ORDER.CUSTOMER_ID, order.customerId)
            .set(ORDER.STATUS, order.status.toJooq())
            .set(ORDER.TOTAL_AMOUNT, order.totalAmount)
            .returning()
            .fetchOne()!!
            .toDomain()
    }

    private fun OrderRecord.toDomain(): Order {
        return Order(
            id = id!!,
            customerId = customerId!!,
            status = OrderStatus.valueOf(status!!),
            totalAmount = totalAmount!!,
            createdAt = createdAt!!
        )
    }
}

// ❌ Incorrect - using raw SQL instead of jOOQ DSL
class JooqOrderRepository(
    private val connection: Connection
) : OrderRepository {
    override suspend fun findById(id: UUID): Order? {
        val sql = "SELECT * FROM orders WHERE id = ?"  // Raw SQL!
        val stmt = connection.prepareStatement(sql)
        stmt.setString(1, id.toString())
        // Manual result set handling...
    }
}
```

✅ **Check coroutines with Dispatchers.IO:**
```kotlin
// ✅ Correct - suspend functions with Dispatchers.IO
override suspend fun findById(id: UUID): Order? = withContext(Dispatchers.IO) {
    dsl.selectFrom(ORDER).where(ORDER.ID.eq(id)).fetchOne()?.toDomain()
}

// ❌ Incorrect - blocking without coroutines
override fun findById(id: UUID): Order? {
    return dsl.selectFrom(ORDER).where(ORDER.ID.eq(id)).fetchOne()?.toDomain()
    // Blocks thread without coroutine context!
}

// ❌ Incorrect - suspend without proper dispatcher
override suspend fun findById(id: UUID): Order? {
    return dsl.selectFrom(ORDER).where(ORDER.ID.eq(id)).fetchOne()?.toDomain()
    // Uses calling coroutine's dispatcher, may block main thread!
}
```

✅ **Check domain/infrastructure mapping:**
```kotlin
// ✅ Correct - clean mapping between jOOQ records and domain entities
private fun OrderRecord.toDomain(): Order {
    return Order(
        id = id!!,
        customerId = customerId!!,
        status = OrderStatus.valueOf(status!!),
        totalAmount = totalAmount!!,
        createdAt = createdAt!!
    )
}

private fun Order.toRecord(): OrderRecord {
    return OrderRecord(
        id = id,
        customerId = customerId,
        status = status.name,
        totalAmount = totalAmount,
        createdAt = createdAt
    )
}

// ❌ Incorrect - exposing jOOQ types in domain
override suspend fun findById(id: UUID): OrderRecord {
    return dsl.selectFrom(ORDER).where(ORDER.ID.eq(id)).fetchOne()!!
    // Returns jOOQ type instead of domain type!
}
```

**How to Verify:**
```bash
# Find repository interfaces in domain
find . -path "*/domain/*Repository.kt" -type f

# Check repository implementations in infrastructure
find . -path "*/infrastructure/db/*Repository.kt" -type f

# Verify no raw SQL strings in repositories
grep -r "\"SELECT\|\"INSERT\|\"UPDATE\|\"DELETE" */infrastructure/db/*.kt

# Check for withContext(Dispatchers.IO)
grep -r "withContext(Dispatchers.IO)" */infrastructure/db/*.kt

# Verify jOOQ DSL usage (table references)
grep -r "selectFrom\|insertInto\|update\|deleteFrom" */infrastructure/db/*.kt
```

**Expected Result:**
- Repository interfaces in domain package
- Repository implementations in infrastructure/db package
- All repository methods are suspend functions
- All database operations wrapped with withContext(Dispatchers.IO)
- No raw SQL strings, only jOOQ DSL
- Mapping functions convert between jOOQ records and domain entities

---

### 3. Type-Safe jOOQ DSL Usage

**Requirement:** All database queries must use jOOQ's type-safe DSL. No raw SQL strings or string-based column references.

**Verification Steps:**

✅ **Check type-safe queries:**
```kotlin
// ✅ Correct - type-safe jOOQ DSL
override suspend fun findByStatus(status: OrderStatus): List<Order> =
    withContext(Dispatchers.IO) {
        dsl.selectFrom(ORDER)
            .where(ORDER.STATUS.eq(status.name))  // Type-safe column reference
            .orderBy(ORDER.CREATED_AT.desc())
            .fetch()
            .map { it.toDomain() }
    }

// ❌ Incorrect - raw SQL string
override suspend fun findByStatus(status: OrderStatus): List<Order> =
    withContext(Dispatchers.IO) {
        val sql = """
            SELECT * FROM orders
            WHERE status = ?
            ORDER BY created_at DESC
        """.trimIndent()
        // Raw SQL with manual parameter binding
    }
```

✅ **Check complex queries with type safety:**
```kotlin
// ✅ Correct - type-safe joins and aggregations
suspend fun getOrderSummary(customerId: UUID): OrderSummary =
    withContext(Dispatchers.IO) {
        val result = dsl.select(
                ORDER.CUSTOMER_ID,
                DSL.count().`as`("total_orders"),
                DSL.sum(ORDER.TOTAL_AMOUNT).`as`("total_spent"),
                DSL.max(ORDER.CREATED_AT).`as`("latest_order")
            )
            .from(ORDER)
            .where(ORDER.CUSTOMER_ID.eq(customerId))
            .groupBy(ORDER.CUSTOMER_ID)
            .fetchOne()

        OrderSummary(
            customerId = result!![ORDER.CUSTOMER_ID]!!,
            totalOrders = result.get("total_orders", Int::class.java)!!,
            totalSpent = result.get("total_spent", java.math.BigDecimal::class.java)!!,
            latestOrder = result.get("latest_order", java.time.OffsetDateTime::class.java)
        )
    }

// ❌ Incorrect - string-based column names
val result = dsl.select(
        DSL.field("customer_id"),  // String-based field!
        DSL.count().`as`("total_orders")
    )
    .from("orders")  // String-based table!
```

✅ **Check conditional queries:**
```kotlin
// ✅ Correct - type-safe conditions
suspend fun findOrders(
    customerId: UUID?,
    status: OrderStatus?,
    minAmount: BigDecimal?
): List<Order> = withContext(Dispatchers.IO) {
    val conditions = mutableListOf<Condition>()

    customerId?.let {
        conditions.add(ORDER.CUSTOMER_ID.eq(it))
    }
    status?.let {
        conditions.add(ORDER.STATUS.eq(it.name))
    }
    minAmount?.let {
        conditions.add(ORDER.TOTAL_AMOUNT.greaterOrEqual(it))
    }

    dsl.selectFrom(ORDER)
        .where(conditions)
        .fetch()
        .map { it.toDomain() }
}

// ❌ Incorrect - string concatenation
suspend fun findOrders(...): List<Order> {
    var sql = "SELECT * FROM orders WHERE 1=1"
    if (customerId != null) {
        sql += " AND customer_id = '$customerId'"  // SQL injection risk!
    }
    // Very bad!
}
```

✅ **Check batch operations:**
```kotlin
// ✅ Correct - type-safe batch insert
suspend fun saveBatch(orders: List<Order>): List<Order> =
    withContext(Dispatchers.IO) {
        val records = orders.map { order ->
            dsl.newRecord(ORDER).apply {
                id = order.id
                customerId = order.customerId
                status = order.status.name
                totalAmount = order.totalAmount
            }
        }

        dsl.batchInsert(records).execute()
        orders
    }

// ❌ Incorrect - manual batch SQL
suspend fun saveBatch(orders: List<Order>): List<Order> {
    val sql = "INSERT INTO orders (id, customer_id, status) VALUES (?, ?, ?)"
    // Manual batch construction
}
```

**How to Verify:**
```bash
# Check for raw SQL strings (should be minimal or none)
grep -r "\"SELECT\|\"INSERT\|\"UPDATE\|\"DELETE" */infrastructure/db/*.kt

# Verify jOOQ table imports
grep -r "import.*tables\\..*\\..*" */infrastructure/db/*.kt

# Check for type-safe DSL methods
grep -r "selectFrom\|insertInto\|update.*set\|deleteFrom" */infrastructure/db/*.kt

# Verify no string-based field references
grep -r "DSL.field(\"" */infrastructure/db/*.kt

# Check for proper condition building
grep -r "where\|and\|or" */infrastructure/db/*.kt
```

**Expected Result:**
- All queries use jOOQ DSL (selectFrom, insertInto, etc.)
- No raw SQL strings except in migrations
- Type-safe table and column references
- Conditional queries use jOOQ Condition objects
- No string-based field or table names
- Batch operations use jOOQ batch API

---

### 4. Transaction Management

**Requirement:** Multi-step database operations must be wrapped in transactions with proper rollback on errors.

**Verification Steps:**

✅ **Check transaction manager:**
```kotlin
// ✅ Correct - transaction manager with coroutines support
// File: src/main/kotlin/com/company/service/infrastructure/db/TransactionManager.kt
package com.company.service.infrastructure.db

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.jooq.DSLContext
import org.jooq.impl.DSL
import org.slf4j.LoggerFactory

class TransactionManager(private val dsl: DSLContext) {

    private val logger = LoggerFactory.getLogger(javaClass)

    suspend fun <T> transaction(block: suspend (DSLContext) -> T): T =
        withContext(Dispatchers.IO) {
            logger.debug("Starting transaction")

            try {
                val result = dsl.transactionResult { configuration ->
                    val txDsl = DSL.using(configuration)
                    kotlinx.coroutines.runBlocking {
                        block(txDsl)
                    }
                }
                logger.debug("Transaction committed successfully")
                result
            } catch (e: Exception) {
                logger.error("Transaction rolled back", e)
                throw e
            }
        }
}

// ❌ Incorrect - no transaction support
class TransactionManager(private val dsl: DSLContext) {
    // No transaction method - services must manage manually!
}
```

✅ **Check service-level transaction usage:**
```kotlin
// ✅ Correct - multi-step operation in transaction
class OrderService(
    private val orderRepository: OrderRepository,
    private val inventoryRepository: InventoryRepository,
    private val transactionManager: TransactionManager
) {
    suspend fun createOrder(request: CreateOrderRequest): Order {
        return transactionManager.transaction { tx ->
            // Step 1: Create order
            val order = Order.create(
                customerId = request.customerId,
                items = request.items
            )
            val savedOrder = orderRepository.save(order)

            // Step 2: Reserve inventory
            request.items.forEach { item ->
                inventoryRepository.reserve(item.productId, item.quantity)
            }

            // Step 3: Publish event
            eventPublisher.publishOrderCreated(savedOrder)

            savedOrder
        }
        // All steps commit together or rollback together
    }
}

// ❌ Incorrect - no transaction, inconsistent state possible
suspend fun createOrder(request: CreateOrderRequest): Order {
    val order = Order.create(...)
    val savedOrder = orderRepository.save(order)  // Commits immediately

    request.items.forEach { item ->
        inventoryRepository.reserve(item.productId, item.quantity)  // If this fails...
    }
    // Order is saved but inventory not reserved!

    return savedOrder
}
```

✅ **Check pessimistic locking:**
```kotlin
// ✅ Correct - FOR UPDATE lock in transaction
suspend fun updateOrderWithLock(orderId: UUID, update: (Order) -> Order): Order {
    return transactionManager.transaction { tx ->
        // Lock row for update
        val order = tx.selectFrom(ORDER)
            .where(ORDER.ID.eq(orderId))
            .forUpdate()  // Pessimistic lock
            .fetchOne()
            ?.toDomain()
            ?: throw NotFoundException("Order not found: $orderId")

        val updatedOrder = update(order)
        orderRepository.update(updatedOrder)
    }
}

// ❌ Incorrect - race condition possible
suspend fun updateOrder(orderId: UUID, update: (Order) -> Order): Order {
    val order = orderRepository.findById(orderId) ?: throw NotFoundException()
    // Another thread can modify order here!
    val updatedOrder = update(order)
    return orderRepository.update(updatedOrder)
    // Lost update problem!
}
```

✅ **Check optimistic locking with version field:**
```kotlin
// ✅ Correct - version-based optimistic locking
data class Order(
    val id: UUID,
    val customerId: UUID,
    val status: OrderStatus,
    val version: Int  // Version field for optimistic locking
)

suspend fun updateOrder(order: Order): Order = withContext(Dispatchers.IO) {
    val updated = dsl.update(ORDER)
        .set(ORDER.STATUS, order.status.name)
        .set(ORDER.VERSION, order.version + 1)
        .where(
            ORDER.ID.eq(order.id)
                .and(ORDER.VERSION.eq(order.version))  // Check version
        )
        .execute()

    if (updated == 0) {
        throw OptimisticLockException("Order was modified by another transaction")
    }

    order.copy(version = order.version + 1)
}

// ❌ Incorrect - no concurrency control
suspend fun updateOrder(order: Order): Order = withContext(Dispatchers.IO) {
    dsl.update(ORDER)
        .set(ORDER.STATUS, order.status.name)
        .where(ORDER.ID.eq(order.id))
        .execute()
    // No version check - lost updates possible!
    order
}
```

**How to Verify:**
```bash
# Check for TransactionManager class
find . -name "*TransactionManager.kt" -type f

# Verify transaction usage in services
grep -r "transaction {" */service/*.kt */application/*.kt

# Check for FOR UPDATE usage
grep -r "forUpdate()" */infrastructure/db/*.kt

# Verify version fields for optimistic locking
grep -r "version.*Int" */domain/*.kt

# Check transaction rollback handling
grep -r "catch.*Exception" */infrastructure/db/TransactionManager.kt
```

**Expected Result:**
- TransactionManager class exists with suspend transaction method
- Multi-step operations wrapped in transactions
- FOR UPDATE used for pessimistic locking where needed
- Version fields used for optimistic locking
- Transactions automatically rollback on exception
- Services depend on TransactionManager

---

### 5. Flyway Database Migrations

**Requirement:** All schema changes must be versioned using Flyway migrations with proper naming, rollback comments, and testing.

**Verification Steps:**

✅ **Check Flyway configuration:**
```kotlin
// ✅ Correct - Flyway plugin and configuration
// File: build.gradle.kts
plugins {
    id("org.flywaydb.flyway") version "10.1.0"
}

dependencies {
    implementation("org.flywaydb:flyway-core:10.1.0")
    implementation("org.flywaydb:flyway-database-postgresql:10.1.0")
}

flyway {
    url = System.getenv("DB_URL") ?: "jdbc:postgresql://localhost:5432/mydb"
    user = System.getenv("DB_USER") ?: "db_user"
    password = System.getenv("DB_PASSWORD") ?: "db_password"
    schemas = arrayOf("public")
    locations = arrayOf("classpath:db/migration")
    baselineOnMigrate = true
    validateOnMigrate = true
}

// ❌ Incorrect - no Flyway configuration
// No flyway plugin or configuration
```

✅ **Check migration file naming:**
```sql
-- ✅ Correct - proper naming convention
-- File: src/main/resources/db/migration/V1__Create_Orders_Table.sql
-- File: src/main/resources/db/migration/V2__Add_Order_Status_Index.sql
-- File: src/main/resources/db/migration/V3__Add_Customer_Email_Column.sql

-- ❌ Incorrect - poor naming
-- File: V1.sql  -- No description
-- File: migration_1.sql  -- Wrong prefix
-- File: V1_orders.sql  -- Single underscore instead of double
```

✅ **Check migration content:**
```sql
-- ✅ Correct - complete migration with comments and constraints
-- File: src/main/resources/db/migration/V1__Create_Orders_Table.sql

-- Migration: Create orders table
-- Rollback: DROP TABLE IF EXISTS orders CASCADE;

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version INT NOT NULL DEFAULT 0,

    CONSTRAINT orders_customer_id_not_null CHECK (customer_id IS NOT NULL),
    CONSTRAINT orders_total_amount_positive CHECK (total_amount >= 0),
    CONSTRAINT orders_status_valid CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled'))
);

-- Create indexes
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at_trigger
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_orders_updated_at();

-- Add table comments
COMMENT ON TABLE orders IS 'Customer orders table';
COMMENT ON COLUMN orders.id IS 'Unique order identifier';
COMMENT ON COLUMN orders.customer_id IS 'Reference to customer';
COMMENT ON COLUMN orders.version IS 'Optimistic locking version';

-- ❌ Incorrect - missing constraints and comments
CREATE TABLE orders (
    id UUID PRIMARY KEY,
    customer_id UUID,
    status VARCHAR(50),
    total_amount DECIMAL(10, 2)
);
-- No indexes, no triggers, no comments!
```

✅ **Check migration application in code:**
```kotlin
// ✅ Correct - Flyway migration on startup
// File: src/main/kotlin/com/company/service/Application.kt
fun Application.module() {
    val dataSource = HikariDataSource(config)

    // Run Flyway migrations
    logger.info("Running database migrations...")
    val flyway = Flyway.configure()
        .dataSource(dataSource)
        .locations("classpath:db/migration")
        .baselineOnMigrate(true)
        .validateOnMigrate(true)
        .load()

    try {
        val result = flyway.migrate()
        logger.info("Applied ${result.migrationsExecuted} migrations")

        val info = flyway.info()
        logger.info("Current schema version: ${info.current()?.version}")
    } catch (e: Exception) {
        logger.error("Database migration failed", e)
        throw e
    }

    // Continue with application setup...
}

// ❌ Incorrect - no migration execution
fun Application.module() {
    val dataSource = HikariDataSource(config)
    // No Flyway migration - schema changes must be applied manually!
}
```

✅ **Check migration testing:**
```kotlin
// ✅ Correct - test migrations in integration tests
class MigrationTest : DescribeSpec({

    val postgres = PostgreSQLContainer(DockerImageName.parse("postgres:15-alpine"))

    beforeSpec {
        postgres.start()
    }

    describe("Flyway migrations") {
        it("should apply all migrations successfully") {
            val dataSource = HikariDataSource(HikariConfig().apply {
                jdbcUrl = postgres.jdbcUrl
                username = postgres.username
                password = postgres.password
            })

            val flyway = Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .load()

            // Should not throw
            val result = flyway.migrate()
            result.migrationsExecuted shouldBeGreaterThan 0

            val info = flyway.info()
            info.current() shouldNotBe null
        }

        it("should validate migrations are in correct order") {
            // Test migration ordering and dependencies
        }
    }
})

// ❌ Incorrect - no migration testing
// Migrations only tested in production!
```

**How to Verify:**
```bash
# Check for Flyway plugin
grep -r "org.flywaydb.flyway" gradle-apps/*/build.gradle.kts

# Find migration files
find . -path "*/db/migration/V*.sql" -type f

# Verify migration naming convention
find . -path "*/db/migration/*" -type f | grep -v "V[0-9]*__.*\.sql"

# Check for rollback comments in migrations
grep -r "Rollback:" */resources/db/migration/*.sql

# Verify Flyway execution in Application.kt
grep -r "flyway.migrate()" */Application.kt

# Check migration tests
find . -name "*Migration*Test.kt" -type f
```

**Expected Result:**
- Flyway plugin configured in build.gradle.kts
- Migration files in src/main/resources/db/migration
- Files follow V{version}__{description}.sql naming
- Each migration has rollback comment
- Constraints, indexes, and triggers included
- Migrations applied on application startup
- Integration tests verify migrations work

---

### 6. Testcontainers for Database Tests

**Requirement:** Repository and integration tests must use Testcontainers to run against real PostgreSQL database.

**Verification Steps:**

✅ **Check Testcontainers dependencies:**
```kotlin
// ✅ Correct - Testcontainers dependencies
// File: build.gradle.kts
dependencies {
    testImplementation("org.testcontainers:testcontainers:1.19.3")
    testImplementation("org.testcontainers:postgresql:1.19.3")
    testImplementation("org.testcontainers:junit-jupiter:1.19.3")
}

// ❌ Incorrect - no Testcontainers
dependencies {
    testImplementation("io.kotest:kotest-runner-junit5:5.7.2")
    // Missing Testcontainers dependencies!
}
```

✅ **Check Testcontainers setup:**
```kotlin
// ✅ Correct - PostgreSQL container with proper configuration
// File: src/test/kotlin/com/company/service/infrastructure/db/OrderRepositoryTest.kt
import org.testcontainers.containers.PostgreSQLContainer
import org.testcontainers.utility.DockerImageName

class OrderRepositoryTest : DescribeSpec({

    // PostgreSQL container
    val postgres = PostgreSQLContainer(DockerImageName.parse("postgres:15-alpine"))
        .withDatabaseName("test_db")
        .withUsername("test_user")
        .withPassword("test_password")
        .withReuse(true)  // Reuse container across test classes

    lateinit var dataSource: HikariDataSource
    lateinit var dsl: DSLContext
    lateinit var repository: JooqOrderRepository

    beforeSpec {
        postgres.start()

        // Create datasource
        dataSource = HikariDataSource(HikariConfig().apply {
            jdbcUrl = postgres.jdbcUrl
            username = postgres.username
            password = postgres.password
            driverClassName = "org.postgresql.Driver"
            maximumPoolSize = 5
        })

        // Run Flyway migrations
        val flyway = Flyway.configure()
            .dataSource(dataSource)
            .locations("classpath:db/migration")
            .load()
        flyway.migrate()

        // Create jOOQ context
        dsl = DSL.using(dataSource, SQLDialect.POSTGRES)

        // Create repository
        repository = JooqOrderRepository(dsl)
    }

    afterSpec {
        dataSource.close()
        postgres.stop()
    }

    beforeEach {
        // Clean database before each test
        runBlocking {
            dsl.deleteFrom(ORDER).execute()
        }
    }

    // Tests...
})

// ❌ Incorrect - using H2 in-memory database
class OrderRepositoryTest : DescribeSpec({
    val dataSource = DriverManager.getConnection("jdbc:h2:mem:test")
    // H2 doesn't match PostgreSQL behavior!
})
```

✅ **Check repository tests:**
```kotlin
// ✅ Correct - comprehensive repository tests
describe("findById") {
    it("should return order when exists") {
        // Given
        val order = TestData.createOrder()
        runBlocking { repository.save(order) }

        // When
        val found = runBlocking { repository.findById(order.id) }

        // Then
        found.shouldNotBeNull()
        found.id shouldBe order.id
        found.customerId shouldBe order.customerId
    }

    it("should return null when order doesn't exist") {
        // When
        val found = runBlocking { repository.findById(UUID.randomUUID()) }

        // Then
        found.shouldBeNull()
    }
}

describe("save") {
    it("should save order successfully") {
        // Given
        val order = TestData.createOrder()

        // When
        val saved = runBlocking { repository.save(order) }

        // Then
        saved.id shouldBe order.id

        // Verify persisted
        val found = runBlocking { repository.findById(order.id) }
        found.shouldNotBeNull()
    }
}

describe("transaction handling") {
    it("should commit transaction on success") {
        // Test transaction commit
    }

    it("should rollback transaction on failure") {
        // Given
        val order1 = TestData.createOrder()

        // When
        try {
            runBlocking {
                dsl.transaction { config ->
                    val txDsl = DSL.using(config)
                    val txRepo = JooqOrderRepository(txDsl)

                    txRepo.save(order1)
                    throw RuntimeException("Simulated error")
                }
            }
        } catch (e: RuntimeException) {
            // Expected
        }

        // Then - order should not exist
        val found = runBlocking { repository.findById(order1.id) }
        found.shouldBeNull()
    }
}

// ❌ Incorrect - no tests or only unit tests
class OrderRepositoryTest : DescribeSpec({
    // No tests!
})
```

✅ **Check test data fixtures:**
```kotlin
// ✅ Correct - test data factory
// File: src/testFixtures/kotlin/com/company/service/test/TestData.kt
object TestData {

    fun createOrder(
        id: UUID = UUID.randomUUID(),
        customerId: UUID = UUID.randomUUID(),
        status: OrderStatus = OrderStatus.PENDING,
        totalAmount: BigDecimal = BigDecimal("100.00"),
        createdAt: OffsetDateTime = OffsetDateTime.now()
    ): Order {
        return Order(
            id = id,
            customerId = customerId,
            status = status,
            totalAmount = totalAmount,
            createdAt = createdAt,
            version = 0
        )
    }
}

// ❌ Incorrect - no test fixtures
// Tests create data inline, making them verbose and hard to maintain
```

**How to Verify:**
```bash
# Check for Testcontainers dependencies
grep -r "org.testcontainers" gradle-apps/*/build.gradle.kts

# Find repository integration tests
find . -name "*Repository*Test.kt" -type f

# Verify PostgreSQLContainer usage
grep -r "PostgreSQLContainer" */test/**/*.kt

# Check Flyway migrations in tests
grep -r "flyway.migrate()" */test/**/*.kt

# Verify test fixtures
find . -path "*/testFixtures/*" -name "TestData.kt"

# Check database cleanup between tests
grep -r "beforeEach.*deleteFrom" */test/**/*.kt
```

**Expected Result:**
- Testcontainers dependencies configured
- PostgreSQL container used in repository tests
- Flyway migrations run before tests
- Database cleaned between tests
- Comprehensive repository tests (CRUD operations)
- Transaction tests (commit and rollback)
- Test data fixtures available

---

## Common Issues and Fixes

### Issue 1: Raw SQL Instead of jOOQ DSL

**Problem:**
```kotlin
// ❌ Problem - raw SQL string
val sql = "SELECT * FROM orders WHERE customer_id = ?"
val result = connection.prepareStatement(sql).executeQuery()
```

**Fix:**
```kotlin
// ✅ Fix - jOOQ DSL
val result = dsl.selectFrom(ORDER)
    .where(ORDER.CUSTOMER_ID.eq(customerId))
    .fetch()
```

### Issue 2: Missing Transaction Wrapping

**Problem:**
```kotlin
// ❌ Problem - no transaction
suspend fun createOrder(order: Order): Order {
    val saved = orderRepository.save(order)
    inventoryRepository.reserve(order.items)
    // If reserve fails, order is already saved!
    return saved
}
```

**Fix:**
```kotlin
// ✅ Fix - wrapped in transaction
suspend fun createOrder(order: Order): Order {
    return transactionManager.transaction { tx ->
        val saved = orderRepository.save(order)
        inventoryRepository.reserve(order.items)
        saved
    }
}
```

### Issue 3: No Coroutine Dispatcher

**Problem:**
```kotlin
// ❌ Problem - blocks thread
override suspend fun findById(id: UUID): Order? {
    return dsl.selectFrom(ORDER)
        .where(ORDER.ID.eq(id))
        .fetchOne()
        ?.toDomain()
}
```

**Fix:**
```kotlin
// ✅ Fix - uses IO dispatcher
override suspend fun findById(id: UUID): Order? = withContext(Dispatchers.IO) {
    dsl.selectFrom(ORDER)
        .where(ORDER.ID.eq(id))
        .fetchOne()
        ?.toDomain()
}
```

### Issue 4: Missing jOOQ Generation Dependency

**Problem:**
```kotlin
// ❌ Problem - compilation fails
tasks.named<KotlinCompile>("compileKotlin") {
    // No dependency on jOOQ generation
}
```

**Fix:**
```kotlin
// ✅ Fix - depend on jOOQ generation
tasks.named<KotlinCompile>("compileKotlin") {
    dependsOn(tasks.named("generateJooq"))
}
```

### Issue 5: Testing with H2 Instead of PostgreSQL

**Problem:**
```kotlin
// ❌ Problem - H2 doesn't match PostgreSQL
val dataSource = DriverManager.getConnection("jdbc:h2:mem:test")
```

**Fix:**
```kotlin
// ✅ Fix - use Testcontainers with PostgreSQL
val postgres = PostgreSQLContainer(DockerImageName.parse("postgres:15-alpine"))
postgres.start()
val dataSource = HikariDataSource(HikariConfig().apply {
    jdbcUrl = postgres.jdbcUrl
    username = postgres.username
    password = postgres.password
})
```

### Issue 6: Exposing jOOQ Types in Domain

**Problem:**
```kotlin
// ❌ Problem - domain depends on jOOQ
interface OrderRepository {
    suspend fun findById(id: UUID): OrderRecord  // jOOQ type!
}
```

**Fix:**
```kotlin
// ✅ Fix - return domain types
interface OrderRepository {
    suspend fun findById(id: UUID): Order  // Domain type
}

// Map in implementation
private fun OrderRecord.toDomain(): Order { ... }
```

### Issue 7: Missing Indexes in Migrations

**Problem:**
```sql
-- ❌ Problem - no indexes
CREATE TABLE orders (
    id UUID PRIMARY KEY,
    customer_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL
);
```

**Fix:**
```sql
-- ✅ Fix - add appropriate indexes
CREATE TABLE orders (
    id UUID PRIMARY KEY,
    customer_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL
);

CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
```

---

## Verification Summary

**Before marking implementation as complete, verify:**

- [ ] jOOQ plugin configured in build.gradle.kts
- [ ] jooq-kotlin and jooq-kotlin-coroutines dependencies present
- [ ] KotlinGenerator used for code generation
- [ ] Forced types configured for enums and custom types
- [ ] Repository interfaces in domain package
- [ ] Repository implementations in infrastructure/db package
- [ ] All queries use jOOQ DSL (no raw SQL)
- [ ] All repository methods are suspend functions
- [ ] All database operations use withContext(Dispatchers.IO)
- [ ] TransactionManager class exists
- [ ] Multi-step operations wrapped in transactions
- [ ] Flyway plugin and dependencies configured
- [ ] Migration files follow V{n}__{description}.sql naming
- [ ] Migrations include constraints, indexes, and comments
- [ ] Migrations applied on application startup
- [ ] Testcontainers dependencies configured
- [ ] PostgreSQL container used in tests
- [ ] Flyway migrations run before tests
- [ ] Repository integration tests comprehensive

**Related Implementers:**
- **domain-modeling.md** - Domain entities that are persisted
- **error-handling.md** - Database exception handling
- **testing.md** - Integration testing strategies
- **coroutines.md** - Async database operations
- **configuration.md** - Database connection configuration
- **observability.md** - Database query monitoring
