---
domain: project-structure
description: Package organization with cmd/internal structure following hexagonal architecture
---

# Project Structure & Organization

Organize Go microservices using hexagonal architecture with clear separation between application entry points, business logic, and external adapters.

## Core Patterns

### 1. Hexagonal Architecture with cmd and internal Separation

**Pattern:** Clear separation between application entry points (`cmd/`) and internal business logic (`internal/`). Multiple microservices can coexist in a monorepo structure.

**Example from PR #2150:**
```
internal/adapters/clients/
├── BUILD.bazel
├── deliveries.go
└── deliveries_test.go
```

**Example from PR #2140:**
```
cmd/order-status-listener/
├── internal/
│   ├── application/     # Application services
│   ├── bootstrap/       # Dependency injection
│   └── handler/         # Kafka handlers
└── main.go
```

**Example from PR #2162:**
```
test/feature-tests/stub-order-service/
├── BUILD.bazel
├── main.go
└── README.md
```

**Frequency:** 100% of PRs

**Directory Structure:**
```
repository-root/
├── cmd/
│   ├── grpc-api/           # gRPC service entry point
│   │   ├── main.go
│   │   ├── internal/       # Service-specific code
│   │   │   ├── application/
│   │   │   ├── bootstrap/
│   │   │   └── handler/
│   │   ├── proto/          # Protobuf definitions
│   │   └── helm/           # Helm charts
│   ├── order-status-listener/  # Kafka consumer entry point
│   │   ├── main.go
│   │   └── internal/
│   └── db-migration/       # Database migration tool
│       └── main.go
├── internal/               # Shared internal packages
│   ├── adapters/          # External dependencies
│   │   ├── clients/       # HTTP clients
│   │   └── storage/       # MongoDB repositories
│   ├── domain/            # Domain models
│   │   └── entities/
│   └── lib/               # Shared utilities
│       ├── httputil/
│       ├── logging/
│       ├── telemetry/
│       └── pointers/
└── test/                  # Integration and acceptance tests
    └── feature-tests/
```

### 2. Domain-Driven Design with Entities and Repositories

**Pattern:** Domain entities contain business logic. Repository pattern for data access. Clear separation between domain and infrastructure.

**Example from PR #2135:**
```go
// Domain entity with business logic
func (p *Promise) ReleaseBenefits(orderID uuid.UUID) BenefitReleaseResult {
    existingAllocation := p.findLastAllocationByOrderID(orderID)
    if existingAllocation == nil || existingAllocation.IsCanceled() {
        return BenefitReleaseResult{}
    }
    return BenefitReleaseResult{AllocationToCancel: &existingAllocation.id}
}
```

**Example from PR #2147:**
```go
// Repository interface in domain/application layer
type promiseRepository interface {
    GetByFilter(context.Context, entities.PromiseFilter) ([]entities.Promise, error)
    SaveBenefitsRedemption(context.Context, map[domain.PromiseID]entities.BenefitRedemptionResult) error
    SaveBenefitsRelease(context.Context, map[domain.PromiseID]entities.BenefitReleaseResult) error
}
```

**Frequency:** 100% of PRs

**Related Libraries:**
- github.com/yourcompany/reward-wallet/internal/legacy/domain/entities

### 3. Adapter Pattern for External Dependencies

**Pattern:** Adapters layer isolates external dependencies (MongoDB, HTTP clients, Kafka) from domain logic.

**Example from PR #2150 (HTTP Client Adapter):**
```go
// HTTP client adapter
type DeliveriesAPI struct {
    *httputil.Client
    baseURL string
}

func NewDeliveriesAPI(baseURL string, registerer prometheus.Registerer, logger *zap.Logger) (*DeliveriesAPI, error) {
    c, err := httputil.NewClient(
        httputil.WithClientName("deliveries_api"),
        httputil.WithVerboseLogging(logger),
        httputil.WithRegisterer(registerer),
    )
    return &DeliveriesAPI{Client: c, baseURL: baseURL}, nil
}
```

**Example from PR #2147 (Storage Adapter):**
```go
// Storage adapter converts between domain and storage models
func toDomainAllocatedBenefit(record allocationStorage.DataValueContainer) domain.AllocatedBenefit {
    return domain.AllocatedBenefit{
        ID:        record.ID,
        PromiseID: record.PromiseID,
        Value:     record.DataValue.Value,
        Kind:      record.DataValue.Kind,
    }
}
```

**Frequency:** 92% of PRs

