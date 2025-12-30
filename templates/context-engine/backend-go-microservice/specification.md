# Backend Go Microservice - Specification Guidance

This context training provides patterns and conventions for building Go microservices with gRPC, MongoDB, Kafka, and clean architecture.

## Overview

**Reference Repository:** yourcompany/reward-wallet
**PRs Analyzed:** 50 (Oct 13 - Nov 20, 2025)
**Patterns Extracted:** 47 across 11 domains
**Tech Stack Coverage:** 91%

This boilerplate is designed for **Go backend microservices** following hexagonal architecture with domain-driven design.

## Tech Stack

- **Language:** Go 1.21+
- **Build System:** Bazel
- **API:** gRPC with Protocol Buffers
- **Database:** MongoDB
- **Messaging:** Kafka (Sarama library)
- **Logging:** Uber Zap
- **Tracing:** OpenTelemetry
- **Metrics:** Prometheus
- **Testing:** testify, gomock, Cucumber/Gherkin
- **Deployment:** Kubernetes, Helm, Istio

## Architecture Patterns

### Hexagonal Architecture

Services follow a clear separation of concerns:

```
cmd/{service-name}/
├── main.go                    # Application entry point
└── internal/
    ├── application/           # Use cases and business logic
    ├── bootstrap/             # Dependency injection
    └── handler/               # Kafka/gRPC handlers

internal/
├── adapters/                  # External dependencies
│   ├── clients/              # HTTP clients
│   └── storage/              # MongoDB repositories
├── domain/                    # Domain models and interfaces
└── lib/                       # Shared utilities
```

### Domain-Driven Design

- **Rich domain entities** with behavior, not anemic data structures
- **Value objects** for type safety (PromiseID, CustomerID, MarketCode)
- **Repository pattern** for data access with domain/storage model separation
- **Result objects** for operation outcomes

## Available Implementers

When writing specifications for Go microservices, the following implementers are available:

### 1. **project-structure** (100% of PRs)
Use for: Package organization, cmd/internal structure, Bazel build setup

### 2. **build-system** (96% of PRs)
Use for: BUILD.bazel files, dependency management, visibility controls

### 3. **error-handling** (96% of PRs)
Use for: Error wrapping with %w, custom error types, early returns

### 4. **testing** (92% of PRs) ✅ Has verifier
Use for: Table-driven tests, testify/suite, gomock, BDD acceptance tests

### 5. **logging-observability** (94% of PRs)
Use for: Structured logging with Zap, Prometheus metrics, OpenTelemetry tracing

### 6. **configuration** (90% of PRs)
Use for: Environment config with envconfig, Helm values, feature flags

### 7. **data-persistence** (84% of PRs)
Use for: MongoDB integration, repository pattern, transactions

### 8. **messaging** (76% of PRs)
Use for: Kafka consumers/producers, Protobuf events, consumer groups

### 9. **http-clients** (70% of PRs)
Use for: HTTP client wrappers with retry, metrics, context propagation

### 10. **grpc-api** (64% of PRs)
Use for: gRPC service implementation, Protobuf definitions, interceptors

### 11. **domain-modeling** (94% of PRs)
Use for: Rich entities, value objects, result objects, functional options

### 12. **functional-programming** (86% of PRs)
Use for: Collection operations with samber/lo, pointer utilities

### 13. **deployment** (76% of PRs)
Use for: Kubernetes deployment, Helm charts, Istio configuration

### 14. **code-organization** (100% of PRs)
Use for: Package naming, interface placement, export conventions

## Specification Writing Guidelines

### When to Use This Boilerplate

Use this boilerplate when the specification involves:

- Building a new Go microservice from scratch
- Adding gRPC APIs to existing services
- Implementing event-driven features with Kafka
- Working with MongoDB for persistence
- Adding observability (metrics, tracing, logging)
- Following hexagonal/clean architecture patterns

### How to Reference Implementers

In your specification, reference implementers by domain name:

```markdown
## Implementation Requirements

### API Layer
- Follow **grpc-api** patterns for service definition
- Use **error-handling** patterns for error responses

### Business Logic
- Apply **domain-modeling** patterns for entities
- Use **functional-programming** utilities for collections

### Data Access
- Implement **data-persistence** patterns with MongoDB
- Follow **messaging** patterns for Kafka events

### Testing
- Write tests following **testing** patterns
- Ensure coverage verified by **testing** verifier
```

