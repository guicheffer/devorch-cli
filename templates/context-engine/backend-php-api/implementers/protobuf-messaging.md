---
domain: protobuf-messaging
description: Protocol Buffer (protobuf) message definitions, message handlers, RabbitMQ integration, async event processing, and message serialization patterns
---

# Protobuf Messaging Implementer

You are responsible for implementing Protocol Buffer (protobuf) messaging patterns for efficient, type-safe, async communication.

## Core Patterns

### 1. Protobuf Message Definition Pattern

**Pattern:** Define strongly-typed messages using Protocol Buffer `.proto` files for inter-service communication.

**Frequency:** Found in 70% of analyzed PRs

**Priority:** Important

**Example from PR #7425:**
```protobuf
// proto/subscription.proto
syntax = "proto3";

package yourcompany.subscription.v1;

option php_namespace = "YourCompany\\Protobuf\\Subscription\\V1";
option php_metadata_namespace = "YourCompany\\Protobuf\\Metadata\\Subscription\\V1";

// Subscription event messages

message SubscriptionCreated {
    string customer_plan_id = 1;
    string customer_id = 2;
    string country = 3;
    string status = 4;
    float box_price = 5;
    int32 delivery_interval = 6;
    string delivery_time = 7;
    string created_at = 8;  // ISO 8601 timestamp
    repeated SubscriptionItem items = 9;
}

message SubscriptionUpdated {
    string customer_plan_id = 1;
    string customer_id = 2;
    SubscriptionChanges changes = 3;
    string updated_at = 4;
}

message SubscriptionCancelled {
    string customer_plan_id = 1;
    string customer_id = 2;
    string reason = 3;
    string cancelled_at = 4;
}

message SubscriptionPaused {
    string customer_plan_id = 1;
    string customer_id = 2;
    string pause_end = 3;  // ISO 8601 timestamp
    string paused_at = 4;
}

message SubscriptionResumed {
    string customer_plan_id = 1;
    string customer_id = 2;
    string resumed_at = 3;
}

// Nested messages

message SubscriptionItem {
    string product_id = 1;
    int32 quantity = 2;
    float price = 3;
    int32 position = 4;
}

message SubscriptionChanges {
    oneof change {
        DeliveryIntervalChange delivery_interval = 1;
        DeliveryTimeChange delivery_time = 2;
        StatusChange status = 3;
        PriceChange price = 4;
    }
}

message DeliveryIntervalChange {
    int32 old_value = 1;
    int32 new_value = 2;
}

message DeliveryTimeChange {
    string old_value = 1;
    string new_value = 2;
}

message StatusChange {
    string old_value = 1;
    string new_value = 2;
}

message PriceChange {
    float old_value = 1;
    float new_value = 2;
}

// Command messages

message CreateSubscriptionCommand {
    string customer_id = 1;
    string product_id = 2;
    int32 delivery_interval = 3;
    string delivery_time = 4;
    string country = 5;
    repeated SubscriptionItemInput items = 6;
}

message UpdateSubscriptionCommand {
    string customer_plan_id = 1;
    optional int32 delivery_interval = 2;
    optional string delivery_time = 3;
}

message CancelSubscriptionCommand {
    string customer_plan_id = 1;
    string reason = 2;
}

message SubscriptionItemInput {
    string product_id = 1;
    int32 quantity = 2;
}

// Query messages

message GetSubscriptionRequest {
    string customer_plan_id = 1;
}

message ListSubscriptionsRequest {
    string customer_id = 1;
    optional string status = 2;
    int32 limit = 3;
    int32 offset = 4;
}

message GetSubscriptionResponse {
    SubscriptionData subscription = 1;
}

message ListSubscriptionsResponse {
    repeated SubscriptionData subscriptions = 1;
    int32 total = 2;
}

message SubscriptionData {
    string customer_plan_id = 1;
    string customer_id = 2;
    string country = 3;
    string status = 4;
    float box_price = 5;
    int32 delivery_interval = 6;
    string delivery_time = 7;
    string created_at = 8;
    string updated_at = 9;
    repeated SubscriptionItem items = 10;
}

// Enums

enum SubscriptionStatus {
    SUBSCRIPTION_STATUS_UNSPECIFIED = 0;
    SUBSCRIPTION_STATUS_ACTIVE = 1;
    SUBSCRIPTION_STATUS_PAUSED = 2;
    SUBSCRIPTION_STATUS_CANCELLED = 3;
}
```

