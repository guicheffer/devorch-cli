---
domain: error-handling
description: Error wrapping with fmt.Errorf and %w, sentinel errors, and early returns
---

# Error Handling

Comprehensive error handling patterns using error wrapping, custom error types, and early returns for clean error propagation.

## Core Patterns

### 1. Error Wrapping with fmt.Errorf and %w Verb

**Pattern:** All errors are wrapped using `fmt.Errorf` with `%w` verb to preserve error chains for `errors.Is` and `errors.As` checks.

**Example from PR #2140:**
```go
if err = s.promiseRepository.SaveBenefitsRedemption(ctx, redemptionResults); err != nil {
    return OrderProcessingResult{}, fmt.Errorf("failed to persist benefit redemption results: %w", err)
}
```

**Example from PR #2148:**
```go
if orderBenefits, err = h.getOrderBenefits(ctx, marketCode, orderID); err != nil {
    return entities.CustomerOrder{}, fmt.Errorf("%w: unable to get order benefits: %w", parseError, err)
}
```

**Example from PR #2150:**
```go
if res.StatusCode != http.StatusOK {
    return nil, convertDeliveriesErrorResponse(res.StatusCode, responseBody)
}
deliveries, err = convertDeliveriesSuccessResponse(responseBody)
return deliveries, err
```

**Frequency:** 100% of PRs

**Why %w:**
- Preserves error chain for errors.Is() and errors.As()
- Enables error unwrapping
- Maintains stack trace information

**Related Libraries:**
- fmt
- errors

### 2. Custom Error Types for Domain Errors

**Pattern:** Domain-specific errors are defined as sentinel errors or custom types for specific error handling.

**Example from PR #2150:**
```go
var ErrNotFound = errors.New("deliveries not found")

func convertDeliveriesErrorResponse(statusCode int, responseBody []byte) error {
    if statusCode == http.StatusNotFound {
        return ErrNotFound
    }
    return fmt.Errorf("unexpected status code %d: %s", statusCode, string(responseBody))
}

// Usage with errors.Is
deliveries, err := client.GetDeliveries(ctx, planID)
if errors.Is(err, ErrNotFound) {
    // Handle not found case
}
```

**Example from PR #2148:**
```go
var parseError = fmt.Errorf("unable to parse the message")

if err = businessDivisionCode.FromString(marketCode); err != nil {
    return entities.CustomerOrder{}, fmt.Errorf("%w: unable to parse marketCode: %w", parseError, err)
}

// Caller can check
if errors.Is(err, parseError) {
    // Handle parse errors specifically
}
```

**Frequency:** 78% of PRs

**Common Sentinel Errors:**
```go
var (
    ErrNotFound        = errors.New("resource not found")
    ErrAlreadyExists   = errors.New("resource already exists")
    ErrInvalidInput    = errors.New("invalid input")
    ErrUnauthorized    = errors.New("unauthorized")
    ErrTimeout         = errors.New("operation timeout")
)
```

**Related Libraries:**
- errors

### 3. Early Returns for Error Conditions

**Pattern:** Functions return early on error conditions rather than nesting error handling logic deeply.

**Example from PR #2140:**
```go
func (s RedemptionService) ProcessOrder(ctx context.Context, order entities.CustomerOrder) (OrderProcessingResult, error) {
    benefitIDs := order.GetBenefitIDs()
    if len(benefitIDs) == 0 {
        return OrderProcessingResult{}, nil  // Early return
    }

    promises, err := s.promiseRepository.GetByFilter(ctx, entities.PromiseFilter{BenefitIDs: benefitIDs})
    if err != nil {
        return OrderProcessingResult{}, err  // Early return
    }

    // Continue processing only if no errors
    redemptionResults := make(map[domain.PromiseID]entities.BenefitRedemptionResult)
    for _, promise := range promises {
        result := promise.RedeemBenefits(order)
        redemptionResults[promise.ID] = result
    }

    if err = s.promiseRepository.SaveBenefitsRedemption(ctx, redemptionResults); err != nil {
        return OrderProcessingResult{}, err  // Early return
    }

    return OrderProcessingResult{Redemptions: redemptionResults}, nil
}
```

**Frequency:** 100% of PRs

**Benefits:**
- Reduces nesting depth
- Makes happy path obvious
- Improves readability

