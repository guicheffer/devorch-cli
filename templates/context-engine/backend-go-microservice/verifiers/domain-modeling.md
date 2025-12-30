---
domain: domain-modeling
description: Verify rich domain entities with business logic, value objects for immutability, repository pattern for persistence abstraction, and comprehensive domain testing
---

# Domain Modeling Verification

Verify that implementation follows domain-driven design principles with rich domain entities, value objects, repository pattern, and proper separation of concerns.

## Verification Checklist

### 1. Rich Domain Entities with Business Logic

**Requirement:** Domain entities must encapsulate business logic and validation, not be anemic data structures. Entities should have methods that enforce business rules.

**Verification Steps:**

✅ **Check entity with business methods:**
```go
// ✅ Correct - rich domain entity with business logic
// File: internal/domain/order/order.go
package order

import (
    "errors"
    "time"
    "github.com/google/uuid"
)

type Order struct {
    id        uuid.UUID
    userID    uuid.UUID
    items     []OrderItem
    status    OrderStatus
    total     Money
    createdAt time.Time
    updatedAt time.Time
}

// NewOrder creates a new order with validation
func NewOrder(userID uuid.UUID, items []OrderItem) (*Order, error) {
    if userID == uuid.Nil {
        return nil, errors.New("user ID cannot be nil")
    }
    if len(items) == 0 {
        return nil, errors.New("order must have at least one item")
    }

    order := &Order{
        id:        uuid.New(),
        userID:    userID,
        items:     items,
        status:    StatusPending,
        createdAt: time.Now(),
        updatedAt: time.Now(),
    }

    order.calculateTotal()
    return order, nil
}

// Confirm transitions order to confirmed status
func (o *Order) Confirm() error {
    if o.status != StatusPending {
        return ErrInvalidOrderState
    }
    o.status = StatusConfirmed
    o.updatedAt = time.Now()
    return nil
}

// Ship transitions order to shipped status
func (o *Order) Ship() error {
    if o.status != StatusConfirmed {
        return ErrInvalidOrderState
    }
    o.status = StatusShipped
    o.updatedAt = time.Now()
    return nil
}

// Cancel cancels the order if allowed
func (o *Order) Cancel() error {
    if o.status == StatusShipped || o.status == StatusDelivered {
        return errors.New("cannot cancel shipped or delivered order")
    }
    o.status = StatusCancelled
    o.updatedAt = time.Now()
    return nil
}

// CanProcess checks if order can be processed
func (o *Order) CanProcess() bool {
    return o.status == StatusPending && len(o.items) > 0
}

// AddItem adds an item to the order
func (o *Order) AddItem(item OrderItem) error {
    if o.status != StatusPending {
        return errors.New("cannot add items to non-pending order")
    }
    o.items = append(o.items, item)
    o.calculateTotal()
    o.updatedAt = time.Now()
    return nil
}

// calculateTotal recalculates order total
func (o *Order) calculateTotal() {
    total := NewMoney(0, o.total.Currency())
    for _, item := range o.items {
        total = total.Add(item.Price().Multiply(item.Quantity()))
    }
    o.total = total
}

// Getters
func (o *Order) ID() uuid.UUID       { return o.id }
func (o *Order) UserID() uuid.UUID   { return o.userID }
func (o *Order) Items() []OrderItem  { return o.items }
func (o *Order) Status() OrderStatus { return o.status }
func (o *Order) Total() Money        { return o.total }
func (o *Order) CreatedAt() time.Time { return o.createdAt }

// ❌ Incorrect - anemic domain model (data structure with no logic)
type Order struct {
    ID        uuid.UUID
    UserID    uuid.UUID
    Items     []OrderItem
    Status    string
    Total     float64
    CreatedAt time.Time
    UpdatedAt time.Time
}

// No methods! Business logic in service layer instead.
```

✅ **Check entity invariants are enforced:**
```go
// ✅ Correct - invariants enforced through methods
type User struct {
    id        uuid.UUID
    email     Email  // Value object
    name      string
    status    UserStatus
    createdAt time.Time
}

func NewUser(email Email, name string) (*User, error) {
    if name == "" {
        return nil, errors.New("name cannot be empty")
    }

    return &User{
        id:        uuid.New(),
        email:     email,
        name:      name,
        status:    UserStatusActive,
        createdAt: time.Now(),
    }, nil
}

func (u *User) ChangeEmail(newEmail Email) error {
    if u.status == UserStatusDeleted {
        return errors.New("cannot change email for deleted user")
    }
    u.email = newEmail
    return nil
}

func (u *User) Deactivate() error {
    if u.status == UserStatusDeleted {
        return errors.New("cannot deactivate deleted user")
    }
    u.status = UserStatusInactive
    return nil
}

// Private fields - can only be modified through methods
func (u *User) ID() uuid.UUID     { return u.id }
func (u *User) Email() Email      { return u.email }
func (u *User) Name() string      { return u.name }
func (u *User) Status() UserStatus { return u.status }

// ❌ Incorrect - public fields, no invariant enforcement
type User struct {
    ID        uuid.UUID
    Email     string  // Can be set to invalid email!
    Name      string  // Can be set to empty string!
    Status    string  // Can be set to any string!
    CreatedAt time.Time
}
```

