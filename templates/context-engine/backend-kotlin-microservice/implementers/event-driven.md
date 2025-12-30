---
domain: event-driven
description: Kafka event-driven patterns with consumer groups, producers, event schemas, dead letter queues, idempotency, and event sourcing
---

# Event-Driven Architecture with Kafka

Implement event-driven microservices using Apache Kafka with consumer groups for scalable message processing, producers with serialization, event schemas with Protobuf or Avro, dead letter queue handling, idempotency patterns, and event sourcing concepts.

## Core Patterns

### 1. Kafka Consumer with Consumer Groups

**Pattern:** Create Kafka consumers with consumer groups for scalable, fault-tolerant message processing with manual offset management and error handling.

**Example from PR #1276:**
```kotlin
// File: meal-selection-service-sinkers/src/main/kotlin/com/yourcompany/mealselection/sinkers/consumer/CartEventConsumer.kt
package com.yourcompany.mealselection.sinkers.consumer

import com.yourcompany.mealselection.domain.events.CartEvent
import com.yourcompany.mealselection.service.CartEventHandler
import kotlinx.coroutines.*
import mu.KotlinLogging
import org.apache.kafka.clients.consumer.Consumer
import org.apache.kafka.clients.consumer.ConsumerConfig
import org.apache.kafka.clients.consumer.ConsumerRecord
import org.apache.kafka.clients.consumer.KafkaConsumer
import org.apache.kafka.common.serialization.StringDeserializer
import org.slf4j.MDC
import java.time.Duration
import java.util.Properties
import java.util.concurrent.atomic.AtomicBoolean

private val logger = KotlinLogging.logger {}

/**
 * Kafka consumer for cart events with consumer group and error handling
 */
class CartEventConsumer(
    private val kafkaConfig: KafkaConsumerConfig,
    private val cartEventHandler: CartEventHandler,
    private val deadLetterQueueProducer: DeadLetterQueueProducer
) : AutoCloseable {

    private val consumer: Consumer<String, String> = createConsumer()
    private val isRunning = AtomicBoolean(false)
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    /**
     * Create Kafka consumer with configuration
     */
    private fun createConsumer(): Consumer<String, String> {
        val props = Properties().apply {
            // Bootstrap servers
            put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, kafkaConfig.bootstrapServers)

            // Consumer group for load balancing
            put(ConsumerConfig.GROUP_ID_CONFIG, kafkaConfig.groupId)

            // Deserialization
            put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer::class.java.name)
            put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer::class.java.name)

            // Manual offset management for exactly-once processing
            put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "false")

            // Start from earliest offset for new consumer groups
            put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest")

            // Consumer session timeout
            put(ConsumerConfig.SESSION_TIMEOUT_MS_CONFIG, "30000")

            // Heartbeat interval
            put(ConsumerConfig.HEARTBEAT_INTERVAL_MS_CONFIG, "10000")

            // Max poll records per batch
            put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, "100")

            // Max poll interval (time to process batch)
            put(ConsumerConfig.MAX_POLL_INTERVAL_MS_CONFIG, "300000") // 5 minutes

            // Fetch settings
            put(ConsumerConfig.FETCH_MIN_BYTES_CONFIG, "1")
            put(ConsumerConfig.FETCH_MAX_WAIT_MS_CONFIG, "500")

            // Isolation level for transactional producers
            put(ConsumerConfig.ISOLATION_LEVEL_CONFIG, "read_committed")
        }

        return KafkaConsumer(props)
    }

    /**
     * Start consuming messages
     */
    fun start() {
        if (!isRunning.compareAndSet(false, true)) {
            logger.warn { "Consumer already running groupId=${kafkaConfig.groupId}" }
            return
        }

        logger.info { "Starting Kafka consumer groupId=${kafkaConfig.groupId} topics=${kafkaConfig.topics}" }

        scope.launch {
            try {
                consumer.subscribe(kafkaConfig.topics)
                logger.info { "Subscribed to topics topics=${kafkaConfig.topics}" }

                while (isRunning.get()) {
                    pollAndProcess()
                }
            } catch (e: Exception) {
                logger.error(e) { "Consumer loop failed groupId=${kafkaConfig.groupId}" }
                throw e
            } finally {
                consumer.close()
                logger.info { "Consumer closed groupId=${kafkaConfig.groupId}" }
            }
        }
    }

    /**
     * Poll and process messages
     */
    private suspend fun pollAndProcess() {
        try {
            val records = consumer.poll(Duration.ofSeconds(1))

            if (records.isEmpty) {
                return
            }

            logger.debug { "Polled records count=${records.count()} groupId=${kafkaConfig.groupId}" }

            // Process records
            records.forEach { record ->
                processRecord(record)
            }

            // Commit offsets after successful processing
            consumer.commitSync()

            logger.debug {
                "Committed offsets count=${records.count()} " +
                "groupId=${kafkaConfig.groupId}"
            }
        } catch (e: Exception) {
            logger.error(e) { "Error processing batch groupId=${kafkaConfig.groupId}" }
            // Don't commit offsets on error - will reprocess
        }
    }

    /**
     * Process individual record with error handling
     */
    private suspend fun processRecord(record: ConsumerRecord<String, String>) {
        val recordId = "${record.topic()}-${record.partition()}-${record.offset()}"

        // Add MDC context for logging
        MDC.put("recordId", recordId)
        MDC.put("topic", record.topic())
        MDC.put("partition", record.partition().toString())
        MDC.put("offset", record.offset().toString())

        try {
            logger.debug { "Processing record key=${record.key()}" }

            // Deserialize event
            val event = deserializeEvent(record.value())

            // Check idempotency (prevent duplicate processing)
            if (cartEventHandler.isAlreadyProcessed(event.eventId)) {
                logger.info { "Event already processed, skipping eventId=${event.eventId}" }
                return
            }

            // Process event
            cartEventHandler.handleEvent(event)

            logger.info {
                "Record processed successfully " +
                "eventId=${event.eventId} " +
                "eventType=${event.type}"
            }
        } catch (e: DeserializationException) {
            logger.error(e) { "Deserialization failed, sending to DLQ" }
            sendToDeadLetterQueue(record, e, "DESERIALIZATION_ERROR")
        } catch (e: ValidationException) {
            logger.error(e) { "Validation failed, sending to DLQ" }
            sendToDeadLetterQueue(record, e, "VALIDATION_ERROR")
        } catch (e: Exception) {
            logger.error(e) { "Processing failed, will retry" }
            // Don't send to DLQ - allow retry on reprocessing
            throw e
        } finally {
            MDC.clear()
        }
    }

    /**
     * Deserialize event from JSON
     */
    private fun deserializeEvent(value: String): CartEvent {
        return try {
            kotlinx.serialization.json.Json.decodeFromString(value)
        } catch (e: Exception) {
            throw DeserializationException("Failed to deserialize event: ${e.message}", e)
        }
    }

    /**
     * Send failed record to dead letter queue
     */
    private suspend fun sendToDeadLetterQueue(
        record: ConsumerRecord<String, String>,
        error: Exception,
        errorType: String
    ) {
        try {
            deadLetterQueueProducer.send(
                topic = "${record.topic()}.dlq",
                key = record.key(),
                value = record.value(),
                headers = mapOf(
                    "original.topic" to record.topic(),
                    "original.partition" to record.partition().toString(),
                    "original.offset" to record.offset().toString(),
                    "error.type" to errorType,
                    "error.message" to (error.message ?: "Unknown error"),
                    "error.timestamp" to System.currentTimeMillis().toString()
                )
            )

            logger.info { "Record sent to DLQ topic=${record.topic()}.dlq" }
        } catch (e: Exception) {
            logger.error(e) { "Failed to send record to DLQ" }
            // Log but don't fail - original error is more important
        }
    }

    /**
     * Stop consuming messages
     */
    fun stop() {
        if (!isRunning.compareAndSet(true, false)) {
            logger.warn { "Consumer not running groupId=${kafkaConfig.groupId}" }
            return
        }

        logger.info { "Stopping Kafka consumer groupId=${kafkaConfig.groupId}" }
        scope.cancel()
    }

    override fun close() {
        stop()
        scope.cancel()
        consumer.close()
    }
}

/**
 * Kafka consumer configuration
 */
data class KafkaConsumerConfig(
    val bootstrapServers: String,
    val groupId: String,
    val topics: List<String>
)

/**
 * Custom exceptions
 */
class DeserializationException(message: String, cause: Throwable? = null) : RuntimeException(message, cause)
class ValidationException(message: String) : RuntimeException(message)
```

