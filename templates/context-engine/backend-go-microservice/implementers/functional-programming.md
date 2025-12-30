---
domain: functional-programming
description: Functional programming patterns using samber/lo for collection operations, pipelines, and functional composition
---

# Functional Programming Implementer

This implementer defines patterns for functional programming in Go using samber/lo library for collection operations, transformations, and functional composition.

## Core Patterns

### Collection Transformations

Use lo functions for collection operations:

```go
import (
    "github.com/samber/lo"
)

// Map: Transform slice elements
func (s *UserService) GetUserEmails(ctx context.Context, userIDs []string) ([]string, error) {
    users, err := s.repo.FindByIDs(ctx, userIDs)
    if err != nil {
        return nil, err
    }

    emails := lo.Map(users, func(user *User, _ int) string {
        return user.Email
    })

    return emails, nil
}

// Filter: Select elements matching predicate
func (s *OrderService) GetActiveOrders(orders []*Order) []*Order {
    return lo.Filter(orders, func(order *Order, _ int) bool {
        return order.Status == OrderStatusActive
    })
}

// Reduce: Aggregate values
func CalculateTotalRevenue(orders []*Order) int64 {
    return lo.Reduce(orders, func(sum int64, order *Order, _ int) int64 {
        return sum + order.TotalAmount.Amount
    }, 0)
}

// FlatMap: Map and flatten
func GetAllOrderItems(orders []*Order) []OrderItem {
    return lo.FlatMap(orders, func(order *Order, _ int) []OrderItem {
        return order.Items
    })
}

// GroupBy: Group elements by key
func GroupOrdersByStatus(orders []*Order) map[OrderStatus][]*Order {
    return lo.GroupBy(orders, func(order *Order) OrderStatus {
        return order.Status
    })
}

// Partition: Split into two groups
func (s *UserService) PartitionActiveUsers(users []*User) (active, inactive []*User) {
    return lo.Partition(users, func(user *User) bool {
        return user.Status == UserStatusActive
    })
}

// Chunk: Split into fixed-size chunks
func ProcessInBatches(items []string, batchSize int, processor func([]string) error) error {
    batches := lo.Chunk(items, batchSize)

    for _, batch := range batches {
        if err := processor(batch); err != nil {
            return err
        }
    }

    return nil
}
```

### Optional Values and Error Handling

Use lo for safe operations:

```go
// Find: Get first matching element
func FindUserByEmail(users []*User, email string) (*User, bool) {
    return lo.Find(users, func(user *User) bool {
        return user.Email == email
    })
}

// FindOrElse: Get value or default
func GetUserOrDefault(users []*User, id string) *User {
    user, found := lo.Find(users, func(u *User) bool {
        return u.ID == id
    })

    if !found {
        return &User{ID: id, Status: UserStatusInactive}
    }

    return user
}

// Contains: Check if element exists
func HasPermission(user *User, permission string) bool {
    return lo.Contains(user.Permissions, permission)
}

// Every: Check if all elements match
func AllOrdersConfirmed(orders []*Order) bool {
    return lo.Every(orders, func(order *Order) bool {
        return order.Status == OrderStatusConfirmed
    })
}

// Some: Check if any element matches
func AnyOrderPending(orders []*Order) bool {
    return lo.Some(orders, func(order *Order) bool {
        return order.Status == OrderStatusPending
    })
}

// Compact: Remove zero values
func RemoveEmptyStrings(strs []string) []string {
    return lo.Compact(strs)
}

// Uniq: Remove duplicates
func GetUniqueCustomerIDs(orders []*Order) []string {
    customerIDs := lo.Map(orders, func(order *Order, _ int) string {
        return order.CustomerID
    })
    return lo.Uniq(customerIDs)
}

// UniqBy: Remove duplicates by key
func GetUniqueProducts(items []OrderItem) []OrderItem {
    return lo.UniqBy(items, func(item OrderItem) string {
        return item.ProductID
    })
}
```