✅ **Check state machine transitions:**
```go
// ✅ Correct - explicit state transitions with validation
type OrderStatus int

const (
    StatusPending OrderStatus = iota
    StatusConfirmed
    StatusPreparing
    StatusShipped
    StatusDelivered
    StatusCancelled
)

func (o *Order) TransitionTo(newStatus OrderStatus) error {
    // Define valid transitions
    validTransitions := map[OrderStatus][]OrderStatus{
        StatusPending:    {StatusConfirmed, StatusCancelled},
        StatusConfirmed:  {StatusPreparing, StatusCancelled},
        StatusPreparing:  {StatusShipped, StatusCancelled},
        StatusShipped:    {StatusDelivered},
        StatusDelivered:  {},  // Terminal state
        StatusCancelled:  {},  // Terminal state
    }

    allowed := validTransitions[o.status]
    for _, s := range allowed {
        if s == newStatus {
            o.status = newStatus
            o.updatedAt = time.Now()
            return nil
        }
    }

    return fmt.Errorf("cannot transition from %v to %v", o.status, newStatus)
}

// ❌ Incorrect - no state transition validation
func (o *Order) SetStatus(status OrderStatus) {
    o.Status = status  // Any transition allowed!
}
```

**How to Verify:**
```bash
# Check for domain entity methods
grep -r "func (.*\*.*)" internal/domain/ | grep -v "_test.go"

# Find public struct fields (potential anemic model)
grep -r "type.*struct {" internal/domain/ -A 10 | grep "^[[:space:]]*[A-Z]"

# Verify private fields with getter methods
grep -r "^[[:space:]]*[a-z].*[[:space:]]" internal/domain/*.go

# Check for NewEntity constructors
grep -r "func New.*(" internal/domain/
```

**Expected Result:**
- Domain entities have methods that encapsulate business logic
- Entity fields are private with getter methods
- Invariants enforced through methods, not direct field access
- State transitions validated
- Constructors validate input and enforce invariants

---

### 2. Value Objects for Immutability

**Requirement:** Value objects must be used for domain concepts that are identified by their value, not identity. Value objects should be immutable.

**Verification Steps:**

✅ **Check value object definition:**
```go
// ✅ Correct - immutable value object
// File: internal/domain/money.go
package domain

import (
    "errors"
    "fmt"
)

// Money represents a monetary amount with currency
type Money struct {
    amount   int64  // Amount in cents
    currency string
}

// NewMoney creates a new Money value object
func NewMoney(amount int64, currency string) Money {
    return Money{
        amount:   amount,
        currency: currency,
    }
}

// Add returns a new Money with added amount
func (m Money) Add(other Money) Money {
    if m.currency != other.currency {
        panic(fmt.Sprintf("cannot add different currencies: %s and %s", m.currency, other.currency))
    }
    return Money{
        amount:   m.amount + other.amount,
        currency: m.currency,
    }
}

// Subtract returns a new Money with subtracted amount
func (m Money) Subtract(other Money) Money {
    if m.currency != other.currency {
        panic(fmt.Sprintf("cannot subtract different currencies: %s and %s", m.currency, other.currency))
    }
    return Money{
        amount:   m.amount - other.amount,
        currency: m.currency,
    }
}

// Multiply returns a new Money multiplied by quantity
func (m Money) Multiply(quantity int) Money {
    return Money{
        amount:   m.amount * int64(quantity),
        currency: m.currency,
    }
}

// Equals compares two Money values
func (m Money) Equals(other Money) bool {
    return m.amount == other.amount && m.currency == other.currency
}

// IsPositive checks if amount is positive
func (m Money) IsPositive() bool {
    return m.amount > 0
}

// Getters
func (m Money) Amount() int64   { return m.amount }
func (m Money) Currency() string { return m.currency }

// ❌ Incorrect - mutable value object
type Money struct {
    Amount   int64  // Public, can be modified!
    Currency string // Public, can be modified!
}

func (m *Money) Add(other Money) {
    m.Amount += other.Amount  // Mutates existing instance!
}
```

✅ **Check email value object:**
```go
// ✅ Correct - email value object with validation
package domain

import (
    "errors"
    "regexp"
    "strings"
)

// Email represents a validated email address
type Email struct {
    value string
}

var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)

// NewEmail creates a new Email value object with validation
func NewEmail(email string) (Email, error) {
    email = strings.TrimSpace(strings.ToLower(email))

    if email == "" {
        return Email{}, errors.New("email cannot be empty")
    }

    if !emailRegex.MatchString(email) {
        return Email{}, errors.New("invalid email format")
    }

    return Email{value: email}, nil
}

// String returns the email as string
func (e Email) String() string {
    return e.value
}

// Equals compares two emails
func (e Email) Equals(other Email) bool {
    return e.value == other.value
}

// Domain returns the domain part of the email
func (e Email) Domain() string {
    parts := strings.Split(e.value, "@")
    if len(parts) == 2 {
        return parts[1]
    }
    return ""
}

// ❌ Incorrect - just a type alias, no validation
type Email string

func (e Email) IsValid() bool {
    // Validation after the fact, not enforced at creation
    return strings.Contains(string(e), "@")
}
```

