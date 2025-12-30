---
domain: grpc-api
description: Verify gRPC service implementation with proper interceptors, error handling with status codes, request validation, and comprehensive gRPC testing
---

# gRPC API Verification

Verify that implementation follows gRPC best practices with proper service definitions, interceptors for cross-cutting concerns, error handling with gRPC status codes, and comprehensive testing.

## Verification Checklist

### 1. Proto Definitions and Code Generation

**Requirement:** All gRPC services must be defined in .proto files with proper message definitions, field numbering, and code generation.

**Verification Steps:**

✅ **Check proto file structure:**
```protobuf
// ✅ Correct - well-structured proto definition
// File: api/proto/order/v1/order.proto
syntax = "proto3";

package order.v1;

option go_package = "github.com/company/service/gen/order/v1;orderv1";

import "google/protobuf/timestamp.proto";
import "google/protobuf/empty.proto";
import "validate/validate.proto";

// OrderService handles order operations
service OrderService {
  // CreateOrder creates a new order
  rpc CreateOrder(CreateOrderRequest) returns (CreateOrderResponse);

  // GetOrder retrieves an order by ID
  rpc GetOrder(GetOrderRequest) returns (GetOrderResponse);

  // ListOrders lists orders with pagination
  rpc ListOrders(ListOrdersRequest) returns (ListOrdersResponse);

  // UpdateOrder updates an existing order
  rpc UpdateOrder(UpdateOrderRequest) returns (UpdateOrderResponse);

  // CancelOrder cancels an order
  rpc CancelOrder(CancelOrderRequest) returns (google.protobuf.Empty);
}

message CreateOrderRequest {
  // user_id is the ID of the user creating the order
  string user_id = 1 [(validate.rules).string = {
    min_len: 1
    max_len: 36
    pattern: "^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$"
  }];

  // items are the order items
  repeated OrderItem items = 2 [(validate.rules).repeated.min_items = 1];
}

message OrderItem {
  string product_id = 1 [(validate.rules).string.min_len = 1];
  int32 quantity = 2 [(validate.rules).int32.gt = 0];
  int64 price_cents = 3 [(validate.rules).int64.gte = 0];
}

message CreateOrderResponse {
  Order order = 1;
}

message GetOrderRequest {
  string order_id = 1 [(validate.rules).string.min_len = 1];
}

message GetOrderResponse {
  Order order = 1;
}

message ListOrdersRequest {
  string user_id = 1;
  int32 page_size = 2 [(validate.rules).int32 = {gte: 1, lte: 100}];
  string page_token = 3;
}

message ListOrdersResponse {
  repeated Order orders = 1;
  string next_page_token = 2;
}

message UpdateOrderRequest {
  string order_id = 1 [(validate.rules).string.min_len = 1];
  OrderStatus status = 2;
}

message UpdateOrderResponse {
  Order order = 1;
}

message CancelOrderRequest {
  string order_id = 1 [(validate.rules).string.min_len = 1];
}

message Order {
  string id = 1;
  string user_id = 2;
  repeated OrderItem items = 3;
  OrderStatus status = 4;
  int64 total_cents = 5;
  google.protobuf.Timestamp created_at = 6;
  google.protobuf.Timestamp updated_at = 7;
}

enum OrderStatus {
  ORDER_STATUS_UNSPECIFIED = 0;
  ORDER_STATUS_PENDING = 1;
  ORDER_STATUS_CONFIRMED = 2;
  ORDER_STATUS_SHIPPED = 3;
  ORDER_STATUS_DELIVERED = 4;
  ORDER_STATUS_CANCELLED = 5;
}

// ❌ Incorrect - poor proto definition
syntax = "proto3";

service OrderService {
  rpc CreateOrder(Order) returns (Order);  // Reusing messages
}

message Order {
  string id = 1;
  string status = 2;  // Should be enum
  // No validation, no comments
}
```

✅ **Check code generation:**
```bash
# ✅ Correct - code generation with validation
# File: Makefile or buf.gen.yaml
protoc \
  --go_out=. \
  --go_opt=paths=source_relative \
  --go-grpc_out=. \
  --go-grpc_opt=paths=source_relative \
  --validate_out="lang=go:." \
  api/proto/order/v1/*.proto

# ❌ Incorrect - no validation generation
protoc --go_out=. --go-grpc_out=. api/proto/order/v1/*.proto
```

✅ **Check generated code structure:**
```
gen/
├── order/
│   └── v1/
│       ├── order.pb.go           # Generated protobuf messages
│       ├── order_grpc.pb.go      # Generated gRPC service
│       └── order.pb.validate.go  # Generated validation
```

**How to Verify:**
```bash
# Find proto files
find api/proto -name "*.proto"

# Check proto syntax
grep "syntax = \"proto3\"" api/proto/**/*.proto

# Verify code generation
find gen -name "*.pb.go"

# Check for validation
find gen -name "*.pb.validate.go"
```

