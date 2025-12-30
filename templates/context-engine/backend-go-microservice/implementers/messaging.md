---
domain: messaging
description: Kafka messaging patterns using Sarama, Protobuf serialization, consumer groups, and event streaming
---

# Messaging Implementer

This implementer defines patterns for event-driven communication using Apache Kafka, including producers, consumers, consumer groups, and message schemas.

## Core Patterns

### Kafka Producer

Implement reliable message publishing with Sarama:

```go
import (
    "github.com/Shopify/sarama"
    "google.golang.org/protobuf/proto"
)

type EventPublisher struct {
    producer sarama.SyncProducer
    logger   *zap.Logger
    metrics  *Metrics
}

func NewEventPublisher(brokers []string, logger *zap.Logger) (*EventPublisher, error) {
    config := sarama.NewConfig()
    config.Producer.RequiredAcks = sarama.WaitForAll // Wait for all in-sync replicas
    config.Producer.Retry.Max = 5
    config.Producer.Return.Successes = true
    config.Producer.Compression = sarama.CompressionSnappy
    config.Producer.Idempotent = true // Exactly-once semantics
    config.Net.MaxOpenRequests = 1    // Required for idempotent producer

    // For high throughput, consider async producer
    producer, err := sarama.NewSyncProducer(brokers, config)
    if err != nil {
        return nil, fmt.Errorf("create producer: %w", err)
    }

    return &EventPublisher{
        producer: producer,
        logger:   logger,
    }, nil
}

func (p *EventPublisher) Publish(ctx context.Context, topic string, key string, event proto.Message) error {
    // Serialize event to protobuf
    data, err := proto.Marshal(event)
    if err != nil {
        return fmt.Errorf("marshal event: %w", err)
    }

    // Extract metadata from context
    traceID := trace.SpanContextFromContext(ctx).TraceID().String()

    msg := &sarama.ProducerMessage{
        Topic: topic,
        Key:   sarama.StringEncoder(key),
        Value: sarama.ByteEncoder(data),
        Headers: []sarama.RecordHeader{
            {
                Key:   []byte("trace_id"),
                Value: []byte(traceID),
            },
            {
                Key:   []byte("event_type"),
                Value: []byte(string(event.ProtoReflect().Descriptor().Name())),
            },
            {
                Key:   []byte("timestamp"),
                Value: []byte(time.Now().Format(time.RFC3339)),
            },
        },
    }

    partition, offset, err := p.producer.SendMessage(msg)
    if err != nil {
        p.logger.Error("failed to publish event",
            zap.Error(err),
            zap.String("topic", topic),
            zap.String("key", key),
        )
        return fmt.Errorf("send message: %w", err)
    }

    p.logger.Debug("event published",
        zap.String("topic", topic),
        zap.String("key", key),
        zap.Int32("partition", partition),
        zap.Int64("offset", offset),
    )

    return nil
}

func (p *EventPublisher) PublishBatch(ctx context.Context, topic string, events []Event) error {
    messages := make([]*sarama.ProducerMessage, 0, len(events))

    for _, event := range events {
        data, err := proto.Marshal(event.Message)
        if err != nil {
            return fmt.Errorf("marshal event: %w", err)
        }

        messages = append(messages, &sarama.ProducerMessage{
            Topic: topic,
            Key:   sarama.StringEncoder(event.Key),
            Value: sarama.ByteEncoder(data),
        })
    }

    // Note: For batch sending, use async producer
    return p.producer.SendMessages(messages)
}

func (p *EventPublisher) Close() error {
    return p.producer.Close()
}

// Domain event publishing
func (s *OrderService) PlaceOrder(ctx context.Context, input PlaceOrderInput) (*Order, error) {
    order, err := s.repo.Create(ctx, input)
    if err != nil {
        return nil, err
    }

    // Publish event
    event := &pb.OrderPlacedEvent{
        OrderId:    order.ID,
        CustomerId: order.CustomerID,
        TotalAmount: &pb.Money{
            Amount:   order.TotalAmount.Amount,
            Currency: order.TotalAmount.Currency,
        },
        Items: convertOrderItems(order.Items),
        PlacedAt: timestamppb.New(order.CreatedAt),
    }

    if err := s.publisher.Publish(ctx, "orders.placed", order.ID, event); err != nil {
        s.logger.Error("failed to publish order placed event",
            zap.Error(err),
            zap.String("order_id", order.ID),
        )
        // Decide: fail the operation or continue (at-least-once vs at-most-once)
    }

    return order, nil
}
```

