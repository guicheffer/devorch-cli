/**
 * Version utilities for devorch
 *
 * Handles CLI and template version semantics:
 * - CLI version comes from BUILD_VERSION env var (set at build time)
 * - Template version comes from state file (set at install time)
 */

import semver from 'semver';

/**
 * Special version sentinels (non-semver values with specific meanings)
 */
export const VERSION_SENTINELS = {
  /** CLI is running in development mode (BUILD_VERSION not set) */
  DEV: 'dev',
  /** Templates were installed from a local path (--local flag) */
  LOCAL: 'local',
} as const;

export type VersionSentinel = (typeof VERSION_SENTINELS)[keyof typeof VERSION_SENTINELS];

/**
 * Check if CLI is running in development mode
 * (i.e., not compiled with BUILD_VERSION)
 */
export function isDevMode(): boolean {
  return !process.env.BUILD_VERSION;
}

/**
 * Get the current CLI version
 */
export function getCliVersion(): string {
  return process.env.BUILD_VERSION || VERSION_SENTINELS.DEV;
}

/**
 * Check if a version string is a release version (valid semver)
 */
export function isReleaseVersion(version: string): boolean {
  return semver.valid(version) !== null;
}

/**
 * Check if a version is a special sentinel value
 */
export function isSentinel(version: string): version is VersionSentinel {
  return Object.values(VERSION_SENTINELS).includes(version as VersionSentinel);
}
