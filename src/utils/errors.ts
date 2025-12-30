import { ZodError } from 'zod';
import { colors } from './colors.js';
import { getErrorDefinition } from './error-codes.js';
import { logger } from './logger.js';

/**
 * Context information for errors
 */
export interface ErrorContext {
  [key: string]: unknown;
  filePath?: string;
  field?: string;
  value?: unknown;
  expected?: unknown;
  operation?: string;
  cliVersion?: string;
  platform?: string;
}

/**
 * Base error class for all devorch errors
 */
export abstract class DevOrchError extends Error {
  public readonly code: string;
  public readonly category: string;
  public readonly context: ErrorContext;
  public readonly suggestions: string[];
  public readonly docsUrl?: string;

  constructor(
    code: string,
    message: string,
    context: ErrorContext = {},
    suggestions: string[] = []
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = context;
    this.suggestions = suggestions;

    // Get error definition from registry
    const definition = getErrorDefinition(code);
    if (definition) {
      this.category = definition.category;
      this.suggestions = [...suggestions, ...definition.suggestions];
      this.docsUrl = definition.docsUrl;
    } else {
      this.category = 'Internal';
    }

    // Log error creation (skip E006 - user cancellation is not an error)
    if (code !== 'E006') {
      logger.error(`Error created: ${this.name}`, {
        code,
        message,
        category: this.category,
        context,
      });
    }

    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Format error for display
   */
  format(): string {
    const parts: string[] = [];

    // Header with error code and category
    parts.push(colors.red(`\n[${this.code}] ${this.category} Error`));
    parts.push(colors.bold(this.message));

    // Context details
    if (Object.keys(this.context).length > 0) {
      parts.push(`\n${colors.dim('Details:')}`);
      for (const [key, value] of Object.entries(this.context)) {
        if (value !== undefined && value !== null) {
          const displayValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : value;
          parts.push(colors.dim(`  ${key}: ${displayValue}`));
        }
      }
    }

    // Suggestions
    if (this.suggestions.length > 0) {
      parts.push(`\n${colors.yellow('Suggestions:')}`);
      for (const suggestion of this.suggestions) {
        parts.push(colors.yellow(`  - ${suggestion}`));
      }
    }

    // Documentation link
    if (this.docsUrl) {
      parts.push(`\n${colors.dim(`More info: ${this.docsUrl}`)}`);
    }

    return parts.join('\n');
  }

  /**
   * Get plain text version (for logging)
   */
  toPlainText(): string {
    const parts: string[] = [];
    parts.push(`[${this.code}] ${this.category} Error: ${this.message}`);

    if (Object.keys(this.context).length > 0) {
      parts.push('Context:');
      for (const [key, value] of Object.entries(this.context)) {
        if (value !== undefined && value !== null) {
          parts.push(`  ${key}: ${String(value)}`);
        }
      }
    }

    if (this.suggestions.length > 0) {
      parts.push(`${colors.yellow('Suggestions:')}`);
      for (const suggestion of this.suggestions) {
        parts.push(`  - ${suggestion}`);
      }
    }

    return parts.join('\n');
  }
}

/**
 * User errors - Invalid user input, config errors
 */
export class UserError extends DevOrchError {
  constructor(
    code: string,
    message: string,
    context: ErrorContext = {},
    suggestions: string[] = []
  ) {
    super(code, message, context, suggestions);
  }

  static configNotFound(searchedPaths: string[]): UserError {
    return new UserError('E001', 'Config file not found', {
      searchedPaths,
      operation: 'load-config',
    });
  }

  static invalidYaml(filePath: string, yamlError: string): UserError {
    return new UserError('E002', 'Failed to parse YAML config file', {
      filePath,
      yamlError,
      operation: 'parse-yaml',
    });
  }

  /**
   * @deprecated Use missingCommands() instead. This error is from an older version
   * when presets were used differently. Now we only require commands.
   */
  static missingPresetOrComponents(): UserError {
    return new UserError(
      'E003',
      'Config must specify either a preset or explicit component selections',
      {
        operation: 'validate-config',
      }
    );
  }

  static missingCommands(validationError?: string): UserError {
    return new UserError('E003', validationError || 'Config must specify at least one command', {
      operation: 'validate-config',
    });
  }

  static presetNotFound(presetName: string, availablePresets: string[]): UserError {
    return new UserError('E004', `Preset "${presetName}" not found`, {
      presetName,
      availablePresets,
      operation: 'load-preset',
    });
  }

  static componentNotFound(
    componentType: string,
    componentName: string,
    availableComponents: string[]
  ): UserError {
    return new UserError('E005', `${componentType} "${componentName}" not found`, {
      componentType,
      componentName,
      availableComponents: availableComponents.slice(0, 10), // Show first 10
      totalAvailable: availableComponents.length,
      operation: 'resolve-component',
    });
  }

  static cancelled(): UserError {
    return new UserError('E006', 'Operation cancelled by user', {
      operation: 'user-prompt',
    });
  }

  static invalidLocalPath(localPath: string, reason: string): UserError {
    return new UserError('E007', `Invalid local devorch path: ${reason}`, {
      localPath,
      reason,
      operation: 'validate-local-path',
    });
  }

