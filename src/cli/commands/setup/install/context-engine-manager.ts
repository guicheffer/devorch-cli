import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { log, promptSelect, spinner } from '@/utils/ui.js';

export interface ContextInfo {
  name: string;
  displayName: string;
  description: string;
}

/**
 * List available context-engine boilerplates from templates directory
 */
export function listAvailableContexts(sourceConfigDir: string): ContextInfo[] {
  const contextsDir = join(sourceConfigDir, 'templates', 'context-engine');

  if (!existsSync(contextsDir)) {
    return [];
  }

  try {
    const entries = readdirSync(contextsDir);

    return entries
      .filter((entry) => {
        const entryPath = join(contextsDir, entry);
        const implementersDir = join(entryPath, 'implementers');
        return statSync(entryPath).isDirectory() && existsSync(implementersDir);
      })
      .map((entry) => {
        // Format display name from directory name (e.g., "mobile-react-native" -> "Mobile React Native")
        const displayName = entry
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        return {
          name: entry,
          displayName,
          description: `${displayName} context training boilerplate`,
        };
      });
  } catch (err) {
    log(`Warning: Failed to list contexts: ${(err as Error).message}`, 'warn');
    return [];
  }
}

/**
 * Generate hint text for context option
 */
function getContextHint(context: ContextInfo): string {
  return context.description;
}

/**
 * Copy context from templates to project's context-training directory
 */
export function copyContextToProject(
  contextName: string,
  sourceConfigDir: string,
  projectDir: string
): void {
  const sourceContextsDir = join(sourceConfigDir, 'templates', 'context-engine');
  const contextTrainingDir = join(projectDir, 'devorch', 'context-training');

  // Ensure context-training directory exists
  if (!existsSync(contextTrainingDir)) {
    mkdirSync(contextTrainingDir, { recursive: true });
  }

  const sourcePath = join(sourceContextsDir, contextName);
  const destPath = join(contextTrainingDir, contextName);

  // Copy entire directory recursively
  cpSync(sourcePath, destPath, { recursive: true });
}

/**
 * Prompt user to select a context (mandatory - no skip)
 * @returns The selected context name or 'custom' if user wants to generate their own
 */
export async function promptContextSelection(sourceConfigDir: string): Promise<string | 'custom'> {
  const availableContexts = listAvailableContexts(sourceConfigDir);

  if (availableContexts.length === 0) {
    return 'custom';
  }

  log('\n');
  log('📦 Context Training Setup', 'info');
  log(
    'Context training provides repository-specific patterns and guidelines.\n' +
      'You can either:\n' +
      '  • Use a pre-built boilerplate from context-engine\n' +
      '  • Generate your own from your PR history (recommended)\n',
    'info'
  );

  const options = [
    ...availableContexts.map((context) => ({
      value: context.name,
      label: `${context.displayName} (boilerplate)`,
      hint: getContextHint(context),
    })),
    {
      value: 'custom',
      label: 'Generate my own (recommended)',
      hint: 'Analyze your PR history',
    },
  ];

  const selected = await promptSelect('How would you like to set up context training?', options);

  return selected;
}

/**
 * Install a context boilerplate to the project
 */
export function installContextBoilerplate(
  contextName: string,
  sourceConfigDir: string,
  projectDir: string
): void {
  const s = spinner();
  s.start(`Installing ${contextName}...`);

  try {
    copyContextToProject(contextName, sourceConfigDir, projectDir);
    s.stop(`✓ Context installed: ${contextName}`);
  } catch (err) {
    s.stop('✗ Failed to install context');
    log(`Error: ${(err as Error).message}`, 'error');
    throw err;
  }
}

/**
 * Show instructions for generating custom context training
 */
export function showCustomContextInstructions(): void {
  log('\n');
  log(
    '📚 Generating Custom Context Training\n' +
      '\n' +
      'Custom context training tailors devorch to YOUR codebase:\n' +
      '  • Learns patterns from YOUR merged PRs\n' +
      "  • Follows YOUR team's conventions and standards\n" +
      "  • Uses YOUR project's architecture and best practices\n" +
      '\n' +
      'To create your own:\n' +
      '  1. First, complete the installation by running:\n' +
      '     devorch install\n' +
      '     (This will create the config without context training)\n' +
      '\n' +
      '  2. Then run: /analyze-tech-stack\n' +
      '     This analyzes your dependencies and creates devorch/tech-stack.md\n' +
      '\n' +
      '  3. Finally run: /train-context\n' +
      '     This analyzes your PR history and generates context-training files\n' +
      '\n' +
      '  Requirements: gh CLI (GitHub CLI) and jq\n' +
      '  Install via: brew install gh jq',
    'info'
  );
  log('\n');
  log('Exiting setup. Run "devorch install" when ready to continue.', 'info');
}
