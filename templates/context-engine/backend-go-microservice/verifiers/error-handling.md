---
domain: error-handling
description: Verify comprehensive error handling patterns including error wrapping with fmt.Errorf and %w, sentinel errors, early returns, and error scenario testing
---

# Error Handling Verification

Verify that implementation follows robust error handling patterns with proper error wrapping, sentinel errors for domain logic, early returns, and comprehensive error testing.

## Verification Checklist

### 1. Error Wrapping with fmt.Errorf and %w

**Requirement:** All errors must be wrapped with context using fmt.Errorf and the %w verb to preserve error chains for errors.Is() and errors.As().

**Verification Steps:**

✅ **Check error wrapping in repository layer:**
```go
// ✅ Correct - error wrapping with context
func (r *UserRepository) FindByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
    var user domain.User
    err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&user)
    if err != nil {
        if err == mongo.ErrNoDocuments {
            return nil, fmt.Errorf("user not found with id %s: %w", id, ErrUserNotFound)
        }
        return nil, fmt.Errorf("failed to find user %s: %w", id, err)
    }
    return &user, nil
}

// ❌ Incorrect - returning raw errors without context
func (r *UserRepository) FindByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
    var user domain.User
    err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&user)
    if err != nil {
        return nil, err  // Lost context!
    }
    return &user, nil
}

// ❌ Incorrect - using %v instead of %w
func (r *UserRepository) FindByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
    var user domain.User
    err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&user)
    if err != nil {
        return nil, fmt.Errorf("failed to find user %s: %v", id, err)  // %v loses error chain!
    }
    return &user, nil
}
```

✅ **Check error wrapping in service layer:**
```go
// ✅ Correct - wrapping with business context
func (s *OrderService) CreateOrder(ctx context.Context, req CreateOrderRequest) (*domain.Order, error) {
    // Validate request
    if err := req.Validate(); err != nil {
        return nil, fmt.Errorf("invalid order request: %w", err)
    }

    // Create order
    order := domain.NewOrder(req.UserID, req.Items)
    if err := s.repo.Save(ctx, order); err != nil {
        return nil, fmt.Errorf("failed to save order for user %s: %w", req.UserID, err)
    }

    return order, nil
}

// ❌ Incorrect - re-wrapping without adding context
func (s *OrderService) CreateOrder(ctx context.Context, req CreateOrderRequest) (*domain.Order, error) {
    order := domain.NewOrder(req.UserID, req.Items)
    if err := s.repo.Save(ctx, order); err != nil {
        return nil, fmt.Errorf("error: %w", err)  // No new context added
    }
    return order, nil
}
```

✅ **Check error wrapping in gRPC handlers:**
```go
// ✅ Correct - wrapping with request context
func (h *OrderHandler) CreateOrder(ctx context.Context, req *pb.CreateOrderRequest) (*pb.CreateOrderResponse, error) {
    orderReq := toCreateOrderRequest(req)

    order, err := h.service.CreateOrder(ctx, orderReq)
    if err != nil {
        if errors.Is(err, domain.ErrInvalidInput) {
            return nil, status.Errorf(codes.InvalidArgument, "invalid order: %v", err)
        }
        return nil, fmt.Errorf("failed to create order for request %s: %w", req.GetOrderId(), err)
    }

    return toOrderResponse(order), nil
}

// ❌ Incorrect - losing error information
func (h *OrderHandler) CreateOrder(ctx context.Context, req *pb.CreateOrderRequest) (*pb.CreateOrderResponse, error) {
    order, err := h.service.CreateOrder(ctx, toCreateOrderRequest(req))
    if err != nil {
        return nil, status.Error(codes.Internal, "internal error")  // Lost details!
    }
    return toOrderResponse(order), nil
}
```

✅ **Check error chain preservation:**
```go
// ✅ Correct - error chain can be inspected
func ProcessOrder(ctx context.Context, orderID string) error {
    err := validateOrder(orderID)
    if err != nil {
        return fmt.Errorf("order processing failed: %w", err)
    }
    return nil
}

// Usage - can check error types
err := ProcessOrder(ctx, "123")
if errors.Is(err, ErrInvalidInput) {
    // Handle validation error
}
if errors.Is(err, ErrDatabase) {
    // Handle database error
}

// ❌ Incorrect - error chain broken
func ProcessOrder(ctx context.Context, orderID string) error {
    err := validateOrder(orderID)
    if err != nil {
        return fmt.Errorf("order processing failed: %v", err)  // %v breaks chain
    }
    return nil
}
```

