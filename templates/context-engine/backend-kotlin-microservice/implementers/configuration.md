---
domain: configuration
description: Configuration management with HOCON, environment-specific settings, kotlinx.serialization data classes, and feature flags
---

# Configuration Management

Manage application configuration using HOCON format (application.conf), environment-specific settings, kotlinx.serialization for type-safe config data classes, environment variable overrides, and feature flags for runtime behavior control.

## Core Patterns

### 1. HOCON Configuration Files

**Pattern:** Use HOCON (Human-Optimized Config Object Notation) format for application.conf files with hierarchical structure, variable substitution, and environment-specific overrides.

**Example from PR #1234:**
```hocon
# File: meal-selection-service-app/src/main/resources/application.conf
application {
    name = "meal-selection-service"
    version = "1.2.0"
    environment = "production"
    environment = ${?APP_ENVIRONMENT}
}

server {
    host = "0.0.0.0"
    host = ${?SERVER_HOST}
    port = 8080
    port = ${?SERVER_PORT}

    shutdown-timeout = 30s
    request-timeout = 60s

    ssl {
        enabled = false
        enabled = ${?SSL_ENABLED}
        keystore-path = ""
        keystore-path = ${?SSL_KEYSTORE_PATH}
        keystore-password = ""
        keystore-password = ${?SSL_KEYSTORE_PASSWORD}
    }
}

database {
    driver = "org.postgresql.Driver"
    url = "jdbc:postgresql://localhost:5432/meal_selection"
    url = ${?DATABASE_URL}

    username = "mealselection"
    username = ${?DATABASE_USERNAME}

    password = "development"
    password = ${?DATABASE_PASSWORD}

    pool {
        maximum-size = 20
        maximum-size = ${?DB_POOL_MAX_SIZE}
        minimum-idle = 5
        minimum-idle = ${?DB_POOL_MIN_IDLE}
        connection-timeout = 30s
        idle-timeout = 600s
        max-lifetime = 1800s
    }

    migration {
        enabled = true
        enabled = ${?DB_MIGRATION_ENABLED}
        baseline-on-migrate = true
        validate-on-migrate = true
    }
}

redis {
    host = "localhost"
    host = ${?REDIS_HOST}

    port = 6379
    port = ${?REDIS_PORT}

    password = null
    password = ${?REDIS_PASSWORD}

    database = 0
    database = ${?REDIS_DATABASE}

    timeout = 5s

    pool {
        max-total = 50
        max-idle = 20
        min-idle = 5
    }
}

kafka {
    bootstrap-servers = "localhost:9092"
    bootstrap-servers = ${?KAFKA_BOOTSTRAP_SERVERS}

    consumer {
        group-id = "meal-selection-consumer"
        group-id = ${?KAFKA_CONSUMER_GROUP_ID}

        auto-offset-reset = "earliest"
        enable-auto-commit = false
        max-poll-records = 500
        session-timeout = 30s
        heartbeat-interval = 3s
    }

    producer {
        acks = "all"
        retries = 3
        batch-size = 16384
        linger-ms = 10
        compression-type = "snappy"
        max-in-flight-requests = 5
        enable-idempotence = true
    }

    topics {
        order-events = "order.events"
        order-events = ${?KAFKA_TOPIC_ORDER_EVENTS}

        cart-events = "cart.events"
        cart-events = ${?KAFKA_TOPIC_CART_EVENTS}

        notification-events = "notification.events"
        notification-events = ${?KAFKA_TOPIC_NOTIFICATION_EVENTS}
    }
}

http-clients {
    recipe-service {
        base-url = "http://localhost:8081"
        base-url = ${?RECIPE_SERVICE_URL}

        timeout {
            connect = 5s
            request = 30s
            socket = 30s
        }

        retry {
            max-attempts = 3
            backoff-multiplier = 2
            initial-delay = 100ms
        }

        circuit-breaker {
            enabled = true
            failure-threshold = 5
            reset-timeout = 60s
            half-open-max-calls = 3
        }
    }

    payment-service {
        base-url = "http://localhost:8082"
        base-url = ${?PAYMENT_SERVICE_URL}

        timeout {
            connect = 5s
            request = 45s
            socket = 45s
        }

        retry {
            max-attempts = 2
            backoff-multiplier = 2
            initial-delay = 200ms
        }

        circuit-breaker {
            enabled = true
            failure-threshold = 3
            reset-timeout = 30s
            half-open-max-calls = 2
        }
    }

    inventory-service {
        base-url = "http://localhost:8083"
        base-url = ${?INVENTORY_SERVICE_URL}

        timeout {
            connect = 3s
            request = 15s
            socket = 15s
        }

        retry {
            max-attempts = 3
            backoff-multiplier = 1.5
            initial-delay = 50ms
        }
    }
}

logging {
    level = "INFO"
    level = ${?LOG_LEVEL}

    pattern = "%d{yyyy-MM-dd HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n"

    appenders {
        console {
            enabled = true
            target = "STDOUT"
        }

        file {
            enabled = false
            enabled = ${?LOG_FILE_ENABLED}
            path = "logs/application.log"
            path = ${?LOG_FILE_PATH}
            max-size = "100MB"
            max-history = 30
        }

        json {
            enabled = false
            enabled = ${?LOG_JSON_ENABLED}
        }
    }

    loggers {
        "com.yourcompany.mealselection" = "DEBUG"
        "com.yourcompany.mealselection" = ${?LOG_LEVEL_APP}

        "org.jooq" = "INFO"
        "org.jooq.tools.LoggerListener" = "WARN"

        "io.ktor" = "INFO"
        "io.netty" = "WARN"

        "org.apache.kafka" = "WARN"
    }
}

observability {
    metrics {
        enabled = true
        enabled = ${?METRICS_ENABLED}

        prometheus {
            enabled = true
            port = 9090
            port = ${?PROMETHEUS_PORT}
            path = "/metrics"
        }

        jvm {
            enabled = true
            gc-enabled = true
            memory-enabled = true
            thread-enabled = true
        }
    }

    tracing {
        enabled = true
        enabled = ${?TRACING_ENABLED}

        jaeger {
            enabled = true
            enabled = ${?JAEGER_ENABLED}

            agent-host = "localhost"
            agent-host = ${?JAEGER_AGENT_HOST}

            agent-port = 6831
            agent-port = ${?JAEGER_AGENT_PORT}

            sampling-rate = 0.1
            sampling-rate = ${?JAEGER_SAMPLING_RATE}
        }
    }

    health-check {
        enabled = true
        path = "/health"
        port = ${server.port}

        checks {
            database = true
            redis = true
            kafka = true
            downstream-services = true
        }
    }
}

feature-flags {
    cart-v2-enabled = false
    cart-v2-enabled = ${?FEATURE_CART_V2}

    recommendation-engine-enabled = true
    recommendation-engine-enabled = ${?FEATURE_RECOMMENDATIONS}

    payment-retry-enabled = true
    payment-retry-enabled = ${?FEATURE_PAYMENT_RETRY}

    inventory-sync-enabled = false
    inventory-sync-enabled = ${?FEATURE_INVENTORY_SYNC}

    rate-limiting-enabled = true
    rate-limiting-enabled = ${?FEATURE_RATE_LIMITING}

    caching-enabled = true
    caching-enabled = ${?FEATURE_CACHING}
}

security {
    cors {
        enabled = true
        allowed-origins = ["http://localhost:3000"]
        allowed-origins = ${?CORS_ALLOWED_ORIGINS}
        allowed-methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
        allowed-headers = ["Content-Type", "Authorization"]
        exposed-headers = ["X-Request-ID"]
        allow-credentials = true
        max-age = 3600
    }

    authentication {
        jwt {
            enabled = true
            secret = "change-me-in-production"
            secret = ${?JWT_SECRET}
            issuer = "meal-selection-service"
            audience = "meal-selection-api"
            realm = "meal-selection"
            expiration = 3600s
        }

        api-key {
            enabled = false
            enabled = ${?API_KEY_AUTH_ENABLED}
            header-name = "X-API-Key"
        }
    }

    rate-limiting {
        enabled = ${feature-flags.rate-limiting-enabled}
        requests-per-minute = 100
        requests-per-minute = ${?RATE_LIMIT_RPM}
        burst-size = 20
    }
}

cache {
    enabled = ${feature-flags.caching-enabled}

    default-ttl = 300s
    default-ttl = ${?CACHE_DEFAULT_TTL}

    recipes {
        enabled = true
        ttl = 3600s
        max-size = 10000
    }

    customers {
        enabled = true
        ttl = 1800s
        max-size = 5000
    }

    carts {
        enabled = true
        ttl = 600s
        max-size = 20000
    }
}

async {
    thread-pool {
        core-size = 10
        core-size = ${?THREAD_POOL_CORE_SIZE}

        max-size = 50
        max-size = ${?THREAD_POOL_MAX_SIZE}

        queue-capacity = 1000
        keep-alive = 60s
    }

    scheduler {
        pool-size = 5
        pool-size = ${?SCHEDULER_POOL_SIZE}
    }
}
```