**Frequency:** 30% of services implement Kafka consumers

**Why:** Kafka consumers with consumer groups provide:
- Horizontal scalability through partitioning
- Fault tolerance with automatic rebalancing
- At-least-once delivery semantics
- Manual offset control for exactly-once processing
- Load balancing across consumer instances

**Consumer Group Best Practices:**
- Use meaningful group IDs per application
- Set appropriate max poll interval for processing time
- Handle rebalancing gracefully
- Monitor consumer lag metrics
- Implement proper shutdown hooks

### 2. Kafka Producer with Serialization

**Pattern:** Create Kafka producers with serialization, partitioning strategies, transactions, and error handling for reliable event publishing.

**Example from PR #1283:**
```kotlin
// File: meal-selection-service-shared/src/main/kotlin/com/yourcompany/mealselection/kafka/producer/EventProducer.kt
package com.yourcompany.mealselection.kafka.producer

import com.yourcompany.mealselection.domain.events.DomainEvent
import kotlinx.coroutines.future.await
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import mu.KotlinLogging
import org.apache.kafka.clients.producer.*
import org.apache.kafka.common.serialization.StringSerializer
import java.util.Properties
import java.util.concurrent.TimeUnit

private val logger = KotlinLogging.logger {}

/**
 * Kafka producer for publishing domain events
 */
class EventProducer(
    private val producerConfig: KafkaProducerConfig
) : AutoCloseable {

    private val producer: Producer<String, String> = createProducer()

    private val json = Json {
        prettyPrint = false
        ignoreUnknownKeys = true
        encodeDefaults = true
    }

    /**
     * Create Kafka producer with configuration
     */
    private fun createProducer(): Producer<String, String> {
        val props = Properties().apply {
            // Bootstrap servers
            put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, producerConfig.bootstrapServers)

            // Serialization
            put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer::class.java.name)
            put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer::class.java.name)

            // Idempotence for exactly-once semantics
            put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, "true")

            // Acks - all replicas must acknowledge
            put(ProducerConfig.ACKS_CONFIG, "all")

            // Retries
            put(ProducerConfig.RETRIES_CONFIG, Int.MAX_VALUE)
            put(ProducerConfig.MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION, "5")

            // Compression
            put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "snappy")

            // Batching for throughput
            put(ProducerConfig.BATCH_SIZE_CONFIG, "16384")
            put(ProducerConfig.LINGER_MS_CONFIG, "10")

            // Buffer memory
            put(ProducerConfig.BUFFER_MEMORY_CONFIG, "33554432") // 32MB

            // Request timeout
            put(ProducerConfig.REQUEST_TIMEOUT_MS_CONFIG, "30000")

            // Transactional ID for exactly-once semantics
            if (producerConfig.transactional) {
                put(ProducerConfig.TRANSACTIONAL_ID_CONFIG, producerConfig.transactionalId)
            }
        }

        return KafkaProducer(props)
    }

    init {
        if (producerConfig.transactional) {
            producer.initTransactions()
            logger.info { "Producer initialized with transactions transactionalId=${producerConfig.transactionalId}" }
        }
    }

    /**
     * Publish event to Kafka
     */
    suspend fun publish(event: DomainEvent) {
        logger.debug { "Publishing event eventId=${event.eventId} eventType=${event.type}" }

        try {
            val key = event.aggregateId.toString()
            val value = json.encodeToString(event)
            val topic = producerConfig.topicPrefix + event.topic

            val record = ProducerRecord(
                topic,
                null, // partition - let Kafka decide based on key
                key,
                value,
                buildHeaders(event)
            )

            val metadata = producer.send(record).await()

            logger.info {
                "Event published successfully " +
                "eventId=${event.eventId} " +
                "eventType=${event.type} " +
                "topic=${metadata.topic()} " +
                "partition=${metadata.partition()} " +
                "offset=${metadata.offset()}"
            }
        } catch (e: Exception) {
            logger.error(e) {
                "Failed to publish event " +
                "eventId=${event.eventId} " +
                "eventType=${event.type}"
            }
            throw EventPublishException("Failed to publish event: ${e.message}", e)
        }
    }

    /**
     * Publish multiple events in a transaction
     */
    suspend fun publishTransaction(events: List<DomainEvent>) {
        if (!producerConfig.transactional) {
            throw IllegalStateException("Producer not configured for transactions")
        }

        logger.debug { "Publishing transactional batch count=${events.size}" }

        try {
            producer.beginTransaction()

            events.forEach { event ->
                val key = event.aggregateId.toString()
                val value = json.encodeToString(event)
                val topic = producerConfig.topicPrefix + event.topic

                val record = ProducerRecord(
                    topic,
                    null,
                    key,
                    value,
                    buildHeaders(event)
                )

                producer.send(record).await()
            }

            producer.commitTransaction()

            logger.info {
                "Transaction committed successfully " +
                "eventCount=${events.size}"
            }
        } catch (e: Exception) {
            logger.error(e) { "Transaction failed, aborting count=${events.size}" }
            producer.abortTransaction()
            throw EventPublishException("Transaction failed: ${e.message}", e)
        }
    }

    /**
     * Publish event with custom partitioning
     */
    suspend fun publishToPartition(
        event: DomainEvent,
        partition: Int
    ) {
        logger.debug {
            "Publishing event to specific partition " +
            "eventId=${event.eventId} " +
            "partition=$partition"
        }

        try {
            val key = event.aggregateId.toString()
            val value = json.encodeToString(event)
            val topic = producerConfig.topicPrefix + event.topic

            val record = ProducerRecord(
                topic,
                partition,
                key,
                value,
                buildHeaders(event)
            )

            val metadata = producer.send(record).await()

            logger.info {
                "Event published to partition " +
                "eventId=${event.eventId} " +
                "partition=${metadata.partition()} " +
                "offset=${metadata.offset()}"
            }
        } catch (e: Exception) {
            logger.error(e) {
                "Failed to publish to partition " +
                "eventId=${event.eventId} " +
                "partition=$partition"
            }
            throw EventPublishException("Failed to publish event: ${e.message}", e)
        }
    }

    /**
     * Build Kafka headers with metadata
     */
    private fun buildHeaders(event: DomainEvent): List<RecordHeader> {
        return listOf(
            RecordHeader("event.id", event.eventId.toString().toByteArray()),
            RecordHeader("event.type", event.type.toByteArray()),
            RecordHeader("event.version", event.version.toString().toByteArray()),
            RecordHeader("event.timestamp", event.timestamp.toString().toByteArray()),
            RecordHeader("correlation.id", event.correlationId.toString().toByteArray()),
            RecordHeader("causation.id", event.causationId.toString().toByteArray())
        )
    }

    /**
     * Flush all buffered records
     */
    fun flush() {
        logger.debug { "Flushing producer" }
        producer.flush()
    }

    override fun close() {
        logger.info { "Closing producer" }
        producer.close(30, TimeUnit.SECONDS)
    }
}

/**
 * Kafka producer configuration
 */
data class KafkaProducerConfig(
    val bootstrapServers: String,
    val topicPrefix: String = "",
    val transactional: Boolean = false,
    val transactionalId: String? = null
)

/**
 * Event publish exception
 */
class EventPublishException(message: String, cause: Throwable? = null) : RuntimeException(message, cause)

/**
 * Domain event interface
 */
interface DomainEvent {
    val eventId: java.util.UUID
    val aggregateId: java.util.UUID
    val type: String
    val version: Int
    val timestamp: java.time.Instant
    val correlationId: java.util.UUID
    val causationId: java.util.UUID
    val topic: String
}
```

