---
domain: logging-observability
description: Verify Zap structured logging, OpenTelemetry tracing, Prometheus metrics, and comprehensive observability patterns for production debugging
---

# Logging and Observability Verification

Verify that implementation follows observability best practices with structured logging using Zap, distributed tracing with OpenTelemetry, metrics with Prometheus, and proper instrumentation.

## Verification Checklist

### 1. Zap Structured Logging

**Requirement:** All logging must use Zap with structured fields. No fmt.Printf or log.Println allowed in production code.

**Verification Steps:**

✅ **Check logger initialization:**
```go
// ✅ Correct - Zap logger initialization
// File: internal/infrastructure/logging/logger.go
package logging

import (
    "go.uber.org/zap"
    "go.uber.org/zap/zapcore"
)

func NewLogger(env string) (*zap.Logger, error) {
    var config zap.Config

    if env == "production" {
        config = zap.NewProductionConfig()
        config.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
    } else {
        config = zap.NewDevelopmentConfig()
        config.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
    }

    config.OutputPaths = []string{"stdout"}
    config.ErrorOutputPaths = []string{"stderr"}

    logger, err := config.Build(
        zap.AddCallerSkip(1),
        zap.AddStacktrace(zapcore.ErrorLevel),
    )
    if err != nil {
        return nil, err
    }

    return logger, nil
}

// ❌ Incorrect - using standard library logger
import "log"

func NewLogger() *log.Logger {
    return log.New(os.Stdout, "", log.LstdFlags)
}
```

✅ **Check structured logging in services:**
```go
// ✅ Correct - structured logging with context
type OrderService struct {
    repo   order.Repository
    logger *zap.Logger
}

func (s *OrderService) CreateOrder(ctx context.Context, req CreateOrderRequest) (*order.Order, error) {
    // Extract trace context
    traceID := getTraceID(ctx)

    logger := s.logger.With(
        zap.String("trace_id", traceID),
        zap.String("user_id", req.UserID.String()),
        zap.String("operation", "create_order"),
    )

    logger.Info("creating order",
        zap.Int("items_count", len(req.Items)),
    )

    o, err := order.NewOrder(req.UserID, req.Items)
    if err != nil {
        logger.Error("failed to create order entity",
            zap.Error(err),
            zap.Any("request", req),
        )
        return nil, fmt.Errorf("failed to create order: %w", err)
    }

    if err := s.repo.Save(ctx, o); err != nil {
        logger.Error("failed to save order",
            zap.String("order_id", o.ID().String()),
            zap.Error(err),
        )
        return nil, fmt.Errorf("failed to save order: %w", err)
    }

    logger.Info("order created successfully",
        zap.String("order_id", o.ID().String()),
        zap.String("status", string(o.Status())),
        zap.Duration("duration", time.Since(startTime)),
    )

    return o, nil
}

// ❌ Incorrect - unstructured logging
func (s *OrderService) CreateOrder(ctx context.Context, req CreateOrderRequest) (*order.Order, error) {
    log.Printf("Creating order for user %s", req.UserID)  // Unstructured!

    o, err := order.NewOrder(req.UserID, req.Items)
    if err != nil {
        log.Printf("Error: %v", err)  // No context!
        return nil, err
    }

    s.repo.Save(ctx, o)
    log.Println("Order created")  // No order ID!

    return o, nil
}
```

✅ **Check log levels are appropriate:**
```go
// ✅ Correct - appropriate log levels
func (s *UserService) GetUser(ctx context.Context, id uuid.UUID) (*user.User, error) {
    logger := s.logger.With(
        zap.String("user_id", id.String()),
    )

    logger.Debug("fetching user from repository")  // Debug level for detailed info

    u, err := s.repo.FindByID(ctx, id)
    if err != nil {
        if errors.Is(err, user.ErrNotFound) {
            logger.Info("user not found")  // Info level - expected error
            return nil, fmt.Errorf("user not found: %w", err)
        }

        logger.Error("failed to fetch user",  // Error level - unexpected error
            zap.Error(err),
        )
        return nil, fmt.Errorf("failed to fetch user: %w", err)
    }

    logger.Debug("user fetched successfully")

    return u, nil
}

// ❌ Incorrect - everything at same log level
func (s *UserService) GetUser(ctx context.Context, id uuid.UUID) (*user.User, error) {
    s.logger.Info("fetching user")  // Too noisy

    u, err := s.repo.FindByID(ctx, id)
    if err != nil {
        s.logger.Error("error", zap.Error(err))  // Lost context
        return nil, err
    }

    s.logger.Info("done")  // Not useful
    return u, nil
}
```

