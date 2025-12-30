import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { createLocalConfig } from './local-config-manager.js';

describe('local-config-manager', () => {
  let testDir: string;
  let projectDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'devorch-test-'));
    projectDir = join(testDir, 'project');
    mkdirSync(projectDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('createLocalConfig', () => {
    it('should create local config file with context training name', () => {
      createLocalConfig(projectDir, 'test-context');

      const localConfigPath = join(projectDir, 'devorch', 'config.local.yml');
      expect(existsSync(localConfigPath)).toBe(true);

      const content = readFileSync(localConfigPath, 'utf-8');
      const config = parseYaml(content);

      expect(config).toMatchObject({
        profile: {
          context_training: 'test-context',
        },
      });
    });

    it('should create devorch directory if it does not exist', () => {
      createLocalConfig(projectDir, 'test-context');

      const specMachineDir = join(projectDir, 'devorch');
      expect(existsSync(specMachineDir)).toBe(true);
    });

    it('should overwrite existing local config', () => {
      const specMachineDir = join(projectDir, 'devorch');
      mkdirSync(specMachineDir, { recursive: true });

      const localConfigPath = join(specMachineDir, 'config.local.yml');
      writeFileSync(localConfigPath, 'profile:\n  context_training: old-context\n', 'utf-8');

      createLocalConfig(projectDir, 'new-context');

      const content = readFileSync(localConfigPath, 'utf-8');
      const config = parseYaml(content);

      expect(config.profile.context_training).toBe('new-context');
    });

    it('should handle context names with special characters', () => {
      createLocalConfig(projectDir, 'my-special_context-v2');

      const localConfigPath = join(projectDir, 'devorch', 'config.local.yml');
      const content = readFileSync(localConfigPath, 'utf-8');
      const config = parseYaml(content);

      expect(config.profile.context_training).toBe('my-special_context-v2');
    });

    it('should create valid YAML format', () => {
      createLocalConfig(projectDir, 'test-context');

      const localConfigPath = join(projectDir, 'devorch', 'config.local.yml');
      const content = readFileSync(localConfigPath, 'utf-8');

      // Should not throw when parsing
      expect(() => parseYaml(content)).not.toThrow();

      // Should have proper YAML structure
      expect(content).toContain('profile:');
      expect(content).toContain('context_training:');
    });
  });

  // Note: promptLocalConfigCreation is an interactive function that requires user input,
  // so it's better tested via integration tests rather than unit tests
});
