/**
 * Types for Claude CLI runner
 */

/**
 * Claude CLI execution modes
 */
export type ClaudeMode = 'print' | 'interactive' | 'headless';

/**
 * Permission modes for Claude CLI
 */
export type PermissionMode = 'acceptEdits' | 'bypassPermissions';

/**
 * Base options for running Claude CLI
 */
export interface ClaudeRunOptions {
  /** Skip permission prompts entirely */
  skipPermissions?: boolean;
  /** Permission mode setting */
  permissionMode?: PermissionMode;
  /** Enable verbose output */
  verbose?: boolean;
}

/**
 * Options for headless mode with pretty-printing
 */
export interface HeadlessOptions extends Omit<ClaudeRunOptions, 'verbose'> {
  /** Enable pretty-printing via claude-pretty-printer */
  prettyPrint?: boolean;
  /** Filter message types (e.g., ['assistant', 'result']) */
  filter?: string[];
}

/**
 * Result from running Claude CLI
 */
export interface ClaudeRunResult {
  /** Exit code from the process */
  exitCode: number;
}
