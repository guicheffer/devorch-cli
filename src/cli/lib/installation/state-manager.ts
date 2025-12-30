/**
 * Installation state management for tracking installation status and enabling
 * reliable reinstallation, rollback, and recovery from interruptions.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Config } from '@/schemas';
import { getCommandName, getSkillName, getSubagentName } from '@/schemas/config';
import { logger } from '@/utils/logger.js';
import { INSTALL_PATHS } from '../filesystem/paths.js';

export interface ActiveSpec {
  /** Full path to spec folder */
  path: string;
  /** Spec name without date prefix */
  name: string;
  /** Full folder name */
  folderName: string;
  /** ISO timestamp when spec was created */
  created: string;
  /** ISO timestamp when spec was last accessed */
  lastAccessed: string;
}

export interface InstallationState {
  /** Version of templates installed ('vX.Y.Z' or 'local') */
  templateVersion: string;

  /** Timestamp when installation completed */
  installed_at: string;

  /** Installed components for each agent */
  components: {
    [agent: string]: {
      subagents: number;
      commands: number;
      skills: number;
    };
  };

  /** Preset name if used */
  preset?: string;

  /** Hash of the config file to detect changes */
  config_hash: string;

  /** Installation status */
  status: 'complete' | 'in_progress' | 'failed';

  /** List of installed subagents */
  subagents: string[];

  /** List of installed commands */
  commands: string[];

  /** List of installed skills */
  skills: string[];

  /** Error message if installation failed */
  error?: string;

  /** Currently active spec (for spec-driven workflow) */
  active_spec?: ActiveSpec;
}

/**
 * Get the path to the state file
 */
function getStatePath(projectDir: string): string {
  return join(projectDir, INSTALL_PATHS.stateFile());
}

/**
 * Get the path to the lock file
 */
function getLockPath(projectDir: string): string {
  return join(projectDir, INSTALL_PATHS.lockFile());
}

/**
 * Compute hash of config file for change detection
 */
export function computeConfigHash(config: Config): string {
  const hash = createHash('sha256');
  hash.update(JSON.stringify(config, null, 2));
  return hash.digest('hex');
}

/**
 * Check if an installation is currently in progress
 */
export function isInstallationLocked(projectDir: string): boolean {
  const lockPath = getLockPath(projectDir);
  return existsSync(lockPath);
}

/**
 * Create installation lock to prevent concurrent installs
 */
export function createInstallationLock(projectDir: string): void {
  const lockPath = getLockPath(projectDir);
  const lockData = {
    pid: process.pid,
    started_at: new Date().toISOString(),
  };

  // Ensure .devorch directory exists
  const specMachineDir = join(projectDir, INSTALL_PATHS.specMachineRoot());
  if (!existsSync(specMachineDir)) {
    mkdirSync(specMachineDir, { recursive: true });
  }

  // Ensure artifacts directory exists with gitignore
  const artifactsDir = join(projectDir, INSTALL_PATHS.artifactsRoot());
  if (!existsSync(artifactsDir)) {
    mkdirSync(artifactsDir, { recursive: true });
    // Create gitignore to exclude artifacts from version control
    const gitignorePath = join(artifactsDir, '.gitignore');
    writeFileSync(gitignorePath, '*\n!.gitignore\n', 'utf-8');
    logger.debug('Created artifacts directory with gitignore', { artifactsDir });
  }

  writeFileSync(lockPath, JSON.stringify(lockData, null, 2), 'utf-8');
  logger.debug('Created installation lock', { lockPath, pid: process.pid });
}

/**
 * Remove installation lock
 */
export function removeInstallationLock(projectDir: string): void {
  const lockPath = getLockPath(projectDir);
  if (existsSync(lockPath)) {
    rmSync(lockPath, { force: true });
    logger.debug('Removed installation lock', { lockPath });
  }
}

/**
 * Read installation state from state file
 * Handles migration from legacy 'version' field to 'templateVersion'
 */
export function readState(projectDir: string): InstallationState | null {
  const statePath = getStatePath(projectDir);

  if (!existsSync(statePath)) {
    logger.debug('No state file found', { statePath });
    return null;
  }

  try {
    const content = readFileSync(statePath, 'utf-8');
    const raw = JSON.parse(content) as Record<string, unknown>;

    // Migrate legacy 'version' field to 'templateVersion'
    const templateVersion = (raw.templateVersion ?? raw.version) as string;

    // Return state with templateVersion (drops legacy 'version' field)
    const { version: _legacyVersion, ...rest } = raw;
    const state = { ...rest, templateVersion } as InstallationState;

    logger.debug('Read installation state', { statePath, status: state.status });
    return state;
  } catch (err) {
    logger.error('Failed to read state file', { statePath, error: err });
    return null;
  }
}