**Frequency:** 30% of services implement Kafka producers

**Why:** Kafka producers with proper configuration provide:
- Idempotent writes for exactly-once semantics
- Transactional support for atomic multi-event publishing
- Automatic retries and error handling
- Compression for network efficiency
- Batching for high throughput

**Producer Best Practices:**
- Enable idempotence for data consistency
- Use transactions for multi-event atomicity
- Set appropriate acks level (all for durability)
- Implement proper error handling and retries
- Monitor producer metrics (latency, throughput, errors)

### 3. Event Schemas with Protobuf

**Pattern:** Define event schemas using Protocol Buffers for backward/forward compatibility, efficient serialization, and strong typing.

**Example from PR #1265:**
```kotlin
// File: meal-selection-service-domain/src/main/proto/cart_events.proto
syntax = "proto3";

package com.yourcompany.mealselection.events;

option java_package = "com.yourcompany.mealselection.events.proto";
option java_multiple_files = true;

/**
 * Cart event envelope with metadata
 */
message CartEventEnvelope {
    // Event metadata
    string event_id = 1;
    string aggregate_id = 2;
    string event_type = 3;
    int32 event_version = 4;
    int64 timestamp = 5;
    string correlation_id = 6;
    string causation_id = 7;

    // Event payload (one of)
    oneof payload {
        CartCreated cart_created = 10;
        CartUpdated cart_updated = 11;
        CartItemAdded cart_item_added = 12;
        CartItemRemoved cart_item_removed = 13;
        CartCheckedOut cart_checked_out = 14;
        CartAbandoned cart_abandoned = 15;
    }
}

/**
 * Cart created event
 */
message CartCreated {
    string cart_id = 1;
    string customer_id = 2;
    repeated CartItem items = 3;
    string state = 4;
    int64 created_at = 5;
}

/**
 * Cart updated event
 */
message CartUpdated {
    string cart_id = 1;
    string customer_id = 2;
    repeated CartItem items = 3;
    string state = 4;
    int64 updated_at = 5;
    repeated string changed_fields = 6;
}

/**
 * Cart item added event
 */
message CartItemAdded {
    string cart_id = 1;
    CartItem item = 2;
    int64 added_at = 3;
}

/**
 * Cart item removed event
 */
message CartItemRemoved {
    string cart_id = 1;
    string item_id = 2;
    int64 removed_at = 3;
}

/**
 * Cart checked out event
 */
message CartCheckedOut {
    string cart_id = 1;
    string order_id = 2;
    Money total_amount = 3;
    int64 checked_out_at = 4;
}

/**
 * Cart abandoned event
 */
message CartAbandoned {
    string cart_id = 1;
    string reason = 2;
    int64 abandoned_at = 3;
}

/**
 * Cart item
 */
message CartItem {
    string item_id = 1;
    string recipe_id = 2;
    string recipe_name = 3;
    int32 quantity = 4;
    Money price = 5;
}

/**
 * Money value object
 */
message Money {
    double amount = 1;
    string currency = 2;
}
```

