/**
 * Check if devorch CLI and installed templates are up-to-date
 * Outputs JSON with version information and whether execution should be blocked
 *
 * Exit codes:
 * - 0: Success (check the `blocked` field in JSON for whether to continue)
 * - 1: Error (network failure, etc.)
 */

import semver from 'semver';
import type { GlobalOptions } from '@/cli/lib/cli/command-registry.js';
import { getProjectDir } from '@/cli/lib/filesystem/paths.js';
import { readState } from '@/cli/lib/installation/state-manager.js';
import { flushAndExit, getTelemetry } from '@/cli/lib/telemetry/telemetry.js';
import { InternalError, SystemError } from '@/utils/errors.js';
import { fetchVersionInfo, getLatestRelease, type VersionInfo } from '@/utils/gh.js';
import { logger } from '@/utils/logger.js';
import { getCliVersion, VERSION_SENTINELS } from '@/utils/version.js';
import { getUpdateMessage, isBlockingUpdate, type UpdateType } from './actions.js';

interface VersionCheckResult {
  cli: {
    current: string;
    latest: string;
  };
  templates: {
    installed: string;
    latest: string;
  };
  blocked: boolean;
  message?: string;
}

/**
 * Determine update type between two versions
 * semver functions handle 'v' prefix automatically
 */
function getUpdateType(current: string, latest: string): UpdateType {
  // Handle non-semver versions (dev CLI or local templates)
  if (current === VERSION_SENTINELS.DEV || current === VERSION_SENTINELS.LOCAL) {
    return 'none';
  }

  if (!semver.valid(current) || !semver.valid(latest)) {
    logger.warn('Invalid semver', { current, latest });
    return 'none';
  }

  const diff = semver.diff(current, latest);

  if (!diff) {
    return 'none';
  }

  // Map semver diff to our update types
  if (diff === 'major' || diff === 'premajor') {
    return 'major';
  }
  if (diff === 'minor' || diff === 'preminor') {
    return 'minor';
  }
  if (diff === 'patch' || diff === 'prepatch' || diff === 'prerelease') {
    return 'patch';
  }

  return 'none';
}

/**
 * Check if CLI can load templates from a specific version
 * Templates are compatible if CLI version >= minCompatibleCli,
 * or if same major when minCompatibleCli is unavailable
 *
 * @param cliVersion - CLI version (from BUILD_VERSION, can be "dev" or "vX.Y.Z")
 * @param templateVersion - Template version (can be "local", "dev", or "vX.Y.Z")
 * @param minCompatibleCli - Minimum CLI version required (from version-info.json)
 */
function areTemplatesCompatible(
  cliVersion: string,
  templateVersion: string,
  minCompatibleCli?: string
): boolean {
  // Dev CLI is always compatible (for local development)
  if (cliVersion === VERSION_SENTINELS.DEV) {
    return true;
  }

  // If we have minCompatibleCli from version-info.json, use it
  if (minCompatibleCli) {
    return semver.gte(cliVersion, minCompatibleCli);
  }

  // Fallback: same major is compatible
  // (handles "local" templates gracefully - parse returns null, so assume compatible)
  const cliParsed = semver.parse(cliVersion);
  const templateParsed = semver.parse(templateVersion);

  if (!cliParsed || !templateParsed) {
    return true; // Assume compatible if can't parse (e.g., "local" templates)
  }

  return cliParsed.major === templateParsed.major;
}

/**
 * Check version command - always fetches fresh data from GitHub
 */
export async function checkVersionCommand(options?: GlobalOptions): Promise<void> {
  const projectDir = getProjectDir();

  // Track which command is calling check-version (for slash command usage analytics)
  const callingCommand = (options as Record<string, unknown>)?.command as string | undefined;
  if (callingCommand) {
    const telemetry = getTelemetry();
    telemetry?.trackEvent(callingCommand, {
      type: 'slash-command',
    });
  }

  try {
    // Get current CLI version
    const currentVersion = getCliVersion();

    // Skip all checks in dev mode
    if (currentVersion === VERSION_SENTINELS.DEV) {
      const result: VersionCheckResult = {
        cli: {
          current: currentVersion,
          latest: currentVersion,
        },
        templates: {
          installed: VERSION_SENTINELS.DEV,
          latest: VERSION_SENTINELS.DEV,
        },
        blocked: false,
      };

      console.log(JSON.stringify(result, null, 2));
      await flushAndExit(0);
      return;
    }

    // Fetch latest release info
    let latestVersion: string;
    let versionInfo: VersionInfo | null = null;

    try {
      latestVersion = await getLatestRelease('guicheffer/devorch');
      logger.debug('Fetched latest version from GitHub', { latest: latestVersion });

      // Try to get version-info.json for more details
      try {
        versionInfo = await fetchVersionInfo('guicheffer/devorch', latestVersion);
        logger.debug('Fetched version info', { versionInfo });
      } catch (err) {
        // Report schema incompatibility errors to Sentry
        if (err instanceof InternalError) {
          const telemetry = getTelemetry();
          telemetry?.captureException(err, {
            repo: 'guicheffer/devorch',
            tag: latestVersion,
            currentCliVersion: currentVersion,
          });
          logger.warn('Version info schema incompatible', { error: err });
        } else {
          // Version info not available (older release), continue without it
          logger.debug('Version info not available', { error: err });
        }
      }
    } catch (err) {
      logger.warn('Failed to fetch latest version from GitHub', { error: err });
      throw SystemError.ghNotFound();
    }

    // Determine CLI update type
    const cliUpdateType = getUpdateType(currentVersion, latestVersion);

    // Check installed templates version
    const state = readState(projectDir);
    const installedTemplatesVersion = state?.templateVersion ?? currentVersion;

    // Determine templates update type
    let templatesUpdateType: UpdateType = 'none';

    // Only check for template updates if CLI is not outdated (major/minor)
    if (cliUpdateType === 'none' || cliUpdateType === 'patch') {
      // Check if there's a newer compatible template version
      if (
        versionInfo &&
        areTemplatesCompatible(currentVersion, latestVersion, versionInfo.minCompatibleCli)
      ) {
        templatesUpdateType = getUpdateType(installedTemplatesVersion, latestVersion);
      } else {
        // Without version-info, check if same major
        // semver.parse handles 'v' prefix automatically
        const currentParsed = semver.parse(currentVersion);
        const latestParsed = semver.parse(latestVersion);

        if (currentParsed && latestParsed && currentParsed.major === latestParsed.major) {
          templatesUpdateType = getUpdateType(installedTemplatesVersion, latestVersion);
        }
      }
    }

    // Determine if blocked and get message
    const blocked = isBlockingUpdate(cliUpdateType);
    const message = getUpdateMessage(cliUpdateType, templatesUpdateType, latestVersion);

    // Build result
    const result: VersionCheckResult = {
      cli: {
        current: currentVersion,
        latest: latestVersion,
      },
      templates: {
        installed: installedTemplatesVersion,
        latest: latestVersion,
      },
      blocked,
      ...(message && { message }),
    };

    logger.debug('Version check result', { result });

    // Output JSON - always exit 0 on success
    console.log(JSON.stringify(result, null, 2));
    await flushAndExit(0);
  } catch (err) {
    logger.error('Version check failed', { error: err });
    // Output error as JSON for parseability
    console.log(
      JSON.stringify(
        {
          error: err instanceof Error ? err.message : 'Unknown error',
        },
        null,
        2
      )
    );
    await flushAndExit(1);
  }
}