**How to Verify:**
```bash
# Check for error wrapping with %w
grep -r "fmt.Errorf" internal/ | grep "%w"

# Find cases using %v instead of %w (potential issues)
grep -r "fmt.Errorf.*%v.*err" internal/

# Check for raw error returns
grep -r "return.*err$" internal/ | grep -v "return nil"

# Verify no error strings
grep -r 'errors.New("' internal/ | grep -v "_test.go"
```

**Expected Result:**
- All wrapped errors use %w instead of %v
- Every error has descriptive context added
- Error chains preserved for errors.Is() and errors.As()
- No direct error returns without wrapping

---

### 2. Sentinel Errors for Domain Logic

**Requirement:** Domain-specific errors must be defined as sentinel errors (exported variables) to enable error type checking with errors.Is().

**Verification Steps:**

✅ **Check sentinel error definitions:**
```go
// ✅ Correct - sentinel errors in domain package
// File: internal/domain/errors.go
package domain

import "errors"

// User errors
var (
    ErrUserNotFound      = errors.New("user not found")
    ErrUserAlreadyExists = errors.New("user already exists")
    ErrInvalidEmail      = errors.New("invalid email address")
)

// Order errors
var (
    ErrOrderNotFound     = errors.New("order not found")
    ErrInvalidOrderState = errors.New("invalid order state")
    ErrInsufficientStock = errors.New("insufficient stock")
)

// Validation errors
var (
    ErrInvalidInput      = errors.New("invalid input")
    ErrMissingField      = errors.New("required field missing")
    ErrInvalidFormat     = errors.New("invalid format")
)

// ❌ Incorrect - errors defined inline
func (s *UserService) FindUser(id string) error {
    user := s.repo.Find(id)
    if user == nil {
        return errors.New("user not found")  // Should be sentinel!
    }
    return nil
}

// ❌ Incorrect - non-exported sentinel errors
var (
    errUserNotFound = errors.New("user not found")  // Should be exported
    errInvalidEmail = errors.New("invalid email")   // Should be exported
)
```

✅ **Check sentinel error usage:**
```go
// ✅ Correct - returning sentinel errors
func (r *UserRepository) FindByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
    var user domain.User
    err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&user)
    if err != nil {
        if err == mongo.ErrNoDocuments {
            return nil, fmt.Errorf("user %s: %w", id, domain.ErrUserNotFound)
        }
        return nil, fmt.Errorf("database error: %w", err)
    }
    return &user, nil
}

// ✅ Correct - checking sentinel errors
func (s *UserService) GetUser(ctx context.Context, id uuid.UUID) (*domain.User, error) {
    user, err := s.repo.FindByID(ctx, id)
    if err != nil {
        if errors.Is(err, domain.ErrUserNotFound) {
            // Handle not found case
            return nil, fmt.Errorf("user lookup failed: %w", err)
        }
        // Handle other errors
        return nil, fmt.Errorf("unexpected error: %w", err)
    }
    return user, nil
}

// ❌ Incorrect - string comparison instead of errors.Is
func (s *UserService) GetUser(ctx context.Context, id uuid.UUID) (*domain.User, error) {
    user, err := s.repo.FindByID(ctx, id)
    if err != nil {
        if err.Error() == "user not found" {  // Fragile string matching!
            return nil, err
        }
    }
    return user, nil
}
```

✅ **Check error type documentation:**
```go
// ✅ Correct - documented sentinel errors
// File: internal/domain/errors.go
package domain

import "errors"

// User-related errors
var (
    // ErrUserNotFound is returned when a user cannot be found by ID or email.
    // This error should be wrapped with additional context when returned.
    ErrUserNotFound = errors.New("user not found")

    // ErrUserAlreadyExists is returned when attempting to create a user
    // with an email that already exists in the system.
    ErrUserAlreadyExists = errors.New("user already exists")

    // ErrInvalidEmail is returned when an email address fails validation.
    ErrInvalidEmail = errors.New("invalid email address")
)

// ❌ Incorrect - no documentation
var (
    ErrUserNotFound = errors.New("user not found")
    ErrInvalidEmail = errors.New("invalid email address")
)
```

✅ **Check error grouping by domain:**
```go
// ✅ Correct - errors organized by domain
// File: internal/domain/user/errors.go
package user

var (
    ErrNotFound      = errors.New("user not found")
    ErrAlreadyExists = errors.New("user already exists")
    ErrInvalidEmail  = errors.New("invalid email")
)

// File: internal/domain/order/errors.go
package order

var (
    ErrNotFound          = errors.New("order not found")
    ErrInvalidState      = errors.New("invalid order state")
    ErrInsufficientStock = errors.New("insufficient stock")
)

// Usage
if errors.Is(err, user.ErrNotFound) { ... }
if errors.Is(err, order.ErrInvalidState) { ... }

// ❌ Incorrect - all errors in one place without domain context
var (
    ErrUserNotFound   = errors.New("not found")
    ErrOrderNotFound  = errors.New("not found")  // Same message!
    ErrProductNotFound = errors.New("not found")
)
```