**Kotlin wrapper for Protobuf events:**
```kotlin
// File: meal-selection-service-domain/src/main/kotlin/com/yourcompany/mealselection/events/CartEvents.kt
package com.yourcompany.mealselection.events

import com.yourcompany.mealselection.events.proto.*
import com.yourcompany.mealselection.domain.*
import java.time.Instant
import java.util.UUID

/**
 * Sealed class for cart events with Protobuf serialization
 */
sealed class CartEvent : DomainEvent {
    abstract override val eventId: UUID
    abstract override val aggregateId: UUID
    abstract override val type: String
    abstract override val version: Int
    abstract override val timestamp: Instant
    abstract override val correlationId: UUID
    abstract override val causationId: UUID
    override val topic: String = "cart.events"

    /**
     * Serialize to Protobuf
     */
    abstract fun toProto(): CartEventEnvelope

    /**
     * Deserialize from Protobuf
     */
    companion object {
        fun fromProto(envelope: CartEventEnvelope): CartEvent {
            return when (envelope.payloadCase) {
                CartEventEnvelope.PayloadCase.CART_CREATED -> CartCreatedEvent.fromProto(envelope)
                CartEventEnvelope.PayloadCase.CART_UPDATED -> CartUpdatedEvent.fromProto(envelope)
                CartEventEnvelope.PayloadCase.CART_ITEM_ADDED -> CartItemAddedEvent.fromProto(envelope)
                CartEventEnvelope.PayloadCase.CART_ITEM_REMOVED -> CartItemRemovedEvent.fromProto(envelope)
                CartEventEnvelope.PayloadCase.CART_CHECKED_OUT -> CartCheckedOutEvent.fromProto(envelope)
                CartEventEnvelope.PayloadCase.CART_ABANDONED -> CartAbandonedEvent.fromProto(envelope)
                else -> throw IllegalArgumentException("Unknown event type: ${envelope.payloadCase}")
            }
        }
    }
}

/**
 * Cart created event
 */
data class CartCreatedEvent(
    override val eventId: UUID,
    override val aggregateId: UUID,
    override val timestamp: Instant,
    override val correlationId: UUID,
    override val causationId: UUID,
    val cartId: UUID,
    val customerId: UUID,
    val items: List<CartItem>,
    val state: CartState,
    val createdAt: Instant
) : CartEvent() {
    override val type = "cart.created"
    override val version = 1

    override fun toProto(): CartEventEnvelope {
        return CartEventEnvelope.newBuilder()
            .setEventId(eventId.toString())
            .setAggregateId(aggregateId.toString())
            .setEventType(type)
            .setEventVersion(version)
            .setTimestamp(timestamp.toEpochMilli())
            .setCorrelationId(correlationId.toString())
            .setCausationId(causationId.toString())
            .setCartCreated(
                com.yourcompany.mealselection.events.proto.CartCreated.newBuilder()
                    .setCartId(cartId.toString())
                    .setCustomerId(customerId.toString())
                    .addAllItems(items.map { it.toProto() })
                    .setState(state.name)
                    .setCreatedAt(createdAt.toEpochMilli())
                    .build()
            )
            .build()
    }

    companion object {
        fun fromProto(envelope: CartEventEnvelope): CartCreatedEvent {
            val payload = envelope.cartCreated
            return CartCreatedEvent(
                eventId = UUID.fromString(envelope.eventId),
                aggregateId = UUID.fromString(envelope.aggregateId),
                timestamp = Instant.ofEpochMilli(envelope.timestamp),
                correlationId = UUID.fromString(envelope.correlationId),
                causationId = UUID.fromString(envelope.causationId),
                cartId = UUID.fromString(payload.cartId),
                customerId = UUID.fromString(payload.customerId),
                items = payload.itemsList.map { CartItem.fromProto(it) },
                state = CartState.valueOf(payload.state),
                createdAt = Instant.ofEpochMilli(payload.createdAt)
            )
        }
    }
}

/**
 * Cart item with Protobuf conversion
 */
data class CartItem(
    val itemId: UUID,
    val recipeId: UUID,
    val recipeName: String,
    val quantity: Int,
    val price: Money
) {
    fun toProto(): com.yourcompany.mealselection.events.proto.CartItem {
        return com.yourcompany.mealselection.events.proto.CartItem.newBuilder()
            .setItemId(itemId.toString())
            .setRecipeId(recipeId.toString())
            .setRecipeName(recipeName)
            .setQuantity(quantity)
            .setPrice(
                com.yourcompany.mealselection.events.proto.Money.newBuilder()
                    .setAmount(price.amount)
                    .setCurrency(price.currency)
                    .build()
            )
            .build()
    }

    companion object {
        fun fromProto(proto: com.yourcompany.mealselection.events.proto.CartItem): CartItem {
            return CartItem(
                itemId = UUID.fromString(proto.itemId),
                recipeId = UUID.fromString(proto.recipeId),
                recipeName = proto.recipeName,
                quantity = proto.quantity,
                price = Money(proto.price.amount, proto.price.currency)
            )
        }
    }
}
```

**Frequency:** 20% of services use Protobuf for event schemas

**Why:** Protobuf provides:
- Strong typing and schema validation
- Backward and forward compatibility
- Efficient binary serialization (smaller payloads)
- Code generation for multiple languages
- Schema evolution support

**Schema Best Practices:**
- Use oneof for event type discrimination
- Version your schemas explicitly
- Never remove or reuse field numbers
- Use optional fields for backward compatibility
- Document breaking changes

### 4. Dead Letter Queue Handling

**Pattern:** Implement dead letter queue (DLQ) pattern for handling failed messages with metadata, retry logic, and monitoring.

