/**
 * Utilities for resolving asset names from frontmatter and file paths.
 */

/**
 * Extracts asset name from frontmatter and file path.
 * For subagents and skills, includes category/domain prefix from folder structure.
 *
 * @param baseName - Name from frontmatter (e.g., "spec-writer")
 * @param relativePath - Path relative to templates/ (e.g., "specification/subagents/spec-writer.md")
 * @param type - Asset type (subagent, command, or skill)
 * @returns Full asset name (e.g., "specification/spec-writer")
 *
 * @example
 * // Subagent with domain folder (new structure)
 * resolveAssetName('spec-writer', 'specification/subagents/spec-writer.md', 'subagent')
 * // => 'specification/spec-writer'
 *
 * @example
 * // Subagent with domain folder (another example)
 * resolveAssetName('dependency-scanner', 'analysis/subagents/dependency-scanner.md', 'subagent')
 * // => 'analysis/dependency-scanner'
 *
 * @example
 * // Skill with domain folder (concatenated with hyphens)
 * resolveAssetName('zest-components', 'skills/ui-design-system/zest-components/SKILL.md', 'skill')
 * // => 'ui-design-system-zest-components'
 *
 * @example
 * // Command (no prefix extraction)
 * resolveAssetName('/create-spec', 'specification/create-spec/command.md', 'command')
 * // => '/create-spec'
 */
export function resolveAssetName(
  baseName: string,
  relativePath: string,
  type: 'subagent' | 'command' | 'skill'
): string {
  // If name already includes '/', use as-is (user has explicitly set the full name)
  if (baseName.includes('/')) {
    return baseName;
  }

  // For subagents and skills, extract category/domain from folder path
  if (type === 'subagent') {
    const pathParts = relativePath.split('/');

    // New pattern: [domain]/subagents/[name].md
    // Extract domain from first part of path
    if (pathParts.length >= 3 && pathParts[1] === 'subagents') {
      const domain = pathParts[0];
      return `${domain}/${baseName}`;
    }
  }

  if (type === 'skill') {
    const pathParts = relativePath.split('/');

    // Pattern: skills/[domain]/[skill]/SKILL.md
    // Skills use concatenated hyphen format: domain-skill
    if (pathParts.length >= 3 && pathParts[0] === 'skills') {
      const domain = pathParts[1];
      return `${domain}-${baseName}`;
    }
  }

  // Root level or commands - return as-is
  return baseName;
}