**Related Libraries:**
- github.com/yourcompany/reward-wallet/internal/adapters/clients
- github.com/yourcompany/reward-wallet/internal/adapters/storage

### 4. Bootstrap Package for Dependency Injection

**Pattern:** Bootstrap package handles application initialization and dependency wiring without framework magic.

**Example from PR #2140:**
```go
// cmd/order-status-listener/internal/bootstrap/app.go
package bootstrap

import (
    "context"
    "github.com/yourcompany/reward-wallet/internal/adapters/storage"
    "github.com/yourcompany/reward-wallet/cmd/order-status-listener/internal/application"
    "github.com/prometheus/client_golang/prometheus"
    "go.uber.org/zap"
)

type App struct {
    logger           *zap.Logger
    metricsRegistry  *prometheus.Registry
    redemptionSvc    *application.RedemptionService
}

func NewApp(ctx context.Context, cfg config) (*App, error) {
    logger, err := logging.NewLogger()
    if err != nil {
        return nil, fmt.Errorf("failed to create logger: %w", err)
    }

    mongoClient, err := mongo.Connect(ctx, options.Client().ApplyURI(cfg.Mongo.URI))
    if err != nil {
        return nil, fmt.Errorf("failed to connect to MongoDB: %w", err)
    }

    promiseRepo := storage.NewPromiseRepository(mongoClient, cfg.Mongo.Database)

    redemptionSvc := application.NewRedemptionService(promiseRepo, logger)

    return &App{
        logger:          logger,
        metricsRegistry: prometheus.NewRegistry(),
        redemptionSvc:   redemptionSvc,
    }, nil
}

func (a *App) Logger() *zap.Logger {
    return a.logger
}

func (a *App) RedemptionService() *application.RedemptionService {
    return a.redemptionSvc
}
```

**Frequency:** 88% of PRs

### 5. Main Package as Thin Entry Point

**Pattern:** main.go is minimal, focusing on app initialization, signal handling, and graceful shutdown.

**Example from PR #2140:**
```go
// cmd/order-status-listener/main.go
package main

import (
    "context"
    "os"
    "os/signal"
    "syscall"

    "github.com/yourcompany/reward-wallet/cmd/order-status-listener/internal/bootstrap"
)

func main() {
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    cfg, err := initConfig()
    if err != nil {
        panic(err)
    }

    app, err := bootstrap.NewApp(ctx, cfg)
    if err != nil {
        panic(err)
    }
    defer app.Close()

    // Start Kafka consumer
    consumer := app.OrderStatusConsumer()
    go consumer.Start(ctx)

    // Wait for interrupt signal
    sigterm := make(chan os.Signal, 1)
    signal.Notify(sigterm, syscall.SIGINT, syscall.SIGTERM)
    <-sigterm

    app.Logger().Info("shutting down gracefully")
}
```

**Frequency:** 100% of PRs with new services

### 6. Shared Libraries in internal/lib

**Pattern:** Common utilities extracted to internal/lib for reuse across services.

**Example from production:**
```
internal/lib/
├── httputil/          # HTTP client wrappers
│   ├── client.go
│   └── options.go
├── logging/           # Logging helpers
│   ├── context.go
│   └── fields.go
├── telemetry/         # OpenTelemetry helpers
│   ├── span.go
│   └── attributes.go
├── pointers/          # Pointer utilities
│   └── pointers.go
├── collections/       # Collection helpers
│   └── map.go
└── featuretoggle/     # Feature flag helpers
    └── toggle.go
```

**Frequency:** 96% of PRs

## Implementation Guidelines

### Creating a New Service

**Step 1: Create service directory structure**
```bash
mkdir -p cmd/{service-name}/internal/{application,bootstrap,handler}
mkdir -p cmd/{service-name}/proto
mkdir -p cmd/{service-name}/helm
```

**Step 2: Create main.go**
```go
package main

import (
    "context"
    "os"
    "os/signal"
    "syscall"

    "github.com/your-org/project/cmd/{service-name}/internal/bootstrap"
)

func main() {
    ctx := context.Background()

    cfg, err := loadConfig()
    if err != nil {
        panic(err)
    }

    app, err := bootstrap.NewApp(ctx, cfg)
    if err != nil {
        panic(err)
    }
    defer app.Close()

    // Start service
    app.Start(ctx)

    // Graceful shutdown
    sigterm := make(chan os.Signal, 1)
    signal.Notify(sigterm, syscall.SIGINT, syscall.SIGTERM)
    <-sigterm

    app.Logger().Info("shutting down")
}
```