**How to Verify:**
```bash
# Find sentinel error definitions
grep -r "var.*Err.*=" internal/domain/

# Check for proper error documentation
grep -B1 "var.*Err.*=" internal/domain/ | grep "//"

# Find errors.Is usage
grep -r "errors.Is(" internal/

# Find inline errors.New (should be rare)
grep -r 'errors.New("' internal/ | grep -v "errors.go" | grep -v "_test.go"

# Check error.Error() string comparison (anti-pattern)
grep -r "err.Error() ==" internal/
```

**Expected Result:**
- All domain errors defined as sentinel variables
- Sentinel errors are exported (start with capital letter)
- Error checking uses errors.Is() not string comparison
- Errors grouped by domain/package
- All sentinel errors documented

---

### 3. Early Returns for Error Handling

**Requirement:** Functions must use early returns to handle errors immediately, avoiding nested error handling and reducing cognitive load.

**Verification Steps:**

✅ **Check early return pattern:**
```go
// ✅ Correct - early returns for errors
func (s *OrderService) ProcessOrder(ctx context.Context, orderID uuid.UUID) error {
    // Validate order ID
    if orderID == uuid.Nil {
        return fmt.Errorf("invalid order id: %w", domain.ErrInvalidInput)
    }

    // Fetch order
    order, err := s.repo.FindByID(ctx, orderID)
    if err != nil {
        return fmt.Errorf("failed to fetch order: %w", err)
    }

    // Validate order state
    if !order.CanProcess() {
        return fmt.Errorf("order cannot be processed: %w", domain.ErrInvalidOrderState)
    }

    // Check inventory
    if err := s.inventoryService.Reserve(ctx, order.Items); err != nil {
        return fmt.Errorf("failed to reserve inventory: %w", err)
    }

    // Update order status
    order.MarkAsProcessing()
    if err := s.repo.Update(ctx, order); err != nil {
        return fmt.Errorf("failed to update order: %w", err)
    }

    return nil
}

// ❌ Incorrect - nested error handling (pyramid of doom)
func (s *OrderService) ProcessOrder(ctx context.Context, orderID uuid.UUID) error {
    if orderID != uuid.Nil {
        order, err := s.repo.FindByID(ctx, orderID)
        if err == nil {
            if order.CanProcess() {
                if err := s.inventoryService.Reserve(ctx, order.Items); err == nil {
                    order.MarkAsProcessing()
                    if err := s.repo.Update(ctx, order); err == nil {
                        return nil
                    } else {
                        return fmt.Errorf("failed to update: %w", err)
                    }
                } else {
                    return fmt.Errorf("failed to reserve: %w", err)
                }
            } else {
                return domain.ErrInvalidOrderState
            }
        } else {
            return fmt.Errorf("failed to fetch: %w", err)
        }
    } else {
        return domain.ErrInvalidInput
    }
}
```

✅ **Check guard clauses at function start:**
```go
// ✅ Correct - guard clauses validate inputs early
func (s *UserService) UpdateUserEmail(ctx context.Context, userID uuid.UUID, email string) error {
    // Guard clauses
    if userID == uuid.Nil {
        return fmt.Errorf("invalid user id: %w", domain.ErrInvalidInput)
    }
    if email == "" {
        return fmt.Errorf("email cannot be empty: %w", domain.ErrInvalidInput)
    }
    if !isValidEmail(email) {
        return fmt.Errorf("invalid email format: %w", domain.ErrInvalidEmail)
    }

    // Main logic
    user, err := s.repo.FindByID(ctx, userID)
    if err != nil {
        return fmt.Errorf("failed to find user: %w", err)
    }

    user.Email = email
    if err := s.repo.Update(ctx, user); err != nil {
        return fmt.Errorf("failed to update user: %w", err)
    }

    return nil
}

// ❌ Incorrect - validation mixed with business logic
func (s *UserService) UpdateUserEmail(ctx context.Context, userID uuid.UUID, email string) error {
    user, err := s.repo.FindByID(ctx, userID)
    if err != nil {
        return fmt.Errorf("failed to find user: %w", err)
    }

    if userID == uuid.Nil {  // Too late!
        return domain.ErrInvalidInput
    }
    if email == "" {  // Should be at start
        return domain.ErrInvalidInput
    }

    user.Email = email
    if err := s.repo.Update(ctx, user); err != nil {
        return fmt.Errorf("failed to update user: %w", err)
    }

    return nil
}
```

