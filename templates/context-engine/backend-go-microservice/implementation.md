# Backend Go Microservice - Implementation Guidance

Guide for implementer and verifier agents when working with Go microservices.

## Overview

This boilerplate provides production-tested patterns from yourcompany/reward-wallet for building Go microservices with:

- **Hexagonal architecture** with clean separation of concerns
- **Domain-driven design** with rich entities and value objects
- **gRPC APIs** with Protocol Buffers
- **MongoDB** persistence with repository pattern
- **Kafka** event-driven messaging
- **Comprehensive testing** (unit, integration, BDD acceptance tests)
- **Production-grade observability** (Prometheus, Zap, OpenTelemetry)

## For Implementer Agents

### Understanding Domain Selection

The spec-writer will select relevant domains based on the specification requirements. Your task is to implement code following the patterns in those domain files.

### Implementation Workflow

1. **Read the specification** to understand requirements
2. **Check selected implementers** listed in the spec
3. **Follow patterns exactly** as shown in implementer files
4. **Use real code examples** from the implementer files as templates
5. **Maintain consistency** with existing codebase patterns

### Key Implementation Principles

#### 1. Always Start with Package Structure

Every Go implementation begins with proper package organization:

```
cmd/{service-name}/
├── main.go
├── internal/
│   ├── application/    # Business logic
│   ├── bootstrap/      # DI setup
│   └── handler/        # Request handlers
└── BUILD.bazel         # Bazel build file

internal/
├── adapters/
│   ├── clients/        # HTTP clients
│   └── storage/        # MongoDB repos
├── domain/
│   └── entities/       # Domain models
└── lib/                # Utilities
```

**See:** implementers/project-structure.md

#### 2. Every Package Needs BUILD.bazel

Never create a Go package without a BUILD.bazel file:

```python
load("@io_bazel_rules_go//go:def.bzl", "go_library", "go_test")

go_library(
    name = "application",
    srcs = ["service.go"],
    importpath = "github.com/yourcompany/project/internal/application",
    visibility = ["//cmd/service:__subpackages__"],
    deps = [
        "//internal/domain",
        "@com_github_google_uuid//:uuid",
    ],
)

go_test(
    name = "application_test",
    srcs = ["service_test.go"],
    embed = [":application"],
    deps = [
        "@com_github_stretchr_testify//assert",
    ],
)
```

**See:** implementers/build-system.md

#### 3. Error Handling is Non-Negotiable

Every error must be:
- Wrapped with `fmt.Errorf` and `%w` verb
- Returned early (no deep nesting)
- Logged with context

```go
if err := operation(); err != nil {
    return fmt.Errorf("failed to do operation: %w", err)
}
```

**See:** implementers/error-handling.md

#### 4. Domain Logic Goes in Entities

Avoid anemic domain models. Put behavior in entities:

```go
// ✅ Good: Rich entity
func (p *Promise) ReleaseBenefits(orderID uuid.UUID) BenefitReleaseResult {
    allocation := p.findLastAllocationByOrderID(orderID)
    if allocation == nil || allocation.IsCanceled() {
        return BenefitReleaseResult{}
    }
    return BenefitReleaseResult{AllocationToCancel: &allocation.id}
}

// ❌ Bad: Anemic model with service doing all work
type Promise struct {
    ID string
    Allocations []Allocation
}
// Business logic in service instead of entity
```

**See:** implementers/domain-modeling.md

#### 5. Use Functional Utilities

Prefer samber/lo over manual loops:

```go
// ✅ Good
benefitIDs := lo.FilterMap(
    order.Items,
    func(item OrderItem, _ int) (uuid.UUID, bool) {
        if item.BenefitID != nil {
            return *item.BenefitID, true
        }
        return uuid.UUID{}, false
    },
)

// ❌ Bad
var benefitIDs []uuid.UUID
for _, item := range order.Items {
    if item.BenefitID != nil {
        benefitIDs = append(benefitIDs, *item.BenefitID)
    }
}
```

