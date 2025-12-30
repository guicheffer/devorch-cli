/**
 * Error code registry for devorch CLI
 *
 * Format: [CATEGORY][NUMBER]
 * - E001-E099: User errors (invalid input, config issues)
 * - E100-E199: System errors (file permissions, disk space, dependencies)
 * - E200-E299: Network errors (GitHub API, downloads)
 * - E300-E399: Validation errors (schema validation, config validation)
 * - E400-E499: Internal errors (unexpected states, bugs)
 */

export interface ErrorDefinition {
  code: string;
  category: ErrorCategory;
  title: string;
  suggestions: string[];
  docsUrl?: string;
}

export type ErrorCategory = 'User' | 'System' | 'Network' | 'Validation' | 'Internal';

export const ERROR_REGISTRY: Record<string, ErrorDefinition> = {
  // User Errors (E001-E099)
  E001: {
    code: 'E001',
    category: 'User',
    title: 'Config file not found',
    suggestions: [
      "Run 'devorch install' to create a config file",
      'Check if you are in the correct directory',
      'Verify the config file name is devorch.config.yml or devorch.config.yaml',
    ],
  },
  E002: {
    code: 'E002',
    category: 'User',
    title: 'Invalid YAML syntax',
    suggestions: [
      'Check for proper indentation (use spaces, not tabs)',
      'Ensure all quotes are properly closed',
      'Verify colons have a space after them',
      'Use a YAML validator to check syntax',
    ],
    docsUrl: 'https://yaml.org/spec/1.2/spec.html',
  },
  E003: {
    code: 'E003',
    category: 'User',
    title: 'Config must specify at least one command',
    suggestions: [
      'Add commands to your config: commands: ["new-spec", "implement-spec"]',
      "Run 'devorch add command' to add commands to your config",
      'Check example configs for proper formatting',
    ],
  },
  E004: {
    code: 'E004',
    category: 'User',
    title: 'Invalid preset name',
    suggestions: [
      'Presets have been deprecated - use context-training instead',
      "Run '/train-context' to set up repository-specific context training",
      'Check the documentation for migration from presets to context-training',
    ],
  },
  E005: {
    code: 'E005',
    category: 'User',
    title: 'Invalid component name',
    suggestions: [
      'Check available components in templates/ directory',
      'View available subagents in templates/*/subagents/',
      'View available commands in templates/*/commands/',
      'Check spelling of component names',
    ],
  },
  E006: {
    code: 'E006',
    category: 'User',
    title: 'Operation cancelled by user',
    suggestions: ['Run the command again when ready', 'Use --help flag to see available options'],
  },
  E007: {
    code: 'E007',
    category: 'User',
    title: 'Invalid local devorch path',
    suggestions: [
      'Verify the path exists and is accessible',
      'Check that the path contains a valid devorch repository',
      'Ensure the src/ directory exists in the path',
    ],
  },
  E008: {
    code: 'E008',
    category: 'User',
    title: 'Context training not found',
    suggestions: [
      'Check that the context training exists in devorch/context-training/ directory',
      'Verify the context training name matches the directory name',
      "Run 'devorch list-context-trainings' to see available context trainings",
      'Ensure implementers/ directory exists with at least one .md file',
    ],
  },
  E009: {
    code: 'E009',
    category: 'User',
    title: 'File not readable',
    suggestions: [
      'Verify the file exists and is accessible',
      'Check file permissions with: ls -la',
      'Ensure the file is not corrupted',
      'Check if file is locked by another process',
    ],
  },
  // System Errors (E100-E199)
  E100: {
    code: 'E100',
    category: 'System',
    title: 'File permission denied',
    suggestions: [
      'Check file permissions with: ls -la',
      'Ensure you have write access to the directory',
      'Try running with appropriate permissions',
      'Check if file is locked by another process',
    ],
  },
  E101: {
    code: 'E101',
    category: 'System',
    title: 'Directory creation failed',
    suggestions: [
      'Verify you have write permissions in the parent directory',
      'Check available disk space',
      'Ensure parent directory exists',
    ],
  },
  E102: {
    code: 'E102',
    category: 'System',
    title: 'File not found',
    suggestions: [
      'Verify the file path is correct',
      'Check if the file was moved or deleted',
      'Ensure you are in the correct directory',
    ],
  },
  E103: {
    code: 'E103',
    category: 'System',
    title: 'GitHub CLI not found',
    suggestions: [
      'Install GitHub CLI: https://cli.github.com/',
      'Verify gh is in your PATH',
      "Run 'gh --version' to check installation",
    ],
    docsUrl: 'https://cli.github.com/manual/installation',
  },
  E104: {
    code: 'E104',
    category: 'System',
    title: 'GitHub CLI not authenticated',
    suggestions: [
      "Run 'gh auth login' to authenticate",
      'Follow the prompts to connect your GitHub account',
      "Verify authentication with 'gh auth status'",
    ],
    docsUrl: 'https://cli.github.com/manual/gh_auth_login',
  },
  E105: {
    code: 'E105',
    category: 'System',
    title: 'Insufficient disk space',
    suggestions: [
      'Free up disk space',
      'Check available space with: df -h',
      'Remove unnecessary files or move to external storage',
    ],
  },
  E106: {
    code: 'E106',
    category: 'System',
    title: 'Binary not found',
    suggestions: [
      'Run the installer first to set up the CLI',
      'Check if the binary was moved or deleted',
      'Verify installation completed successfully',
    ],
  },
  E107: {
    code: 'E107',
    category: 'System',
    title: 'Unsupported platform',
    suggestions: [
      'Check system requirements in documentation',
      'Verify your OS and architecture are supported',
      'Try building from source if your platform is not officially supported',
    ],
  },
  E108: {
    code: 'E108',
    category: 'System',
    title: 'Update script failed',
    suggestions: [
      'Check if you have permissions to execute the update script',
      'Verify the script file exists and is executable',
      'Try running the update manually',
    ],
  },
  E109: {
    code: 'E109',
    category: 'System',
    title: 'Config backup restoration failed',
    suggestions: [
      'Manually restore config from the backup file',
      'Check file permissions and disk space',
      'Verify the backup file exists and is readable',
      'Contact support if the issue persists',
    ],
  },

  // Network Errors (E200-E299)
  E200: {
    code: 'E200',
    category: 'Network',
    title: 'Failed to fetch from GitHub',
    suggestions: [
      'Check your internet connection',
      'Verify GitHub is accessible: https://www.githubstatus.com/',
      'Try again in a few moments',
      'Check if repository exists and is accessible',
    ],
  },
  E201: {
    code: 'E201',
    category: 'Network',
    title: 'GitHub API rate limit exceeded',
    suggestions: [
      'Wait for rate limit to reset (check response headers)',
      'Authenticate with GitHub CLI to get higher rate limits',
      'Use --local flag to work with local devorch repository',
    ],
    docsUrl: 'https://docs.github.com/en/rest/overview/resources-in-the-rest-api#rate-limiting',
  },
  E202: {
    code: 'E202',
    category: 'Network',
    title: 'Repository not found',
    suggestions: [
      'Verify the repository exists',
      'Check if repository is private and you have access',
      'Ensure repository name is spelled correctly',
    ],
  },
  E203: {
    code: 'E203',
    category: 'Network',
    title: 'Failed to create pull request',
    suggestions: [
      'Verify you have push access to the repository',
      'Check if a PR already exists for this branch',
      'Ensure branch name does not conflict with existing branches',
      "Run 'gh auth status' to verify authentication",
    ],
  },
  E204: {
    code: 'E204',
    category: 'Network',
    title: 'Network timeout',
    suggestions: [
      'Check your internet connection',
      'Try again with a better connection',
      'Use --local flag if you have a local copy of devorch',
    ],
  },

  // Validation Errors (E300-E399)
  E300: {
    code: 'E300',
    category: 'Validation',
    title: 'Schema validation failed',
    suggestions: [
      'Check the error details below for specific field issues',
      'Refer to schema documentation for valid field types',
      'Ensure required fields are present',
      'Verify field values match expected types',
    ],
  },
  E301: {
    code: 'E301',
    category: 'Validation',
    title: 'Missing required field',
    suggestions: [
      'Add the missing field to your config',
      'Check schema documentation for required fields',
      "Run 'devorch validate' to see all validation errors",
    ],
  },
  E302: {
    code: 'E302',
    category: 'Validation',
    title: 'Invalid field type',
    suggestions: [
      'Check the expected type for this field',
      'Ensure values are properly formatted (strings quoted, arrays with dashes, etc.)',
      'Refer to example configs for proper formatting',
    ],
  },
  E303: {
    code: 'E303',
    category: 'Validation',
    title: 'Invalid field value',
    suggestions: [
      'Check if value is within allowed range or enum',
      'Verify value matches expected pattern',
      'See error details for expected vs actual value',
    ],
  },
  E304: {
    code: 'E304',
    category: 'Validation',
    title: 'Config file is empty',
    suggestions: [
      "Run 'devorch install' to create a new config",
      'Check if file was accidentally cleared',
    ],
  },

  // Internal Errors (E400-E499)
  E400: {
    code: 'E400',
    category: 'Internal',
    title: 'Unexpected error',
    suggestions: [
      'This may be a bug in devorch',
      'Please report this issue on GitHub with the error details',
      'Try running the command again',
      'Use --debug flag for more detailed error information',
    ],
    docsUrl: 'https://github.com/guicheffer/devorch/issues/new',
  },
  E401: {
    code: 'E401',
    category: 'Internal',
    title: 'Invalid internal state',
    suggestions: [
      'This indicates a bug in devorch',
      'Please report this issue on GitHub',
      'Remove devorch.config.yml file and try again',
    ],
    docsUrl: 'https://github.com/guicheffer/devorch/issues/new',
  },
  E402: {
    code: 'E402',
    category: 'Internal',
    title: 'Compilation failed',
    suggestions: [
      'Check if source files are corrupted',
      'Try with --local flag if using remote source',
      'Verify devorch version is compatible',
      'Report this issue if problem persists',
    ],
    docsUrl: 'https://github.com/guicheffer/devorch/issues/new',
  },
  E403: {
    code: 'E403',
    category: 'Internal',
    title: 'Unknown schema type',
    suggestions: [
      'This indicates a bug in devorch',
      'Verify the asset type (command/skill/subagent) is correct',
      'Please report this issue on GitHub',
    ],
    docsUrl: 'https://github.com/guicheffer/devorch/issues/new',
  },
};

/**
 * Get error definition by code
 */
export function getErrorDefinition(code: string): ErrorDefinition | undefined {
  return ERROR_REGISTRY[code];
}

/**
 * Get all error codes for a category
 */
export function getErrorsByCategory(category: ErrorCategory): ErrorDefinition[] {
  return Object.values(ERROR_REGISTRY).filter((def) => def.category === category);
}