**Example Environment-Specific Override:**
```hocon
# File: meal-selection-service-app/src/main/resources/application-dev.conf
include "application.conf"

application {
    environment = "development"
}

server {
    port = 8080
}

database {
    url = "jdbc:postgresql://localhost:5432/meal_selection_dev"
    username = "dev"
    password = "dev"

    pool {
        maximum-size = 10
        minimum-idle = 2
    }
}

logging {
    level = "DEBUG"

    loggers {
        "com.yourcompany.mealselection" = "TRACE"
        "org.jooq" = "DEBUG"
    }
}

observability {
    tracing {
        jaeger {
            sampling-rate = 1.0
        }
    }
}

feature-flags {
    cart-v2-enabled = true
    recommendation-engine-enabled = true
}

cache {
    enabled = false
}
```

**Example Production Configuration:**
```hocon
# File: meal-selection-service-app/src/main/resources/application-prod.conf
include "application.conf"

application {
    environment = "production"
}

server {
    port = 8080
    request-timeout = 30s

    ssl {
        enabled = true
    }
}

database {
    pool {
        maximum-size = 50
        minimum-idle = 10
    }

    migration {
        baseline-on-migrate = false
        validate-on-migrate = true
    }
}

logging {
    level = "INFO"

    appenders {
        file {
            enabled = true
            path = "/var/log/meal-selection/application.log"
        }

        json {
            enabled = true
        }
    }
}

observability {
    tracing {
        jaeger {
            sampling-rate = 0.05
        }
    }
}

security {
    cors {
        allowed-origins = ["https://yourcompany.com", "https://api.yourcompany.com"]
    }

    rate-limiting {
        requests-per-minute = 1000
    }
}

cache {
    enabled = true

    recipes {
        ttl = 7200s
        max-size = 50000
    }
}
```

**Frequency:** 100% of services use HOCON for configuration

**Why:** HOCON provides:
- Human-readable configuration format
- Variable substitution with ${} syntax
- Environment variable overrides with ${?VAR}
- File inclusion for configuration composition
- Comments and documentation support
- Type-safe value parsing

### 2. Type-Safe Configuration Data Classes

**Pattern:** Define configuration as kotlinx.serialization data classes for compile-time type safety and validation.