**See:** implementers/functional-programming.md

#### 6. Structured Logging Always

Use Zap with structured fields:

```go
logger.Info(
    "processing order",
    zap.String("order_id", orderID.String()),
    zap.String("status", status),
    zap.Int("item_count", len(items)),
)
```

**See:** implementers/logging-observability.md

#### 7. Table-Driven Tests

Every function needs table-driven tests:

```go
func TestCustomerOrder_GetBenefitIDs(t *testing.T) {
    tests := map[string]struct {
        given CustomerOrder
        then  []uuid.UUID
    }{
        "GIVEN items with no benefit IDs THEN returns empty slice": {
            given: CustomerOrder{Items: []OrderItem{{SKU: "SKU-001"}}},
            then:  []uuid.UUID{},
        },
        "GIVEN one item with benefit ID THEN returns slice with the item benefit ID": {
            given: CustomerOrder{
                Items: []OrderItem{{SKU: "SKU-001", BenefitID: &benefitID1}},
            },
            then: []uuid.UUID{benefitID1},
        },
    }
    for name, tc := range tests {
        t.Run(name, func(t *testing.T) {
            assert.Equal(t, tc.then, tc.given.GetBenefitIDs())
        })
    }
}
```

**See:** implementers/testing.md

### Domain-Specific Guidance

#### When Implementing gRPC Services

1. Define .proto files first
2. Create service implementation with controller pattern
3. Add gRPC interceptors for logging/auth
4. Include Prometheus metrics for each method
5. Write unit tests with mocked dependencies

**See:** implementers/grpc-api.md

#### When Implementing Kafka Consumers

1. Use Sarama consumer groups
2. Parse Protobuf messages from schema registry
3. Implement idempotent handlers
4. Add timeout context (30s default)
5. Log processing errors with message metadata

**See:** implementers/messaging.md

#### When Implementing MongoDB Repositories

1. Define domain repository interface in application layer
2. Implement adapter in internal/adapters/storage
3. Add converter functions between domain and storage models
4. Use transactions for multi-operation consistency
5. Include index migration JSON files

**See:** implementers/data-persistence.md

#### When Implementing HTTP Clients

1. Use httputil.NewClient wrapper
2. Add Prometheus metrics and Zap logging
3. Implement context-aware requests
4. Map HTTP errors to domain errors
5. Support retry with configurable timeout

**See:** implementers/http-clients.md

### Configuration Management

All configuration must:
- Use envconfig struct tags
- Support Helm value overrides
- Include feature flags for gradual rollouts
- Store secrets in Vault

**See:** implementers/configuration.md

### Deployment Requirements

Every service needs:
- Helm chart with staging/live values
- Kubernetes deployment manifest
- Istio VirtualService configuration
- Prometheus ServiceMonitor
- Health check endpoints

**See:** implementers/deployment.md

## For Verifier Agents

### Verification Checklist

When verifying Go microservice implementations:

#### Code Structure ✅

- [ ] Every package has BUILD.bazel file
- [ ] cmd/{service}/main.go exists
- [ ] Hexagonal architecture maintained (cmd/internal/adapters/domain)
- [ ] No circular dependencies
- [ ] Visibility controls enforced in BUILD files

#### Error Handling ✅

- [ ] All errors wrapped with fmt.Errorf and %w
- [ ] No ignored errors (_, err := patterns without handling)
- [ ] Early returns on error conditions
- [ ] Custom error types for domain errors

#### Testing ✅

- [ ] Table-driven tests for all public functions
- [ ] Test coverage >80%
- [ ] Integration tests for repositories
- [ ] BDD acceptance tests for critical flows (if applicable)
- [ ] Mocks used for external dependencies

**See:** verifiers/testing.md for detailed test verification

#### Domain Modeling ✅

- [ ] Entities contain business logic (not anemic)
- [ ] Value objects used for type safety
- [ ] Repository interfaces in domain layer
- [ ] Result objects for operation outcomes

