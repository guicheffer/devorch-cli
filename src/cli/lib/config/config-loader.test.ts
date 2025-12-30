import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findConfig, loadConfig } from '@/cli/lib/config/config-loader.js';

describe('config-loader', () => {
  it('should find a config file in test-project', () => {
    const testProjectDir = join(process.cwd(), 'test-project');
    const configPath = findConfig(testProjectDir);

    expect(configPath).toBeDefined();
    expect(configPath).toContain('devorch/config.yml');
  });

  it('should return null for directory without config', () => {
    const configPath = findConfig('/nonexistent/directory');
    expect(configPath).toBeNull();
  });

  describe('secondary config location', () => {
    let testDir: string;

    beforeEach(() => {
      testDir = mkdtempSync(join(tmpdir(), 'devorch-test-'));
    });

    afterEach(() => {
      if (testDir) {
        rmSync(testDir, { recursive: true, force: true });
      }
    });

    it('should find config.yml in devorch directory', () => {
      const specMachineDir = join(testDir, 'devorch');
      mkdirSync(specMachineDir, { recursive: true });
      writeFileSync(
        join(specMachineDir, 'config.yml'),
        'profile:\n  name: test\n  agents: [claude-code]\ncommands: [/test]'
      );

      const configPath = findConfig(testDir);
      expect(configPath).toBeDefined();
      expect(configPath).toContain(join('devorch', 'config.yml'));
    });

    it('should prefer devorch.config.yml in root over devorch/config.yml', () => {
      // Create both config files
      const specMachineDir = join(testDir, 'devorch');
      mkdirSync(specMachineDir, { recursive: true });
      writeFileSync(
        join(specMachineDir, 'config.yml'),
        'profile:\n  name: secondary\n  agents: [claude-code]\ncommands: [/test]'
      );
      writeFileSync(
        join(testDir, 'devorch.config.yml'),
        'profile:\n  name: primary\n  agents: [claude-code]\ncommands: [/test]'
      );

      const configPath = findConfig(testDir);
      expect(configPath).toBeDefined();
      expect(configPath).toContain('devorch.config.yml');
      expect(configPath).not.toContain(join('devorch', 'config.yml'));
    });

    it('should load config from devorch/config.yml', () => {
      const specMachineDir = join(testDir, 'devorch');
      mkdirSync(specMachineDir, { recursive: true });
      const config = `
profile:
  name: secondary-test
  agents: [claude-code]
commands: [/test]
`;
      writeFileSync(join(specMachineDir, 'config.yml'), config);

      const result = loadConfig(testDir);
      expect(result.profile.name).toBe('secondary-test');
    });
  });

  describe('environment variable overrides', () => {
    let testDir: string;
    const originalEnv = {
      context_training: process.env.DEVORCH_CONTEXT_TRAINING,
      name: process.env.DEVORCH_NAME,
    };

    beforeEach(() => {
      // Create temp directory for test
      testDir = mkdtempSync(join(tmpdir(), 'devorch-test-'));

      // Create devorch/context-training directories
      const contextTrainingsDir = join(testDir, 'devorch', 'context-training');
      mkdirSync(contextTrainingsDir, { recursive: true });
      mkdirSync(join(contextTrainingsDir, 'mobile-app'));
      mkdirSync(join(contextTrainingsDir, 'backend-api'));
    });

    afterEach(() => {
      // Cleanup
      if (testDir) {
        rmSync(testDir, { recursive: true, force: true });
      }
      // Restore env vars
      for (const [key, value] of Object.entries(originalEnv)) {
        const envKey = `DEVORCH_${key.toUpperCase()}`;
        if (value !== undefined) {
          process.env[envKey] = value;
        } else {
          delete process.env[envKey];
        }
      }
    });

    it('should load config without env var override', () => {
      const config = `
profile:
  name: test-project
  agents: [claude-code]
  context_training: mobile-app
commands: [/test]
`;
      writeFileSync(join(testDir, 'devorch.config.yml'), config);
      delete process.env.DEVORCH_CONTEXT_TRAINING;

      const result = loadConfig(testDir);
      expect(result.profile.context_training).toBe('mobile-app');
    });

    it('should override context_training with DEVORCH_CONTEXT_TRAINING env var', () => {
      const config = `
profile:
  name: test-project
  agents: [claude-code]
  context_training: mobile-app
commands: [/test]
`;
      writeFileSync(join(testDir, 'devorch.config.yml'), config);
      process.env.DEVORCH_CONTEXT_TRAINING = 'backend-api';

      const result = loadConfig(testDir);
      expect(result.profile.context_training).toBe('backend-api');
    });

    it('should override name with DEVORCH_NAME env var', () => {
      const config = `
profile:
  name: test-project
  agents: [claude-code]
commands: [/test]
`;
      writeFileSync(join(testDir, 'devorch.config.yml'), config);
      process.env.DEVORCH_NAME = 'my-project';

      const result = loadConfig(testDir);
      expect(result.profile.name).toBe('my-project');
    });

    it('should handle multiple env var overrides', () => {
      const config = `
profile:
  name: test-project
  agents: [claude-code]
  context_training: mobile-app
commands: [/test]
`;
      writeFileSync(join(testDir, 'devorch.config.yml'), config);
      process.env.DEVORCH_NAME = 'my-project';
      process.env.DEVORCH_CONTEXT_TRAINING = 'backend-api';

      const result = loadConfig(testDir);
      expect(result.profile.name).toBe('my-project');
      expect(result.profile.context_training).toBe('backend-api');
    });
  });
});
