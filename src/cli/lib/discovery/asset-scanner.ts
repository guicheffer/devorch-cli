import { readFileSync } from 'node:fs';
import path from 'node:path';
import { globSync } from 'fast-glob';
import matter from 'gray-matter';
import { logger } from '@/utils/logger.js';

/**
 * Search patterns for different asset types
 */
const ASSET_SEARCH_PATTERNS = {
  command: ['.claude/commands/**/*.md'],
  subagent: ['.claude/agents/**/*.md'],
  skill: ['.claude/skills/**/*.md'],
};

/**
 * Paths to ignore (devorch installed assets and internal tooling)
 */
const IGNORE_PATTERNS = [
  '.claude/agents/devorch/**',
  '.claude/commands/devorch/**',
  '.claude/commands/foundry/**', // Old foundry generator commands
  '.claude/skills/devorch/**',
];

/**
 * Count custom assets without loading full content
 */
export function countCustomAssets(projectDir: string): number {
  logger.debug('Counting custom assets', { projectDir });

  let count = 0;

  for (const patterns of Object.values(ASSET_SEARCH_PATTERNS)) {
    for (const pattern of patterns) {
      try {
        const files = globSync(pattern, {
          cwd: projectDir,
          absolute: false,
          ignore: IGNORE_PATTERNS,
        });

        for (const file of files) {
          const filePath = path.join(projectDir, file);

          try {
            const content = readFileSync(filePath, 'utf-8');
            const { data: frontmatter } = matter(content);

            // Skip if already from devorch
            if (isFromDevOrch(frontmatter)) {
              continue;
            }

            count++;
          } catch {
            // Skip files we can't read
          }
        }
      } catch {
        // Skip patterns that fail
      }
    }
  }

  return count;
}

/**
 * Check if an asset is from devorch based on frontmatter
 */
function isFromDevOrch(frontmatter: Record<string, any>): boolean {
  // Check for devorch schema markers
  if (frontmatter.schema && String(frontmatter.schema).includes('devorch')) {
    return true;
  }

  // Check for other devorch markers
  // (can add more heuristics here if needed)

  return false;
}