**Expected Result:**
- All services defined in .proto files
- Proto3 syntax used
- Messages have validation rules
- Code generated in gen/ directory
- Validation code generated

---

### 2. gRPC Service Implementation

**Requirement:** gRPC service implementations must properly convert between proto messages and domain entities, handle errors, and log operations.

**Verification Steps:**

✅ **Check handler implementation:**
```go
// ✅ Correct - proper gRPC handler implementation
// File: internal/interfaces/grpc/handlers/order_handler.go
package handlers

import (
    "context"
    "fmt"
    "github.com/google/uuid"
    "go.uber.org/zap"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"

    orderv1 "github.com/company/service/gen/order/v1"
    "github.com/company/service/internal/application"
    "github.com/company/service/internal/domain/order"
)

type OrderHandler struct {
    orderv1.UnimplementedOrderServiceServer
    service *application.OrderService
    logger  *zap.Logger
}

func NewOrderHandler(service *application.OrderService, logger *zap.Logger) *OrderHandler {
    return &OrderHandler{
        service: service,
        logger:  logger,
    }
}

func (h *OrderHandler) CreateOrder(ctx context.Context, req *orderv1.CreateOrderRequest) (*orderv1.CreateOrderResponse, error) {
    // Validate request
    if err := req.Validate(); err != nil {
        h.logger.Warn("invalid request",
            zap.Error(err),
        )
        return nil, status.Errorf(codes.InvalidArgument, "invalid request: %v", err)
    }

    // Log request
    h.logger.Info("creating order",
        zap.String("user_id", req.GetUserId()),
        zap.Int("items_count", len(req.GetItems())),
    )

    // Convert proto to domain request
    orderReq, err := toCreateOrderRequest(req)
    if err != nil {
        h.logger.Error("failed to convert request",
            zap.Error(err),
        )
        return nil, status.Errorf(codes.InvalidArgument, "invalid request: %v", err)
    }

    // Call service
    o, err := h.service.CreateOrder(ctx, orderReq)
    if err != nil {
        h.logger.Error("failed to create order",
            zap.String("user_id", req.GetUserId()),
            zap.Error(err),
        )
        return nil, mapErrorToStatus(err)
    }

    h.logger.Info("order created successfully",
        zap.String("order_id", o.ID().String()),
        zap.String("user_id", req.GetUserId()),
    )

    // Convert domain to proto
    return &orderv1.CreateOrderResponse{
        Order: toProtoOrder(o),
    }, nil
}

func (h *OrderHandler) GetOrder(ctx context.Context, req *orderv1.GetOrderRequest) (*orderv1.GetOrderResponse, error) {
    if err := req.Validate(); err != nil {
        return nil, status.Errorf(codes.InvalidArgument, "invalid request: %v", err)
    }

    orderID, err := uuid.Parse(req.GetOrderId())
    if err != nil {
        return nil, status.Errorf(codes.InvalidArgument, "invalid order ID format: %v", err)
    }

    h.logger.Info("getting order",
        zap.String("order_id", req.GetOrderId()),
    )

    o, err := h.service.GetOrder(ctx, orderID)
    if err != nil {
        h.logger.Error("failed to get order",
            zap.String("order_id", req.GetOrderId()),
            zap.Error(err),
        )
        return nil, mapErrorToStatus(err)
    }

    return &orderv1.GetOrderResponse{
        Order: toProtoOrder(o),
    }, nil
}

// ❌ Incorrect - minimal handler implementation
func (h *OrderHandler) CreateOrder(ctx context.Context, req *orderv1.CreateOrderRequest) (*orderv1.CreateOrderResponse, error) {
    // No validation
    // No logging
    // No error handling

    o, _ := h.service.CreateOrder(ctx, application.CreateOrderRequest{})
    return &orderv1.CreateOrderResponse{Order: &orderv1.Order{}}, nil
}
```

