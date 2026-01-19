/**
 * Integration with claude-pretty-printer for formatted output
 */

import { logger } from '@/utils/logger.js';
import type { ClaudeRunResult } from './types.js';

export interface PrettyPrinterOptions {
  /** Skip permission prompts */
  skipPermissions?: boolean;
  /** Filter message types (e.g., ['assistant', 'result']) */
  filter?: string[];
}

/**
 * Spawn Claude with output piped through claude-pretty-printer
 *
 * @param prompt - The prompt to send to Claude
 * @param options - Pretty printer options
 * @returns Result with exit code
 */
export async function spawnWithPrettyPrinter(
  prompt: string,
  options: PrettyPrinterOptions = {}
): Promise<ClaudeRunResult> {
  const { skipPermissions = true, filter } = options;

  // Note: --verbose is REQUIRED when using -p with --output-format=stream-json
  const claudeArgs = ['claude', '-p', '--output-format=stream-json', '--verbose'];

  if (skipPermissions) {
    claudeArgs.push('--dangerously-skip-permissions');
  }

  logger.debug('Spawning Claude with pretty-printer', { filter });

  try {
    const claude = Bun.spawn(claudeArgs, {
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'inherit',
    });

    claude.stdin.write(prompt);
    claude.stdin.end();

    // Build pretty-printer args
    const prettyPrinterArgs = ['npx', 'claude-pretty-printer'];
    if (filter && filter.length > 0) {
      prettyPrinterArgs.push('--filter', filter.join(','));
    }

    const prettyPrinter = Bun.spawn(prettyPrinterArgs, {
      stdin: claude.stdout,
      stdout: 'inherit',
      stderr: 'inherit',
    });

    await prettyPrinter.exited;
    const exitCode = prettyPrinter.exitCode ?? 0;
    logger.debug('Claude with pretty-printer completed', { exitCode });
    return { exitCode };
  } catch (err) {
    logger.error('Failed to run Claude with pretty-printer', { error: err });
    return { exitCode: 1 };
  }
}
