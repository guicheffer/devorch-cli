import { join } from 'node:path';
import { logger } from '@/utils/logger.js';
import { compileConfig } from '../config/config-compiler.js';
import { HasteFS } from '../filesystem/haste-fs.js';
import { cleanupTempDir, createTempDir, fetchConfigFromGitHub } from './github-fetcher.js';
import { getLocalConfigDir } from './local-loader.js';

export interface ConfigSource {
  /** Raw source config directory (has config/ subdirectory with src/ files) */
  sourceConfigDir: string;
  /** Compiled config directory (has compiled markdown files) */
  compiledConfigDir: string;
  /** Temp directory path (null if using local without temp) */
  tempDir: string | null;
  /** HasteFS instance for fast file system queries */
  hasteFS: HasteFS;
  /** Resolved version tag (e.g., "v2.1.0"), or "local" if using local source */
  resolvedVersion: string;
  /** Cleanup function to call when done */
  cleanup: () => void;
}

export interface LoadConfigSourceOptions {
  /** Local path to devorch repo, or undefined to fetch from GitHub */
  local?: string;
  /** Version to fetch from GitHub (default: 'latest') */
  version?: string;
  /** Whether to compile the config (default: true) */
  compile?: boolean;
  /** Project directory containing devorch.config.yml (for standards resolution) */
  projectDir?: string;
}

/**
 * Load and prepare config source from either local path or GitHub
 *
 * This utility handles the common pattern of:
 * 1. Determining source (local or GitHub)
 * 2. Creating temp directory
 * 3. Fetching config if needed
 * 4. Compiling config
 * 5. Returning paths and cleanup function
 *
 * @example
 * ```ts
 * const source = await loadConfigSource({ local: './my-repo', version: 'latest' });
 * try {
 *   // Use source.sourceConfigDir or source.compiledConfigDir
 *   await doSomething(source.compiledConfigDir);
 * } finally {
 *   source.cleanup();
 * }
 * ```
 */
export async function loadConfigSource(
  options: LoadConfigSourceOptions = {}
): Promise<ConfigSource> {
  logger.debug('Loading config source', { options });

  const shouldCompile = options.compile !== false;
  let sourceConfigDir: string;
  let tempDir: string | null = null;
  let compiledConfigDir: string;
  let resolvedVersion: string;

  if (options.local) {
    // Use local path
    logger.info('Using local config source', { path: options.local });
    sourceConfigDir = getLocalConfigDir(options.local);
    resolvedVersion = 'local';

    if (shouldCompile) {
      // Pre-compile to temp directory for validation
      logger.debug('Creating temp directory for compilation');
      tempDir = createTempDir();
      compiledConfigDir = join(tempDir, 'compiled');
      logger.debug('Compiling local config', { sourceConfigDir, compiledConfigDir });
      await compileConfig(sourceConfigDir, compiledConfigDir);
      logger.debug('Config compilation complete');
    } else {
      logger.debug('Skipping compilation');
      compiledConfigDir = sourceConfigDir;
    }
  } else {
    // Fetch from GitHub
    const version = options.version || 'latest';
    logger.info('Fetching config from GitHub', { version });

    tempDir = createTempDir();
    logger.debug('Created temp directory', { tempDir });

    resolvedVersion = await fetchConfigFromGitHub(version, tempDir);
    sourceConfigDir = tempDir;

    if (shouldCompile) {
      // Pre-compile for validation
      logger.debug('Compiling fetched config');
      compiledConfigDir = join(tempDir, 'compiled');
      await compileConfig(tempDir, compiledConfigDir);
      logger.debug('Config compilation complete');
    } else {
      logger.debug('Skipping compilation');
      compiledConfigDir = sourceConfigDir;
    }
  }

  logger.info('Config source loaded', {
    sourceConfigDir,
    compiledConfigDir,
    tempDir,
    resolvedVersion,
  });

  // Initialize HasteFS with templates directory
  // HasteFS always needs to scan template files (not compiled) to extract frontmatter and dependencies
  logger.debug('Initializing HasteFS', { sourceConfigDir });
  const templatesDir = join(sourceConfigDir, 'templates');
  const hasteFS = await HasteFS.create(templatesDir);
  logger.debug('HasteFS initialized successfully');

  return {
    sourceConfigDir,
    compiledConfigDir,
    tempDir,
    hasteFS,
    resolvedVersion,
    cleanup: () => {
      if (tempDir) {
        logger.debug('Cleaning up temp directory', { tempDir });
        cleanupTempDir(tempDir);
      }
    },
  };
}
