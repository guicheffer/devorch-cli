/**
 * Claude CLI process runner
 *
 * Provides methods for spawning Claude CLI in different modes:
 * - print: One-shot execution with direct output
 * - interactive: Full interactive session with stdin pipe
 * - headless: Non-interactive with optional pretty-printing
 */

import { logger } from '@/utils/logger.js';
import { spawnWithPrettyPrinter } from './pretty-printer.js';
import type { ClaudeRunOptions, ClaudeRunResult, HeadlessOptions } from './types.js';

/**
 * Run Claude CLI in print mode (one-shot, outputs directly)
 *
 * @param prompt - The prompt to send to Claude
 * @param options - Run options
 * @returns Result with exit code
 */
export async function runPrint(
  prompt: string,
  options: ClaudeRunOptions = {}
): Promise<ClaudeRunResult> {
  const args = ['claude', '-p', prompt];

  if (options.skipPermissions) {
    args.push('--dangerously-skip-permissions');
  }

  if (options.permissionMode) {
    args.push('--permission-mode', options.permissionMode);
  }

  if (options.verbose) {
    args.push('--verbose');
  }

  logger.debug('Running Claude in print mode', {
    argsCount: args.length,
    promptLength: prompt.length,
  });

  try {
    const claude = Bun.spawn(args, {
      stdin: 'inherit',
      stdout: 'inherit',
      stderr: 'inherit',
    });

    const exitCode = await claude.exited;
    logger.debug('Claude print mode completed', { exitCode });
    return { exitCode: exitCode ?? 0 };
  } catch (err) {
    logger.error('Failed to spawn Claude in print mode', { error: err });
    return { exitCode: 1 };
  }
}

/**
 * Run Claude CLI in fully interactive mode
 *
 * Allows AskUserQuestion and other interactive tools to work.
 * Uses acceptEdits mode + dangerously-skip-permissions for Shift+Tab override.
 *
 * @param prompt - The initial prompt to send via stdin
 * @param options - Run options
 * @returns Result with exit code
 */
export async function runInteractive(
  prompt: string,
  options: ClaudeRunOptions = {}
): Promise<ClaudeRunResult> {
  const args = ['claude'];

  // Default to acceptEdits + skip permissions for interactive mode
  args.push('--permission-mode', options.permissionMode ?? 'acceptEdits');
  args.push('--dangerously-skip-permissions');

  if (options.verbose) {
    args.push('--verbose');
  }

  logger.debug('Running Claude in interactive mode');

  try {
    const claude = Bun.spawn(args, {
      stdin: 'pipe',
      stdout: 'inherit',
      stderr: 'inherit',
    });

    claude.stdin.write(prompt);
    claude.stdin.end();

    await claude.exited;
    const exitCode = claude.exitCode ?? 0;
    logger.debug('Claude interactive mode completed', { exitCode });
    return { exitCode };
  } catch (err) {
    logger.error('Failed to run interactive Claude', { error: err });
    return { exitCode: 1 };
  }
}

/**
 * Run Claude CLI in headless mode with optional pretty-printed output
 *
 * @param prompt - The prompt to send to Claude
 * @param options - Headless options including pretty-print settings
 * @returns Result with exit code
 */
export async function runHeadless(
  prompt: string,
  options: HeadlessOptions = {}
): Promise<ClaudeRunResult> {
  const { prettyPrint = true, filter, ...baseOptions } = options;

  logger.debug('Running Claude in headless mode', { prettyPrint });

  if (prettyPrint) {
    return spawnWithPrettyPrinter(prompt, {
      skipPermissions: true,
      filter: filter ?? ['assistant', 'result'],
    });
  }

  // Non-pretty-print headless mode
  // Note: --verbose is REQUIRED when using -p with --output-format=stream-json
  const args = ['claude', '-p', '--output-format=stream-json', '--verbose'];

  if (baseOptions.skipPermissions ?? true) {
    args.push('--dangerously-skip-permissions');
  }

  try {
    const claude = Bun.spawn(args, {
      stdin: 'pipe',
      stdout: 'inherit',
      stderr: 'inherit',
    });

    claude.stdin.write(prompt);
    claude.stdin.end();

    await claude.exited;
    const exitCode = claude.exitCode ?? 0;
    logger.debug('Claude headless mode completed', { exitCode });
    return { exitCode };
  } catch (err) {
    logger.error('Failed to run headless Claude', { error: err });
    return { exitCode: 1 };
  }
}

/**
 * ClaudeRunner - Static class providing Claude CLI execution methods
 */
export const ClaudeRunner = {
  /**
   * Run Claude in print mode (one-shot, direct output)
   */
  print: runPrint,

  /**
   * Run Claude in interactive mode (full session with stdin)
   */
  interactive: runInteractive,

  /**
   * Run Claude in headless mode (non-interactive with pretty-print)
   */
  headless: runHeadless,
} as const;