### Pipeline Transformations

Chain multiple operations:

```go
// Processing pipeline
func (s *AnalyticsService) CalculateTopProducts(ctx context.Context, startDate, endDate time.Time) ([]ProductStats, error) {
    orders, err := s.orderRepo.FindByDateRange(ctx, startDate, endDate)
    if err != nil {
        return nil, err
    }

    // Filter confirmed orders
    confirmedOrders := lo.Filter(orders, func(order *Order, _ int) bool {
        return order.Status == OrderStatusConfirmed ||
               order.Status == OrderStatusDelivered
    })

    // Extract all items
    allItems := lo.FlatMap(confirmedOrders, func(order *Order, _ int) []OrderItem {
        return order.Items
    })

    // Group by product
    productGroups := lo.GroupBy(allItems, func(item OrderItem) string {
        return item.ProductID
    })

    // Calculate statistics
    stats := lo.MapToSlice(productGroups, func(productID string, items []OrderItem) ProductStats {
        totalQuantity := lo.Reduce(items, func(sum int, item OrderItem, _ int) int {
            return sum + item.Quantity
        }, 0)

        totalRevenue := lo.Reduce(items, func(sum int64, item OrderItem, _ int) int64 {
            return sum + (item.UnitPrice.Amount * int64(item.Quantity))
        }, 0)

        return ProductStats{
            ProductID:     productID,
            ProductName:   items[0].ProductName,
            UnitsSold:     totalQuantity,
            TotalRevenue:  totalRevenue,
        }
    })

    // Sort by revenue (descending)
    sorted := lo.Reverse(lo.SortBy(stats, func(a, b ProductStats) bool {
        return a.TotalRevenue < b.TotalRevenue
    }))

    // Take top 10
    return lo.Slice(sorted, 0, 10), nil
}

// Data transformation pipeline
func TransformUserData(users []*User) []UserDTO {
    return lo.Map(
        lo.Filter(users, func(user *User, _ int) bool {
            return user.Status == UserStatusActive
        }),
        func(user *User, _ int) UserDTO {
            return UserDTO{
                ID:       user.ID,
                Email:    user.Email,
                Username: user.Username,
            }
        },
    )
}
```

### Conditional Logic

Simplify conditional operations:

```go
// Ternary: Conditional expression
func GetUserDisplayName(user *User) string {
    return lo.Ternary(user.DisplayName != "", user.DisplayName, user.Username)
}

// If/IfF: Conditional execution
func ProcessOrder(order *Order, immediate bool) error {
    return lo.If(immediate, func() error {
        return processImmediately(order)
    }).ElseF(func() error {
        return queueForLater(order)
    })
}

// Switch/Case: Pattern matching
func GetOrderPriority(order *Order) Priority {
    return lo.Switch(order.Status).
        Case(OrderStatusPending, PriorityHigh).
        Case(OrderStatusConfirmed, PriorityMedium).
        Case(OrderStatusShipped, PriorityLow).
        Default(PriorityNormal)
}

// Must: Panic on error (use sparingly)
func MustLoadConfig() *Config {
    return lo.Must(LoadConfig())
}

// Validate: Check predicate
func ValidateOrder(order *Order) error {
    return lo.Validate(len(order.Items) > 0, "order must have items")
}
```

### Parallel Processing

Process collections concurrently:

```go
// ParallelMap: Concurrent transformation
func (s *UserService) EnrichUsers(ctx context.Context, users []*User) ([]*EnrichedUser, error) {
    enriched := lo.ParallelMap(users, func(user *User, _ int) *EnrichedUser {
        // Fetch additional data concurrently
        profile, _ := s.profileService.GetProfile(ctx, user.ID)
        preferences, _ := s.prefsService.GetPreferences(ctx, user.ID)

        return &EnrichedUser{
            User:        user,
            Profile:     profile,
            Preferences: preferences,
        }
    })

    return enriched, nil
}

// ParallelGroupBy: Concurrent grouping
func GroupUsersParallel(users []*User) map[string][]*User {
    return lo.ParallelGroupBy(users, func(user *User) string {
        return user.Country
    })
}
```

