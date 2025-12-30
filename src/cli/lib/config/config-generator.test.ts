import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateConfig } from '@/cli/lib/config/config-generator.js';
import type { Config } from '@/schemas/config.js';

describe('config-generator', () => {
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

  describe('generateConfig', () => {
    it('should write config to target path', () => {
      const config: Config = {
        profile: {
          name: 'test-project',
          description: 'Test project',
          agents: ['claude-code'],
        },
        subagents: [{ name: 'spec-writer', enabled: true }],
        commands: [{ name: '/create-spec', enabled: true }],
        skills: [{ name: 'zest-design-system', enabled: true }],
      };

      const targetPath = join(testDir, 'devorch.config.yml');
      generateConfig(config, targetPath);

      expect(existsSync(targetPath)).toBe(true);
      const content = readFileSync(targetPath, 'utf-8');
      expect(content).toContain('test-project');
      expect(content).toContain('spec-writer');
    });

    it('should handle config with empty arrays', () => {
      const config: Config = {
        profile: {
          name: 'minimal',
          description: 'Minimal config',
          agents: ['claude-code'],
        },
        subagents: [],
        commands: [],
        skills: [],
      };

      const targetPath = join(testDir, 'minimal.yml');
      generateConfig(config, targetPath);

      expect(existsSync(targetPath)).toBe(true);
      const content = readFileSync(targetPath, 'utf-8');
      expect(content).toContain('minimal');
    });
  });
});
