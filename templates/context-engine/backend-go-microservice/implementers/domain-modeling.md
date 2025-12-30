---
domain: domain-modeling
description: Domain modeling patterns using rich entities, value objects, aggregates, and domain events
---

# Domain Modeling Implementer

This implementer defines patterns for domain-driven design in Go, including rich domain entities, value objects, aggregates, and domain events.

## Core Patterns

### Rich Domain Entities

Create entities with behavior encapsulated within them:

```go
type Order struct {
    id          string
    customerID  string
    items       []OrderItem
    status      OrderStatus
    totalAmount Money
    createdAt   time.Time
    updatedAt   time.Time
    version     int
}

type OrderStatus string

const (
    OrderStatusPending   OrderStatus = "pending"
    OrderStatusConfirmed OrderStatus = "confirmed"
    OrderStatusShipped   OrderStatus = "shipped"
    OrderStatusDelivered OrderStatus = "delivered"
    OrderStatusCancelled OrderStatus = "cancelled"
)

// Constructor enforces invariants
func NewOrder(customerID string, items []OrderItem) (*Order, error) {
    if customerID == "" {
        return nil, ErrInvalidCustomerID
    }
    if len(items) == 0 {
        return nil, ErrEmptyOrder
    }

    order := &Order{
        id:         uuid.New().String(),
        customerID: customerID,
        items:      items,
        status:     OrderStatusPending,
        createdAt:  time.Now(),
        updatedAt:  time.Now(),
        version:    1,
    }

    if err := order.calculateTotal(); err != nil {
        return nil, err
    }

    return order, nil
}

// Business logic encapsulated in entity
func (o *Order) Confirm() error {
    if o.status != OrderStatusPending {
        return fmt.Errorf("cannot confirm order in status %s", o.status)
    }

    o.status = OrderStatusConfirmed
    o.updatedAt = time.Now()
    o.version++

    return nil
}

func (o *Order) Ship(trackingNumber string) error {
    if o.status != OrderStatusConfirmed {
        return fmt.Errorf("cannot ship order in status %s", o.status)
    }

    o.status = OrderStatusShipped
    o.updatedAt = time.Now()
    o.version++

    return nil
}

func (o *Order) Cancel(reason string) error {
    if o.status == OrderStatusDelivered {
        return ErrCannotCancelDeliveredOrder
    }
    if o.status == OrderStatusCancelled {
        return ErrOrderAlreadyCancelled
    }

    o.status = OrderStatusCancelled
    o.updatedAt = time.Now()
    o.version++

    return nil
}

// Getters for immutability
func (o *Order) ID() string          { return o.id }
func (o *Order) CustomerID() string  { return o.customerID }
func (o *Order) Status() OrderStatus { return o.status }
func (o *Order) TotalAmount() Money  { return o.totalAmount }
func (o *Order) Items() []OrderItem  { return append([]OrderItem{}, o.items...) }

// Private helper
func (o *Order) calculateTotal() error {
    total := Money{Currency: "USD", Amount: 0}
    for _, item := range o.items {
        total.Amount += item.Price.Amount * int64(item.Quantity)
    }
    o.totalAmount = total
    return nil
}
```

### Value Objects

Create immutable value objects with value-based equality:

```go
type Money struct {
    Amount   int64  // in cents
    Currency string
}

func NewMoney(amount int64, currency string) (Money, error) {
    if amount < 0 {
        return Money{}, ErrNegativeAmount
    }
    if !isValidCurrency(currency) {
        return Money{}, ErrInvalidCurrency
    }
    return Money{Amount: amount, Currency: currency}, nil
}

func (m Money) Add(other Money) (Money, error) {
    if m.Currency != other.Currency {
        return Money{}, ErrCurrencyMismatch
    }
    return Money{
        Amount:   m.Amount + other.Amount,
        Currency: m.Currency,
    }, nil
}

func (m Money) Multiply(factor int) Money {
    return Money{
        Amount:   m.Amount * int64(factor),
        Currency: m.Currency,
    }
}

func (m Money) Equals(other Money) bool {
    return m.Amount == other.Amount && m.Currency == other.Currency
}

func (m Money) String() string {
    return fmt.Sprintf("%s %.2f", m.Currency, float64(m.Amount)/100)
}

// Email value object
type Email struct {
    value string
}

func NewEmail(email string) (Email, error) {
    trimmed := strings.TrimSpace(strings.ToLower(email))
    if !isValidEmailFormat(trimmed) {
        return Email{}, ErrInvalidEmailFormat
    }
    return Email{value: trimmed}, nil
}

func (e Email) String() string {
    return e.value
}

func (e Email) Domain() string {
    parts := strings.Split(e.value, "@")
    if len(parts) != 2 {
        return ""
    }
    return parts[1]
}

// Address value object
type Address struct {
    Street     string
    City       string
    State      string
    PostalCode string
    Country    string
}

func NewAddress(street, city, state, postalCode, country string) (Address, error) {
    addr := Address{
        Street:     strings.TrimSpace(street),
        City:       strings.TrimSpace(city),
        State:      strings.TrimSpace(state),
        PostalCode: strings.TrimSpace(postalCode),
        Country:    strings.TrimSpace(country),
    }

    if err := addr.validate(); err != nil {
        return Address{}, err
    }

    return addr, nil
}

func (a Address) validate() error {
    if a.Street == "" {
        return ErrMissingStreet
    }
    if a.City == "" {
        return ErrMissingCity
    }
    if !isValidCountry(a.Country) {
        return ErrInvalidCountry
    }
    return nil
}

func (a Address) FullAddress() string {
    return fmt.Sprintf("%s, %s, %s %s, %s",
        a.Street, a.City, a.State, a.PostalCode, a.Country)
}
```