**Example from PR #1235:**
```kotlin
// File: meal-selection-service-app/src/main/kotlin/com/yourcompany/mealselection/config/AppConfig.kt
package com.yourcompany.mealselection.config

import kotlinx.serialization.Serializable
import kotlin.time.Duration
import kotlin.time.Duration.Companion.seconds

@Serializable
data class AppConfig(
    val application: ApplicationConfig,
    val server: ServerConfig,
    val database: DatabaseConfig,
    val redis: RedisConfig,
    val kafka: KafkaConfig,
    val httpClients: HttpClientsConfig,
    val logging: LoggingConfig,
    val observability: ObservabilityConfig,
    val featureFlags: FeatureFlagsConfig,
    val security: SecurityConfig,
    val cache: CacheConfig,
    val async: AsyncConfig
) {
    fun validate() {
        require(application.name.isNotBlank()) { "Application name cannot be blank" }
        require(server.port in 1..65535) { "Server port must be between 1 and 65535" }
        require(database.pool.maximumSize > 0) { "Database pool maximum size must be positive" }

        if (server.ssl.enabled) {
            require(server.ssl.keystorePath.isNotBlank()) { "SSL keystore path required when SSL is enabled" }
            require(server.ssl.keystorePassword.isNotBlank()) { "SSL keystore password required when SSL is enabled" }
        }

        if (security.authentication.jwt.enabled) {
            require(security.authentication.jwt.secret.length >= 32) {
                "JWT secret must be at least 32 characters for security"
            }
        }
    }
}

@Serializable
data class ApplicationConfig(
    val name: String,
    val version: String,
    val environment: String
) {
    fun isProduction(): Boolean = environment.equals("production", ignoreCase = true)
    fun isDevelopment(): Boolean = environment.equals("development", ignoreCase = true)
    fun isStaging(): Boolean = environment.equals("staging", ignoreCase = true)
}

@Serializable
data class ServerConfig(
    val host: String,
    val port: Int,
    val shutdownTimeout: Duration = 30.seconds,
    val requestTimeout: Duration = 60.seconds,
    val ssl: SslConfig
)

@Serializable
data class SslConfig(
    val enabled: Boolean,
    val keystorePath: String = "",
    val keystorePassword: String = ""
)

@Serializable
data class DatabaseConfig(
    val driver: String,
    val url: String,
    val username: String,
    val password: String,
    val pool: DatabasePoolConfig,
    val migration: DatabaseMigrationConfig
)

@Serializable
data class DatabasePoolConfig(
    val maximumSize: Int,
    val minimumIdle: Int,
    val connectionTimeout: Duration = 30.seconds,
    val idleTimeout: Duration = 600.seconds,
    val maxLifetime: Duration = 1800.seconds
)

@Serializable
data class DatabaseMigrationConfig(
    val enabled: Boolean,
    val baselineOnMigrate: Boolean,
    val validateOnMigrate: Boolean
)

@Serializable
data class RedisConfig(
    val host: String,
    val port: Int,
    val password: String?,
    val database: Int,
    val timeout: Duration = 5.seconds,
    val pool: RedisPoolConfig
)

@Serializable
data class RedisPoolConfig(
    val maxTotal: Int,
    val maxIdle: Int,
    val minIdle: Int
)

@Serializable
data class KafkaConfig(
    val bootstrapServers: String,
    val consumer: KafkaConsumerConfig,
    val producer: KafkaProducerConfig,
    val topics: KafkaTopicsConfig
)

@Serializable
data class KafkaConsumerConfig(
    val groupId: String,
    val autoOffsetReset: String,
    val enableAutoCommit: Boolean,
    val maxPollRecords: Int,
    val sessionTimeout: Duration,
    val heartbeatInterval: Duration
)

@Serializable
data class KafkaProducerConfig(
    val acks: String,
    val retries: Int,
    val batchSize: Int,
    val lingerMs: Int,
    val compressionType: String,
    val maxInFlightRequests: Int,
    val enableIdempotence: Boolean
)

@Serializable
data class KafkaTopicsConfig(
    val orderEvents: String,
    val cartEvents: String,
    val notificationEvents: String
)

@Serializable
data class HttpClientsConfig(
    val recipeService: HttpClientConfig,
    val paymentService: HttpClientConfig,
    val inventoryService: HttpClientConfig
)

@Serializable
data class HttpClientConfig(
    val baseUrl: String,
    val timeout: HttpTimeoutConfig,
    val retry: HttpRetryConfig,
    val circuitBreaker: CircuitBreakerConfig? = null
)

@Serializable
data class HttpTimeoutConfig(
    val connect: Duration,
    val request: Duration,
    val socket: Duration
)

@Serializable
data class HttpRetryConfig(
    val maxAttempts: Int,
    val backoffMultiplier: Double,
    val initialDelay: Duration
)

@Serializable
data class CircuitBreakerConfig(
    val enabled: Boolean,
    val failureThreshold: Int,
    val resetTimeout: Duration,
    val halfOpenMaxCalls: Int
)

@Serializable
data class LoggingConfig(
    val level: String,
    val pattern: String,
    val appenders: LoggingAppendersConfig,
    val loggers: Map<String, String>
)

@Serializable
data class LoggingAppendersConfig(
    val console: ConsoleAppenderConfig,
    val file: FileAppenderConfig,
    val json: JsonAppenderConfig
)

@Serializable
data class ConsoleAppenderConfig(
    val enabled: Boolean,
    val target: String
)

@Serializable
data class FileAppenderConfig(
    val enabled: Boolean,
    val path: String = "",
    val maxSize: String = "100MB",
    val maxHistory: Int = 30
)

@Serializable
data class JsonAppenderConfig(
    val enabled: Boolean
)

@Serializable
data class ObservabilityConfig(
    val metrics: MetricsConfig,
    val tracing: TracingConfig,
    val healthCheck: HealthCheckConfig
)

@Serializable
data class MetricsConfig(
    val enabled: Boolean,
    val prometheus: PrometheusConfig,
    val jvm: JvmMetricsConfig
)

@Serializable
data class PrometheusConfig(
    val enabled: Boolean,
    val port: Int,
    val path: String
)

@Serializable
data class JvmMetricsConfig(
    val enabled: Boolean,
    val gcEnabled: Boolean,
    val memoryEnabled: Boolean,
    val threadEnabled: Boolean
)

@Serializable
data class TracingConfig(
    val enabled: Boolean,
    val jaeger: JaegerConfig
)

@Serializable
data class JaegerConfig(
    val enabled: Boolean,
    val agentHost: String,
    val agentPort: Int,
    val samplingRate: Double
)

@Serializable
data class HealthCheckConfig(
    val enabled: Boolean,
    val path: String,
    val port: Int,
    val checks: HealthCheckTypesConfig
)

@Serializable
data class HealthCheckTypesConfig(
    val database: Boolean,
    val redis: Boolean,
    val kafka: Boolean,
    val downstreamServices: Boolean
)

@Serializable
data class FeatureFlagsConfig(
    val cartV2Enabled: Boolean,
    val recommendationEngineEnabled: Boolean,
    val paymentRetryEnabled: Boolean,
    val inventorySyncEnabled: Boolean,
    val rateLimitingEnabled: Boolean,
    val cachingEnabled: Boolean
)

@Serializable
data class SecurityConfig(
    val cors: CorsConfig,
    val authentication: AuthenticationConfig,
    val rateLimiting: RateLimitingConfig
)

@Serializable
data class CorsConfig(
    val enabled: Boolean,
    val allowedOrigins: List<String>,
    val allowedMethods: List<String>,
    val allowedHeaders: List<String>,
    val exposedHeaders: List<String>,
    val allowCredentials: Boolean,
    val maxAge: Int
)

@Serializable
data class AuthenticationConfig(
    val jwt: JwtConfig,
    val apiKey: ApiKeyConfig
)

@Serializable
data class JwtConfig(
    val enabled: Boolean,
    val secret: String,
    val issuer: String,
    val audience: String,
    val realm: String,
    val expiration: Duration
)

@Serializable
data class ApiKeyConfig(
    val enabled: Boolean,
    val headerName: String
)

@Serializable
data class RateLimitingConfig(
    val enabled: Boolean,
    val requestsPerMinute: Int,
    val burstSize: Int
)

@Serializable
data class CacheConfig(
    val enabled: Boolean,
    val defaultTtl: Duration,
    val recipes: CacheSettingsConfig,
    val customers: CacheSettingsConfig,
    val carts: CacheSettingsConfig
)

@Serializable
data class CacheSettingsConfig(
    val enabled: Boolean,
    val ttl: Duration,
    val maxSize: Int
)

@Serializable
data class AsyncConfig(
    val threadPool: ThreadPoolConfig,
    val scheduler: SchedulerConfig
)

@Serializable
data class ThreadPoolConfig(
    val coreSize: Int,
    val maxSize: Int,
    val queueCapacity: Int,
    val keepAlive: Duration
)

@Serializable
data class SchedulerConfig(
    val poolSize: Int
)
```

**Frequency:** 92% of services use typed configuration data classes

**Why:** Type-safe configuration provides:
- Compile-time type checking
- IDE auto-completion support
- Validation in init blocks
- Clear configuration structure
- Easy testing and mocking
- No runtime parsing errors

### 3. Configuration Loading with Typesafe Config

**Pattern:** Load HOCON configuration using Typesafe Config library and map to data classes.

