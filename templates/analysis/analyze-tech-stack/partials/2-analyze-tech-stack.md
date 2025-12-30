# Analyze Tech Stack

This workflow parses detected dependency files, extracts technology information, and categorizes the tech stack.

## Step 1: Parse Dependency Manifests

For each detected dependency file, parse and extract technologies with their versions.

### package.json (JavaScript/TypeScript)

Parse the JSON file and extract from `dependencies`, `devDependencies`, and `engines`:

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "next": "^14.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

Extract:
- React 18.2.0 (dependency)
- Next.js 14.0.0 (dependency)
- TypeScript 5.0.0 (dev dependency)
- Node.js 20.x (required runtime)

### pyproject.toml (Python)

Parse TOML format and extract from `[project.dependencies]` or `[tool.poetry.dependencies]`:

```toml
[project]
dependencies = [
    "fastapi>=0.100.0",
    "sqlalchemy>=2.0.0"
]
```

Extract: FastAPI 0.100.0+, SQLAlchemy 2.0.0+

### go.mod (Go)

Parse Go module format:

```
module example.com/myapp
go 1.21

require (
    github.com/gin-gonic/gin v1.9.1
    github.com/lib/pq v1.10.9
)
```

Extract:
- Go 1.21 (language version)
- Gin 1.9.1 (web framework)
- lib/pq 1.10.9 (PostgreSQL driver)

### Cargo.toml (Rust)

Parse TOML format:

```toml
[dependencies]
tokio = { version = "1.0", features = ["full"] }
axum = "0.6"
```

Extract: Tokio 1.0, Axum 0.6

### Gemfile (Ruby)

Parse Ruby DSL:

```ruby
gem 'rails', '~> 7.0.0'
gem 'pg', '~> 1.4'
```

Extract: Rails 7.0.0, PostgreSQL (pg gem)

### composer.json (PHP)

Parse JSON:

```json
{
  "require": {
    "laravel/framework": "^10.0",
    "php": "^8.1"
  }
}
```

Extract: Laravel 10.0, PHP 8.1

### pom.xml (Java/Maven)

Parse XML for dependencies and plugins:

```xml
<dependencies>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
    <version>3.1.0</version>
  </dependency>
</dependencies>
```

Extract: Spring Boot 3.1.0

### build.gradle (Java/Kotlin)

Parse Groovy/Kotlin DSL:

```gradle
dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-web:3.1.0'
}
```

Extract: Spring Boot 3.1.0

## Step 2: Infer Technologies from Configs

Certain configuration files indicate specific frameworks or tools are in use:

### Framework Detection
- `next.config.js` or `next.config.mjs` → Next.js (get version from package.json)
- `nuxt.config.js` or `nuxt.config.ts` → Nuxt.js
- `vite.config.ts` or `vite.config.js` → Vite build tool
- `astro.config.mjs` → Astro framework
- `svelte.config.js` → SvelteKit
- `remix.config.js` → Remix framework

### TypeScript/JavaScript Config
- `tsconfig.json` → TypeScript is configured (get version from package.json)
- `jsconfig.json` → JavaScript with JSDoc/type checking

### Infrastructure
- `Dockerfile` → Docker containerization
- `docker-compose.yml` → Docker Compose orchestration
- `k8s/**/*.yaml` → Kubernetes deployment

### Testing Frameworks
- `jest.config.js` → Jest testing
- `vitest.config.ts` → Vitest testing
- `playwright.config.ts` → Playwright E2E testing
- `cypress.config.js` → Cypress E2E testing

### Code Quality Tools
- `.eslintrc.*` or `eslint.config.js` → ESLint
- `.prettierrc` or `.prettierrc.json` → Prettier
- `biome.json` → Biome

## Step 3: Categorize Technologies

Organize all extracted technologies into these standardized categories:

### Frontend
- **UI Libraries**: React, Vue, Angular, Svelte, Solid
- **Meta-frameworks**: Next.js, Nuxt, SvelteKit, Astro, Remix
- **Styling**: Tailwind CSS, Styled Components, CSS Modules, Sass, PostCSS
- **State Management**: Redux, Zustand, Pinia, MobX, Jotai, Recoil