  static contextTrainingNotFound(
    contextTrainingName: string,
    contextTrainingPath: string
  ): UserError {
    return new UserError('E008', `Context training "${contextTrainingName}" not found`, {
      contextTrainingName,
      contextTrainingPath,
      operation: 'load-context-training',
    });
  }

  static fileNotReadable(filePath: string, reason: string): UserError {
    return new UserError('E009', `Cannot read file: ${reason}`, {
      filePath,
      reason,
      operation: 'read-file',
    });
  }
}

/**
 * System errors - File permissions, disk space, command not found
 */
export class SystemError extends DevOrchError {
  constructor(
    code: string,
    message: string,
    context: ErrorContext = {},
    suggestions: string[] = []
  ) {
    super(code, message, context, suggestions);
  }

  static permissionDenied(filePath: string, operation: string): SystemError {
    return new SystemError('E100', `Permission denied: ${operation}`, {
      filePath,
      operation,
    });
  }

  static directoryCreationFailed(dirPath: string, reason: string): SystemError {
    return new SystemError('E101', 'Failed to create directory', {
      dirPath,
      reason,
      operation: 'create-directory',
    });
  }

  static fileNotFound(filePath: string, operation: string = 'read-file'): SystemError {
    return new SystemError('E102', 'File not found', {
      filePath,
      operation,
    });
  }

  static ghNotFound(): SystemError {
    return new SystemError('E103', 'GitHub CLI (gh) not found', {
      operation: 'check-gh-cli',
    });
  }

  static ghNotAuthenticated(): SystemError {
    return new SystemError('E104', 'GitHub CLI not authenticated', {
      operation: 'check-gh-auth',
    });
  }

  static insufficientDiskSpace(required?: string, available?: string): SystemError {
    return new SystemError('E105', 'Insufficient disk space', {
      required,
      available,
      operation: 'check-disk-space',
    });
  }

  static dependencyResolutionFailed(assetName: string, reason: string): SystemError {
    return new SystemError('E107', 'Failed to resolve dependencies', {
      assetName,
      reason,
      operation: 'resolve-dependencies',
    });
  }

  static binaryNotFound(binaryPath: string): SystemError {
    return new SystemError('E108', 'Binary not found', {
      binaryPath,
      operation: 'update-binary',
    });
  }

  static unsupportedPlatform(type: string, value: string): SystemError {
    return new SystemError('E107', `Unsupported ${type}: ${value}`, {
      platformType: type,
      platformValue: value,
      operation: 'check-platform',
    });
  }

  static updateScriptFailed(scriptPath: string, cause?: unknown): SystemError {
    return new SystemError('E108', 'Failed to spawn update script', {
      scriptPath,
      cause: cause instanceof Error ? cause.message : String(cause),
      operation: 'spawn-update-script',
    });
  }

  static downloadFailed(platform: string, triedAssets: string[], reason?: string): SystemError {
    return new SystemError(
      'E110',
      `No compatible binary found for ${platform}. Tried: ${triedAssets.join(', ')}.${reason ? ` ${reason}` : ''}`,
      {
        platform,
        triedAssets,
        operation: 'download-binary',
      }
    );
  }

  static backupRestorationFailed(
    configPath: string,
    backupPath: string,
    originalError: unknown,
    restoreError: unknown
  ): SystemError {
    return new SystemError(
      'E109',
      'Config update failed and backup restoration failed. Manual intervention required.',
      {
        configPath,
        backupPath,
        originalError:
          originalError instanceof Error ? originalError.message : String(originalError),
        restoreError: restoreError instanceof Error ? restoreError.message : String(restoreError),
        operation: 'restore-config-backup',
      },
      [
        `Manually restore config from backup at: ${backupPath}`,
        'Check file permissions and disk space',
        'Contact support if issue persists',
      ]
    );
  }
}

/**
 * Network errors - GitHub API failures, download errors
 */
export class NetworkError extends DevOrchError {
  constructor(
    code: string,
    message: string,
    context: ErrorContext = {},
    suggestions: string[] = []
  ) {
    super(code, message, context, suggestions);
  }

  static fetchFailed(url: string, statusCode?: number, statusText?: string): NetworkError {
    return new NetworkError('E200', 'Failed to fetch from GitHub', {
      url,
      statusCode,
      statusText,
      operation: 'fetch-github',
    });
  }

  static rateLimitExceeded(resetTime?: string): NetworkError {
    return new NetworkError('E201', 'GitHub API rate limit exceeded', {
      resetTime,
      operation: 'github-api',
    });
  }

  static repositoryNotFound(repository: string): NetworkError {
    return new NetworkError('E202', 'Repository not found', {
      repository,
      operation: 'fetch-repository',
    });
  }

  static prCreationFailed(reason: string, branch?: string): NetworkError {
    return new NetworkError('E203', 'Failed to create pull request', {
      reason,
      branch,
      operation: 'create-pr',
    });
  }

