import { z } from 'zod';

/**
 * Schema for implementer frontmatter (implementers/*.md files)
 *
 * Example:
 * ```yaml
 * ---
 * domain: form-handling
 * description: Patterns for form inputs, validation, and submission
 * ---
 * ```
 */
export const implementerFrontmatterSchema = z.object({
  domain: z.string().describe('Domain identifier (e.g., "form-handling", "state-management")'),
  description: z
    .string()
    .describe('Brief description of what this implementer handles (1-2 sentences)'),
});

/**
 * Schema for verifier frontmatter (verifiers/*.md files)
 *
 * Example:
 * ```yaml
 * ---
 * domain: testing
 * description: Verify test coverage and quality for components
 * ---
 * ```
 */
export const verifierFrontmatterSchema = z.object({
  domain: z.string().describe('Domain identifier matching the implementer domain'),
  description: z
    .string()
    .describe('Brief description of what this verifier checks (1-2 sentences)'),
});

/**
 * Full tuning structure including content files
 * Note: metadata is deprecated and no longer required
 */
export const contextTrainingSchema = z.object({
  specification: z
    .string()
    .describe('Markdown content from specification.md (guides spec writing)'),
  implementation: z
    .string()
    .describe(
      'Markdown content from implementation.md (introduces implementers/verifiers to planning subagents)'
    ),
  implementers: z
    .array(z.string())
    .describe('List of implementer customization file paths (e.g., implementers/ui.md)'),
  verifiers: z
    .array(z.string())
    .describe('List of verifier customization file paths (e.g., verifiers/ui.md)'),
  path: z.string().describe('Absolute path to tuning directory'),
});

export type ImplementerFrontmatter = z.infer<typeof implementerFrontmatterSchema>;
export type VerifierFrontmatter = z.infer<typeof verifierFrontmatterSchema>;
export type ContextTraining = z.infer<typeof contextTrainingSchema>;

/**
 * Skill reference pattern for parsing markdown
 * Matches: **skill-name** or **domain/skill-name**
 */
export const SKILL_REFERENCE_PATTERN = /\*\*([a-z0-9-]+(?:\/[a-z0-9-]+)?)\*\*/g;

/**
 * Extract skill references from markdown content
 */
export function extractSkillReferences(markdown: string): string[] {
  const matches = markdown.matchAll(SKILL_REFERENCE_PATTERN);
  return Array.from(matches, (match) => match[1]);
}

/**
 * Validate that all skill references exist in a provided skills list
 */
export function validateSkillReferences(
  markdown: string,
  availableSkills: string[]
): { valid: boolean; missing: string[] } {
  const references = extractSkillReferences(markdown);
  const missing = references.filter((ref) => !availableSkills.includes(ref));

  return {
    valid: missing.length === 0,
    missing,
  };
}
