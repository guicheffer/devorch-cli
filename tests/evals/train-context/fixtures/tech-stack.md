# Tech Stack

> Generated on: 2025-11-08
> Based on comprehensive project dependency analysis

This document provides a complete overview of the technology stack used across the YourCompany web monorepo. All technologies listed below were auto-detected from package.json files, configuration files, and infrastructure code.

---

## Frontend

### Core UI Framework
- **React** (v18.2.0)
  - Core UI library for component-based architecture
- **React DOM** (v18.2.0)
  - React rendering for web applications

### Meta-Framework
- **Next.js** (v14.2.30)
  - Server-side rendering and static site generation framework
  - Powers the main application with hybrid rendering capabilities

### Styling Solutions

The project uses a multi-paradigm styling approach:

**CSS-in-JS:**
- **Styled Components** (v5.3.5) - Primary CSS-in-JS solution
- **Emotion** (v9.2.6 core, v11.x packages) - Alternative CSS-in-JS library
- **Fela** (v10.8.2) - Atomic CSS-in-JS renderer
- **Styled System** (v5.1.5) - Design system utilities for styled-components
- **Polished** (v1.9.2) - Styling helper utilities

**Design System:**
- **YourCompany Design System Components** (v4.1.7)
- **YourCompany Design System Core** (v4.0.4-4.0.5)
- **YourCompany Design System Icons** (v4.0.3-4.0.5)
- **Zest Design Tokens** (v1.0.9)

### State Management

Multiple state management solutions coexist for different use cases:

**Redux Ecosystem:**
- **Redux** (v4.x) - Primary global state management
- **React Redux** (v4.4.10 and v7.2.1) - React bindings for Redux
- **Redux Toolkit Middleware:**
  - redux-thunk (v2.4.1) - Async action handling
  - redux-promise-middleware (v6.2.0) - Promise-based actions
- **Redux Persist** (v4.8.2) - State persistence
- **Redux Immutable** (v3.0.11) - Immutable state utilities
- **Immutable.js** (v3.8.2) - Immutable data structures

**Modern State Management:**
- **XState** (v5.19.0) - State machine management
- **@xstate/react** (v5.0.0) - React integration for XState
- **Jotai** (v1.11.0) - Atomic state management
- **React Query** (v3.39.0) - Server state management

### Routing

**Multiple Routing Solutions:**
- **React Router** (v3.2.0) - Legacy routing
- **React Router DOM** (v5.2.0) - Modern DOM routing
- **Redux First Router** (v2.1.5) - Redux-integrated routing
- **History** (v4.7.2) - Browser history management

### Form Management

**Form Libraries:**
- **Formik** (v1.5.8) - Form state management
- **React Hook Form** (v7.54.2) - Performant form library
- **Redux Form** (v7.4.3) - Redux-integrated forms
- **Yup** (v0.29.3) - Schema validation

### UI Component Libraries

**Component Systems:**
- **Radix UI** (v1.x) - Unstyled accessible components (multiple packages)
- **Downshift** (v7.6.0) - Accessible select/combobox
- **React Modal** (v3.16.1) - Modal dialogs
- **React Calendar** (v3.9.0) - Date picker components
- **React Swipeable** (v4.3.2) - Touch gesture handling
- **React Draggable** (v4.4.5 - patched) - Drag & drop functionality
- **Swiper** (v6.8.2) - Modern mobile touch slider
- **React ACE** (v9.5.0) - Code editor component

### Internationalization
- **i18next** (v23.12.2) - Core i18n framework
- **react-i18next** (v15.0.0) - React integration for i18next

### Animation
- **React Spring** (v9.7.2) - Spring-physics based animation
- **Motion** (v12.9.2) - Modern animation library
- **Lottie Web** (v5.13.0) - JSON-based animations

### Utility Libraries