✅ **Check address value object:**
```go
// ✅ Correct - composite value object
type Address struct {
    street     string
    city       string
    state      string
    postalCode string
    country    string
}

func NewAddress(street, city, state, postalCode, country string) (Address, error) {
    if street == "" || city == "" || country == "" {
        return Address{}, errors.New("street, city, and country are required")
    }

    return Address{
        street:     street,
        city:       city,
        state:      state,
        postalCode: postalCode,
        country:    country,
    }, nil
}

// Equals compares two addresses
func (a Address) Equals(other Address) bool {
    return a.street == other.street &&
        a.city == other.city &&
        a.state == other.state &&
        a.postalCode == other.postalCode &&
        a.country == other.country
}

// Format returns formatted address string
func (a Address) Format() string {
    return fmt.Sprintf("%s, %s, %s %s, %s",
        a.street, a.city, a.state, a.postalCode, a.country)
}

// Getters
func (a Address) Street() string     { return a.street }
func (a Address) City() string       { return a.city }
func (a Address) State() string      { return a.state }
func (a Address) PostalCode() string { return a.postalCode }
func (a Address) Country() string    { return a.country }

// ❌ Incorrect - mutable struct
type Address struct {
    Street     string
    City       string
    State      string
    PostalCode string
    Country    string
}
```

✅ **Check date range value object:**
```go
// ✅ Correct - date range with invariants
type DateRange struct {
    start time.Time
    end   time.Time
}

func NewDateRange(start, end time.Time) (DateRange, error) {
    if start.After(end) {
        return DateRange{}, errors.New("start date must be before end date")
    }

    return DateRange{
        start: start,
        end:   end,
    }, nil
}

// Contains checks if a date is within the range
func (dr DateRange) Contains(date time.Time) bool {
    return !date.Before(dr.start) && !date.After(dr.end)
}

// Overlaps checks if two date ranges overlap
func (dr DateRange) Overlaps(other DateRange) bool {
    return dr.start.Before(other.end) && dr.end.After(other.start)
}

// Duration returns the duration of the range
func (dr DateRange) Duration() time.Duration {
    return dr.end.Sub(dr.start)
}

func (dr DateRange) Start() time.Time { return dr.start }
func (dr DateRange) End() time.Time   { return dr.end }
```

**How to Verify:**
```bash
# Find value object definitions
grep -r "type.*struct {" internal/domain/ | grep -i "money\|email\|address\|range"

# Check for immutability (no pointer receivers that mutate)
grep -r "func (.*\*.*)" internal/domain/ | grep -i "money\|email\|address"

# Verify value object constructors
grep -r "func New.*(" internal/domain/ | grep -i "money\|email\|address"

# Check for Equals methods
grep -r "func.*Equals(" internal/domain/
```

**Expected Result:**
- Value objects have private fields
- Value objects are immutable (return new instances)
- Value objects have validation in constructors
- Value objects implement Equals method
- Value objects used for domain concepts (Money, Email, Address)

---

### 3. Repository Pattern for Persistence

**Requirement:** Repository interfaces must be defined in the domain layer, with implementations in the infrastructure layer. Repositories abstract persistence details.

**Verification Steps:**

✅ **Check repository interface in domain:**
```go
// ✅ Correct - repository interface in domain layer
// File: internal/domain/order/repository.go
package order

import (
    "context"
    "github.com/google/uuid"
)

// Repository defines persistence operations for orders
type Repository interface {
    // FindByID retrieves an order by ID
    FindByID(ctx context.Context, id uuid.UUID) (*Order, error)

    // FindByUserID retrieves all orders for a user
    FindByUserID(ctx context.Context, userID uuid.UUID) ([]*Order, error)

    // FindByStatus retrieves orders by status
    FindByStatus(ctx context.Context, status OrderStatus) ([]*Order, error)

    // Save persists an order (create or update)
    Save(ctx context.Context, order *Order) error

    // Delete removes an order
    Delete(ctx context.Context, id uuid.UUID) error
}

// ❌ Incorrect - repository interface in infrastructure layer
// This couples domain to infrastructure
```