### Kafka Consumer

Implement message consumption with consumer groups:

```go
type EventConsumer struct {
    consumerGroup sarama.ConsumerGroup
    handlers      map[string]EventHandler
    logger        *zap.Logger
}

type EventHandler func(context.Context, *sarama.ConsumerMessage) error

func NewEventConsumer(brokers []string, groupID string, logger *zap.Logger) (*EventConsumer, error) {
    config := sarama.NewConfig()
    config.Consumer.Group.Rebalance.Strategy = sarama.BalanceStrategyRoundRobin
    config.Consumer.Offsets.Initial = sarama.OffsetNewest
    config.Consumer.Return.Errors = true

    consumerGroup, err := sarama.NewConsumerGroup(brokers, groupID, config)
    if err != nil {
        return nil, fmt.Errorf("create consumer group: %w", err)
    }

    return &EventConsumer{
        consumerGroup: consumerGroup,
        handlers:      make(map[string]EventHandler),
        logger:        logger,
    }, nil
}

func (c *EventConsumer) RegisterHandler(eventType string, handler EventHandler) {
    c.handlers[eventType] = handler
}

func (c *EventConsumer) Start(ctx context.Context, topics []string) error {
    handler := &consumerGroupHandler{
        consumer: c,
        logger:   c.logger,
    }

    c.logger.Info("starting consumer",
        zap.Strings("topics", topics),
    )

    for {
        select {
        case <-ctx.Done():
            c.logger.Info("consumer context cancelled")
            return nil
        case err := <-c.consumerGroup.Errors():
            c.logger.Error("consumer group error", zap.Error(err))
        default:
            if err := c.consumerGroup.Consume(ctx, topics, handler); err != nil {
                c.logger.Error("consume error", zap.Error(err))
                return err
            }
        }
    }
}

func (c *EventConsumer) Close() error {
    return c.consumerGroup.Close()
}

type consumerGroupHandler struct {
    consumer *EventConsumer
    logger   *zap.Logger
}

func (h *consumerGroupHandler) Setup(sarama.ConsumerGroupSession) error {
    return nil
}

func (h *consumerGroupHandler) Cleanup(sarama.ConsumerGroupSession) error {
    return nil
}

func (h *consumerGroupHandler) ConsumeClaim(session sarama.ConsumerGroupSession, claim sarama.ConsumerGroupClaim) error {
    for {
        select {
        case <-session.Context().Done():
            return nil
        case message := <-claim.Messages():
            if err := h.handleMessage(session.Context(), message); err != nil {
                h.logger.Error("failed to handle message",
                    zap.Error(err),
                    zap.String("topic", message.Topic),
                    zap.Int64("offset", message.Offset),
                )
                // Decide: skip or retry
                continue
            }

            // Mark message as consumed
            session.MarkMessage(message, "")
        }
    }
}

func (h *consumerGroupHandler) handleMessage(ctx context.Context, msg *sarama.ConsumerMessage) error {
    // Extract event type from headers
    var eventType string
    for _, header := range msg.Headers {
        if string(header.Key) == "event_type" {
            eventType = string(header.Value)
            break
        }
    }

    handler, exists := h.consumer.handlers[eventType]
    if !exists {
        h.logger.Warn("no handler for event type",
            zap.String("event_type", eventType),
        )
        return nil
    }

    h.logger.Debug("processing message",
        zap.String("topic", msg.Topic),
        zap.String("event_type", eventType),
        zap.Int64("offset", msg.Offset),
    )

    return handler(ctx, msg)
}

// Register handlers
func (s *NotificationService) RegisterEventHandlers(consumer *EventConsumer) {
    consumer.RegisterHandler("OrderPlaced", func(ctx context.Context, msg *sarama.ConsumerMessage) error {
        var event pb.OrderPlacedEvent
        if err := proto.Unmarshal(msg.Value, &event); err != nil {
            return fmt.Errorf("unmarshal event: %w", err)
        }

        return s.handleOrderPlaced(ctx, &event)
    })

    consumer.RegisterHandler("OrderShipped", func(ctx context.Context, msg *sarama.ConsumerMessage) error {
        var event pb.OrderShippedEvent
        if err := proto.Unmarshal(msg.Value, &event); err != nil {
            return fmt.Errorf("unmarshal event: %w", err)
        }

        return s.handleOrderShipped(ctx, &event)
    })
}

func (s *NotificationService) handleOrderPlaced(ctx context.Context, event *pb.OrderPlacedEvent) error {
    // Send confirmation email
    notification := &Notification{
        Type:       NotificationTypeEmail,
        Recipient:  event.CustomerId,
        Subject:    "Order Confirmation",
        Body:       fmt.Sprintf("Your order %s has been placed", event.OrderId),
    }

    return s.notifier.Send(ctx, notification)
}
```

