---
domain: testing-practices
description: Verify test coverage and testing best practices
---

# Testing Practices Verifier

Verify test coverage and quality for components and features.

## Verification Checklist

### ✅ Unit Tests

- [ ] All components have corresponding test files
- [ ] Tests follow naming: `ComponentName.test.tsx`
- [ ] Tests use `@testing-library/react`
- [ ] All dependencies properly mocked
- [ ] Mocks defined before imports

### ✅ Test Coverage

- [ ] Happy path tested
- [ ] Error states tested
- [ ] Edge cases covered
- [ ] Props variations tested

### ✅ Test Quality

- [ ] Descriptive test names (`should [behavior] when [condition]`)
- [ ] Tests focus on user behavior, not implementation
- [ ] Use `data-test-id` for element selection
- [ ] Avoid testing implementation details

### ✅ E2E Tests

- [ ] Critical flows have Cypress tests
- [ ] Tests use `cy.bootstrap()` and `cy.teardown()`
- [ ] Feature flags bypassed where needed
- [ ] Tests clean up after themselves

## Automated Checks

```bash
# Check test coverage
npm run test:coverage

# Run all tests
npm run test

# Run E2E tests
npm run test:e2e
```

## Coverage Thresholds

- Branches: 80%
- Functions: 80%
- Lines: 80%
- Statements: 80%

## See Also

- **react-component-architecture** verifier