✅ **Check request/response conversion:**
```go
// ✅ Correct - conversion functions between proto and domain
// File: internal/interfaces/grpc/handlers/converters.go
package handlers

import (
    "fmt"
    "github.com/google/uuid"
    "google.golang.org/protobuf/types/known/timestamppb"

    orderv1 "github.com/company/service/gen/order/v1"
    "github.com/company/service/internal/application"
    "github.com/company/service/internal/domain"
    "github.com/company/service/internal/domain/order"
)

// toCreateOrderRequest converts proto request to application request
func toCreateOrderRequest(req *orderv1.CreateOrderRequest) (application.CreateOrderRequest, error) {
    userID, err := uuid.Parse(req.GetUserId())
    if err != nil {
        return application.CreateOrderRequest{}, fmt.Errorf("invalid user ID: %w", err)
    }

    items := make([]order.OrderItem, len(req.GetItems()))
    for i, protoItem := range req.GetItems() {
        item, err := toOrderItem(protoItem)
        if err != nil {
            return application.CreateOrderRequest{}, fmt.Errorf("invalid item %d: %w", i, err)
        }
        items[i] = item
    }

    return application.CreateOrderRequest{
        UserID: userID,
        Items:  items,
    }, nil
}

// toOrderItem converts proto item to domain item
func toOrderItem(protoItem *orderv1.OrderItem) (order.OrderItem, error) {
    productID, err := uuid.Parse(protoItem.GetProductId())
    if err != nil {
        return order.OrderItem{}, fmt.Errorf("invalid product ID: %w", err)
    }

    price := domain.NewMoney(protoItem.GetPriceCents(), "USD")

    return order.NewOrderItem(
        productID,
        int(protoItem.GetQuantity()),
        price,
    ), nil
}

// toProtoOrder converts domain order to proto order
func toProtoOrder(o *order.Order) *orderv1.Order {
    items := make([]*orderv1.OrderItem, len(o.Items()))
    for i, item := range o.Items() {
        items[i] = toProtoOrderItem(item)
    }

    return &orderv1.Order{
        Id:         o.ID().String(),
        UserId:     o.UserID().String(),
        Items:      items,
        Status:     toProtoStatus(o.Status()),
        TotalCents: o.Total().Amount(),
        CreatedAt:  timestamppb.New(o.CreatedAt()),
        UpdatedAt:  timestamppb.New(o.UpdatedAt()),
    }
}

func toProtoOrderItem(item order.OrderItem) *orderv1.OrderItem {
    return &orderv1.OrderItem{
        ProductId:  item.ProductID().String(),
        Quantity:   int32(item.Quantity()),
        PriceCents: item.Price().Amount(),
    }
}

func toProtoStatus(status order.OrderStatus) orderv1.OrderStatus {
    switch status {
    case order.StatusPending:
        return orderv1.OrderStatus_ORDER_STATUS_PENDING
    case order.StatusConfirmed:
        return orderv1.OrderStatus_ORDER_STATUS_CONFIRMED
    case order.StatusShipped:
        return orderv1.OrderStatus_ORDER_STATUS_SHIPPED
    case order.StatusDelivered:
        return orderv1.OrderStatus_ORDER_STATUS_DELIVERED
    case order.StatusCancelled:
        return orderv1.OrderStatus_ORDER_STATUS_CANCELLED
    default:
        return orderv1.OrderStatus_ORDER_STATUS_UNSPECIFIED
    }
}

// ❌ Incorrect - no conversion, direct mapping
func toProtoOrder(o *order.Order) *orderv1.Order {
    return &orderv1.Order{
        Id:     o.ID().String(),
        Status: string(o.Status()),  // Wrong type!
        // Missing fields
    }
}
```

✅ **Check error mapping:**
```go
// ✅ Correct - comprehensive error mapping
// File: internal/interfaces/grpc/handlers/errors.go
package handlers

import (
    "context"
    "errors"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"

    "github.com/company/service/internal/domain/order"
    "github.com/company/service/internal/domain/user"
)

func mapErrorToStatus(err error) error {
    if err == nil {
        return nil
    }

    // Context errors
    if errors.Is(err, context.Canceled) {
        return status.Error(codes.Canceled, "request canceled")
    }
    if errors.Is(err, context.DeadlineExceeded) {
        return status.Error(codes.DeadlineExceeded, "request timeout")
    }

    // Domain errors - Not Found
    if errors.Is(err, order.ErrNotFound) {
        return status.Error(codes.NotFound, "order not found")
    }
    if errors.Is(err, user.ErrNotFound) {
        return status.Error(codes.NotFound, "user not found")
    }

    // Domain errors - Validation
    if errors.Is(err, order.ErrInvalidInput) {
        return status.Errorf(codes.InvalidArgument, "invalid input: %v", err)
    }
    if errors.Is(err, user.ErrInvalidEmail) {
        return status.Errorf(codes.InvalidArgument, "invalid email: %v", err)
    }

    // Domain errors - Already Exists
    if errors.Is(err, order.ErrAlreadyExists) {
        return status.Error(codes.AlreadyExists, "order already exists")
    }
    if errors.Is(err, user.ErrAlreadyExists) {
        return status.Error(codes.AlreadyExists, "user already exists")
    }

    // Domain errors - Precondition Failed
    if errors.Is(err, order.ErrInvalidState) {
        return status.Errorf(codes.FailedPrecondition, "invalid order state: %v", err)
    }

    // Default to Internal error
    return status.Error(codes.Internal, "internal server error")
}

// ❌ Incorrect - all errors return Internal
func mapErrorToStatus(err error) error {
    if err != nil {
        return status.Error(codes.Internal, "error occurred")
    }
    return nil
}
```

