# Detect Project Dependencies

This workflow scans the project filesystem to detect dependency manifests, infrastructure configs, and framework configuration files.

## Step 1: Scan for Dependency Manifests

Use the Glob tool to search for common dependency files:

### JavaScript/TypeScript
Search for:
- `**/package.json`
- `**/bun.lockb`
- `**/package-lock.json`
- `**/yarn.lock`
- `**/pnpm-lock.yaml`

### Python
Search for:
- `**/requirements.txt`
- `**/pyproject.toml`
- `**/Pipfile`
- `**/setup.py`
- `**/poetry.lock`

### Go
Search for:
- `**/go.mod`
- `**/go.sum`

### Rust
Search for:
- `**/Cargo.toml`
- `**/Cargo.lock`

### Ruby
Search for:
- `**/Gemfile`
- `**/Gemfile.lock`

### PHP
Search for:
- `**/composer.json`
- `**/composer.lock`

### Java
Search for:
- `**/pom.xml`
- `**/build.gradle`
- `**/build.gradle.kts`

### C#/.NET
Search for:
- `**/*.csproj`
- `**/*.sln`
- `**/packages.config`

## Step 2: Scan for Infrastructure Configs

### Docker
Search for:
- `**/Dockerfile`
- `**/docker-compose.yml`
- `**/docker-compose.yaml`
- `**/.dockerignore`

### Kubernetes
Search for:
- `k8s/**/*.yaml`
- `k8s/**/*.yml`
- `kubernetes/**/*.yaml`
- `kubernetes/**/*.yml`

### Infrastructure as Code
Search for:
- `**/*.tf` (Terraform)
- `pulumi/**/*`
- `cloudformation/**/*.yaml`

## Step 3: Scan for Framework/Tool Configs

### Build Tools
Search for:
- `**/vite.config.ts`
- `**/vite.config.js`
- `**/webpack.config.js`
- `**/rollup.config.js`
- `**/esbuild.config.js`

### Framework Configs
Search for:
- `**/next.config.js`
- `**/next.config.mjs`
- `**/nuxt.config.js`
- `**/nuxt.config.ts`
- `**/svelte.config.js`
- `**/astro.config.mjs`
- `**/remix.config.js`

### TypeScript/JavaScript
Search for:
- `**/tsconfig.json`
- `**/jsconfig.json`

### Linting/Formatting
Search for:
- `**/.eslintrc.js`
- `**/.eslintrc.json`
- `**/eslint.config.js`
- `**/.prettierrc`
- `**/.prettierrc.json`
- `**/biome.json`

### Testing
Search for:
- `**/jest.config.js`
- `**/vitest.config.ts`
- `**/playwright.config.ts`
- `**/cypress.config.js`

## Step 4: Read Detected Files

For each detected file:
1. Use the Read tool to read the file contents
2. Store the file path and contents for analysis

## Step 5: Report Findings

Organize findings into categories:

```markdown
### Dependency Manifests Found
- path/to/package.json (JavaScript/Node.js)
- path/to/go.mod (Go)

### Infrastructure Configs Found
- Dockerfile (Docker)
- docker-compose.yml (Docker Compose)

### Framework/Tool Configs Found
- next.config.js (Next.js)
- tsconfig.json (TypeScript)
```

## Important Notes

- Use Glob tool for efficient file discovery
- Use Read tool to get file contents
- Focus on detection, not analysis (analysis comes in next step)
- Include full file paths relative to project root
- If no files found in a category, note "None found"