✅ **Check error handling in loops:**
```go
// ✅ Correct - early return in loop
func (s *OrderService) ProcessItems(ctx context.Context, items []Item) error {
    for _, item := range items {
        if err := s.validateItem(item); err != nil {
            return fmt.Errorf("invalid item %s: %w", item.ID, err)
        }

        if err := s.processItem(ctx, item); err != nil {
            return fmt.Errorf("failed to process item %s: %w", item.ID, err)
        }
    }
    return nil
}

// ❌ Incorrect - collecting errors without context
func (s *OrderService) ProcessItems(ctx context.Context, items []Item) error {
    var lastErr error
    for _, item := range items {
        if err := s.processItem(ctx, item); err != nil {
            lastErr = err  // Lost previous errors!
        }
    }
    return lastErr
}
```

✅ **Check context cancellation checks:**
```go
// ✅ Correct - early return on context cancellation
func (s *OrderService) ProcessLargeOrder(ctx context.Context, orderID uuid.UUID) error {
    // Check context before starting
    if err := ctx.Err(); err != nil {
        return fmt.Errorf("context cancelled before processing: %w", err)
    }

    order, err := s.repo.FindByID(ctx, orderID)
    if err != nil {
        return fmt.Errorf("failed to find order: %w", err)
    }

    for _, item := range order.Items {
        // Check context in long-running loop
        if err := ctx.Err(); err != nil {
            return fmt.Errorf("context cancelled during item processing: %w", err)
        }

        if err := s.processItem(ctx, item); err != nil {
            return fmt.Errorf("failed to process item: %w", err)
        }
    }

    return nil
}

// ❌ Incorrect - no context checks
func (s *OrderService) ProcessLargeOrder(ctx context.Context, orderID uuid.UUID) error {
    order, err := s.repo.FindByID(ctx, orderID)
    if err != nil {
        return err
    }

    for _, item := range order.Items {
        s.processItem(ctx, item)  // May continue after cancellation!
    }

    return nil
}
```

**How to Verify:**
```bash
# Check for early returns
grep -r "if err != nil {" internal/ -A 1 | grep "return"

# Find nested error handling (potential pyramid of doom)
grep -r "if err != nil {" internal/ -A 1 | grep -A 10 "if err"

# Check for guard clauses at function start
grep -r "func.*{" internal/ -A 5 | grep "if.*return"

# Find ctx.Err() checks
grep -r "ctx.Err()" internal/
```

**Expected Result:**
- All errors handled with early returns
- Guard clauses at start of functions
- No deeply nested error handling
- Context cancellation checked in loops
- Linear code flow (minimal nesting)

---

### 4. Error Logging with Context

**Requirement:** All errors must be logged with structured context using zap logger before being returned.

**Verification Steps:**

✅ **Check error logging in services:**
```go
// ✅ Correct - structured error logging
func (s *OrderService) CreateOrder(ctx context.Context, req CreateOrderRequest) (*domain.Order, error) {
    logger := s.logger.With(
        zap.String("user_id", req.UserID.String()),
        zap.String("trace_id", getTraceID(ctx)),
    )

    order := domain.NewOrder(req.UserID, req.Items)

    if err := s.repo.Save(ctx, order); err != nil {
        logger.Error("failed to save order",
            zap.String("order_id", order.ID.String()),
            zap.Error(err),
        )
        return nil, fmt.Errorf("failed to save order: %w", err)
    }

    logger.Info("order created successfully",
        zap.String("order_id", order.ID.String()),
        zap.Int("items_count", len(order.Items)),
    )

    return order, nil
}

// ❌ Incorrect - no error logging
func (s *OrderService) CreateOrder(ctx context.Context, req CreateOrderRequest) (*domain.Order, error) {
    order := domain.NewOrder(req.UserID, req.Items)

    if err := s.repo.Save(ctx, order); err != nil {
        return nil, fmt.Errorf("failed to save order: %w", err)  // No logging!
    }

    return order, nil
}

// ❌ Incorrect - unstructured logging
func (s *OrderService) CreateOrder(ctx context.Context, req CreateOrderRequest) (*domain.Order, error) {
    order := domain.NewOrder(req.UserID, req.Items)

    if err := s.repo.Save(ctx, order); err != nil {
        log.Printf("failed to save order %s: %v", order.ID, err)  // Unstructured!
        return nil, fmt.Errorf("failed to save order: %w", err)
    }

    return order, nil
}
```