✅ **Check logger context propagation:**
```go
// ✅ Correct - logger with request context
func (h *OrderHandler) CreateOrder(ctx context.Context, req *pb.CreateOrderRequest) (*pb.CreateOrderResponse, error) {
    // Extract metadata from context
    md, ok := metadata.FromIncomingContext(ctx)
    if !ok {
        md = metadata.MD{}
    }

    // Create logger with request context
    logger := h.logger.With(
        zap.String("method", "CreateOrder"),
        zap.String("trace_id", getTraceID(ctx)),
        zap.String("request_id", getRequestID(md)),
        zap.String("user_agent", getUserAgent(md)),
    )

    logger.Info("received create order request",
        zap.String("user_id", req.GetUserId()),
    )

    startTime := time.Now()

    orderReq := toCreateOrderRequest(req)
    order, err := h.service.CreateOrder(ctx, orderReq)
    if err != nil {
        logger.Error("failed to create order",
            zap.Error(err),
            zap.Duration("duration", time.Since(startTime)),
        )
        return nil, mapErrorToStatus(err)
    }

    logger.Info("order created successfully",
        zap.String("order_id", order.ID().String()),
        zap.Duration("duration", time.Since(startTime)),
    )

    return toOrderResponse(order), nil
}

// ❌ Incorrect - no context in logs
func (h *OrderHandler) CreateOrder(ctx context.Context, req *pb.CreateOrderRequest) (*pb.CreateOrderResponse, error) {
    h.logger.Info("creating order")  // No trace ID, request ID, etc.

    order, err := h.service.CreateOrder(ctx, toCreateOrderRequest(req))
    if err != nil {
        h.logger.Error("error", zap.Error(err))  // No context
        return nil, err
    }

    return toOrderResponse(order), nil
}
```

✅ **Check sensitive data redaction:**
```go
// ✅ Correct - sensitive data redacted
func (s *UserService) UpdatePassword(ctx context.Context, userID uuid.UUID, oldPassword, newPassword string) error {
    logger := s.logger.With(
        zap.String("user_id", userID.String()),
    )

    logger.Info("updating user password")  // No password in logs!

    user, err := s.repo.FindByID(ctx, userID)
    if err != nil {
        logger.Error("failed to find user",
            zap.Error(err),
        )
        return fmt.Errorf("failed to find user: %w", err)
    }

    // Verify old password
    if !user.VerifyPassword(oldPassword) {
        logger.Warn("invalid old password provided")  // No actual password
        return errors.New("invalid old password")
    }

    // Update password
    if err := user.SetPassword(newPassword); err != nil {
        logger.Error("failed to set new password",
            zap.Error(err),
        )
        return fmt.Errorf("failed to set password: %w", err)
    }

    if err := s.repo.Update(ctx, user); err != nil {
        logger.Error("failed to update user",
            zap.Error(err),
        )
        return fmt.Errorf("failed to update user: %w", err)
    }

    logger.Info("password updated successfully")

    return nil
}

// ❌ Incorrect - logging sensitive data
func (s *UserService) UpdatePassword(ctx context.Context, userID uuid.UUID, oldPassword, newPassword string) error {
    s.logger.Info("updating password",
        zap.String("old_password", oldPassword),  // SECURITY ISSUE!
        zap.String("new_password", newPassword),  // SECURITY ISSUE!
    )
    // ...
}
```

**How to Verify:**
```bash
# Check for Zap logger usage
grep -r "zap.Logger" internal/

# Find unstructured logging (anti-pattern)
grep -r "fmt.Printf\|log.Printf\|log.Println" internal/ | grep -v "_test.go"

# Verify structured fields
grep -r "logger\\.Error\|logger\\.Info\|logger\\.Warn" internal/ | grep "zap\\."

# Check for sensitive data in logs (passwords, tokens, etc.)
grep -r "zap.String.*password\|zap.String.*token\|zap.String.*secret" internal/
```

**Expected Result:**
- All logging uses Zap structured logger
- No fmt.Printf or log.Printf in production code
- Appropriate log levels (Debug, Info, Warn, Error)
- Logger includes trace ID and request context
- Sensitive data never logged

---

### 2. OpenTelemetry Distributed Tracing

**Requirement:** All service operations must be instrumented with OpenTelemetry spans for distributed tracing.

**Verification Steps:**