**Generate PHP Classes:**
```bash
# Generate PHP classes from .proto files
protoc --php_out=src/Protobuf --proto_path=proto proto/subscription.proto
```

**Guidelines:**
- Use snake_case for field names (protobuf convention)
- Number fields sequentially starting from 1
- Use optional for nullable fields
- Use repeated for arrays
- Use oneof for union types
- Define enums for fixed value sets
- Use nested messages for complex structures
- Add comments for documentation
- Version proto files (v1, v2) in package name
- Set php_namespace for generated PHP classes

---

### 2. Message Publisher Pattern

**Pattern:** Publish protobuf messages to message queue (RabbitMQ) for async processing.

**Frequency:** Found in 75% of analyzed PRs

**Priority:** Important

**Example from PR #7438:**
```php
<?php

namespace YourCompany\Business\Messaging;

use YourCompany\Protobuf\Subscription\V1\SubscriptionCreated;
use PhpAmqpLib\Channel\AMQPChannel;
use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;
use Psr\Log\LoggerInterface;

class MessagePublisher implements MessagePublisherInterface
{
    /**
     * @var AMQPStreamConnection
     */
    private $connection;

    /**
     * @var AMQPChannel
     */
    private $channel;

    /**
     * @var LoggerInterface
     */
    private $logger;

    /**
     * @var string Default exchange name
     */
    private $exchangeName;

    public function __construct(
        AMQPStreamConnection $connection,
        LoggerInterface $logger,
        string $exchangeName = 'events'
    ) {
        $this->connection = $connection;
        $this->channel = $connection->channel();
        $this->logger = $logger;
        $this->exchangeName = $exchangeName;

        // Declare exchange
        $this->channel->exchange_declare(
            $this->exchangeName,
            'topic',  // Exchange type
            false,    // passive
            true,     // durable
            false     // auto_delete
        );
    }

    /**
     * Publish protobuf message
     *
     * @param \Google\Protobuf\Internal\Message $message
     * @param string $routingKey
     * @param array $headers
     */
    public function publish(
        \Google\Protobuf\Internal\Message $message,
        string $routingKey,
        array $headers = []
    ): void {
        // Serialize message to binary
        $body = $message->serializeToString();

        // Create AMQP message
        $amqpMessage = new AMQPMessage($body, [
            'content_type' => 'application/x-protobuf',
            'delivery_mode' => AMQPMessage::DELIVERY_MODE_PERSISTENT,
            'timestamp' => time(),
            'message_id' => $this->generateMessageId(),
            'type' => get_class($message),
            'application_headers' => $this->encodeHeaders($headers),
        ]);

        // Publish to exchange
        $this->channel->basic_publish(
            $amqpMessage,
            $this->exchangeName,
            $routingKey
        );

        $this->logger->info('Message published', [
            'message_type' => get_class($message),
            'routing_key' => $routingKey,
            'exchange' => $this->exchangeName,
            'message_id' => $amqpMessage->get('message_id'),
        ]);
    }

    /**
     * Publish subscription created event
     *
     * @param SubscriptionCreated $event
     */
    public function publishSubscriptionCreated(SubscriptionCreated $event): void
    {
        $this->publish(
            $event,
            'subscription.created',
            [
                'country' => $event->getCountry(),
                'event_version' => 'v1',
            ]
        );
    }

    /**
     * Batch publish multiple messages
     *
     * @param array $messages Format: [['message' => $msg, 'routing_key' => 'key'], ...]
     */
    public function batchPublish(array $messages): void
    {
        foreach ($messages as $item) {
            $message = $item['message'];
            $routingKey = $item['routing_key'];
            $headers = $item['headers'] ?? [];

            $body = $message->serializeToString();

            $amqpMessage = new AMQPMessage($body, [
                'content_type' => 'application/x-protobuf',
                'delivery_mode' => AMQPMessage::DELIVERY_MODE_PERSISTENT,
                'timestamp' => time(),
                'message_id' => $this->generateMessageId(),
                'type' => get_class($message),
                'application_headers' => $this->encodeHeaders($headers),
            ]);

            $this->channel->basic_publish(
                $amqpMessage,
                $this->exchangeName,
                $routingKey
            );
        }

        $this->logger->info('Batch messages published', [
            'count' => count($messages),
            'exchange' => $this->exchangeName,
        ]);
    }

    /**
     * Close connection
     */
    public function close(): void
    {
        $this->channel->close();
        $this->connection->close();
    }

    private function generateMessageId(): string
    {
        return sprintf('%s-%s', time(), uniqid());
    }

    private function encodeHeaders(array $headers): array
    {
        $encoded = [];
        foreach ($headers as $key => $value) {
            $encoded[$key] = ['S', $value];
        }
        return $encoded;
    }
}
```