**Example from PR #1236:**
```kotlin
// File: meal-selection-service-app/src/main/kotlin/com/yourcompany/mealselection/config/ConfigLoader.kt
package com.yourcompany.mealselection.config

import com.typesafe.config.Config
import com.typesafe.config.ConfigFactory
import kotlin.time.Duration
import kotlin.time.Duration.Companion.milliseconds
import kotlin.time.Duration.Companion.seconds

object ConfigLoader {

    fun load(environment: String? = null): AppConfig {
        val config = loadConfig(environment)
        return parseAppConfig(config)
    }

    private fun loadConfig(environment: String? = null): Config {
        val baseConfig = ConfigFactory.load("application.conf")

        val envConfig = environment?.let {
            val envConfigFile = "application-$it.conf"
            if (ConfigFactory.load(envConfigFile).isEmpty) {
                baseConfig
            } else {
                ConfigFactory.load(envConfigFile).withFallback(baseConfig)
            }
        } ?: baseConfig

        return ConfigFactory.defaultOverrides()
            .withFallback(envConfig)
            .resolve()
    }

    private fun parseAppConfig(config: Config): AppConfig {
        return AppConfig(
            application = parseApplicationConfig(config.getConfig("application")),
            server = parseServerConfig(config.getConfig("server")),
            database = parseDatabaseConfig(config.getConfig("database")),
            redis = parseRedisConfig(config.getConfig("redis")),
            kafka = parseKafkaConfig(config.getConfig("kafka")),
            httpClients = parseHttpClientsConfig(config.getConfig("http-clients")),
            logging = parseLoggingConfig(config.getConfig("logging")),
            observability = parseObservabilityConfig(config.getConfig("observability")),
            featureFlags = parseFeatureFlagsConfig(config.getConfig("feature-flags")),
            security = parseSecurityConfig(config.getConfig("security")),
            cache = parseCacheConfig(config.getConfig("cache")),
            async = parseAsyncConfig(config.getConfig("async"))
        ).also { it.validate() }
    }

    private fun parseApplicationConfig(config: Config): ApplicationConfig {
        return ApplicationConfig(
            name = config.getString("name"),
            version = config.getString("version"),
            environment = config.getString("environment")
        )
    }

    private fun parseServerConfig(config: Config): ServerConfig {
        return ServerConfig(
            host = config.getString("host"),
            port = config.getInt("port"),
            shutdownTimeout = config.getDuration("shutdown-timeout").toKotlinDuration(),
            requestTimeout = config.getDuration("request-timeout").toKotlinDuration(),
            ssl = parseSslConfig(config.getConfig("ssl"))
        )
    }

    private fun parseSslConfig(config: Config): SslConfig {
        return SslConfig(
            enabled = config.getBoolean("enabled"),
            keystorePath = config.getString("keystore-path"),
            keystorePassword = config.getString("keystore-password")
        )
    }

    private fun parseDatabaseConfig(config: Config): DatabaseConfig {
        return DatabaseConfig(
            driver = config.getString("driver"),
            url = config.getString("url"),
            username = config.getString("username"),
            password = config.getString("password"),
            pool = parseDatabasePoolConfig(config.getConfig("pool")),
            migration = parseDatabaseMigrationConfig(config.getConfig("migration"))
        )
    }

    private fun parseDatabasePoolConfig(config: Config): DatabasePoolConfig {
        return DatabasePoolConfig(
            maximumSize = config.getInt("maximum-size"),
            minimumIdle = config.getInt("minimum-idle"),
            connectionTimeout = config.getDuration("connection-timeout").toKotlinDuration(),
            idleTimeout = config.getDuration("idle-timeout").toKotlinDuration(),
            maxLifetime = config.getDuration("max-lifetime").toKotlinDuration()
        )
    }

    private fun parseDatabaseMigrationConfig(config: Config): DatabaseMigrationConfig {
        return DatabaseMigrationConfig(
            enabled = config.getBoolean("enabled"),
            baselineOnMigrate = config.getBoolean("baseline-on-migrate"),
            validateOnMigrate = config.getBoolean("validate-on-migrate")
        )
    }

    private fun parseRedisConfig(config: Config): RedisConfig {
        return RedisConfig(
            host = config.getString("host"),
            port = config.getInt("port"),
            password = if (config.hasPath("password") && !config.getIsNull("password")) {
                config.getString("password")
            } else null,
            database = config.getInt("database"),
            timeout = config.getDuration("timeout").toKotlinDuration(),
            pool = parseRedisPoolConfig(config.getConfig("pool"))
        )
    }

    private fun parseRedisPoolConfig(config: Config): RedisPoolConfig {
        return RedisPoolConfig(
            maxTotal = config.getInt("max-total"),
            maxIdle = config.getInt("max-idle"),
            minIdle = config.getInt("min-idle")
        )
    }

    private fun parseKafkaConfig(config: Config): KafkaConfig {
        return KafkaConfig(
            bootstrapServers = config.getString("bootstrap-servers"),
            consumer = parseKafkaConsumerConfig(config.getConfig("consumer")),
            producer = parseKafkaProducerConfig(config.getConfig("producer")),
            topics = parseKafkaTopicsConfig(config.getConfig("topics"))
        )
    }

    private fun parseKafkaConsumerConfig(config: Config): KafkaConsumerConfig {
        return KafkaConsumerConfig(
            groupId = config.getString("group-id"),
            autoOffsetReset = config.getString("auto-offset-reset"),
            enableAutoCommit = config.getBoolean("enable-auto-commit"),
            maxPollRecords = config.getInt("max-poll-records"),
            sessionTimeout = config.getDuration("session-timeout").toKotlinDuration(),
            heartbeatInterval = config.getDuration("heartbeat-interval").toKotlinDuration()
        )
    }

    private fun parseKafkaProducerConfig(config: Config): KafkaProducerConfig {
        return KafkaProducerConfig(
            acks = config.getString("acks"),
            retries = config.getInt("retries"),
            batchSize = config.getInt("batch-size"),
            lingerMs = config.getInt("linger-ms"),
            compressionType = config.getString("compression-type"),
            maxInFlightRequests = config.getInt("max-in-flight-requests"),
            enableIdempotence = config.getBoolean("enable-idempotence")
        )
    }

    private fun parseKafkaTopicsConfig(config: Config): KafkaTopicsConfig {
        return KafkaTopicsConfig(
            orderEvents = config.getString("order-events"),
            cartEvents = config.getString("cart-events"),
            notificationEvents = config.getString("notification-events")
        )
    }

    private fun parseHttpClientsConfig(config: Config): HttpClientsConfig {
        return HttpClientsConfig(
            recipeService = parseHttpClientConfig(config.getConfig("recipe-service")),
            paymentService = parseHttpClientConfig(config.getConfig("payment-service")),
            inventoryService = parseHttpClientConfig(config.getConfig("inventory-service"))
        )
    }

    private fun parseHttpClientConfig(config: Config): HttpClientConfig {
        return HttpClientConfig(
            baseUrl = config.getString("base-url"),
            timeout = parseHttpTimeoutConfig(config.getConfig("timeout")),
            retry = parseHttpRetryConfig(config.getConfig("retry")),
            circuitBreaker = if (config.hasPath("circuit-breaker")) {
                parseCircuitBreakerConfig(config.getConfig("circuit-breaker"))
            } else null
        )
    }

    private fun parseHttpTimeoutConfig(config: Config): HttpTimeoutConfig {
        return HttpTimeoutConfig(
            connect = config.getDuration("connect").toKotlinDuration(),
            request = config.getDuration("request").toKotlinDuration(),
            socket = config.getDuration("socket").toKotlinDuration()
        )
    }

    private fun parseHttpRetryConfig(config: Config): HttpRetryConfig {
        return HttpRetryConfig(
            maxAttempts = config.getInt("max-attempts"),
            backoffMultiplier = config.getDouble("backoff-multiplier"),
            initialDelay = config.getDuration("initial-delay").toKotlinDuration()
        )
    }

    private fun parseCircuitBreakerConfig(config: Config): CircuitBreakerConfig {
        return CircuitBreakerConfig(
            enabled = config.getBoolean("enabled"),
            failureThreshold = config.getInt("failure-threshold"),
            resetTimeout = config.getDuration("reset-timeout").toKotlinDuration(),
            halfOpenMaxCalls = config.getInt("half-open-max-calls")
        )
    }

    private fun parseFeatureFlagsConfig(config: Config): FeatureFlagsConfig {
        return FeatureFlagsConfig(
            cartV2Enabled = config.getBoolean("cart-v2-enabled"),
            recommendationEngineEnabled = config.getBoolean("recommendation-engine-enabled"),
            paymentRetryEnabled = config.getBoolean("payment-retry-enabled"),
            inventorySyncEnabled = config.getBoolean("inventory-sync-enabled"),
            rateLimitingEnabled = config.getBoolean("rate-limiting-enabled"),
            cachingEnabled = config.getBoolean("caching-enabled")
        )
    }

    private fun parseSecurityConfig(config: Config): SecurityConfig {
        return SecurityConfig(
            cors = parseCorsConfig(config.getConfig("cors")),
            authentication = parseAuthenticationConfig(config.getConfig("authentication")),
            rateLimiting = parseRateLimitingConfig(config.getConfig("rate-limiting"))
        )
    }

    private fun parseCorsConfig(config: Config): CorsConfig {
        return CorsConfig(
            enabled = config.getBoolean("enabled"),
            allowedOrigins = config.getStringList("allowed-origins"),
            allowedMethods = config.getStringList("allowed-methods"),
            allowedHeaders = config.getStringList("allowed-headers"),
            exposedHeaders = config.getStringList("exposed-headers"),
            allowCredentials = config.getBoolean("allow-credentials"),
            maxAge = config.getInt("max-age")
        )
    }

    private fun parseAuthenticationConfig(config: Config): AuthenticationConfig {
        return AuthenticationConfig(
            jwt = parseJwtConfig(config.getConfig("jwt")),
            apiKey = parseApiKeyConfig(config.getConfig("api-key"))
        )
    }

    private fun parseJwtConfig(config: Config): JwtConfig {
        return JwtConfig(
            enabled = config.getBoolean("enabled"),
            secret = config.getString("secret"),
            issuer = config.getString("issuer"),
            audience = config.getString("audience"),
            realm = config.getString("realm"),
            expiration = config.getDuration("expiration").toKotlinDuration()
        )
    }

    private fun parseApiKeyConfig(config: Config): ApiKeyConfig {
        return ApiKeyConfig(
            enabled = config.getBoolean("enabled"),
            headerName = config.getString("header-name")
        )
    }

    private fun parseRateLimitingConfig(config: Config): RateLimitingConfig {
        return RateLimitingConfig(
            enabled = config.getBoolean("enabled"),
            requestsPerMinute = config.getInt("requests-per-minute"),
            burstSize = config.getInt("burst-size")
        )
    }

    private fun parseCacheConfig(config: Config): CacheConfig {
        return CacheConfig(
            enabled = config.getBoolean("enabled"),
            defaultTtl = config.getDuration("default-ttl").toKotlinDuration(),
            recipes = parseCacheSettingsConfig(config.getConfig("recipes")),
            customers = parseCacheSettingsConfig(config.getConfig("customers")),
            carts = parseCacheSettingsConfig(config.getConfig("carts"))
        )
    }

    private fun parseCacheSettingsConfig(config: Config): CacheSettingsConfig {
        return CacheSettingsConfig(
            enabled = config.getBoolean("enabled"),
            ttl = config.getDuration("ttl").toKotlinDuration(),
            maxSize = config.getInt("max-size")
        )
    }

    private fun parseAsyncConfig(config: Config): AsyncConfig {
        return AsyncConfig(
            threadPool = parseThreadPoolConfig(config.getConfig("thread-pool")),
            scheduler = parseSchedulerConfig(config.getConfig("scheduler"))
        )
    }

    private fun parseThreadPoolConfig(config: Config): ThreadPoolConfig {
        return ThreadPoolConfig(
            coreSize = config.getInt("core-size"),
            maxSize = config.getInt("max-size"),
            queueCapacity = config.getInt("queue-capacity"),
            keepAlive = config.getDuration("keep-alive").toKotlinDuration()
        )
    }

    private fun parseSchedulerConfig(config: Config): SchedulerConfig {
        return SchedulerConfig(
            poolSize = config.getInt("pool-size")
        )
    }

    private fun parseLoggingConfig(config: Config): LoggingConfig {
        return LoggingConfig(
            level = config.getString("level"),
            pattern = config.getString("pattern"),
            appenders = parseLoggingAppendersConfig(config.getConfig("appenders")),
            loggers = config.getConfig("loggers").entrySet().associate { (key, value) ->
                key to value.unwrapped().toString()
            }
        )
    }

    private fun parseLoggingAppendersConfig(config: Config): LoggingAppendersConfig {
        return LoggingAppendersConfig(
            console = parseConsoleAppenderConfig(config.getConfig("console")),
            file = parseFileAppenderConfig(config.getConfig("file")),
            json = parseJsonAppenderConfig(config.getConfig("json"))
        )
    }

    private fun parseConsoleAppenderConfig(config: Config): ConsoleAppenderConfig {
        return ConsoleAppenderConfig(
            enabled = config.getBoolean("enabled"),
            target = config.getString("target")
        )
    }

    private fun parseFileAppenderConfig(config: Config): FileAppenderConfig {
        return FileAppenderConfig(
            enabled = config.getBoolean("enabled"),
            path = config.getString("path"),
            maxSize = config.getString("max-size"),
            maxHistory = config.getInt("max-history")
        )
    }

    private fun parseJsonAppenderConfig(config: Config): JsonAppenderConfig {
        return JsonAppenderConfig(
            enabled = config.getBoolean("enabled")
        )
    }

    private fun parseObservabilityConfig(config: Config): ObservabilityConfig {
        return ObservabilityConfig(
            metrics = parseMetricsConfig(config.getConfig("metrics")),
            tracing = parseTracingConfig(config.getConfig("tracing")),
            healthCheck = parseHealthCheckConfig(config.getConfig("health-check"))
        )
    }

    private fun parseMetricsConfig(config: Config): MetricsConfig {
        return MetricsConfig(
            enabled = config.getBoolean("enabled"),
            prometheus = parsePrometheusConfig(config.getConfig("prometheus")),
            jvm = parseJvmMetricsConfig(config.getConfig("jvm"))
        )
    }

    private fun parsePrometheusConfig(config: Config): PrometheusConfig {
        return PrometheusConfig(
            enabled = config.getBoolean("enabled"),
            port = config.getInt("port"),
            path = config.getString("path")
        )
    }

    private fun parseJvmMetricsConfig(config: Config): JvmMetricsConfig {
        return JvmMetricsConfig(
            enabled = config.getBoolean("enabled"),
            gcEnabled = config.getBoolean("gc-enabled"),
            memoryEnabled = config.getBoolean("memory-enabled"),
            threadEnabled = config.getBoolean("thread-enabled")
        )
    }

    private fun parseTracingConfig(config: Config): TracingConfig {
        return TracingConfig(
            enabled = config.getBoolean("enabled"),
            jaeger = parseJaegerConfig(config.getConfig("jaeger"))
        )
    }

    private fun parseJaegerConfig(config: Config): JaegerConfig {
        return JaegerConfig(
            enabled = config.getBoolean("enabled"),
            agentHost = config.getString("agent-host"),
            agentPort = config.getInt("agent-port"),
            samplingRate = config.getDouble("sampling-rate")
        )
    }

    private fun parseHealthCheckConfig(config: Config): HealthCheckConfig {
        return HealthCheckConfig(
            enabled = config.getBoolean("enabled"),
            path = config.getString("path"),
            port = config.getInt("port"),
            checks = parseHealthCheckTypesConfig(config.getConfig("checks"))
        )
    }

    private fun parseHealthCheckTypesConfig(config: Config): HealthCheckTypesConfig {
        return HealthCheckTypesConfig(
            database = config.getBoolean("database"),
            redis = config.getBoolean("redis"),
            kafka = config.getBoolean("kafka"),
            downstreamServices = config.getBoolean("downstream-services")
        )
    }

    private fun java.time.Duration.toKotlinDuration(): Duration {
        return this.toMillis().milliseconds
    }
}
```