### Retry and Error Handling

Implement robust retry mechanisms:

```go
type RetryableConsumer struct {
    consumer      *EventConsumer
    retryProducer sarama.SyncProducer
    maxRetries    int
    logger        *zap.Logger
}

func (c *RetryableConsumer) HandleWithRetry(ctx context.Context, msg *sarama.ConsumerMessage, handler EventHandler) error {
    // Extract retry count from headers
    retryCount := 0
    for _, header := range msg.Headers {
        if string(header.Key) == "retry_count" {
            count, _ := strconv.Atoi(string(header.Value))
            retryCount = count
            break
        }
    }

    err := handler(ctx, msg)
    if err == nil {
        return nil
    }

    // Check if should retry
    if retryCount >= c.maxRetries {
        c.logger.Error("max retries exceeded, sending to DLQ",
            zap.Error(err),
            zap.String("topic", msg.Topic),
            zap.Int("retry_count", retryCount),
        )
        return c.sendToDLQ(msg, err)
    }

    // Send to retry topic with exponential backoff
    c.logger.Warn("retrying message",
        zap.Error(err),
        zap.String("topic", msg.Topic),
        zap.Int("retry_count", retryCount+1),
    )

    return c.sendToRetryTopic(msg, retryCount+1)
}

func (c *RetryableConsumer) sendToRetryTopic(msg *sarama.ConsumerMessage, retryCount int) error {
    retryMsg := &sarama.ProducerMessage{
        Topic: fmt.Sprintf("%s-retry", msg.Topic),
        Key:   sarama.ByteEncoder(msg.Key),
        Value: sarama.ByteEncoder(msg.Value),
        Headers: append(msg.Headers, sarama.RecordHeader{
            Key:   []byte("retry_count"),
            Value: []byte(strconv.Itoa(retryCount)),
        }),
    }

    _, _, err := c.retryProducer.SendMessage(retryMsg)
    return err
}

func (c *RetryableConsumer) sendToDLQ(msg *sarama.ConsumerMessage, originalErr error) error {
    dlqMsg := &sarama.ProducerMessage{
        Topic: fmt.Sprintf("%s-dlq", msg.Topic),
        Key:   sarama.ByteEncoder(msg.Key),
        Value: sarama.ByteEncoder(msg.Value),
        Headers: append(msg.Headers, sarama.RecordHeader{
            Key:   []byte("error"),
            Value: []byte(originalErr.Error()),
        }),
    }

    _, _, err := c.retryProducer.SendMessage(dlqMsg)
    return err
}
```

### Event Schemas with Protobuf