✅ **Check tracer initialization:**
```go
// ✅ Correct - OpenTelemetry tracer setup
// File: internal/infrastructure/tracing/tracer.go
package tracing

import (
    "context"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/jaeger"
    "go.opentelemetry.io/otel/sdk/resource"
    "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.4.0"
)

func InitTracer(serviceName, jaegerEndpoint string) (*trace.TracerProvider, error) {
    // Create Jaeger exporter
    exporter, err := jaeger.New(
        jaeger.WithCollectorEndpoint(
            jaeger.WithEndpoint(jaegerEndpoint),
        ),
    )
    if err != nil {
        return nil, err
    }

    // Create trace provider
    tp := trace.NewTracerProvider(
        trace.WithBatcher(exporter),
        trace.WithResource(resource.NewWithAttributes(
            semconv.SchemaURL,
            semconv.ServiceNameKey.String(serviceName),
            semconv.ServiceVersionKey.String("1.0.0"),
        )),
        trace.WithSampler(trace.AlwaysSample()),
    )

    otel.SetTracerProvider(tp)

    return tp, nil
}

// ❌ Incorrect - no tracing setup
func InitTracer() {
    // No-op
}
```

✅ **Check span creation in services:**
```go
// ✅ Correct - creating spans for operations
import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/codes"
    "go.opentelemetry.io/otel/trace"
)

var tracer = otel.Tracer("order-service")

func (s *OrderService) CreateOrder(ctx context.Context, req CreateOrderRequest) (*order.Order, error) {
    // Start span
    ctx, span := tracer.Start(ctx, "OrderService.CreateOrder",
        trace.WithAttributes(
            attribute.String("user_id", req.UserID.String()),
            attribute.Int("items_count", len(req.Items)),
        ),
    )
    defer span.End()

    logger := s.logger.With(
        zap.String("trace_id", span.SpanContext().TraceID().String()),
        zap.String("span_id", span.SpanContext().SpanID().String()),
    )

    logger.Info("creating order")

    // Create order entity
    o, err := order.NewOrder(req.UserID, req.Items)
    if err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, "failed to create order entity")
        logger.Error("failed to create order entity", zap.Error(err))
        return nil, fmt.Errorf("failed to create order: %w", err)
    }

    span.SetAttributes(attribute.String("order_id", o.ID().String()))

    // Save order
    if err := s.repo.Save(ctx, o); err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, "failed to save order")
        logger.Error("failed to save order", zap.Error(err))
        return nil, fmt.Errorf("failed to save order: %w", err)
    }

    span.SetStatus(codes.Ok, "order created successfully")
    span.SetAttributes(
        attribute.String("order_status", string(o.Status())),
        attribute.String("order_total", o.Total().String()),
    )

    logger.Info("order created successfully",
        zap.String("order_id", o.ID().String()),
    )

    return o, nil
}

// ❌ Incorrect - no tracing instrumentation
func (s *OrderService) CreateOrder(ctx context.Context, req CreateOrderRequest) (*order.Order, error) {
    o, err := order.NewOrder(req.UserID, req.Items)
    if err != nil {
        return nil, err
    }

    if err := s.repo.Save(ctx, o); err != nil {
        return nil, err
    }

    return o, nil
    // No spans, trace context not propagated
}
```

✅ **Check nested spans:**
```go
// ✅ Correct - nested spans for sub-operations
func (s *OrderService) ProcessOrder(ctx context.Context, orderID uuid.UUID) error {
    ctx, span := tracer.Start(ctx, "OrderService.ProcessOrder",
        trace.WithAttributes(
            attribute.String("order_id", orderID.String()),
        ),
    )
    defer span.End()

    // Child span: fetch order
    order, err := s.fetchOrder(ctx, orderID)
    if err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, "failed to fetch order")
        return err
    }

    // Child span: validate order
    if err := s.validateOrder(ctx, order); err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, "validation failed")
        return err
    }

    // Child span: reserve inventory
    if err := s.reserveInventory(ctx, order.Items()); err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, "failed to reserve inventory")
        return err
    }

    // Child span: update order status
    if err := s.updateOrderStatus(ctx, order, order.StatusProcessing); err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, "failed to update status")
        return err
    }

    span.SetStatus(codes.Ok, "order processed successfully")
    return nil
}

func (s *OrderService) fetchOrder(ctx context.Context, orderID uuid.UUID) (*order.Order, error) {
    ctx, span := tracer.Start(ctx, "OrderService.fetchOrder")
    defer span.End()

    o, err := s.repo.FindByID(ctx, orderID)
    if err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, "not found")
        return nil, err
    }

    span.SetStatus(codes.Ok, "order fetched")
    return o, nil
}

func (s *OrderService) validateOrder(ctx context.Context, o *order.Order) error {
    ctx, span := tracer.Start(ctx, "OrderService.validateOrder")
    defer span.End()

    if !o.CanProcess() {
        err := errors.New("order cannot be processed")
        span.RecordError(err)
        span.SetStatus(codes.Error, "validation failed")
        return err
    }

    span.SetStatus(codes.Ok, "order valid")
    return nil
}

// ❌ Incorrect - no child spans
func (s *OrderService) ProcessOrder(ctx context.Context, orderID uuid.UUID) error {
    ctx, span := tracer.Start(ctx, "OrderService.ProcessOrder")
    defer span.End()

    s.repo.FindByID(ctx, orderID)  // No child span!
    s.validateOrder(ctx, order)    // No child span!
    s.updateStatus(ctx, order)     // No child span!

    // Lost granularity in traces
    return nil
}
```