**How to Verify:**
```bash
# Find handler implementations
find internal/interfaces/grpc/handlers -name "*.go"

# Check for validation calls
grep -r "req.Validate()" internal/interfaces/grpc/handlers/

# Verify error mapping usage
grep -r "mapErrorToStatus" internal/interfaces/grpc/handlers/

# Check conversion functions
grep -r "toProto\|toDomain\|toApplication" internal/interfaces/grpc/handlers/
```

**Expected Result:**
- Handlers implement UnimplementedXxxServer
- Request validation called
- Logging for all operations
- Conversion functions between proto and domain
- Error mapping to gRPC status codes

---

### 3. gRPC Interceptors

**Requirement:** gRPC server must use interceptors for cross-cutting concerns: logging, tracing, metrics, authentication, and validation.

**Verification Steps:**

✅ **Check logging interceptor:**
```go
// ✅ Correct - logging interceptor
// File: internal/interfaces/grpc/interceptors/logging.go
package interceptors

import (
    "context"
    "time"
    "go.uber.org/zap"
    "google.golang.org/grpc"
    "google.golang.org/grpc/status"
)

func LoggingUnaryInterceptor(logger *zap.Logger) grpc.UnaryServerInterceptor {
    return func(
        ctx context.Context,
        req interface{},
        info *grpc.UnaryServerInfo,
        handler grpc.UnaryHandler,
    ) (interface{}, error) {
        startTime := time.Now()

        logger := logger.With(
            zap.String("method", info.FullMethod),
            zap.String("trace_id", getTraceID(ctx)),
        )

        logger.Info("request started")

        // Call handler
        resp, err := handler(ctx, req)

        duration := time.Since(startTime)

        if err != nil {
            st, _ := status.FromError(err)
            logger.Error("request failed",
                zap.String("code", st.Code().String()),
                zap.String("message", st.Message()),
                zap.Duration("duration", duration),
                zap.Error(err),
            )
        } else {
            logger.Info("request completed",
                zap.Duration("duration", duration),
            )
        }

        return resp, err
    }
}

// ❌ Incorrect - minimal logging
func LoggingUnaryInterceptor(logger *zap.Logger) grpc.UnaryServerInterceptor {
    return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
        logger.Info("request")  // No context
        return handler(ctx, req)
    }
}
```

✅ **Check tracing interceptor:**
```go
// ✅ Correct - OpenTelemetry tracing interceptor
// File: internal/interfaces/grpc/interceptors/tracing.go
package interceptors

import (
    "context"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/codes"
    "go.opentelemetry.io/otel/trace"
    "google.golang.org/grpc"
    "google.golang.org/grpc/metadata"
    "google.golang.org/grpc/status"
)

func TracingUnaryInterceptor(tracer trace.Tracer) grpc.UnaryServerInterceptor {
    return func(
        ctx context.Context,
        req interface{},
        info *grpc.UnaryServerInfo,
        handler grpc.UnaryHandler,
    ) (interface{}, error) {
        // Extract trace context from metadata
        md, ok := metadata.FromIncomingContext(ctx)
        if ok {
            ctx = otel.GetTextMapPropagator().Extract(ctx, &metadataCarrier{md: md})
        }

        // Start span
        ctx, span := tracer.Start(ctx, info.FullMethod,
            trace.WithSpanKind(trace.SpanKindServer),
            trace.WithAttributes(
                attribute.String("rpc.system", "grpc"),
                attribute.String("rpc.service", info.FullMethod),
            ),
        )
        defer span.End()

        // Call handler
        resp, err := handler(ctx, req)

        if err != nil {
            st, _ := status.FromError(err)
            span.RecordError(err)
            span.SetStatus(codes.Error, st.Message())
            span.SetAttributes(
                attribute.String("rpc.grpc.status_code", st.Code().String()),
            )
        } else {
            span.SetStatus(codes.Ok, "success")
        }

        return resp, err
    }
}

type metadataCarrier struct {
    md metadata.MD
}

func (c *metadataCarrier) Get(key string) string {
    values := c.md.Get(key)
    if len(values) == 0 {
        return ""
    }
    return values[0]
}

func (c *metadataCarrier) Set(key, value string) {
    c.md.Set(key, value)
}

func (c *metadataCarrier) Keys() []string {
    keys := make([]string, 0, len(c.md))
    for k := range c.md {
        keys = append(keys, k)
    }
    return keys
}

// ❌ Incorrect - no trace context propagation
func TracingUnaryInterceptor(tracer trace.Tracer) grpc.UnaryServerInterceptor {
    return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
        ctx, span := tracer.Start(ctx, "handler")  // No context extraction
        defer span.End()
        return handler(ctx, req)
    }
}
```

