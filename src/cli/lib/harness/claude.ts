/**
 * Claude process utilities for Harness commands
 *
 * Re-exports from the shared claude-runner module for backwards compatibility.
 */

import { runHeadless, runInteractive, runPrint } from '@/cli/lib/claude-runner/index.js';

/**
 * Run Claude CLI with the given prompt (print mode - outputs and exits)
 */
export async function runClaude(promptContent: string, skipPermissions: boolean): Promise<number> {
  const result = await runPrint(promptContent, { skipPermissions });
  return result.exitCode;
}

/**
 * Run Claude CLI in fully interactive mode
 * Allows AskUserQuestion and other interactive tools to work
 * Uses acceptEdits mode + dangerously-skip-permissions for Shift+Tab override
 */
export async function runClaudeInteractive(promptContent: string): Promise<number> {
  const result = await runInteractive(promptContent);
  return result.exitCode;
}

/**
 * Run Claude CLI in headless mode with pretty-printed output
 */
export async function runClaudeHeadless(promptContent: string): Promise<number> {
  const result = await runHeadless(promptContent);
  return result.exitCode;
}
