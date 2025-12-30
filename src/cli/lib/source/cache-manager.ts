import { existsSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { ensureDir } from '@/utils/files.js';

/**
 * Get the cache directory for a specific version
 */
export function getCacheDir(version: string): string {
  return join(homedir(), '.devorch', 'cache', version);
}

/**
 * Check if cache exists for a version
 */
export function cacheExists(version: string): boolean {
  const cacheDir = getCacheDir(version);
  return existsSync(cacheDir);
}

/**
 * Ensure cache directory exists
 */
export function ensureCacheDir(version: string): string {
  const cacheDir = getCacheDir(version);
  ensureDir(cacheDir);
  return cacheDir;
}

/**
 * Clear cache for a specific version
 */
export function clearCache(version: string): void {
  const cacheDir = getCacheDir(version);
  if (existsSync(cacheDir)) {
    rmSync(cacheDir, { recursive: true, force: true });
  }
}

/**
 * Clear all caches
 */
export function clearAllCaches(): void {
  const baseDir = join(homedir(), '.devorch', 'cache');
  if (existsSync(baseDir)) {
    rmSync(baseDir, { recursive: true, force: true });
  }
}