✅ **Check metrics interceptor:**
```go
// ✅ Correct - Prometheus metrics interceptor
// File: internal/interfaces/grpc/interceptors/metrics.go
package interceptors

import (
    "context"
    "time"
    "github.com/prometheus/client_golang/prometheus"
    "google.golang.org/grpc"
    "google.golang.org/grpc/status"
)

var (
    grpcRequestsTotal = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "grpc_requests_total",
            Help: "Total number of gRPC requests",
        },
        []string{"method", "code"},
    )

    grpcRequestDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "grpc_request_duration_seconds",
            Help:    "gRPC request duration in seconds",
            Buckets: prometheus.DefBuckets,
        },
        []string{"method"},
    )
)

func init() {
    prometheus.MustRegister(grpcRequestsTotal)
    prometheus.MustRegister(grpcRequestDuration)
}

func MetricsUnaryInterceptor() grpc.UnaryServerInterceptor {
    return func(
        ctx context.Context,
        req interface{},
        info *grpc.UnaryServerInfo,
        handler grpc.UnaryHandler,
    ) (interface{}, error) {
        startTime := time.Now()

        // Call handler
        resp, err := handler(ctx, req)

        duration := time.Since(startTime)

        // Record metrics
        code := "OK"
        if err != nil {
            st, _ := status.FromError(err)
            code = st.Code().String()
        }

        grpcRequestsTotal.WithLabelValues(info.FullMethod, code).Inc()
        grpcRequestDuration.WithLabelValues(info.FullMethod).Observe(duration.Seconds())

        return resp, err
    }
}

// ❌ Incorrect - no metrics
func MetricsUnaryInterceptor() grpc.UnaryServerInterceptor {
    return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
        return handler(ctx, req)  // No metrics recorded
    }
}
```

✅ **Check validation interceptor:**
```go
// ✅ Correct - validation interceptor
// File: internal/interfaces/grpc/interceptors/validation.go
package interceptors

import (
    "context"
    "google.golang.org/grpc"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
)

type validator interface {
    Validate() error
}

func ValidationUnaryInterceptor() grpc.UnaryServerInterceptor {
    return func(
        ctx context.Context,
        req interface{},
        info *grpc.UnaryServerInfo,
        handler grpc.UnaryHandler,
    ) (interface{}, error) {
        // Check if request implements validator interface
        if v, ok := req.(validator); ok {
            if err := v.Validate(); err != nil {
                return nil, status.Errorf(codes.InvalidArgument, "validation failed: %v", err)
            }
        }

        return handler(ctx, req)
    }
}

// ❌ Incorrect - no validation
func ValidationUnaryInterceptor() grpc.UnaryServerInterceptor {
    return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
        return handler(ctx, req)  // No validation
    }
}
```

✅ **Check interceptor registration:**
```go
// ✅ Correct - registering all interceptors
// File: cmd/server/main.go
func main() {
    logger, _ := logging.NewLogger("production")
    tracer := otel.Tracer("order-service")

    grpcServer := grpc.NewServer(
        grpc.ChainUnaryInterceptor(
            interceptors.ValidationUnaryInterceptor(),
            interceptors.LoggingUnaryInterceptor(logger),
            interceptors.TracingUnaryInterceptor(tracer),
            interceptors.MetricsUnaryInterceptor(),
            interceptors.RecoveryUnaryInterceptor(logger),
        ),
    )

    orderHandler := handlers.NewOrderHandler(orderService, logger)
    orderv1.RegisterOrderServiceServer(grpcServer, orderHandler)

    lis, _ := net.Listen("tcp", ":50051")
    grpcServer.Serve(lis)
}

// ❌ Incorrect - no interceptors
func main() {
    grpcServer := grpc.NewServer()  // No interceptors!
    orderv1.RegisterOrderServiceServer(grpcServer, orderHandler)
    grpcServer.Serve(lis)
}
```

**How to Verify:**
```bash
# Find interceptor implementations
find internal/interfaces/grpc/interceptors -name "*.go"

# Check interceptor registration
grep -r "grpc.ChainUnaryInterceptor" cmd/

# Verify all interceptors used
grep -r "LoggingUnaryInterceptor\|TracingUnaryInterceptor\|MetricsUnaryInterceptor" cmd/
```

**Expected Result:**
- Logging interceptor logs all requests
- Tracing interceptor creates spans
- Metrics interceptor records metrics
- Validation interceptor validates requests
- All interceptors registered with server

---

### 4. gRPC Server Configuration

**Requirement:** gRPC server must be properly configured with timeouts, max message sizes, keepalive parameters, and graceful shutdown.

**Verification Steps:**

