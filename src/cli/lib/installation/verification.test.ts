import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { verifyInstalledFile } from '@/cli/lib/installation/verification.js';

describe('verification', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `devorch-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('verifyInstalledFile', () => {
    it('should fail for non-existent file', () => {
      const filePath = join(testDir, 'nonexistent.md');

      const result = verifyInstalledFile(filePath);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should fail for empty file', () => {
      const filePath = join(testDir, 'empty.md');
      writeFileSync(filePath, '');

      const result = verifyInstalledFile(filePath);
      expect(result.valid).toBe(false);
    });
  });
});
