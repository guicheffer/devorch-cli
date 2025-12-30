import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import * as clack from '@clack/prompts';
import { INSTALL_PATHS } from '@/cli/lib/filesystem/paths.js';
import { colors } from '@/utils/colors.js';

let sigintHandled = false;

/**
 * Setup graceful shutdown handlers
 */
export function setupSignalHandlers(): void {
  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    // Prevent duplicate handling (e.g., when @clack prompts handle their own SIGINT)
    if (sigintHandled) {
      return;
    }
    sigintHandled = true;

    // Clean up installation lock if it exists
    try {
      const lockPath = join(process.cwd(), INSTALL_PATHS.lockFile());
      if (existsSync(lockPath)) {
        rmSync(lockPath, { force: true });
        console.log('\n⚠️  Installation interrupted - cleaned up lock file');
      }
    } catch (_err) {
      // Ignore cleanup errors
    }

    console.log('');
    clack.outro(colors.yellow('Operation cancelled'));
    process.exit(0);
  });
}
