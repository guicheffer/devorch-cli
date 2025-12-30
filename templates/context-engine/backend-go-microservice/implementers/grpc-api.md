---
domain: grpc-api
description: gRPC API patterns using Protocol Buffers, interceptors, streaming, and error handling
---

# gRPC API Implementer

This implementer defines patterns for building gRPC services with Protocol Buffers, interceptors for cross-cutting concerns, streaming, and proper error handling.

## Core Patterns

### Protocol Buffer Definitions

Define service contracts using Protocol Buffers:

```protobuf
// api/user/v1/user.proto
syntax = "proto3";

package api.user.v1;

option go_package = "github.com/example/service/gen/api/user/v1;userv1";

import "google/protobuf/timestamp.proto";
import "google/protobuf/empty.proto";

service UserService {
  rpc CreateUser(CreateUserRequest) returns (CreateUserResponse);
  rpc GetUser(GetUserRequest) returns (GetUserResponse);
  rpc UpdateUser(UpdateUserRequest) returns (UpdateUserResponse);
  rpc DeleteUser(DeleteUserRequest) returns (google.protobuf.Empty);
  rpc ListUsers(ListUsersRequest) returns (ListUsersResponse);
  rpc StreamUsers(StreamUsersRequest) returns (stream UserEvent);
}

message User {
  string id = 1;
  string email = 2;
  string username = 3;
  UserStatus status = 4;
  google.protobuf.Timestamp created_at = 5;
  google.protobuf.Timestamp updated_at = 6;
}

enum UserStatus {
  USER_STATUS_UNSPECIFIED = 0;
  USER_STATUS_ACTIVE = 1;
  USER_STATUS_INACTIVE = 2;
  USER_STATUS_SUSPENDED = 3;
}

message CreateUserRequest {
  string email = 1;
  string username = 2;
  string password = 3;
}

message CreateUserResponse {
  User user = 1;
}

message GetUserRequest {
  string id = 1;
}

message GetUserResponse {
  User user = 1;
}

message UpdateUserRequest {
  string id = 1;
  optional string email = 2;
  optional string username = 3;
  optional UserStatus status = 4;
}

message UpdateUserResponse {
  User user = 1;
}

message DeleteUserRequest {
  string id = 1;
}

message ListUsersRequest {
  int32 page_size = 1;
  string page_token = 2;
  string filter = 3;
}

message ListUsersResponse {
  repeated User users = 1;
  string next_page_token = 2;
  int32 total_count = 3;
}

message StreamUsersRequest {
  string filter = 1;
}

message UserEvent {
  enum EventType {
    EVENT_TYPE_UNSPECIFIED = 0;
    EVENT_TYPE_CREATED = 1;
    EVENT_TYPE_UPDATED = 2;
    EVENT_TYPE_DELETED = 3;
  }
  EventType type = 1;
  User user = 2;
  google.protobuf.Timestamp timestamp = 3;
}
```

### gRPC Server Implementation

Implement gRPC service with proper error handling:

```go
import (
    "google.golang.org/grpc"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
    "google.golang.org/protobuf/types/known/emptypb"
    "google.golang.org/protobuf/types/known/timestamppb"
)

type UserServiceServer struct {
    userv1.UnimplementedUserServiceServer
    service *UserService
    logger  *zap.Logger
}

func NewUserServiceServer(service *UserService, logger *zap.Logger) *UserServiceServer {
    return &UserServiceServer{
        service: service,
        logger:  logger,
    }
}

func (s *UserServiceServer) CreateUser(ctx context.Context, req *userv1.CreateUserRequest) (*userv1.CreateUserResponse, error) {
    // Validate request
    if req.Email == "" {
        return nil, status.Error(codes.InvalidArgument, "email is required")
    }
    if req.Username == "" {
        return nil, status.Error(codes.InvalidArgument, "username is required")
    }

    // Call domain service
    user, err := s.service.CreateUser(ctx, CreateUserInput{
        Email:    req.Email,
        Username: req.Username,
        Password: req.Password,
    })
    if err != nil {
        return nil, s.toGRPCError(err)
    }

    // Convert to proto
    return &userv1.CreateUserResponse{
        User: s.toProtoUser(user),
    }, nil
}

func (s *UserServiceServer) GetUser(ctx context.Context, req *userv1.GetUserRequest) (*userv1.GetUserResponse, error) {
    if req.Id == "" {
        return nil, status.Error(codes.InvalidArgument, "id is required")
    }

    user, err := s.service.GetUser(ctx, req.Id)
    if err != nil {
        return nil, s.toGRPCError(err)
    }

    return &userv1.GetUserResponse{
        User: s.toProtoUser(user),
    }, nil
}

func (s *UserServiceServer) UpdateUser(ctx context.Context, req *userv1.UpdateUserRequest) (*userv1.UpdateUserResponse, error) {
    if req.Id == "" {
        return nil, status.Error(codes.InvalidArgument, "id is required")
    }

    input := UpdateUserInput{ID: req.Id}
    if req.Email != nil {
        input.Email = req.GetEmail()
    }
    if req.Username != nil {
        input.Username = req.GetUsername()
    }
    if req.Status != nil {
        input.Status = s.fromProtoStatus(req.GetStatus())
    }

    user, err := s.service.UpdateUser(ctx, input)
    if err != nil {
        return nil, s.toGRPCError(err)
    }

    return &userv1.UpdateUserResponse{
        User: s.toProtoUser(user),
    }, nil
}

func (s *UserServiceServer) DeleteUser(ctx context.Context, req *userv1.DeleteUserRequest) (*emptypb.Empty, error) {
    if req.Id == "" {
        return nil, status.Error(codes.InvalidArgument, "id is required")
    }

    if err := s.service.DeleteUser(ctx, req.Id); err != nil {
        return nil, s.toGRPCError(err)
    }

    return &emptypb.Empty{}, nil
}

func (s *UserServiceServer) ListUsers(ctx context.Context, req *userv1.ListUsersRequest) (*userv1.ListUsersResponse, error) {
    users, nextToken, total, err := s.service.ListUsers(ctx, ListUsersInput{
        PageSize:  int(req.PageSize),
        PageToken: req.PageToken,
        Filter:    req.Filter,
    })
    if err != nil {
        return nil, s.toGRPCError(err)
    }

    protoUsers := make([]*userv1.User, len(users))
    for i, user := range users {
        protoUsers[i] = s.toProtoUser(user)
    }

    return &userv1.ListUsersResponse{
        Users:         protoUsers,
        NextPageToken: nextToken,
        TotalCount:    int32(total),
    }, nil
}

// Server-side streaming
func (s *UserServiceServer) StreamUsers(req *userv1.StreamUsersRequest, stream userv1.UserService_StreamUsersServer) error {
    ctx := stream.Context()

    eventChan := make(chan *UserEvent, 100)
    errChan := make(chan error, 1)

    // Start streaming from service
    go func() {
        errChan <- s.service.StreamUsers(ctx, req.Filter, eventChan)
    }()

    for {
        select {
        case <-ctx.Done():
            return status.Error(codes.Canceled, "stream cancelled")
        case err := <-errChan:
            if err != nil {
                return s.toGRPCError(err)
            }
            return nil
        case event := <-eventChan:
            protoEvent := &userv1.UserEvent{
                Type:      s.toProtoEventType(event.Type),
                User:      s.toProtoUser(event.User),
                Timestamp: timestamppb.New(event.Timestamp),
            }
            if err := stream.Send(protoEvent); err != nil {
                return status.Errorf(codes.Internal, "send event: %v", err)
            }
        }
    }
}

// Error mapping
func (s *UserServiceServer) toGRPCError(err error) error {
    switch {
    case errors.Is(err, ErrUserNotFound):
        return status.Error(codes.NotFound, err.Error())
    case errors.Is(err, ErrDuplicateUser):
        return status.Error(codes.AlreadyExists, err.Error())
    case errors.Is(err, ErrInvalidInput):
        return status.Error(codes.InvalidArgument, err.Error())
    case errors.Is(err, ErrUnauthorized):
        return status.Error(codes.Unauthenticated, err.Error())
    case errors.Is(err, ErrPermissionDenied):
        return status.Error(codes.PermissionDenied, err.Error())
    default:
        s.logger.Error("internal error", zap.Error(err))
        return status.Error(codes.Internal, "internal error")
    }
}

// Proto conversions
func (s *UserServiceServer) toProtoUser(user *User) *userv1.User {
    return &userv1.User{
        Id:        user.ID,
        Email:     user.Email,
        Username:  user.Username,
        Status:    s.toProtoStatus(user.Status),
        CreatedAt: timestamppb.New(user.CreatedAt),
        UpdatedAt: timestamppb.New(user.UpdatedAt),
    }
}

func (s *UserServiceServer) toProtoStatus(status UserStatus) userv1.UserStatus {
    switch status {
    case UserStatusActive:
        return userv1.UserStatus_USER_STATUS_ACTIVE
    case UserStatusInactive:
        return userv1.UserStatus_USER_STATUS_INACTIVE
    case UserStatusSuspended:
        return userv1.UserStatus_USER_STATUS_SUSPENDED
    default:
        return userv1.UserStatus_USER_STATUS_UNSPECIFIED
    }
}

func (s *UserServiceServer) fromProtoStatus(status userv1.UserStatus) UserStatus {
    switch status {
    case userv1.UserStatus_USER_STATUS_ACTIVE:
        return UserStatusActive
    case userv1.UserStatus_USER_STATUS_INACTIVE:
        return UserStatusInactive
    case userv1.UserStatus_USER_STATUS_SUSPENDED:
        return UserStatusSuspended
    default:
        return ""
    }
}
```

