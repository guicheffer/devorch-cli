import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ensureDependencyArrays } from '@/cli/lib/config/config-writer.js';

describe('config-writer', () => {
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

  describe('ensureDependencyArrays', () => {
    it('should ensure dependency arrays exist', () => {
      const config = {
        version: '1.0.0',
      };

      const result = ensureDependencyArrays(config as any);

      expect(result.subagents).toBeDefined();
      expect(result.commands).toBeDefined();
      expect(result.skills).toBeDefined();
      expect(Array.isArray(result.subagents)).toBe(true);
      expect(Array.isArray(result.commands)).toBe(true);
      expect(Array.isArray(result.skills)).toBe(true);
    });

    it('should preserve existing arrays', () => {
      const config = {
        version: '1.0.0',
        subagents: [{ name: 'agent1', enabled: true }],
        commands: [{ name: '/cmd1', enabled: true }],
        skills: [{ name: 'skill1', enabled: true }],
      };

      const result = ensureDependencyArrays(config as any);

      expect(result.subagents).toEqual([{ name: 'agent1', enabled: true }]);
      expect(result.commands).toEqual([{ name: '/cmd1', enabled: true }]);
      expect(result.skills).toEqual([{ name: 'skill1', enabled: true }]);
    });
  });
});