## Common Use Cases

### Use Case 1: New gRPC Microservice

**Implementers to use:**
- project-structure (package layout)
- build-system (Bazel setup)
- grpc-api (service definition)
- domain-modeling (business logic)
- data-persistence (if using MongoDB)
- configuration (environment setup)
- logging-observability (metrics and tracing)
- testing (unit and integration tests)

### Use Case 2: Kafka Event Consumer

**Implementers to use:**
- project-structure (consumer structure)
- messaging (Kafka consumer patterns)
- domain-modeling (event handling)
- error-handling (event processing errors)
- logging-observability (consumer metrics)
- testing (consumer tests)

### Use Case 3: HTTP Client Integration

**Implementers to use:**
- http-clients (client implementation)
- error-handling (HTTP error mapping)
- logging-observability (client metrics)
- configuration (client configuration)
- testing (client mocking)

## Pattern Frequencies

Understanding how often patterns appear helps prioritize implementation:

- **100%:** project-structure, code-organization, error-handling (early returns)
- **90-99%:** build-system, error-handling (wrapping), logging-observability, domain-modeling, configuration
- **70-89%:** testing, data-persistence, messaging, functional-programming, deployment
- **50-69%:** http-clients, grpc-api

## Tech Stack Integration

### Required Dependencies

```go
// Build
require (
    // Core
    github.com/google/uuid v1.6.0
    github.com/samber/lo v1.38.1

    // Database
    go.mongodb.org/mongo-driver v1.13.0

    // Messaging
    github.com/Shopify/sarama v1.41.0
    google.golang.org/protobuf v1.31.0

    // API
    google.golang.org/grpc v1.59.0

    // Observability
    go.uber.org/zap v1.26.0
    github.com/prometheus/client_golang v1.17.0
    go.opentelemetry.io/otel v1.19.0

    // Config
    github.com/kelseyhightower/envconfig v1.4.0

    // Testing
    github.com/stretchr/testify v1.8.4
    go.uber.org/mock v0.3.0
)
```

### Bazel Setup

Every package needs BUILD.bazel files with explicit dependencies. See **build-system** implementer.

## Anti-Patterns to Avoid

1. **No Bazel BUILD files** - Every package must have BUILD.bazel
2. **Primitive obsession** - Use value objects instead of raw strings/UUIDs
3. **Anemic domain models** - Put behavior in entities, not services
4. **Deep error nesting** - Use early returns with error wrapping
5. **Manual loops** - Prefer samber/lo for collections
6. **Missing context** - Always pass context.Context for cancellation
7. **Ignoring errors** - All errors must be handled or wrapped
8. **Hardcoded config** - Use envconfig for all configuration

## Migration Considerations

### From Node.js/TypeScript Microservices

- Replace Express routes with gRPC services
- Convert TypeScript interfaces to Go interfaces
- Use value objects instead of TypeScript types
- Replace async/await with error returns
- Use Zap instead of winston/pino

### From Python Microservices

- Convert Flask/FastAPI to gRPC
- Replace SQLAlchemy with MongoDB driver
- Use testify instead of pytest
- Convert decorators to functional options
- Replace asyncio with goroutines

## Verification Requirements

All implementations should:

1. ✅ Pass **testing** verifier checks
2. ✅ Have BUILD.bazel files for all packages
3. ✅ Include unit tests with >80% coverage
4. ✅ Have integration tests for critical paths
5. ✅ Include Prometheus metrics for key operations
6. ✅ Log all errors with structured fields
7. ✅ Support graceful shutdown
8. ✅ Have Helm charts for deployment

## Examples from Production

All patterns in this boilerplate are extracted from 50 real merged PRs from yourcompany/reward-wallet, a production Go microservice handling reward allocation and redemption logic.

Key characteristics:
- Hexagonal architecture with clear boundaries
- Event-driven design with Kafka integration
- gRPC API for synchronous communication
- MongoDB for persistence with transaction support
- BDD acceptance tests for business scenarios
- Feature flags for gradual rollouts

## See Also

- **web-frontend-nextjs** - For frontend integration patterns
- **kafka-schema-registry** - For Protobuf schema definitions
- [Go Code Review Comments](https://go.dev/wiki/CodeReviewComments)
- [Effective Go](https://go.dev/doc/effective_go)