### Aggregates and Aggregate Roots

Design aggregates with clear boundaries:

```go
// Aggregate root
type Cart struct {
    id         string
    customerID string
    items      map[string]*CartItem // productID -> item
    createdAt  time.Time
    updatedAt  time.Time
    status     CartStatus
}

// Entity within aggregate
type CartItem struct {
    productID   string
    productName string
    quantity    int
    unitPrice   Money
    addedAt     time.Time
}

func NewCart(customerID string) *Cart {
    return &Cart{
        id:         uuid.New().String(),
        customerID: customerID,
        items:      make(map[string]*CartItem),
        status:     CartStatusActive,
        createdAt:  time.Now(),
        updatedAt:  time.Now(),
    }
}

// Aggregate maintains consistency
func (c *Cart) AddItem(productID, productName string, quantity int, unitPrice Money) error {
    if c.status != CartStatusActive {
        return ErrCartNotActive
    }

    if quantity <= 0 {
        return ErrInvalidQuantity
    }

    if existing, exists := c.items[productID]; exists {
        existing.quantity += quantity
        existing.addedAt = time.Now()
    } else {
        c.items[productID] = &CartItem{
            productID:   productID,
            productName: productName,
            quantity:    quantity,
            unitPrice:   unitPrice,
            addedAt:     time.Now(),
        }
    }

    c.updatedAt = time.Now()
    return nil
}

func (c *Cart) RemoveItem(productID string) error {
    if c.status != CartStatusActive {
        return ErrCartNotActive
    }

    if _, exists := c.items[productID]; !exists {
        return ErrItemNotInCart
    }

    delete(c.items, productID)
    c.updatedAt = time.Now()
    return nil
}

func (c *Cart) UpdateQuantity(productID string, quantity int) error {
    if c.status != CartStatusActive {
        return ErrCartNotActive
    }

    item, exists := c.items[productID]
    if !exists {
        return ErrItemNotInCart
    }

    if quantity <= 0 {
        return c.RemoveItem(productID)
    }

    item.quantity = quantity
    c.updatedAt = time.Now()
    return nil
}

func (c *Cart) CalculateTotal() (Money, error) {
    total := Money{Currency: "USD", Amount: 0}

    for _, item := range c.items {
        itemTotal := item.unitPrice.Multiply(item.quantity)
        var err error
        total, err = total.Add(itemTotal)
        if err != nil {
            return Money{}, err
        }
    }

    return total, nil
}

func (c *Cart) Checkout() error {
    if c.status != CartStatusActive {
        return ErrCartNotActive
    }

    if len(c.items) == 0 {
        return ErrEmptyCart
    }

    c.status = CartStatusCheckedOut
    c.updatedAt = time.Now()
    return nil
}

// Expose items as read-only
func (c *Cart) Items() []CartItem {
    items := make([]CartItem, 0, len(c.items))
    for _, item := range c.items {
        items = append(items, *item)
    }
    return items
}
```

### Domain Events

Model domain events for event sourcing and async communication:

```go
type DomainEvent interface {
    EventID() string
    EventType() string
    OccurredAt() time.Time
    AggregateID() string
    AggregateType() string
}

// Base event
type BaseEvent struct {
    ID            string    `json:"id"`
    Type          string    `json:"type"`
    Timestamp     time.Time `json:"timestamp"`
    AggregateID   string    `json:"aggregate_id"`
    AggregateType string    `json:"aggregate_type"`
}

func (e BaseEvent) EventID() string        { return e.ID }
func (e BaseEvent) EventType() string      { return e.Type }
func (e BaseEvent) OccurredAt() time.Time  { return e.Timestamp }
func (e BaseEvent) AggregateID() string    { return e.AggregateID }
func (e BaseEvent) AggregateType() string  { return e.AggregateType }

// Specific events
type OrderPlacedEvent struct {
    BaseEvent
    CustomerID  string      `json:"customer_id"`
    Items       []OrderItem `json:"items"`
    TotalAmount Money       `json:"total_amount"`
}

func NewOrderPlacedEvent(order *Order) OrderPlacedEvent {
    return OrderPlacedEvent{
        BaseEvent: BaseEvent{
            ID:            uuid.New().String(),
            Type:          "order.placed",
            Timestamp:     time.Now(),
            AggregateID:   order.ID(),
            AggregateType: "order",
        },
        CustomerID:  order.CustomerID(),
        Items:       order.Items(),
        TotalAmount: order.TotalAmount(),
    }
}

type OrderShippedEvent struct {
    BaseEvent
    TrackingNumber string    `json:"tracking_number"`
    ShippedAt      time.Time `json:"shipped_at"`
    Carrier        string    `json:"carrier"`
}

type PaymentProcessedEvent struct {
    BaseEvent
    OrderID       string `json:"order_id"`
    Amount        Money  `json:"amount"`
    PaymentMethod string `json:"payment_method"`
    TransactionID string `json:"transaction_id"`
}

// Event store interface
type EventStore interface {
    Save(ctx context.Context, events ...DomainEvent) error
    Load(ctx context.Context, aggregateID string) ([]DomainEvent, error)
}

// Aggregate with event sourcing
type EventSourcedOrder struct {
    id      string
    version int
    events  []DomainEvent
}

func (o *EventSourcedOrder) Apply(event DomainEvent) {
    o.events = append(o.events, event)
    o.version++

    switch e := event.(type) {
    case OrderPlacedEvent:
        o.id = e.AggregateID
    case OrderShippedEvent:
        // Update internal state
    }
}

func (o *EventSourcedOrder) UncommittedEvents() []DomainEvent {
    return o.events
}

func (o *EventSourcedOrder) ClearEvents() {
    o.events = nil
}
```

### Result Objects

Use result objects for operation outcomes:

```go
type Result[T any] struct {
    value T
    err   error
}

func Ok[T any](value T) Result[T] {
    return Result[T]{value: value}
}

func Err[T any](err error) Result[T] {
    return Result[T]{err: err}
}

func (r Result[T]) IsOk() bool {
    return r.err == nil
}

func (r Result[T]) IsErr() bool {
    return r.err != nil
}

func (r Result[T]) Unwrap() (T, error) {
    return r.value, r.err
}

func (r Result[T]) UnwrapOr(defaultValue T) T {
    if r.IsErr() {
        return defaultValue
    }
    return r.value
}

func (r Result[T]) Map(fn func(T) T) Result[T] {
    if r.IsErr() {
        return r
    }
    return Ok(fn(r.value))
}

func (r Result[T]) MapErr(fn func(error) error) Result[T] {
    if r.IsErr() {
        return Err[T](fn(r.err))
    }
    return r
}

// Usage in domain methods
func (s *OrderService) PlaceOrder(ctx context.Context, input PlaceOrderInput) Result[*Order] {
    order, err := NewOrder(input.CustomerID, input.Items)
    if err != nil {
        return Err[*Order](err)
    }

    if err := s.repo.Save(ctx, order); err != nil {
        return Err[*Order](err)
    }

    s.events.Publish(NewOrderPlacedEvent(order))

    return Ok(order)
}
```

### Specification Pattern

Use specifications for complex business rules:

```go
type Specification[T any] interface {
    IsSatisfiedBy(T) bool
    And(Specification[T]) Specification[T]
    Or(Specification[T]) Specification[T]
    Not() Specification[T]
}

type baseSpec[T any] struct {
    predicate func(T) bool
}

func (s baseSpec[T]) IsSatisfiedBy(t T) bool {
    return s.predicate(t)
}

func (s baseSpec[T]) And(other Specification[T]) Specification[T] {
    return baseSpec[T]{
        predicate: func(t T) bool {
            return s.IsSatisfiedBy(t) && other.IsSatisfiedBy(t)
        },
    }
}

func (s baseSpec[T]) Or(other Specification[T]) Specification[T] {
    return baseSpec[T]{
        predicate: func(t T) bool {
            return s.IsSatisfiedBy(t) || other.IsSatisfiedBy(t)
        },
    }
}

func (s baseSpec[T]) Not() Specification[T] {
    return baseSpec[T]{
        predicate: func(t T) bool {
            return !s.IsSatisfiedBy(t)
        },
    }
}

// Specific specifications
func ActiveCustomerSpec() Specification[*Customer] {
    return baseSpec[*Customer]{
        predicate: func(c *Customer) bool {
            return c.Status == CustomerStatusActive
        },
    }
}

func PremiumCustomerSpec() Specification[*Customer] {
    return baseSpec[*Customer]{
        predicate: func(c *Customer) bool {
            return c.Tier == CustomerTierPremium
        },
    }
}

func CustomerSpentMoreThanSpec(amount Money) Specification[*Customer] {
    return baseSpec[*Customer]{
        predicate: func(c *Customer) bool {
            return c.TotalSpent.Amount >= amount.Amount
        },
    }
}

// Usage
func (s *DiscountService) IsEligibleForDiscount(customer *Customer) bool {
    eligibilitySpec := ActiveCustomerSpec().And(
        PremiumCustomerSpec().Or(
            CustomerSpentMoreThanSpec(Money{Amount: 100000, Currency: "USD"}),
        ),
    )

    return eligibilitySpec.IsSatisfiedBy(customer)
}
```

## Implementation Guidelines

### Entity Design

1. **Encapsulate state**: Keep entity fields private, expose through methods
2. **Enforce invariants**: Validate in constructors and state-changing methods
3. **Immutable where possible**: Return copies, not references to internal state
4. **Clear lifecycle**: Define valid state transitions explicitly

### Value Object Design

1. **Immutable always**: Value objects should never change after creation
2. **Value equality**: Two value objects with same values should be equal
3. **Self-validating**: Validate in constructor, impossible to create invalid value objects
4. **No identity**: Value objects identified by their values, not an ID

### Aggregate Design

1. **Small boundaries**: Keep aggregates as small as possible
2. **Consistency boundary**: Changes within aggregate are always consistent
3. **Reference by ID**: Aggregates reference other aggregates by ID, not by object reference
4. **Single responsibility**: Each aggregate has one reason to change

### Domain Events

1. **Past tense naming**: Events describe what happened (OrderPlaced, not PlaceOrder)
2. **Immutable**: Events should never change after creation
3. **Complete information**: Include all data needed to understand what happened
4. **Time-stamped**: Always include when the event occurred

## Anti-Patterns to Avoid

### Don't Create Anemic Domain Models

```go
// Bad: Anemic model with no behavior
type Order struct {
    ID         string
    CustomerID string
    Status     string
    Items      []OrderItem
}

func ConfirmOrder(order *Order) {
    order.Status = "confirmed"
}

// Good: Rich domain model
type Order struct {
    id     string
    status OrderStatus
}

func (o *Order) Confirm() error {
    if o.status != OrderStatusPending {
        return ErrInvalidStatusTransition
    }
    o.status = OrderStatusConfirmed
    return nil
}
```

### Don't Expose Mutable State

```go
// Bad: Exposing mutable slice
func (o *Order) Items() []OrderItem {
    return o.items
}

// Good: Return copy
func (o *Order) Items() []OrderItem {
    return append([]OrderItem{}, o.items...)
}

// Or better: Don't expose at all
func (o *Order) ItemCount() int {
    return len(o.items)
}
```

### Don't Skip Validation

```go
// Bad: No validation
func NewEmail(value string) Email {
    return Email{value: value}
}

// Good: Always validate
func NewEmail(value string) (Email, error) {
    trimmed := strings.TrimSpace(strings.ToLower(value))
    if !isValidEmailFormat(trimmed) {
        return Email{}, ErrInvalidEmailFormat
    }
    return Email{value: trimmed}, nil
}
```

### Don't Make Value Objects Mutable

```go
// Bad: Mutable value object
type Money struct {
    Amount int64
}

func (m *Money) Add(amount int64) {
    m.Amount += amount // Mutating!
}

// Good: Immutable with new instance
type Money struct {
    amount int64
}

func (m Money) Add(other Money) Money {
    return Money{amount: m.amount + other.amount}
}
```

## Related Implementers

- **error-handling.md**: Domain errors and result types
- **testing.md**: Testing domain models and specifications
- **data-persistence.md**: Persisting domain entities and value objects
- **messaging.md**: Publishing domain events