#### Logging & Observability ✅

- [ ] Structured logging with Zap
- [ ] All errors logged with context
- [ ] Prometheus metrics for key operations
- [ ] OpenTelemetry spans for critical paths
- [ ] Context propagation in all calls

#### Configuration ✅

- [ ] envconfig used for environment variables
- [ ] Helm values files present
- [ ] Feature flags implemented correctly
- [ ] No hardcoded configuration

#### Data Access ✅

- [ ] Repository pattern followed
- [ ] Domain/storage model separation
- [ ] MongoDB transactions for consistency
- [ ] Index migrations included

#### Messaging ✅

- [ ] Consumer groups configured correctly
- [ ] Protobuf schemas from schema-registry
- [ ] Timeout contexts added
- [ ] Idempotent handlers

### Common Issues to Flag

1. **Missing BUILD.bazel files** - Every package must have one
2. **Deep error nesting** - Use early returns
3. **Anemic domain models** - Add behavior to entities
4. **No tests** - Every function needs tests
5. **Manual loops** - Should use samber/lo
6. **Missing context** - Always pass context.Context
7. **Hardcoded config** - Use envconfig
8. **Ignored errors** - All errors must be handled

### Performance Considerations

Verify implementations follow performance best practices:

- Database queries use indexes
- Kafka consumers use consumer groups for parallelism
- HTTP clients have retry limits
- Context timeouts prevent hanging
- Prometheus metrics don't create high cardinality labels

### Security Checks

Ensure implementations follow security patterns:

- Secrets loaded from Vault, not hardcoded
- Input validation on all external data
- SQL/NoSQL injection prevented via parameterized queries
- Authentication on gRPC endpoints
- Rate limiting on public APIs

## Available Implementers

### Core Patterns (Used in 90%+ of implementations)

- **project-structure** - Package organization
- **build-system** - Bazel build configuration
- **error-handling** - Error wrapping and handling
- **domain-modeling** - DDD entities and value objects
- **logging-observability** - Logging, metrics, tracing
- **configuration** - Environment configuration
- **code-organization** - Go conventions

### Feature-Specific Patterns (Use as needed)

- **testing** - Test patterns (✅ has verifier)
- **data-persistence** - MongoDB integration
- **messaging** - Kafka consumers/producers
- **http-clients** - HTTP client wrappers
- **grpc-api** - gRPC service implementation
- **functional-programming** - Collection utilities
- **deployment** - Kubernetes deployment

## Real-World Examples

All patterns are extracted from yourcompany/reward-wallet, a production microservice:

- **50 PRs analyzed** from Oct-Nov 2025
- **47 patterns documented** with real code examples
- **91% tech stack coverage** of declared technologies
- **100% of patterns** used in production

## Integration with DevOrch

### Workflow Integration

1. **Spec Writer** selects relevant implementers based on requirements
2. **Implementer** follows patterns from selected implementer files
3. **Verifier** checks implementation against verifier requirements
4. **Iterative refinement** until all checks pass

### Pattern Evolution

These patterns are living documentation. They should be:

- Updated quarterly with fresh PR analysis
- Refined based on team feedback
- Extended with new patterns as tech stack evolves

## Troubleshooting

### Build Issues

- Missing BUILD.bazel → Add build file for package
- Dependency errors → Check deps list in BUILD.bazel
- Import path wrong → Verify importpath in go_library

### Test Failures

- Tests not running → Check go_test target exists
- Mocks outdated → Regenerate with gomock
- Flaky tests → Add proper setup/teardown

### Runtime Issues

- Config not loading → Check envconfig struct tags
- Database connection fails → Verify Vault secrets
- Kafka messages not processing → Check consumer group config

## See Also

- **Implementer Files:** /implementers/*.md
- **Verifier Files:** /verifiers/*.md
- **Reference Repository:** github.com/yourcompany/reward-wallet
- **Go Documentation:** https://go.dev/doc/
