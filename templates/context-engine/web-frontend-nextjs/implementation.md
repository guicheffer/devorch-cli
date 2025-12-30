# Web Frontend Next.js - Implementation Guide

This guide introduces the available implementers and verifiers for Next.js web frontend development.

## Available Implementers

The following domain-specific implementers are available to help you build features following YourCompany web frontend patterns:

### Core Architecture

- **react-component-architecture** - Build React components with TypeScript
  - Functional components with typed props
  - Component composition patterns
  - Dynamic imports and code splitting

- **styling-design-system** - Apply Zest design system
  - Zest component usage
  - Design tokens (spacing, colors)
  - Conditional styling

### State and Data

- **state-management** - Manage application state
  - React Query for server state
  - Jotai for client state
  - Custom hooks for business logic

- **data-access-layer** - Integrate with APIs
  - Data-access modules with typed schemas
  - React Query hook patterns
  - Conditional data fetching

### TypeScript and Code Organization

- **typescript-patterns** - Write type-safe code
  - Strict type definitions
  - Type-only imports
  - Generics and utility types

- **import-organization** - Structure imports
  - Path aliases with @ prefix
  - Import grouping conventions
  - Barrel exports

### Testing

- **testing-practices** - Test your code
  - Jest + React Testing Library
  - Cypress E2E tests
  - Mock implementations

### Configuration and Features

- **configuration-management** - Manage configuration
  - Config hooks
  - Locale-based configuration
  - Environment-specific configs

- **feature-flags** - Control feature rollout
  - Statsig integration
  - Feature gates and configs
  - Experiment bypass in tests

### Localization and Errors

- **localization** - Support multiple locales
  - useT9n hook for translations
  - Translation file structure
  - Locale hooks

- **error-handling** - Handle errors gracefully
  - ErrorBoundary components
  - React Query error callbacks
  - Error state management

## Available Verifiers

- **react-component-architecture** - Verify component structure and TypeScript usage
- **testing-practices** - Verify test coverage and quality

## Using Implementers

When planning a task, the spec-researcher and spec-writer will automatically select relevant implementers based on your requirements. Each implementer provides:

1. **Specific patterns** for the domain
2. **Real code examples** from yourcompany/web
3. **Best practices** and conventions
4. **Related libraries** and tools

## Pattern Coverage

These implementers were generated from analysis of **50 merged PRs** containing:

- **45 distinct patterns** across 11 domains
- **Real code examples** from production
- **Frequency data** showing common patterns
- **Related libraries** for each pattern

Most common domains:
- TypeScript patterns (96% of PRs)
- Import organization (100% of PRs)
- React components (84% of PRs)
- Styling/Zest (76% of PRs)
- State management (70% of PRs)

## Next Steps

1. The spec-researcher will ask you questions about your feature
2. The spec-writer will select relevant implementers automatically
3. The implementer agent will use these patterns to build your feature
4. The verifier agent will validate the implementation

These patterns reflect actual YourCompany web frontend conventions and are kept up-to-date with the latest merged PRs.