✅ **Check repository implementation in infrastructure:**
```go
// ✅ Correct - repository implementation in infrastructure
// File: internal/infrastructure/persistence/mongodb/order_repository.go
package mongodb

import (
    "context"
    "fmt"
    "github.com/google/uuid"
    "go.mongodb.org/mongo-driver/bson"
    "go.mongodb.org/mongo-driver/mongo"
    "go.uber.org/zap"

    "github.com/company/service/internal/domain/order"
)

type OrderRepository struct {
    collection *mongo.Collection
    logger     *zap.Logger
}

func NewOrderRepository(db *mongo.Database, logger *zap.Logger) *OrderRepository {
    return &OrderRepository{
        collection: db.Collection("orders"),
        logger:     logger,
    }
}

// FindByID implements order.Repository
func (r *OrderRepository) FindByID(ctx context.Context, id uuid.UUID) (*order.Order, error) {
    var doc orderDocument
    err := r.collection.FindOne(ctx, bson.M{"_id": id.String()}).Decode(&doc)
    if err != nil {
        if err == mongo.ErrNoDocuments {
            return nil, fmt.Errorf("order not found: %w", order.ErrNotFound)
        }
        return nil, fmt.Errorf("failed to find order: %w", err)
    }

    return doc.toDomain(), nil
}

// FindByUserID implements order.Repository
func (r *OrderRepository) FindByUserID(ctx context.Context, userID uuid.UUID) ([]*order.Order, error) {
    cursor, err := r.collection.Find(ctx, bson.M{"user_id": userID.String()})
    if err != nil {
        return nil, fmt.Errorf("failed to find orders: %w", err)
    }
    defer cursor.Close(ctx)

    var orders []*order.Order
    for cursor.Next(ctx) {
        var doc orderDocument
        if err := cursor.Decode(&doc); err != nil {
            r.logger.Error("failed to decode order", zap.Error(err))
            continue
        }
        orders = append(orders, doc.toDomain())
    }

    return orders, nil
}

// Save implements order.Repository
func (r *OrderRepository) Save(ctx context.Context, o *order.Order) error {
    doc := fromDomain(o)

    _, err := r.collection.ReplaceOne(
        ctx,
        bson.M{"_id": doc.ID},
        doc,
        options.Replace().SetUpsert(true),
    )
    if err != nil {
        return fmt.Errorf("failed to save order: %w", err)
    }

    return nil
}

// orderDocument is the MongoDB representation
type orderDocument struct {
    ID        string                `bson:"_id"`
    UserID    string                `bson:"user_id"`
    Items     []orderItemDocument   `bson:"items"`
    Status    string                `bson:"status"`
    Total     moneyDocument         `bson:"total"`
    CreatedAt time.Time             `bson:"created_at"`
    UpdatedAt time.Time             `bson:"updated_at"`
}

// toDomain converts MongoDB document to domain entity
func (d *orderDocument) toDomain() *order.Order {
    id, _ := uuid.Parse(d.ID)
    userID, _ := uuid.Parse(d.UserID)

    items := make([]order.OrderItem, len(d.Items))
    for i, item := range d.Items {
        items[i] = item.toDomain()
    }

    // Use domain factory or reconstruction method
    return order.Reconstruct(
        id,
        userID,
        items,
        order.OrderStatus(d.Status),
        d.Total.toDomain(),
        d.CreatedAt,
        d.UpdatedAt,
    )
}

// fromDomain converts domain entity to MongoDB document
func fromDomain(o *order.Order) *orderDocument {
    items := make([]orderItemDocument, len(o.Items()))
    for i, item := range o.Items() {
        items[i] = fromDomainItem(item)
    }

    return &orderDocument{
        ID:        o.ID().String(),
        UserID:    o.UserID().String(),
        Items:     items,
        Status:    string(o.Status()),
        Total:     fromDomainMoney(o.Total()),
        CreatedAt: o.CreatedAt(),
        UpdatedAt: o.UpdatedAt(),
    }
}

// ❌ Incorrect - domain entity with database tags
type Order struct {
    ID        uuid.UUID `bson:"_id"`  // Domain coupled to MongoDB!
    UserID    uuid.UUID `bson:"user_id"`
    Status    OrderStatus
}
```

✅ **Check repository dependency injection:**
```go
// ✅ Correct - service depends on repository interface
// File: internal/application/order_service.go
package application

import (
    "context"
    "fmt"
    "github.com/google/uuid"
    "go.uber.org/zap"

    "github.com/company/service/internal/domain/order"
)

type OrderService struct {
    repo   order.Repository  // Interface, not concrete implementation
    logger *zap.Logger
}

func NewOrderService(repo order.Repository, logger *zap.Logger) *OrderService {
    return &OrderService{
        repo:   repo,
        logger: logger,
    }
}

func (s *OrderService) GetOrder(ctx context.Context, id uuid.UUID) (*order.Order, error) {
    o, err := s.repo.FindByID(ctx, id)
    if err != nil {
        s.logger.Error("failed to get order",
            zap.String("order_id", id.String()),
            zap.Error(err),
        )
        return nil, fmt.Errorf("failed to get order: %w", err)
    }

    return o, nil
}

// ❌ Incorrect - service depends on concrete repository
type OrderService struct {
    repo   *mongodb.OrderRepository  // Concrete implementation!
    logger *zap.Logger
}
```

✅ **Check repository method naming:**
```go
// ✅ Correct - clear, domain-focused method names
type OrderRepository interface {
    FindByID(ctx context.Context, id uuid.UUID) (*Order, error)
    FindByUserID(ctx context.Context, userID uuid.UUID) ([]*Order, error)
    FindByStatus(ctx context.Context, status OrderStatus) ([]*Order, error)
    Save(ctx context.Context, order *Order) error
    Delete(ctx context.Context, id uuid.UUID) error
}

// ❌ Incorrect - implementation-specific method names
type OrderRepository interface {
    SelectByID(ctx context.Context, id uuid.UUID) (*Order, error)  // SQL-specific
    InsertOrder(ctx context.Context, order *Order) error            // SQL-specific
    UpdateOrder(ctx context.Context, order *Order) error            // Implementation detail
}
```

