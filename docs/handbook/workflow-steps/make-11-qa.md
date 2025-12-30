# 11. QA

**Cycle:** MAKE (1 Sprint)
**Phase:** Validation

## Purpose

Verify that the implementation meets all requirements, works as designed, and is ready for production. QA is continuous throughout development, not just at the end.

## AI-Native Approach

Use AI to:
- Generate test cases from specifications
- Automate repetitive testing
- Identify edge cases
- Analyze test coverage
- Generate bug reports

## Key Activities

- Execute test plans
- Verify specs are met
- Test edge cases and error states
- Validate accessibility
- Performance testing
- Document bugs and issues

## Inputs

- All three specs (Product, UX, Engineering)
- Developed feature
- Test plans
- Acceptance criteria

## Outputs

- **QA sign-off**: Feature is ready for demo/deploy
- **Bug reports**: Issues found and documented
- **Test results**: Coverage and pass/fail
- **Edge case validation**: All scenarios tested

## Tools & Techniques

### Automated QA Testing with `/qa-test`

The `/qa-test` command provides automated browser testing with comprehensive evidence collection. This tool is perfect for PMs and QA engineers who want systematic testing with visual documentation.

**Command format:**
```bash
/qa-test [-skip-console] [-skip-network] <test description>
```

**Example commands:**
```bash
# Full test with all evidence
/qa-test "Test login flow with valid credentials on staging.example.com"

# Skip console logs for faster testing
/qa-test -skip-console "Test checkout flow on production"

# Screenshot-only testing
/qa-test -skip-console -skip-network "Visual regression test for mobile homepage"
```

#### Two-Phase Workflow

**Phase 1: Setup** (Automatic)
- Creates organized test directory structure
- Generates test plan based on your description
- Saves configuration for execution
- **Stops and waits for your approval**

**Phase 2: Execution** (Manual trigger)
- You review the test plan
- Say "Execute the test" when ready
- Automated browser interactions run
- Evidence collected systematically
- Reports generated automatically

#### What It Collects

**Always:**
- Screenshots at every test step
- Organized folder structure
- PM-friendly test reports
- Bug reports for issues found

**Optional** (via flags):
- Console logs (browser errors/warnings)
- Network logs (API requests/responses)

#### Test Types Supported

- **Login/Authentication**: Valid/invalid credentials, OAuth, password reset
- **Checkout/Purchase**: Complete flows, promo codes, payment validation
- **Form Validation**: Valid/invalid inputs, required fields, error messages
- **Visual/Responsive**: Desktop, tablet, mobile breakpoints
- **User Journeys**: End-to-end flows, friction points
- **Search/Filter**: Search functionality, filtering, pagination

#### Example: Login Test

```bash
# Step 1: Run setup
/qa-test "Test login with invalid password on staging.app.com"

# Output shows test plan and folder created
# Review: qa-tests/2025-10-30-14-30-test-login-invalid/test-plan/test-scenarios.md

# Step 2: Execute
"Execute the test"

# Automated browser testing runs:
# - Navigates to login page
# - Fills in credentials
# - Submits form
# - Captures screenshots
# - Documents results
# - Generates report
```

#### Output Structure

```
qa-tests/YYYY-MM-DD-HH-MM-{test-slug}/
├── context/          # Test data, credentials
├── output/           # Reports and bug reports
├── thoughts/         # Analysis and decisions
├── test-plan/        # Test scenarios
├── evidence/         # All captured evidence
│   └── run-YYYY-MM-DD-HH-MM/
│       ├── screenshots/
│       ├── console-logs/
│       └── network-logs/
└── qa-test.md        # Test specification
```

#### Benefits

**For PMs:**
- Visual evidence of every step
- Plain-language reports ready to share
- Clear bug reproduction steps
- No technical knowledge required

**For Developers:**
- Complete technical logs
- Reproducible test scenarios
- Console errors captured
- Network requests documented

**For QA:**
- Systematic test coverage
- Reusable test scenarios
- Regression testing ready
- Professional documentation

#### Best Practices

1. **Start with happy path**: Test successful flows first
2. **Use descriptive test names**: Makes reports easy to find
3. **Review test plan before execution**: Catch issues early
4. **Skip logs when not needed**: Faster testing with `-skip-console -skip-network`
5. **Rerun for regressions**: Use same command to verify fixes

#### Testing Frameworks

**Unit & Integration Tests:**
- Jest / Vitest for JavaScript/TypeScript
- React Testing Library for components
- Supertest for API testing

**E2E Tests:**
- Playwright for web automation
- Cypress for interactive testing
- Detox for React Native

**Accessibility Testing:**
- axe-core for automated checks
- WAVE browser extension
- Lighthouse audits

**Performance Testing:**
- Lighthouse for web vitals
- Chrome DevTools for profiling
- WebPageTest for real-world metrics

## Common Pitfalls

- QA only at the end (too late to fix easily)
- Testing only happy paths
- Not testing on real devices/browsers
- Ignoring accessibility
- Not documenting issues clearly

## Success Criteria

- [ ] All acceptance criteria are met
- [ ] Edge cases have been tested
- [ ] Bugs are documented or fixed
- [ ] Accessibility is validated
- [ ] Performance is acceptable
- [ ] Feature is ready for demo