**Step 3: Create bootstrap package**
```go
// cmd/{service-name}/internal/bootstrap/app.go
package bootstrap

type App struct {
    logger *zap.Logger
    // ... dependencies
}

func NewApp(ctx context.Context, cfg Config) (*App, error) {
    // Initialize dependencies
    // Wire them together
    return &App{...}, nil
}

func (a *App) Start(ctx context.Context) {
    // Start service
}

func (a *App) Close() error {
    // Cleanup resources
    return nil
}
```

### Adding Shared Adapters

Place adapters in `internal/adapters/` for reuse across services:

```
internal/adapters/
├── clients/
│   ├── order_service.go      # HTTP client for order service
│   ├── deliveries.go          # HTTP client for deliveries API
│   └── BUILD.bazel
└── storage/
    ├── promise_repository.go  # MongoDB repository
    ├── converters.go          # Domain/storage converters
    └── BUILD.bazel
```

### Organizing Domain Logic

Place domain entities and value objects in `internal/domain/`:

```
internal/domain/
├── entities/
│   ├── promise.go           # Domain entity with behavior
│   ├── customer_order.go
│   └── allocation.go
├── types.go                 # Value objects (PromiseID, CustomerID)
└── BUILD.bazel
```

### Visibility Rules

Use Bazel visibility to enforce architecture boundaries:

```python
# cmd/service/internal/application/BUILD.bazel
go_library(
    name = "application",
    visibility = ["//cmd/service:__subpackages__"],  # Only visible within service
)

# internal/domain/BUILD.bazel
go_library(
    name = "domain",
    visibility = ["//visibility:public"],  # Visible to all
)

# internal/adapters/storage/BUILD.bazel
go_library(
    name = "storage",
    visibility = ["//cmd:__subpackages__"],  # Visible to all services
)
```

## Package Naming Conventions

### Follow Go Standards

- **Lowercase only** - `package application`, not `Application`
- **No underscores** - `package orderservice`, not `order_service`
- **Concise names** - `package repo`, not `package repository`
- **Avoid stuttering** - `package storage` with `storage.Repository`, not `storage.StorageRepository`

### Import Path Structure

```go
// Service-specific packages
import "github.com/org/project/cmd/grpc-api/internal/application"

// Shared internal packages
import "github.com/org/project/internal/adapters/storage"
import "github.com/org/project/internal/domain/entities"
import "github.com/org/project/internal/lib/httputil"

// External packages
import "github.com/google/uuid"
import "go.uber.org/zap"
```

## Testing Structure

### Unit Tests Colocated

Place unit tests next to implementation:

```
internal/domain/entities/
├── promise.go
├── promise_test.go
└── BUILD.bazel
```

### Integration Tests Separate

Place integration tests in dedicated packages:

```
internal/adapters/storage/
├── promise_repository.go
├── promise_repository_integration_test.go
└── BUILD.bazel
```

### Acceptance Tests in test/

Place BDD acceptance tests in test directory:

```
test/feature-tests/
├── features/
│   ├── allocation.feature
│   └── redemption.feature
├── steps/
│   └── order_steps.go
└── BUILD.bazel
```

## Anti-Patterns to Avoid

### ❌ Mixing cmd and internal

```go
// Don't do this
cmd/service/handlers/handler.go  // Should be in internal/
```

### ❌ Circular Dependencies

```go
// Don't do this
package application
import "project/internal/adapters/storage"  // Application depends on adapter

package storage
import "project/internal/application"  // Adapter depends on application
```

**Fix:** Use interfaces defined in application layer:
```go
// application/service.go
type repository interface {
    Save(ctx context.Context, entity Entity) error
}

// storage/repository.go - implements application.repository interface
```

### ❌ God Packages

```go
// Don't do this
internal/utils/     // Everything in utils
internal/helpers/   // Everything in helpers
internal/common/    // Everything in common
```

**Fix:** Create specific packages: `httputil`, `logging`, `telemetry`

### ❌ Deep Nesting

```go
// Don't do this
internal/domain/models/entities/promise/promise.go  // Too deep
```

**Fix:** Keep it flat:
```go
internal/domain/entities/promise.go  // Better
```

## Related Implementers

- **build-system** - Bazel BUILD.bazel configuration for packages
- **domain-modeling** - Entity and value object patterns
- **error-handling** - Error handling across layers
- **configuration** - Configuration management per service

## See Also

- [Go Project Layout](https://github.com/golang-standards/project-layout)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/)