**General Utilities:**
- **Lodash** (v4.17.21) - Utility functions
- **Lodash ES** (v4.17.21) - ES module version
- **Date-fns** (v1.30.1) - Date manipulation
- **Recompose** (v0.30.0) - Higher-order component utilities
- **Reselect** (v3.0.1) - Memoized selectors
- **Memoize One** (v5.2.1) - Simple memoization
- **React Intersection Observer** (v8.34.0) - Visibility detection

**Content & Markdown:**
- **MDX** (v2.3.0) - Markdown with JSX
- **Markdown to JSX** (v7.4.7) - Markdown parser
- **Marked** (v4.3.0) - Fast markdown parser

**Phone Number Handling:**
- **React Phone Number Input** (v2.5.3)
- **React International Phone** (v4.3.0)

**Other Specialized Libraries:**
- **React Syntax Highlighter** (v15.5.0) - Code syntax highlighting
- **Recharts** (v2.9.0) - Charting library
- **Fuse.js** (v6.6.0) - Fuzzy search
- **Clipboard Copy** (v2.0.1) - Clipboard utilities
- **React Copy to Clipboard** (v5.1.0) - Copy to clipboard component
- **File Saver** (v2.0.5) - Client-side file saving
- **React Visibility Sensor** (v5.1.1) - Viewport visibility detection
- **React Content Loader** (v3.4.2) - Skeleton loading screens
- **Lazysizes** (v5.3.2) - Lazy loading for images

---

## Backend

### Runtime
- **Node.js** (v22.16.0)
  - Detected from: .nvmrc, Dockerfile

### Server Framework
- **Next.js Server** (v14.2.30)
  - Handles server-side rendering and API routes
- **@godaddy/terminus** (v4.12.0)
  - Graceful shutdown handler for Node.js servers

### API & GraphQL

**GraphQL Stack:**
- **Apollo Client** (v3.9.2) - GraphQL client
- **GraphQL** (v16.8.1) - GraphQL JavaScript reference implementation
- **GraphQL Request** (v6.1.0) - Minimal GraphQL client
- **GraphQL Code Generator** (v5.0.2) - Type-safe GraphQL code generation

### HTTP Clients
- **Axios** (v0.27.2) - Promise-based HTTP client
- **Node Fetch** (v2.6.7 / v2.7.0) - Fetch API for Node.js

### Database & Caching

**Caching:**
- **Redis** (ioredis v5.4.1) - Redis client for Node.js
- **AWS ElastiCache** - Redis 7 (cache.t3.micro, cluster mode enabled)
  - Detected from: terraform/redis/staging/main.tf

### Content Management
- **Contentful** (v9.3.3) - CMS SDK
- **Contentful Management** (v8.3.0) - CMS management API

### Logging
- **Pino** (v7.11.0) - Fast JSON logger
- **Pino Pretty** (v7.6.0) - Log prettifier for development

### Data Validation

**Schema Validation:**
- **Zod** (v3.25.x) - TypeScript-first schema validation
- **Zod Validation Error** (v3.3.1) - Enhanced Zod error messages
- **AJV** (v8) - JSON Schema validator
  - ajv-draft-04 - Draft-04 support
  - ajv-formats - Additional format validators

### Backend Utilities

**Data Transformation:**
- **Normalizr** (v3.6.0) - Normalizes nested API responses
- **Immer** (v9.0.12) - Immutable state updates

**URL & Query String:**
- **QS** (v6.14.0) - Query string parser
- **Query String** (v6.14.1) - Simple query string parser
- **URI.js** (v1.19.11) - URI manipulation
- **URL Parse** (v1.5.8) - URL parsing
- **URL Pattern** (v1.0.3) - URL pattern matching

**Identifiers:**
- **UUID** (v8.2.0 / v8.3.2) - UUID generation
- **Nanoid** (v3.3.0) - Small unique ID generator

**Authentication & Security:**
- **JWT Decode** (v2.2.0) - JWT token decoder
- **JS Cookie** (v2.2.1) - Cookie handling
- **Nookies** (v2.5.2) - Cookie helpers for Next.js
- **Blueimp MD5** (v2.19.0) - MD5 hashing

