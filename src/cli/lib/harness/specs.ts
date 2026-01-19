/**
 * Spec file utilities for Harness commands
 */

import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileExists, readFile } from '@/utils/files.js';

export interface ExistingSpec {
  name: string;
  content: string;
}

/**
 * Get list of existing spec files with their contents
 */
export function getExistingSpecs(specsPath: string): ExistingSpec[] {
  if (!fileExists(specsPath) || !statSync(specsPath).isDirectory()) {
    return [];
  }

  try {
    const files = readdirSync(specsPath).filter((f) => f.endsWith('.md'));
    return files.map((name) => ({
      name,
      content: readFile(join(specsPath, name)),
    }));
  } catch {
    return [];
  }
}

/**
 * Format existing specs for inclusion in a prompt
 */
export function formatExistingSpecs(specs: ExistingSpec[]): string {
  if (specs.length === 0) return '';

  const formatted = specs
    .map((spec) => `### ${spec.name}\n\`\`\`markdown\n${spec.content}\n\`\`\``)
    .join('\n\n');

  return `## Existing Specs (for reference)\n\nThe following specs already exist. Review them and improve/update as needed:\n\n${formatted}\n\n`;
}

/**
 * Check if the specs directory has any .md files
 */
export function hasSpecs(specsPath: string): boolean {
  if (!fileExists(specsPath)) {
    return false;
  }

  try {
    const files = readdirSync(specsPath);
    return files.some((file) => file.endsWith('.md'));
  } catch {
    return false;
  }
}

/**
 * Count the number of spec files in a directory
 */
export function countSpecs(specsPath: string): number {
  if (!fileExists(specsPath)) {
    return 0;
  }

  try {
    const files = readdirSync(specsPath);
    return files.filter((f) => f.endsWith('.md')).length;
  } catch {
    return 0;
  }
}
