#!/usr/bin/env node
import {
  extractGlobalOptions,
  parseArgs,
  runDirectMode,
  runInteractiveMode,
  setupLogger,
} from '@/cli/lib/cli/cli-modes.js';
import { handleError } from '@/cli/lib/cli/error-handler.js';
import { showHelp, showVersion } from '@/cli/lib/cli/help.js';
import { setupSignalHandlers } from '@/cli/lib/cli/signal-handler.js';
import { initTelemetry, shutdownTelemetry } from '@/cli/lib/telemetry/telemetry.js';
import { getCliVersion, isDevMode } from '@/utils/version.js';
import { checkForUpdates } from '@/utils/version-checker.js';

const VERSION = getCliVersion();

// Warn when running in dev mode
if (isDevMode()) {
  console.warn('\x1b[33m%s\x1b[0m', 'Running in dev mode');
}

// Initialize telemetry
initTelemetry({ enabled: true }, VERSION);

async function main() {
  // Parse command line arguments
  const argv = parseArgs();

  // Handle help and version flags
  if (argv.help) {
    showHelp(VERSION);
    process.exit(0);
  }

  if (argv.version) {
    showVersion(VERSION);
    process.exit(0);
  }

  // Extract global options
  const globalOptions = extractGlobalOptions(argv);

  // Initialize logger
  setupLogger(globalOptions);

  // Destructure positional arguments
  const [command, subCommand] = argv._ as [string | undefined, string | undefined];

  // Check for updates (non-blocking, fails gracefully)
  // Pass command to skip banner for update command
  await checkForUpdates(VERSION, command);

  // Decide which mode to run
  if (command) {
    // Direct command mode (for testing and scripting)
    await runDirectMode(command, subCommand, globalOptions, VERSION, argv);
  } else {
    // Interactive menu mode
    await runInteractiveMode(globalOptions, VERSION);
  }
}

// Setup signal handlers
setupSignalHandlers();

// Run main and handle errors
main()
  .catch((err) => {
    handleError(err, 'main');
  })
  .finally(() => {
    // Fire and forget - let telemetry flush but don't block exit
    shutdownTelemetry();
  });

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, _promise) => {
  console.error('\n✗ Unhandled Promise Rejection');
  handleError(reason, 'unhandled-rejection');
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('\n✗ Uncaught Exception');
  handleError(err, 'uncaught-exception');
});