  static timeout(operation: string, timeoutMs: number): NetworkError {
    return new NetworkError('E204', 'Network operation timed out', {
      operation,
      timeoutMs,
    });
  }
}

/**
 * Validation errors - Schema validation failures
 */
export class ValidationError extends DevOrchError {
  constructor(
    code: string,
    message: string,
    context: ErrorContext = {},
    suggestions: string[] = []
  ) {
    super(code, message, context, suggestions);
  }

  static schemaValidationFailed(field: string, error: string, value?: unknown): ValidationError {
    return new ValidationError('E300', `Schema validation failed for field: ${field}`, {
      field,
      value,
      error,
      operation: 'validate-schema',
    });
  }

  static missingRequiredField(field: string, schema: string): ValidationError {
    return new ValidationError('E301', `Missing required field: ${field}`, {
      field,
      schema,
      operation: 'validate-required-fields',
    });
  }

  static invalidFieldType(
    field: string,
    expectedType: string,
    actualType: string,
    value?: unknown
  ): ValidationError {
    return new ValidationError('E302', `Invalid type for field: ${field}`, {
      field,
      expected: expectedType,
      actual: actualType,
      value,
      operation: 'validate-field-type',
    });
  }

  static invalidFieldValue(field: string, value: any, expected: string): ValidationError {
    return new ValidationError('E303', `Invalid value for field: ${field}`, {
      field,
      value,
      expected,
      operation: 'validate-field-value',
    });
  }

  static emptyConfig(filePath: string): ValidationError {
    return new ValidationError('E304', 'Config file is empty', {
      filePath,
      operation: 'validate-config',
    });
  }

  /**
   * Create validation error from Zod error
   */
  static fromZodError(zodError: ZodError, context: ErrorContext = {}): ValidationError {
    const issues = zodError.issues
      .map((issue) => {
        const field = issue.path.join('.');
        const message = issue.message;
        return `  - ${field}: ${message}`;
      })
      .join('\n');

    return new ValidationError(
      'E300',
      `Schema validation failed:\n${issues}`,
      {
        ...context,
        zodIssues: zodError.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
          code: i.code,
        })),
        operation: 'validate-schema',
      },
      [
        'Fix the validation errors listed above',
        'Refer to the schema documentation for valid field formats',
      ]
    );
  }
}

/**
 * Internal errors - Unexpected states, bugs
 */
export class InternalError extends DevOrchError {
  constructor(
    code: string,
    message: string,
    context: ErrorContext = {},
    suggestions: string[] = []
  ) {
    super(code, message, context, suggestions);
  }

  static unexpected(message: string, context: ErrorContext = {}): InternalError {
    return new InternalError('E400', message, {
      ...context,
      operation: 'unexpected-error',
    });
  }

  static invalidState(message: string, context: ErrorContext = {}): InternalError {
    return new InternalError('E401', message, {
      ...context,
      operation: 'invalid-state',
    });
  }

  static compilationFailed(reason: string, context: ErrorContext = {}): InternalError {
    return new InternalError('E402', `Compilation failed: ${reason}`, {
      ...context,
      reason,
      operation: 'compile-config',
    });
  }

  static unknownSchemaType(schemaType: string): InternalError {
    return new InternalError('E403', `Unknown schema type: ${schemaType}`, {
      schemaType,
      operation: 'load-schema',
    });
  }

  static incompatibleVersionInfoSchema(
    found: number,
    supported: number,
    context: ErrorContext = {}
  ): InternalError {
    return new InternalError(
      'E404',
      `Incompatible version-info.json schema: found v${found}, CLI supports v${supported}`,
      {
        ...context,
        foundSchemaVersion: found,
        supportedSchemaVersion: supported,
        operation: 'fetch-version-info',
      },
      ['Update devorch CLI to the latest version']
    );
  }
}

/**
 * Type guard to check if error is a DevOrchError
 */
export function isDevOrchError(error: any): error is DevOrchError {
  return error instanceof DevOrchError;
}

/**
 * Convert any error to DevOrchError
 */
export function toDevOrchError(error: any, operation?: string): DevOrchError {
  if (isDevOrchError(error)) {
    return error;
  }

  if (error instanceof ZodError) {
    return ValidationError.fromZodError(error, { operation });
  }

  // Handle Node.js system errors
  if (error.code === 'ENOENT') {
    return SystemError.fileNotFound(error.path || 'unknown', operation || 'file-operation');
  }

  if (error.code === 'EACCES' || error.code === 'EPERM') {
    return SystemError.permissionDenied(error.path || 'unknown', operation || 'file-operation');
  }

  if (error.code === 'ENOSPC') {
    return SystemError.insufficientDiskSpace('unknown', 'unknown');
  }

  // Generic internal error
  return InternalError.unexpected(error.message || 'An unexpected error occurred', {
    operation,
    originalError: error.toString(),
    stack: error.stack,
  });
}

/**
 * Add system context to error context
 */
export function addSystemContext(context: ErrorContext = {}): ErrorContext {
  return {
    ...context,
    cliVersion: process.env.BUILD_VERSION || 'dev',
    platform: process.platform,
    nodeVersion: process.version,
  };
}