✅ **Check log levels:**
```go
// ✅ Correct - appropriate log levels
func (s *UserService) GetUser(ctx context.Context, id uuid.UUID) (*domain.User, error) {
    user, err := s.repo.FindByID(ctx, id)
    if err != nil {
        if errors.Is(err, domain.ErrUserNotFound) {
            // Not found is info level (expected error)
            s.logger.Info("user not found",
                zap.String("user_id", id.String()),
            )
            return nil, fmt.Errorf("user not found: %w", err)
        }

        // Unexpected errors are error level
        s.logger.Error("failed to fetch user",
            zap.String("user_id", id.String()),
            zap.Error(err),
        )
        return nil, fmt.Errorf("failed to fetch user: %w", err)
    }

    return user, nil
}

// ❌ Incorrect - all errors logged at same level
func (s *UserService) GetUser(ctx context.Context, id uuid.UUID) (*domain.User, error) {
    user, err := s.repo.FindByID(ctx, id)
    if err != nil {
        s.logger.Error("error", zap.Error(err))  // Too generic, wrong level for not found
        return nil, err
    }
    return user, nil
}
```

✅ **Check logger context propagation:**
```go
// ✅ Correct - logger with request context
func (h *OrderHandler) CreateOrder(ctx context.Context, req *pb.CreateOrderRequest) (*pb.CreateOrderResponse, error) {
    // Extract trace ID and add to logger
    traceID := getTraceID(ctx)
    logger := h.logger.With(
        zap.String("trace_id", traceID),
        zap.String("method", "CreateOrder"),
        zap.String("user_id", req.GetUserId()),
    )

    logger.Info("creating order")

    order, err := h.service.CreateOrder(ctx, toCreateOrderRequest(req))
    if err != nil {
        logger.Error("failed to create order", zap.Error(err))
        return nil, handleError(err)
    }

    logger.Info("order created successfully",
        zap.String("order_id", order.ID.String()),
    )

    return toOrderResponse(order), nil
}

// ❌ Incorrect - no context in logs
func (h *OrderHandler) CreateOrder(ctx context.Context, req *pb.CreateOrderRequest) (*pb.CreateOrderResponse, error) {
    h.logger.Info("creating order")  // No trace ID, user ID, etc.

    order, err := h.service.CreateOrder(ctx, toCreateOrderRequest(req))
    if err != nil {
        h.logger.Error("error", zap.Error(err))  // No context!
        return nil, handleError(err)
    }

    return toOrderResponse(order), nil
}
```

**How to Verify:**
```bash
# Check for logger usage
grep -r "logger.Error\|logger.Info\|logger.Warn" internal/

# Verify structured logging with zap
grep -r "zap.String\|zap.Error\|zap.Int" internal/

# Find unstructured logging
grep -r "log.Printf\|fmt.Printf" internal/ | grep -v "_test.go"

# Check logger context propagation
grep -r "logger.With(" internal/
```

**Expected Result:**
- All errors logged before returning
- Structured logging with zap
- Appropriate log levels (Info, Warn, Error)
- Logger includes trace ID and request context
- No unstructured logging (log.Printf, fmt.Printf)

---

### 5. gRPC Error Code Mapping

**Requirement:** gRPC handlers must map domain errors to appropriate gRPC status codes.

**Verification Steps:**

✅ **Check error code mapping helper:**
```go
// ✅ Correct - centralized error mapping
// File: internal/interfaces/grpc/errors.go
package grpc

import (
    "errors"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
    "github.com/company/service/internal/domain"
)

func mapErrorToStatus(err error) error {
    if err == nil {
        return nil
    }

    // Domain errors
    if errors.Is(err, domain.ErrUserNotFound) {
        return status.Errorf(codes.NotFound, "user not found")
    }
    if errors.Is(err, domain.ErrOrderNotFound) {
        return status.Errorf(codes.NotFound, "order not found")
    }
    if errors.Is(err, domain.ErrInvalidInput) {
        return status.Errorf(codes.InvalidArgument, "invalid input: %v", err)
    }
    if errors.Is(err, domain.ErrInvalidEmail) {
        return status.Errorf(codes.InvalidArgument, "invalid email address")
    }
    if errors.Is(err, domain.ErrUserAlreadyExists) {
        return status.Errorf(codes.AlreadyExists, "user already exists")
    }
    if errors.Is(err, domain.ErrInvalidOrderState) {
        return status.Errorf(codes.FailedPrecondition, "invalid order state")
    }

    // Context errors
    if errors.Is(err, context.Canceled) {
        return status.Errorf(codes.Canceled, "request canceled")
    }
    if errors.Is(err, context.DeadlineExceeded) {
        return status.Errorf(codes.DeadlineExceeded, "request timeout")
    }

    // Default to internal error
    return status.Errorf(codes.Internal, "internal server error")
}

// ❌ Incorrect - error mapping in every handler
func (h *OrderHandler) CreateOrder(ctx context.Context, req *pb.CreateOrderRequest) (*pb.CreateOrderResponse, error) {
    order, err := h.service.CreateOrder(ctx, toCreateOrderRequest(req))
    if err != nil {
        // Duplicated in every handler!
        if errors.Is(err, domain.ErrInvalidInput) {
            return nil, status.Error(codes.InvalidArgument, "invalid input")
        }
        if errors.Is(err, domain.ErrOrderNotFound) {
            return nil, status.Error(codes.NotFound, "not found")
        }
        return nil, status.Error(codes.Internal, "internal error")
    }
    return toOrderResponse(order), nil
}
```