### Functional Composition

Compose functions for reusability:

```go
// Partial: Partial application
type OrderFilter func(*Order) bool

func WithStatus(status OrderStatus) OrderFilter {
    return func(order *Order) bool {
        return order.Status == status
    }
}

func WithMinAmount(minAmount int64) OrderFilter {
    return func(order *Order) bool {
        return order.TotalAmount.Amount >= minAmount
    }
}

func CombineFilters(filters ...OrderFilter) OrderFilter {
    return func(order *Order) bool {
        return lo.Every(filters, func(filter OrderFilter) bool {
            return filter(order)
        })
    }
}

// Usage
func (s *OrderService) GetHighValuePendingOrders(orders []*Order) []*Order {
    filter := CombineFilters(
        WithStatus(OrderStatusPending),
        WithMinAmount(100000),
    )

    return lo.Filter(orders, func(order *Order, _ int) bool {
        return filter(order)
    })
}

// Memoization
func Memoize[K comparable, V any](fn func(K) V) func(K) V {
    cache := make(map[K]V)
    var mu sync.RWMutex

    return func(key K) V {
        mu.RLock()
        if value, exists := cache[key]; exists {
            mu.RUnlock()
            return value
        }
        mu.RUnlock()

        value := fn(key)

        mu.Lock()
        cache[key] = value
        mu.Unlock()

        return value
    }
}

// Usage
var getExpensiveData = Memoize(func(id string) *Data {
    return fetchFromDatabase(id)
})
```

### Error Handling with Functional Style

Handle errors functionally:

```go
// Try: Execute with error recovery
func (s *UserService) SafeUpdateUser(ctx context.Context, user *User) error {
    return lo.Try(func() error {
        return s.repo.Update(ctx, user)
    })
}

// TryCatch: Execute with error handler
func (s *OrderService) ProcessWithFallback(ctx context.Context, order *Order) error {
    return lo.TryCatch(
        func() error {
            return s.processOrder(ctx, order)
        },
        func(err error) {
            s.logger.Error("order processing failed, using fallback",
                zap.Error(err),
                zap.String("order_id", order.ID),
            )
        },
    )
}

// Attempt: Multiple retry attempts
func (s *PaymentService) ChargeWithRetry(ctx context.Context, paymentID string) error {
    _, err := lo.Attempt(3, func(attempt int) error {
        if attempt > 0 {
            time.Sleep(time.Duration(attempt) * time.Second)
        }
        return s.gateway.Charge(ctx, paymentID)
    })
    return err
}
```

### Set Operations

Perform set operations on slices:

```go
// Difference: Elements in first but not in second
func GetNewCustomers(allCustomers, existingCustomers []string) []string {
    return lo.Difference(allCustomers, existingCustomers)
}

// Intersection: Elements in both
func GetCommonTags(tags1, tags2 []string) []string {
    return lo.Intersection(tags1, tags2)
}

// Union: All unique elements from both
func MergeTags(tags1, tags2 []string) []string {
    return lo.Union(tags1, tags2)
}

// Without: Remove specific elements
func RemoveDeletedUsers(users []*User, deletedIDs []string) []*User {
    return lo.Filter(users, func(user *User, _ int) bool {
        return !lo.Contains(deletedIDs, user.ID)
    })
}

// Subset: Check if all elements in subset exist in superset
func HasAllPermissions(userPerms, requiredPerms []string) bool {
    return lo.Subset(requiredPerms, userPerms)
}
```

### Utility Functions

Common utility operations:

```go
// Reverse: Reverse slice order
func GetReverseChronological(items []Item) []Item {
    return lo.Reverse(items)
}

// Shuffle: Randomize order
func RandomizeOrder(items []Item) []Item {
    return lo.Shuffle(items)
}

// Sample: Get random sample
func GetRandomSample(items []Item, count int) []Item {
    return lo.Sample(items, count)
}

// Times: Repeat operation N times
func InitializeWorkers(count int) []*Worker {
    return lo.Times(count, func(i int) *Worker {
        return NewWorker(i)
    })
}

// Range/RangeFrom: Generate numeric sequences
func GeneratePages(count int) []int {
    return lo.Range(count)
}

// Associate: Create map from slice
func IndexUsersByID(users []*User) map[string]*User {
    return lo.Associate(users, func(user *User) (string, *User) {
        return user.ID, user
    })
}

// PickBy: Filter map entries
func GetActiveFeatures(features map[string]bool) map[string]bool {
    return lo.PickBy(features, func(_ string, enabled bool) bool {
        return enabled
    })
}
```

## Implementation Guidelines

### When to Use Functional Style

1. **Collection operations**: Transforming, filtering, or aggregating data
2. **Data pipelines**: Multi-step transformations
3. **Immutability**: When avoiding mutation is important
4. **Readability**: When functional style is clearer than loops
5. **Parallel processing**: When operations can be parallelized

### Performance Considerations

1. **Memory allocation**: Be aware of slice allocations in chains
2. **Benchmarking**: Profile functional vs imperative for hot paths
3. **Lazy evaluation**: Consider lazy evaluation for large datasets
4. **Parallel overhead**: Only parallelize for CPU-bound operations
5. **Escape analysis**: Understand how closures affect allocations

### Code Organization

1. **Composability**: Build small, composable functions
2. **Pure functions**: Prefer pure functions without side effects
3. **Type safety**: Leverage generics for type-safe operations
4. **Named functions**: Extract complex predicates to named functions
5. **Documentation**: Document complex functional pipelines

## Anti-Patterns to Avoid

### Don't Overuse Functional Style

```go
// Bad: Too functional for simple case
result := lo.Map(lo.Filter(items, func(i Item) bool {
    return i.Active
}), func(i Item, _ int) string {
    return i.Name
})

// Good: Simple loop when appropriate
var result []string
for _, item := range items {
    if item.Active {
        result = append(result, item.Name)
    }
}
```

### Don't Create Excessive Allocations

```go
// Bad: Multiple intermediate slices
filtered := lo.Filter(items, predicate1)
mapped := lo.Map(filtered, mapper)
result := lo.Filter(mapped, predicate2)

// Good: Single pass when possible
result := make([]Result, 0, len(items))
for _, item := range items {
    if predicate1(item) {
        mapped := mapper(item)
        if predicate2(mapped) {
            result = append(result, mapped)
        }
    }
}
```

### Don't Ignore Error Handling

```go
// Bad: Ignoring errors in Map
results := lo.Map(ids, func(id string, _ int) *User {
    user, _ := repo.Find(id) // Ignoring error!
    return user
})

// Good: Handle errors properly
results := make([]*User, 0, len(ids))
for _, id := range ids {
    user, err := repo.Find(id)
    if err != nil {
        return nil, err
    }
    results = append(results, user)
}
```

### Don't Nest Too Deeply

```go
// Bad: Deep nesting
result := lo.Map(
    lo.Filter(
        lo.Map(items, func(i Item, _ int) ProcessedItem {
            return process(i)
        }),
        func(p ProcessedItem, _ int) bool {
            return p.Valid
        },
    ),
    func(p ProcessedItem, _ int) Result {
        return convert(p)
    },
)

// Good: Break into steps
processed := lo.Map(items, process)
valid := lo.Filter(processed, isValid)
result := lo.Map(valid, convert)
```

## Related Implementers

- **domain-modeling.md**: Using functional patterns with domain objects
- **testing.md**: Testing functional transformations
- **error-handling.md**: Functional error handling patterns
- **data-persistence.md**: Transforming database results
