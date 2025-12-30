---
domain: code-organization
description: Go project structure conventions including package layout, naming conventions, and architectural patterns
---

# Code Organization Implementer

This implementer defines patterns for organizing Go microservice code, including project structure, package layout, naming conventions, and architectural boundaries.

## Core Patterns

### Project Structure

Standard Go microservice layout:

```
myservice/
├── cmd/
│   ├── api/                    # HTTP/gRPC server
│   │   └── main.go
│   ├── worker/                 # Background worker
│   │   └── main.go
│   └── migrate/                # Database migrations
│       └── main.go
├── internal/
│   ├── config/                 # Configuration
│   │   ├── config.go
│   │   └── config_test.go
│   ├── domain/                 # Domain models and interfaces
│   │   ├── user.go
│   │   ├── order.go
│   │   └── repository.go
│   ├── service/                # Business logic
│   │   ├── user_service.go
│   │   ├── user_service_test.go
│   │   ├── order_service.go
│   │   └── order_service_test.go
│   ├── repository/             # Data access
│   │   ├── user_repository.go
│   │   ├── user_repository_test.go
│   │   ├── order_repository.go
│   │   └── mocks/
│   │       └── repository.go
│   ├── handler/                # HTTP/gRPC handlers
│   │   ├── http/
│   │   │   ├── user_handler.go
│   │   │   ├── order_handler.go
│   │   │   └── middleware.go
│   │   └── grpc/
│   │       ├── user_server.go
│   │       └── order_server.go
│   ├── client/                 # External service clients
│   │   ├── payment_client.go
│   │   └── notification_client.go
│   └── server/                 # Server setup
│       ├── http.go
│       └── grpc.go
├── pkg/                        # Public libraries
│   ├── logger/
│   │   └── logger.go
│   ├── errors/
│   │   └── errors.go
│   └── middleware/
│       └── auth.go
├── api/
│   └── proto/                  # Protobuf definitions
│       ├── user/
│       │   └── v1/
│       │       └── user.proto
│       └── order/
│           └── v1/
│               └── order.proto
├── test/
│   ├── integration/            # Integration tests
│   │   └── user_test.go
│   └── fixtures/               # Test fixtures
│       └── users.json
├── deployments/                # Deployment configs
│   ├── docker/
│   │   └── Dockerfile
│   └── k8s/
│       ├── deployment.yaml
│       └── service.yaml
├── scripts/                    # Build and utility scripts
│   ├── build.sh
│   └── test.sh
├── docs/                       # Documentation
│   ├── architecture.md
│   └── api.md
├── go.mod
├── go.sum
├── BUILD.bazel                 # Bazel build file
├── WORKSPACE                   # Bazel workspace
├── Makefile
└── README.md
```

### Package Organization

Organize code by layer and responsibility:

```go
// internal/domain/user.go
package domain

import "time"

// User represents a user entity
type User struct {
    ID        string
    Email     string
    Username  string
    Status    UserStatus
    CreatedAt time.Time
    UpdatedAt time.Time
}

type UserStatus string

const (
    UserStatusActive   UserStatus = "active"
    UserStatusInactive UserStatus = "inactive"
)

// UserRepository defines data access interface
type UserRepository interface {
    Create(ctx context.Context, user *User) error
    FindByID(ctx context.Context, id string) (*User, error)
    FindByEmail(ctx context.Context, email string) (*User, error)
    Update(ctx context.Context, user *User) error
    Delete(ctx context.Context, id string) error
}

// UserService defines business logic interface
type UserService interface {
    CreateUser(ctx context.Context, input CreateUserInput) (*User, error)
    GetUser(ctx context.Context, id string) (*User, error)
    UpdateUser(ctx context.Context, id string, input UpdateUserInput) (*User, error)
    DeleteUser(ctx context.Context, id string) error
}
```