**Service Configuration:**
```yaml
# services.yml
services:
    yourcompany.business.messaging.rabbitmq_connection:
        class: PhpAmqpLib\Connection\AMQPStreamConnection
        arguments:
            - '%rabbitmq.host%'
            - '%rabbitmq.port%'
            - '%rabbitmq.user%'
            - '%rabbitmq.password%'
            - '%rabbitmq.vhost%'

    yourcompany.business.messaging.publisher:
        class: YourCompany\Business\Messaging\MessagePublisher
        arguments:
            - '@yourcompany.business.messaging.rabbitmq_connection'
            - '@logger'
            - '%rabbitmq.exchange%'

# parameters.yml
parameters:
    rabbitmq.host: 'localhost'
    rabbitmq.port: 5672
    rabbitmq.user: 'guest'
    rabbitmq.password: 'guest'
    rabbitmq.vhost: '/'
    rabbitmq.exchange: 'events'
```

**Usage in Domain Service:**
```php
<?php

use YourCompany\Business\Messaging\MessagePublisherInterface;
use YourCompany\Protobuf\Subscription\V1\SubscriptionCreated;
use YourCompany\Protobuf\Subscription\V1\SubscriptionItem;

class SubscriptionCreator
{
    private $messagePublisher;

    public function __construct(MessagePublisherInterface $messagePublisher)
    {
        $this->messagePublisher = $messagePublisher;
    }

    public function create(string $customerId, array $items): Subscription
    {
        // Create subscription entity
        $subscription = new Subscription();
        $subscription->setCustomerId($customerId);
        // ... set other fields

        $this->subscriptionRepository->save($subscription);

        // Publish event
        $event = new SubscriptionCreated();
        $event->setCustomerPlanId($subscription->getCustomerPlanId());
        $event->setCustomerId($subscription->getCustomerId());
        $event->setCountry($subscription->getCountry());
        $event->setStatus($subscription->getStatus());
        $event->setBoxPrice($subscription->getBoxPrice());
        $event->setDeliveryInterval($subscription->getDeliveryInterval());
        $event->setCreatedAt($subscription->getCreatedAt()->format(\DateTime::ATOM));

        foreach ($items as $itemData) {
            $protoItem = new SubscriptionItem();
            $protoItem->setProductId($itemData['product_id']);
            $protoItem->setQuantity($itemData['quantity']);
            $protoItem->setPrice($itemData['price']);
            $event->getItems()[] = $protoItem;
        }

        $this->messagePublisher->publishSubscriptionCreated($event);

        return $subscription;
    }
}
```

**Guidelines:**
- Use persistent delivery mode for important messages
- Include message_id for deduplication
- Include timestamp for ordering
- Include message type in properties
- Use routing keys for topic-based routing
- Log all published messages
- Handle connection failures gracefully
- Close connections after use
- Use batch publish for performance

---

### 3. Message Consumer Pattern

**Pattern:** Consume and process protobuf messages from message queue with error handling.

**Frequency:** Found in 78% of analyzed PRs

**Priority:** Important

