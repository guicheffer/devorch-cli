/**
 * Ralph init command
 * Initializes a new feature folder structure for the Ralph Wiggum loop
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { GlobalOptions } from '@/cli/lib/cli/command-registry.js';
import { loadConfig } from '@/cli/lib/config/config-loader.js';
import {
  getAsciiArt,
  getFeaturePath,
  renderPlanTemplate,
  renderPromptTemplate,
} from '@/cli/lib/harness/index.js';
import { flushAndExit } from '@/cli/lib/telemetry/telemetry.js';
import { ensureDir, writeFile } from '@/utils/files.js';
import { logger } from '@/utils/logger.js';
import { log, promptConfirm, promptText } from '@/utils/ui.js';

interface InitOptions extends GlobalOptions {
  feature?: string;
}

export async function initCommand(options: InitOptions): Promise<void> {
  logger.debug('Ralph init command started', { options });

  // Require context_training to be configured
  let contextTrainingName: string | undefined;
  try {
    const config = loadConfig();
    contextTrainingName = config.profile.context_training;
  } catch {
    // Config not found
  }

  if (!contextTrainingName) {
    log('Context training not configured.', 'error');
    log('Ralph requires context training to provide Claude with project patterns.', 'info');
    log('', 'info');
    log('To fix this:', 'info');
    log('  1. Run /train-context to create context training for your project', 'info');
    log('  2. Add to devorch/config.local.yml:', 'info');
    log('     profile:', 'info');
    log('       context_training: your-training-name', 'info');
    await flushAndExit(1);
    return;
  }

  // Prompt for feature name if not provided
  let featureName = options.feature;
  if (!featureName) {
    featureName = await promptText('Enter feature name:', 'my-feature');
  }

  // Sanitize feature name (convert to kebab-case)
  featureName = featureName.toLowerCase().replace(/[^a-z0-9-]/g, '-');

  const featurePath = getFeaturePath(featureName);

  // Check if feature already exists
  if (existsSync(featurePath)) {
    log(`Feature "${featureName}" already exists at ${featurePath}`, 'warn');
    const shouldUpdate = await promptConfirm('Do you want to regenerate PROMPT.md?');
    if (shouldUpdate) {
      const promptContent = renderPromptTemplate(featureName, contextTrainingName);
      writeFile(join(featurePath, 'PROMPT.md'), promptContent);
      log('PROMPT.md regenerated!', 'success');
    } else {
      log('Cancelled.', 'info');
    }
    return;
  }

  // Display welcome banner
  console.log(getAsciiArt());
  console.log('\n        "I\'m helping!" - Ralph Wiggum\n');
  console.log(`  Feature: ${featureName}`);
  console.log(`  Path: ${featurePath}`);
  console.log('');

  // Create folder structure
  logger.debug('Creating feature folder structure', { featurePath });

  // Create main feature directory
  ensureDir(featurePath);

  // Create subdirectories
  ensureDir(join(featurePath, 'specs'));
  ensureDir(join(featurePath, 'logs'));

  // Write PROMPT.md from template
  const promptContent = renderPromptTemplate(featureName, contextTrainingName);
  writeFile(join(featurePath, 'PROMPT.md'), promptContent);

  // Write PLAN.md from template
  const planContent = renderPlanTemplate(featureName);
  writeFile(join(featurePath, 'PLAN.md'), planContent);

  log('', 'info');
  log(`Feature "${featureName}" initialized!`, 'success');
  log('', 'info');
  log('Next steps:', 'info');
  log(`  1. Run: devorch harness create-specs ${featureName}`, 'info');
  log(`  2. Review and edit: ${join(featurePath, 'PLAN.md')}`, 'info');
  log(`  3. Start the loop: devorch harness loop ${featureName}`, 'info');
}