**How to Verify:**
```bash
# Find repository interfaces in domain
find internal/domain -name "*repository.go" -o -name "*repo.go"

# Verify repository implementations in infrastructure
find internal/infrastructure -name "*repository.go"

# Check domain doesn't import infrastructure
grep -r "internal/infrastructure" internal/domain/

# Verify repository interface usage in services
grep -r "Repository interface" internal/application/
```

**Expected Result:**
- Repository interfaces defined in domain layer
- Repository implementations in infrastructure layer
- Domain layer has no infrastructure imports
- Services depend on repository interfaces, not implementations
- Clear separation between domain and persistence concerns

---

### 4. Domain Events for Side Effects

**Requirement:** Domain entities should emit events for significant state changes, enabling loose coupling and event-driven architecture.

**Verification Steps:**

✅ **Check domain event definition:**
```go
// ✅ Correct - domain event interface and implementations
// File: internal/domain/event.go
package domain

import (
    "time"
    "github.com/google/uuid"
)

// Event represents a domain event
type Event interface {
    EventID() uuid.UUID
    EventType() string
    OccurredAt() time.Time
    AggregateID() uuid.UUID
}

// BaseEvent provides common event fields
type BaseEvent struct {
    eventID     uuid.UUID
    eventType   string
    occurredAt  time.Time
    aggregateID uuid.UUID
}

func NewBaseEvent(eventType string, aggregateID uuid.UUID) BaseEvent {
    return BaseEvent{
        eventID:     uuid.New(),
        eventType:   eventType,
        occurredAt:  time.Now(),
        aggregateID: aggregateID,
    }
}

func (e BaseEvent) EventID() uuid.UUID     { return e.eventID }
func (e BaseEvent) EventType() string      { return e.eventType }
func (e BaseEvent) OccurredAt() time.Time  { return e.occurredAt }
func (e BaseEvent) AggregateID() uuid.UUID { return e.aggregateID }

// ❌ Incorrect - no event abstraction
type OrderCreatedEvent struct {
    OrderID   string
    Timestamp time.Time
}
// No common interface, inconsistent structure
```

✅ **Check specific domain events:**
```go
// ✅ Correct - specific domain events
// File: internal/domain/order/events.go
package order

import (
    "github.com/google/uuid"
    "github.com/company/service/internal/domain"
)

// OrderCreated event
type OrderCreated struct {
    domain.BaseEvent
    userID uuid.UUID
    items  []OrderItem
    total  Money
}

func NewOrderCreated(orderID, userID uuid.UUID, items []OrderItem, total Money) OrderCreated {
    return OrderCreated{
        BaseEvent: domain.NewBaseEvent("order.created", orderID),
        userID:    userID,
        items:     items,
        total:     total,
    }
}

func (e OrderCreated) UserID() uuid.UUID     { return e.userID }
func (e OrderCreated) Items() []OrderItem    { return e.items }
func (e OrderCreated) Total() Money          { return e.total }

// OrderConfirmed event
type OrderConfirmed struct {
    domain.BaseEvent
    confirmedAt time.Time
}

func NewOrderConfirmed(orderID uuid.UUID) OrderConfirmed {
    return OrderConfirmed{
        BaseEvent:   domain.NewBaseEvent("order.confirmed", orderID),
        confirmedAt: time.Now(),
    }
}

func (e OrderConfirmed) ConfirmedAt() time.Time { return e.confirmedAt }

// OrderShipped event
type OrderShipped struct {
    domain.BaseEvent
    trackingNumber string
    carrier        string
    shippedAt      time.Time
}

func NewOrderShipped(orderID uuid.UUID, trackingNumber, carrier string) OrderShipped {
    return OrderShipped{
        BaseEvent:      domain.NewBaseEvent("order.shipped", orderID),
        trackingNumber: trackingNumber,
        carrier:        carrier,
        shippedAt:      time.Now(),
    }
}

func (e OrderShipped) TrackingNumber() string { return e.trackingNumber }
func (e OrderShipped) Carrier() string        { return e.carrier }
func (e OrderShipped) ShippedAt() time.Time   { return e.shippedAt }
```

✅ **Check entity emits events:**
```go
// ✅ Correct - entity collects domain events
type Order struct {
    id        uuid.UUID
    userID    uuid.UUID
    items     []OrderItem
    status    OrderStatus
    total     Money
    createdAt time.Time
    updatedAt time.Time

    // Events to be published
    events []domain.Event
}

func NewOrder(userID uuid.UUID, items []OrderItem) (*Order, error) {
    if userID == uuid.Nil {
        return nil, errors.New("user ID cannot be nil")
    }
    if len(items) == 0 {
        return nil, errors.New("order must have at least one item")
    }

    order := &Order{
        id:        uuid.New(),
        userID:    userID,
        items:     items,
        status:    StatusPending,
        createdAt: time.Now(),
        updatedAt: time.Now(),
        events:    []domain.Event{},
    }

    order.calculateTotal()

    // Emit domain event
    order.addEvent(NewOrderCreated(order.id, userID, items, order.total))

    return order, nil
}

func (o *Order) Confirm() error {
    if o.status != StatusPending {
        return ErrInvalidOrderState
    }

    o.status = StatusConfirmed
    o.updatedAt = time.Now()

    // Emit domain event
    o.addEvent(NewOrderConfirmed(o.id))

    return nil
}

func (o *Order) Ship(trackingNumber, carrier string) error {
    if o.status != StatusConfirmed {
        return ErrInvalidOrderState
    }

    o.status = StatusShipped
    o.updatedAt = time.Now()

    // Emit domain event
    o.addEvent(NewOrderShipped(o.id, trackingNumber, carrier))

    return nil
}

func (o *Order) addEvent(event domain.Event) {
    o.events = append(o.events, event)
}

// Events returns and clears pending events
func (o *Order) Events() []domain.Event {
    events := o.events
    o.events = []domain.Event{}
    return events
}

// ❌ Incorrect - no event emission
func (o *Order) Confirm() error {
    if o.status != StatusPending {
        return ErrInvalidOrderState
    }
    o.status = StatusConfirmed
    return nil
    // No event emitted!
}
```

