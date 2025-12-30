# Error Handling System

The devorch CLI uses a comprehensive error handling system with clear error codes, helpful messages, and actionable suggestions.

## Error Categories

### User Errors (E001-E099)
Issues caused by invalid user input or configuration:
- **E001**: Config file not found
- **E002**: Invalid YAML syntax
- **E003**: Missing preset or components
- **E004**: Invalid preset name
- **E005**: Invalid component name
- **E006**: Operation cancelled

### System Errors (E100-E199)
Issues with the local system environment:
- **E100**: File permission denied
- **E101**: Directory creation failed
- **E102**: File not found
- **E103**: GitHub CLI not found
- **E104**: GitHub CLI not authenticated
- **E105**: Insufficient disk space

### Network Errors (E200-E299)
Issues with network operations and GitHub API:
- **E200**: Failed to fetch from GitHub
- **E201**: GitHub API rate limit exceeded
- **E202**: Repository not found
- **E203**: Failed to create pull request
- **E204**: Network timeout

### Validation Errors (E300-E399)
Schema and data validation issues:
- **E300**: Schema validation failed
- **E301**: Missing required field
- **E302**: Invalid field type
- **E303**: Invalid field value
- **E304**: Config file is empty

### Internal Errors (E400-E499)
Unexpected errors and bugs:
- **E400**: Unexpected error
- **E401**: Invalid internal state
- **E402**: Compilation failed

## Error Structure

Every error includes:
1. **Error Code**: Unique identifier (e.g., E001)
2. **Category**: Type of error (User, System, Network, Validation, Internal)
3. **Message**: Clear description of what went wrong
4. **Context**: Relevant details (file path, field name, value, etc.)
5. **Suggestions**: Actionable steps to fix the issue
6. **Documentation Link**: URL to relevant docs (when applicable)

## Example Error Output

```
[E001] User Error
Config file not found

Details:
  searchedPaths: ['/path/to/devorch.config.yml', '/path/to/devorch.config.yaml']
  operation: load-config

Suggestions:
  - Run 'devorch install' to create a config file
  - Check if you are in the correct directory
  - Verify the config file name is devorch.config.yml or devorch.config.yaml
```

## Using Error Classes

### Throwing Errors

```typescript
import { UserError, ValidationError, SystemError, NetworkError } from './utils/errors.js';

// User error
if (!configPath) {
  throw UserError.configNotFound(['path1', 'path2']);
}

// Validation error
if (isEmpty) {
  throw ValidationError.emptyConfig(filePath);
}

// System error
if (!ghInstalled) {
  throw SystemError.ghNotFound();
}

// Network error
if (rateLimited) {
  throw NetworkError.rateLimitExceeded(resetTime);
}
```

### Converting Errors

The `toDevOrchError` function converts any error to a DevOrchError:

```typescript
import { toDevOrchError } from './utils/errors.js';

try {
  // Some operation
} catch (err) {
  throw toDevOrchError(err, 'operation-name');
}
```

This automatically handles:
- Zod validation errors → ValidationError
- Node.js ENOENT errors → SystemError.fileNotFound
- Node.js EACCES/EPERM errors → SystemError.permissionDenied
- Node.js ENOSPC errors → SystemError.insufficientDiskSpace
- Other errors → InternalError

### Global Error Handler

The global error handler in `index.ts` catches all unhandled errors and formats them consistently:

```typescript
main().catch((err) => {
  handleError(err, 'main');
});

process.on('unhandledRejection', (reason) => {
  handleError(reason, 'unhandled-rejection');
});

process.on('uncaughtException', (err) => {
  handleError(err, 'uncaught-exception');
});
```

## Best Practices

1. **Use specific error codes**: Choose the most appropriate error code for the situation
2. **Provide context**: Include all relevant details (file paths, values, etc.)
3. **Add custom suggestions**: Include suggestions specific to the error context
4. **Keep messages clear**: Explain what happened and why
5. **Make errors actionable**: Tell users exactly what to do next
6. **Test error paths**: Ensure error messages are helpful and accurate

## Adding New Errors

To add a new error:

1. Add error definition to `error-codes.ts`:
```typescript
E099: {
  code: 'E099',
  category: 'User',
  title: 'New error type',
  suggestions: [
    'Step 1 to fix',
    'Step 2 to fix',
  ],
  docsUrl: 'https://docs.example.com',
}
```

2. Add static factory method to appropriate error class in `errors.ts`:
```typescript
static newError(param: string, context: ErrorContext = {}): UserError {
  return new UserError(
    'E099',
    `Description of error: ${param}`,
    {
      ...context,
      param,
      operation: 'operation-name',
    }
  );
}
```

3. Use the error in your code:
```typescript
throw UserError.newError('value', { additionalContext: 'data' });
```
