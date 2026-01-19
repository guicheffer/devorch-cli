/**
 * Harness command dispatcher
 * Implements the "Ralph Wiggum" external harness pattern - running Claude Code
 * in a bash loop with feature-based specs and progress tracking.
 */

import minimist from 'minimist';
import type { GlobalOptions } from '@/cli/lib/cli/command-registry.js';
import { flushAndExit } from '@/cli/lib/telemetry/telemetry.js';
import { logger } from '@/utils/logger.js';
import { createSpecsCommand } from './create-specs.js';
import { initCommand } from './init.js';
import { listCommand } from './list.js';
import { loopCommand } from './loop.js';
import { statusCommand } from './status.js';

interface HarnessOptions extends GlobalOptions {
  subCommand?: string;
}

/**
 * Harness command dispatcher
 * Usage:
 *   devorch harness init <feature>
 *   devorch harness loop <feature> [--max-iterations N] [--verbose]
 *   devorch harness create-specs <feature>
 *   devorch harness list
 *   devorch harness status <feature>
 */
export async function harnessCommand(options: HarnessOptions = {}): Promise<void> {
  const subCommand = options.subCommand;

  if (!subCommand) {
    console.error('No subcommand provided for harness command\n');
    printUsage();
    await flushAndExit(1);
  }

  // Re-parse argv to get all positional arguments
  const argv = minimist(process.argv.slice(2));
  const command = subCommand;
  const feature = argv._[2]; // Feature name is the third positional argument

  try {
    switch (command) {
      case 'init':
        await initCommand({ ...options, feature });
        break;

      case 'loop':
        await loopCommand({
          ...options,
          feature,
          maxIterations: argv['max-iterations'] as number | undefined,
          verbose: argv['verbose'] as boolean | undefined,
        });
        break;

      case 'create-specs':
        await createSpecsCommand({
          ...options,
          feature,
          headless: argv['headless'] as boolean | undefined,
          verbose: argv['verbose'] as boolean | undefined,
        });
        break;

      case 'list':
        await listCommand(options);
        break;

      case 'status':
        await statusCommand({ ...options, feature });
        break;

      default:
        console.error(`Unknown harness subcommand: ${command}\n`);
        printUsage();
        await flushAndExit(1);
    }
  } catch (err) {
    logger.error('Harness command failed', { subCommand, error: err });
    throw err;
  }
}

function printUsage(): void {
  console.log('Available subcommands:');
  console.log('  init <feature>            Initialize a new feature folder structure');
  console.log('  loop <feature>            Run the external bash loop');
  console.log('  create-specs <feature>    Boot Claude to write detailed specs');
  console.log('  list                      List existing features');
  console.log('  status <feature>          Show PLAN.md progress');
  console.log('');
  console.log('Usage:');
  console.log('  devorch harness init my-feature');
  console.log('  devorch harness create-specs my-feature');
  console.log('  devorch harness create-specs my-feature --headless');
  console.log('  devorch harness loop my-feature');
  console.log('  devorch harness loop my-feature --verbose        # Show all message types');
  console.log('  devorch harness loop my-feature --max-iterations 10');
  console.log('  devorch harness list');
  console.log('  devorch harness status my-feature');
}
