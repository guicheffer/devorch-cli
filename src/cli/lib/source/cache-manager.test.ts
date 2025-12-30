import { afterEach, describe, expect, it } from 'bun:test';
import { existsSync } from 'node:fs';
import {
  cacheExists,
  clearAllCaches,
  clearCache,
  ensureCacheDir,
  getCacheDir,
} from '@/cli/lib/source/cache-manager.js';

describe('cache-manager', () => {
  const testVersion = 'test-1.0.0';

  afterEach(() => {
    // Clean up test caches
    clearCache(testVersion);
  });

  describe('getCacheDir', () => {
    it('should return cache directory path', () => {
      const cacheDir = getCacheDir(testVersion);
      expect(cacheDir).toBeDefined();
      expect(cacheDir).toContain(testVersion);
    });
  });

  describe('cacheExists', () => {
    it('should return false for non-existent cache', () => {
      expect(cacheExists(testVersion)).toBe(false);
    });

    it('should return true after ensuring cache', () => {
      ensureCacheDir(testVersion);
      expect(cacheExists(testVersion)).toBe(true);
    });
  });

  describe('ensureCacheDir', () => {
    it('should create cache directory', () => {
      const cacheDir = ensureCacheDir(testVersion);
      expect(existsSync(cacheDir)).toBe(true);
    });

    it('should return same path on subsequent calls', () => {
      const dir1 = ensureCacheDir(testVersion);
      const dir2 = ensureCacheDir(testVersion);
      expect(dir1).toBe(dir2);
    });
  });

  describe('clearCache', () => {
    it('should remove cache directory', () => {
      ensureCacheDir(testVersion);
      expect(cacheExists(testVersion)).toBe(true);

      clearCache(testVersion);
      expect(cacheExists(testVersion)).toBe(false);
    });
  });

  describe('clearAllCaches', () => {
    it('should clear all version caches', () => {
      ensureCacheDir('v1');
      ensureCacheDir('v2');

      clearAllCaches();

      expect(cacheExists('v1')).toBe(false);
      expect(cacheExists('v2')).toBe(false);
    });
  });
});