**Example from PR #1274:**
```kotlin
// File: meal-selection-service-sinkers/src/main/kotlin/com/yourcompany/mealselection/sinkers/dlq/DeadLetterQueueHandler.kt
package com.yourcompany.mealselection.sinkers.dlq

import kotlinx.coroutines.delay
import mu.KotlinLogging
import org.apache.kafka.clients.consumer.ConsumerRecord
import org.apache.kafka.clients.producer.Producer
import org.apache.kafka.clients.producer.ProducerRecord
import org.apache.kafka.common.header.internals.RecordHeader
import java.time.Instant

private val logger = KotlinLogging.logger {}

/**
 * Dead letter queue producer for failed messages
 */
class DeadLetterQueueProducer(
    private val producer: Producer<String, String>,
    private val config: DLQConfig
) {

    /**
     * Send message to dead letter queue
     */
    suspend fun send(
        topic: String,
        key: String?,
        value: String,
        headers: Map<String, String> = emptyMap()
    ) {
        logger.warn { "Sending message to DLQ topic=$topic key=$key" }

        val dlqTopic = if (config.useSingleDLQ) {
            config.dlqTopicName
        } else {
            "$topic.dlq"
        }

        val recordHeaders = headers.map { (k, v) ->
            RecordHeader(k, v.toByteArray())
        }.toMutableList()

        // Add DLQ metadata
        recordHeaders.add(RecordHeader("dlq.timestamp", Instant.now().toString().toByteArray()))
        recordHeaders.add(RecordHeader("dlq.reason", "processing_failure".toByteArray()))

        val record = ProducerRecord(
            dlqTopic,
            null,
            key,
            value,
            recordHeaders
        )

        try {
            producer.send(record).get()
            logger.info { "Message sent to DLQ successfully topic=$dlqTopic key=$key" }
        } catch (e: Exception) {
            logger.error(e) { "Failed to send message to DLQ topic=$dlqTopic key=$key" }
            throw DLQException("Failed to send to DLQ: ${e.message}", e)
        }
    }

    /**
     * Send consumer record to DLQ with original metadata
     */
    suspend fun sendRecord(
        record: ConsumerRecord<String, String>,
        error: Exception,
        errorType: String
    ) {
        val headers = mutableMapOf(
            "original.topic" to record.topic(),
            "original.partition" to record.partition().toString(),
            "original.offset" to record.offset().toString(),
            "original.timestamp" to record.timestamp().toString(),
            "error.type" to errorType,
            "error.message" to (error.message ?: "Unknown error"),
            "error.class" to error.javaClass.simpleName,
            "error.timestamp" to Instant.now().toString()
        )

        // Copy original headers
        record.headers().forEach { header ->
            headers["original.header.${header.key()}"] = String(header.value())
        }

        send(
            topic = record.topic(),
            key = record.key(),
            value = record.value(),
            headers = headers
        )
    }
}

/**
 * Dead letter queue consumer for retry processing
 */
class DeadLetterQueueConsumer(
    private val config: DLQConfig,
    private val retryHandler: RetryHandler
) {

    /**
     * Process DLQ messages with retry logic
     */
    suspend fun processDLQMessage(record: ConsumerRecord<String, String>) {
        logger.info {
            "Processing DLQ message " +
            "topic=${record.topic()} " +
            "key=${record.key()} " +
            "offset=${record.offset()}"
        }

        // Extract original metadata
        val originalTopic = record.headers()
            .lastHeader("original.topic")
            ?.value()
            ?.let { String(it) }
            ?: throw DLQException("Missing original.topic header")

        val errorType = record.headers()
            .lastHeader("error.type")
            ?.value()
            ?.let { String(it) }
            ?: "UNKNOWN"

        val errorTimestamp = record.headers()
            .lastHeader("error.timestamp")
            ?.value()
            ?.let { String(it) }
            ?.let { Instant.parse(it) }
            ?: Instant.now()

        // Check if message is eligible for retry
        val age = java.time.Duration.between(errorTimestamp, Instant.now())
        if (age < config.minRetryDelay) {
            logger.debug {
                "Message not ready for retry yet " +
                "age=$age " +
                "minDelay=${config.minRetryDelay}"
            }
            return
        }

        // Get retry count
        val retryCount = record.headers()
            .lastHeader("retry.count")
            ?.value()
            ?.let { String(it).toInt() }
            ?: 0

        if (retryCount >= config.maxRetries) {
            logger.warn {
                "Message exceeded max retries, moving to permanent DLQ " +
                "retryCount=$retryCount " +
                "maxRetries=${config.maxRetries}"
            }
            moveToPermanentDLQ(record)
            return
        }

        // Retry processing
        try {
            retryHandler.retry(originalTopic, record.value())
            logger.info { "DLQ message processed successfully after retry retryCount=$retryCount" }
        } catch (e: Exception) {
            logger.error(e) { "DLQ retry failed retryCount=$retryCount" }

            // Increment retry count and requeue
            val newHeaders = record.headers().toMutableList()
            newHeaders.add(RecordHeader("retry.count", (retryCount + 1).toString().toByteArray()))
            newHeaders.add(RecordHeader("retry.timestamp", Instant.now().toString().toByteArray()))

            // Exponential backoff
            val backoffDelay = calculateBackoffDelay(retryCount)
            delay(backoffDelay.toMillis())

            logger.info { "Requeuing DLQ message with backoff delay=$backoffDelay" }
        }
    }

    /**
     * Move message to permanent DLQ
     */
    private suspend fun moveToPermanentDLQ(record: ConsumerRecord<String, String>) {
        logger.warn { "Moving message to permanent DLQ key=${record.key()}" }

        // Store in permanent DLQ (e.g., database, S3)
        // This requires manual intervention to process
    }

    /**
     * Calculate exponential backoff delay
     */
    private fun calculateBackoffDelay(retryCount: Int): java.time.Duration {
        val baseDelay = config.minRetryDelay
        val maxDelay = config.maxRetryDelay

        val exponentialDelay = baseDelay.multipliedBy((1 shl retryCount).toLong())

        return if (exponentialDelay > maxDelay) maxDelay else exponentialDelay
    }
}

/**
 * DLQ configuration
 */
data class DLQConfig(
    val dlqTopicName: String = "dead-letter-queue",
    val useSingleDLQ: Boolean = false,
    val maxRetries: Int = 3,
    val minRetryDelay: java.time.Duration = java.time.Duration.ofMinutes(5),
    val maxRetryDelay: java.time.Duration = java.time.Duration.ofHours(1)
)

/**
 * Retry handler interface
 */
interface RetryHandler {
    suspend fun retry(topic: String, message: String)
}

/**
 * DLQ exception
 */
class DLQException(message: String, cause: Throwable? = null) : RuntimeException(message, cause)
```

**Frequency:** 24% of services implement DLQ handling

**Why:** Dead letter queues provide:
- Isolation of failed messages from main flow
- Retry logic with exponential backoff
- Metadata preservation for debugging
- Manual intervention capability
- Monitoring and alerting on failures

**DLQ Best Practices:**
- Include comprehensive error metadata
- Implement retry limits to prevent infinite loops
- Use exponential backoff for retries
- Monitor DLQ depth and alert on accumulation
- Provide tools for manual DLQ processing

### 5. Idempotency Patterns

**Pattern:** Implement idempotency using event ID tracking to prevent duplicate message processing in at-least-once delivery scenarios.