✅ **Check handler usage:**
```go
// ✅ Correct - using centralized error mapping
func (h *OrderHandler) CreateOrder(ctx context.Context, req *pb.CreateOrderRequest) (*pb.CreateOrderResponse, error) {
    orderReq := toCreateOrderRequest(req)

    order, err := h.service.CreateOrder(ctx, orderReq)
    if err != nil {
        h.logger.Error("failed to create order",
            zap.String("request_id", req.GetOrderId()),
            zap.Error(err),
        )
        return nil, mapErrorToStatus(err)
    }

    return toOrderResponse(order), nil
}

func (h *UserHandler) GetUser(ctx context.Context, req *pb.GetUserRequest) (*pb.GetUserResponse, error) {
    userID, err := uuid.Parse(req.GetUserId())
    if err != nil {
        return nil, status.Errorf(codes.InvalidArgument, "invalid user id format: %v", err)
    }

    user, err := h.service.GetUser(ctx, userID)
    if err != nil {
        h.logger.Error("failed to get user",
            zap.String("user_id", req.GetUserId()),
            zap.Error(err),
        )
        return nil, mapErrorToStatus(err)
    }

    return toUserResponse(user), nil
}

// ❌ Incorrect - all errors return Internal
func (h *OrderHandler) CreateOrder(ctx context.Context, req *pb.CreateOrderRequest) (*pb.CreateOrderResponse, error) {
    order, err := h.service.CreateOrder(ctx, toCreateOrderRequest(req))
    if err != nil {
        return nil, status.Error(codes.Internal, "error")  // Lost error type!
    }
    return toOrderResponse(order), nil
}
```

✅ **Check error code coverage:**
```go
// ✅ Correct - comprehensive error mapping
var errorCodeMap = map[error]codes.Code{
    // Not found errors -> NotFound
    domain.ErrUserNotFound:      codes.NotFound,
    domain.ErrOrderNotFound:     codes.NotFound,
    domain.ErrProductNotFound:   codes.NotFound,

    // Validation errors -> InvalidArgument
    domain.ErrInvalidInput:      codes.InvalidArgument,
    domain.ErrInvalidEmail:      codes.InvalidArgument,
    domain.ErrMissingField:      codes.InvalidArgument,
    domain.ErrInvalidFormat:     codes.InvalidArgument,

    // Already exists -> AlreadyExists
    domain.ErrUserAlreadyExists: codes.AlreadyExists,
    domain.ErrDuplicateOrder:    codes.AlreadyExists,

    // State errors -> FailedPrecondition
    domain.ErrInvalidOrderState: codes.FailedPrecondition,
    domain.ErrInsufficientStock: codes.FailedPrecondition,

    // Context errors
    context.Canceled:            codes.Canceled,
    context.DeadlineExceeded:    codes.DeadlineExceeded,
}

func mapErrorToStatus(err error) error {
    for domainErr, code := range errorCodeMap {
        if errors.Is(err, domainErr) {
            return status.Errorf(code, "%v", err)
        }
    }
    return status.Errorf(codes.Internal, "internal server error")
}
```

**How to Verify:**
```bash
# Find error mapping function
grep -r "mapErrorToStatus\|mapError" internal/interfaces/grpc/

# Check status.Error usage
grep -r "status.Error\|status.Errorf" internal/interfaces/grpc/

# Verify all domain errors are mapped
grep -r "var Err" internal/domain/ | wc -l
grep -r "errors.Is.*Err" internal/interfaces/grpc/errors.go | wc -l

# Find handlers using error mapping
grep -r "mapErrorToStatus" internal/interfaces/grpc/handlers/
```

