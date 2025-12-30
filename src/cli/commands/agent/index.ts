/**
 * Agent command dispatcher
 * Handles subcommands under `devorch agent`
 */

import minimist from 'minimist';
import type { GlobalOptions } from '@/cli/lib/cli/command-registry.js';
import { flushAndExit } from '@/cli/lib/telemetry/telemetry.js';
import { logger } from '@/utils/logger.js';
import { getContextTrainingSchemaCommand } from './get-context-training-schema/index.js';

interface AgentOptions extends GlobalOptions {
  subCommand?: string;
}

/**
 * Agent command dispatcher
 * Usage:
 *   devorch agent get-context-training-schema <type>
 */
export async function agentCommand(options: AgentOptions = {}): Promise<void> {
  const subCommand = options.subCommand;

  if (!subCommand) {
    console.error('❌ No subcommand provided for agent command\n');
    console.log('Available subcommands:');
    console.log('  get-context-training-schema <type>  Get schema for context training files');
    console.log('');
    console.log('Usage:');
    console.log('  devorch agent get-context-training-schema implementer');
    console.log('  devorch agent get-context-training-schema verifier');
    await flushAndExit(1);
  }

  // Re-parse argv to get all positional arguments
  // argv: ['agent', 'get-context-training-schema', 'implementer']
  const argv = minimist(process.argv.slice(2));
  const command = subCommand; // This is argv._[1] = 'get-context-training-schema'
  const schemaType = argv._[2]; // This is argv._[2] = 'implementer'

  try {
    switch (command) {
      case 'get-context-training-schema':
        await getContextTrainingSchemaCommand({
          ...options,
          schemaType: schemaType as 'implementer' | 'verifier',
        });
        break;

      default:
        console.error(`❌ Unknown agent subcommand: ${command}\n`);
        console.log('Available subcommands:');
        console.log('  get-context-training-schema <type>  Get schema for context training files');
        await flushAndExit(1);
    }
  } catch (err) {
    logger.error('Agent command failed', { subCommand, error: err });
    throw err;
  }
}