**Example from PR #1335:**
```kotlin
// File: meal-selection-service-shared/src/main/kotlin/com/yourcompany/mealselection/idempotency/IdempotencyService.kt
package com.yourcompany.mealselection.idempotency

import mu.KotlinLogging
import java.time.Duration
import java.time.Instant
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

private val logger = KotlinLogging.logger {}

/**
 * Idempotency service to prevent duplicate event processing
 */
interface IdempotencyService {
    suspend fun isProcessed(eventId: UUID): Boolean
    suspend fun markAsProcessed(eventId: UUID)
    suspend fun cleanupOldEntries()
}

/**
 * In-memory idempotency service with TTL
 */
class InMemoryIdempotencyService(
    private val ttl: Duration = Duration.ofHours(24)
) : IdempotencyService {

    private val processedEvents = ConcurrentHashMap<UUID, Instant>()

    override suspend fun isProcessed(eventId: UUID): Boolean {
        val timestamp = processedEvents[eventId]

        if (timestamp == null) {
            return false
        }

        // Check if entry has expired
        val age = Duration.between(timestamp, Instant.now())
        if (age > ttl) {
            processedEvents.remove(eventId)
            return false
        }

        return true
    }

    override suspend fun markAsProcessed(eventId: UUID) {
        processedEvents[eventId] = Instant.now()
        logger.debug { "Event marked as processed eventId=$eventId" }
    }

    override suspend fun cleanupOldEntries() {
        val now = Instant.now()
        val before = processedEvents.size

        processedEvents.entries.removeIf { (_, timestamp) ->
            Duration.between(timestamp, now) > ttl
        }

        val removed = before - processedEvents.size
        if (removed > 0) {
            logger.info { "Cleaned up old idempotency entries removed=$removed remaining=${processedEvents.size}" }
        }
    }
}

/**
 * Database-backed idempotency service
 */
class DatabaseIdempotencyService(
    private val repository: IdempotencyRepository,
    private val ttl: Duration = Duration.ofDays(7)
) : IdempotencyService {

    override suspend fun isProcessed(eventId: UUID): Boolean {
        val entry = repository.findByEventId(eventId) ?: return false

        // Check if entry has expired
        val age = Duration.between(entry.processedAt, Instant.now())
        if (age > ttl) {
            repository.delete(eventId)
            return false
        }

        logger.debug { "Event already processed eventId=$eventId processedAt=${entry.processedAt}" }
        return true
    }

    override suspend fun markAsProcessed(eventId: UUID) {
        try {
            repository.save(
                IdempotencyEntry(
                    eventId = eventId,
                    processedAt = Instant.now()
                )
            )
            logger.debug { "Event marked as processed in database eventId=$eventId" }
        } catch (e: Exception) {
            logger.error(e) { "Failed to mark event as processed eventId=$eventId" }
            throw IdempotencyException("Failed to mark as processed: ${e.message}", e)
        }
    }

    override suspend fun cleanupOldEntries() {
        val cutoffTime = Instant.now().minus(ttl)
        val deleted = repository.deleteOlderThan(cutoffTime)

        if (deleted > 0) {
            logger.info { "Cleaned up old idempotency entries deleted=$deleted cutoff=$cutoffTime" }
        }
    }
}

/**
 * Idempotency repository interface
 */
interface IdempotencyRepository {
    suspend fun findByEventId(eventId: UUID): IdempotencyEntry?
    suspend fun save(entry: IdempotencyEntry)
    suspend fun delete(eventId: UUID)
    suspend fun deleteOlderThan(cutoff: Instant): Int
}

/**
 * Idempotency entry
 */
data class IdempotencyEntry(
    val eventId: UUID,
    val processedAt: Instant
)

/**
 * Idempotency exception
 */
class IdempotencyException(message: String, cause: Throwable? = null) : RuntimeException(message, cause)

/**
 * Event handler with idempotency
 */
class CartEventHandler(
    private val cartService: CartService,
    private val idempotencyService: IdempotencyService
) {

    /**
     * Handle event with idempotency check
     */
    suspend fun handleEvent(event: CartEvent) {
        logger.debug { "Handling event eventId=${event.eventId} eventType=${event.type}" }

        // Check if already processed
        if (idempotencyService.isProcessed(event.eventId)) {
            logger.info { "Event already processed, skipping eventId=${event.eventId}" }
            return
        }

        try {
            // Process event
            when (event) {
                is CartCreatedEvent -> handleCartCreated(event)
                is CartUpdatedEvent -> handleCartUpdated(event)
                is CartItemAddedEvent -> handleCartItemAdded(event)
                is CartItemRemovedEvent -> handleCartItemRemoved(event)
                is CartCheckedOutEvent -> handleCartCheckedOut(event)
                is CartAbandonedEvent -> handleCartAbandoned(event)
            }

            // Mark as processed
            idempotencyService.markAsProcessed(event.eventId)

            logger.info { "Event processed successfully eventId=${event.eventId}" }
        } catch (e: Exception) {
            logger.error(e) { "Event processing failed eventId=${event.eventId}" }
            throw e
        }
    }

    private suspend fun handleCartCreated(event: CartCreatedEvent) {
        logger.info { "Processing cart created event cartId=${event.cartId}" }
        cartService.createFromEvent(event)
    }

    private suspend fun handleCartUpdated(event: CartUpdatedEvent) {
        logger.info { "Processing cart updated event cartId=${event.cartId}" }
        cartService.updateFromEvent(event)
    }

    private suspend fun handleCartItemAdded(event: CartItemAddedEvent) {
        logger.info { "Processing cart item added event cartId=${event.cartId}" }
        cartService.addItemFromEvent(event)
    }

    private suspend fun handleCartItemRemoved(event: CartItemRemovedEvent) {
        logger.info { "Processing cart item removed event cartId=${event.cartId}" }
        cartService.removeItemFromEvent(event)
    }

    private suspend fun handleCartCheckedOut(event: CartCheckedOutEvent) {
        logger.info { "Processing cart checked out event cartId=${event.cartId}" }
        cartService.checkoutFromEvent(event)
    }

    private suspend fun handleCartAbandoned(event: CartAbandonedEvent) {
        logger.info { "Processing cart abandoned event cartId=${event.cartId}" }
        cartService.abandonFromEvent(event)
    }
}
```

**Frequency:** 20% of services implement idempotency

**Why:** Idempotency provides:
- Protection against duplicate processing
- Safe retries after failures
- Consistent state in at-least-once delivery
- Simplified error handling
- Predictable system behavior

**Idempotency Best Practices:**
- Use event ID as idempotency key
- Store processed events with TTL
- Clean up old entries periodically
- Handle idempotency checks before side effects
- Log duplicate detection for monitoring

### 6. Event Sourcing Concepts

**Pattern:** Implement event sourcing to store aggregate state as sequence of events, enabling event replay, temporal queries, and audit trails.