**Expected Result:**
- Centralized error mapping function exists
- All domain errors mapped to gRPC codes
- Handlers use error mapping consistently
- No direct status.Error(codes.Internal) everywhere

---

## Testing Verification

### Unit Tests for Error Handling

```go
func TestOrderService_CreateOrder_ErrorHandling(t *testing.T) {
    tests := map[string]struct {
        givenRepoError error
        thenError      error
    }{
        "GIVEN repository returns not found THEN returns wrapped error": {
            givenRepoError: domain.ErrOrderNotFound,
            thenError:      domain.ErrOrderNotFound,
        },
        "GIVEN repository returns generic error THEN returns wrapped error": {
            givenRepoError: errors.New("database connection failed"),
            thenError:      nil, // Should be wrapped but not specific domain error
        },
        "GIVEN repository returns nil THEN returns success": {
            givenRepoError: nil,
            thenError:      nil,
        },
    }

    for name, tc := range tests {
        t.Run(name, func(t *testing.T) {
            ctrl := gomock.NewController(t)
            defer ctrl.Finish()

            mockRepo := mocks.NewMockOrderRepository(ctrl)
            if tc.givenRepoError != nil {
                mockRepo.EXPECT().
                    Save(gomock.Any(), gomock.Any()).
                    Return(tc.givenRepoError)
            } else {
                mockRepo.EXPECT().
                    Save(gomock.Any(), gomock.Any()).
                    Return(nil)
            }

            service := NewOrderService(mockRepo, zaptest.NewLogger(t))
            _, err := service.CreateOrder(context.Background(), CreateOrderRequest{
                UserID: uuid.New(),
                Items:  []Item{{ID: "item1"}},
            })

            if tc.thenError != nil {
                require.Error(t, err)
                assert.True(t, errors.Is(err, tc.thenError))
            } else if tc.givenRepoError != nil {
                require.Error(t, err)
            } else {
                require.NoError(t, err)
            }
        })
    }
}

func TestErrorWrapping_PreservesChain(t *testing.T) {
    // Create an error chain
    baseErr := errors.New("database connection failed")
    wrappedErr := fmt.Errorf("failed to save: %w", baseErr)
    serviceErr := fmt.Errorf("order creation failed: %w", wrappedErr)

    // Verify error chain is preserved
    assert.True(t, errors.Is(serviceErr, baseErr))
    assert.Contains(t, serviceErr.Error(), "order creation failed")
    assert.Contains(t, serviceErr.Error(), "failed to save")
    assert.Contains(t, serviceErr.Error(), "database connection failed")
}

func TestSentinelErrors_CanBeChecked(t *testing.T) {
    tests := map[string]struct {
        givenError error
        thenIsUser bool
        thenIsOrder bool
    }{
        "GIVEN user not found error THEN is user error": {
            givenError: fmt.Errorf("lookup failed: %w", domain.ErrUserNotFound),
            thenIsUser: true,
            thenIsOrder: false,
        },
        "GIVEN order not found error THEN is order error": {
            givenError: fmt.Errorf("lookup failed: %w", domain.ErrOrderNotFound),
            thenIsUser: false,
            thenIsOrder: true,
        },
        "GIVEN generic error THEN is neither": {
            givenError: errors.New("generic error"),
            thenIsUser: false,
            thenIsOrder: false,
        },
    }

    for name, tc := range tests {
        t.Run(name, func(t *testing.T) {
            isUser := errors.Is(tc.givenError, domain.ErrUserNotFound)
            isOrder := errors.Is(tc.givenError, domain.ErrOrderNotFound)

            assert.Equal(t, tc.thenIsUser, isUser)
            assert.Equal(t, tc.thenIsOrder, isOrder)
        })
    }
}
```

### Integration Tests for Error Scenarios

```go
func (s *OrderRepositorySuite) TestFindByID_NotFound() {
    ctx := context.Background()
    nonExistentID := uuid.New()

    order, err := s.repo.FindByID(ctx, nonExistentID)

    s.Error(err)
    s.Nil(order)
    s.True(errors.Is(err, domain.ErrOrderNotFound))
}

func (s *OrderRepositorySuite) TestFindByID_ContextCancelled() {
    ctx, cancel := context.WithCancel(context.Background())
    cancel() // Cancel immediately

    order, err := s.repo.FindByID(ctx, uuid.New())

    s.Error(err)
    s.Nil(order)
    s.True(errors.Is(err, context.Canceled))
}

func (s *OrderRepositorySuite) TestSave_DuplicateKey() {
    ctx := context.Background()
    order := &domain.Order{
        ID:     uuid.New(),
        UserID: uuid.New(),
    }

    // Save first time - should succeed
    err := s.repo.Save(ctx, order)
    s.NoError(err)

    // Save again with same ID - should fail
    err = s.repo.Save(ctx, order)
    s.Error(err)
    s.True(errors.Is(err, domain.ErrOrderAlreadyExists) || strings.Contains(err.Error(), "duplicate"))
}
```