### Interceptors for Cross-Cutting Concerns

Implement interceptors for logging, auth, metrics:

```go
// Logging interceptor
func LoggingInterceptor(logger *zap.Logger) grpc.UnaryServerInterceptor {
    return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
        start := time.Now()

        // Extract metadata
        md, _ := metadata.FromIncomingContext(ctx)

        logger.Info("grpc request started",
            zap.String("method", info.FullMethod),
            zap.Any("metadata", md),
        )

        resp, err := handler(ctx, req)

        duration := time.Since(start)
        code := status.Code(err)

        logger.Info("grpc request completed",
            zap.String("method", info.FullMethod),
            zap.Duration("duration", duration),
            zap.String("code", code.String()),
            zap.Error(err),
        )

        return resp, err
    }
}

// Metrics interceptor
func MetricsInterceptor(metrics *Metrics) grpc.UnaryServerInterceptor {
    return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
        start := time.Now()

        resp, err := handler(ctx, req)

        duration := time.Since(start).Seconds()
        code := status.Code(err)

        metrics.grpcRequestDuration.WithLabelValues(
            info.FullMethod,
            code.String(),
        ).Observe(duration)

        metrics.grpcRequestsTotal.WithLabelValues(
            info.FullMethod,
            code.String(),
        ).Inc()

        return resp, err
    }
}

// Tracing interceptor
func TracingInterceptor(tracer trace.Tracer) grpc.UnaryServerInterceptor {
    return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
        // Extract trace context from metadata
        md, _ := metadata.FromIncomingContext(ctx)
        ctx = otel.GetTextMapPropagator().Extract(ctx, &metadataCarrier{md: md})

        ctx, span := tracer.Start(ctx, info.FullMethod,
            trace.WithSpanKind(trace.SpanKindServer),
            trace.WithAttributes(
                semconv.RPCSystemKey.String("grpc"),
                semconv.RPCServiceKey.String(path.Dir(info.FullMethod)[1:]),
                semconv.RPCMethodKey.String(path.Base(info.FullMethod)),
            ),
        )
        defer span.End()

        resp, err := handler(ctx, req)

        if err != nil {
            span.RecordError(err)
            span.SetStatus(codes.Error, err.Error())
        }

        code := status.Code(err)
        span.SetAttributes(semconv.RPCGRPCStatusCodeKey.Int64(int64(code)))

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

func (c *metadataCarrier) Set(key string, value string) {
    c.md.Set(key, value)
}

func (c *metadataCarrier) Keys() []string {
    keys := make([]string, 0, len(c.md))
    for k := range c.md {
        keys = append(keys, k)
    }
    return keys
}

// Authentication interceptor
func AuthInterceptor(authService *AuthService) grpc.UnaryServerInterceptor {
    return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
        // Skip auth for public methods
        if isPublicMethod(info.FullMethod) {
            return handler(ctx, req)
        }

        md, ok := metadata.FromIncomingContext(ctx)
        if !ok {
            return nil, status.Error(codes.Unauthenticated, "missing metadata")
        }

        tokens := md.Get("authorization")
        if len(tokens) == 0 {
            return nil, status.Error(codes.Unauthenticated, "missing authorization token")
        }

        token := strings.TrimPrefix(tokens[0], "Bearer ")
        claims, err := authService.ValidateToken(ctx, token)
        if err != nil {
            return nil, status.Error(codes.Unauthenticated, "invalid token")
        }

        // Add claims to context
        ctx = context.WithValue(ctx, "claims", claims)

        return handler(ctx, req)
    }
}

// Recovery interceptor
func RecoveryInterceptor(logger *zap.Logger) grpc.UnaryServerInterceptor {
    return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (resp interface{}, err error) {
        defer func() {
            if r := recover(); r != nil {
                logger.Error("panic recovered",
                    zap.String("method", info.FullMethod),
                    zap.Any("panic", r),
                    zap.Stack("stack"),
                )
                err = status.Error(codes.Internal, "internal error")
            }
        }()

        return handler(ctx, req)
    }
}

// Stream interceptors
func StreamLoggingInterceptor(logger *zap.Logger) grpc.StreamServerInterceptor {
    return func(srv interface{}, ss grpc.ServerStream, info *grpc.StreamServerInfo, handler grpc.StreamHandler) error {
        start := time.Now()

        logger.Info("stream started",
            zap.String("method", info.FullMethod),
            zap.Bool("is_client_stream", info.IsClientStream),
            zap.Bool("is_server_stream", info.IsServerStream),
        )

        err := handler(srv, ss)

        duration := time.Since(start)
        code := status.Code(err)

        logger.Info("stream completed",
            zap.String("method", info.FullMethod),
            zap.Duration("duration", duration),
            zap.String("code", code.String()),
            zap.Error(err),
        )

        return err
    }
}
```

