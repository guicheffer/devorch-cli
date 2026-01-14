import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stringify as stringifyYaml } from 'yaml';
import { listContextTrainings } from '@/cli/lib/context-training/context-training-loader.js';
import { log, promptSelect, success } from '@/utils/ui.js';
import {
  type ContextInfo,
  installContextBoilerplate,
  listAvailableContexts,
} from './context-engine-manager.js';

/**
 * Generate hint text for context option
 */
function getContextHint(context: ContextInfo): string {
  return context.description;
}

/**
 * Create a local config file with context training selection
 */
export function createLocalConfig(projectDir: string, contextTrainingName: string): void {
  // Create devorch directory if it doesn't exist
  const specMachineDir = join(projectDir, 'devorch');
  if (!existsSync(specMachineDir)) {
    mkdirSync(specMachineDir, { recursive: true });
  }

  // Create local config
  const localConfig = {
    profile: {
      context_training: contextTrainingName,
    },
  };

  const localConfigPath = join(specMachineDir, 'config.local.yml');
  const localConfigContent = stringifyYaml(localConfig);
  writeFileSync(localConfigPath, localConfigContent, 'utf-8');

  success(`✓ Local config created at ${localConfigPath}`);
  log(`  You can change your context training anytime by editing this file.`, 'info');
}

/**
 * Show instructions for creating custom context training
 */
function showCreateInstructions(): void {
  log('\n');
  log(
    'To create custom context training:\n' +
      '  1. Run: /analyze-tech-stack\n' +
      '     This analyzes your dependencies and creates devorch/tech-stack.md\n' +
      '\n' +
      '  2. Run: /train-context\n' +
      '     This analyzes your PR history and generates context-training files\n' +
      '\n' +
      '  Requirements: gh CLI (GitHub CLI) and jq\n' +
      '  Install via: brew install gh jq',
    'info'
  );
  log('\n');
}

/**
 * Handle case when no context trainings exist in project
 */
async function handleNoContextTrainings(
  projectDir: string,
  sourceConfigDir?: string
): Promise<void> {
  const availableBoilerplates = sourceConfigDir ? listAvailableContexts(sourceConfigDir) : [];

  log('\n');
  log(
    'ℹ️  Context Training Not Configured\n' +
      'Context training provides repository-specific customizations:\n' +
      '  • Specification guidelines for your project\n' +
      '  • Implementation patterns learned from your codebase\n' +
      '  • Custom implementers and verifiers',
    'info'
  );
  log('\n');

  if (availableBoilerplates.length > 0) {
    // Offer boilerplates OR custom training (no skip option)
    const options = [
      ...availableBoilerplates.map((ctx) => ({
        value: ctx.name,
        label: ctx.displayName,
        hint: getContextHint(ctx),
      })),
      {
        value: 'create',
        label: 'Create my own (recommended)',
        hint: 'Analyze your PR history',
      },
    ];

    const selected = await promptSelect('Would you like to set up context training?', options);

    if (selected === 'create') {
      showCreateInstructions();
      return;
    }

    // User selected a boilerplate - install it
    // sourceConfigDir is guaranteed to exist here because availableBoilerplates.length > 0
    if (!sourceConfigDir) {
      throw new Error('sourceConfigDir is required to install context boilerplate');
    }
    installContextBoilerplate(selected, sourceConfigDir, projectDir);

    // Now create the local config pointing to this context
    createLocalConfig(projectDir, selected);

    return;
  }

  // No boilerplates available - show instructions
  showCreateInstructions();
}

/**
 * Handle case when context trainings exist in project
 */
async function handleExistingContextTrainings(
  projectDir: string,
  availableContextTrainings: string[]
): Promise<void> {
  log('\n');
  log('🎯 Context Training Configuration Required', 'info');
  log('Select which context training to use for this project.', 'info');
  log('\n');

  const contextTrainingOptions = availableContextTrainings.map((name) => ({
    value: name,
    label: name,
    hint: `Use ${name} context training`,
  }));

  const selectedContextTraining = await promptSelect(
    'Select context training (creates devorch/config.local.yml):',
    contextTrainingOptions
  );

  // User selected an existing context training - create local config
  createLocalConfig(projectDir, selectedContextTraining);
  log('\n');
  log(
    '💡 Tip: You can change your context training anytime by editing devorch/config.local.yml',
    'info'
  );
}

/**
 * Prompt user to create a local config file with context training override
 * @param projectDir - The project directory
 * @param sourceConfigDir - Optional source config directory for accessing context-engine boilerplates
 */
export async function promptLocalConfigCreation(
  projectDir: string,
  sourceConfigDir?: string
): Promise<void> {
  // Check if there are any context trainings available in the project
  const availableContextTrainings = listContextTrainings(projectDir);

  if (availableContextTrainings.length === 0) {
    await handleNoContextTrainings(projectDir, sourceConfigDir);
  } else {
    await handleExistingContextTrainings(projectDir, availableContextTrainings);
  }
}
