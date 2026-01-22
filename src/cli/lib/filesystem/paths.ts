/**
 * Centralized path resolution utilities for the CLI.
 * Provides consistent path handling across all CLI commands.
 */

import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Get the target project directory (where devorch should operate)
 * Defaults to current working directory, but can be overridden
 */
export function getProjectDir(targetDir?: string): string {
  return targetDir || process.cwd();
}

/**
 * Create a temporary directory and return its path
 */
export function createTempDir(prefix: string = 'devorch'): string {
  return mkdtempSync(join(tmpdir(), `${prefix}-`));
}

/**
 * Get a temp directory path (relative to project) for build artifacts
 */
export function getTempBuildDir(projectDir: string, suffix: string = ''): string {
  return join(projectDir, '.devorch-temp', suffix);
}

/**
 * Path resolution utilities for foundry source directories.
 * All functions return relative paths that should be joined with the source root.
 */
export const FOUNDRY_PATHS = {
  /** Commands directory in foundry */
  commands: () => 'commands',

  /** Subagents directory in foundry */
  subagents: () => 'subagents',

  /** Skills directory in foundry */
  skills: () => 'skills',

  /** Schemas directory in foundry */
  schemas: () => 'schemas',
};

/**
 * Path resolution utilities for installed assets.
 * All functions return relative paths that should be joined with the target directory.
 */
export const INSTALL_PATHS = {
  /** Claude Code agents directory */
  claudeAgents: () => join('.claude', 'agents', 'devorch'),

  /** Claude Code commands directory */
  claudeCommands: () => join('.claude', 'commands', 'devorch'),

  /** Claude Code skills directory */
  claudeSkills: () => join('.claude', 'skills'),

  /** Claude Code root directory */
  claudeRoot: () => '.claude',

  /** devorch state root directory */
  specMachineRoot: () => join('devorch', '.state'),

  /** State file */
  stateFile: () => join('devorch', '.state', 'state.json'),

  /** Lock file */
  lockFile: () => join('devorch', '.state', 'install.lock'),

  /** Debug log file */
  debugLog: () => join('devorch', '.state', 'debug.log'),

  /** Artifacts directory for command outputs */
  artifactsRoot: () => join('devorch', '.state', 'artifacts'),

  /** Artifacts directory for a specific command */
  commandArtifacts: (commandName: string) =>
    join('devorch', '.state', 'artifacts', 'commands', commandName),
};

/**
 * Validate that a directory contains the expected foundry structure
 */
export function validateFoundryStructure(dir: string): { valid: boolean; missing?: string[] } {
  const { existsSync } = require('node:fs');

  const required = [FOUNDRY_PATHS.commands(), FOUNDRY_PATHS.subagents()];

  const missing = required.filter((path) => !existsSync(join(dir, path)));

  return missing.length === 0 ? { valid: true } : { valid: false, missing };
}
