# Template Compilation System

**How templates are processed and compiled at install time.**

## Overview

The template compilation system transforms markdown source templates into final output by:
- **Injecting partials** - Reusable content snippets via `{{partials.name}}`
- **Resolving dependencies** - Auto-including required subagents and skills
- **Filtering frontmatter** - Agent-specific configurations
- **Merging context training** - Injecting repository-specific customizations
- **Validating structure** - Ensuring templates meet requirements

**Key principle:** Users see compiled output, not source templates.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Source Template (templates/commands/my-command.md)         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ---                                                  │   │
│  │ name: my-command                                     │   │
│  │ dependencies:                                        │   │
│  │   subagents: [my-subagent]                           │   │
│  │ partials:                                            │   │
│  │   step1: shared/workflows/step1.md                   │   │
│  │ ---                                                  │   │
│  │ # My Command                                         │   │
│  │ {{partials.step1}}                                   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Compilation Pipeline (MarkdownDI)                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 1. Extract Frontmatter                               │   │
│  │ 2. Resolve Dependencies                              │   │
│  │ 3. Process Partials                                  │   │
│  │ 4. Merge Context Training                            │   │
│  │ 5. Filter for Agent                                  │   │
│  │ 6. Validate Structure                                │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Compiled Output (.claude/agents/my-command.md)             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ---                                                  │   │
│  │ name: my-command                                     │   │
│  │ ---                                                  │   │
│  │ # My Command                                         │   │
│  │ [Injected content from step1.md]                     │   │
│  │ [Injected context training]                          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. MarkdownDI Class

**File:** `src/cli/lib/markdown-di/index.ts`

Main entry point for template compilation:

```typescript
class MarkdownDI {
  // Process a single template
  async process(options: ProcessOptions): Promise<ProcessResult>

  // Process multiple templates in batch
  async processBatch(items: BatchItem[]): Promise<BatchResult>
}
```

**ProcessOptions:**
```typescript
interface ProcessOptions {
  content: string;           // Template markdown content
  baseDir: string;           // Base directory for resolving paths
  currentFile?: string;      // Path to current file being processed
  mode?: 'build' | 'dev';    // Compilation mode
  mustache?: Record<string, any>; // Mustache variables
  onBeforeCompile?: Hook;    // Pre-compilation hook
}
```

**ProcessResult:**
```typescript
interface ProcessResult {
  frontmatter: FrontmatterData;  // Parsed and processed frontmatter
  body: string;                  // Compiled body content
  errors: CompilationError[];    // Validation/compilation errors
  dependencies: string[];        // Resolved dependency paths
}
```

### 2. Partial Injection

**Mustache variables** for content injection:

#### Syntax

```markdown
---
partials:
  step1: shared/workflows/planning/step1.md
  step2: shared/workflows/planning/step2.md
---

# My Command

## Step 1
{{partials.step1}}

## Step 2
{{partials.step2}}
```

#### Resolution

Partials are resolved relative to `templates/` directory:
- `shared/workflows/planning/step1.md` → `templates/shared/workflows/planning/step1.md`

#### Nested Partials

Partials can include other partials:

```markdown
<!-- templates/shared/workflows/base.md -->
---
partials:
  substep: shared/workflows/substep.md
---

Base content here.
{{partials.substep}}
```

**Circular dependency detection** prevents infinite loops.

### 3. Dependency Resolution

**File:** `src/cli/lib/markdown-di/resolver.ts`

#### DependencyResolver

Resolves and validates template dependencies:

```typescript
class DependencyResolver {
  // Build complete dependency graph
  resolve(
    frontmatter: FrontmatterData,
    context: ProcessingContext
  ): DependencyGraph
}
```

**Dependency types:**
- Commands → Subagents (multi-agent orchestration)
- Commands → Skills (knowledge injection)
- Subagents → Skills (knowledge only)

**Validation:**
- No circular dependencies
- All dependencies exist
- Correct dependency hierarchy

#### CircularDependencyDetector

Prevents circular partial/dependency chains:

```typescript
class CircularDependencyDetector {
  check(graph: DependencyGraph): CircularDependency[]
}
```

**Example error:**
```
Circular dependency detected:
  my-command.md → partial-a.md → partial-b.md → partial-a.md
```

### 4. Frontmatter Processing

**File:** `src/cli/lib/markdown-di/processor.ts`

