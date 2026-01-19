/**
 * Path utilities for Harness commands
 */

import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileExists } from '@/utils/files.js';

/**
 * Root directory for all Ralph features
 */
export const HARNESS_ROOT = 'devorch/harness';

/**
 * Get the full path to a feature directory
 */
export function getFeaturePath(featureName: string): string {
  return join(process.cwd(), HARNESS_ROOT, featureName);
}

/**
 * Get the path to the ralph root directory
 */
export function getHarnessRootPath(): string {
  return join(process.cwd(), HARNESS_ROOT);
}

/**
 * Check if a feature exists
 */
export function featureExists(featureName: string): boolean {
  return fileExists(getFeaturePath(featureName));
}

/**
 * Get all feature names in the ralph directory
 */
export function listFeatures(): string[] {
  const harnessRoot = getHarnessRootPath();

  if (!fileExists(harnessRoot)) {
    return [];
  }

  try {
    const entries = readdirSync(harnessRoot, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch {
    return [];
  }
}

/**
 * Get the path to PROMPT.md for a feature
 */
export function getPromptPath(featureName: string): string {
  return join(getFeaturePath(featureName), 'PROMPT.md');
}

/**
 * Get the path to PLAN.md for a feature
 */
export function getPlanPath(featureName: string): string {
  return join(getFeaturePath(featureName), 'PLAN.md');
}

/**
 * Get the path to the specs directory for a feature
 */
export function getSpecsPath(featureName: string): string {
  return join(getFeaturePath(featureName), 'specs');
}

/**
 * Get the path to the logs directory for a feature
 */
export function getLogsPath(featureName: string): string {
  return join(getFeaturePath(featureName), 'logs');
}
