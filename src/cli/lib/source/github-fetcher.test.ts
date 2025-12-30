import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { existsSync } from 'node:fs';
import { cleanupTempDir, createTempDir } from '@/cli/lib/source/github-fetcher.js';

describe('github-fetcher', () => {
  let tempDir: string;

  describe('createTempDir', () => {
    it('should create a temporary directory', () => {
      tempDir = createTempDir();

      expect(tempDir).toBeDefined();
      expect(typeof tempDir).toBe('string');
      expect(existsSync(tempDir)).toBe(true);
      expect(tempDir).toContain('devorch');
    });

    afterEach(() => {
      if (tempDir && existsSync(tempDir)) {
        cleanupTempDir(tempDir);
      }
    });
  });

  describe('cleanupTempDir', () => {
    beforeEach(() => {
      tempDir = createTempDir();
    });

    it('should cleanup temporary directory', () => {
      expect(existsSync(tempDir)).toBe(true);

      cleanupTempDir(tempDir);

      expect(existsSync(tempDir)).toBe(false);
    });
  });
});
