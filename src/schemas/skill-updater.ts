/**
 * Zod schema for skill auto-updater configuration
 *
 * Validates the frontmatter in .updater/prompt.md files
 */

import { z } from 'zod';

/**
 * Schema for skill auto-updater frontmatter
 *
 * Example:
 * ---
 * repos:
 *   - yourcompany/web
 *   - yourcompany/zest-react-native
 * ---
 */
export const skillUpdaterFrontmatterSchema = z.object({
  repos: z
    .array(z.string().regex(/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/))
    .min(1)
    .describe('List of GitHub repositories to clone (format: owner/repo)'),
});

export type SkillUpdaterFrontmatter = z.infer<typeof skillUpdaterFrontmatterSchema>;