✅ **Check event publishing in service:**
```go
// ✅ Correct - service publishes domain events
type OrderService struct {
    repo      order.Repository
    publisher EventPublisher  // Event publisher interface
    logger    *zap.Logger
}

type EventPublisher interface {
    Publish(ctx context.Context, events ...domain.Event) error
}

func (s *OrderService) CreateOrder(ctx context.Context, req CreateOrderRequest) (*order.Order, error) {
    // Create order (emits events)
    o, err := order.NewOrder(req.UserID, req.Items)
    if err != nil {
        return nil, fmt.Errorf("failed to create order: %w", err)
    }

    // Save order
    if err := s.repo.Save(ctx, o); err != nil {
        return nil, fmt.Errorf("failed to save order: %w", err)
    }

    // Publish domain events
    if err := s.publisher.Publish(ctx, o.Events()...); err != nil {
        s.logger.Error("failed to publish events",
            zap.String("order_id", o.ID().String()),
            zap.Error(err),
        )
        // Don't fail the request, events can be retried
    }

    return o, nil
}

// ❌ Incorrect - no event publishing
func (s *OrderService) CreateOrder(ctx context.Context, req CreateOrderRequest) (*order.Order, error) {
    o, err := order.NewOrder(req.UserID, req.Items)
    if err != nil {
        return nil, err
    }

    if err := s.repo.Save(ctx, o); err != nil {
        return nil, err
    }

    return o, nil
    // Domain events ignored!
}
```

**How to Verify:**
```bash
# Find domain event definitions
grep -r "type.*Event" internal/domain/

# Check event interface implementation
grep -r "func.*Event.*interface" internal/domain/

# Verify entities collect events
grep -r "events.*\[\].*Event" internal/domain/

# Check event publishing in services
grep -r "Publish.*Event" internal/application/
```

**Expected Result:**
- Domain event interface defined
- Specific events for domain state changes
- Entities collect events during state transitions
- Services publish events after persistence
- Events enable loose coupling and event-driven architecture

---

### 5. Domain Service for Complex Logic

**Requirement:** Domain services should encapsulate business logic that doesn't naturally fit in a single entity, coordinating multiple entities.

**Verification Steps:**

✅ **Check domain service definition:**
```go
// ✅ Correct - domain service for complex business logic
// File: internal/domain/order/pricing_service.go
package order

import (
    "errors"
    "github.com/company/service/internal/domain"
)

// PricingService handles complex pricing calculations
type PricingService struct{}

func NewPricingService() *PricingService {
    return &PricingService{}
}

// CalculateOrderTotal calculates total with discounts and taxes
func (s *PricingService) CalculateOrderTotal(
    items []OrderItem,
    discounts []Discount,
    taxRate float64,
) (domain.Money, error) {
    if len(items) == 0 {
        return domain.Money{}, errors.New("cannot calculate total for empty order")
    }

    // Calculate subtotal
    subtotal := domain.NewMoney(0, "USD")
    for _, item := range items {
        itemTotal := item.Price().Multiply(item.Quantity())
        subtotal = subtotal.Add(itemTotal)
    }

    // Apply discounts
    discountAmount := s.calculateDiscounts(subtotal, discounts)
    afterDiscount := subtotal.Subtract(discountAmount)

    // Calculate tax
    taxAmount := s.calculateTax(afterDiscount, taxRate)

    // Final total
    total := afterDiscount.Add(taxAmount)

    return total, nil
}

func (s *PricingService) calculateDiscounts(
    subtotal domain.Money,
    discounts []Discount,
) domain.Money {
    total := domain.NewMoney(0, subtotal.Currency())

    for _, discount := range discounts {
        if !discount.IsApplicable(subtotal) {
            continue
        }

        amount := discount.Calculate(subtotal)
        total = total.Add(amount)
    }

    return total
}

func (s *PricingService) calculateTax(amount domain.Money, rate float64) domain.Money {
    taxCents := int64(float64(amount.Amount()) * rate)
    return domain.NewMoney(taxCents, amount.Currency())
}

// ❌ Incorrect - complex logic in entity (bloated entity)
func (o *Order) CalculateTotalWithDiscountsAndTaxes(
    discounts []Discount,
    taxRate float64,
    shippingCost Money,
    membershipLevel string,
) Money {
    // Too much logic in entity!
    // This should be in a domain service
}
```