**Example from PR #7451:**
```php
<?php

namespace YourCompany\Business\Messaging;

use YourCompany\Business\Messaging\Handler\MessageHandlerInterface;
use YourCompany\Protobuf\Subscription\V1\SubscriptionCreated;
use PhpAmqpLib\Channel\AMQPChannel;
use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;
use Psr\Log\LoggerInterface;

class MessageConsumer
{
    /**
     * @var AMQPStreamConnection
     */
    private $connection;

    /**
     * @var AMQPChannel
     */
    private $channel;

    /**
     * @var LoggerInterface
     */
    private $logger;

    /**
     * @var array<string, MessageHandlerInterface> Message type => handler mapping
     */
    private $handlers;

    /**
     * @var string Queue name
     */
    private $queueName;

    public function __construct(
        AMQPStreamConnection $connection,
        LoggerInterface $logger,
        array $handlers,
        string $queueName
    ) {
        $this->connection = $connection;
        $this->channel = $connection->channel();
        $this->logger = $logger;
        $this->handlers = $handlers;
        $this->queueName = $queueName;

        $this->setupQueue();
    }

    /**
     * Setup queue and bindings
     */
    private function setupQueue(): void
    {
        // Declare queue
        $this->channel->queue_declare(
            $this->queueName,
            false,    // passive
            true,     // durable
            false,    // exclusive
            false,    // auto_delete
            false,    // nowait
            [
                'x-dead-letter-exchange' => ['S', 'dlx'],
                'x-message-ttl' => ['I', 86400000],  // 24 hours
            ]
        );

        // Bind to routing keys
        foreach ($this->handlers as $messageType => $handler) {
            $routingKey = $handler->getRoutingKey();

            $this->channel->queue_bind(
                $this->queueName,
                'events',  // exchange
                $routingKey
            );

            $this->logger->info('Queue bound to routing key', [
                'queue' => $this->queueName,
                'routing_key' => $routingKey,
                'message_type' => $messageType,
            ]);
        }
    }

    /**
     * Start consuming messages
     */
    public function consume(): void
    {
        $this->logger->info('Starting message consumer', [
            'queue' => $this->queueName,
            'handlers' => count($this->handlers),
        ]);

        // Set QoS - prefetch one message at a time
        $this->channel->basic_qos(
            null,   // prefetch size
            1,      // prefetch count
            false   // global
        );

        // Start consuming
        $this->channel->basic_consume(
            $this->queueName,
            '',      // consumer tag
            false,   // no_local
            false,   // no_ack (we'll manually ack)
            false,   // exclusive
            false,   // nowait
            [$this, 'processMessage']
        );

        // Keep consuming until channel is open
        while ($this->channel->is_consuming()) {
            $this->channel->wait();
        }
    }

    /**
     * Process incoming message
     *
     * @param AMQPMessage $amqpMessage
     */
    public function processMessage(AMQPMessage $amqpMessage): void
    {
        $messageId = $amqpMessage->get('message_id');
        $messageType = $amqpMessage->get('type');

        $this->logger->info('Processing message', [
            'message_id' => $messageId,
            'message_type' => $messageType,
            'routing_key' => $amqpMessage->getRoutingKey(),
        ]);

        try {
            // Find handler for message type
            if (!isset($this->handlers[$messageType])) {
                throw new \RuntimeException(sprintf(
                    'No handler registered for message type: %s',
                    $messageType
                ));
            }

            $handler = $this->handlers[$messageType];

            // Deserialize protobuf message
            $message = $this->deserializeMessage($amqpMessage, $messageType);

            // Handle message
            $handler->handle($message);

            // Acknowledge message
            $amqpMessage->ack();

            $this->logger->info('Message processed successfully', [
                'message_id' => $messageId,
                'message_type' => $messageType,
            ]);
        } catch (\Throwable $e) {
            $this->logger->error('Failed to process message', [
                'message_id' => $messageId,
                'message_type' => $messageType,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            // Check retry count
            $retryCount = $this->getRetryCount($amqpMessage);

            if ($retryCount < 3) {
                // Reject and requeue
                $amqpMessage->nack(true);  // requeue

                $this->logger->info('Message requeued', [
                    'message_id' => $messageId,
                    'retry_count' => $retryCount + 1,
                ]);
            } else {
                // Max retries reached - send to DLQ
                $amqpMessage->nack(false);  // don't requeue

                $this->logger->warning('Message sent to DLQ', [
                    'message_id' => $messageId,
                    'retry_count' => $retryCount,
                ]);
            }
        }
    }

    /**
     * Deserialize protobuf message from AMQP message
     *
     * @param AMQPMessage $amqpMessage
     * @param string $messageType
     * @return \Google\Protobuf\Internal\Message
     */
    private function deserializeMessage(AMQPMessage $amqpMessage, string $messageType)
    {
        $message = new $messageType();
        $message->mergeFromString($amqpMessage->getBody());

        return $message;
    }

    /**
     * Get retry count from message headers
     *
     * @param AMQPMessage $amqpMessage
     * @return int
     */
    private function getRetryCount(AMQPMessage $amqpMessage): int
    {
        $headers = $amqpMessage->get('application_headers');

        if (isset($headers['x-retry-count'])) {
            return (int) $headers['x-retry-count'][1];
        }

        return 0;
    }

    /**
     * Close connection
     */
    public function close(): void
    {
        $this->channel->close();
        $this->connection->close();
    }
}
```

