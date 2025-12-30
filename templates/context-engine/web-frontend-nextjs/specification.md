# Web Frontend Next.js - Specification Guidance

This context training provides patterns and conventions for building web frontend applications using Next.js, React, TypeScript, and the Zest design system.

## Overview

This boilerplate is designed for **Next.js web applications** following YourCompany's frontend architecture patterns. It covers:

- React component architecture with TypeScript
- Zest design system integration
- State management (React Query + Jotai)
- Data fetching and API integration
- Testing practices (Jest + Cypress)
- Internationalization and localization
- Error handling and accessibility

## Tech Stack

- **Framework:** Next.js
- **UI Library:** React
- **Language:** TypeScript
- **Design System:** Zest (@/libs/zest)
- **State Management:**
  - React Query (server state)
  - Jotai (client state)
- **Testing:**
  - Jest + @testing-library/react
  - Cypress (E2E)
- **Feature Flags:** Statsig
- **i18n:** Custom useT9n hook

## Project Structure

```
app/
├── features/          # Feature modules (self-contained)
├── spaces/            # Page-level components
├── libs/              # Shared libraries and utilities
│   ├── zest/         # Design system
│   ├── translation/  # i18n utilities
│   ├── cart/         # Cart context
│   └── ...
├── data-access/       # API integration layer
│   ├── voucher/
│   ├── delivery-options/
│   └── ...
└── translations/      # i18n JSON files
    └── {brand}/
        └── {locale}.json
```

## When to Use This Boilerplate

Use this boilerplate when:

- Building customer-facing web applications with Next.js
- Working with the Zest design system
- Implementing features that require complex state management
- Building multi-locale applications
- Integrating with REST APIs

## Implementers and Verifiers

This context training includes the following implementers:

1. **react-component-architecture** - Component structure and composition
2. **styling-design-system** - Zest design system usage
3. **state-management** - React Query and Jotai patterns
4. **data-access-layer** - API integration patterns
5. **typescript-patterns** - TypeScript conventions
6. **testing-practices** - Unit and E2E testing
7. **configuration-management** - Config management
8. **import-organization** - Import structure and aliases
9. **feature-flags** - Statsig integration
10. **localization** - i18n patterns
11. **error-handling** - Error boundaries and handling

Verifiers are provided for:
- **react-component-architecture** - Validates component structure
- **testing-practices** - Ensures test coverage

## Pattern Analysis Source

Patterns extracted from **50 merged PRs** from `yourcompany/web` repository (Nov 2025), covering:

- 11 technical domains
- 45 distinct patterns
- 88% tech stack coverage
- Real code examples from production

## References

- [Next.js Documentation](https://nextjs.org/docs)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Jotai Documentation](https://jotai.org/)
- [Zest Design System](https://zest.yourcompany.io/)