**Validation & Parsing:**
- **IBAN** (v0.0.14) - IBAN validation
- **UA Parser JS** (v1.0.33) - User agent parsing

**Object Comparison:**
- **Deep Object Diff** (v1.1.9) - Deep object comparison
- **Fast Deep Equal** (v3.1.3) - Fast deep equality check

### Scripting & Automation
- **Zx** (v7.2.3) - Shell scripting with JavaScript
- **Yargs** (v17.7.2) - Command-line argument parser

---

## Infrastructure

### Containerization
- **Docker**
  - Detected from: Dockerfile
  - Base image: node:22.16.0-slim

### Infrastructure as Code

**Terraform:**
- **Cloudflare Provider** (~4.16.0)
- **AWS Provider**
- **Infrastructure Components:**
  - 499 .tf files managing Cloudflare Page Rules
  - AWS ElastiCache Redis 7 configuration
  - Honeycomb integration

### Cloud Providers

**AWS:**
- ElastiCache (Redis 7, cache.t3.micro, cluster mode enabled)

**Cloudflare:**
- CDN/DNS for 10+ domains:
  - yourcompany.de
  - greenchef.co.uk
  - everyplate.com.au
  - youfoodz.com
  - factormeals.* (multiple TLDs)
  - And others

**Vercel:**
- **@vercel/otel** (v1.10.1) - OpenTelemetry integration
- **@vercel/speed-insights** (v1.2.0) - Performance monitoring

### CI/CD
- **GitHub Actions**
  - Detected: 63 workflow files

### Orchestration
- **Kubernetes Client** (v0.22.0)
  - Kubernetes API client for Node.js

### Secret Management
- **HashiCorp Vault**
  - Detected from: Infrastructure configuration

---

## Development Tools

### Package Management
- **Yarn** (v4.0.1)
  - Modern package manager with Plug'n'Play

### Monorepo Management
- **Turborepo** (v2.5.4)
  - High-performance build system for monorepos

### Build Tools

**Webpack:**
- **Webpack** (v5.98.0) - Module bundler
- **Webpack CLI** (v5.1.4) - Command-line interface
- **Webpack Bundle Analyzer** (v4.10.1) - Bundle analysis

**SWC (Speedy Web Compiler):**
- **SWC** (v1.7.28) - Fast TypeScript/JavaScript compiler
- **SWC Loader** (v0.2.3) - Webpack loader for SWC
- **@swc/jest** (v0.2.39) - Jest transformer

**Other Build Tools:**
- **tsup** (v8.3.0) - TypeScript bundler
- **Clean CSS** (v5.3.0) - CSS minifier

### TypeScript
- **TypeScript** (v5.7.3)
- **TypeScript Transform Paths** (v3.4.4) - Path mapping transformer
- **ts-node** (v10.9.1) - TypeScript execution environment

### Testing

**Test Frameworks:**
- **Jest** (v30.2.0) - JavaScript testing framework
- **Jest Environment jsdom** (v30.2.0) - DOM environment for Jest

**Jest Plugins & Extensions:**
- **Jest Axe** (v10.0.0) - Accessibility testing
- **Jest Date Mock** (v1.0.10) - Date mocking utilities

**React Testing:**
- **@testing-library/react** (v13.4.0) - React component testing
- **@testing-library/jest-dom** (v5.17.0) - Custom Jest matchers
- **@testing-library/react-hooks** (v8.0.1) - Hook testing
- **@testing-library/user-event** (v13.5.0) - User interaction simulation

**End-to-End Testing:**
- **Cypress** (v13.15.1 - patched)
  - Project ID: idfkhc
- **Cypress Plugins:**
  - cypress-axe - Accessibility testing
  - cypress-image-snapshot - Visual regression
  - cypress-real-events - Real browser events
  - cypress-plugin-tab - Tab key support
  - cypress-log-to-output - Console log capture
  - cypress-parallel - Parallel test execution
  - cypress-multi-reporters - Multiple test reporters
  - cypress-duration-metrics - Performance metrics