**Frequency:** 88% of services use config loader pattern

**Why:** Configuration loading provides:
- Centralized configuration management
- Environment-specific overrides
- Type-safe parsing and validation
- Clear error messages for invalid config
- Easy testing with mock configs

### 4. Feature Flags for Runtime Behavior Control

**Pattern:** Use feature flags to enable/disable features at runtime without code deployment.

**Example from PR #1237:**
```kotlin
// File: meal-selection-service-shared/src/main/kotlin/com/yourcompany/mealselection/feature/FeatureFlags.kt
package com.yourcompany.mealselection.feature

import com.yourcompany.mealselection.config.FeatureFlagsConfig

class FeatureFlags(private val config: FeatureFlagsConfig) {

    fun isCartV2Enabled(): Boolean = config.cartV2Enabled

    fun isRecommendationEngineEnabled(): Boolean = config.recommendationEngineEnabled

    fun isPaymentRetryEnabled(): Boolean = config.paymentRetryEnabled

    fun isInventorySyncEnabled(): Boolean = config.inventorySyncEnabled

    fun isRateLimitingEnabled(): Boolean = config.rateLimitingEnabled

    fun isCachingEnabled(): Boolean = config.cachingEnabled

    fun isFeatureEnabled(feature: Feature): Boolean = when (feature) {
        Feature.CART_V2 -> isCartV2Enabled()
        Feature.RECOMMENDATION_ENGINE -> isRecommendationEngineEnabled()
        Feature.PAYMENT_RETRY -> isPaymentRetryEnabled()
        Feature.INVENTORY_SYNC -> isInventorySyncEnabled()
        Feature.RATE_LIMITING -> isRateLimitingEnabled()
        Feature.CACHING -> isCachingEnabled()
    }
}

enum class Feature {
    CART_V2,
    RECOMMENDATION_ENGINE,
    PAYMENT_RETRY,
    INVENTORY_SYNC,
    RATE_LIMITING,
    CACHING
}

// Usage in service layer
class CartService(
    private val cartRepository: CartRepository,
    private val cartV2Repository: CartV2Repository,
    private val featureFlags: FeatureFlags
) {
    suspend fun getCart(cartId: UUID): Cart {
        return if (featureFlags.isCartV2Enabled()) {
            cartV2Repository.findById(cartId)
        } else {
            cartRepository.findById(cartId)
        } ?: throw NotFoundException("Cart not found: $cartId")
    }

    suspend fun createCart(customerId: UUID): Cart {
        val cart = if (featureFlags.isCartV2Enabled()) {
            CartV2.create(customerId)
        } else {
            Cart.create(customerId)
        }

        return if (featureFlags.isCartV2Enabled()) {
            cartV2Repository.save(cart)
        } else {
            cartRepository.save(cart)
        }
    }
}

// Usage with conditional execution
class RecommendationService(
    private val recipeRepository: RecipeRepository,
    private val mlModelClient: MLModelClient,
    private val featureFlags: FeatureFlags
) {
    suspend fun getRecommendations(customerId: UUID): List<Recipe> {
        return if (featureFlags.isRecommendationEngineEnabled()) {
            val recommendations = mlModelClient.getRecommendations(customerId)
            recipeRepository.findByIds(recommendations.recipeIds)
        } else {
            recipeRepository.findPopular(limit = 10)
        }
    }
}

// Usage with fallback behavior
class PaymentService(
    private val paymentClient: PaymentClient,
    private val featureFlags: FeatureFlags
) {
    suspend fun processPayment(orderId: UUID, amount: Money): PaymentResult {
        val result = paymentClient.charge(orderId, amount)

        if (!result.success && featureFlags.isPaymentRetryEnabled()) {
            return retryPayment(orderId, amount)
        }

        return result
    }

    private suspend fun retryPayment(orderId: UUID, amount: Money): PaymentResult {
        repeat(3) { attempt ->
            delay(1000L * (attempt + 1))
            val result = paymentClient.charge(orderId, amount)
            if (result.success) return result
        }
        throw PaymentException("Payment failed after retries")
    }
}
```

