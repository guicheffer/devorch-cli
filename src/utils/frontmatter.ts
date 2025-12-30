/**
 * Frontmatter parsing utilities for extracting metadata from markdown files
 */

import matter from 'gray-matter';
import { parseYaml } from './yaml.js';

export interface Frontmatter {
  [key: string]: unknown;
}

/**
 * Extract and parse YAML frontmatter from markdown content
 *
 * @param content - The markdown content to parse
 * @returns Parsed frontmatter object or null if no frontmatter found
 *
 * @example
 * ```ts
 * const content = `---
 * name: example
 * version: 1.0.0
 * ---
 * # Content here`;
 *
 * const frontmatter = extractFrontmatter(content);
 * console.log(frontmatter.name); // "example"
 * ```
 */
export function extractFrontmatter(content: string): Frontmatter | null {
  // Match YAML frontmatter block at the start of the file
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (!frontmatterMatch?.[1]) {
    return null;
  }

  try {
    return parseYaml(frontmatterMatch[1]) as Frontmatter;
  } catch (_error) {
    // Return null if frontmatter is malformed
    return null;
  }
}

/**
 * Extract frontmatter from a file
 *
 * @param filePath - Path to the markdown file
 * @returns Parsed frontmatter object or null if no frontmatter found
 */
export async function extractFrontmatterFromFile(filePath: string): Promise<Frontmatter | null> {
  try {
    const content = await Bun.file(filePath).text();
    return extractFrontmatter(content);
  } catch (_error) {
    return null;
  }
}

/**
 * Stringify markdown content with frontmatter using proper YAML formatting.
 * Prevents gray-matter from using folded scalars (>-) for long strings.
 *
 * @param content - The markdown content body
 * @param frontmatter - The frontmatter data object
 * @returns Complete markdown string with frontmatter and content
 *
 * @example
 * ```ts
 * const content = stringifyFrontmatter('# My Content', {
 *   name: 'example',
 *   description: 'A very long description that should not be folded'
 * });
 * ```
 */
export function stringifyFrontmatter(content: string, frontmatter: Frontmatter): string {
  const yaml = require('yaml');

  return matter.stringify(content, frontmatter, {
    engines: {
      yaml: {
        parse: (input: string) => yaml.parse(input),
        stringify: (obj: any) => {
          // Use js-yaml with lineWidth: 0 to prevent folded scalars
          return yaml.stringify(obj, {
            indent: 2,
            lineWidth: 0, // Prevents folded scalars (>-), forces single-line strings
            defaultStringType: 'QUOTE_DOUBLE', // Use double quotes for strings with special chars
            defaultKeyType: 'PLAIN', // Keep keys unquoted
          });
        },
      },
    },
  });
}