✅ **Check trace context propagation in gRPC:**
```go
// ✅ Correct - gRPC interceptor for trace propagation
// File: internal/interfaces/grpc/interceptors/tracing.go
package interceptors

import (
    "context"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/trace"
    "google.golang.org/grpc"
)

func TracingUnaryInterceptor(tracer trace.Tracer) grpc.UnaryServerInterceptor {
    return func(
        ctx context.Context,
        req interface{},
        info *grpc.UnaryServerInfo,
        handler grpc.UnaryHandler,
    ) (interface{}, error) {
        // Extract trace context from metadata
        ctx, span := tracer.Start(ctx, info.FullMethod,
            trace.WithSpanKind(trace.SpanKindServer),
        )
        defer span.End()

        // Call handler with trace context
        resp, err := handler(ctx, req)
        if err != nil {
            span.RecordError(err)
            span.SetStatus(codes.Error, err.Error())
        } else {
            span.SetStatus(codes.Ok, "success")
        }

        return resp, err
    }
}

// ❌ Incorrect - no trace propagation
func TracingUnaryInterceptor() grpc.UnaryServerInterceptor {
    return func(
        ctx context.Context,
        req interface{},
        info *grpc.UnaryServerInfo,
        handler grpc.UnaryHandler,
    ) (interface{}, error) {
        return handler(ctx, req)  // No tracing!
    }
}
```

✅ **Check span events and attributes:**
```go
// ✅ Correct - adding events and attributes to spans
func (s *OrderService) ShipOrder(ctx context.Context, orderID uuid.UUID, carrier, tracking string) error {
    ctx, span := tracer.Start(ctx, "OrderService.ShipOrder")
    defer span.End()

    span.SetAttributes(
        attribute.String("order_id", orderID.String()),
        attribute.String("carrier", carrier),
        attribute.String("tracking_number", tracking),
    )

    order, err := s.repo.FindByID(ctx, orderID)
    if err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, "order not found")
        return err
    }

    span.AddEvent("Order fetched")

    // Validate can ship
    if order.Status() != order.StatusConfirmed {
        err := fmt.Errorf("cannot ship order in status: %s", order.Status())
        span.RecordError(err)
        span.SetStatus(codes.Error, "invalid order state")
        span.AddEvent("Validation failed",
            trace.WithAttributes(
                attribute.String("current_status", string(order.Status())),
                attribute.String("required_status", "confirmed"),
            ),
        )
        return err
    }

    span.AddEvent("Validation passed")

    // Update order
    if err := order.Ship(tracking, carrier); err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, "failed to update order")
        return err
    }

    span.AddEvent("Order entity updated")

    // Save
    if err := s.repo.Update(ctx, order); err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, "failed to save order")
        return err
    }

    span.AddEvent("Order saved")
    span.SetStatus(codes.Ok, "order shipped successfully")

    return nil
}

// ❌ Incorrect - minimal span information
func (s *OrderService) ShipOrder(ctx context.Context, orderID uuid.UUID, carrier, tracking string) error {
    ctx, span := tracer.Start(ctx, "ShipOrder")  // No attributes
    defer span.End()

    // ... operation ...
    return nil
    // No events, no error recording
}
```

**How to Verify:**
```bash
# Check for OpenTelemetry imports
grep -r "go.opentelemetry.io/otel" internal/

# Verify span creation
grep -r "tracer.Start(" internal/

# Check error recording in spans
grep -r "span.RecordError\|span.SetStatus" internal/

# Verify span attributes
grep -r "attribute.String\|attribute.Int" internal/
```

**Expected Result:**
- OpenTelemetry tracer initialized
- All service methods create spans
- Spans include relevant attributes
- Errors recorded in spans
- Trace context propagated through gRPC
- Nested spans for sub-operations

---

### 3. Prometheus Metrics

**Requirement:** Critical operations must be instrumented with Prometheus metrics for monitoring and alerting.

**Verification Steps:**