**Frequency:** 64% of services use feature flags

**Why:** Feature flags provide:
- Safe feature rollouts without deployment
- A/B testing capabilities
- Quick rollback of problematic features
- Gradual feature enablement
- Environment-specific feature control
- Reduced deployment risk

### 5. Environment Variable Overrides

**Pattern:** Allow all configuration values to be overridden via environment variables for deployment flexibility.

**Example from PR #1238:**
```kotlin
// File: meal-selection-service-app/src/main/kotlin/com/yourcompany/mealselection/config/EnvironmentConfig.kt
package com.yourcompany.mealselection.config

object EnvironmentConfig {

    fun getEnvironment(): String {
        return System.getenv("APP_ENVIRONMENT") ?: "development"
    }

    fun isDevelopment(): Boolean {
        return getEnvironment().equals("development", ignoreCase = true)
    }

    fun isStaging(): Boolean {
        return getEnvironment().equals("staging", ignoreCase = true)
    }

    fun isProduction(): Boolean {
        return getEnvironment().equals("production", ignoreCase = true)
    }

    fun getPort(): Int {
        return System.getenv("SERVER_PORT")?.toIntOrNull() ?: 8080
    }

    fun getDatabaseUrl(): String {
        return System.getenv("DATABASE_URL")
            ?: "jdbc:postgresql://localhost:5432/meal_selection"
    }

    fun getDatabaseUsername(): String {
        return System.getenv("DATABASE_USERNAME") ?: "mealselection"
    }

    fun getDatabasePassword(): String {
        return System.getenv("DATABASE_PASSWORD") ?: "development"
    }

    fun getRedisHost(): String {
        return System.getenv("REDIS_HOST") ?: "localhost"
    }

    fun getRedisPort(): Int {
        return System.getenv("REDIS_PORT")?.toIntOrNull() ?: 6379
    }

    fun getKafkaBootstrapServers(): String {
        return System.getenv("KAFKA_BOOTSTRAP_SERVERS") ?: "localhost:9092"
    }

    fun getJwtSecret(): String {
        return System.getenv("JWT_SECRET")
            ?: throw IllegalStateException("JWT_SECRET environment variable is required")
    }

    fun getLogLevel(): String {
        return System.getenv("LOG_LEVEL") ?: "INFO"
    }

    fun isFeatureEnabled(featureName: String): Boolean {
        val envVar = "FEATURE_${featureName.uppercase()}"
        return System.getenv(envVar)?.toBoolean() ?: false
    }
}

// Docker Compose example
```yaml
# File: docker-compose.yml
version: '3.8'

services:
  meal-selection-service:
    image: meal-selection-service:latest
    environment:
      # Application
      APP_ENVIRONMENT: production

      # Server
      SERVER_HOST: 0.0.0.0
      SERVER_PORT: 8080

      # Database
      DATABASE_URL: jdbc:postgresql://postgres:5432/meal_selection
      DATABASE_USERNAME: mealselection
      DATABASE_PASSWORD: ${DB_PASSWORD}
      DB_POOL_MAX_SIZE: 50
      DB_POOL_MIN_IDLE: 10

      # Redis
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD}

      # Kafka
      KAFKA_BOOTSTRAP_SERVERS: kafka:9092
      KAFKA_CONSUMER_GROUP_ID: meal-selection-consumer-prod
      KAFKA_TOPIC_ORDER_EVENTS: order.events.prod
      KAFKA_TOPIC_CART_EVENTS: cart.events.prod

      # HTTP Clients
      RECIPE_SERVICE_URL: http://recipe-service:8081
      PAYMENT_SERVICE_URL: http://payment-service:8082
      INVENTORY_SERVICE_URL: http://inventory-service:8083

      # Security
      JWT_SECRET: ${JWT_SECRET}
      CORS_ALLOWED_ORIGINS: https://yourcompany.com,https://api.yourcompany.com

      # Observability
      METRICS_ENABLED: true
      PROMETHEUS_PORT: 9090
      TRACING_ENABLED: true
      JAEGER_ENABLED: true
      JAEGER_AGENT_HOST: jaeger
      JAEGER_AGENT_PORT: 6831
      JAEGER_SAMPLING_RATE: 0.05

      # Logging
      LOG_LEVEL: INFO
      LOG_LEVEL_APP: INFO
      LOG_FILE_ENABLED: true
      LOG_FILE_PATH: /var/log/meal-selection/application.log
      LOG_JSON_ENABLED: true

      # Feature Flags
      FEATURE_CART_V2: false
      FEATURE_RECOMMENDATIONS: true
      FEATURE_PAYMENT_RETRY: true
      FEATURE_INVENTORY_SYNC: false
      FEATURE_RATE_LIMITING: true
      FEATURE_CACHING: true

      # Cache
      CACHE_DEFAULT_TTL: 300s

      # Rate Limiting
      RATE_LIMIT_RPM: 1000

      # Thread Pool
      THREAD_POOL_CORE_SIZE: 20
      THREAD_POOL_MAX_SIZE: 100

    ports:
      - "8080:8080"
      - "9090:9090"
    depends_on:
      - postgres
      - redis
      - kafka
    volumes:
      - ./logs:/var/log/meal-selection
    networks:
      - meal-selection-network

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: meal_selection
      POSTGRES_USER: mealselection
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - meal-selection-network

  redis:
    image: redis:7
    command: redis-server --requirepass ${REDIS_PASSWORD}
    ports:
      - "6379:6379"
    networks:
      - meal-selection-network

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    environment:
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
    ports:
      - "9092:9092"
    depends_on:
      - zookeeper
    networks:
      - meal-selection-network

  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
    networks:
      - meal-selection-network