✅ **Check server configuration:**
```go
// ✅ Correct - comprehensive gRPC server configuration
// File: cmd/server/main.go
package main

import (
    "context"
    "net"
    "os"
    "os/signal"
    "syscall"
    "time"
    "google.golang.org/grpc"
    "google.golang.org/grpc/keepalive"
)

func main() {
    logger, _ := logging.NewLogger("production")

    // gRPC server options
    grpcServer := grpc.NewServer(
        // Interceptors
        grpc.ChainUnaryInterceptor(
            interceptors.ValidationUnaryInterceptor(),
            interceptors.LoggingUnaryInterceptor(logger),
            interceptors.TracingUnaryInterceptor(tracer),
            interceptors.MetricsUnaryInterceptor(),
            interceptors.RecoveryUnaryInterceptor(logger),
        ),

        // Max message sizes
        grpc.MaxRecvMsgSize(4 * 1024 * 1024),  // 4MB
        grpc.MaxSendMsgSize(4 * 1024 * 1024),  // 4MB

        // Connection timeout
        grpc.ConnectionTimeout(10 * time.Second),

        // Keepalive parameters
        grpc.KeepaliveParams(keepalive.ServerParameters{
            MaxConnectionIdle:     15 * time.Minute,
            MaxConnectionAge:      30 * time.Minute,
            MaxConnectionAgeGrace: 5 * time.Minute,
            Time:                  5 * time.Minute,
            Timeout:               1 * time.Minute,
        }),

        // Keepalive enforcement policy
        grpc.KeepaliveEnforcementPolicy(keepalive.EnforcementPolicy{
            MinTime:             1 * time.Minute,
            PermitWithoutStream: true,
        }),
    )

    // Register services
    orderHandler := handlers.NewOrderHandler(orderService, logger)
    orderv1.RegisterOrderServiceServer(grpcServer, orderHandler)

    // Start server
    lis, err := net.Listen("tcp", ":50051")
    if err != nil {
        logger.Fatal("failed to listen", zap.Error(err))
    }

    // Graceful shutdown
    go func() {
        logger.Info("gRPC server starting", zap.String("address", ":50051"))
        if err := grpcServer.Serve(lis); err != nil {
            logger.Fatal("failed to serve", zap.Error(err))
        }
    }()

    // Wait for interrupt signal
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit

    logger.Info("shutting down gRPC server")

    // Graceful shutdown with timeout
    done := make(chan struct{})
    go func() {
        grpcServer.GracefulStop()
        close(done)
    }()

    select {
    case <-done:
        logger.Info("gRPC server stopped gracefully")
    case <-time.After(30 * time.Second):
        logger.Warn("gRPC server shutdown timed out, forcing stop")
        grpcServer.Stop()
    }
}

// ❌ Incorrect - minimal configuration
func main() {
    grpcServer := grpc.NewServer()  // No configuration!

    orderv1.RegisterOrderServiceServer(grpcServer, orderHandler)

    lis, _ := net.Listen("tcp", ":50051")
    grpcServer.Serve(lis)  // No graceful shutdown!
}
```

✅ **Check TLS configuration:**
```go
// ✅ Correct - TLS for production
// File: internal/infrastructure/grpc/tls.go
package grpc

import (
    "crypto/tls"
    "crypto/x509"
    "fmt"
    "os"
    "google.golang.org/grpc/credentials"
)

func LoadTLSCredentials(certFile, keyFile, caFile string) (credentials.TransportCredentials, error) {
    // Load server certificate and key
    serverCert, err := tls.LoadX509KeyPair(certFile, keyFile)
    if err != nil {
        return nil, fmt.Errorf("failed to load key pair: %w", err)
    }

    // Load CA certificate
    caCert, err := os.ReadFile(caFile)
    if err != nil {
        return nil, fmt.Errorf("failed to read ca cert: %w", err)
    }

    certPool := x509.NewCertPool()
    if !certPool.AppendCertsFromPEM(caCert) {
        return nil, fmt.Errorf("failed to append ca cert")
    }

    // Configure TLS
    config := &tls.Config{
        Certificates: []tls.Certificate{serverCert},
        ClientAuth:   tls.RequireAndVerifyClientCert,
        ClientCAs:    certPool,
        MinVersion:   tls.VersionTLS13,
    }

    return credentials.NewTLS(config), nil
}

// Usage in main
func main() {
    tlsCreds, err := LoadTLSCredentials("server.crt", "server.key", "ca.crt")
    if err != nil {
        log.Fatal(err)
    }

    grpcServer := grpc.NewServer(
        grpc.Creds(tlsCreds),
        // ... other options
    )
}

// ❌ Incorrect - no TLS (insecure)
func main() {
    grpcServer := grpc.NewServer()  // No TLS!
}
```