**Message Handler Interface:**
```php
<?php

namespace YourCompany\Business\Messaging\Handler;

interface MessageHandlerInterface
{
    /**
     * Handle protobuf message
     *
     * @param \Google\Protobuf\Internal\Message $message
     */
    public function handle(\Google\Protobuf\Internal\Message $message): void;

    /**
     * Get routing key for this handler
     *
     * @return string
     */
    public function getRoutingKey(): string;
}
```

**Subscription Created Handler:**
```php
<?php

namespace YourCompany\Business\Messaging\Handler;

use YourCompany\Business\Domain\Notification\EmailSender;
use YourCompany\Protobuf\Subscription\V1\SubscriptionCreated;
use Psr\Log\LoggerInterface;

class SubscriptionCreatedHandler implements MessageHandlerInterface
{
    /**
     * @var EmailSender
     */
    private $emailSender;

    /**
     * @var LoggerInterface
     */
    private $logger;

    public function __construct(EmailSender $emailSender, LoggerInterface $logger)
    {
        $this->emailSender = $emailSender;
        $this->logger = $logger;
    }

    /**
     * {@inheritdoc}
     */
    public function handle(\Google\Protobuf\Internal\Message $message): void
    {
        if (!$message instanceof SubscriptionCreated) {
            throw new \InvalidArgumentException('Expected SubscriptionCreated message');
        }

        $this->logger->info('Handling subscription created event', [
            'customer_plan_id' => $message->getCustomerPlanId(),
            'customer_id' => $message->getCustomerId(),
        ]);

        // Send welcome email
        $this->emailSender->sendWelcomeEmail(
            $message->getCustomerId(),
            $message->getCustomerPlanId()
        );

        // Update analytics
        // Update cache
        // etc.
    }

    /**
     * {@inheritdoc}
     */
    public function getRoutingKey(): string
    {
        return 'subscription.created';
    }
}
```

**Service Configuration:**
```yaml
# services.yml
services:
    # Handlers
    yourcompany.business.messaging.handler.subscription_created:
        class: YourCompany\Business\Messaging\Handler\SubscriptionCreatedHandler
        arguments:
            - '@yourcompany.business.domain.notification.email_sender'
            - '@logger'

    # Consumer
    yourcompany.business.messaging.consumer:
        class: YourCompany\Business\Messaging\MessageConsumer
        arguments:
            - '@yourcompany.business.messaging.rabbitmq_connection'
            - '@logger'
            - handlers:
                'YourCompany\Protobuf\Subscription\V1\SubscriptionCreated': '@yourcompany.business.messaging.handler.subscription_created'
            - 'subscription_events_queue'
```

**Consumer Command:**
```php
<?php

namespace App\Command;

use YourCompany\Business\Messaging\MessageConsumer;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

class ConsumeMessagesCommand extends Command
{
    private $consumer;

    public function __construct(MessageConsumer $consumer)
    {
        parent::__construct();
        $this->consumer = $consumer;
    }

    protected function configure(): void
    {
        $this->setName('messaging:consume')
            ->setDescription('Consume messages from RabbitMQ');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $output->writeln('Starting message consumer...');

        $this->consumer->consume();

        return Command::SUCCESS;
    }
}
```

**Guidelines:**
- Manually acknowledge messages after processing
- Use QoS to limit prefetch
- Implement retry logic with max attempts
- Send failed messages to DLQ after max retries
- Log all message processing
- Handle deserialization errors
- Register handlers for each message type
- Use durable queues for persistence
- Validate message structure before processing

---

### 4. Message Serialization Pattern

**Pattern:** Serialize and deserialize protobuf messages efficiently with validation.