Define event schemas using Protocol Buffers:

```protobuf
// events/order.proto
syntax = "proto3";

package events;

import "google/protobuf/timestamp.proto";

message OrderPlacedEvent {
  string order_id = 1;
  string customer_id = 2;
  Money total_amount = 3;
  repeated OrderItem items = 4;
  google.protobuf.Timestamp placed_at = 5;
}

message OrderItem {
  string product_id = 1;
  string product_name = 2;
  int32 quantity = 3;
  Money unit_price = 4;
}

message Money {
  int64 amount = 1;    // in cents
  string currency = 2; // ISO 4217 code
}

message OrderShippedEvent {
  string order_id = 1;
  string tracking_number = 2;
  string carrier = 3;
  google.protobuf.Timestamp shipped_at = 4;
}

message OrderCancelledEvent {
  string order_id = 1;
  string reason = 2;
  google.protobuf.Timestamp cancelled_at = 3;
}

message PaymentProcessedEvent {
  string payment_id = 1;
  string order_id = 2;
  Money amount = 3;
  string payment_method = 4;
  string transaction_id = 5;
  google.protobuf.Timestamp processed_at = 6;
}
```

### Kafka Streams Processing

Process streams of events:

```go
type OrderAnalyticsStream struct {
    consumer *EventConsumer
    producer *EventPublisher
    window   time.Duration
    logger   *zap.Logger
}

type OrderStats struct {
    WindowStart   time.Time
    WindowEnd     time.Time
    TotalOrders   int
    TotalRevenue  int64
    TopProducts   []ProductStats
}

type ProductStats struct {
    ProductID   string
    ProductName string
    UnitsSold   int
    Revenue     int64
}

func (s *OrderAnalyticsStream) ProcessOrderStream(ctx context.Context) error {
    // In-memory state store (in production, use proper state store)
    currentWindow := &OrderStats{
        WindowStart: time.Now().Truncate(s.window),
        TopProducts: make([]ProductStats, 0),
    }
    productMap := make(map[string]*ProductStats)

    ticker := time.NewTicker(s.window)
    defer ticker.Stop()

    s.consumer.RegisterHandler("OrderPlaced", func(ctx context.Context, msg *sarama.ConsumerMessage) error {
        var event pb.OrderPlacedEvent
        if err := proto.Unmarshal(msg.Value, &event); err != nil {
            return err
        }

        // Update window statistics
        currentWindow.TotalOrders++
        currentWindow.TotalRevenue += event.TotalAmount.Amount

        // Update product statistics
        for _, item := range event.Items {
            stats, exists := productMap[item.ProductId]
            if !exists {
                stats = &ProductStats{
                    ProductID:   item.ProductId,
                    ProductName: item.ProductName,
                }
                productMap[item.ProductId] = stats
            }
            stats.UnitsSold += int(item.Quantity)
            stats.Revenue += item.UnitPrice.Amount * int64(item.Quantity)
        }

        return nil
    })

    // Publish window results
    go func() {
        for range ticker.C {
            if currentWindow.TotalOrders > 0 {
                currentWindow.WindowEnd = time.Now()
                currentWindow.TopProducts = s.getTopProducts(productMap, 10)

                // Publish aggregated statistics
                s.publishWindowStats(ctx, currentWindow)

                // Reset for next window
                currentWindow = &OrderStats{
                    WindowStart: time.Now().Truncate(s.window),
                    TopProducts: make([]ProductStats, 0),
                }
                productMap = make(map[string]*ProductStats)
            }
        }
    }()

    return s.consumer.Start(ctx, []string{"orders.placed"})
}

func (s *OrderAnalyticsStream) getTopProducts(productMap map[string]*ProductStats, limit int) []ProductStats {
    products := make([]ProductStats, 0, len(productMap))
    for _, stats := range productMap {
        products = append(products, *stats)
    }

    // Sort by revenue
    sort.Slice(products, func(i, j int) bool {
        return products[i].Revenue > products[j].Revenue
    })

    if len(products) > limit {
        products = products[:limit]
    }

    return products
}
```