```go
// internal/service/user_service.go
package service

import (
    "github.com/example/myservice/internal/domain"
    "go.uber.org/zap"
)

type userService struct {
    repo    domain.UserRepository
    logger  *zap.Logger
    metrics *Metrics
}

func NewUserService(repo domain.UserRepository, logger *zap.Logger, metrics *Metrics) domain.UserService {
    return &userService{
        repo:    repo,
        logger:  logger,
        metrics: metrics,
    }
}

func (s *userService) CreateUser(ctx context.Context, input CreateUserInput) (*domain.User, error) {
    // Validate input
    if err := input.Validate(); err != nil {
        return nil, err
    }

    // Check for duplicates
    existing, err := s.repo.FindByEmail(ctx, input.Email)
    if err != nil && !errors.Is(err, domain.ErrUserNotFound) {
        return nil, err
    }
    if existing != nil {
        return nil, domain.ErrDuplicateEmail
    }

    // Create user
    user := &domain.User{
        Email:     input.Email,
        Username:  input.Username,
        Status:    domain.UserStatusActive,
        CreatedAt: time.Now(),
        UpdatedAt: time.Now(),
    }

    if err := s.repo.Create(ctx, user); err != nil {
        return nil, err
    }

    s.logger.Info("user created",
        zap.String("user_id", user.ID),
        zap.String("email", user.Email),
    )

    return user, nil
}
```

```go
// internal/repository/user_repository.go
package repository

import (
    "github.com/example/myservice/internal/domain"
    "go.mongodb.org/mongo-driver/mongo"
    "go.uber.org/zap"
)

type userRepository struct {
    collection *mongo.Collection
    logger     *zap.Logger
}

func NewUserRepository(db *mongo.Database, logger *zap.Logger) domain.UserRepository {
    return &userRepository{
        collection: db.Collection("users"),
        logger:     logger,
    }
}

func (r *userRepository) Create(ctx context.Context, user *domain.User) error {
    user.CreatedAt = time.Now()
    user.UpdatedAt = time.Now()

    result, err := r.collection.InsertOne(ctx, user)
    if err != nil {
        if mongo.IsDuplicateKeyError(err) {
            return domain.ErrDuplicateUser
        }
        return err
    }

    user.ID = result.InsertedID.(primitive.ObjectID).Hex()
    return nil
}
```

### Main Package Structure

Organize main.go for clean initialization:

```go
// cmd/api/main.go
package main

import (
    "context"
    "fmt"
    "os"
    "os/signal"
    "syscall"
    "time"

    "github.com/example/myservice/internal/config"
    "github.com/example/myservice/internal/repository"
    "github.com/example/myservice/internal/server"
    "github.com/example/myservice/internal/service"
    "github.com/example/myservice/pkg/logger"
    "go.mongodb.org/mongo-driver/mongo"
    "go.mongodb.org/mongo-driver/mongo/options"
    "go.uber.org/zap"
)

var (
    version = "dev"
    commit  = "unknown"
)

func main() {
    if err := run(); err != nil {
        fmt.Fprintf(os.Stderr, "error: %v\n", err)
        os.Exit(1)
    }
}

func run() error {
    // Load configuration
    cfg, err := config.Load()
    if err != nil {
        return fmt.Errorf("load config: %w", err)
    }

    // Initialize logger
    log, err := logger.New(cfg.LogLevel, cfg.Env)
    if err != nil {
        return fmt.Errorf("create logger: %w", err)
    }
    defer log.Sync()

    log.Info("starting service",
        zap.String("version", version),
        zap.String("commit", commit),
        zap.String("env", cfg.Env),
    )

    // Initialize dependencies
    deps, err := initDependencies(cfg, log)
    if err != nil {
        return fmt.Errorf("init dependencies: %w", err)
    }
    defer deps.Close()

    // Initialize services
    services := initServices(deps, log)

    // Start server
    srv := server.New(cfg, services, log)

    // Graceful shutdown
    return gracefulShutdown(srv, log)
}

type Dependencies struct {
    DB     *mongo.Database
    Cache  *redis.Client
    closer []func() error
}

func (d *Dependencies) Close() error {
    for _, close := range d.closer {
        if err := close(); err != nil {
            return err
        }
    }
    return nil
}

func initDependencies(cfg *config.Config, log *zap.Logger) (*Dependencies, error) {
    deps := &Dependencies{}

    // Connect to MongoDB
    mongoClient, err := mongo.Connect(
        context.Background(),
        options.Client().ApplyURI(cfg.MongoDB.URI),
    )
    if err != nil {
        return nil, fmt.Errorf("connect to mongodb: %w", err)
    }
    deps.DB = mongoClient.Database(cfg.MongoDB.Database)
    deps.closer = append(deps.closer, func() error {
        return mongoClient.Disconnect(context.Background())
    })

    // Connect to Redis
    deps.Cache = redis.NewClient(&redis.Options{
        Addr: cfg.Redis.Address,
    })
    deps.closer = append(deps.closer, func() error {
        return deps.Cache.Close()
    })

    return deps, nil
}

type Services struct {
    UserService  domain.UserService
    OrderService domain.OrderService
}

func initServices(deps *Dependencies, log *zap.Logger) *Services {
    // Repositories
    userRepo := repository.NewUserRepository(deps.DB, log)
    orderRepo := repository.NewOrderRepository(deps.DB, log)

    // Services
    userService := service.NewUserService(userRepo, log)
    orderService := service.NewOrderService(orderRepo, log)

    return &Services{
        UserService:  userService,
        OrderService: orderService,
    }
}

func gracefulShutdown(srv *server.Server, log *zap.Logger) error {
    errChan := make(chan error, 1)

    // Start server
    go func() {
        if err := srv.Start(); err != nil {
            errChan <- err
        }
    }()

    // Wait for interrupt signal
    sigChan := make(chan os.Signal, 1)
    signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

    select {
    case err := <-errChan:
        return err
    case sig := <-sigChan:
        log.Info("received shutdown signal", zap.String("signal", sig.String()))
    }

    // Shutdown with timeout
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    if err := srv.Shutdown(ctx); err != nil {
        return fmt.Errorf("shutdown: %w", err)
    }

    log.Info("server stopped gracefully")
    return nil
}
```