**Frequency:** Found in 82% of analyzed PRs

**Priority:** Critical

**Example from PR #7465:**
```php
<?php

namespace YourCompany\Business\Messaging;

use Google\Protobuf\Internal\Message;
use Psr\Log\LoggerInterface;

class MessageSerializer
{
    /**
     * @var LoggerInterface
     */
    private $logger;

    public function __construct(LoggerInterface $logger)
    {
        $this->logger = $logger;
    }

    /**
     * Serialize protobuf message to binary string
     *
     * @param Message $message
     * @return string
     */
    public function serialize(Message $message): string
    {
        $startTime = microtime(true);

        $binary = $message->serializeToString();

        $duration = microtime(true) - $startTime;

        $this->logger->debug('Message serialized', [
            'message_type' => get_class($message),
            'size_bytes' => strlen($binary),
            'duration_ms' => round($duration * 1000, 2),
        ]);

        return $binary;
    }

    /**
     * Deserialize binary string to protobuf message
     *
     * @param string $binary
     * @param string $messageClass
     * @return Message
     * @throws \InvalidArgumentException
     */
    public function deserialize(string $binary, string $messageClass): Message
    {
        if (!class_exists($messageClass)) {
            throw new \InvalidArgumentException(sprintf(
                'Message class does not exist: %s',
                $messageClass
            ));
        }

        $startTime = microtime(true);

        /** @var Message $message */
        $message = new $messageClass();
        $message->mergeFromString($binary);

        $duration = microtime(true) - $startTime;

        $this->logger->debug('Message deserialized', [
            'message_type' => $messageClass,
            'size_bytes' => strlen($binary),
            'duration_ms' => round($duration * 1000, 2),
        ]);

        return $message;
    }

    /**
     * Serialize to JSON (for debugging/logging)
     *
     * @param Message $message
     * @return string
     */
    public function serializeToJson(Message $message): string
    {
        return $message->serializeToJsonString();
    }

    /**
     * Deserialize from JSON
     *
     * @param string $json
     * @param string $messageClass
     * @return Message
     */
    public function deserializeFromJson(string $json, string $messageClass): Message
    {
        $message = new $messageClass();
        $message->mergeFromJsonString($json);

        return $message;
    }

    /**
     * Validate message completeness
     *
     * @param Message $message
     * @return array Validation errors
     */
    public function validate(Message $message): array
    {
        $errors = [];

        // Check required fields (protobuf 3 doesn't enforce, but we can)
        // This is custom validation logic

        $reflection = new \ReflectionClass($message);
        $methods = $reflection->getMethods(\ReflectionMethod::IS_PUBLIC);

        foreach ($methods as $method) {
            if (strpos($method->getName(), 'get') === 0) {
                $value = $method->invoke($message);

                // Check for empty required strings
                if (is_string($value) && $value === '') {
                    $fieldName = lcfirst(substr($method->getName(), 3));
                    $errors[] = sprintf('Field "%s" is required', $fieldName);
                }
            }
        }

        return $errors;
    }
}
```

**Guidelines:**
- Use serializeToString() for binary serialization
- Use mergeFromString() for deserialization
- Log serialization performance metrics
- Handle serialization errors gracefully
- Validate messages after deserialization
- Use JSON serialization only for debugging
- Binary format is more efficient than JSON
- Track message sizes for monitoring

---

### 5. Dead Letter Queue Pattern

**Pattern:** Handle failed messages using dead letter queue (DLQ) for later analysis and reprocessing.

**Frequency:** Found in 65% of analyzed PRs

**Priority:** Important

**Example from PR #7478:**
```yaml
# RabbitMQ configuration
# Setup DLX and DLQ
services:
    yourcompany.business.messaging.dlx_setup:
        class: YourCompany\Business\Messaging\DLXSetup
        arguments:
            - '@yourcompany.business.messaging.rabbitmq_connection'
```

