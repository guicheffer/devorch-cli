---
domain: logging-observability
description: Logging and observability patterns using Zap, Prometheus, OpenTelemetry, and distributed tracing
---

# Logging & Observability Implementer

This implementer defines patterns for structured logging, metrics collection, distributed tracing, and observability in Go microservices.

## Core Patterns

### Structured Logging with Zap

Use Zap for high-performance structured logging:

```go
import (
    "go.uber.org/zap"
    "go.uber.org/zap/zapcore"
)

// Initialize logger
func NewLogger(env string) (*zap.Logger, error) {
    var config zap.Config

    if env == "production" {
        config = zap.NewProductionConfig()
        config.EncoderConfig.TimeKey = "timestamp"
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

// Contextual logging
type contextKey string

const loggerKey contextKey = "logger"

func WithLogger(ctx context.Context, logger *zap.Logger) context.Context {
    return context.WithValue(ctx, loggerKey, logger)
}

func LoggerFromContext(ctx context.Context) *zap.Logger {
    if logger, ok := ctx.Value(loggerKey).(*zap.Logger); ok {
        return logger
    }
    return zap.L() // fallback to global logger
}

// Usage in service methods
func (s *UserService) CreateUser(ctx context.Context, input CreateUserInput) (*User, error) {
    logger := LoggerFromContext(ctx).With(
        zap.String("operation", "CreateUser"),
        zap.String("email", input.Email),
    )

    logger.Info("creating user")

    user, err := s.repo.Create(ctx, input)
    if err != nil {
        logger.Error("failed to create user",
            zap.Error(err),
            zap.String("email", input.Email),
        )
        return nil, err
    }

    logger.Info("user created successfully",
        zap.String("user_id", user.ID),
        zap.Duration("elapsed", time.Since(start)),
    )

    return user, nil
}

// Middleware for request logging
func LoggingMiddleware(logger *zap.Logger) gin.HandlerFunc {
    return func(c *gin.Context) {
        start := time.Now()
        path := c.Request.URL.Path
        query := c.Request.URL.RawQuery

        requestID := uuid.New().String()
        c.Set("request_id", requestID)

        requestLogger := logger.With(
            zap.String("request_id", requestID),
            zap.String("method", c.Request.Method),
            zap.String("path", path),
            zap.String("ip", c.ClientIP()),
        )

        // Add logger to context
        ctx := WithLogger(c.Request.Context(), requestLogger)
        c.Request = c.Request.WithContext(ctx)

        requestLogger.Info("incoming request",
            zap.String("query", query),
            zap.String("user_agent", c.Request.UserAgent()),
        )

        c.Next()

        latency := time.Since(start)
        statusCode := c.Writer.Status()

        logLevel := zapcore.InfoLevel
        if statusCode >= 500 {
            logLevel = zapcore.ErrorLevel
        } else if statusCode >= 400 {
            logLevel = zapcore.WarnLevel
        }

        requestLogger.Log(logLevel, "request completed",
            zap.Int("status", statusCode),
            zap.Duration("latency", latency),
            zap.Int("response_size", c.Writer.Size()),
        )
    }
}
```

### Prometheus Metrics

Implement comprehensive metrics collection:

