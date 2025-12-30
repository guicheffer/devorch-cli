import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { GlobalOptions } from '@/cli/lib/cli/command-registry.js';
import { countTokensInDirectory, formatTokenCount } from '@/utils/token-counter.js';

/**
 * Count tokens in a directory and output the formatted count
 * Usage: devorch count-tokens <directory>
 */
export async function countTokensCommand(options?: GlobalOptions): Promise<void> {
  const directory = options?.subCommand;

  if (!directory) {
    console.error('Error: Directory path required');
    console.error('Usage: devorch count-tokens <directory>');
    process.exit(1);
  }

  const resolvedPath = resolve(directory);

  if (!existsSync(resolvedPath)) {
    console.error(`Error: Directory not found: ${resolvedPath}`);
    process.exit(1);
  }

  const tokens = countTokensInDirectory(resolvedPath);
  const formatted = formatTokenCount(tokens);

  // Output just the formatted count for easy parsing
  console.log(formatted);
}
