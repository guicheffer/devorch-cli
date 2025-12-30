#!/usr/bin/env bun

/**
 * Generate GitHub Actions Matrix for Skill Auto-Updates
 *
 * Scans templates/skills directory for .updater/prompt.md files
 * and generates a JSON matrix for the auto-update workflow.
 *
 * Each skill with a .updater/prompt.md file is automatically included.
 * The repos to clone are extracted from the frontmatter.
 *
 * Usage:
 *   bun run .github/scripts/generate-update-matrix.ts
 *
 * Output:
 *   JSON to stdout: {"include": [{skill, skill_path, repos}, ...]}
 */

import { existsSync, readdirSync, statSync } from 'fs';
import { join, relative, basename } from 'path';
import { parse as parseYaml } from 'yaml';

interface UpdaterFrontmatter {
  repos: string[];
}

interface MatrixEntry {
  skill: string;
  skill_path: string;
  repos: string;
}

interface Matrix {
  include: MatrixEntry[];
}

/**
 * Recursively find all .updater/prompt.md files
 */
function findUpdaterPrompts(dir: string, baseDir: string): string[] {
  const results: string[] = [];

  try {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        // Check if this is a .updater directory with prompt.md
        if (entry === '.updater') {
          const promptPath = join(fullPath, 'prompt.md');
          if (existsSync(promptPath)) {
            // Store the skill directory path (parent of .updater)
            results.push(dir);
          }
        } else {
          // Recurse into subdirectories
          results.push(...findUpdaterPrompts(fullPath, baseDir));
        }
      }
    }
  } catch (error) {
    // Skip directories we can't read
  }

  return results;
}

/**
 * Parse YAML frontmatter from markdown file
 */
function parseFrontmatter(content: string): UpdaterFrontmatter | null {
  // Match YAML frontmatter between --- delimiters
  const match = content.match(/^---\n([\s\S]*?)\n---/);

  if (!match) {
    return null;
  }

  try {
    const frontmatter = parseYaml(match[1]) as UpdaterFrontmatter;
    return frontmatter;
  } catch (error) {
    return null;
  }
}

/**
 * Extract skill name from path
 * e.g., templates/skills/ui-design-system/zest-components → zest-components
 */
function getSkillName(skillPath: string): string {
  return basename(skillPath);
}

/**
 * Main function
 */
async function main(): Promise<void> {
  const projectRoot = process.cwd();
  const skillsDir = join(projectRoot, 'templates/skills');

  if (!existsSync(skillsDir)) {
    console.error('ERROR: templates/skills directory not found');
    process.exit(1);
  }

  // Find all skills with .updater directories
  const skillDirs = findUpdaterPrompts(skillsDir, projectRoot);

  if (skillDirs.length === 0) {
    console.error('ERROR: No skills with .updater/prompt.md found');
    process.exit(1);
  }

  const matrix: Matrix = { include: [] };

  for (const skillDir of skillDirs) {
    const skillName = getSkillName(skillDir);
    const promptPath = join(skillDir, '.updater/prompt.md');

    try {
      // Read and parse prompt frontmatter
      const promptContent = await Bun.file(promptPath).text();
      const frontmatter = parseFrontmatter(promptContent);

      // Validate frontmatter
      if (!frontmatter) {
        console.error(`ERROR: No frontmatter found in ${promptPath}`);
        process.exit(1);
      }

      if (!frontmatter.repos || !Array.isArray(frontmatter.repos) || frontmatter.repos.length === 0) {
        console.error(`ERROR: Invalid frontmatter in ${promptPath}: repos must be a non-empty array`);
        process.exit(1);
      }

      // Get relative path from project root
      const skillPath = relative(projectRoot, skillDir);

      // Add to matrix
      matrix.include.push({
        skill: skillName,
        skill_path: skillPath,
        repos: frontmatter.repos.join(','),
      });
    } catch (error) {
      console.error(`ERROR: Failed to read prompt ${promptPath}:`, error);
      process.exit(1);
    }
  }

  // Sort by skill name for deterministic output
  matrix.include.sort((a, b) => a.skill.localeCompare(b.skill));

  // Output matrix as JSON
  console.log(JSON.stringify(matrix));
  process.exit(0);
}

main();