✅ **Check metrics initialization:**
```go
// ✅ Correct - Prometheus metrics definition
// File: internal/infrastructure/metrics/metrics.go
package metrics

import (
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promauto"
)

var (
    // Request metrics
    RequestsTotal = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "http_requests_total",
            Help: "Total number of HTTP requests",
        },
        []string{"method", "endpoint", "status"},
    )

    RequestDuration = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "http_request_duration_seconds",
            Help:    "HTTP request duration in seconds",
            Buckets: prometheus.DefBuckets,
        },
        []string{"method", "endpoint"},
    )

    // Order metrics
    OrdersCreated = promauto.NewCounter(
        prometheus.CounterOpts{
            Name: "orders_created_total",
            Help: "Total number of orders created",
        },
    )

    OrdersProcessed = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "orders_processed_total",
            Help: "Total number of orders processed",
        },
        []string{"status"},
    )

    OrderProcessingDuration = promauto.NewHistogram(
        prometheus.HistogramOpts{
            Name:    "order_processing_duration_seconds",
            Help:    "Order processing duration in seconds",
            Buckets: []float64{.005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5, 10},
        },
    )

    // Repository metrics
    RepositoryOperations = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "repository_operations_total",
            Help: "Total number of repository operations",
        },
        []string{"operation", "entity", "status"},
    )

    RepositoryLatency = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "repository_operation_duration_seconds",
            Help:    "Repository operation duration in seconds",
            Buckets: prometheus.DefBuckets,
        },
        []string{"operation", "entity"},
    )

    // Active connections
    ActiveConnections = promauto.NewGauge(
        prometheus.GaugeOpts{
            Name: "active_connections",
            Help: "Number of active database connections",
        },
    )
)

// ❌ Incorrect - no metrics defined
package metrics

var (
    // Empty - no instrumentation
)
```

✅ **Check metrics in service layer:**
```go
// ✅ Correct - instrumenting service with metrics
func (s *OrderService) CreateOrder(ctx context.Context, req CreateOrderRequest) (*order.Order, error) {
    startTime := time.Now()

    // Create order
    o, err := order.NewOrder(req.UserID, req.Items)
    if err != nil {
        return nil, fmt.Errorf("failed to create order: %w", err)
    }

    // Save order
    if err := s.repo.Save(ctx, o); err != nil {
        return nil, fmt.Errorf("failed to save order: %w", err)
    }

    // Record metrics
    metrics.OrdersCreated.Inc()
    metrics.OrderProcessingDuration.Observe(time.Since(startTime).Seconds())

    s.logger.Info("order created successfully",
        zap.String("order_id", o.ID().String()),
        zap.Duration("duration", time.Since(startTime)),
    )

    return o, nil
}

func (s *OrderService) ProcessOrder(ctx context.Context, orderID uuid.UUID) error {
    startTime := time.Now()
    status := "success"

    defer func() {
        // Record metrics on return
        metrics.OrdersProcessed.WithLabelValues(status).Inc()
        metrics.OrderProcessingDuration.Observe(time.Since(startTime).Seconds())
    }()

    // Process order logic
    if err := s.doProcessing(ctx, orderID); err != nil {
        status = "error"
        return err
    }

    return nil
}

// ❌ Incorrect - no metrics
func (s *OrderService) CreateOrder(ctx context.Context, req CreateOrderRequest) (*order.Order, error) {
    o, err := order.NewOrder(req.UserID, req.Items)
    if err != nil {
        return nil, err
    }

    if err := s.repo.Save(ctx, o); err != nil {
        return nil, err
    }

    return o, nil
    // No metrics recorded!
}
```

✅ **Check metrics in repository layer:**
```go
// ✅ Correct - instrumenting repository operations
func (r *OrderRepository) FindByID(ctx context.Context, id uuid.UUID) (*order.Order, error) {
    startTime := time.Now()
    operation := "find_by_id"
    entity := "order"
    status := "success"

    defer func() {
        metrics.RepositoryOperations.WithLabelValues(operation, entity, status).Inc()
        metrics.RepositoryLatency.WithLabelValues(operation, entity).Observe(
            time.Since(startTime).Seconds(),
        )
    }()

    var doc orderDocument
    err := r.collection.FindOne(ctx, bson.M{"_id": id.String()}).Decode(&doc)
    if err != nil {
        if err == mongo.ErrNoDocuments {
            status = "not_found"
            return nil, fmt.Errorf("order not found: %w", order.ErrNotFound)
        }
        status = "error"
        return nil, fmt.Errorf("failed to find order: %w", err)
    }

    return doc.toDomain(), nil
}

func (r *OrderRepository) Save(ctx context.Context, o *order.Order) error {
    startTime := time.Now()
    operation := "save"
    entity := "order"
    status := "success"

    defer func() {
        metrics.RepositoryOperations.WithLabelValues(operation, entity, status).Inc()
        metrics.RepositoryLatency.WithLabelValues(operation, entity).Observe(
            time.Since(startTime).Seconds(),
        )
    }()

    doc := fromDomain(o)

    _, err := r.collection.ReplaceOne(
        ctx,
        bson.M{"_id": doc.ID},
        doc,
        options.Replace().SetUpsert(true),
    )
    if err != nil {
        status = "error"
        return fmt.Errorf("failed to save order: %w", err)
    }

    return nil
}

// ❌ Incorrect - no repository metrics
func (r *OrderRepository) FindByID(ctx context.Context, id uuid.UUID) (*order.Order, error) {
    var doc orderDocument
    err := r.collection.FindOne(ctx, bson.M{"_id": id.String()}).Decode(&doc)
    if err != nil {
        return nil, err
    }
    return doc.toDomain(), nil
    // No metrics!
}
```

