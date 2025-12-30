/**
 * Get or set the active spec for spec-driven workflow
 * AI-friendly command that outputs machine-readable format
 */

import type { GlobalOptions } from '@/cli/lib/cli/command-registry.js';
import { getProjectDir } from '@/cli/lib/filesystem/paths.js';
import {
  findSpecByName,
  getActiveSpec,
  getNewestSpec,
  listSpecs,
  setActiveSpec,
} from '@/cli/lib/specs/spec-manager.js';
import { flushAndExit } from '@/cli/lib/telemetry/telemetry.js';
import { logger } from '@/utils/logger.js';

interface GetSpecOptions extends GlobalOptions {
  subCommand?: string; // spec name to set
}

/**
 * Get-spec command
 * Usage:
 *   devorch get-spec               # Get current active spec
 *   devorch get-spec feature-name  # Set active spec
 */
export async function getSpecCommand(options: GetSpecOptions = {}): Promise<void> {
  const projectDir = getProjectDir();
  const specName = options.subCommand;

  try {
    // If no spec name provided, show current active spec
    if (!specName) {
      let activeSpec = getActiveSpec(projectDir);
      const newestSpec = getNewestSpec(projectDir);

      if (!activeSpec) {
        // No active spec set - auto-set to newest if available
        if (newestSpec) {
          logger.debug('No active spec set, auto-setting to newest spec', {
            spec: newestSpec.name,
          });
          activeSpec = setActiveSpec(projectDir, newestSpec);
        } else {
          // No specs found at all
          logger.debug('No active spec set and no specs found');
          console.log('NO_ACTIVE_SPEC=true');
          console.log('NO_SPECS_FOUND=true');
          await flushAndExit(0);
        }
      }

      // Output machine-readable format
      console.log(`CURRENT_SPEC=${activeSpec.path}`);
      console.log(`SPEC_NAME=${activeSpec.name}`);
      console.log(`FOLDER_NAME=${activeSpec.folderName}`);
      console.log(`CREATED=${activeSpec.created}`);
      console.log(`LAST_ACCESSED=${activeSpec.lastAccessed}`);

      // Always include newest spec info
      if (newestSpec) {
        console.log(`NEWEST_SPEC=${newestSpec.path}`);
        console.log(`NEWEST_SPEC_NAME=${newestSpec.name}`);
        console.log(`NEWEST_SPEC_FOLDER=${newestSpec.folderName}`);
        console.log(`NEWEST_SPEC_DATE=${newestSpec.date}`);
        console.log(`IS_STALE=${activeSpec.folderName !== newestSpec.folderName}`);
      }

      logger.debug('Displayed active spec', { spec: activeSpec, newestSpec });
      await flushAndExit(0);
    }

    // Find the spec by name (exact match)
    const specInfo = findSpecByName(projectDir, specName);

    if (!specInfo) {
      // Spec not found - list available specs for user
      const availableSpecs = listSpecs(projectDir);

      if (availableSpecs.length === 0) {
        logger.error('No specs found in project');
        console.log('ERROR=no_specs_found');
        console.log('MESSAGE=No specs found. Run /gather-requirements to create a spec.');
        await flushAndExit(1);
      }

      // Show available specs
      logger.error('Spec not found', { specName, availableCount: availableSpecs.length });
      console.log('ERROR=spec_not_found');
      console.log(`MESSAGE=Spec '${specName}' not found`);
      console.log('AVAILABLE_SPECS:');
      for (const spec of availableSpecs) {
        console.log(`  - ${spec.folderName} (${spec.name})`);
      }
      await flushAndExit(1);
    }

    // Set the spec as active
    const activeSpec = setActiveSpec(projectDir, specInfo);

    // Output success in machine-readable format
    console.log('SUCCESS=true');
    console.log(`ACTIVE_SPEC=${activeSpec.path}`);
    console.log(`SPEC_NAME=${activeSpec.name}`);
    console.log(`FOLDER_NAME=${activeSpec.folderName}`);
    console.log(`CREATED=${activeSpec.created}`);
    console.log(`LAST_ACCESSED=${activeSpec.lastAccessed}`);

    logger.debug('Set active spec', { spec: activeSpec });
    await flushAndExit(0);
  } catch (err) {
    logger.error('get-spec command failed', { error: err });

    // Output error in machine-readable format
    console.log('ERROR=command_failed');
    console.log(`MESSAGE=${err instanceof Error ? err.message : 'Unknown error'}`);
    await flushAndExit(2);
  }
}