### Backend
- **Frameworks**: Express, Fastify, NestJS, FastAPI, Django, Flask, Rails, Laravel, Gin, Actix, Axum
- **Runtime/Language**: Node.js, Bun, Deno, Python, Go, Rust, Ruby, PHP, Java, C#
- **Database**: PostgreSQL, MySQL, MongoDB, Redis, SQLite, Cassandra
- **ORM/Query Builders**: Prisma, TypeORM, Drizzle, SQLAlchemy, Sequelize, ActiveRecord, Eloquent, GORM

### AI/ML
- **Language Models**: OpenAI, Anthropic Claude, HuggingFace, Cohere
- **ML Frameworks**: TensorFlow, PyTorch, scikit-learn, JAX
- **Vector Databases**: Pinecone, Weaviate, Qdrant, ChromaDB, Milvus

### Infrastructure
- **Containerization**: Docker, Docker Compose, Podman
- **Orchestration**: Kubernetes, Docker Swarm, Nomad
- **CI/CD**: GitHub Actions, GitLab CI, CircleCI, Jenkins
- **Cloud Providers**: AWS, GCP, Azure, Vercel, Netlify, Railway, Fly.io
- **Monitoring**: Sentry, Datadog, New Relic, Prometheus, Grafana

### Development Tools
- **Build Tools**: Vite, Webpack, esbuild, Rollup, Turbopack, Parcel
- **Package Managers**: npm, Yarn, pnpm, Bun, Poetry, Cargo, Bundler
- **Testing**: Jest, Vitest, Playwright, Cypress, pytest, RSpec, JUnit
- **Code Quality**: ESLint, Prettier, Biome, Ruff, Clippy, Rubocop
- **Type Systems**: TypeScript, Flow, PropTypes

### Security
- **Authentication**: Auth0, NextAuth.js, Passport.js, Devise, Clerk
- **Secrets Management**: dotenv, Vault, AWS Secrets Manager
- **Security Tools**: Helmet.js, CORS middleware, rate-limiters

## Step 4: Extract Version Information

For each technology, record:
- **Name**: Full technology name
- **Version**: Specific version or version range
- **Category**: Primary category
- **Source**: Where detected (filename)
- **Type**: dependency, devDependency, config, inferred

## Step 5: Format Analysis Results

Return structured analysis in this format:

```markdown
## Tech Stack Analysis

### Frontend
- **React** (v18.2.0)
  - Source: package.json (dependency)
  - Type: UI Library

- **Next.js** (v14.0.0)
  - Source: package.json (dependency), next.config.js detected
  - Type: Meta-framework

- **Tailwind CSS** (v3.3.0)
  - Source: package.json (devDependency)
  - Type: Styling Framework

### Backend
- **Node.js** (v20.x)
  - Source: package.json (engines field)
  - Type: Runtime

- **Express** (v4.18.0)
  - Source: package.json (dependency)
  - Type: Web Framework

- **PostgreSQL** (version inferred)
  - Source: package.json (pg v8.11.0 detected)
  - Type: Database

### Infrastructure
- **Docker** (detected)
  - Source: Dockerfile, docker-compose.yml
  - Type: Containerization

- **Kubernetes** (detected)
  - Source: k8s/*.yaml configs
  - Type: Orchestration

### Development Tools
- **TypeScript** (v5.0.0)
  - Source: package.json (devDependency), tsconfig.json detected
  - Type: Type System

- **Vite** (v4.5.0)
  - Source: package.json (devDependency), vite.config.ts detected
  - Type: Build Tool

- **Jest** (v29.5.0)
  - Source: package.json (devDependency), jest.config.js detected
  - Type: Testing Framework

### Summary
- **Primary Language**: TypeScript/JavaScript
- **Runtime**: Node.js 20.x
- **Frontend Stack**: React + Next.js + Tailwind CSS
- **Backend Stack**: Node.js + Express + PostgreSQL
- **Infrastructure**: Docker + Kubernetes
- **Testing**: Jest
- **Build Tool**: Vite
```

## Important Notes

- Include version information whenever available
- Note the source file for each detection
- Mark technologies as "inferred" when not explicitly declared
- If the same technology appears in multiple places, consolidate into one entry
- For database drivers (pg, mysql2, mongodb), infer the actual database
- For cloud SDKs (aws-sdk, @google-cloud, @azure), infer cloud provider usage
- DO NOT make recommendations or suggest changes
- Focus on factual analysis of what exists in the project
