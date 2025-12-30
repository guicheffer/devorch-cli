---
domain: testing
description: Verify testing quality including coverage, table-driven patterns, and proper mocking
---

# Testing Verifier

Comprehensive verification checklist for Go microservice testing quality.

## Verification Criteria

### 1. Test Coverage Requirements

**Minimum Requirements:**
- ✅ Unit test coverage ≥80% for business logic
- ✅ Integration tests for all repositories
- ✅ Handler tests for all gRPC/Kafka endpoints
- ✅ BDD acceptance tests for critical business flows (when applicable)

**How to Verify:**
```bash
# Run tests with coverage
go test -cover ./...

# Generate detailed coverage report
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out -o coverage.html

# Check coverage percentage
go tool cover -func=coverage.out | grep total
```

**Expected Output:**
```
total: (statements) 82.5%
```

### 2. Table-Driven Test Pattern

**Requirement:** All unit tests must use table-driven pattern with clear test case names.

**Verify Pattern:**
```go
func TestFunction(t *testing.T) {
    tests := map[string]struct {
        given InputType
        then  ExpectedType
    }{
        "GIVEN condition THEN expected outcome": {
            given: InputType{...},
            then:  ExpectedType{...},
        },
    }
    for name, tc := range tests {
        t.Run(name, func(t *testing.T) {
            result := Function(tc.given)
            assert.Equal(t, tc.then, result)
        })
    }
}
```

**Check:**
- ✅ Tests use `map[string]struct` pattern
- ✅ Test names follow GIVEN-THEN format
- ✅ Each test case runs in `t.Run()` subtest
- ✅ Test tables separate from assertions

### 3. Test Suite Pattern (Integration Tests)

**Requirement:** Integration tests use testify/suite for setup/teardown.

**Verify Pattern:**
```go
type RepositorySuite struct {
    suite.Suite
    repo   *Repository
    client *mongo.Client
}

func TestRepositorySuite(t *testing.T) {
    suite.Run(t, new(RepositorySuite))
}

func (s *RepositorySuite) SetupTest() {
    // Setup before each test
}

func (s *RepositorySuite) TearDownTest() {
    // Cleanup after each test
}

func (s *RepositorySuite) TestSomeFeature() {
    // Test implementation
}
```

**Check:**
- ✅ Suite struct embeds `suite.Suite`
- ✅ `TestXxxSuite` function calls `suite.Run()`
- ✅ Setup/teardown methods implemented
- ✅ Tests use `s.Require()` or `s.Assert()`

### 4. Mock Usage

**Requirement:** External dependencies must be mocked using interfaces and gomock.

**Verify Pattern:**
```go
// Interface definition in application layer
type repository interface {
    Get(ctx context.Context, id uuid.UUID) (*Entity, error)
}

// Mock generation
//go:generate mockgen -destination=mocks/repository_mock.go -package=mocks . repository

// Test usage
func TestService(t *testing.T) {
    ctrl := gomock.NewController(t)
    defer ctrl.Finish()

    mockRepo := mocks.NewMockRepository(ctrl)
    mockRepo.EXPECT().
        Get(gomock.Any(), testID).
        Return(&expectedEntity, nil)

    service := NewService(mockRepo)
    result, err := service.Process(context.Background(), testID)

    assert.NoError(t, err)
    assert.Equal(t, expectedEntity, result)
}
```

**Check:**
- ✅ Interfaces defined for all external dependencies
- ✅ Mock generation directives present
- ✅ Mocks created with gomock.NewController
- ✅ Expectations set with EXPECT() chains
- ✅ ctrl.Finish() called in defer

### 5. Test Isolation

**Requirement:** Tests must be independent and not rely on execution order.

**Check:**
- ✅ Each test creates its own test data
- ✅ No shared mutable state between tests
- ✅ Database/external state cleaned between tests
- ✅ Tests can run in parallel (use `t.Parallel()` where applicable)

**Verify:**
```bash
# Run tests in random order
go test -shuffle=on ./...

# Run tests in parallel
go test -parallel=4 ./...
```

### 6. Error Case Testing

**Requirement:** Both success and failure paths must be tested.

**Verify Pattern:**
```go
tests := map[string]struct {
    given       Input
    expectError bool
    errorType   error
}{
    "GIVEN valid input THEN success": {
        given:       validInput,
        expectError: false,
    },
    "GIVEN invalid input THEN validation error": {
        given:       invalidInput,
        expectError: true,
        errorType:   ErrInvalidInput,
    },
    "GIVEN database error THEN wrapped error": {
        given:       validInput,
        expectError: true,
        errorType:   ErrDatabase,
    },
}
```

