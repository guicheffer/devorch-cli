# 10. Develop

**Cycle:** MAKE (1 Sprint)
**Phase:** Creation

## Purpose

Build the solution according to specs and designs. Use AI as a development partner to write high-quality, tested code faster.

## AI-Native Approach

Use AI to:
- Generate code from specifications
- Implement components and features
- Write tests alongside code
- Refactor and optimize
- Debug and fix issues

## Key Activities

- Implement features per spec
- Write unit and integration tests
- Follow coding standards
- Conduct code reviews
- Maintain documentation

## Inputs

- Engineering Spec
- UX Spec and designs
- Design system/component library
- Technical architecture
- API contracts

## Outputs

- **Working code**: Implemented features
- **Tests**: Unit, integration, E2E
- **Documentation**: Technical docs, comments
- **Pull requests**: Reviewed and approved
- **Demo-ready feature**: Testable functionality

## Tools & Techniques

> **⚠️ PRE-ALPHA:** [devorch](https://github.com/guicheffer/devorch) is currently in pre-alpha development. Official release scheduled for the first week of November 2025.

### AI Development Assistants

Use **[devorch](https://github.com/guicheffer/devorch)** to install AI workflow automation for Claude Code and Cursor:

```bash
# Install devorch (requires GitHub CLI: https://cli.github.com/)
gh api repos/guicheffer/devorch/contents/installer/setup.sh \
  --jq '.content' | base64 -d | sh

# Install development workflows
cd your-project/
devorch install
```

### Development with Claude Code

**Commands for development:**
- `/implement-spec` - Implement features from engineering specs
- `/fix-bug` - Debug and fix issues systematically
- `/refactor` - Refactor code with safety checks
- `/write-tests` - Generate test coverage for code

**Example workflow:**

```bash
# 1. Start with a spec
# Have your Engineering Spec ready (e.g., @specs/feature-name.md)

# 2. Implement the feature
/implement-spec @specs/user-authentication.md

# 3. Write tests
/write-tests src/auth/user-service.ts

# 4. Refactor if needed
/refactor src/auth/user-service.ts "Extract validation logic"
```

**Subagents for specialized tasks:**
- `implementer/ui-implementer` - React/React Native UI components
- `implementer/backend-implementer` - API and backend logic
- `verifier/test-writer` - Comprehensive test generation

### Development with Cursor

Cursor Composer works with devorch commands. Use `@` to reference specs and files:

```
@implement-spec @specs/checkout-flow.md

Implement the checkout flow using:
- @src/components/Cart.tsx
- @src/api/payment.ts
```

### Testing Frameworks

**Unit & Integration Tests:**
- Jest / Vitest for JavaScript/TypeScript
- React Testing Library for components
- Supertest for API testing

**E2E Tests:**
- Playwright / Cypress for web
- Detox for React Native

**AI-Assisted Testing:**
```bash
# Generate tests for a module
/write-tests src/payment/payment-processor.ts

# Generate E2E test scenarios
/implement-spec @specs/e2e-checkout.md --test-focus
```

### Code Review Practices

**AI-Enhanced Reviews:**
1. **Pre-review:** Have AI review your code first
   - `@review-code` before creating PR
   - Fix obvious issues before human review

2. **PR Creation:**
   ```bash
   git add .
   git commit -m "feat: Add user authentication"
   /create-pr
   ```

3. **Review Checklist:**
   - [ ] Code matches spec requirements
   - [ ] Tests cover happy path and edge cases
   - [ ] No hardcoded values or secrets
   - [ ] Error handling is robust
   - [ ] Documentation is updated

### Git Workflow

**Branch naming:**
```bash
feature/user-authentication
fix/login-validation
refactor/payment-service
```

**Commit conventions:**
```bash
feat: Add password reset flow
fix: Resolve race condition in checkout
refactor: Extract validation to separate module
test: Add coverage for payment processor
docs: Update API documentation
```

**With devorch:**
```bash
# AI assists with commit messages
git add .
# AI will analyze changes and suggest conventional commit message
git commit

# Create PR with AI-generated description
/create-pr
```

### Example Development Flow

**Full feature implementation:**

1. **Start with spec:**
   ```bash
   # Review the Engineering Spec
   cat @specs/user-profile.md
   ```

2. **Implement core logic:**
   ```bash
   /implement-spec @specs/user-profile.md
   # AI implements UserProfileService, validation, DB models
   ```

3. **Build UI components:**
   ```bash
   # Use UI implementer subagent
   "Implement the user profile screen with form validation"
   # References design system, follows patterns
   ```

4. **Write tests:**
   ```bash
   /write-tests src/profile/user-profile-service.ts
   # Generates unit tests with mocks and edge cases
   ```

5. **Integration testing:**
   ```bash
   /write-tests src/profile/user-profile-api.test.ts --integration
   # Tests API endpoints with real requests
   ```

6. **Code review and refinement:**
   ```bash
   @review-code src/profile/
   # AI provides feedback on patterns, performance, security
   ```

7. **Create PR:**
   ```bash
   git add .
   git commit -m "feat: Implement user profile management"
   /create-pr
   ```

### Resources

- **devorch**: https://github.com/guicheffer/devorch
- **Documentation**: https://github.com/guicheffer/devorch/tree/main/docs
- **Examples**: https://github.com/guicheffer/devorch/tree/main/templates

## Common Pitfalls

- Deviating from specs without discussion
- Skipping tests to "save time"
- Not reviewing AI-generated code
- Poor git hygiene
- Building in isolation without daily check-ins

## Success Criteria

- [ ] All spec requirements are implemented
- [ ] Code has test coverage
- [ ] Code reviews are complete
- [ ] Follows coding standards
- [ ] Feature is demo-ready