/**
 * Write installation state to state file
 */
export function writeState(projectDir: string, state: InstallationState): void {
  const statePath = getStatePath(projectDir);
  const specMachineDir = join(projectDir, INSTALL_PATHS.specMachineRoot());

  // Ensure .devorch directory exists
  if (!existsSync(specMachineDir)) {
    mkdirSync(specMachineDir, { recursive: true });
  }

  // Ensure artifacts directory exists with gitignore
  const artifactsDir = join(projectDir, INSTALL_PATHS.artifactsRoot());
  if (!existsSync(artifactsDir)) {
    mkdirSync(artifactsDir, { recursive: true });
    // Create gitignore to exclude artifacts from version control
    const gitignorePath = join(artifactsDir, '.gitignore');
    writeFileSync(gitignorePath, '*\n!.gitignore\n', 'utf-8');
    logger.debug('Created artifacts directory with gitignore', { artifactsDir });
  }

  writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
  logger.debug('Wrote installation state', { statePath, status: state.status });
}

/**
 * Initialize state at the start of installation
 */
export function initializeState(
  projectDir: string,
  config: Config,
  templateVersion: string
): InstallationState {
  const state: InstallationState = {
    templateVersion,
    installed_at: new Date().toISOString(),
    components: {},
    config_hash: computeConfigHash(config),
    status: 'in_progress',
    subagents: (config.subagents ?? []).map(getSubagentName),
    commands: (config.commands ?? []).map(getCommandName),
    skills: (config.skills ?? []).map(getSkillName),
  };

  writeState(projectDir, state);
  logger.info('Initialized installation state', { status: state.status });

  return state;
}

/**
 * Update state with component counts for an agent
 */
export function updateStateComponents(
  projectDir: string,
  agent: string,
  components: { subagents: number; commands: number; skills: number }
): void {
  const state = readState(projectDir);
  if (!state) {
    logger.warn('Cannot update state: state file not found');
    return;
  }

  state.components[agent] = components;
  writeState(projectDir, state);
  logger.debug('Updated state components', { agent, components });
}

/**
 * Mark installation as complete
 */
export function completeInstallation(projectDir: string): void {
  const state = readState(projectDir);
  if (!state) {
    logger.warn('Cannot complete installation: state file not found');
    return;
  }

  state.status = 'complete';
  state.installed_at = new Date().toISOString();
  writeState(projectDir, state);
  logger.info('Installation marked as complete');
}

/**
 * Mark installation as failed
 */
export function failInstallation(projectDir: string, error: string): void {
  const state = readState(projectDir);
  if (!state) {
    logger.warn('Cannot mark installation as failed: state file not found');
    return;
  }

  state.status = 'failed';
  state.error = error;
  writeState(projectDir, state);
  logger.error('Installation marked as failed', { error });
}

/**
 * Detect if an installation is incomplete (in_progress or failed)
 */
export function detectIncompleteInstallation(projectDir: string): {
  incomplete: boolean;
  state: InstallationState | null;
} {
  const state = readState(projectDir);

  if (!state) {
    return { incomplete: false, state: null };
  }

  const incomplete = state.status === 'in_progress' || state.status === 'failed';
  logger.debug('Checked for incomplete installation', { incomplete, status: state.status });

  return { incomplete, state };
}

/**
 * Check if config has changed since last installation
 */
export function hasConfigChanged(projectDir: string, config: Config): boolean {
  const state = readState(projectDir);
  if (!state) {
    return false;
  }

  const currentHash = computeConfigHash(config);
  const changed = currentHash !== state.config_hash;

  logger.debug('Checked if config changed', {
    changed,
    currentHash: currentHash.substring(0, 8),
    savedHash: state.config_hash.substring(0, 8),
  });

  return changed;
}

/**
 * Clear installation state and remove state file
 */
export function clearState(projectDir: string): void {
  const statePath = getStatePath(projectDir);

  if (existsSync(statePath)) {
    rmSync(statePath, { force: true });
    logger.info('Cleared installation state', { statePath });
  }
}