#### FrontmatterProcessor

Extracts and validates YAML frontmatter:

```typescript
class FrontmatterProcessor {
  extract(content: string): {
    frontmatter: FrontmatterData;
    body: string;
    errors: Error[];
  }
}
```

**Features:**
- YAML parsing with error recovery
- Schema validation
- Type coercion
- Default value injection

#### ContentProcessor

Processes markdown body with Mustache:

```typescript
class ContentProcessor {
  process(
    body: string,
    variables: Record<string, any>,
    context: ProcessingContext
  ): string
}
```

### 5. Dynamic Fields

Templates can declare fields that are populated at compile time:

```yaml
---
name: my-command
mode: $dynamic  # Will be provided by hook or variant
---
```

**Hook-based population:**

```typescript
await markdownDI.process({
  content,
  onBeforeCompile: async (ctx) => {
    return {
      mode: 'multi-agent',
      // ... other dynamic fields
    };
  },
});
```

**Variant-based population:**

Used for single-agent vs multi-agent versions:

```typescript
const variants = [
  { mode: 'single-agent', variant: 'single-agent' },
  { mode: 'multi-agent', variant: 'multi-agent' }
];

await markdownDI.processBatch([
  {
    content,
    variants,
    outputPath: 'output/{variant}/command.md'
  }
]);
```

### 6. Agent Filtering

Frontmatter can be filtered per AI agent:

```yaml
---
name: my-command
for_claude_code:
  custom_instructions: "Claude-specific instructions"
---
```

**At compile time**, the appropriate section is included based on target agent.

### 7. Context Training Injection

**Context training** provides repository-specific customizations injected into templates:

```yaml
---
name: my-subagent
context_training_role: specification  # or implementation, or none
---
```

**How it works:**
- Subagents with `context_training_role: specification` get `specification.md` appended
- Subagents with `context_training_role: implementation` get `implementation.md` appended
- Subagents with `context_training_role: none` get no context training

**Merging:**
- Implementers: Core template + `context-training/{name}/implementers/*.md`
- Verifiers: Core template + `context-training/{name}/verifiers/*.md`
- Result: Domain-specific agents with repository preferences

**Sources:**
- `devorch/context-training/{name}/specification.md` - Spec writing guidelines
- `devorch/context-training/{name}/implementation.md` - Available implementers/verifiers
- `devorch/context-training/{name}/implementers/` - Implementation customizations
- `devorch/context-training/{name}/verifiers/` - Verification customizations

## Mustache Variables

### Available Variables

```yaml
# From frontmatter
{{name}}
{{description}}
{{mode}}

# Custom variables
{{mustache.projectName}}
{{mustache.repoUrl}}

# Partials (special)
{{partials.partial_name}}
```

### Conditional Rendering

Mustache supports conditionals:

```markdown
{{#mustache.hasTesting}}
## Testing
Run tests with: `npm test`
{{/mustache.hasTesting}}
```

### Iteration

```markdown
{{#mustache.dependencies}}
- {{name}}: {{version}}
{{/mustache.dependencies}}
```

## Validation

### PartialValidator

**File:** `src/cli/lib/markdown-di/validator.ts`

Validates partial references:

```typescript
class PartialValidator {
  validate(
    partials: Record<string, string>,
    baseDir: string
  ): ValidationError[]
}
```

**Checks:**
- ✅ Partial files exist
- ✅ No circular references
- ✅ Valid partial paths
- ✅ Readable files

### Schema Validation

Frontmatter is validated against Zod schemas:

**File:** `src/cli/schemas/template-schema.ts`

```typescript
const CommandSchema = z.object({
  name: z.string(),
  description: z.string(),
  mode: z.enum(['single-agent', 'multi-agent']),
  dependencies: DependenciesSchema.optional(),
  partials: z.record(z.string()).optional(),
  // ...
});
```

## Compilation Modes

### Build Mode (Production)

```typescript
await markdownDI.process({
  content,
  mode: 'build'
});
```

**Characteristics:**
- Strict validation
- All errors are fatal
- Full optimization
- No debug output

### Dev Mode (Development)

```typescript
await markdownDI.process({
  content,
  mode: 'dev'
});
```

**Characteristics:**
- Relaxed validation
- Warning-only errors
- Source maps
- Debug output

## Batch Processing