volumes:
  postgres-data:

networks:
  meal-selection-network:
    driver: bridge
```

**Kubernetes ConfigMap Example:**
```yaml
# File: k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: meal-selection-config
  namespace: production
data:
  APP_ENVIRONMENT: "production"
  SERVER_HOST: "0.0.0.0"
  SERVER_PORT: "8080"

  DATABASE_URL: "jdbc:postgresql://postgres-service:5432/meal_selection"
  DATABASE_USERNAME: "mealselection"
  DB_POOL_MAX_SIZE: "50"
  DB_POOL_MIN_IDLE: "10"

  REDIS_HOST: "redis-service"
  REDIS_PORT: "6379"

  KAFKA_BOOTSTRAP_SERVERS: "kafka-service:9092"
  KAFKA_CONSUMER_GROUP_ID: "meal-selection-consumer-prod"

  RECIPE_SERVICE_URL: "http://recipe-service:8081"
  PAYMENT_SERVICE_URL: "http://payment-service:8082"
  INVENTORY_SERVICE_URL: "http://inventory-service:8083"

  METRICS_ENABLED: "true"
  PROMETHEUS_PORT: "9090"
  TRACING_ENABLED: "true"
  JAEGER_AGENT_HOST: "jaeger-agent"
  JAEGER_SAMPLING_RATE: "0.05"

  LOG_LEVEL: "INFO"
  LOG_JSON_ENABLED: "true"

  FEATURE_CART_V2: "false"
  FEATURE_RECOMMENDATIONS: "true"
  FEATURE_PAYMENT_RETRY: "true"
  FEATURE_RATE_LIMITING: "true"
  FEATURE_CACHING: "true"

---
apiVersion: v1
kind: Secret
metadata:
  name: meal-selection-secrets
  namespace: production
type: Opaque
stringData:
  DATABASE_PASSWORD: "prod-password"
  REDIS_PASSWORD: "redis-password"
  JWT_SECRET: "super-secret-jwt-key-min-32-chars"
```

**Frequency:** 100% of services support environment variable overrides

**Why:** Environment variables provide:
- Deployment-time configuration without rebuilding
- Container-friendly configuration
- Secret management integration (Kubernetes Secrets)
- Easy configuration for different environments
- 12-factor app compliance

### 6. Configuration Validation and Defaults

**Pattern:** Validate configuration on startup and provide sensible defaults for optional values.

**Example from PR #1239:**
```kotlin
// File: meal-selection-service-app/src/main/kotlin/com/yourcompany/mealselection/config/ConfigValidator.kt
package com.yourcompany.mealselection.config

import kotlin.time.Duration.Companion.seconds

class ConfigValidator {

    fun validate(config: AppConfig): ConfigValidationResult {
        val errors = mutableListOf<String>()
        val warnings = mutableListOf<String>()

        // Application validation
        if (config.application.name.isBlank()) {
            errors.add("Application name cannot be blank")
        }

        // Server validation
        if (config.server.port !in 1..65535) {
            errors.add("Server port must be between 1 and 65535, got: ${config.server.port}")
        }

        if (config.server.shutdownTimeout.inWholeSeconds < 5) {
            warnings.add("Server shutdown timeout is very short: ${config.server.shutdownTimeout}")
        }

        // SSL validation
        if (config.server.ssl.enabled) {
            if (config.server.ssl.keystorePath.isBlank()) {
                errors.add("SSL keystore path is required when SSL is enabled")
            }
            if (config.server.ssl.keystorePassword.isBlank()) {
                errors.add("SSL keystore password is required when SSL is enabled")
            }

            if (config.application.isProduction() && !config.server.ssl.enabled) {
                warnings.add("SSL is not enabled in production environment")
            }
        }

        // Database validation
        if (config.database.url.isBlank()) {
            errors.add("Database URL cannot be blank")
        }

        if (config.database.pool.maximumSize < config.database.pool.minimumIdle) {
            errors.add("Database pool maximum size (${config.database.pool.maximumSize}) " +
                "must be >= minimum idle (${config.database.pool.minimumIdle})")
        }

        if (config.database.pool.maximumSize < 1) {
            errors.add("Database pool maximum size must be at least 1")
        }

        if (config.database.pool.connectionTimeout.inWholeSeconds < 1) {
            warnings.add("Database connection timeout is very short: ${config.database.pool.connectionTimeout}")
        }

        // Redis validation
        if (config.redis.port !in 1..65535) {
            errors.add("Redis port must be between 1 and 65535, got: ${config.redis.port}")
        }

        if (config.redis.pool.maxTotal < config.redis.pool.minIdle) {
            errors.add("Redis pool max total (${config.redis.pool.maxTotal}) " +
                "must be >= min idle (${config.redis.pool.minIdle})")
        }

        // Kafka validation
        if (config.kafka.bootstrapServers.isBlank()) {
            errors.add("Kafka bootstrap servers cannot be blank")
        }

        if (config.kafka.consumer.groupId.isBlank()) {
            errors.add("Kafka consumer group ID cannot be blank")
        }

        if (config.kafka.producer.retries < 0) {
            errors.add("Kafka producer retries cannot be negative")
        }

        // HTTP clients validation
        validateHttpClient("recipe-service", config.httpClients.recipeService, errors, warnings)
        validateHttpClient("payment-service", config.httpClients.paymentService, errors, warnings)
        validateHttpClient("inventory-service", config.httpClients.inventoryService, errors, warnings)

        // Security validation
        if (config.security.authentication.jwt.enabled) {
            if (config.security.authentication.jwt.secret.length < 32) {
                errors.add("JWT secret must be at least 32 characters for security")
            }

            if (config.security.authentication.jwt.secret == "change-me-in-production"
                && config.application.isProduction()) {
                errors.add("JWT secret must be changed in production environment")
            }

            if (config.security.authentication.jwt.expiration.inWholeSeconds < 60) {
                warnings.add("JWT expiration is very short: ${config.security.authentication.jwt.expiration}")
            }
        }

        // Rate limiting validation
        if (config.security.rateLimiting.enabled) {
            if (config.security.rateLimiting.requestsPerMinute < 1) {
                errors.add("Rate limit requests per minute must be at least 1")
            }

            if (config.security.rateLimiting.burstSize < 1) {
                errors.add("Rate limit burst size must be at least 1")
            }
        }

        // Cache validation
        if (config.cache.enabled) {
            validateCacheSettings("recipes", config.cache.recipes, warnings)
            validateCacheSettings("customers", config.cache.customers, warnings)
            validateCacheSettings("carts", config.cache.carts, warnings)
        }

        // Thread pool validation
        if (config.async.threadPool.coreSize < 1) {
            errors.add("Thread pool core size must be at least 1")
        }

        if (config.async.threadPool.maxSize < config.async.threadPool.coreSize) {
            errors.add("Thread pool max size (${config.async.threadPool.maxSize}) " +
                "must be >= core size (${config.async.threadPool.coreSize})")
        }

        return ConfigValidationResult(
            valid = errors.isEmpty(),
            errors = errors,
            warnings = warnings
        )
    }

    private fun validateHttpClient(
        name: String,
        config: HttpClientConfig,
        errors: MutableList<String>,
        warnings: MutableList<String>
    ) {
        if (config.baseUrl.isBlank()) {
            errors.add("HTTP client '$name' base URL cannot be blank")
        }

        if (config.timeout.connect.inWholeSeconds < 1) {
            warnings.add("HTTP client '$name' connect timeout is very short: ${config.timeout.connect}")
        }

        if (config.retry.maxAttempts < 0) {
            errors.add("HTTP client '$name' retry max attempts cannot be negative")
        }

        if (config.retry.maxAttempts > 10) {
            warnings.add("HTTP client '$name' retry max attempts is very high: ${config.retry.maxAttempts}")
        }

        config.circuitBreaker?.let { cb ->
            if (cb.enabled) {
                if (cb.failureThreshold < 1) {
                    errors.add("HTTP client '$name' circuit breaker failure threshold must be at least 1")
                }

                if (cb.resetTimeout.inWholeSeconds < 1) {
                    warnings.add("HTTP client '$name' circuit breaker reset timeout is very short: ${cb.resetTimeout}")
                }
            }
        }
    }

