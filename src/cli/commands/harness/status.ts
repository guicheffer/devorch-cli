/**
 * Ralph status command
 * Shows detailed progress for a feature from PLAN.md
 */

import { readdirSync } from 'node:fs';
import type { GlobalOptions } from '@/cli/lib/cli/command-registry.js';
import {
  analyzePlan,
  countCriteria,
  createProgressBar,
  featureExists,
  getFeaturePath,
  getLogsPath,
  getPlanPath,
  getSpecsPath,
} from '@/cli/lib/harness/index.js';
import { flushAndExit } from '@/cli/lib/telemetry/telemetry.js';
import { fileExists, readFile } from '@/utils/files.js';
import { logger } from '@/utils/logger.js';
import { log, promptText } from '@/utils/ui.js';

interface StatusOptions extends GlobalOptions {
  feature?: string;
}

export async function statusCommand(options: StatusOptions): Promise<void> {
  logger.debug('Ralph status command started', { options });

  // Prompt for feature name if not provided
  let featureName = options.feature;
  if (!featureName) {
    featureName = await promptText('Enter feature name:');
  }

  // Check if feature exists
  if (!featureExists(featureName)) {
    log(`Feature "${featureName}" not found.`, 'error');
    log(`Run \`devorch harness init ${featureName}\` first.`, 'info');
    await flushAndExit(1);
    return;
  }

  const planPath = getPlanPath(featureName);
  const specsPath = getSpecsPath(featureName);
  const logsPath = getLogsPath(featureName);
  const featurePath = getFeaturePath(featureName);

  console.log('');
  console.log(`Feature: ${featureName}`);
  console.log(`Path: ${featurePath}`);
  console.log('');

  // Show specs status
  console.log('Specs:');
  if (fileExists(specsPath)) {
    try {
      const specFiles = readdirSync(specsPath).filter((f) => f.endsWith('.md'));
      if (specFiles.length > 0) {
        for (const file of specFiles) {
          console.log(`  - ${file}`);
        }
      } else {
        console.log('  (no spec files)');
      }
    } catch {
      console.log('  (error reading specs)');
    }
  } else {
    console.log('  (specs directory not found)');
  }
  console.log('');

  // Show iterations
  console.log('Iterations:');
  if (fileExists(logsPath)) {
    try {
      const logFiles = readdirSync(logsPath)
        .filter((f) => f.startsWith('iteration-'))
        .sort();
      if (logFiles.length > 0) {
        console.log(`  ${logFiles.length} completed`);
        // Show last 3 iterations
        const lastLogs = logFiles.slice(-3);
        for (const file of lastLogs) {
          console.log(`  - ${file}`);
        }
        if (logFiles.length > 3) {
          console.log(`  ... and ${logFiles.length - 3} more`);
        }
      } else {
        console.log('  (no iterations yet)');
      }
    } catch {
      console.log('  (error reading logs)');
    }
  } else {
    console.log('  (logs directory not found)');
  }
  console.log('');

  // Parse and show PLAN.md progress
  if (!fileExists(planPath)) {
    log('PLAN.md not found.', 'warn');
    return;
  }

  const planContent = readFile(planPath);
  const analysis = analyzePlan(planContent);

  // Show overall status
  console.log('='.repeat(50));
  console.log('PLAN.md Progress');
  console.log('='.repeat(50));
  console.log('');

  if (analysis.isCompleted) {
    console.log('Status: COMPLETED');
  } else {
    console.log(`Status: ${analysis.statusLine || 'IN_PROGRESS'}`);
  }
  console.log('');

  // Show task progress
  console.log('Tasks:');
  if (analysis.tasks.length === 0) {
    console.log('  (no tasks defined)');
  } else {
    for (const task of analysis.tasks) {
      const completed = task.criteria.filter((c) => c.checked).length;
      const total = task.criteria.length;
      const icon = completed === total ? '[x]' : `[${completed}/${total}]`;
      console.log(`  ${icon} ${task.name}`);

      // Show individual criteria
      for (const criterion of task.criteria) {
        const checkIcon = criterion.checked ? '[x]' : '[ ]';
        console.log(`      ${checkIcon} ${criterion.text}`);
      }
      console.log('');
    }
  }

  // Show summary
  const { total, completed } = countCriteria(analysis);

  console.log('='.repeat(50));
  console.log(`Progress: ${completed}/${total} acceptance criteria`);

  if (total > 0) {
    const percentage = Math.round((completed / total) * 100);
    const bar = createProgressBar(percentage, 30);
    console.log(`         ${bar} ${percentage}%`);
  }
  console.log('');
}