✅ **Check metrics HTTP endpoint:**
```go
// ✅ Correct - exposing Prometheus metrics endpoint
// File: cmd/server/main.go
package main

import (
    "net/http"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

func main() {
    // ... setup ...

    // Metrics endpoint
    http.Handle("/metrics", promhttp.Handler())

    go func() {
        metricsAddr := ":9090"
        log.Printf("Metrics server listening on %s", metricsAddr)
        if err := http.ListenAndServe(metricsAddr, nil); err != nil {
            log.Fatalf("Failed to start metrics server: %v", err)
        }
    }()

    // ... start gRPC server ...
}

// ❌ Incorrect - no metrics endpoint
func main() {
    // No /metrics endpoint exposed
}
```

✅ **Check custom metrics for business logic:**
```go
// ✅ Correct - business-specific metrics
var (
    // Order value distribution
    OrderValue = promauto.NewHistogram(
        prometheus.HistogramOpts{
            Name:    "order_value_dollars",
            Help:    "Distribution of order values in dollars",
            Buckets: []float64{10, 25, 50, 100, 250, 500, 1000, 2500, 5000},
        },
    )

    // Orders by status
    OrdersByStatus = promauto.NewGaugeVec(
        prometheus.GaugeOpts{
            Name: "orders_by_status",
            Help: "Number of orders in each status",
        },
        []string{"status"},
    )

    // Inventory levels
    InventoryLevel = promauto.NewGaugeVec(
        prometheus.GaugeOpts{
            Name: "inventory_level",
            Help: "Current inventory level by product",
        },
        []string{"product_sku"},
    )
)

// Record business metrics
func (s *OrderService) CreateOrder(ctx context.Context, req CreateOrderRequest) (*order.Order, error) {
    o, err := order.NewOrder(req.UserID, req.Items)
    if err != nil {
        return nil, err
    }

    if err := s.repo.Save(ctx, o); err != nil {
        return nil, err
    }

    // Record business metrics
    metrics.OrderValue.Observe(float64(o.Total().Amount()) / 100)
    metrics.OrdersByStatus.WithLabelValues(string(o.Status())).Inc()

    return o, nil
}
```

**How to Verify:**
```bash
# Check for Prometheus imports
grep -r "github.com/prometheus/client_golang" internal/

# Verify metric definitions
grep -r "promauto.NewCounter\|promauto.NewHistogram\|promauto.NewGauge" internal/

# Check metric recording
grep -r "\\.Inc()\|\\.Observe(\|\\.Set(" internal/

# Verify metrics endpoint
curl http://localhost:9090/metrics
```

**Expected Result:**
- Prometheus metrics defined for key operations
- Metrics recorded in services and repositories
- /metrics endpoint exposed
- Business-specific metrics tracked
- Metrics include labels for dimensionality

---

### 4. Health Checks and Readiness Probes

**Requirement:** Service must expose health and readiness endpoints for Kubernetes liveness and readiness probes.

**Verification Steps:**

