/**
 * Local git repository utilities
 */

import { $ } from 'bun';

/**
 * Check if current directory is in a git repository (works from any subfolder)
 */
export async function isInGitRepo(): Promise<boolean> {
  try {
    await $`git rev-parse --is-inside-work-tree`.quiet();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the root directory of the current git repository
 */
export async function getGitRoot(): Promise<string | null> {
  try {
    const result = await $`git rev-parse --show-toplevel`.quiet().text();
    return result.trim();
  } catch {
    return null;
  }
}