**Check:**
- ✅ Happy path tested
- ✅ Validation errors tested
- ✅ External dependency errors tested
- ✅ Error types verified with `errors.Is()`

### 7. Context Handling

**Requirement:** All functions accepting context must test context cancellation.

**Verify Pattern:**
```go
func TestService_ContextCancellation(t *testing.T) {
    ctx, cancel := context.WithCancel(context.Background())
    cancel() // Cancel immediately

    service := NewService(repo)
    _, err := service.Process(ctx, input)

    assert.Error(t, err)
    assert.True(t, errors.Is(err, context.Canceled))
}
```

**Check:**
- ✅ Context cancellation tested
- ✅ Context timeout tested (where applicable)
- ✅ Context values propagated correctly

### 8. Integration Test Requirements

**Requirement:** Repository tests must use real database (testcontainers or docker-compose).

**Verify Pattern:**
```go
func (s *RepositorySuite) SetupSuite() {
    // Start MongoDB container
    ctx := context.Background()
    mongoC, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
        ContainerRequest: testcontainers.ContainerRequest{
            Image:        "mongo:6",
            ExposedPorts: []string{"27017/tcp"},
        },
        Started: true,
    })
    s.Require().NoError(err)
    s.mongoContainer = mongoC

    // Connect to MongoDB
    endpoint, err := mongoC.Endpoint(ctx, "")
    s.Require().NoError(err)

    client, err := mongo.Connect(ctx, options.Client().ApplyURI("mongodb://"+endpoint))
    s.Require().NoError(err)
    s.client = client
}

func (s *RepositorySuite) TearDownSuite() {
    s.client.Disconnect(context.Background())
    s.mongoContainer.Terminate(context.Background())
}
```

**Check:**
- ✅ Real database used (not mocks)
- ✅ Container lifecycle managed properly
- ✅ Cleanup in TearDownSuite
- ✅ Tests verify actual database operations

### 9. BDD Acceptance Tests (When Applicable)

**Requirement:** Critical business flows must have Gherkin feature files and step definitions.

**Verify Structure:**
```
test/feature-tests/
├── features/
│   ├── allocation.feature
│   └── redemption.feature
├── steps/
│   ├── context.go
│   ├── order_steps.go
│   └── promise_steps.go
└── BUILD.bazel
```

**Check Feature File:**
```gherkin
@new-redemption
Feature: Benefit redemption
  Scenario: Initial order with discount
    Given I attach a promise with discount 30%
    When I create an order for product "US-CB-3-2-0" with price $50
    Then discount for "US-CB-3-2-0" should be $15
    And promise should be fulfilled
```

**Check:**
- ✅ Feature files use proper Gherkin syntax
- ✅ Step definitions implement all steps
- ✅ Scenarios test end-to-end flows
- ✅ Test data is created/cleaned per scenario

### 10. Build System Integration

**Requirement:** All tests must have proper BUILD.bazel configuration.

**Verify Pattern:**
```python
go_test(
    name = "service_test",
    srcs = ["service_test.go"],
    embed = [":service"],
    deps = [
        "//internal/domain/entities",
        "@com_github_stretchr_testify//assert",
        "@com_github_stretchr_testify//require",
        "@org_uber_go_mock//gomock",
    ],
)
```

**Check:**
- ✅ Every test file has go_test target
- ✅ Dependencies declared correctly
- ✅ embed used for unit tests
- ✅ Test builds successfully: `bazel test //...`

## Verification Workflow

### Step 1: Run All Tests

```bash
# Unit tests
bazel test //internal/...

# Integration tests
bazel test //internal/.../integration_test.go

# Acceptance tests
bazel test //test/feature-tests/...
```

### Step 2: Check Coverage

```bash
# Generate coverage report
bazel coverage //...

# View coverage
genhtml bazel-out/_coverage/_coverage_report.dat -o coverage/
open coverage/index.html
```

**Verify:**
- ✅ Overall coverage ≥80%
- ✅ Business logic packages ≥90%
- ✅ Handler packages ≥80%
- ✅ No untested critical paths

### Step 3: Verify Test Quality

**Check test files for:**
- ✅ Descriptive test names (GIVEN-WHEN-THEN or GIVEN-THEN)
- ✅ No hardcoded values (use constants or fixtures)
- ✅ Assertions use testify (assert/require)
- ✅ No t.Skip() without justification
- ✅ No commented-out tests

