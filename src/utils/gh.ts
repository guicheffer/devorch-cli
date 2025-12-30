import { $ } from 'bun';
import { InternalError, NetworkError, SystemError } from './errors.js';
import { logger } from './logger.js';

/**
 * Version info from version-info.json in releases
 * schemaVersion allows for future compatibility checks
 */
export interface VersionInfo {
  schemaVersion: number; // Currently 1, increment when breaking changes
  version: string;
  bumpType: 'major' | 'minor' | 'patch';
  minCompatibleCli: string;
  changedFiles: string[];
}

// Current schema version we understand
export const CURRENT_VERSION_INFO_SCHEMA = 1;

/**
 * Check if gh CLI is installed and authenticated
 */
export async function checkGhCli(): Promise<void> {
  logger.debug('Checking GitHub CLI');

  try {
    await $`gh --version`.quiet();
    logger.debug('GitHub CLI is installed');
  } catch {
    logger.error('GitHub CLI not found');
    throw SystemError.ghNotFound();
  }

  try {
    await $`gh auth status`.quiet();
    logger.debug('GitHub CLI is authenticated');
  } catch {
    logger.error('GitHub CLI not authenticated');
    throw SystemError.ghNotAuthenticated();
  }
}

/**
 * Get the default branch name for a repository
 */
export async function getDefaultBranch(repo: string): Promise<string> {
  logger.debug('Getting default branch', { repo });

  try {
    const result =
      await $`gh repo view ${repo} --json defaultBranchRef --jq '.defaultBranchRef.name'`.text();
    const branch = result.trim();
    logger.debug('Retrieved default branch', { repo, branch });
    return branch;
  } catch (err) {
    logger.error('Failed to get default branch', { repo, error: err });
    // Check if repo not found
    if ((err as Error).message?.includes('Not Found') || (err as Error).message?.includes('404')) {
      throw NetworkError.repositoryNotFound(repo);
    }
    throw NetworkError.fetchFailed(`repos/${repo}`, undefined, (err as Error).message);
  }
}

/**
 * List all files in a repository at a specific ref (branch/tag)
 * Returns file paths relative to repo root
 */
export async function listRepoFiles(repo: string, ref: string): Promise<string[]> {
  logger.debug('Listing repository files', { repo, ref });

  try {
    const result = await $`gh api repos/${repo}/git/trees/${ref}?recursive=1`.json();

    if (!result.tree || !Array.isArray(result.tree)) {
      logger.error('Invalid GitHub API response', { repo, ref });
      throw NetworkError.fetchFailed(
        `repos/${repo}/git/trees/${ref}`,
        undefined,
        'Invalid response from GitHub API'
      );
    }

    const files = result.tree
      .filter((item: { type: string }) => item.type === 'blob') // Only files, not directories
      .map((item: { path: string }) => item.path);

    logger.debug('Retrieved repository files', { repo, ref, fileCount: files.length });
    return files;
  } catch (err) {
    if (err instanceof NetworkError) {
      throw err;
    }
    logger.error('Failed to list repository files', { repo, ref, error: err });
    // Check for rate limit
    if ((err as Error).message?.includes('rate limit')) {
      throw NetworkError.rateLimitExceeded();
    }
    throw NetworkError.fetchFailed(
      `repos/${repo}/git/trees/${ref}`,
      undefined,
      (err as Error).message
    );
  }
}

/**
 * Download a file from a repository
 * Returns the file content as a string
 */
export async function downloadFile(repo: string, path: string, ref: string): Promise<string> {
  logger.debug('Downloading file from repository', { repo, path, ref });

  try {
    // Use gh api to download file content
    const result = await $`gh api repos/${repo}/contents/${path}?ref=${ref} --jq '.content'`.text();

    // Content is base64 encoded, decode it
    const content = Buffer.from(result.trim(), 'base64').toString('utf-8');
    logger.debug('File downloaded successfully', { repo, path, ref, size: content.length });
    return content;
  } catch (err) {
    logger.error('Failed to download file', { repo, path, ref, error: err });
    if ((err as Error).message?.includes('rate limit')) {
      throw NetworkError.rateLimitExceeded();
    }
    if ((err as Error).message?.includes('Not Found') || (err as Error).message?.includes('404')) {
      throw SystemError.fileNotFound(path, 'download-from-github');
    }
    throw NetworkError.fetchFailed(
      `repos/${repo}/contents/${path}`,
      undefined,
      (err as Error).message
    );
  }
}

/**
 * Get the latest release tag for a repository
 */
export async function getLatestRelease(repo: string): Promise<string> {
  logger.debug('Getting latest release', { repo });

  try {
    const result =
      await $`gh release list --repo ${repo} --limit 1 --json tagName --jq '.[0].tagName'`.text();
    const tag = result.trim();
    logger.debug('Retrieved latest release', { repo, tag });
    return tag;
  } catch (err) {
    logger.error('Failed to get latest release', { repo, error: err });
    if ((err as Error).message?.includes('Not Found') || (err as Error).message?.includes('404')) {
      throw NetworkError.repositoryNotFound(repo);
    }
    throw NetworkError.fetchFailed(`repos/${repo}/releases`, undefined, (err as Error).message);
  }
}

/**
 * Fetch version-info.json from a release
 * This file contains metadata about the release for semver compatibility checks
 */
export async function fetchVersionInfo(repo: string, tag: string): Promise<VersionInfo> {
  logger.debug('Fetching version info', { repo, tag });

  try {
    // Download version-info.json from the release assets
    const result =
      await $`gh release download ${tag} --repo ${repo} --pattern version-info.json --output - 2>/dev/null`.text();

    const parsed = JSON.parse(result.trim());

    // Handle missing schemaVersion (older releases before we added versioning)
    // Default to schema version 1 for backward compatibility
    const schemaVersion = parsed.schemaVersion ?? 1;

    // Validate schema version compatibility
    if (schemaVersion > CURRENT_VERSION_INFO_SCHEMA) {
      throw InternalError.incompatibleVersionInfoSchema(
        schemaVersion,
        CURRENT_VERSION_INFO_SCHEMA,
        {
          repo,
          tag,
        }
      );
    }

    const versionInfo: VersionInfo = {
      schemaVersion,
      version: parsed.version,
      bumpType: parsed.bumpType,
      minCompatibleCli: parsed.minCompatibleCli,
      changedFiles: parsed.changedFiles ?? [],
    };

    logger.debug('Retrieved version info', { repo, tag, versionInfo });
    return versionInfo;
  } catch (err) {
    // Re-throw InternalError (schema incompatibility) as-is
    if (err instanceof InternalError) {
      throw err;
    }

    logger.debug('Failed to fetch version info (may not exist in older releases)', {
      repo,
      tag,
      error: err,
    });
    throw new Error(`Version info not available for ${tag}`);
  }
}