**API & HTTP Mocking:**
- **MSW** (v0.49.2) - Mock Service Worker
- **Nock** (v13.5.0) - HTTP server mocking
- **Supertest** (v6.3.0) - HTTP assertion library
- **Axios Mock Adapter** (v1.22.0) - Axios request mocking

**Test Data & Mocking:**
- **Redux Mock Store** (v1.5.4) - Redux store mocking
- **Factory.ts** (v1.4.1) - Test data factories
- **Faker** (v5.5.3) / **@faker-js/faker** (v8.4.1) - Fake data generation
- **Fast Check** (v3.15.0) - Property-based testing
- **Jest When** (v3.6.0) - Conditional mocking
- **MockDate** (v3.0.5) - Date mocking
- **Next Router Mock** (v0.9.10) - Next.js router mocking
- **Jest Canvas Mock** (v2.5.0) - Canvas API mocking
- **Jest Next Dynamic** (v1.0.1) - Next.js dynamic import mocking
- **@anatine/zod-mock** (v3.14.0) - Zod schema mocking

### Code Quality

**Linting:**
- **ESLint** (v8.45.0)
- **@typescript-eslint/eslint-plugin** (v5.62.0)
- **@typescript-eslint/parser** (v5.62.0)

**ESLint Plugins:**
- eslint-plugin-import - Import/export validation
- eslint-plugin-cypress - Cypress best practices
- eslint-plugin-eslint-comments - ESLint directive validation
- eslint-plugin-jsx-a11y - JSX accessibility rules
- eslint-plugin-regex - Custom regex rules
- eslint-plugin-testing-library - Testing Library best practices

**Custom ESLint Plugins (Internal):**
- governance - Code governance rules
- import-guard - Import restrictions
- invalid-key-name - Key naming validation
- migration-tracker - Migration tracking
- migration-deprecator - Deprecation warnings
- migration-rules - Migration enforcement
- zest-checker - Design system validation
- hf-reactivations - Reactivation flow rules

**Code Formatting:**
- **Prettier** (v2.8.1) - Code formatter

**Git Hooks:**
- **Husky** (v7.0.4) - Git hooks manager
- **lint-staged** (v12.5.0) - Run linters on staged files

### Code Transformation
- **jscodeshift** (v0.15.0) - JavaScript codemod toolkit
- **@codeshift/utils** (v0.2.0) - Codeshift utilities

### Documentation
- **Storybook** (v9.1.1) - Component documentation and development

### API Tools
- **OpenAPI Zod Client** (v1.18.1) - Generate Zod schemas from OpenAPI
- **Swagger Parser** (v10.1.0) - OpenAPI/Swagger parser

### Development Utilities
- **start-server-and-test** (v2.0.1) - Start server and run tests
- **Bun** (v1.1.15) - Fast JavaScript runtime (dev only)

---

## Analytics & Observability

### Application Performance Monitoring
- **Sentry** (v7.20.0)
  - Error tracking and performance monitoring

### Observability

