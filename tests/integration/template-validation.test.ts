import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { commandFrontmatterSchema } from '../../src/schemas/commands.js';
import { skillFrontmatterSchema } from '../../src/schemas/skills.js';
import { subagentFrontmatterSchemas } from '../../src/schemas/subagents.js';
import { extractFrontmatterFromFile } from '../../src/utils/frontmatter.js';

// Find project root (where package.json is)
const projectRoot = join(import.meta.dir, '..', '..');
const TEMPLATES_DIR = join(projectRoot, 'templates');

/**
 * Recursively find all .md files in a directory
 */
function findMarkdownFiles(dir: string): string[] {
  const files: string[] = [];

  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...findMarkdownFiles(fullPath));
    } else if (entry.endsWith('.md')) {
      files.push(fullPath);
    }
  }

  return files;
}

describe('integration: template validation', () => {
  // Find command files across all domain directories (e.g., templates/dev-tools/panic/command.md)
  const commandFiles = readdirSync(TEMPLATES_DIR)
    .filter((entry) => {
      const fullPath = join(TEMPLATES_DIR, entry);
      // Skip context-training directory (uses different schema)
      if (entry === 'context-training') {
        return false;
      }
      return statSync(fullPath).isDirectory() && !entry.startsWith('.');
    })
    .flatMap((domain) => findMarkdownFiles(join(TEMPLATES_DIR, domain)))
    .filter((file) => file.endsWith('/command.md'));

  // Find subagent files across all domain directories (e.g., templates/dev-tools/subagents/*.md)
  const subagentFiles = readdirSync(TEMPLATES_DIR)
    .filter((entry) => {
      const fullPath = join(TEMPLATES_DIR, entry);
      // Skip context-training directory (uses different schema)
      if (entry === 'context-training') {
        return false;
      }
      return statSync(fullPath).isDirectory() && !entry.startsWith('.');
    })
    .flatMap((domain) => {
      const subagentsDir = join(TEMPLATES_DIR, domain, 'subagents');
      try {
        return findMarkdownFiles(subagentsDir);
      } catch {
        return []; // Domain might not have subagents directory
      }
    })
    .filter((file) => {
      // Skip partial files (no frontmatter)
      if (file.includes('/partials/')) {
        return false;
      }
      // Skip core template files (implementer.md, verifier.md)
      if (file.endsWith('/implementer.md') || file.endsWith('/verifier.md')) {
        return false;
      }
      return true;
    });

  const skillFiles = findMarkdownFiles(join(TEMPLATES_DIR, 'skills'));

  describe('commands', () => {
    it.each(commandFiles)('should have valid frontmatter: %s', async (filePath) => {
      const frontmatter = await extractFrontmatterFromFile(filePath);

      // Skip files without frontmatter or without mode (workflow step files)
      if (!frontmatter || !frontmatter.mode) {
        return;
      }

      const result = commandFrontmatterSchema.safeParse(frontmatter);

      if (!result.success) {
        console.error(`\nValidation failed for: ${filePath}`);
        console.error('Errors:', result.error.errors);
      }

      expect(result.success).toBe(true);
    });

    it.each(commandFiles)('should include setup partial in frontmatter: %s', async (filePath) => {
      const frontmatter = await extractFrontmatterFromFile(filePath);

      // Skip files without frontmatter or without mode (workflow step files)
      if (!frontmatter || !frontmatter.mode) {
        return;
      }

      // All commands must have the setup partial
      expect(frontmatter.partials).toBeDefined();
      expect((frontmatter.partials as Record<string, unknown>)?.setup).toBe(
        'common/partials/commands/command-setup.md'
      );
    });

    it.each(commandFiles)('should use setup partial in template: %s', async (filePath) => {
      const frontmatter = await extractFrontmatterFromFile(filePath);

      // Skip files without frontmatter or without mode (workflow step files)
      if (!frontmatter || !frontmatter.mode) {
        return;
      }

      // All commands must use {{partials.setup}} in their content
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('{{partials.setup}}');
    });
  });

  describe('subagents', () => {
    it.each(subagentFiles)('should have valid frontmatter: %s', async (filePath) => {
      const frontmatter = await extractFrontmatterFromFile(filePath);

      if (!frontmatter || !frontmatter.schema) {
        throw new Error(`Missing frontmatter or schema field in ${filePath}`);
      }

      const schemaType = frontmatter.schema as keyof typeof subagentFrontmatterSchemas;
      const schema = subagentFrontmatterSchemas[schemaType];

      if (!schema) {
        throw new Error(`Unknown schema type "${schemaType}" in ${filePath}`);
      }

      const result = schema.safeParse(frontmatter);

      if (!result.success) {
        console.error(`\nValidation failed for: ${filePath}`);
        console.error('Errors:', result.error.errors);
      }

      expect(result.success).toBe(true);
    });

    it.each(subagentFiles)('should include setup partial in frontmatter: %s', async (filePath) => {
      const frontmatter = await extractFrontmatterFromFile(filePath);

      if (!frontmatter || !frontmatter.schema) {
        throw new Error(`Missing frontmatter or schema field in ${filePath}`);
      }

      // All subagents must have the setup partial
      expect(frontmatter.partials).toBeDefined();
      expect((frontmatter.partials as Record<string, unknown>)?.setup).toBe(
        'common/partials/subagents/subagent-setup.md'
      );
    });

    it.each(subagentFiles)('should use setup partial in template: %s', async (filePath) => {
      const frontmatter = await extractFrontmatterFromFile(filePath);

      if (!frontmatter || !frontmatter.schema) {
        throw new Error(`Missing frontmatter or schema field in ${filePath}`);
      }

      // All subagents must use {{partials.setup}} in their content
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('{{partials.setup}}');
    });
  });

  describe('skills', () => {
    // Only validate main SKILL.md files, not reference/example files
    const mainSkillFiles = skillFiles.filter((f) => f.endsWith('/SKILL.md'));

    it.each(mainSkillFiles)('should have valid frontmatter: %s', async (filePath) => {
      const frontmatter = await extractFrontmatterFromFile(filePath);

      if (!frontmatter) {
        throw new Error(`Missing frontmatter in ${filePath}`);
      }

      const result = skillFrontmatterSchema.safeParse(frontmatter);

      if (!result.success) {
        console.error(`\nValidation failed for: ${filePath}`);
        console.error('Errors:', result.error.errors);
      }

      expect(result.success).toBe(true);
    });
  });
});
