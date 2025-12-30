import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { encode } from 'gpt-tokenizer';

/**
 * Count tokens in a single file
 * @param filePath Absolute path to the file
 * @returns Token count, or 0 if file cannot be read
 */
export function countTokensInFile(filePath: string): number {
  try {
    const content = readFileSync(filePath, 'utf-8');
    // gpt-tokenizer uses o200k_base encoding by default (GPT-4o, o1)
    const tokens = encode(content);
    return tokens.length;
  } catch (_err) {
    // Skip files we can't read (binary files, permissions, etc.)
    return 0;
  }
}

/**
 * Count tokens in all files within a directory recursively
 * @param dirPath Absolute path to the directory
 * @returns Total token count from all files
 */
export function countTokensInDirectory(dirPath: string): number {
  if (!existsSync(dirPath)) {
    return 0;
  }

  let totalTokens = 0;

  try {
    const entries = readdirSync(dirPath, { recursive: true, withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile()) {
        const filePath = join(entry.path || dirPath, entry.name);
        try {
          // Only count tokens for text files (md, mdc, json, yml, yaml, txt)
          const ext = entry.name.split('.').pop()?.toLowerCase();
          if (ext && ['md', 'mdc', 'json', 'yml', 'yaml', 'txt'].includes(ext)) {
            totalTokens += countTokensInFile(filePath);
          }
        } catch (_err) {
          // Skip files we can't process
        }
      }
    }
  } catch (_err) {
    // Skip directories we can't read
    return 0;
  }

  return totalTokens;
}

/**
 * Format token count for display (e.g., 125000 -> "125k")
 */
export function formatTokenCount(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  }
  if (tokens >= 1000) {
    return `${Math.round(tokens / 1000)}k`;
  }
  return `${tokens}`;
}
