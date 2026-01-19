/**
 * Ralph loop command
 * Runs Claude Code in an external bash loop with progress tracking
 */

import type { GlobalOptions } from '@/cli/lib/cli/command-registry.js';
import {
  featureExists,
  getAsciiArt,
  getPlanPath,
  getPromptPath,
  getSpecsPath,
  hasSpecs,
  hasTasks,
  runClaudeHeadless,
  sleep,
} from '@/cli/lib/harness/index.js';
import { flushAndExit } from '@/cli/lib/telemetry/telemetry.js';
import { readFile } from '@/utils/files.js';
import { logger } from '@/utils/logger.js';
import { log, promptText } from '@/utils/ui.js';

interface LoopOptions extends GlobalOptions {
  feature?: string;
  maxIterations?: number;
  verbose?: boolean;
}

export async function loopCommand(options: LoopOptions): Promise<void> {
  logger.debug('Ralph loop command started', { options });

  // Prompt for feature name if not provided
  let featureName = options.feature;
  if (!featureName) {
    featureName = await promptText('Enter feature name:');
  }

  // Guardrail: Check if feature exists
  if (!featureExists(featureName)) {
    log(`Feature "${featureName}" not found.`, 'error');
    log(`Run \`devorch harness init ${featureName}\` first.`, 'info');
    await flushAndExit(1);
    return;
  }

  // Guardrail: Check if specs exist
  const specsPath = getSpecsPath(featureName);
  if (!hasSpecs(specsPath)) {
    log(`No specs found for feature "${featureName}".`, 'error');
    log(`Run \`devorch harness create-specs ${featureName}\` first.`, 'info');
    await flushAndExit(1);
    return;
  }

  // Guardrail: Check if PLAN.md has tasks
  const planPath = getPlanPath(featureName);
  if (!hasTasks(planPath)) {
    log(`No tasks found in PLAN.md for feature "${featureName}".`, 'error');
    log(`Add tasks to ${planPath} before starting the loop.`, 'info');
    await flushAndExit(1);
    return;
  }

  // Read PROMPT.md content (context training is baked in from init)
  const promptPath = getPromptPath(featureName);
  const promptContent = readFile(promptPath);

  const maxIterations = options.maxIterations ?? 20;

  // Display ASCII art banner
  console.log(getAsciiArt());

  log(`Starting Ralph loop for "${featureName}"`, 'info');
  log(`Max iterations: ${maxIterations}`, 'info');
  log('Press Ctrl+C to stop the loop gracefully.', 'info');
  console.log('');

  // Set up signal handling for graceful shutdown
  let shouldStop = false;
  const handleSignal = () => {
    console.log('\n\nReceived interrupt signal. Stopping after current iteration...');
    shouldStop = true;
  };
  process.on('SIGINT', handleSignal);
  process.on('SIGTERM', handleSignal);

  let iteration = 0;

  try {
    while (!shouldStop && iteration < maxIterations) {
      iteration++;
      console.log(`\n${'='.repeat(60)}`);
      console.log(
        `ITERATION ${iteration}${maxIterations !== Infinity ? ` / ${maxIterations}` : ''}`
      );
      console.log(`${'='.repeat(60)}\n`);

      // Run Claude with the prompt (headless with pretty-printed output)
      const exitCode = await runClaudeHeadless(promptContent);

      if (exitCode !== 0) {
        log(`Claude exited with code ${exitCode}`, 'warn');
      }

      // Check for completion marker in PLAN.md
      const planContent = readFile(planPath);
      if (planContent.includes('## COMPLETED')) {
        console.log('\n');
        log('All tasks completed! Found "## COMPLETED" marker in PLAN.md', 'success');
        break;
      }

      // Brief pause between iterations
      await sleep(1000);
    }

    if (shouldStop) {
      log('Loop stopped by user.', 'info');
    } else if (iteration >= maxIterations) {
      log(`Reached maximum iterations (${maxIterations}).`, 'info');
    }
  } finally {
    // Clean up signal handlers
    process.off('SIGINT', handleSignal);
    process.off('SIGTERM', handleSignal);
  }

  log(`Completed ${iteration} iteration(s).`, 'info');
}
