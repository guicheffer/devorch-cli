---
domain: testing
description: Testing patterns using table-driven tests, testify/suite, gomock, and BDD style
---

# Testing Implementer

This implementer defines testing patterns for Go microservices including table-driven tests, test suites, mocking strategies, and BDD-style specifications.

## Core Patterns

### Table-Driven Tests

Use table-driven tests for comprehensive test coverage with multiple scenarios:

```go
func TestUserService_CreateUser(t *testing.T) {
    tests := []struct {
        name          string
        input         CreateUserInput
        setupMocks    func(*mock.Repository)
        expectedError error
        validate      func(*testing.T, *User)
    }{
        {
            name: "successful creation",
            input: CreateUserInput{
                Email:    "user@example.com",
                Username: "testuser",
            },
            setupMocks: func(m *mock.Repository) {
                m.On("FindByEmail", "user@example.com").Return(nil, nil)
                m.On("Create", mock.Anything).Return(nil)
            },
            expectedError: nil,
            validate: func(t *testing.T, u *User) {
                assert.NotEmpty(t, u.ID)
                assert.Equal(t, "user@example.com", u.Email)
            },
        },
        {
            name: "duplicate email",
            input: CreateUserInput{
                Email:    "existing@example.com",
                Username: "testuser",
            },
            setupMocks: func(m *mock.Repository) {
                m.On("FindByEmail", "existing@example.com").
                    Return(&User{ID: "existing"}, nil)
            },
            expectedError: ErrDuplicateEmail,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            mockRepo := new(mock.Repository)
            if tt.setupMocks != nil {
                tt.setupMocks(mockRepo)
            }

            svc := NewUserService(mockRepo)
            user, err := svc.CreateUser(context.Background(), tt.input)

            if tt.expectedError != nil {
                assert.ErrorIs(t, err, tt.expectedError)
            } else {
                assert.NoError(t, err)
                if tt.validate != nil {
                    tt.validate(t, user)
                }
            }

            mockRepo.AssertExpectations(t)
        })
    }
}
```

### Testify Suite Pattern

Use testify suite for complex test setups with shared state:

```go
type OrderServiceSuite struct {
    suite.Suite
    ctx         context.Context
    service     *OrderService
    mockRepo    *mock.OrderRepository
    mockEvents  *mock.EventPublisher
    mockMetrics *mock.MetricsCollector
}

func (s *OrderServiceSuite) SetupTest() {
    s.ctx = context.Background()
    s.mockRepo = new(mock.OrderRepository)
    s.mockEvents = new(mock.EventPublisher)
    s.mockMetrics = new(mock.MetricsCollector)

    s.service = NewOrderService(
        s.mockRepo,
        s.mockEvents,
        s.mockMetrics,
    )
}

func (s *OrderServiceSuite) TearDownTest() {
    s.mockRepo.AssertExpectations(s.T())
    s.mockEvents.AssertExpectations(s.T())
    s.mockMetrics.AssertExpectations(s.T())
}

func (s *OrderServiceSuite) TestPlaceOrder_Success() {
    orderID := uuid.New().String()

    s.mockRepo.On("Create", mock.MatchedBy(func(o *Order) bool {
        return o.Status == OrderStatusPending
    })).Return(orderID, nil)

    s.mockEvents.On("Publish", "order.created", mock.Anything).Return(nil)
    s.mockMetrics.On("IncrementCounter", "orders.created", mock.Anything).Return()

    result, err := s.service.PlaceOrder(s.ctx, PlaceOrderInput{
        CustomerID: "customer-123",
        Items:      []OrderItem{{ProductID: "prod-1", Quantity: 2}},
    })

    s.NoError(err)
    s.Equal(orderID, result.OrderID)
}

func TestOrderServiceSuite(t *testing.T) {
    suite.Run(t, new(OrderServiceSuite))
}
```

### GoMock for Interfaces

Use gomock for interface-based mocking with strict expectations:

```go
func TestPaymentProcessor_ProcessPayment(t *testing.T) {
    ctrl := gomock.NewController(t)
    defer ctrl.Finish()

    mockGateway := mock.NewMockPaymentGateway(ctrl)
    mockLedger := mock.NewMockLedger(ctrl)

    processor := NewPaymentProcessor(mockGateway, mockLedger)

    // Setup expectations with specific call order
    gomock.InOrder(
        mockGateway.EXPECT().
            Authorize(gomock.Any(), "card-token", gomock.Any()).
            Return(&AuthorizationResult{
                TransactionID: "txn-123",
                Authorized:    true,
            }, nil),

        mockLedger.EXPECT().
            RecordTransaction(gomock.Any(), gomock.Any()).
            Return(nil),

        mockGateway.EXPECT().
            Capture(gomock.Any(), "txn-123").
            Return(nil),
    )

    err := processor.ProcessPayment(context.Background(), PaymentRequest{
        Amount:    10000, // cents
        Currency:  "USD",
        CardToken: "card-token",
    })

    assert.NoError(t, err)
}
```

### BDD-Style Tests with Ginkgo/Gomega

Use BDD-style tests for behavior specifications:

```go
var _ = Describe("Inventory Service", func() {
    var (
        ctx     context.Context
        service *InventoryService
        mockDB  *mock.Database
    )

    BeforeEach(func() {
        ctx = context.Background()
        mockDB = new(mock.Database)
        service = NewInventoryService(mockDB)
    })

    Describe("ReserveStock", func() {
        Context("when stock is available", func() {
            BeforeEach(func() {
                mockDB.On("GetStock", "product-123").
                    Return(&Stock{
                        ProductID: "product-123",
                        Available: 100,
                    }, nil)
                mockDB.On("UpdateStock", mock.Anything).Return(nil)
            })

            It("should reserve the requested quantity", func() {
                result, err := service.ReserveStock(ctx, "product-123", 10)

                Expect(err).NotTo(HaveOccurred())
                Expect(result.Reserved).To(BeTrue())
                Expect(result.RemainingStock).To(Equal(90))
            })
        })

        Context("when stock is insufficient", func() {
            BeforeEach(func() {
                mockDB.On("GetStock", "product-123").
                    Return(&Stock{
                        ProductID: "product-123",
                        Available: 5,
                    }, nil)
            })

            It("should return insufficient stock error", func() {
                _, err := service.ReserveStock(ctx, "product-123", 10)

                Expect(err).To(MatchError(ErrInsufficientStock))
            })
        })
    })
})
```

### Integration Tests with testcontainers

Use testcontainers for integration tests with real dependencies:

```go
func TestUserRepository_Integration(t *testing.T) {
    if testing.Short() {
        t.Skip("skipping integration test")
    }

    ctx := context.Background()

    // Start MongoDB container
    mongoContainer, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
        ContainerRequest: testcontainers.ContainerRequest{
            Image:        "mongo:6.0",
            ExposedPorts: []string{"27017/tcp"},
            WaitingFor:   wait.ForListeningPort("27017/tcp"),
        },
        Started: true,
    })
    require.NoError(t, err)
    defer mongoContainer.Terminate(ctx)

    // Get connection string
    host, err := mongoContainer.Host(ctx)
    require.NoError(t, err)
    port, err := mongoContainer.MappedPort(ctx, "27017")
    require.NoError(t, err)

    connectionString := fmt.Sprintf("mongodb://%s:%s", host, port.Port())

    // Run tests with real MongoDB
    client, err := mongo.Connect(ctx, options.Client().ApplyURI(connectionString))
    require.NoError(t, err)
    defer client.Disconnect(ctx)

    repo := NewUserRepository(client.Database("testdb"))

    t.Run("create and find user", func(t *testing.T) {
        user := &User{
            ID:    uuid.New().String(),
            Email: "test@example.com",
        }

        err := repo.Create(ctx, user)
        assert.NoError(t, err)

        found, err := repo.FindByID(ctx, user.ID)
        assert.NoError(t, err)
        assert.Equal(t, user.Email, found.Email)
    })
}
```

### Test Fixtures and Builders

Use builder pattern for test data creation:

```go
type UserBuilder struct {
    user *User
}

func NewUserBuilder() *UserBuilder {
    return &UserBuilder{
        user: &User{
            ID:        uuid.New().String(),
            Email:     "test@example.com",
            Username:  "testuser",
            Status:    UserStatusActive,
            CreatedAt: time.Now(),
        },
    }
}

func (b *UserBuilder) WithEmail(email string) *UserBuilder {
    b.user.Email = email
    return b
}

func (b *UserBuilder) WithStatus(status UserStatus) *UserBuilder {
    b.user.Status = status
    return b
}

func (b *UserBuilder) Inactive() *UserBuilder {
    b.user.Status = UserStatusInactive
    return b
}

func (b *UserBuilder) Build() *User {
    return b.user
}

// Usage in tests
func TestUserService_UpdateProfile_InactiveUser(t *testing.T) {
    user := NewUserBuilder().
        WithEmail("inactive@example.com").
        Inactive().
        Build()

    mockRepo := new(mock.Repository)
    mockRepo.On("FindByID", user.ID).Return(user, nil)

    svc := NewUserService(mockRepo)
    err := svc.UpdateProfile(context.Background(), user.ID, ProfileUpdate{
        DisplayName: "New Name",
    })

    assert.ErrorIs(t, err, ErrUserInactive)
}
```

## Implementation Guidelines

### Test Organization

1. **File Naming**: Use `_test.go` suffix, place tests alongside source code
2. **Package Naming**: Use `package_test` for black-box tests, same package for white-box
3. **Test Function Naming**: Use `TestFunction_Scenario` pattern
4. **Subtests**: Use `t.Run()` for organizing related test cases

### Mock Strategy

1. **Use testify/mock** for simple interfaces with dynamic expectations
2. **Use gomock** for complex interfaces requiring strict ordering
3. **Use testcontainers** for integration tests with external dependencies
4. **Avoid mocking** standard library interfaces (io.Reader, etc.)

### Test Data Management

1. **Use builders** for complex test data creation
2. **Use fixtures** for read-only reference data
3. **Use factories** when randomization is needed
4. **Avoid shared mutable state** between tests

### Assertions

1. **Prefer testify/assert** for most assertions
2. **Use testify/require** when test cannot continue after failure
3. **Use custom matchers** for complex validations
4. **Check both positive and negative cases**

### Test Coverage

1. **Aim for 80%+ coverage** on business logic
2. **Focus on behavior**, not implementation details
3. **Test error paths** and edge cases
4. **Use coverage tools** to identify gaps

## Anti-Patterns to Avoid

### Don't Use Global State

```go
// Bad: Global mock
var globalMockRepo *mock.Repository

func TestSomething(t *testing.T) {
    globalMockRepo.On("Find", "id").Return(...)
}

// Good: Local mock
func TestSomething(t *testing.T) {
    mockRepo := new(mock.Repository)
    mockRepo.On("Find", "id").Return(...)
}
```

### Don't Ignore Test Cleanup

```go
// Bad: No cleanup
func TestWithDatabase(t *testing.T) {
    db := setupDatabase()
    // test code
}

// Good: Always cleanup
func TestWithDatabase(t *testing.T) {
    db := setupDatabase()
    defer db.Close()

    t.Cleanup(func() {
        cleanupTestData(db)
    })

    // test code
}
```

### Don't Mix Unit and Integration Tests

```go
// Bad: Integration test in unit test suite
func TestUserService_Create(t *testing.T) {
    db := connectToRealDatabase() // Don't do this
    service := NewUserService(db)
    // ...
}

// Good: Separate integration tests
func TestUserService_Create_Unit(t *testing.T) {
    mockDB := new(mock.Database)
    service := NewUserService(mockDB)
    // ...
}

func TestUserService_Create_Integration(t *testing.T) {
    if testing.Short() {
        t.Skip("skipping integration test")
    }
    // Use testcontainers or dedicated test database
}
```

### Don't Test Implementation Details

```go
// Bad: Testing internal state
func TestUserService_Create(t *testing.T) {
    service := NewUserService(mockRepo)
    service.Create(ctx, user)

    assert.Equal(t, 1, service.createdCount) // Don't test internal state
}

// Good: Test observable behavior
func TestUserService_Create(t *testing.T) {
    mockRepo := new(mock.Repository)
    mockRepo.On("Create", mock.Anything).Return(nil)

    service := NewUserService(mockRepo)
    err := service.Create(ctx, user)

    assert.NoError(t, err)
    mockRepo.AssertExpectations(t)
}
```

## Related Implementers

- **error-handling.md**: Error types and result objects used in tests
- **domain-modeling.md**: Domain entities and value objects being tested
- **data-persistence.md**: Repository patterns for integration tests
- **logging-observability.md**: Testing logging and metrics collection
