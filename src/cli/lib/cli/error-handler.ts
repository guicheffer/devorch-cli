import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import * as clack from '@clack/prompts';
import { INSTALL_PATHS } from '@/cli/lib/filesystem/paths.js';
import { flushTelemetry, getTelemetry } from '@/cli/lib/telemetry/telemetry.js';
import { colors } from '@/utils/colors.js';
import { addSystemContext, toDevOrchError } from '@/utils/errors.js';

/**
 * Handle errors globally and exit
 */
export function handleError(err: unknown, operation?: string): never {
  const error = toDevOrchError(err, operation);

  // Special handling for user cancellation (E006)
  if (error.code === 'E006') {
    // Clean up installation lock if it exists
    try {
      const lockPath = join(process.cwd(), INSTALL_PATHS.lockFile());
      if (existsSync(lockPath)) {
        rmSync(lockPath, { force: true });
      }
    } catch (_err) {
      // Ignore cleanup errors
    }

    // Clean up terminal properly for @clack prompts
    console.log('');
    clack.outro(colors.yellow('Operation cancelled'));
    process.exit(0);
  }

  // Send error to Sentry
  const telemetry = getTelemetry();
  if (telemetry) {
    telemetry.captureException(error, {
      errorCode: error.code,
      errorCategory: error.category,
      operation,
      ...error.context,
    });
  }

  // Display formatted error
  console.error(error.format());

  // Add debug information if it's an internal error
  if (error.code.startsWith('E4')) {
    console.error(`\n${colors.dim('Debug Information:')}`);
    console.error(colors.dim(`  Stack: ${error.stack}`));

    const context = addSystemContext();
    console.error(colors.dim(`  CLI Version: ${context.cliVersion}`));
    console.error(colors.dim(`  Platform: ${context.platform}`));
    console.error(colors.dim(`  Node: ${context.nodeVersion}`));

    console.error(`\n${colors.yellow('This appears to be a bug. Please report it:')}`);
    console.error(colors.yellow('https://github.com/guicheffer/devorch/issues/new'));
    console.error(colors.dim('\nInclude the error code, message, and debug information above.'));
  }

  // Flush telemetry before exiting to ensure error is sent
  flushTelemetry(500).finally(() => {
    process.exit(1);
  });

  // TypeScript needs this for the `never` return type, but it won't be reached
  // because process.exit() in .finally() will terminate the process
  throw error;
}