✅ **Check domain service for validation:**
```go
// ✅ Correct - domain service for cross-entity validation
// File: internal/domain/user/uniqueness_service.go
package user

import (
    "context"
    "fmt"
    "github.com/company/service/internal/domain"
)

// UniquenessService checks email uniqueness
type UniquenessService struct {
    repo Repository
}

func NewUniquenessService(repo Repository) *UniquenessService {
    return &UniquenessService{repo: repo}
}

// IsEmailUnique checks if email is not already taken
func (s *UniquenessService) IsEmailUnique(ctx context.Context, email domain.Email) (bool, error) {
    users, err := s.repo.FindByEmail(ctx, email)
    if err != nil {
        return false, fmt.Errorf("failed to check email uniqueness: %w", err)
    }

    return len(users) == 0, nil
}

// CanUserChangeEmail validates email change
func (s *UniquenessService) CanUserChangeEmail(
    ctx context.Context,
    userID uuid.UUID,
    newEmail domain.Email,
) error {
    // Check if email is already taken by another user
    users, err := s.repo.FindByEmail(ctx, newEmail)
    if err != nil {
        return fmt.Errorf("failed to check email: %w", err)
    }

    for _, u := range users {
        if u.ID() != userID {
            return ErrEmailAlreadyTaken
        }
    }

    return nil
}
```

✅ **Check domain service used by application service:**
```go
// ✅ Correct - application service uses domain service
type UserService struct {
    repo              user.Repository
    uniquenessService *user.UniquenessService  // Domain service
    logger            *zap.Logger
}

func NewUserService(
    repo user.Repository,
    uniquenessService *user.UniquenessService,
    logger *zap.Logger,
) *UserService {
    return &UserService{
        repo:              repo,
        uniquenessService: uniquenessService,
        logger:            logger,
    }
}

func (s *UserService) CreateUser(ctx context.Context, email domain.Email, name string) (*user.User, error) {
    // Use domain service for validation
    unique, err := s.uniquenessService.IsEmailUnique(ctx, email)
    if err != nil {
        return nil, fmt.Errorf("failed to check email uniqueness: %w", err)
    }
    if !unique {
        return nil, fmt.Errorf("email already exists: %w", user.ErrEmailAlreadyTaken)
    }

    // Create user
    u, err := user.NewUser(email, name)
    if err != nil {
        return nil, fmt.Errorf("failed to create user: %w", err)
    }

    // Save user
    if err := s.repo.Save(ctx, u); err != nil {
        return nil, fmt.Errorf("failed to save user: %w", err)
    }

    return u, nil
}

// ❌ Incorrect - business logic in application service
func (s *UserService) CreateUser(ctx context.Context, email domain.Email, name string) (*user.User, error) {
    // Application service should not contain business rules!
    users, err := s.repo.FindByEmail(ctx, email)
    if err != nil {
        return nil, err
    }
    if len(users) > 0 {
        return nil, errors.New("email exists")
    }

    u := user.NewUser(email, name)
    return s.repo.Save(ctx, u)
}
```

**How to Verify:**
```bash
# Find domain services
find internal/domain -name "*_service.go"

# Verify domain services don't depend on infrastructure
grep -r "internal/infrastructure" internal/domain/

# Check domain services used in application layer
grep -r "domain.*Service" internal/application/
```

**Expected Result:**
- Domain services for complex cross-entity logic
- Domain services in domain layer, not application layer
- Domain services don't depend on infrastructure
- Application services orchestrate domain services

---

## Testing Verification

### Unit Tests for Domain Entities

```go
func TestOrder_Confirm(t *testing.T) {
    tests := map[string]struct {
        givenStatus OrderStatus
        thenError   bool
    }{
        "GIVEN pending order THEN confirms successfully": {
            givenStatus: StatusPending,
            thenError:   false,
        },
        "GIVEN confirmed order THEN returns error": {
            givenStatus: StatusConfirmed,
            thenError:   true,
        },
        "GIVEN shipped order THEN returns error": {
            givenStatus: StatusShipped,
            thenError:   true,
        },
    }

    for name, tc := range tests {
        t.Run(name, func(t *testing.T) {
            order := createTestOrder()
            order.status = tc.givenStatus

            err := order.Confirm()

            if tc.thenError {
                assert.Error(t, err)
                assert.Equal(t, tc.givenStatus, order.Status())
            } else {
                assert.NoError(t, err)
                assert.Equal(t, StatusConfirmed, order.Status())
            }
        })
    }
}

func TestOrder_AddItem(t *testing.T) {
    order := createTestOrder()
    initialTotal := order.Total()

    item := createTestItem(NewMoney(1000, "USD"), 2)
    err := order.AddItem(item)

    assert.NoError(t, err)
    assert.Len(t, order.Items(), 2)
    assert.Equal(t, initialTotal.Add(item.Price().Multiply(2)), order.Total())
}

func TestOrder_StateTransitions(t *testing.T) {
    order := createTestOrder()

    // Pending -> Confirmed
    err := order.Confirm()
    assert.NoError(t, err)
    assert.Equal(t, StatusConfirmed, order.Status())

    // Confirmed -> Shipped
    err = order.Ship("TRACK123", "UPS")
    assert.NoError(t, err)
    assert.Equal(t, StatusShipped, order.Status())

    // Cannot cancel shipped order
    err = order.Cancel()
    assert.Error(t, err)
}
```

