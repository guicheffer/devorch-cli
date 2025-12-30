---
domain: react-component-architecture
description: Verify React component structure, TypeScript usage, and composition patterns
---

# React Component Architecture Verifier

Verify that components follow YourCompany React patterns.

## Verification Checklist

### ✅ TypeScript Props

- [ ] All components have explicit TypeScript types/interfaces for props
- [ ] Props use `type` (preferred) or `interface`
- [ ] No `any` types in component props
- [ ] Optional props marked with `?`
- [ ] Default values provided in destructuring

### ✅ Component Structure

- [ ] Components use functional components (`const Component: React.FC`)
- [ ] Hooks called at top level (not conditional)
- [ ] Event handlers defined before render
- [ ] Single responsibility principle followed

### ✅ Composition

- [ ] Complex components broken into sub-components
- [ ] Props passed down correctly
- [ ] Conditional rendering uses `&&` or ternary
- [ ] No deeply nested JSX (max 3-4 levels)

### ✅ Code Splitting

- [ ] Heavy components use `dynamic()` imports where appropriate
- [ ] Dynamic imports have proper loading states

### ✅ Testing

- [ ] Components include `data-test-id` attributes
- [ ] Prop types exported for testing

## Automated Checks

Run these commands to verify:

```bash
# Check for any types
grep -r ":\s*any" app/features/

# Check for interfaces (should prefer types)
grep -r "export interface.*Props" app/features/

# Verify functional components
grep -r "React.FC<" app/features/
```

## Common Issues

- Using `interface` instead of `type` for props
- Missing TypeScript types
- Not using dynamic imports for heavy components
- Missing `data-test-id` attributes

## See Also

- **typescript-patterns** verifier
- **testing-practices** verifier