**For efficiency**, compile multiple templates in parallel:

```typescript
const batch = new MarkdownDIBatch();
await batch.processBatch([
  {
    content: template1Content,
    outputPath: '.claude/agents/command1.md',
    baseDir: 'templates/'
  },
  {
    content: template2Content,
    outputPath: '.claude/agents/command2.md',
    baseDir: 'templates/'
  }
]);
```

**Features:**
- Parallel processing
- Shared partial cache
- Dependency deduplication
- Error aggregation

## Error Handling

### Error Types

```typescript
type CompilationError = {
  type: 'schema' | 'partial' | 'circular' | 'validation';
  message: string;
  location?: string;
  details?: any;
};
```

### Error Recovery

**Graceful degradation:**
- Missing partials → Warning, continue with placeholder
- Invalid frontmatter → Use defaults where possible
- Circular dependencies → Fatal error (cannot recover)

**Error reporting:**
```typescript
const result = await markdownDI.process(options);

if (result.errors.length > 0) {
  for (const error of result.errors) {
    logger.error(`${error.type}: ${error.message}`, {
      location: error.location,
      details: error.details
    });
  }
}
```

## Testing Compilation

### Unit Testing

```typescript
import { MarkdownDI } from '@/lib/markdown-di';

test('compiles template with partials', async () => {
  const markdownDI = new MarkdownDI();

  const result = await markdownDI.process({
    content: `
      ---
      name: test
      partials:
        step1: shared/workflows/step1.md
      ---
      {{partials.step1}}
    `,
    baseDir: 'templates/'
  });

  expect(result.errors).toHaveLength(0);
  expect(result.body).toContain('Step 1 content');
});
```

### Integration Testing

```bash
# Test full install process with compilation
bun test tests/integration/compilation.test.ts
```

## Debugging

### Enable Debug Logging

```typescript
import { logger } from '@/utils/logger';

logger.level = 'debug';

const result = await markdownDI.process({
  content,
  baseDir: 'templates/'
});
```

**Debug output:**
- Partial resolution paths
- Dependency graph
- Frontmatter transformations
- Mustache variable substitutions

### Inspect Compiled Output

Compiled templates are written to:
- Claude Code: `.claude/agents/devorch/`
- Claude Code: `.claude/agents/devorch/`

Review these files to see final compiled output.

## Performance

### Optimization Strategies

1. **Batch processing** - Compile multiple templates together
2. **Partial caching** - Reuse loaded partials across templates
3. **Parallel resolution** - Resolve dependencies concurrently
4. **Lazy loading** - Only load partials when needed

### Benchmarks

Typical compilation times:
- Single template: ~10-50ms
- Batch of 50 templates: ~200-500ms
- Full install (all templates): ~1-2s

## Contributing

### Adding New Features

**Common extensions:**
1. New Mustache helper functions
2. Custom validation rules
3. Additional frontmatter fields
4. New injection points

**Process:**
1. Add to schema: `src/cli/schemas/template-schema.ts`
2. Implement in processor: `src/cli/lib/markdown-di/processor.ts`
3. Add tests: `src/cli/lib/markdown-di/*.test.ts`
4. Update docs: This file

### Testing Changes

```bash
# Run all markdown-di tests
bun test src/cli/lib/markdown-di

# Watch mode
bun test src/cli/lib/markdown-di --watch

# Coverage
bun test src/cli/lib/markdown-di --coverage
```

## FAQ

**Q: Why use Mustache instead of another templating language?**
A: Mustache is logic-less, preventing templates from becoming too complex. It's also widely supported and easy to learn.

**Q: Can I use JavaScript in templates?**
A: No. Templates are declarative markdown. Complex logic should be in hooks or the compilation system.

**Q: How do I debug partial resolution issues?**
A: Enable debug logging and check the partial resolution paths. Ensure paths are relative to `templates/` directory.

**Q: Can partials have frontmatter?**
A: Yes! Partials are full templates and can have their own frontmatter and nested partials.

**Q: What happens if a partial is missing?**
A: In build mode, it's an error. In dev mode, it's a warning with a placeholder.

**Q: Can I pass variables to partials?**
A: No direct variable passing. Partials access the same Mustache context as the parent template.

---

For implementation details, see the source code in `src/cli/lib/markdown-di/` or [open a discussion](https://github.com/guicheffer/devorch/discussions).