### Step 4: Run Race Detector

```bash
bazel test --features=race //...
```

**Verify:**
- ✅ No race conditions detected
- ✅ Concurrent code properly synchronized

### Step 5: Verify Mock Generation

```bash
# Find all mock generation directives
grep -r "go:generate mockgen" .

# Verify mocks are generated
find . -name "*_mock.go"
```

**Check:**
- ✅ All interfaces have mocks
- ✅ Mocks are up to date
- ✅ Mock packages properly organized

## Common Test Anti-Patterns to Flag

### ❌ No Error Testing

```go
// Bad: Only testing happy path
func TestFunction(t *testing.T) {
    result := Function(validInput)
    assert.Equal(t, expected, result)
}
```

**Fix:** Add error cases to table.

### ❌ Testing Implementation Details

```go
// Bad: Testing private methods
func TestPrivateMethod(t *testing.T) {
    // Testing unexported function
}
```

**Fix:** Test public API, private methods are implementation details.

### ❌ Ignoring Errors in Tests

```go
// Bad
result, _ := service.Process(ctx, input)
assert.Equal(t, expected, result)
```

**Fix:**
```go
result, err := service.Process(ctx, input)
require.NoError(t, err)
assert.Equal(t, expected, result)
```

### ❌ Large Test Functions

```go
// Bad: 200+ line test function with inline test data
func TestEverything(t *testing.T) {
    // Hundreds of lines...
}
```

**Fix:** Use table-driven tests and helper functions.

### ❌ Shared Test State

```go
// Bad: Package-level test state
var testUser = &User{ID: 1}

func TestA(t *testing.T) {
    testUser.Name = "Alice"
    // ...
}

func TestB(t *testing.T) {
    // Assumes testUser.Name, order-dependent
}
```

**Fix:** Create test data in each test.

## Performance Verification

### Check Test Execution Time

```bash
go test -v ./... | grep -E "PASS|FAIL" | awk '{print $3, $1}'
```

**Thresholds:**
- ✅ Unit tests: <100ms per package
- ✅ Integration tests: <5s per package
- ✅ Acceptance tests: <30s per scenario

**Flag slow tests:**
```bash
go test -v ./... | grep -E "PASS.*[0-9]+\.[0-9]+s"
```

## Security Verification

### Test Data Validation

**Check:**
- ✅ No real credentials in test code
- ✅ No production data in test fixtures
- ✅ Sensitive data properly redacted in logs

### Input Validation Tests

**Verify:**
- ✅ SQL injection tests (if using SQL)
- ✅ XSS prevention tests (if rendering HTML)
- ✅ Path traversal tests (if handling files)
- ✅ Large input handling tests

## Checklist Summary

Use this checklist during verification:

- [ ] All public functions have unit tests
- [ ] Test coverage ≥80% overall
- [ ] Business logic coverage ≥90%
- [ ] Table-driven tests used consistently
- [ ] Integration tests for all repositories
- [ ] Handler tests for all endpoints
- [ ] BDD tests for critical flows (if applicable)
- [ ] Mocks used for external dependencies
- [ ] Error cases tested
- [ ] Context cancellation tested
- [ ] Tests are isolated and independent
- [ ] No race conditions
- [ ] BUILD.bazel files correct
- [ ] Tests run successfully: `bazel test //...`
- [ ] No test anti-patterns present

## Reporting Verification Results

**Format:**
```markdown
## Testing Verification Report

### Coverage
- Overall: 84% ✅
- Business Logic: 92% ✅
- Handlers: 79% ⚠️ (target: 80%)

### Test Quality
- Table-driven tests: Yes ✅
- Mock usage: Yes ✅
- Error testing: Yes ✅
- Context handling: Partial ⚠️

### Issues Found
1. Handler package coverage below 80%
2. Missing context cancellation tests in OrderService
3. Integration test missing for DeliveriesRepository

### Recommendations
1. Add handler tests for remaining endpoints
2. Add context cancellation test in service_test.go:45
3. Create integration test for deliveries repository
```

## Related Verifiers

No other verifiers currently defined for this boilerplate.

## See Also

- **implementers/testing.md** - Testing patterns and examples
- [Go Testing Best Practices](https://go.dev/doc/tutorial/add-a-test)
- [testify documentation](https://github.com/stretchr/testify)
- [gomock documentation](https://github.com/golang/mock)