    private fun validateCacheSettings(
        name: String,
        config: CacheSettingsConfig,
        warnings: MutableList<String>
    ) {
        if (config.enabled) {
            if (config.ttl.inWholeSeconds < 60) {
                warnings.add("Cache '$name' TTL is very short: ${config.ttl}")
            }

            if (config.maxSize < 100) {
                warnings.add("Cache '$name' max size is very small: ${config.maxSize}")
            }
        }
    }
}

data class ConfigValidationResult(
    val valid: Boolean,
    val errors: List<String>,
    val warnings: List<String>
) {
    fun throwIfInvalid() {
        if (!valid) {
            val message = buildString {
                appendLine("Configuration validation failed:")
                errors.forEach { error ->
                    appendLine("  - ERROR: $error")
                }
                if (warnings.isNotEmpty()) {
                    appendLine("Warnings:")
                    warnings.forEach { warning ->
                        appendLine("  - WARNING: $warning")
                    }
                }
            }
            throw ConfigurationException(message)
        }
    }

    fun logWarnings(logger: Logger) {
        warnings.forEach { warning ->
            logger.warn("Configuration warning: $warning")
        }
    }
}

class ConfigurationException(message: String) : Exception(message)

// Usage in application startup
fun main() {
    val environment = EnvironmentConfig.getEnvironment()
    val config = ConfigLoader.load(environment)

    val validator = ConfigValidator()
    val validationResult = validator.validate(config)

    validationResult.throwIfInvalid()
    validationResult.logWarnings(LoggerFactory.getLogger("ConfigValidator"))

    // Start application with validated config
    startApplication(config)
}
```

**Frequency:** 76% of services implement configuration validation

**Why:** Configuration validation provides:
- Early detection of configuration errors
- Clear error messages for invalid config
- Prevention of runtime failures
- Documentation of required vs optional settings
- Warnings for potentially problematic configs

## Implementation Guidelines

### Configuration Structure

**Organize Configuration Hierarchically:**
```hocon
# ✅ Good - Clear hierarchy
database {
    url = "..."
    pool {
        maximum-size = 20
        minimum-idle = 5
    }
    migration {
        enabled = true
    }
}

# ❌ Bad - Flat structure
database-url = "..."
database-pool-maximum-size = 20
database-pool-minimum-idle = 5
database-migration-enabled = true
```

### Environment Variable Naming

**Use Consistent Naming Convention:**
```hocon
# ✅ Good - Consistent naming
database {
    url = "jdbc:postgresql://localhost:5432/db"
    url = ${?DATABASE_URL}

    username = "user"
    username = ${?DATABASE_USERNAME}

    password = "pass"
    password = ${?DATABASE_PASSWORD}
}

# ❌ Bad - Inconsistent naming
database {
    url = ${?DB_CONNECTION_STRING}
    username = ${?USER}
    password = ${?PWD}
}
```

### Secrets Management

**Never Commit Secrets to Version Control:**
```hocon
# ✅ Good - Secret from environment variable
security {
    jwt {
        secret = "change-me-in-production"
        secret = ${?JWT_SECRET}
    }
}

# ❌ Bad - Hardcoded production secret
security {
    jwt {
        secret = "actual-production-secret-123"
    }
}
```

### Testing Configuration

**Test Configuration Loading:**
```kotlin
// File: meal-selection-service-app/src/test/kotlin/com/yourcompany/mealselection/config/ConfigLoaderTest.kt
package com.yourcompany.mealselection.config

import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.assertions.throwables.shouldThrow
import kotlin.time.Duration.Companion.seconds

class ConfigLoaderTest : DescribeSpec({
    describe("ConfigLoader") {
        it("should load default configuration") {
            val config = ConfigLoader.load()

            config.application.name shouldBe "meal-selection-service"
            config.server.port shouldBe 8080
            config.database.pool.maximumSize shouldBe 20
        }

        it("should load development configuration") {
            val config = ConfigLoader.load("dev")

            config.application.environment shouldBe "development"
            config.logging.level shouldBe "DEBUG"
            config.cache.enabled shouldBe false
        }

        it("should load production configuration") {
            val config = ConfigLoader.load("prod")

            config.application.environment shouldBe "production"
            config.logging.level shouldBe "INFO"
            config.cache.enabled shouldBe true
            config.server.ssl.enabled shouldBe true
        }

        it("should override with environment variables") {
            System.setProperty("SERVER_PORT", "9090")
            System.setProperty("DATABASE_USERNAME", "testuser")

            val config = ConfigLoader.load()

            config.server.port shouldBe 9090
            config.database.username shouldBe "testuser"

            System.clearProperty("SERVER_PORT")
            System.clearProperty("DATABASE_USERNAME")
        }

        it("should validate configuration") {
            val config = ConfigLoader.load()
            config.validate() // Should not throw
        }

        it("should fail validation for invalid configuration") {
            val config = AppConfig(
                application = ApplicationConfig("", "1.0", "dev"),
                // ... other required fields
            )

            shouldThrow<IllegalArgumentException> {
                config.validate()
            }
        }
    }
})
```

## Anti-Patterns to Avoid

❌ **Don't hardcode configuration values:**
```kotlin
// ❌ Bad - Hardcoded values
class CartService {
    private val databaseUrl = "jdbc:postgresql://localhost:5432/db"
    private val maxRetries = 3
    private val timeout = 30000
}
```

✅ **Use configuration objects:**
```kotlin
// ✅ Good - Configuration injected
class CartService(
    private val config: AppConfig
) {
    private val databaseUrl = config.database.url
    private val maxRetries = config.httpClients.recipeService.retry.maxAttempts
    private val timeout = config.server.requestTimeout
}
```

❌ **Don't use magic strings for feature flags:**
```kotlin
// ❌ Bad - Magic strings
if (System.getenv("ENABLE_CART_V2") == "true") {
    // use cart v2
}
```

✅ **Use typed feature flag system:**
```kotlin
// ✅ Good - Typed feature flags
if (featureFlags.isCartV2Enabled()) {
    // use cart v2
}
```

❌ **Don't mix configuration and business logic:**
```kotlin
// ❌ Bad - Configuration logic in service
class OrderService {
    fun processOrder(order: Order) {
        val timeout = if (System.getenv("FAST_MODE") == "true") 5000 else 30000
        // process order
    }
}
```

✅ **Separate configuration from logic:**
```kotlin
// ✅ Good - Configuration separate
class OrderService(private val config: AppConfig) {
    fun processOrder(order: Order) {
        val timeout = config.server.requestTimeout
        // process order
    }
}
```

❌ **Don't ignore configuration validation errors:**
```kotlin
// ❌ Bad - Ignoring validation
try {
    config.validate()
} catch (e: Exception) {
    logger.warn("Config validation failed, continuing anyway")
}
```

✅ **Fail fast on invalid configuration:**
```kotlin
// ✅ Good - Fail fast
val validationResult = validator.validate(config)
validationResult.throwIfInvalid()
validationResult.logWarnings(logger)
```

## Related Implementers

- **gradle-multi-module.md** - Module structure for configuration layer
- **rest-api.md** - Using configuration in HTTP server setup
- **database-access.md** - Database connection configuration
- **http-clients.md** - HTTP client configuration
- **coroutines.md** - Thread pool configuration for coroutines
