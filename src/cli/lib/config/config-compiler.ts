import { join } from 'node:path';
import { InternalError } from '@/utils/errors.js';
import { getSchemas } from '@/utils/register-schemas.js';
import { spinner } from '@/utils/ui.js';
import { BatchProcessor } from '../markdown-di/index.js';

/**
 * Compile config files using markdown-di
 * Takes raw templates/ directory and outputs compiled files to outDir
 */
export async function compileConfig(configDir: string, outDir: string): Promise<void> {
  const s = spinner();
  s.start('Compiling config files...');

  try {
    const schemas = getSchemas();

    const processor = new BatchProcessor({
      baseDir: join(configDir, 'templates'), // templates directory with commands/, subagents/, etc.
      outDir,
      include: ['subagents/**/*.md', 'commands/**/*.md', 'skills/**/SKILL.md'],
      exclude: ['**/README.md', '**/CONTRIBUTING.md', '**/TESTING.md', '**/node_modules/**'],
      validateFrontmatter(frontmatter, schemaName) {
        const schema = schemas[schemaName as keyof typeof schemas];

        if (!schema) {
          return {
            valid: false,
            errors: [`Schema ${schemaName} not found`],
          };
        }

        try {
          schema.safeParse(frontmatter);
        } catch (error) {
          return {
            valid: false,
            errors: [`Failed to validate frontmatter for ${schemaName}: ${error}`],
          };
        }

        return { valid: true, errors: [] };
      },
    });

    const result = await processor.process();

    if (!result.success) {
      const errorCount = result.totalErrors;
      const fileCount = result.files.filter((f) => f.errors.length > 0).length;

      // Log detailed error information
      console.error('\nCompilation errors:');
      for (const [file, errors] of Object.entries(result.errorsByFile)) {
        console.error(`\n${file}:`);
        for (const error of errors) {
          console.error(`  - ${error.message}`);
          if (error.location) {
            console.error(`    ${error.location}`);
          }
        }
      }

      throw InternalError.compilationFailed(`${errorCount} errors in ${fileCount} files`, {
        errorCount,
        fileCount,
      });
    }

    s.stop(`✓ Compiled ${result.totalFiles} files`);
  } catch (err) {
    s.stop(`✗ Compilation failed`);
    throw err;
  }
}