### gRPC Error Code Tests

```go
func TestMapErrorToStatus(t *testing.T) {
    tests := map[string]struct {
        givenError   error
        thenCode     codes.Code
        thenMessage  string
    }{
        "GIVEN user not found THEN returns NotFound code": {
            givenError:  fmt.Errorf("failed: %w", domain.ErrUserNotFound),
            thenCode:    codes.NotFound,
            thenMessage: "user not found",
        },
        "GIVEN invalid input THEN returns InvalidArgument code": {
            givenError:  fmt.Errorf("validation failed: %w", domain.ErrInvalidInput),
            thenCode:    codes.InvalidArgument,
            thenMessage: "invalid input",
        },
        "GIVEN already exists THEN returns AlreadyExists code": {
            givenError:  fmt.Errorf("creation failed: %w", domain.ErrUserAlreadyExists),
            thenCode:    codes.AlreadyExists,
            thenMessage: "already exists",
        },
        "GIVEN context canceled THEN returns Canceled code": {
            givenError:  context.Canceled,
            thenCode:    codes.Canceled,
            thenMessage: "canceled",
        },
        "GIVEN unknown error THEN returns Internal code": {
            givenError:  errors.New("unknown error"),
            thenCode:    codes.Internal,
            thenMessage: "internal",
        },
    }

    for name, tc := range tests {
        t.Run(name, func(t *testing.T) {
            statusErr := mapErrorToStatus(tc.givenError)

            require.Error(t, statusErr)

            st, ok := status.FromError(statusErr)
            require.True(t, ok)

            assert.Equal(t, tc.thenCode, st.Code())
            assert.Contains(t, strings.ToLower(st.Message()), tc.thenMessage)
        })
    }
}
```

---

## Common Issues and Fixes

### Issue 1: Using %v Instead of %w

**Problem:**
```go
return fmt.Errorf("failed to save: %v", err)
```

**Fix:**
```go
return fmt.Errorf("failed to save: %w", err)
```

### Issue 2: Returning Raw Errors

**Problem:**
```go
if err != nil {
    return err  // No context!
}
```

**Fix:**
```go
if err != nil {
    return fmt.Errorf("failed to process order %s: %w", orderID, err)
}
```

### Issue 3: String Error Comparison

**Problem:**
```go
if err.Error() == "user not found" {
    // Handle not found
}
```

**Fix:**
```go
if errors.Is(err, domain.ErrUserNotFound) {
    // Handle not found
}
```

### Issue 4: No Error Logging

**Problem:**
```go
if err != nil {
    return fmt.Errorf("failed: %w", err)  // No logging
}
```

**Fix:**
```go
if err != nil {
    s.logger.Error("operation failed",
        zap.String("order_id", orderID.String()),
        zap.Error(err),
    )
    return fmt.Errorf("failed: %w", err)
}
```

### Issue 5: All Errors Return Internal gRPC Code

**Problem:**
```go
if err != nil {
    return nil, status.Error(codes.Internal, "error occurred")
}
```

**Fix:**
```go
if err != nil {
    return nil, mapErrorToStatus(err)
}
```

---

## Verification Summary

**Before marking implementation as complete, verify:**

- [ ] All errors wrapped with fmt.Errorf and %w
- [ ] Sentinel errors defined for all domain errors
- [ ] errors.Is() used for error type checking
- [ ] Early returns used consistently
- [ ] No nested error handling (pyramid of doom)
- [ ] Guard clauses at function start
- [ ] All errors logged with zap structured logging
- [ ] Logger includes trace ID and context
- [ ] gRPC error mapping implemented
- [ ] All domain errors mapped to gRPC codes
- [ ] Error tests verify error wrapping
- [ ] Error tests verify sentinel error checking
- [ ] Integration tests cover error scenarios
- [ ] Context cancellation tested

**Related Verifiers:**
- **domain-modeling.md** - Domain entity validation and errors
- **logging-observability.md** - Structured logging patterns
- **grpc-api.md** - gRPC error handling and status codes
- **testing.md** - Error scenario test coverage
