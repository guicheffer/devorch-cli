/**
 * General utilities for Harness commands
 */

import type { FeatureStatus } from './plan.js';

/**
 * Sleep for the given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create an ASCII progress bar
 */
export function createProgressBar(percentage: number, width: number): string {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  return `[${'#'.repeat(filled)}${'-'.repeat(empty)}]`;
}

/**
 * Get a status icon for a feature status
 */
export function getStatusIcon(status: FeatureStatus): string {
  switch (status) {
    case 'completed':
      return '[DONE]';
    case 'in_progress':
      return '[....]';
    case 'not_started':
      return '[    ]';
  }
}