```go
import (
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promauto"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

type Metrics struct {
    // Counter metrics
    requestsTotal *prometheus.CounterVec
    errorsTotal   *prometheus.CounterVec

    // Histogram metrics
    requestDuration *prometheus.HistogramVec
    responseSizes   *prometheus.HistogramVec

    // Gauge metrics
    activeConnections prometheus.Gauge
    queueSize         prometheus.Gauge

    // Summary metrics
    processingTime *prometheus.SummaryVec
}

func NewMetrics(namespace string) *Metrics {
    return &Metrics{
        requestsTotal: promauto.NewCounterVec(
            prometheus.CounterOpts{
                Namespace: namespace,
                Name:      "requests_total",
                Help:      "Total number of requests processed",
            },
            []string{"method", "endpoint", "status"},
        ),

        errorsTotal: promauto.NewCounterVec(
            prometheus.CounterOpts{
                Namespace: namespace,
                Name:      "errors_total",
                Help:      "Total number of errors encountered",
            },
            []string{"type", "operation"},
        ),

        requestDuration: promauto.NewHistogramVec(
            prometheus.HistogramOpts{
                Namespace: namespace,
                Name:      "request_duration_seconds",
                Help:      "Request duration in seconds",
                Buckets:   []float64{0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5},
            },
            []string{"method", "endpoint"},
        ),

        responseSizes: promauto.NewHistogramVec(
            prometheus.HistogramOpts{
                Namespace: namespace,
                Name:      "response_size_bytes",
                Help:      "Response size in bytes",
                Buckets:   prometheus.ExponentialBuckets(100, 10, 8),
            },
            []string{"method", "endpoint"},
        ),

        activeConnections: promauto.NewGauge(
            prometheus.GaugeOpts{
                Namespace: namespace,
                Name:      "active_connections",
                Help:      "Number of active connections",
            },
        ),

        queueSize: promauto.NewGauge(
            prometheus.GaugeOpts{
                Namespace: namespace,
                Name:      "queue_size",
                Help:      "Current size of processing queue",
            },
        ),

        processingTime: promauto.NewSummaryVec(
            prometheus.SummaryOpts{
                Namespace:  namespace,
                Name:       "processing_time_seconds",
                Help:       "Time spent processing requests",
                Objectives: map[float64]float64{0.5: 0.05, 0.9: 0.01, 0.99: 0.001},
            },
            []string{"operation"},
        ),
    }
}

// Metrics middleware
func (m *Metrics) HTTPMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        start := time.Now()

        m.activeConnections.Inc()
        defer m.activeConnections.Dec()

        c.Next()

        duration := time.Since(start).Seconds()
        status := strconv.Itoa(c.Writer.Status())
        endpoint := c.FullPath()
        method := c.Request.Method

        m.requestsTotal.WithLabelValues(method, endpoint, status).Inc()
        m.requestDuration.WithLabelValues(method, endpoint).Observe(duration)
        m.responseSizes.WithLabelValues(method, endpoint).Observe(float64(c.Writer.Size()))
    }
}

// Service-level metrics
func (s *OrderService) PlaceOrder(ctx context.Context, input PlaceOrderInput) (*Order, error) {
    timer := prometheus.NewTimer(s.metrics.processingTime.WithLabelValues("place_order"))
    defer timer.ObserveDuration()

    order, err := s.processOrder(ctx, input)
    if err != nil {
        s.metrics.errorsTotal.WithLabelValues("business_logic", "place_order").Inc()
        return nil, err
    }

    return order, nil
}

// Custom collectors for business metrics
type OrderMetricsCollector struct {
    orderService *OrderService

    totalOrders   *prometheus.Desc
    revenue       *prometheus.Desc
    averageValue  *prometheus.Desc
}

func NewOrderMetricsCollector(svc *OrderService) *OrderMetricsCollector {
    return &OrderMetricsCollector{
        orderService: svc,
        totalOrders: prometheus.NewDesc(
            "orders_total",
            "Total number of orders",
            []string{"status"},
            nil,
        ),
        revenue: prometheus.NewDesc(
            "revenue_total",
            "Total revenue in cents",
            []string{"currency"},
            nil,
        ),
        averageValue: prometheus.NewDesc(
            "order_average_value",
            "Average order value",
            []string{"currency"},
            nil,
        ),
    }
}

func (c *OrderMetricsCollector) Describe(ch chan<- *prometheus.Desc) {
    ch <- c.totalOrders
    ch <- c.revenue
    ch <- c.averageValue
}

func (c *OrderMetricsCollector) Collect(ch chan<- prometheus.Metric) {
    stats, err := c.orderService.GetStatistics(context.Background())
    if err != nil {
        return
    }

    for status, count := range stats.OrdersByStatus {
        ch <- prometheus.MustNewConstMetric(
            c.totalOrders,
            prometheus.CounterValue,
            float64(count),
            string(status),
        )
    }

    ch <- prometheus.MustNewConstMetric(
        c.revenue,
        prometheus.CounterValue,
        float64(stats.TotalRevenue),
        "USD",
    )

    ch <- prometheus.MustNewConstMetric(
        c.averageValue,
        prometheus.GaugeValue,
        float64(stats.AverageOrderValue),
        "USD",
    )
}
```

### OpenTelemetry Integration

Implement distributed tracing with OpenTelemetry:

```go
import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/exporters/jaeger"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.4.0"
    "go.opentelemetry.io/otel/trace"
)

// Initialize tracer
func InitTracer(serviceName, jaegerEndpoint string) (*sdktrace.TracerProvider, error) {
    exporter, err := jaeger.New(jaeger.WithCollectorEndpoint(
        jaeger.WithEndpoint(jaegerEndpoint),
    ))
    if err != nil {
        return nil, err
    }

    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),
        sdktrace.WithResource(resource.NewWithAttributes(
            semconv.SchemaURL,
            semconv.ServiceNameKey.String(serviceName),
            attribute.String("environment", os.Getenv("ENV")),
        )),
        sdktrace.WithSampler(sdktrace.AlwaysSample()),
    )

    otel.SetTracerProvider(tp)
    return tp, nil
}

// Tracing middleware
func TracingMiddleware(serviceName string) gin.HandlerFunc {
    tracer := otel.Tracer(serviceName)

    return func(c *gin.Context) {
        ctx := c.Request.Context()

        spanName := fmt.Sprintf("%s %s", c.Request.Method, c.FullPath())
        ctx, span := tracer.Start(ctx, spanName,
            trace.WithSpanKind(trace.SpanKindServer),
            trace.WithAttributes(
                semconv.HTTPMethodKey.String(c.Request.Method),
                semconv.HTTPTargetKey.String(c.Request.URL.Path),
                semconv.HTTPURLKey.String(c.Request.URL.String()),
                semconv.HTTPUserAgentKey.String(c.Request.UserAgent()),
                semconv.NetHostIPKey.String(c.ClientIP()),
            ),
        )
        defer span.End()

        c.Request = c.Request.WithContext(ctx)
        c.Next()

        status := c.Writer.Status()
        span.SetAttributes(
            semconv.HTTPStatusCodeKey.Int(status),
            semconv.HTTPResponseContentLengthKey.Int(c.Writer.Size()),
        )

        if status >= 400 {
            span.RecordError(fmt.Errorf("HTTP %d", status))
        }
    }
}

// Service method tracing
func (s *UserService) CreateUser(ctx context.Context, input CreateUserInput) (*User, error) {
    tracer := otel.Tracer("user-service")
    ctx, span := tracer.Start(ctx, "UserService.CreateUser",
        trace.WithAttributes(
            attribute.String("user.email", input.Email),
            attribute.String("user.username", input.Username),
        ),
    )
    defer span.End()

    // Validate input
    ctx, validateSpan := tracer.Start(ctx, "validate_input")
    if err := s.validator.Validate(input); err != nil {
        validateSpan.RecordError(err)
        validateSpan.End()
        return nil, err
    }
    validateSpan.End()

    // Check for duplicates
    ctx, checkSpan := tracer.Start(ctx, "check_duplicates")
    exists, err := s.repo.ExistsByEmail(ctx, input.Email)
    if err != nil {
        checkSpan.RecordError(err)
        checkSpan.End()
        return nil, err
    }
    checkSpan.End()

    if exists {
        span.RecordError(ErrDuplicateEmail)
        return nil, ErrDuplicateEmail
    }

    // Create user
    ctx, createSpan := tracer.Start(ctx, "repository.create")
    user, err := s.repo.Create(ctx, input)
    if err != nil {
        createSpan.RecordError(err)
        createSpan.End()
        return nil, err
    }
    createSpan.SetAttributes(attribute.String("user.id", user.ID))
    createSpan.End()

    span.SetAttributes(attribute.String("user.id", user.ID))
    return user, nil
}

// MongoDB tracing wrapper
type TracedCollection struct {
    collection *mongo.Collection
    tracer     trace.Tracer
}

func NewTracedCollection(collection *mongo.Collection) *TracedCollection {
    return &TracedCollection{
        collection: collection,
        tracer:     otel.Tracer("mongodb"),
    }
}

func (c *TracedCollection) FindOne(ctx context.Context, filter interface{}) *mongo.SingleResult {
    ctx, span := c.tracer.Start(ctx, "mongodb.findOne",
        trace.WithAttributes(
            attribute.String("db.system", "mongodb"),
            attribute.String("db.operation", "findOne"),
            attribute.String("db.collection", c.collection.Name()),
        ),
    )
    defer span.End()

    return c.collection.FindOne(ctx, filter)
}

func (c *TracedCollection) InsertOne(ctx context.Context, document interface{}) (*mongo.InsertOneResult, error) {
    ctx, span := c.tracer.Start(ctx, "mongodb.insertOne",
        trace.WithAttributes(
            attribute.String("db.system", "mongodb"),
            attribute.String("db.operation", "insertOne"),
            attribute.String("db.collection", c.collection.Name()),
        ),
    )
    defer span.End()

    result, err := c.collection.InsertOne(ctx, document)
    if err != nil {
        span.RecordError(err)
    }
    return result, err
}
```

### Health Checks

Implement comprehensive health checks:

```go
type HealthChecker struct {
    checks map[string]HealthCheck
}

type HealthCheck func(context.Context) error

type HealthStatus struct {
    Status    string                 `json:"status"`
    Timestamp time.Time              `json:"timestamp"`
    Checks    map[string]CheckResult `json:"checks"`
}

type CheckResult struct {
    Status  string `json:"status"`
    Message string `json:"message,omitempty"`
}

func NewHealthChecker() *HealthChecker {
    return &HealthChecker{
        checks: make(map[string]HealthCheck),
    }
}

func (h *HealthChecker) Register(name string, check HealthCheck) {
    h.checks[name] = check
}

func (h *HealthChecker) Check(ctx context.Context) HealthStatus {
    status := HealthStatus{
        Status:    "healthy",
        Timestamp: time.Now(),
        Checks:    make(map[string]CheckResult),
    }

    for name, check := range h.checks {
        err := check(ctx)
        if err != nil {
            status.Status = "unhealthy"
            status.Checks[name] = CheckResult{
                Status:  "unhealthy",
                Message: err.Error(),
            }
        } else {
            status.Checks[name] = CheckResult{
                Status: "healthy",
            }
        }
    }

    return status
}

// Register health checks
func setupHealthChecks(checker *HealthChecker, deps *Dependencies) {
    // Database health check
    checker.Register("database", func(ctx context.Context) error {
        ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
        defer cancel()

        return deps.DB.Ping(ctx, nil)
    })

    // Redis health check
    checker.Register("cache", func(ctx context.Context) error {
        ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
        defer cancel()

        return deps.Cache.Ping(ctx).Err()
    })

    // Kafka health check
    checker.Register("messaging", func(ctx context.Context) error {
        return deps.KafkaProducer.Ping(ctx)
    })

    // External service health check
    checker.Register("payment_service", func(ctx context.Context) error {
        ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
        defer cancel()

        return deps.PaymentClient.HealthCheck(ctx)
    })
}

// Health check endpoints
func (h *Handler) HealthHandler(c *gin.Context) {
    ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
    defer cancel()

    status := h.healthChecker.Check(ctx)

    if status.Status == "unhealthy" {
        c.JSON(http.StatusServiceUnavailable, status)
    } else {
        c.JSON(http.StatusOK, status)
    }
}

func (h *Handler) ReadinessHandler(c *gin.Context) {
    // Quick check for readiness
    ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
    defer cancel()

    if err := h.db.Ping(ctx, nil); err != nil {
        c.JSON(http.StatusServiceUnavailable, gin.H{
            "status": "not ready",
            "error":  err.Error(),
        })
        return
    }

    c.JSON(http.StatusOK, gin.H{"status": "ready"})
}

func (h *Handler) LivenessHandler(c *gin.Context) {
    // Simple liveness check
    c.JSON(http.StatusOK, gin.H{"status": "alive"})
}
```

## Implementation Guidelines

### Logging Best Practices

1. **Use structured logging**: Always use key-value pairs, never string concatenation
2. **Include context**: Add request ID, user ID, and correlation IDs to all logs
3. **Appropriate levels**: DEBUG for detailed info, INFO for normal operations, WARN for recoverable issues, ERROR for failures
4. **Performance**: Use lazy evaluation for expensive log operations
5. **Sensitive data**: Never log passwords, tokens, or PII

### Metrics Best Practices

1. **Cardinality**: Avoid high-cardinality labels (user IDs, timestamps)
2. **Naming convention**: Use `namespace_subsystem_name_unit` pattern
3. **Metric types**: Counters for totals, Gauges for current values, Histograms for distributions
4. **Business metrics**: Track business KPIs, not just technical metrics
5. **SLIs/SLOs**: Define and track Service Level Indicators

### Tracing Best Practices

1. **Span naming**: Use descriptive names following `Component.Method` pattern
2. **Attributes**: Add relevant context as span attributes
3. **Error recording**: Always record errors on spans
4. **Sampling**: Use appropriate sampling strategies for production
5. **Propagation**: Ensure trace context propagates across service boundaries

## Anti-Patterns to Avoid

### Don't Use Unstructured Logging

```go
// Bad
log.Printf("User %s created with email %s", userID, email)

// Good
logger.Info("user created",
    zap.String("user_id", userID),
    zap.String("email", email),
)
```

### Don't Ignore Metric Cardinality

```go
// Bad: High cardinality label
metrics.requestsTotal.WithLabelValues(
    c.Request.Method,
    c.Request.URL.Path, // Too many unique values!
    userID,             // Extremely high cardinality!
).Inc()

// Good: Low cardinality labels
metrics.requestsTotal.WithLabelValues(
    c.Request.Method,
    c.FullPath(),      // Route pattern, not actual path
    statusCode,
).Inc()
```

### Don't Create Too Many Spans

```go
// Bad: Span for every tiny operation
_, span := tracer.Start(ctx, "add_two_numbers")
result := a + b
span.End()

// Good: Span for meaningful operations
_, span := tracer.Start(ctx, "calculate_order_total")
total := calculateOrderTotal(items)
span.End()
```

### Don't Block on Logging

```go
// Bad: Synchronous logging in critical path
logger.Sync() // Blocks until flush completes

// Good: Async logging with deferred sync
defer logger.Sync() // Only at shutdown
```

## Related Implementers

- **error-handling.md**: Error logging and tracking
- **http-clients.md**: Client-side observability
- **grpc-api.md**: gRPC interceptors for observability
- **testing.md**: Testing observability components