### Unit Tests for Value Objects

```go
func TestMoney_Add(t *testing.T) {
    m1 := NewMoney(1000, "USD")
    m2 := NewMoney(500, "USD")

    result := m1.Add(m2)

    assert.Equal(t, int64(1500), result.Amount())
    assert.Equal(t, "USD", result.Currency())

    // Original values unchanged (immutability)
    assert.Equal(t, int64(1000), m1.Amount())
    assert.Equal(t, int64(500), m2.Amount())
}

func TestMoney_AddDifferentCurrencies_Panics(t *testing.T) {
    m1 := NewMoney(1000, "USD")
    m2 := NewMoney(500, "EUR")

    assert.Panics(t, func() {
        m1.Add(m2)
    })
}

func TestEmail_Validation(t *testing.T) {
    tests := map[string]struct {
        givenEmail string
        thenError  bool
    }{
        "GIVEN valid email THEN creates successfully": {
            givenEmail: "user@example.com",
            thenError:  false,
        },
        "GIVEN empty email THEN returns error": {
            givenEmail: "",
            thenError:  true,
        },
        "GIVEN invalid format THEN returns error": {
            givenEmail: "notanemail",
            thenError:  true,
        },
        "GIVEN email with spaces THEN trims and succeeds": {
            givenEmail: "  user@example.com  ",
            thenError:  false,
        },
    }

    for name, tc := range tests {
        t.Run(name, func(t *testing.T) {
            email, err := NewEmail(tc.givenEmail)

            if tc.thenError {
                assert.Error(t, err)
            } else {
                assert.NoError(t, err)
                assert.Equal(t, strings.TrimSpace(strings.ToLower(tc.givenEmail)), email.String())
            }
        })
    }
}
```

### Tests for Domain Events

```go
func TestOrder_EmitsEvents(t *testing.T) {
    userID := uuid.New()
    items := []OrderItem{createTestItem(NewMoney(1000, "USD"), 1)}

    order, err := NewOrder(userID, items)

    require.NoError(t, err)
    events := order.Events()

    assert.Len(t, events, 1)
    assert.Equal(t, "order.created", events[0].EventType())

    // Events cleared after retrieval
    assert.Len(t, order.Events(), 0)
}

func TestOrder_ConfirmEmitsEvent(t *testing.T) {
    order := createTestOrder()

    err := order.Confirm()

    require.NoError(t, err)
    events := order.Events()

    assert.Len(t, events, 1)
    assert.Equal(t, "order.confirmed", events[0].EventType())
    assert.Equal(t, order.ID(), events[0].AggregateID())
}
```

---

## Common Issues and Fixes

### Issue 1: Anemic Domain Model

**Problem:**
```go
type Order struct {
    ID     uuid.UUID
    Status string
    Items  []OrderItem
}
// No methods, all logic in service
```

**Fix:**
```go
type Order struct {
    id     uuid.UUID
    status OrderStatus
    items  []OrderItem
}

func (o *Order) Confirm() error {
    if o.status != StatusPending {
        return ErrInvalidOrderState
    }
    o.status = StatusConfirmed
    return nil
}
```

### Issue 2: Mutable Value Objects

**Problem:**
```go
type Money struct {
    Amount int64
}

func (m *Money) Add(other Money) {
    m.Amount += other.Amount  // Mutates!
}
```

**Fix:**
```go
type Money struct {
    amount int64
}

func (m Money) Add(other Money) Money {
    return Money{amount: m.amount + other.amount}
}
```

### Issue 3: Repository in Wrong Layer

**Problem:**
```go
// Repository interface in infrastructure
package mongodb
type OrderRepository interface { ... }
```

**Fix:**
```go
// Repository interface in domain
package order
type Repository interface { ... }
```

### Issue 4: Domain Coupled to Database

**Problem:**
```go
type Order struct {
    ID uuid.UUID `bson:"_id"`  // MongoDB coupling!
}
```

**Fix:**
```go
// Domain entity
type Order struct {
    id uuid.UUID
}

// Separate document in infrastructure
type orderDocument struct {
    ID string `bson:"_id"`
}
```

---

## Verification Summary

**Before marking implementation as complete, verify:**

- [ ] Domain entities have business logic methods
- [ ] Entity fields are private with getters
- [ ] Constructors validate invariants
- [ ] Value objects are immutable
- [ ] Value objects have validation in constructors
- [ ] Repository interfaces in domain layer
- [ ] Repository implementations in infrastructure
- [ ] Domain doesn't import infrastructure
- [ ] Domain events defined and emitted
- [ ] Services publish domain events
- [ ] Domain services for complex logic
- [ ] Domain tests cover business rules
- [ ] Value object tests verify immutability
- [ ] Event tests verify emission

**Related Verifiers:**
- **error-handling.md** - Domain error definitions
- **testing.md** - Domain logic test coverage
- **grpc-api.md** - API to domain mapping
- **logging-observability.md** - Domain event logging