**How to Verify:**
```bash
# Check server configuration
grep -r "grpc.NewServer" cmd/

# Verify TLS configuration
grep -r "credentials.NewTLS\|LoadTLSCredentials" internal/

# Check graceful shutdown
grep -r "GracefulStop\|signal.Notify" cmd/

# Verify keepalive parameters
grep -r "keepalive.ServerParameters" cmd/
```

**Expected Result:**
- Server configured with max message sizes
- Keepalive parameters configured
- Graceful shutdown implemented
- TLS configured for production
- Connection timeout set

---

## Testing Verification

### Unit Tests for Handlers

```go
func TestOrderHandler_CreateOrder(t *testing.T) {
    ctrl := gomock.NewController(t)
    defer ctrl.Finish()

    mockService := mocks.NewMockOrderService(ctrl)
    logger := zaptest.NewLogger(t)
    handler := handlers.NewOrderHandler(mockService, logger)

    tests := map[string]struct {
        givenRequest  *orderv1.CreateOrderRequest
        givenService  func(*mocks.MockOrderService)
        thenErrorCode codes.Code
    }{
        "GIVEN valid request THEN creates order successfully": {
            givenRequest: &orderv1.CreateOrderRequest{
                UserId: "550e8400-e29b-41d4-a716-446655440000",
                Items: []*orderv1.OrderItem{
                    {ProductId: "product-1", Quantity: 2, PriceCents: 1000},
                },
            },
            givenService: func(m *mocks.MockOrderService) {
                m.EXPECT().
                    CreateOrder(gomock.Any(), gomock.Any()).
                    Return(&order.Order{}, nil)
            },
            thenErrorCode: codes.OK,
        },
        "GIVEN invalid user ID THEN returns invalid argument": {
            givenRequest: &orderv1.CreateOrderRequest{
                UserId: "invalid",
                Items:  []*orderv1.OrderItem{{ProductId: "p1", Quantity: 1, PriceCents: 100}},
            },
            givenService: func(m *mocks.MockOrderService) {},
            thenErrorCode: codes.InvalidArgument,
        },
        "GIVEN service error THEN returns internal error": {
            givenRequest: &orderv1.CreateOrderRequest{
                UserId: "550e8400-e29b-41d4-a716-446655440000",
                Items:  []*orderv1.OrderItem{{ProductId: "p1", Quantity: 1, PriceCents: 100}},
            },
            givenService: func(m *mocks.MockOrderService) {
                m.EXPECT().
                    CreateOrder(gomock.Any(), gomock.Any()).
                    Return(nil, errors.New("database error"))
            },
            thenErrorCode: codes.Internal,
        },
    }

    for name, tc := range tests {
        t.Run(name, func(t *testing.T) {
            tc.givenService(mockService)

            resp, err := handler.CreateOrder(context.Background(), tc.givenRequest)

            if tc.thenErrorCode == codes.OK {
                assert.NoError(t, err)
                assert.NotNil(t, resp)
            } else {
                assert.Error(t, err)
                st, ok := status.FromError(err)
                require.True(t, ok)
                assert.Equal(t, tc.thenErrorCode, st.Code())
            }
        })
    }
}
```

### Integration Tests with gRPC Client

```go
func TestOrderService_Integration(t *testing.T) {
    // Start test server
    lis := bufconn.Listen(1024 * 1024)
    server := grpc.NewServer()

    handler := handlers.NewOrderHandler(orderService, logger)
    orderv1.RegisterOrderServiceServer(server, handler)

    go func() {
        server.Serve(lis)
    }()
    defer server.Stop()

    // Create client
    conn, err := grpc.DialContext(
        context.Background(),
        "bufnet",
        grpc.WithContextDialer(func(context.Context, string) (net.Conn, error) {
            return lis.Dial()
        }),
        grpc.WithInsecure(),
    )
    require.NoError(t, err)
    defer conn.Close()

    client := orderv1.NewOrderServiceClient(conn)

    // Test CreateOrder
    t.Run("CreateOrder", func(t *testing.T) {
        resp, err := client.CreateOrder(context.Background(), &orderv1.CreateOrderRequest{
            UserId: "550e8400-e29b-41d4-a716-446655440000",
            Items: []*orderv1.OrderItem{
                {ProductId: "product-1", Quantity: 2, PriceCents: 1000},
            },
        })

        require.NoError(t, err)
        assert.NotNil(t, resp.GetOrder())
        assert.NotEmpty(t, resp.GetOrder().GetId())
    })

    // Test GetOrder
    t.Run("GetOrder", func(t *testing.T) {
        resp, err := client.GetOrder(context.Background(), &orderv1.GetOrderRequest{
            OrderId: "550e8400-e29b-41d4-a716-446655440000",
        })

        require.NoError(t, err)
        assert.NotNil(t, resp.GetOrder())
    })
}
```

### Interceptor Tests