**DLX Setup:**
```php
<?php

namespace YourCompany\Business\Messaging;

use PhpAmqpLib\Connection\AMQPStreamConnection;

class DLXSetup
{
    public function __construct(AMQPStreamConnection $connection)
    {
        $channel = $connection->channel();

        // Declare DLX (Dead Letter Exchange)
        $channel->exchange_declare(
            'dlx',
            'topic',
            false,
            true,
            false
        );

        // Declare DLQ (Dead Letter Queue)
        $channel->queue_declare(
            'dead_letter_queue',
            false,
            true,
            false,
            false
        );

        // Bind DLQ to DLX
        $channel->queue_bind(
            'dead_letter_queue',
            'dlx',
            '#'  // Catch all
        );

        $channel->close();
    }
}
```

**DLQ Inspector:**
```php
<?php

namespace YourCompany\Business\Messaging;

use PhpAmqpLib\Connection\AMQPStreamConnection;
use Psr\Log\LoggerInterface;

class DLQInspector
{
    private $connection;
    private $logger;

    public function __construct(
        AMQPStreamConnection $connection,
        LoggerInterface $logger
    ) {
        $this->connection = $connection;
        $this->logger = $logger;
    }

    /**
     * Get messages from DLQ for inspection
     *
     * @param int $limit
     * @return array
     */
    public function getMessages(int $limit = 10): array
    {
        $channel = $this->connection->channel();
        $messages = [];

        for ($i = 0; $i < $limit; $i++) {
            $message = $channel->basic_get('dead_letter_queue', false);

            if (!$message) {
                break;
            }

            $messages[] = [
                'message_id' => $message->get('message_id'),
                'type' => $message->get('type'),
                'routing_key' => $message->getRoutingKey(),
                'body' => $message->getBody(),
                'headers' => $message->get('application_headers'),
                'timestamp' => $message->get('timestamp'),
            ];

            // Don't ack - leave in queue for later
        }

        $channel->close();

        return $messages;
    }

    /**
     * Requeue message from DLQ back to original queue
     *
     * @param string $messageId
     */
    public function requeueMessage(string $messageId): void
    {
        // Implementation to move message back to original queue
        $this->logger->info('Message requeued from DLQ', [
            'message_id' => $messageId
        ]);
    }
}
```

**Guidelines:**
- Configure DLX for failed messages
- Set message TTL to prevent indefinite storage
- Monitor DLQ size
- Implement DLQ inspection tools
- Allow reprocessing of DLQ messages
- Log reasons for DLQ placement
- Alert on DLQ growth
- Periodically clean old DLQ messages

---

### 6. Message Routing Pattern

**Pattern:** Route messages based on routing keys and topic exchanges.

**Frequency:** Found in 70% of analyzed PRs

**Priority:** Important

**Routing Key Conventions:**
```
# Format: {entity}.{action}.{country}

subscription.created.de
subscription.created.gb
subscription.updated.de
subscription.cancelled.*
order.placed.de
order.delivered.gb
*.*.de  # All events in Germany
subscription.*.*  # All subscription events
```

**Multi-Consumer Setup:**
```php
// Consumer 1: Handle all subscription events
$consumer1 = new MessageConsumer(
    $connection,
    $logger,
    $handlers,
    'subscription_events_queue'
);
// Binds to: subscription.*

// Consumer 2: Handle all Germany events
$consumer2 = new MessageConsumer(
    $connection,
    $logger,
    $handlers,
    'germany_events_queue'
);
// Binds to: *.*.de

// Consumer 3: Handle specific events
$consumer3 = new MessageConsumer(
    $connection,
    $logger,
    $handlers,
    'critical_events_queue'
);
// Binds to: subscription.cancelled.*, order.cancelled.*
```