**OpenTelemetry:**
- Comprehensive instrumentation with 12+ @opentelemetry/* packages
- **@vercel/otel** (v1.10.1) - Vercel OpenTelemetry integration
- **Honeycomb** (via libhoney v3.1.0) - Observability platform

### Analytics

**Product Analytics:**
- **Snowplow** (v4.3.1)
  - Includes 6 plugins for comprehensive event tracking
- **@vercel/speed-insights** (v1.2.0) - Frontend performance analytics
- **Google Sheets API** (v5.0.5) - Data export and reporting

### User Research & Surveys
- **Sprig** (v2.33.2)
  - In-product surveys and user research

---

## AI/ML & Experimentation

### Feature Flags & Experimentation

**A/B Testing & Feature Management:**
- **Optimizely** (v4.10.0 / v2.9.1)
  - Feature flags and experimentation platform
- **Statsig** (v3.25.3 client, v6.3.1 server)
  - Feature gates and dynamic configs

### State Machine Visualization
- **@statelyai/inspect** (v0.4.0)
  - Visual debugging for XState machines

---

## Payment Processing

### Payment Gateways
- **Adyen** (v5.68.1 - patched)
  - Primary payment processor
- **Braintree** (v3.115.0)
  - Alternative payment gateway

---

## Security

### Security Libraries
- **DOMPurify** (v2.4.0) - HTML sanitization
- **XSS** (v1.0.10) - XSS protection utilities
- **@braintree/sanitize-url** (v6.0.2) - URL sanitization

### Polyfills

Browser compatibility polyfills:
- **abortcontroller-polyfill** (v1.7.3)
- **intersection-observer** (v0.12.0)
- **requestidlecallback-polyfill** (v1.0.2)
- **regenerator-runtime** (v0.14.0)
- **resize-observer-polyfill** (v1.5.1)

---

## Integrations

### Third-Party Services

**Communication:**
- **Slack Web API** (v6.7.2) - Slack integration

**Localization:**
- **Lokalise** (v15.2.1) - Translation management

**Development Tools:**
- **Octokit** (v3.6.0 / v18.12.0) - GitHub API client

### Smart Banners
- **Adjust Smart Banner SDK** (v1.2.6)
  - Mobile app promotion banners

---

## Architecture Patterns

### Key Observations

**Multi-Paradigm Styling:**
The project employs multiple styling solutions (Styled Components, Emotion, Fela) likely due to:
- Legacy code migration in progress
- Different teams or features using different approaches
- Design system evolution (YourCompany DS + Zest)

**State Management Evolution:**
Multiple state management libraries indicate architectural evolution:
- Redux for legacy global state
- XState for complex state machines
- Jotai for atomic local state
- React Query for server state

**Routing Complexity:**
Three different routing solutions coexist, suggesting:
- Migration from React Router v3 to v5
- Redux First Router for specific use cases
- Gradual modernization strategy

**Testing Strategy:**
Comprehensive testing setup with:
- Unit testing (Jest + Testing Library)
- E2E testing (Cypress with extensive plugins)
- Visual regression testing (cypress-image-snapshot)
- Accessibility testing (jest-axe, cypress-axe)
- Property-based testing (Fast Check)

---

## Rationale

This initial documentation was auto-generated from project dependencies. To make this document more valuable:

**Please add rationale for:**
1. Why multiple styling solutions coexist
2. State management strategy per use case
3. Payment gateway selection criteria (Adyen vs Braintree)
4. Experimentation platform usage (Optimizely vs Statsig)
5. Critical technology decisions and trade-offs

**Suggested next steps:**
- Document migration plans for consolidating similar technologies
- Add decision records for major architectural choices
- Include performance benchmarks for critical dependencies
- Document security audit results for payment and auth libraries

---

## Source References

This documentation was generated from analysis of:
- /Users/ps/Documents/GitHub/web/package.json (root monorepo)
- /Users/ps/Documents/GitHub/web/app/package.json (main application)
- /Users/ps/Documents/GitHub/web/toolbox/package.json (internal tooling)
- /Users/ps/Documents/GitHub/web/apps/zest-docs/package.json (Storybook docs)
- /Users/ps/Documents/GitHub/web/Dockerfile
- /Users/ps/Documents/GitHub/web/.nvmrc
- /Users/ps/Documents/GitHub/web/app/tsconfig.json
- /Users/ps/Documents/GitHub/web/turbo.json
- /Users/ps/Documents/GitHub/web/jest.config.js
- /Users/ps/Documents/GitHub/web/app/cypress.config.ts
- /Users/ps/Documents/GitHub/web/.prettierrc.json
- /Users/ps/Documents/GitHub/web/terraform/redis/staging/main.tf

---

*This document is automatically maintained by the `/analyze-tech-stack` command.*
*Please keep rationale sections and manual enhancements up to date as the stack evolves.*

*Last updated: 2025-11-08*