**Example from PR #1267:**
```kotlin
// File: meal-selection-service-domain/src/main/kotlin/com/yourcompany/mealselection/eventsourcing/EventSourcedAggregate.kt
package com.yourcompany.mealselection.eventsourcing

import com.yourcompany.mealselection.domain.events.DomainEvent
import java.time.Instant
import java.util.UUID

/**
 * Event-sourced aggregate base class
 */
abstract class EventSourcedAggregate<T : DomainEvent> {
    abstract val id: UUID
    abstract val version: Long

    private val uncommittedEvents = mutableListOf<T>()

    /**
     * Apply event to aggregate state
     */
    protected abstract fun apply(event: T)

    /**
     * Raise domain event
     */
    protected fun raiseEvent(event: T) {
        apply(event)
        uncommittedEvents.add(event)
    }

    /**
     * Load aggregate from event history
     */
    fun loadFromHistory(events: List<T>) {
        events.forEach { event ->
            apply(event)
        }
    }

    /**
     * Get uncommitted events
     */
    fun getUncommittedEvents(): List<T> = uncommittedEvents.toList()

    /**
     * Mark events as committed
     */
    fun markEventsAsCommitted() {
        uncommittedEvents.clear()
    }
}

/**
 * Event-sourced cart aggregate
 */
class CartAggregate(
    override val id: UUID,
    override var version: Long = 0
) : EventSourcedAggregate<CartEvent>() {

    private var customerId: UUID? = null
    private val items = mutableListOf<CartItem>()
    private var state: CartState = CartState.ACTIVE
    private var createdAt: Instant? = null
    private var updatedAt: Instant? = null

    /**
     * Create cart command
     */
    fun createCart(
        customerId: UUID,
        items: List<CartItem>,
        correlationId: UUID,
        causationId: UUID
    ) {
        if (this.customerId != null) {
            throw IllegalStateException("Cart already created")
        }

        val event = CartCreatedEvent(
            eventId = UUID.randomUUID(),
            aggregateId = id,
            timestamp = Instant.now(),
            correlationId = correlationId,
            causationId = causationId,
            cartId = id,
            customerId = customerId,
            items = items,
            state = CartState.ACTIVE,
            createdAt = Instant.now()
        )

        raiseEvent(event)
    }

    /**
     * Add item command
     */
    fun addItem(
        item: CartItem,
        correlationId: UUID,
        causationId: UUID
    ) {
        if (state != CartState.ACTIVE) {
            throw IllegalStateException("Cannot add item to non-active cart")
        }

        val event = CartItemAddedEvent(
            eventId = UUID.randomUUID(),
            aggregateId = id,
            timestamp = Instant.now(),
            correlationId = correlationId,
            causationId = causationId,
            cartId = id,
            item = item,
            addedAt = Instant.now()
        )

        raiseEvent(event)
    }

    /**
     * Checkout command
     */
    fun checkout(
        orderId: UUID,
        correlationId: UUID,
        causationId: UUID
    ) {
        if (state != CartState.ACTIVE) {
            throw IllegalStateException("Cannot checkout non-active cart")
        }

        if (items.isEmpty()) {
            throw IllegalStateException("Cannot checkout empty cart")
        }

        val totalAmount = items.sumOf { it.price.amount * it.quantity }

        val event = CartCheckedOutEvent(
            eventId = UUID.randomUUID(),
            aggregateId = id,
            timestamp = Instant.now(),
            correlationId = correlationId,
            causationId = causationId,
            cartId = id,
            orderId = orderId,
            totalAmount = Money(totalAmount, "USD"),
            checkedOutAt = Instant.now()
        )

        raiseEvent(event)
    }

    /**
     * Apply event to aggregate state
     */
    override fun apply(event: CartEvent) {
        when (event) {
            is CartCreatedEvent -> applyCartCreated(event)
            is CartItemAddedEvent -> applyCartItemAdded(event)
            is CartItemRemovedEvent -> applyCartItemRemoved(event)
            is CartCheckedOutEvent -> applyCartCheckedOut(event)
            is CartAbandonedEvent -> applyCartAbandoned(event)
            else -> throw IllegalArgumentException("Unknown event type: ${event.type}")
        }
        version++
    }

    private fun applyCartCreated(event: CartCreatedEvent) {
        this.customerId = event.customerId
        this.items.addAll(event.items)
        this.state = event.state
        this.createdAt = event.createdAt
        this.updatedAt = event.createdAt
    }

    private fun applyCartItemAdded(event: CartItemAddedEvent) {
        this.items.add(event.item)
        this.updatedAt = event.addedAt
    }

    private fun applyCartItemRemoved(event: CartItemRemovedEvent) {
        this.items.removeIf { it.itemId == event.itemId }
        this.updatedAt = event.removedAt
    }

    private fun applyCartCheckedOut(event: CartCheckedOutEvent) {
        this.state = CartState.CHECKED_OUT
        this.updatedAt = event.checkedOutAt
    }

    private fun applyCartAbandoned(event: CartAbandonedEvent) {
        this.state = CartState.ABANDONED
        this.updatedAt = event.abandonedAt
    }

    /**
     * Get current cart state
     */
    fun toCart(): Cart {
        return Cart(
            id = id,
            customerId = customerId ?: throw IllegalStateException("Cart not created"),
            items = items.toList(),
            state = state,
            createdAt = createdAt ?: throw IllegalStateException("Cart not created"),
            updatedAt = updatedAt ?: throw IllegalStateException("Cart not created")
        )
    }
}

/**
 * Event store repository
 */
interface EventStore {
    suspend fun saveEvents(aggregateId: UUID, events: List<DomainEvent>, expectedVersion: Long)
    suspend fun getEvents(aggregateId: UUID): List<DomainEvent>
    suspend fun getEventsAfterVersion(aggregateId: UUID, version: Long): List<DomainEvent>
}

/**
 * Event-sourced repository
 */
class CartEventRepository(
    private val eventStore: EventStore
) {

    /**
     * Load aggregate from event store
     */
    suspend fun load(cartId: UUID): CartAggregate {
        val events = eventStore.getEvents(cartId)

        if (events.isEmpty()) {
            throw AggregateNotFoundException("Cart not found: $cartId")
        }

        val aggregate = CartAggregate(cartId)
        aggregate.loadFromHistory(events as List<CartEvent>)

        return aggregate
    }

    /**
     * Save aggregate to event store
     */
    suspend fun save(aggregate: CartAggregate) {
        val events = aggregate.getUncommittedEvents()

        if (events.isEmpty()) {
            return
        }

        eventStore.saveEvents(aggregate.id, events, aggregate.version)
        aggregate.markEventsAsCommitted()
    }
}

/**
 * Aggregate not found exception
 */
class AggregateNotFoundException(message: String) : RuntimeException(message)
```

**Frequency:** 16% of services implement event sourcing

**Why:** Event sourcing provides:
- Complete audit trail of all changes
- Ability to reconstruct state at any point in time
- Natural fit for event-driven architectures
- Support for temporal queries
- Easy debugging and compliance

**Event Sourcing Best Practices:**
- Events are immutable - never modify published events
- Use aggregate version for optimistic locking
- Snapshot aggregates with many events
- Separate event store from read models (CQRS)
- Handle schema evolution carefully

## Implementation Guidelines

### Kafka Configuration Best Practices

**Consumer Configuration:**
```kotlin
// Reliable consumer configuration
val consumerProps = Properties().apply {
    // Connection
    put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "kafka:9092")
    put(ConsumerConfig.GROUP_ID_CONFIG, "meal-selection-service-cart-events")

    // Deserialization
    put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer::class.java.name)
    put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer::class.java.name)

    // Offset management
    put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "false") // Manual commit for exactly-once
    put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest") // Process all messages

    // Performance tuning
    put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, "100") // Batch size
    put(ConsumerConfig.MAX_POLL_INTERVAL_MS_CONFIG, "300000") // 5 minutes
    put(ConsumerConfig.SESSION_TIMEOUT_MS_CONFIG, "30000") // 30 seconds
    put(ConsumerConfig.HEARTBEAT_INTERVAL_MS_CONFIG, "10000") // 10 seconds

    // Isolation
    put(ConsumerConfig.ISOLATION_LEVEL_CONFIG, "read_committed") // For transactional producers
}
```

**Producer Configuration:**
```kotlin
// Reliable producer configuration
val producerProps = Properties().apply {
    // Connection
    put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "kafka:9092")

    // Serialization
    put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer::class.java.name)
    put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer::class.java.name)

    // Reliability
    put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, "true") // Exactly-once per partition
    put(ProducerConfig.ACKS_CONFIG, "all") // All replicas must acknowledge
    put(ProducerConfig.RETRIES_CONFIG, Int.MAX_VALUE) // Retry indefinitely
    put(ProducerConfig.MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION, "5") // Pipeline requests

    // Performance
    put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "snappy") // Compress messages
    put(ProducerConfig.BATCH_SIZE_CONFIG, "16384") // Batch size in bytes
    put(ProducerConfig.LINGER_MS_CONFIG, "10") // Wait for batching
    put(ProducerConfig.BUFFER_MEMORY_CONFIG, "33554432") // 32MB buffer

    // Timeouts
    put(ProducerConfig.REQUEST_TIMEOUT_MS_CONFIG, "30000") // 30 seconds
    put(ProducerConfig.DELIVERY_TIMEOUT_MS_CONFIG, "120000") // 2 minutes
}
```

### Error Handling Strategies