### Interface Definitions

Define clear interface boundaries:

```go
// internal/domain/interfaces.go
package domain

import "context"

// Repository interfaces
type UserRepository interface {
    Create(ctx context.Context, user *User) error
    FindByID(ctx context.Context, id string) (*User, error)
    Update(ctx context.Context, user *User) error
    Delete(ctx context.Context, id string) error
}

type OrderRepository interface {
    Create(ctx context.Context, order *Order) error
    FindByID(ctx context.Context, id string) (*Order, error)
    FindByCustomerID(ctx context.Context, customerID string) ([]*Order, error)
    Update(ctx context.Context, order *Order) error
}

// Service interfaces
type UserService interface {
    CreateUser(ctx context.Context, input CreateUserInput) (*User, error)
    GetUser(ctx context.Context, id string) (*User, error)
    UpdateUser(ctx context.Context, id string, input UpdateUserInput) (*User, error)
    DeleteUser(ctx context.Context, id string) error
}

type OrderService interface {
    PlaceOrder(ctx context.Context, input PlaceOrderInput) (*Order, error)
    GetOrder(ctx context.Context, id string) (*Order, error)
    CancelOrder(ctx context.Context, id string) error
}

// External client interfaces
type PaymentClient interface {
    ProcessPayment(ctx context.Context, req PaymentRequest) (*PaymentResponse, error)
    RefundPayment(ctx context.Context, paymentID string) error
}

type NotificationClient interface {
    SendEmail(ctx context.Context, to, subject, body string) error
    SendSMS(ctx context.Context, to, message string) error
}

// Event publisher interface
type EventPublisher interface {
    Publish(ctx context.Context, topic string, event interface{}) error
}
```

### Error Definitions

Centralize error definitions:

```go
// pkg/errors/errors.go
package errors

import (
    "errors"
    "fmt"
)

// Domain errors
var (
    ErrNotFound          = errors.New("resource not found")
    ErrAlreadyExists     = errors.New("resource already exists")
    ErrInvalidInput      = errors.New("invalid input")
    ErrUnauthorized      = errors.New("unauthorized")
    ErrPermissionDenied  = errors.New("permission denied")
    ErrInternal          = errors.New("internal error")
)

// Custom error types
type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("%s: %s", e.Field, e.Message)
}

type ConflictError struct {
    Resource string
    ID       string
}

func (e *ConflictError) Error() string {
    return fmt.Sprintf("%s with id %s already exists", e.Resource, e.ID)
}

// Error wrapping
func Wrap(err error, message string) error {
    return fmt.Errorf("%s: %w", message, err)
}

func Wrapf(err error, format string, args ...interface{}) error {
    return fmt.Errorf("%s: %w", fmt.Sprintf(format, args...), err)
}
```

### Testing Organization

Organize tests alongside code:

```go
// internal/service/user_service_test.go
package service_test

import (
    "context"
    "testing"

    "github.com/example/myservice/internal/domain"
    "github.com/example/myservice/internal/repository/mocks"
    "github.com/example/myservice/internal/service"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"
    "go.uber.org/zap"
)

func TestUserService_CreateUser(t *testing.T) {
    tests := []struct {
        name          string
        input         service.CreateUserInput
        setupMocks    func(*mocks.UserRepository)
        expectedError error
    }{
        {
            name: "successful creation",
            input: service.CreateUserInput{
                Email:    "test@example.com",
                Username: "testuser",
            },
            setupMocks: func(m *mocks.UserRepository) {
                m.On("FindByEmail", mock.Anything, "test@example.com").
                    Return(nil, domain.ErrUserNotFound)
                m.On("Create", mock.Anything, mock.AnythingOfType("*domain.User")).
                    Return(nil)
            },
            expectedError: nil,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            mockRepo := new(mocks.UserRepository)
            if tt.setupMocks != nil {
                tt.setupMocks(mockRepo)
            }

            logger := zap.NewNop()
            svc := service.NewUserService(mockRepo, logger)

            _, err := svc.CreateUser(context.Background(), tt.input)

            if tt.expectedError != nil {
                assert.ErrorIs(t, err, tt.expectedError)
            } else {
                assert.NoError(t, err)
            }

            mockRepo.AssertExpectations(t)
        })
    }
}
```

### Naming Conventions

Follow Go naming conventions:

```go
// Package names: lowercase, single word
package user    // Good
package userservice  // Avoid (redundant with import path)

// Interface names: noun or adjective
type Reader interface {}      // Good
type UserRepository interface {}  // Good
type IUser interface {}       // Bad (don't use I prefix)

// Struct names: PascalCase
type UserService struct {}    // Good
type userService struct {}    // Private implementation

// Method names: PascalCase for exported, camelCase for private
func (s *UserService) CreateUser() {}  // Exported
func (s *userService) validateInput() {}  // Private

// Variable names: camelCase or short names
var userCount int             // Good
var u *User                   // Good for short scope
var user_count int            // Bad (snake_case)

// Constants: PascalCase or ALL_CAPS for exported
const MaxRetries = 3          // Good
const MAX_RETRIES = 3         // Also acceptable
const maxRetries = 3          // Private

// Error variables: Err prefix
var ErrNotFound = errors.New("not found")  // Good
var NotFoundError = errors.New("not found")  // Less idiomatic
```

## Implementation Guidelines

### Package Organization

1. **Internal packages**: Use internal/ for private code
2. **Public packages**: Use pkg/ for reusable libraries
3. **Flat structure**: Avoid deep nesting
4. **Clear boundaries**: Separate domain, service, repository layers
5. **Interface-driven**: Define interfaces in domain package

### Dependency Management

1. **Dependency injection**: Pass dependencies via constructors
2. **Interface dependencies**: Depend on interfaces, not concrete types
3. **Constructor pattern**: Use New functions for initialization
4. **No global state**: Avoid package-level variables
5. **Explicit dependencies**: Make dependencies explicit

### Testing Strategy

1. **Test files**: Place tests alongside source files
2. **Table-driven**: Use table-driven tests
3. **Mocks**: Generate mocks for interfaces
4. **Integration tests**: Separate integration tests
5. **Test helpers**: Create helper functions for common setups

### Code Style

1. **Go fmt**: Always run gofmt
2. **Go vet**: Run go vet before commit
3. **Linters**: Use golangci-lint
4. **Comments**: Document exported types and functions
5. **Error handling**: Always handle errors explicitly

## Anti-Patterns to Avoid

### Don't Create Circular Dependencies

```go
// Bad: Circular dependency
// package A imports package B
// package B imports package A

// Good: Extract shared types to separate package
// package domain defines shared types
// package service depends on domain
// package repository depends on domain
```

### Don't Mix Layers

```go
// Bad: Repository calling service
type userRepository struct {
    service UserService  // Wrong!
}

// Good: Service calling repository
type userService struct {
    repo UserRepository  // Correct!
}
```

### Don't Use Generic Package Names

```go
// Bad
package utils
package helpers
package common

// Good
package validator
package parser
package converter
```

### Don't Create God Objects

```go
// Bad: Too many responsibilities
type UserManager struct {
    // Database access
    // Business logic
    // HTTP handling
    // Validation
    // Caching
}

// Good: Separated responsibilities
type UserRepository struct {}  // Data access
type UserService struct {}     // Business logic
type UserHandler struct {}     // HTTP handling
```

## Related Implementers

- **build-system.md**: Build configuration for project structure
- **testing.md**: Testing patterns and organization
- **domain-modeling.md**: Domain layer organization
- **deployment.md**: Deployment artifacts structure