✅ **Check health check implementation:**
```go
// ✅ Correct - comprehensive health checks
// File: internal/interfaces/http/health.go
package http

import (
    "context"
    "encoding/json"
    "net/http"
    "time"
)

type HealthChecker struct {
    dbHealthCheck    func(context.Context) error
    cacheHealthCheck func(context.Context) error
}

type HealthResponse struct {
    Status      string            `json:"status"`
    Timestamp   time.Time         `json:"timestamp"`
    Checks      map[string]string `json:"checks"`
}

func (h *HealthChecker) HealthHandler(w http.ResponseWriter, r *http.Request) {
    ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
    defer cancel()

    response := HealthResponse{
        Status:    "healthy",
        Timestamp: time.Now(),
        Checks:    make(map[string]string),
    }

    // Check database
    if err := h.dbHealthCheck(ctx); err != nil {
        response.Status = "unhealthy"
        response.Checks["database"] = err.Error()
    } else {
        response.Checks["database"] = "ok"
    }

    // Check cache
    if err := h.cacheHealthCheck(ctx); err != nil {
        response.Status = "unhealthy"
        response.Checks["cache"] = err.Error()
    } else {
        response.Checks["cache"] = "ok"
    }

    statusCode := http.StatusOK
    if response.Status == "unhealthy" {
        statusCode = http.StatusServiceUnavailable
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(statusCode)
    json.NewEncoder(w).Encode(response)
}

func (h *HealthChecker) ReadinessHandler(w http.ResponseWriter, r *http.Request) {
    ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
    defer cancel()

    // Check all dependencies are ready
    if err := h.dbHealthCheck(ctx); err != nil {
        http.Error(w, "database not ready", http.StatusServiceUnavailable)
        return
    }

    if err := h.cacheHealthCheck(ctx); err != nil {
        http.Error(w, "cache not ready", http.StatusServiceUnavailable)
        return
    }

    w.WriteHeader(http.StatusOK)
    w.Write([]byte("ready"))
}

func (h *HealthChecker) LivenessHandler(w http.ResponseWriter, r *http.Request) {
    // Liveness just checks if the process is responsive
    w.WriteHeader(http.StatusOK)
    w.Write([]byte("alive"))
}

// ❌ Incorrect - minimal health check
func HealthHandler(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(http.StatusOK)
    w.Write([]byte("ok"))
    // No actual health checking!
}
```

✅ **Check database health check:**
```go
// ✅ Correct - database health check with timeout
func (r *OrderRepository) HealthCheck(ctx context.Context) error {
    ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
    defer cancel()

    // Ping database
    if err := r.client.Ping(ctx, nil); err != nil {
        return fmt.Errorf("database ping failed: %w", err)
    }

    return nil
}

// ❌ Incorrect - no timeout
func (r *OrderRepository) HealthCheck(ctx context.Context) error {
    return r.client.Ping(ctx, nil)
    // May hang indefinitely!
}
```

✅ **Check health endpoint registration:**
```go
// ✅ Correct - health endpoints exposed
func main() {
    // ... setup ...

    healthChecker := &HealthChecker{
        dbHealthCheck:    repo.HealthCheck,
        cacheHealthCheck: cache.HealthCheck,
    }

    http.HandleFunc("/health", healthChecker.HealthHandler)
    http.HandleFunc("/health/ready", healthChecker.ReadinessHandler)
    http.HandleFunc("/health/live", healthChecker.LivenessHandler)
    http.Handle("/metrics", promhttp.Handler())

    go func() {
        addr := ":8080"
        log.Printf("Health server listening on %s", addr)
        if err := http.ListenAndServe(addr, nil); err != nil {
            log.Fatalf("Failed to start health server: %v", err)
        }
    }()

    // ... start gRPC server ...
}

// ❌ Incorrect - no health endpoints
func main() {
    // No health checks exposed
}
```

**How to Verify:**
```bash
# Check for health check implementations
grep -r "HealthCheck\|health" internal/

# Test health endpoints
curl http://localhost:8080/health
curl http://localhost:8080/health/ready
curl http://localhost:8080/health/live

# Verify response format
curl -i http://localhost:8080/health | grep "Content-Type: application/json"
```

**Expected Result:**
- /health endpoint returns detailed health status
- /health/ready for readiness probe
- /health/live for liveness probe
- Health checks include database, cache, and other dependencies
- Timeouts prevent hanging health checks
- Unhealthy status returns 503 status code

---

## Testing Verification

### Logging Tests

```go
func TestOrderService_CreateOrder_Logging(t *testing.T) {
    ctrl := gomock.NewController(t)
    defer ctrl.Finish()

    mockRepo := mocks.NewMockOrderRepository(ctrl)
    mockRepo.EXPECT().Save(gomock.Any(), gomock.Any()).Return(nil)

    // Use test logger to capture logs
    core, recorded := observer.New(zapcore.InfoLevel)
    logger := zap.New(core)

    service := NewOrderService(mockRepo, logger)

    _, err := service.CreateOrder(context.Background(), CreateOrderRequest{
        UserID: uuid.New(),
        Items:  []order.Item{{ID: "item1"}},
    })

    require.NoError(t, err)

    // Verify logs were recorded
    logs := recorded.All()
    assert.Len(t, logs, 2) // "creating order" and "order created successfully"

    // Verify log structure
    assert.Equal(t, "creating order", logs[0].Message)
    assert.Equal(t, zapcore.InfoLevel, logs[0].Level)
    assert.Contains(t, logs[0].ContextMap(), "user_id")
}
```