### 4. Context-Aware Error Messages

**Pattern:** Error messages include context about what operation failed and why.

**Example from PR #2147:**
```go
if err := session.StartTransaction(); err != nil {
    return fmt.Errorf("failed to start MongoDB transaction: %w", err)
}

if err := r.updatePromiseStatuses(sc, promiseStatusUpdates); err != nil {
    return fmt.Errorf("failed to update promise statuses in transaction: %w", err)
}

if err := r.createAllocations(sc, allocationsToCreate); err != nil {
    return fmt.Errorf("failed to create allocations in transaction: %w", err)
}

if err := session.CommitTransaction(sc); err != nil {
    return fmt.Errorf("failed to commit MongoDB transaction: %w", err)
}
```

**Frequency:** 100% of PRs

**Error Message Structure:**
```
"failed to {operation}: {context}: %w"
```

Examples:
- `"failed to fetch customer orders: database connection error: %w"`
- `"failed to publish event: Kafka producer timeout: %w"`
- `"failed to parse message: invalid JSON format: %w"`

### 5. Error Checking Pattern

**Pattern:** Always check errors immediately after operations.

**Example from production:**
```go
// ✅ Good: Immediate error check
result, err := operation()
if err != nil {
    return fmt.Errorf("operation failed: %w", err)
}
processResult(result)

// ❌ Bad: Delayed error check
result, err := operation()
processResult(result)
if err != nil {
    return err
}
```

**Frequency:** 100% of PRs

### 6. Named Return Values for Error Context

**Pattern:** Use named return values when it helps document what's being returned, especially in complex functions.

**Example from production:**
```go
func (r *Repository) GetPromisesByFilter(
    ctx context.Context,
    filter entities.PromiseFilter,
) (promises []entities.Promise, err error) {
    cursor, err := r.collection.Find(ctx, buildFilter(filter))
    if err != nil {
        return nil, fmt.Errorf("failed to execute find query: %w", err)
    }
    defer func() {
        if closeErr := cursor.Close(ctx); closeErr != nil && err == nil {
            err = fmt.Errorf("failed to close cursor: %w", closeErr)
        }
    }()

    if err = cursor.All(ctx, &promises); err != nil {
        return nil, fmt.Errorf("failed to decode promises: %w", err)
    }

    return promises, nil
}
```

**Frequency:** 54% of PRs

## Implementation Guidelines

### Error Wrapping Chain

Build error context from innermost to outermost:

```go
// Layer 1: Database operation
func (r *Repository) findByID(ctx context.Context, id uuid.UUID) (*Entity, error) {
    var entity Entity
    err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&entity)
    if err == mongo.ErrNoDocuments {
        return nil, ErrNotFound
    }
    if err != nil {
        return nil, fmt.Errorf("database query failed: %w", err)
    }
    return &entity, nil
}

// Layer 2: Repository
func (r *Repository) GetByID(ctx context.Context, id uuid.UUID) (*Entity, error) {
    entity, err := r.findByID(ctx, id)
    if err != nil {
        return nil, fmt.Errorf("failed to get entity by ID %s: %w", id, err)
    }
    return entity, nil
}

// Layer 3: Service
func (s *Service) ProcessEntity(ctx context.Context, id uuid.UUID) error {
    entity, err := s.repo.GetByID(ctx, id)
    if err != nil {
        return fmt.Errorf("failed to process entity: %w", err)
    }
    // Process entity
    return nil
}

// Error chain will be:
// "failed to process entity: failed to get entity by ID abc-123: database query failed: connection timeout"
```

### Sentinel Errors for Public APIs

Define sentinel errors for conditions that callers need to handle:

```go
// errors.go
package domain

import "errors"

var (
    // ErrNotFound indicates the requested resource doesn't exist
    ErrNotFound = errors.New("not found")

    // ErrConflict indicates a resource conflict (e.g., duplicate)
    ErrConflict = errors.New("conflict")

    // ErrInvalidInput indicates invalid input parameters
    ErrInvalidInput = errors.New("invalid input")
)

// repository.go
func (r *Repository) GetByID(ctx context.Context, id uuid.UUID) (*Entity, error) {
    // ... query logic
    if err == mongo.ErrNoDocuments {
        return nil, fmt.Errorf("entity with ID %s: %w", id, ErrNotFound)
    }
    // ...
}

// handler.go
func (h *Handler) HandleRequest(ctx context.Context, id uuid.UUID) error {
    entity, err := h.repo.GetByID(ctx, id)
    if errors.Is(err, domain.ErrNotFound) {
        return grpc.Errorf(codes.NotFound, "entity not found")
    }
    if err != nil {
        return grpc.Errorf(codes.Internal, "internal error")
    }
    // ...
}
```

