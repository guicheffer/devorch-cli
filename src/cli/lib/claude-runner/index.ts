/**
 * Claude CLI Runner
 *
 * Provides abstractions for spawning Claude CLI in different modes:
 * - print: One-shot execution with direct output
 * - interactive: Full interactive session with stdin pipe
 * - headless: Non-interactive with optional pretty-printing
 *
 * @example
 * ```typescript
 * import { ClaudeRunner } from '@/cli/lib/claude-runner/index.js';
 *
 * // One-shot print mode
 * await ClaudeRunner.print('Explain this code', { skipPermissions: true });
 *
 * // Interactive session
 * await ClaudeRunner.interactive('Help me write tests');
 *
 * // Headless with pretty-printing
 * await ClaudeRunner.headless(promptContent);
 * ```
 */

export { spawnWithPrettyPrinter } from './pretty-printer.js';
export * from './runner.js';
export * from './types.js';
