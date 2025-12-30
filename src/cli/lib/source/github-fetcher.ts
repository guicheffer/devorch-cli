import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkGhCli, getLatestRelease } from '@/utils/gh.js';
import { logger } from '@/utils/logger.js';
import { spinner } from '@/utils/ui.js';

const REPO = 'guicheffer/devorch';

/**
 * Fetch config files from GitHub release and save to a directory
 * Downloads config.tar.gz from release assets and extracts it
 * @returns The resolved version tag (e.g., "v2.1.0")
 */
export async function fetchConfigFromGitHub(version: string, targetDir: string): Promise<string> {
  logger.debug('Fetching config from GitHub', { version, targetDir, repo: REPO });

  const s = spinner();
  s.start(`Fetching config files from release (${version})...`);

  try {
    // Check gh CLI is available
    logger.debug('Checking GitHub CLI availability');
    await checkGhCli();

    // Resolve version to release tag
    logger.debug('Resolving version to release tag', { version });
    const tag = version === 'latest' ? await getLatestRelease(REPO) : version;
    logger.info('Resolved release tag', { version, tag });

    s.message(`Downloading config.tar.gz from ${tag}...`);

    // Download config.tar.gz from release
    const tempFile = join(tmpdir(), 'config.tar.gz');
    logger.debug('Downloading release asset', { tag, tempFile, pattern: 'config.tar.gz' });

    const { $ } = await import('bun');
    await $`gh release download ${tag} --repo ${REPO} --pattern config.tar.gz --output ${tempFile} --clobber`.quiet();

    logger.debug('Download complete', { tempFile });

    s.message(`Extracting config files...`);

    // Extract to target directory
    logger.debug('Extracting archive', { tempFile, targetDir });
    await $`tar -xzf ${tempFile} -C ${targetDir}`.quiet();
    logger.debug('Extraction complete');

    // Clean up temp file
    logger.debug('Cleaning up temp file', { tempFile });
    rmSync(tempFile, { force: true });

    s.stop(`✓ Downloaded config files from ${tag}`);
    logger.info('Successfully fetched config from GitHub', { tag, targetDir });

    return tag;
  } catch (err) {
    s.stop(`✗ Failed to fetch config files`);
    logger.error('Failed to fetch config from GitHub', { version, targetDir, error: err });
    throw err;
  }
}

/**
 * Create a temporary directory for fetching
 */
export function createTempDir(): string {
  const tempDir = mkdtempSync(join(tmpdir(), 'devorch-'));
  logger.debug('Created temporary directory', { tempDir });
  return tempDir;
}

/**
 * Clean up temporary directory
 */
export function cleanupTempDir(dir: string): void {
  if (dir.startsWith(tmpdir())) {
    logger.debug('Cleaning up temporary directory', { dir });
    rmSync(dir, { recursive: true, force: true });
    logger.debug('Temporary directory cleaned up');
  } else {
    logger.warn('Skipped cleanup of non-temp directory', { dir });
  }
}