### Idempotent Consumers

Ensure exactly-once processing semantics:

```go
type IdempotentConsumer struct {
    consumer      *EventConsumer
    processedMsgs *sync.Map // In production, use Redis or database
    ttl           time.Duration
}

type ProcessedMessage struct {
    MessageID   string
    ProcessedAt time.Time
}

func (c *IdempotentConsumer) HandleIdempotent(ctx context.Context, msg *sarama.ConsumerMessage, handler EventHandler) error {
    // Generate message ID from topic, partition, and offset
    messageID := fmt.Sprintf("%s-%d-%d", msg.Topic, msg.Partition, msg.Offset)

    // Check if already processed
    if _, exists := c.processedMsgs.Load(messageID); exists {
        c.logger.Debug("message already processed, skipping",
            zap.String("message_id", messageID),
        )
        return nil
    }

    // Process message
    if err := handler(ctx, msg); err != nil {
        return err
    }

    // Mark as processed
    c.processedMsgs.Store(messageID, &ProcessedMessage{
        MessageID:   messageID,
        ProcessedAt: time.Now(),
    })

    return nil
}

// Cleanup old processed messages
func (c *IdempotentConsumer) StartCleanup(ctx context.Context) {
    ticker := time.NewTicker(5 * time.Minute)
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done():
            return
        case <-ticker.C:
            cutoff := time.Now().Add(-c.ttl)
            c.processedMsgs.Range(func(key, value interface{}) bool {
                if pm, ok := value.(*ProcessedMessage); ok {
                    if pm.ProcessedAt.Before(cutoff) {
                        c.processedMsgs.Delete(key)
                    }
                }
                return true
            })
        }
    }
}
```

## Implementation Guidelines

### Producer Best Practices

1. **Idempotence**: Enable idempotent producer for exactly-once semantics
2. **Compression**: Use Snappy or LZ4 compression for better throughput
3. **Batching**: Batch messages for higher throughput
4. **Error handling**: Implement retry logic with exponential backoff
5. **Schema versioning**: Use Protobuf for backward-compatible schemas

### Consumer Best Practices

1. **Consumer groups**: Use consumer groups for horizontal scaling
2. **Offset management**: Commit offsets only after successful processing
3. **Error handling**: Implement retry queues and dead letter queues
4. **Idempotency**: Ensure message handlers are idempotent
5. **Graceful shutdown**: Handle context cancellation properly

### Performance Optimization

1. **Batch processing**: Process messages in batches when possible
2. **Concurrent processing**: Use worker pools for CPU-bound operations
3. **Backpressure**: Implement backpressure mechanisms
4. **Connection pooling**: Reuse producer connections
5. **Monitoring**: Track consumer lag and processing time

## Anti-Patterns to Avoid

### Don't Block Consumer Loop

```go
// Bad: Blocking consumer
func handleMessage(msg *sarama.ConsumerMessage) error {
    time.Sleep(5 * time.Second) // Blocks other messages
    return processMessage(msg)
}

// Good: Async processing
func handleMessage(msg *sarama.ConsumerMessage) error {
    go processMessage(msg) // Process async
    return nil
}
```

### Don't Ignore Consumer Errors

```go
// Bad
consumer.Consume(ctx, topics, handler)

// Good
if err := consumer.Consume(ctx, topics, handler); err != nil {
    logger.Error("consumer error", zap.Error(err))
    return err
}
```

### Don't Commit Offsets Early

```go
// Bad: Commit before processing
session.MarkMessage(message, "")
processMessage(message) // If this fails, message is lost

// Good: Commit after successful processing
if err := processMessage(message); err != nil {
    return err
}
session.MarkMessage(message, "")
```

## Related Implementers

- **domain-modeling.md**: Domain events being published
- **logging-observability.md**: Tracing message flow
- **error-handling.md**: Error handling in message processing
- **testing.md**: Testing message producers and consumers
