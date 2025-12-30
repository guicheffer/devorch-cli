import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { readState, writeState } from '../installation/state-manager.js';

/**
 * Metadata about a spec folder
 */
export interface SpecInfo {
  /** Full path to spec folder (e.g., "devorch/specs/2025-11-18-feature-name") */
  path: string;
  /** Spec name without date prefix (e.g., "feature-name") */
  name: string;
  /** Full folder name with date (e.g., "2025-11-18-feature-name") */
  folderName: string;
  /** Creation date from folder name */
  date: string;
  /** Last modified timestamp */
  lastModified: Date;
}

/**
 * Active spec information stored in state
 */
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

const SPECS_DIR = 'devorch/specs';

/**
 * List all specs in the project
 */
export function listSpecs(projectDir: string): SpecInfo[] {
  const specsPath = join(projectDir, SPECS_DIR);

  if (!existsSync(specsPath)) {
    return [];
  }

  const entries = readdirSync(specsPath, { withFileTypes: true });
  const specs: SpecInfo[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const folderName = entry.name;
    const fullPath = join(specsPath, folderName);
    const stats = statSync(fullPath);

    // Parse spec name from folder (remove date prefix)
    // Format: YYYY-MM-DD-spec-name
    const match = folderName.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);
    if (!match) continue; // Skip folders that don't match expected format

    const date = match[1];
    const name = match[2];

    specs.push({
      path: join(SPECS_DIR, folderName),
      name,
      folderName,
      date,
      lastModified: stats.mtime,
    });
  }

  // Sort by date descending (newest first)
  return specs.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Get the newest spec by date
 */
export function getNewestSpec(projectDir: string): SpecInfo | null {
  const specs = listSpecs(projectDir);
  return specs.length > 0 ? specs[0] : null;
}

/**
 * Get the active spec from state
 */
export function getActiveSpec(projectDir: string): ActiveSpec | null {
  const state = readState(projectDir);

  if (!state || !state.active_spec) {
    return null;
  }

  // Validate that the spec folder still exists
  const specPath = join(projectDir, state.active_spec.path);
  if (!existsSync(specPath)) {
    // Spec was deleted, clear from state
    writeState(projectDir, { ...state, active_spec: undefined });
    return null;
  }

  return state.active_spec;
}

/**
 * Set the active spec in state
 */
export function setActiveSpec(projectDir: string, specInfo: SpecInfo): ActiveSpec {
  const state = readState(projectDir);

  const activeSpec: ActiveSpec = {
    path: specInfo.path,
    name: specInfo.name,
    folderName: specInfo.folderName,
    created: new Date(specInfo.date).toISOString(),
    lastAccessed: new Date().toISOString(),
  };

  if (state) {
    writeState(projectDir, { ...state, active_spec: activeSpec });
  }

  return activeSpec;
}

/**
 * Clear the active spec from state
 */
export function clearActiveSpec(projectDir: string): void {
  const state = readState(projectDir);
  if (state) {
    writeState(projectDir, { ...state, active_spec: undefined });
  }
}

/**
 * Find a spec by name (exact match)
 * Matches either:
 * - Full folder name: "2025-11-18-feature-name"
 * - Spec name only: "feature-name"
 */
export function findSpecByName(projectDir: string, searchName: string): SpecInfo | null {
  const specs = listSpecs(projectDir);

  // Try exact match on folder name first
  let match = specs.find((spec) => spec.folderName === searchName);
  if (match) return match;

  // Try exact match on spec name (without date prefix)
  match = specs.find((spec) => spec.name === searchName);
  if (match) return match;

  return null;
}

/**
 * Check if the active spec is stale (older than the newest spec)
 */
export function isStaleSpec(
  projectDir: string,
  activeSpec: ActiveSpec
): { isStale: boolean; newestSpec: SpecInfo | null } {
  const newestSpec = getNewestSpec(projectDir);

  if (!newestSpec) {
    return { isStale: false, newestSpec: null };
  }

  // Compare by folder name (which includes date)
  const isStale = activeSpec.folderName !== newestSpec.folderName;

  return { isStale, newestSpec };
}

/**
 * Select the appropriate spec to use
 * Priority:
 * 1. Active spec from state (if exists and valid)
 * 2. Newest spec (fallback)
 */
export function selectSpec(projectDir: string): SpecInfo | null {
  // Try to get active spec from state
  const activeSpec = getActiveSpec(projectDir);

  if (activeSpec) {
    // Convert ActiveSpec to SpecInfo
    const specPath = join(projectDir, activeSpec.path);
    if (existsSync(specPath)) {
      const stats = statSync(specPath);
      return {
        path: activeSpec.path,
        name: activeSpec.name,
        folderName: activeSpec.folderName,
        date: activeSpec.folderName.split('-').slice(0, 3).join('-'),
        lastModified: stats.mtime,
      };
    }
  }

  // Fall back to newest spec
  return getNewestSpec(projectDir);
}
