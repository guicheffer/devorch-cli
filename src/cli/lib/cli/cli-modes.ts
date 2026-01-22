import minimist from 'minimist';
import { INSTALL_PATHS } from '@/cli/lib/filesystem/paths.js';
import { getTelemetry } from '@/cli/lib/telemetry/telemetry.js';
import { toDevOrchError } from '@/utils/errors.js';
import { initLogger } from '@/utils/logger.js';
import { executeCommand, type GlobalOptions, getCommand } from './command-registry.js';
import { showHelp, showVersion } from './help.js';
import { showMainMenu, showOutro, waitForEnter } from './menu-system.js';

/**
 * Parse command line arguments
 */
export function parseArgs() {
  return minimist(process.argv.slice(2), {
    string: ['local', 'agent', 'command'],
    boolean: ['debug', 'verbose', 'quiet', 'help', 'version', 'ci'],
    alias: {
      h: 'help',
      v: 'version',
    },
  });
}

/**
 * Extract global options from parsed arguments
 */
export function extractGlobalOptions(argv: minimist.ParsedArgs): GlobalOptions {
  return {
    local: argv.local,
    agent: argv.agent,
    debug: argv.debug,
    verbose: argv.verbose,
    quiet: argv.quiet,
    ci: argv.ci,
  };
}

/**
 * Initialize logger with global options
 */
export function setupLogger(options: GlobalOptions): void {
  const telemetry = getTelemetry();

  initLogger({
    debug: options.debug,
    verbose: options.verbose,
    quiet: options.quiet,
    logFile: options.debug ? INSTALL_PATHS.debugLog() : undefined,
    telemetryHook: telemetry
      ? (level, message, context) => telemetry.addLogBreadcrumb(level, message, context)
      : undefined,
  });
}

/**
 * Run CLI in direct command mode (non-interactive)
 * Handles: devorch install, devorch add subagent, etc.
 */
export async function runDirectMode(
  command: string,
  subCommand: string | undefined,
  globalOptions: GlobalOptions,
  version: string,
  argv?: minimist.ParsedArgs
): Promise<void> {
  // Handle help and version
  if (command === 'help') {
    showHelp(version);
    return;
  }

  if (command === 'version') {
    showVersion(version);
    return;
  }

  // Check if command exists
  if (!getCommand(command)) {
    showHelp(version);
    throw new Error(`Unknown command: ${command}`);
  }

  // Execute command with subCommand and any additional options if provided
  await executeCommand(command, {
    ...globalOptions,
    subCommand,
    ...(argv?.command && { command: argv.command }),
  });
}

/**
 * Run CLI in interactive menu mode
 * Handles: devorch (no arguments)
 */
export async function runInteractiveMode(
  globalOptions: GlobalOptions,
  version: string
): Promise<void> {
  while (true) {
    try {
      const command = await showMainMenu(version);

      // Handle back navigation (returns to main menu)
      if (command === 'back') {
        continue;
      }

      if (command === 'exit') {
        showOutro('Thanks for using devorch! 👋', 'green');
        return;
      }

      console.log('');

      // Execute command
      await executeCommand(command, { ...globalOptions });

      // Wait for user to press enter before showing menu again
      await waitForEnter();
    } catch (err) {
      // Handle error with global handler in interactive mode
      // Show formatted error but don't exit - return to menu
      const error = toDevOrchError(err);
      console.error(error.format());
      await waitForEnter();
    }
  }
}
