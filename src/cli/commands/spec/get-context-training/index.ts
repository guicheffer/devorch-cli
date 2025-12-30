/**
 * Get the current context-training configuration
 * AI-friendly command that outputs machine-readable format
 */

import type { GlobalOptions } from '@/cli/lib/cli/command-registry.js';
import { loadConfig } from '@/cli/lib/config/config-loader.js';
import { contextTrainingExists } from '@/cli/lib/context-training/context-training-loader.js';
import { getProjectDir } from '@/cli/lib/filesystem/paths.js';
import { flushAndExit } from '@/cli/lib/telemetry/telemetry.js';
import { logger } from '@/utils/logger.js';

interface GetContextTrainingOptions extends GlobalOptions {}

/**
 * Get-context-training command
 * Usage:
 *   devorch get-context-training  # Get current context-training value
 */
export async function getContextTrainingCommand(
  _options: GetContextTrainingOptions = {}
): Promise<void> {
  const projectDir = getProjectDir();

  try {
    // Load config to get context-training value
    const config = loadConfig(projectDir);
    const contextTraining = config.profile.context_training;

    if (!contextTraining) {
      // No context-training configured
      logger.debug('No context-training configured');
      console.log('CONTEXT_TRAINING=');
      console.log('CONFIGURED=false');
      await flushAndExit(0);
    }

    // Check if it exists
    const exists = contextTrainingExists(contextTraining, projectDir);

    // Output machine-readable format
    console.log(`CONTEXT_TRAINING=${contextTraining}`);
    console.log('CONFIGURED=true');
    console.log(`EXISTS=${exists}`);

    if (exists) {
      console.log(`PATH=devorch/context-training/${contextTraining}/`);
    }

    logger.debug('Retrieved context-training config', {
      contextTraining,
      exists,
    });

    await flushAndExit(0);
  } catch (err) {
    logger.error('get-context-training command failed', { error: err });

    // Output error in machine-readable format
    console.log('ERROR=command_failed');
    console.log(`MESSAGE=${err instanceof Error ? err.message : 'Unknown error'}`);
    await flushAndExit(2);
  }
}
