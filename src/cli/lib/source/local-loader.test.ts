import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getLocalConfigDir, validateLocalPath } from '@/cli/lib/source/local-loader.js';

describe('local-loader', () => {
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

  describe('validateLocalPath', () => {
    it('should validate existing directory with templates', () => {
      const templatesDir = join(testDir, 'templates');
      mkdirSync(templatesDir, { recursive: true });
      expect(() => validateLocalPath(testDir)).not.toThrow();
    });

    it('should throw for non-existent path', () => {
      const nonExistent = join(testDir, 'does-not-exist');
      expect(() => validateLocalPath(nonExistent)).toThrow();
    });

    it('should throw for path without templates directory', () => {
      expect(() => validateLocalPath(testDir)).toThrow();
    });
  });

  describe('getLocalConfigDir', () => {
    it('should return local path when valid', () => {
      const templatesDir = join(testDir, 'templates');
      mkdirSync(templatesDir, { recursive: true });

      const configDir = getLocalConfigDir(testDir);
      expect(configDir).toBe(testDir);
      expect(typeof configDir).toBe('string');
    });

    it('should throw for invalid path', () => {
      expect(() => getLocalConfigDir(testDir)).toThrow();
    });
  });
});