### gRPC Server Setup

Configure and start gRPC server:

```go
func NewGRPCServer(
    userService *UserService,
    authService *AuthService,
    logger *zap.Logger,
    metrics *Metrics,
) *grpc.Server {
    // Create server with interceptors
    server := grpc.NewServer(
        grpc.ChainUnaryInterceptor(
            RecoveryInterceptor(logger),
            LoggingInterceptor(logger),
            TracingInterceptor(otel.Tracer("grpc-server")),
            MetricsInterceptor(metrics),
            AuthInterceptor(authService),
        ),
        grpc.ChainStreamInterceptor(
            StreamLoggingInterceptor(logger),
        ),
        grpc.MaxRecvMsgSize(10*1024*1024), // 10MB
        grpc.MaxSendMsgSize(10*1024*1024), // 10MB
        grpc.KeepaliveParams(keepalive.ServerParameters{
            MaxConnectionIdle:     15 * time.Minute,
            MaxConnectionAge:      30 * time.Minute,
            MaxConnectionAgeGrace: 5 * time.Second,
            Time:                  5 * time.Minute,
            Timeout:               1 * time.Second,
        }),
    )

    // Register services
    userv1.RegisterUserServiceServer(server, NewUserServiceServer(userService, logger))

    // Register reflection for development
    if os.Getenv("ENV") != "production" {
        reflection.Register(server)
    }

    return server
}

func StartGRPCServer(server *grpc.Server, port int, logger *zap.Logger) error {
    listener, err := net.Listen("tcp", fmt.Sprintf(":%d", port))
    if err != nil {
        return fmt.Errorf("listen: %w", err)
    }

    logger.Info("starting grpc server", zap.Int("port", port))

    if err := server.Serve(listener); err != nil {
        return fmt.Errorf("serve: %w", err)
    }

    return nil
}

// Graceful shutdown
func GracefulShutdown(server *grpc.Server, logger *zap.Logger) {
    sigChan := make(chan os.Signal, 1)
    signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

    <-sigChan
    logger.Info("shutting down grpc server")

    // Graceful stop with timeout
    stopped := make(chan struct{})
    go func() {
        server.GracefulStop()
        close(stopped)
    }()

    select {
    case <-stopped:
        logger.Info("grpc server stopped gracefully")
    case <-time.After(30 * time.Second):
        logger.Warn("forcing grpc server shutdown")
        server.Stop()
    }
}
```

### gRPC Client

Implement gRPC client with interceptors:

```go
type UserServiceClient struct {
    client userv1.UserServiceClient
    conn   *grpc.ClientConn
}

func NewUserServiceClient(target string, logger *zap.Logger) (*UserServiceClient, error) {
    conn, err := grpc.Dial(target,
        grpc.WithTransportCredentials(insecure.NewCredentials()),
        grpc.WithChainUnaryInterceptor(
            ClientLoggingInterceptor(logger),
            ClientTracingInterceptor(otel.Tracer("grpc-client")),
        ),
        grpc.WithKeepaliveParams(keepalive.ClientParameters{
            Time:                10 * time.Second,
            Timeout:             time.Second,
            PermitWithoutStream: true,
        }),
    )
    if err != nil {
        return nil, fmt.Errorf("dial: %w", err)
    }

    return &UserServiceClient{
        client: userv1.NewUserServiceClient(conn),
        conn:   conn,
    }, nil
}

func (c *UserServiceClient) CreateUser(ctx context.Context, email, username, password string) (*User, error) {
    req := &userv1.CreateUserRequest{
        Email:    email,
        Username: username,
        Password: password,
    }

    resp, err := c.client.CreateUser(ctx, req)
    if err != nil {
        return nil, err
    }

    return fromProtoUser(resp.User), nil
}

func (c *UserServiceClient) Close() error {
    return c.conn.Close()
}

// Client interceptors
func ClientLoggingInterceptor(logger *zap.Logger) grpc.UnaryClientInterceptor {
    return func(ctx context.Context, method string, req, reply interface{}, cc *grpc.ClientConn, invoker grpc.UnaryInvoker, opts ...grpc.CallOption) error {
        start := time.Now()

        err := invoker(ctx, method, req, reply, cc, opts...)

        duration := time.Since(start)
        code := status.Code(err)

        logger.Debug("grpc client call",
            zap.String("method", method),
            zap.Duration("duration", duration),
            zap.String("code", code.String()),
            zap.Error(err),
        )

        return err
    }
}

func ClientTracingInterceptor(tracer trace.Tracer) grpc.UnaryClientInterceptor {
    return func(ctx context.Context, method string, req, reply interface{}, cc *grpc.ClientConn, invoker grpc.UnaryInvoker, opts ...grpc.CallOption) error {
        ctx, span := tracer.Start(ctx, method,
            trace.WithSpanKind(trace.SpanKindClient),
            trace.WithAttributes(
                semconv.RPCSystemKey.String("grpc"),
                semconv.RPCServiceKey.String(path.Dir(method)[1:]),
                semconv.RPCMethodKey.String(path.Base(method)),
            ),
        )
        defer span.End()

        // Inject trace context
        md, _ := metadata.FromOutgoingContext(ctx)
        carrier := &metadataCarrier{md: md}
        otel.GetTextMapPropagator().Inject(ctx, carrier)
        ctx = metadata.NewOutgoingContext(ctx, carrier.md)

        err := invoker(ctx, method, req, reply, cc, opts...)

        if err != nil {
            span.RecordError(err)
            span.SetStatus(codes.Error, err.Error())
        }

        return err
    }
}
```

## Implementation Guidelines

### Service Design

1. **Proto-first**: Design APIs in Protocol Buffers before implementation
2. **Versioning**: Use package versioning (v1, v2) for API evolution
3. **Backwards compatibility**: Maintain backwards compatibility when evolving APIs
4. **Streaming**: Use streaming for large datasets or real-time updates
5. **Error codes**: Use appropriate gRPC status codes

### Interceptor Chain

1. **Order matters**: Place recovery first, auth last
2. **Context propagation**: Pass context through interceptor chain
3. **Performance**: Keep interceptors lightweight
4. **Reusability**: Make interceptors reusable across services
5. **Testing**: Test interceptors independently

### Performance

1. **Connection pooling**: Reuse gRPC connections
2. **Message size**: Configure appropriate message size limits
3. **Keepalive**: Configure keepalive for long-lived connections
4. **Compression**: Enable compression for large messages
5. **Load balancing**: Use client-side or proxy load balancing

## Anti-Patterns to Avoid

### Don't Ignore Context

```go
// Bad
func (s *Server) GetUser(ctx context.Context, req *pb.GetUserRequest) (*pb.GetUserResponse, error) {
    user := s.repo.Find(req.Id) // Missing context
    return &pb.GetUserResponse{User: user}, nil
}

// Good
func (s *Server) GetUser(ctx context.Context, req *pb.GetUserRequest) (*pb.GetUserResponse, error) {
    user, err := s.repo.Find(ctx, req.Id)
    if err != nil {
        return nil, status.Error(codes.NotFound, "user not found")
    }
    return &pb.GetUserResponse{User: user}, nil
}
```

### Don't Return Generic Errors

```go
// Bad
return nil, fmt.Errorf("error: %v", err)

// Good
return nil, status.Error(codes.NotFound, "user not found")
```

### Don't Skip Validation

```go
// Bad
func (s *Server) CreateUser(ctx context.Context, req *pb.CreateUserRequest) (*pb.CreateUserResponse, error) {
    user := s.service.Create(req.Email, req.Username)
    return &pb.CreateUserResponse{User: user}, nil
}

// Good
func (s *Server) CreateUser(ctx context.Context, req *pb.CreateUserRequest) (*pb.CreateUserResponse, error) {
    if req.Email == "" {
        return nil, status.Error(codes.InvalidArgument, "email is required")
    }
    // ... more validation
}
```

## Related Implementers

- **error-handling.md**: Error mapping to gRPC status codes
- **logging-observability.md**: gRPC observability patterns
- **http-clients.md**: Alternative HTTP communication
- **testing.md**: Testing gRPC services