### Custom Error Types

For errors that need additional context:

```go
// ValidationError carries field-specific validation failures
type ValidationError struct {
    Field   string
    Message string
    Err     error
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation failed for field %s: %s", e.Field, e.Message)
}

func (e *ValidationError) Unwrap() error {
    return e.Err
}

// Usage
func ValidateOrder(order Order) error {
    if len(order.Items) == 0 {
        return &ValidationError{
            Field:   "items",
            Message: "order must have at least one item",
        }
    }
    return nil
}

// Caller can type assert
if err := ValidateOrder(order); err != nil {
    var valErr *ValidationError
    if errors.As(err, &valErr) {
        // Handle validation error specifically
        log.Error("validation failed", zap.String("field", valErr.Field))
    }
    return err
}
```

### Defer Error Handling

Use defer for cleanup with error aggregation:

```go
func (s *Service) ProcessWithCleanup(ctx context.Context) (err error) {
    resource, err := s.acquire(ctx)
    if err != nil {
        return fmt.Errorf("failed to acquire resource: %w", err)
    }

    defer func() {
        if releaseErr := s.release(resource); releaseErr != nil {
            if err == nil {
                err = fmt.Errorf("failed to release resource: %w", releaseErr)
            } else {
                // Log release error but preserve original error
                s.logger.Error("failed to release resource after error",
                    zap.Error(releaseErr),
                    zap.Error(err),
                )
            }
        }
    }()

    if err := s.process(ctx, resource); err != nil {
        return fmt.Errorf("failed to process resource: %w", err)
    }

    return nil
}
```

## Anti-Patterns to Avoid

### ❌ Ignoring Errors

```go
// Don't do this
result, _ := operation()  // Ignoring error
```

**Fix:**
```go
result, err := operation()
if err != nil {
    return fmt.Errorf("operation failed: %w", err)
}
```

### ❌ Generic Error Messages

```go
// Don't do this
if err != nil {
    return fmt.Errorf("error: %w", err)  // No context
}
```

**Fix:**
```go
if err != nil {
    return fmt.Errorf("failed to process customer order %s: %w", orderID, err)
}
```

### ❌ Deep Nesting

```go
// Don't do this
result, err := step1()
if err == nil {
    result2, err := step2(result)
    if err == nil {
        result3, err := step3(result2)
        if err == nil {
            return result3, nil
        }
        return nil, err
    }
    return nil, err
}
return nil, err
```

**Fix:**
```go
result, err := step1()
if err != nil {
    return nil, fmt.Errorf("step1 failed: %w", err)
}

result2, err := step2(result)
if err != nil {
    return nil, fmt.Errorf("step2 failed: %w", err)
}

result3, err := step3(result2)
if err != nil {
    return nil, fmt.Errorf("step3 failed: %w", err)
}

return result3, nil
```

### ❌ Swallowing Errors

```go
// Don't do this
if err != nil {
    log.Error("something failed")
    return nil  // Swallowing error
}
```

**Fix:**
```go
if err != nil {
    log.Error("operation failed", zap.Error(err))
    return fmt.Errorf("operation failed: %w", err)
}
```

### ❌ Using %v Instead of %w

```go
// Don't do this
return fmt.Errorf("operation failed: %v", err)  // Loses error chain
```

**Fix:**
```go
return fmt.Errorf("operation failed: %w", err)  // Preserves error chain
```

## Related Implementers

- **logging-observability** - Logging errors with structured fields
- **testing** - Testing error conditions
- **http-clients** - HTTP error mapping
- **grpc-api** - gRPC error codes

## See Also

- [Go Blog: Working with Errors](https://go.dev/blog/go1.13-errors)
- [errors package documentation](https://pkg.go.dev/errors)