### Tracing Tests

```go
func TestOrderService_CreateOrder_Tracing(t *testing.T) {
    // Setup in-memory span exporter
    exporter := tracetest.NewInMemoryExporter()
    tp := sdktrace.NewTracerProvider(
        sdktrace.WithSyncer(exporter),
    )
    otel.SetTracerProvider(tp)

    service := NewOrderService(mockRepo, logger)

    ctx := context.Background()
    _, err := service.CreateOrder(ctx, CreateOrderRequest{
        UserID: uuid.New(),
        Items:  []order.Item{{ID: "item1"}},
    })

    require.NoError(t, err)

    // Verify span was created
    spans := exporter.GetSpans()
    assert.Len(t, spans, 1)
    assert.Equal(t, "OrderService.CreateOrder", spans[0].Name())

    // Verify span attributes
    attrs := spans[0].Attributes()
    assert.Contains(t, attrs, attribute.String("user_id", "..."))
}
```

### Metrics Tests

```go
func TestOrderService_CreateOrder_Metrics(t *testing.T) {
    // Reset metrics
    metrics.OrdersCreated.Add(0)

    service := NewOrderService(mockRepo, logger)

    _, err := service.CreateOrder(context.Background(), CreateOrderRequest{
        UserID: uuid.New(),
        Items:  []order.Item{{ID: "item1"}},
    })

    require.NoError(t, err)

    // Verify metric was incremented
    metricValue := testutil.ToFloat64(metrics.OrdersCreated)
    assert.Equal(t, 1.0, metricValue)
}
```

---

## Common Issues and Fixes

### Issue 1: Unstructured Logging

**Problem:**
```go
log.Printf("Error creating order: %v", err)
```

**Fix:**
```go
logger.Error("failed to create order",
    zap.String("order_id", orderID.String()),
    zap.Error(err),
)
```

### Issue 2: No Trace Context

**Problem:**
```go
func (s *OrderService) CreateOrder(ctx context.Context, req CreateOrderRequest) (*order.Order, error) {
    // No span creation
    return order.NewOrder(req.UserID, req.Items)
}
```

**Fix:**
```go
func (s *OrderService) CreateOrder(ctx context.Context, req CreateOrderRequest) (*order.Order, error) {
    ctx, span := tracer.Start(ctx, "OrderService.CreateOrder")
    defer span.End()

    o, err := order.NewOrder(req.UserID, req.Items)
    if err != nil {
        span.RecordError(err)
        return nil, err
    }

    return o, nil
}
```

### Issue 3: No Metrics

**Problem:**
```go
func (s *OrderService) CreateOrder(ctx context.Context, req CreateOrderRequest) (*order.Order, error) {
    return s.repo.Save(ctx, order)
    // No metrics!
}
```

**Fix:**
```go
func (s *OrderService) CreateOrder(ctx context.Context, req CreateOrderRequest) (*order.Order, error) {
    startTime := time.Now()

    o, err := s.repo.Save(ctx, order)
    if err != nil {
        return nil, err
    }

    metrics.OrdersCreated.Inc()
    metrics.OrderProcessingDuration.Observe(time.Since(startTime).Seconds())

    return o, nil
}
```

### Issue 4: Logging Sensitive Data

**Problem:**
```go
logger.Info("user login",
    zap.String("password", password),  // SECURITY ISSUE!
)
```

**Fix:**
```go
logger.Info("user login",
    zap.String("user_id", userID.String()),
    // No password in logs!
)
```

---

## Verification Summary

**Before marking implementation as complete, verify:**

- [ ] All logging uses Zap structured logger
- [ ] No fmt.Printf or log.Printf in production code
- [ ] Logger includes trace ID and request context
- [ ] Sensitive data never logged
- [ ] OpenTelemetry tracer initialized
- [ ] All service methods create spans
- [ ] Spans include attributes and events
- [ ] Trace context propagated through gRPC
- [ ] Prometheus metrics defined
- [ ] Metrics recorded in services and repositories
- [ ] /metrics endpoint exposed
- [ ] Business metrics tracked
- [ ] /health endpoint with dependency checks
- [ ] /health/ready and /health/live endpoints
- [ ] Health checks include timeouts

**Related Verifiers:**
- **error-handling.md** - Error logging patterns
- **grpc-api.md** - gRPC interceptors for tracing
- **testing.md** - Testing observability