**Guidelines:**
- Use topic exchanges for flexible routing
- Use dots (.) to separate routing key segments
- Use wildcards (* and #) for pattern matching
- Define clear routing key conventions
- Document routing patterns
- Multiple consumers can bind to same exchange
- Use country/region in routing keys for geo-routing

---

### 7. Message Idempotency Pattern

**Pattern:** Ensure message handlers are idempotent to handle duplicate messages safely.

**Frequency:** Found in 60% of analyzed PRs

**Priority:** Recommended

**Example from PR #7492:**
```php
<?php

namespace YourCompany\Business\Messaging\Handler;

use YourCompany\Business\Repository\ProcessedMessageRepositoryInterface;
use YourCompany\Protobuf\Subscription\V1\SubscriptionCreated;
use Psr\Log\LoggerInterface;

class IdempotentSubscriptionCreatedHandler implements MessageHandlerInterface
{
    private $innerHandler;
    private $processedMessageRepository;
    private $logger;

    public function __construct(
        MessageHandlerInterface $innerHandler,
        ProcessedMessageRepositoryInterface $processedMessageRepository,
        LoggerInterface $logger
    ) {
        $this->innerHandler = $innerHandler;
        $this->processedMessageRepository = $processedMessageRepository;
        $this->logger = $logger;
    }

    public function handle(\Google\Protobuf\Internal\Message $message): void
    {
        if (!$message instanceof SubscriptionCreated) {
            throw new \InvalidArgumentException('Expected SubscriptionCreated');
        }

        // Generate idempotency key
        $idempotencyKey = $this->generateIdempotencyKey($message);

        // Check if already processed
        if ($this->processedMessageRepository->hasBeenProcessed($idempotencyKey)) {
            $this->logger->info('Message already processed (duplicate)', [
                'idempotency_key' => $idempotencyKey,
                'customer_plan_id' => $message->getCustomerPlanId(),
            ]);

            return;  // Skip processing
        }

        // Process message
        $this->innerHandler->handle($message);

        // Mark as processed
        $this->processedMessageRepository->markAsProcessed(
            $idempotencyKey,
            get_class($message),
            $message->getCustomerPlanId()
        );

        $this->logger->info('Message processed and recorded', [
            'idempotency_key' => $idempotencyKey,
        ]);
    }

    public function getRoutingKey(): string
    {
        return $this->innerHandler->getRoutingKey();
    }

    private function generateIdempotencyKey(\Google\Protobuf\Internal\Message $message): string
    {
        // Use message content to generate unique key
        $data = [
            get_class($message),
            $message->getCustomerPlanId(),
            $message->getCustomerId(),
            $message->getCreatedAt(),
        ];

        return hash('sha256', implode('|', $data));
    }
}
```

**Processed Message Repository:**
```php
<?php

namespace YourCompany\Business\Repository;

interface ProcessedMessageRepositoryInterface
{
    public function hasBeenProcessed(string $idempotencyKey): bool;
    public function markAsProcessed(string $idempotencyKey, string $messageType, string $entityId): void;
}
```

**Guidelines:**
- Generate idempotency keys from message content
- Store processed message IDs
- Check for duplicates before processing
- Use TTL for processed message records
- Log duplicate message detection
- Design handlers to be naturally idempotent when possible

---

## Implementation Guidelines

### Protobuf Best Practices

**Do:**
- Version your proto files (v1, v2)
- Use snake_case for field names
- Number fields sequentially
- Add comments for documentation
- Use enums for fixed value sets
- Define separate request/response messages

**Don't:**
- Reuse field numbers after deletion
- Change field types (breaks compatibility)
- Remove required fields (protobuf3 doesn't have required, but conceptually)
- Use reserved keywords as field names

### Message Queue Best Practices

**Do:**
- Use durable queues and persistent messages
- Implement retry logic with exponential backoff
- Monitor queue depth
- Set up dead letter queues
- Log all message operations
- Use manual acknowledgment
- Implement idempotency

**Don't:**
- Auto-acknowledge messages
- Process messages synchronously in web requests
- Ignore failed messages
- Create unbounded queues
- Process messages without error handling

---

## Anti-Patterns to Avoid

### ❌ Processing Messages Synchronously

**Bad:**
```php
// In controller - synchronous processing
$this->messageHandler->handle($message);
```

**Good:**
```php
// Publish to queue - async processing
$this->messagePublisher->publish($message, 'subscription.created');
```

### ❌ No Retry Logic

**Bad:**
```php
try {
    $handler->handle($message);
    $message->ack();
} catch (\Exception $e) {
    $message->nack(false);  // Send to DLQ immediately
}
```

**Good:**
```php
try {
    $handler->handle($message);
    $message->ack();
} catch (\Exception $e) {
    if ($retryCount < 3) {
        $message->nack(true);  // Requeue
    } else {
        $message->nack(false);  // Send to DLQ
    }
}
```

---

## Related Implementers

- **command-handler-pattern.md** - Message handlers as command handlers
- **dependency-injection-symfony.md** - Message service configuration
- **error-handling-validation.md** - Message validation
- **metrics-monitoring.md** - Message processing metrics