```go
func TestLoggingInterceptor(t *testing.T) {
    core, recorded := observer.New(zapcore.InfoLevel)
    logger := zap.New(core)

    interceptor := interceptors.LoggingUnaryInterceptor(logger)

    handler := func(ctx context.Context, req interface{}) (interface{}, error) {
        return "response", nil
    }

    info := &grpc.UnaryServerInfo{
        FullMethod: "/order.v1.OrderService/CreateOrder",
    }

    resp, err := interceptor(context.Background(), "request", info, handler)

    require.NoError(t, err)
    assert.Equal(t, "response", resp)

    logs := recorded.All()
    assert.Len(t, logs, 2)  // Started and completed
    assert.Equal(t, "request started", logs[0].Message)
    assert.Equal(t, "request completed", logs[1].Message)
}

func TestValidationInterceptor(t *testing.T) {
    interceptor := interceptors.ValidationUnaryInterceptor()

    tests := map[string]struct {
        givenRequest interface{}
        thenError    bool
    }{
        "GIVEN valid request THEN succeeds": {
            givenRequest: &orderv1.CreateOrderRequest{
                UserId: "550e8400-e29b-41d4-a716-446655440000",
                Items:  []*orderv1.OrderItem{{ProductId: "p1", Quantity: 1, PriceCents: 100}},
            },
            thenError: false,
        },
        "GIVEN invalid request THEN returns error": {
            givenRequest: &orderv1.CreateOrderRequest{
                UserId: "invalid",
                Items:  []*orderv1.OrderItem{},
            },
            thenError: true,
        },
    }

    for name, tc := range tests {
        t.Run(name, func(t *testing.T) {
            handler := func(ctx context.Context, req interface{}) (interface{}, error) {
                return "response", nil
            }

            _, err := interceptor(context.Background(), tc.givenRequest, nil, handler)

            if tc.thenError {
                assert.Error(t, err)
            } else {
                assert.NoError(t, err)
            }
        })
    }
}
```

---

## Common Issues and Fixes

### Issue 1: No Request Validation

**Problem:**
```go
func (h *OrderHandler) CreateOrder(ctx context.Context, req *orderv1.CreateOrderRequest) (*orderv1.CreateOrderResponse, error) {
    // No validation!
    return h.service.CreateOrder(ctx, req)
}
```

**Fix:**
```go
func (h *OrderHandler) CreateOrder(ctx context.Context, req *orderv1.CreateOrderRequest) (*orderv1.CreateOrderResponse, error) {
    if err := req.Validate(); err != nil {
        return nil, status.Errorf(codes.InvalidArgument, "invalid request: %v", err)
    }
    // ... rest of handler
}
```

### Issue 2: All Errors Return Internal

**Problem:**
```go
if err != nil {
    return nil, status.Error(codes.Internal, "error occurred")
}
```

**Fix:**
```go
if err != nil {
    return nil, mapErrorToStatus(err)  // Maps to appropriate code
}
```

### Issue 3: No Interceptors

**Problem:**
```go
grpcServer := grpc.NewServer()
```

**Fix:**
```go
grpcServer := grpc.NewServer(
    grpc.ChainUnaryInterceptor(
        interceptors.ValidationUnaryInterceptor(),
        interceptors.LoggingUnaryInterceptor(logger),
        interceptors.TracingUnaryInterceptor(tracer),
        interceptors.MetricsUnaryInterceptor(),
    ),
)
```

### Issue 4: No Graceful Shutdown

**Problem:**
```go
grpcServer.Serve(lis)  // Blocks until error
```

**Fix:**
```go
go grpcServer.Serve(lis)

quit := make(chan os.Signal, 1)
signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
<-quit

grpcServer.GracefulStop()
```

---

## Verification Summary

**Before marking implementation as complete, verify:**

- [ ] All services defined in .proto files
- [ ] Proto3 syntax with validation rules
- [ ] Code generation includes validation
- [ ] Handlers implement UnimplementedXxxServer
- [ ] Request validation in all handlers
- [ ] Conversion functions between proto and domain
- [ ] Error mapping to gRPC status codes
- [ ] Logging interceptor logs all requests
- [ ] Tracing interceptor creates spans
- [ ] Metrics interceptor records metrics
- [ ] Validation interceptor validates requests
- [ ] All interceptors registered
- [ ] Server configured with max message sizes
- [ ] Keepalive parameters configured
- [ ] Graceful shutdown implemented
- [ ] TLS configured for production
- [ ] Handler tests cover success and error cases
- [ ] Integration tests with gRPC client
- [ ] Interceptor tests verify behavior

**Related Verifiers:**
- **error-handling.md** - Error mapping to gRPC codes
- **logging-observability.md** - Logging and tracing interceptors
- **testing.md** - gRPC handler test coverage
- **domain-modeling.md** - Proto to domain conversion
