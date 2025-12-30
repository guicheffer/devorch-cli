import { $ } from 'bun';
import { colors } from './colors.js';
import { logger } from './logger.js';

const REPO = 'guicheffer/devorch';

/**
 * Get the latest release version from GitHub
 */
async function fetchLatestVersion(): Promise<string | null> {
  try {
    // Check if gh CLI is available (without throwing)
    try {
      await $`gh --version`.quiet();
    } catch {
      logger.debug('GitHub CLI not available, skipping version check');
      return null;
    }

    // Fetch latest release
    const result =
      await $`gh release list --repo ${REPO} --limit 1 --json tagName --jq '.[0].tagName'`
        .nothrow()
        .text();

    const version = result.trim();
    logger.debug('Fetched latest version', { version });
    return version || null;
  } catch (err) {
    logger.debug('Failed to fetch latest version', { error: err });
    return null;
  }
}

/**
 * Compare two semver versions
 * Returns true if version1 < version2
 */
function isOutdated(currentVersion: string, latestVersion: string): boolean {
  // Remove 'v' prefix if present
  const current = currentVersion.replace(/^v/, '');
  const latest = latestVersion.replace(/^v/, '');

  // Split into parts
  const currentParts = current.split('.').map(Number);
  const latestParts = latest.split('.').map(Number);

  // Compare major.minor.patch
  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const currentPart = currentParts[i] || 0;
    const latestPart = latestParts[i] || 0;

    if (currentPart < latestPart) {
      return true;
    }
    if (currentPart > latestPart) {
      return false;
    }
  }

  return false;
}

/**
 * Show update notification to the user
 */
function showUpdateNotification(currentVersion: string, latestVersion: string): void {
  const width = 61; // Total width including border characters
  const innerWidth = width - 4; // Width available for content (excluding borders and padding)

  // Helper to pad a line to fit the box
  const padLine = (content: string): string => {
    // Strip ANSI codes to calculate actual display length
    // biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape sequence pattern
    const displayLength = content.replace(/\x1b\[[0-9;]*m/g, '').length;
    const padding = innerWidth - displayLength;
    return `${colors.yellow('│ ') + content + ' '.repeat(Math.max(0, padding))} ${colors.yellow('│')}`;
  };

  console.log('');
  console.log(colors.yellow(`┌${'─'.repeat(width - 2)}┐`));
  console.log(padLine(colors.bold('Update Available')));
  console.log(padLine(''));
  console.log(
    padLine(`Current: ${colors.dim(currentVersion)}   Latest: ${colors.green(latestVersion)}`)
  );
  console.log(padLine(''));
  console.log(padLine(`Run ${colors.cyan('devorch update')} to upgrade`));
  console.log(colors.yellow(`└${'─'.repeat(width - 2)}┘`));
  console.log('');
}

/**
 * Check if a new version is available and notify the user
 * This function is designed to be non-blocking and fail gracefully
 *
 * @param currentVersion - The current version of devorch
 * @param command - The command being run (optional, to skip banner for certain commands)
 */
export async function checkForUpdates(currentVersion: string, command?: string): Promise<void> {
  try {
    // Skip check for dev version
    if (currentVersion === 'dev') {
      logger.debug('Skipping version check for dev build');
      return;
    }

    // Skip showing banner for update command (redundant)
    const skipBanner = command === 'update';
    if (skipBanner) {
      logger.debug('Skipping update banner for update command');
    }

    // Fetch latest version from GitHub
    const latestVersion = await fetchLatestVersion();

    if (!latestVersion) {
      logger.debug('Could not fetch latest version, skipping update check');
      return;
    }

    // Show notification if outdated (unless banner is skipped)
    if (!skipBanner && isOutdated(currentVersion, latestVersion)) {
      showUpdateNotification(currentVersion, latestVersion);
    } else {
      logger.debug('Already on latest version', { currentVersion, latestVersion });
    }
  } catch (err) {
    // Silently fail - version checking should never break the CLI
    logger.debug('Version check failed', { error: err });
  }
}