**Transient vs Permanent Errors:**
```kotlin
suspend fun processRecord(record: ConsumerRecord<String, String>) {
    try {
        val event = deserialize(record.value())
        handleEvent(event)
    } catch (e: Exception) {
        when (e) {
            // Permanent errors - send to DLQ
            is DeserializationException -> {
                logger.error(e) { "Permanent error: deserialization failed" }
                sendToDLQ(record, e)
            }
            is ValidationException -> {
                logger.error(e) { "Permanent error: validation failed" }
                sendToDLQ(record, e)
            }

            // Transient errors - retry
            is DatabaseConnectionException -> {
                logger.warn(e) { "Transient error: database connection failed, will retry" }
                throw e // Don't commit offset, will reprocess
            }
            is ExternalServiceException -> {
                logger.warn(e) { "Transient error: external service unavailable, will retry" }
                throw e
            }

            // Unknown errors - be conservative, retry
            else -> {
                logger.error(e) { "Unknown error, will retry" }
                throw e
            }
        }
    }
}
```

### Testing Event-Driven Systems

**Consumer Unit Test:**
```kotlin
class CartEventConsumerTest : DescribeSpec({
    val cartEventHandler = mockk<CartEventHandler>()
    val dlqProducer = mockk<DeadLetterQueueProducer>()

    describe("processRecord") {
        it("should process valid event") {
            val record = mockConsumerRecord(
                key = "cart-123",
                value = """{"eventId":"event-1","type":"cart.created"}"""
            )

            coEvery { cartEventHandler.isAlreadyProcessed(any()) } returns false
            coEvery { cartEventHandler.handleEvent(any()) } just Runs

            val consumer = CartEventConsumer(mockConfig(), cartEventHandler, dlqProducer)

            consumer.processRecord(record)

            coVerify { cartEventHandler.handleEvent(any()) }
            coVerify(exactly = 0) { dlqProducer.sendRecord(any(), any(), any()) }
        }

        it("should skip already processed event") {
            val record = mockConsumerRecord(
                key = "cart-123",
                value = """{"eventId":"event-1","type":"cart.created"}"""
            )

            coEvery { cartEventHandler.isAlreadyProcessed(any()) } returns true

            val consumer = CartEventConsumer(mockConfig(), cartEventHandler, dlqProducer)

            consumer.processRecord(record)

            coVerify(exactly = 0) { cartEventHandler.handleEvent(any()) }
        }

        it("should send to DLQ on deserialization error") {
            val record = mockConsumerRecord(
                key = "cart-123",
                value = "invalid json"
            )

            coEvery { dlqProducer.sendRecord(any(), any(), any()) } just Runs

            val consumer = CartEventConsumer(mockConfig(), cartEventHandler, dlqProducer)

            consumer.processRecord(record)

            coVerify { dlqProducer.sendRecord(record, any(), "DESERIALIZATION_ERROR") }
        }
    }
})
```

**Integration Test with Testcontainers:**
```kotlin
class CartEventConsumerIntegrationTest : DescribeSpec({
    val kafka = KafkaContainer(DockerImageName.parse("confluentinc/cp-kafka:7.4.0"))

    beforeSpec {
        kafka.start()
    }

    afterSpec {
        kafka.stop()
    }

    describe("Kafka integration") {
        it("should consume and process messages") {
            // Create producer
            val producer = createProducer(kafka.bootstrapServers)

            // Create consumer
            val consumer = createConsumer(kafka.bootstrapServers, "test-group")
            consumer.subscribe(listOf("cart.events"))

            // Produce message
            val event = CartCreatedEvent(/* ... */)
            producer.send(ProducerRecord("cart.events", event.cartId.toString(), serialize(event)))
            producer.flush()

            // Consume message
            val records = consumer.poll(Duration.ofSeconds(10))

            records.count() shouldBe 1
            records.first().value() shouldContain event.eventId.toString()
        }
    }
})
```

## Anti-Patterns to Avoid

❌ **Don't commit offsets before processing completes:**
```kotlin
// ❌ Bad - Commits before processing
val records = consumer.poll(Duration.ofSeconds(1))
consumer.commitSync() // Too early!
records.forEach { record ->
    processRecord(record) // If this fails, message is lost
}
```

✅ **Commit after successful processing:**
```kotlin
// ✅ Good - Commits after processing
val records = consumer.poll(Duration.ofSeconds(1))
records.forEach { record ->
    processRecord(record)
}
consumer.commitSync() // Only commit if all succeed
```

❌ **Don't use auto-commit for exactly-once:**
```kotlin
// ❌ Bad - Auto-commit doesn't guarantee exactly-once
put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "true")
```

✅ **Use manual commit:**
```kotlin
// ✅ Good - Manual control over commits
put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "false")
// Commit explicitly after processing
consumer.commitSync()
```

❌ **Don't ignore idempotency:**
```kotlin
// ❌ Bad - No idempotency check
suspend fun handleEvent(event: CartEvent) {
    cartRepository.save(event.toCart())
}
```

✅ **Always check idempotency:**
```kotlin
// ✅ Good - Check if already processed
suspend fun handleEvent(event: CartEvent) {
    if (idempotencyService.isProcessed(event.eventId)) {
        logger.info { "Event already processed, skipping" }
        return
    }

    cartRepository.save(event.toCart())
    idempotencyService.markAsProcessed(event.eventId)
}
```

❌ **Don't block consumer thread:**
```kotlin
// ❌ Bad - Blocking I/O in consumer loop
while (isRunning) {
    val records = consumer.poll(Duration.ofSeconds(1))
    records.forEach { record ->
        Thread.sleep(1000) // Blocks consumer!
        processRecord(record)
    }
}
```

✅ **Use suspending functions:**
```kotlin
// ✅ Good - Non-blocking processing
while (isRunning) {
    val records = consumer.poll(Duration.ofSeconds(1))
    records.forEach { record ->
        delay(1000) // Non-blocking
        processRecord(record)
    }
}
```

❌ **Don't lose error context:**
```kotlin
// ❌ Bad - No error metadata
sendToDLQ(record.value())
```

✅ **Preserve error context:**
```kotlin
// ✅ Good - Include error metadata
sendToDLQ(
    record = record,
    error = e,
    metadata = mapOf(
        "original.topic" to record.topic(),
        "original.offset" to record.offset().toString(),
        "error.type" to e::class.simpleName,
        "error.message" to e.message
    )
)
```

❌ **Don't use high-cardinality partition keys:**
```kotlin
// ❌ Bad - Random partition key breaks ordering
val key = UUID.randomUUID().toString()
producer.send(ProducerRecord(topic, key, event))
```

✅ **Use aggregate ID as partition key:**
```kotlin
// ✅ Good - Consistent partition key maintains ordering
val key = event.cartId.toString() // All events for same cart go to same partition
producer.send(ProducerRecord(topic, key, event))
```

## Related Implementers

- **coroutines.md** - Suspending functions for non-blocking Kafka processing
- **observability.md** - Logging, metrics, and tracing for event-driven systems
- **error-handling.md** - Exception handling strategies for message processing
- **testing.md** - Testing Kafka consumers and producers with Testcontainers
- **domain-modeling.md** - Domain events and aggregate design
- **configuration.md** - Kafka configuration management
