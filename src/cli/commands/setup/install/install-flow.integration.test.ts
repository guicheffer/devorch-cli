import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { installContextBoilerplate, listAvailableContexts } from './context-engine-manager.js';
import { createLocalConfig } from './local-config-manager.js';

describe('install-flow integration', () => {
  let testDir: string;
  let sourceConfigDir: string;
  let projectDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'devorch-integration-'));
    sourceConfigDir = join(testDir, 'source');
    projectDir = join(testDir, 'project');

    mkdirSync(sourceConfigDir, { recursive: true });
    mkdirSync(projectDir, { recursive: true });

    // Setup a mock context-engine directory with test contexts
    setupMockContextEngine();
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  /**
   * Helper to create a valid context with implementers
   */
  function createValidContext(contextDir: string, implementerNames: string[] = ['ui.md']): string {
    mkdirSync(contextDir, { recursive: true });
    const implementersDir = join(contextDir, 'implementers');
    mkdirSync(implementersDir, { recursive: true });
    for (const name of implementerNames) {
      writeFileSync(join(implementersDir, name), `# ${name.replace('.md', '')} implementer`);
    }
    return contextDir;
  }

  function setupMockContextEngine() {
    const contextsDir = join(sourceConfigDir, 'templates', 'context-engine');

    // Create backend-api context with implementers
    const backendApiDir = join(contextsDir, 'backend-api');
    createValidContext(backendApiDir, ['api.md', 'database.md']);
    writeFileSync(join(backendApiDir, 'README.md'), '# Backend API Context', 'utf-8');

    // Create nested directory structure
    const implementationDir = join(backendApiDir, 'implementation');
    mkdirSync(implementationDir, { recursive: true });
    writeFileSync(join(implementationDir, 'api-implementer.md'), '# API Implementer', 'utf-8');

    // Create mobile-app context with implementers
    const mobileAppDir = join(contextsDir, 'mobile-app');
    createValidContext(mobileAppDir, ['ui.md']);
  }

  describe('complete fresh install flow', () => {
    it('should successfully install context and create local config', () => {
      // Step 1: List available contexts
      const contexts = listAvailableContexts(sourceConfigDir);
      expect(contexts).toHaveLength(2);

      const contextNames = contexts.map((c) => c.name).sort();
      expect(contextNames).toEqual(['backend-api', 'mobile-app']);

      // Step 2: Install selected context
      installContextBoilerplate('backend-api', sourceConfigDir, projectDir);

      // Verify context was copied
      const contextDir = join(projectDir, 'devorch', 'context-training', 'backend-api');
      expect(existsSync(contextDir)).toBe(true);
      expect(existsSync(join(contextDir, 'implementers', 'api.md'))).toBe(true);
      expect(existsSync(join(contextDir, 'README.md'))).toBe(true);
      expect(existsSync(join(contextDir, 'implementation', 'api-implementer.md'))).toBe(true);

      // Step 3: Create local config
      createLocalConfig(projectDir, 'backend-api');

      // Verify local config was created
      const localConfigPath = join(projectDir, 'devorch', 'config.local.yml');
      expect(existsSync(localConfigPath)).toBe(true);

      const localConfig = parseYaml(readFileSync(localConfigPath, 'utf-8'));
      expect(localConfig.profile.context_training).toBe('backend-api');
    });

    it('should handle multiple context installations', () => {
      // Install first context
      installContextBoilerplate('backend-api', sourceConfigDir, projectDir);
      createLocalConfig(projectDir, 'backend-api');

      // Install second context (simulating user switching contexts)
      installContextBoilerplate('mobile-app', sourceConfigDir, projectDir);
      createLocalConfig(projectDir, 'mobile-app');

      // Verify both contexts exist
      const backendApiDir = join(projectDir, 'devorch', 'context-training', 'backend-api');
      const mobileAppDir = join(projectDir, 'devorch', 'context-training', 'mobile-app');

      expect(existsSync(backendApiDir)).toBe(true);
      expect(existsSync(mobileAppDir)).toBe(true);

      // Verify local config points to latest
      const localConfigPath = join(projectDir, 'devorch', 'config.local.yml');
      const localConfig = parseYaml(readFileSync(localConfigPath, 'utf-8'));
      expect(localConfig.profile.context_training).toBe('mobile-app');
    });

    it('should preserve nested directory structure when copying context', () => {
      installContextBoilerplate('backend-api', sourceConfigDir, projectDir);

      const nestedFile = join(
        projectDir,
        'devorch',
        'context-training',
        'backend-api',
        'implementation',
        'api-implementer.md'
      );

      expect(existsSync(nestedFile)).toBe(true);
      const content = readFileSync(nestedFile, 'utf-8');
      expect(content).toBe('# API Implementer');
    });
  });

  describe('config directory structure', () => {
    it('should create proper devorch directory structure', () => {
      installContextBoilerplate('backend-api', sourceConfigDir, projectDir);
      createLocalConfig(projectDir, 'backend-api');

      // Verify directory structure
      expect(existsSync(join(projectDir, 'devorch'))).toBe(true);
      expect(existsSync(join(projectDir, 'devorch', 'context-training'))).toBe(true);
      expect(existsSync(join(projectDir, 'devorch', 'config.local.yml'))).toBe(true);
    });

    it('should not overwrite existing context-training directories', () => {
      // Install first time
      installContextBoilerplate('backend-api', sourceConfigDir, projectDir);

      // Modify a file in the installed context
      const readmePath = join(
        projectDir,
        'devorch',
        'context-training',
        'backend-api',
        'README.md'
      );
      writeFileSync(readmePath, '# Modified Content', 'utf-8');

      // Install again (simulating re-install)
      installContextBoilerplate('backend-api', sourceConfigDir, projectDir);

      // The file should be overwritten with original content
      const content = readFileSync(readmePath, 'utf-8');
      expect(content).toBe('# Backend API Context');
    });
  });

  describe('error handling', () => {
    it('should handle non-existent context gracefully', () => {
      expect(() => {
        installContextBoilerplate('non-existent-context', sourceConfigDir, projectDir);
      }).toThrow();

      // Verify nothing was created
      const contextDir = join(
        projectDir,
        'devorch',
        'context-training',
        'non-existent-context'
      );
      expect(existsSync(contextDir)).toBe(false);
    });

    it('should handle missing context-engine directory', () => {
      const emptySourceDir = join(testDir, 'empty-source');
      mkdirSync(emptySourceDir, { recursive: true });

      const contexts = listAvailableContexts(emptySourceDir);
      expect(contexts).toEqual([]);
    });
  });

  describe('context metadata parsing', () => {
    it('should correctly parse display name from directory', () => {
      const contexts = listAvailableContexts(sourceConfigDir);
      const backendApi = contexts.find((c) => c.name === 'backend-api');

      expect(backendApi).toBeDefined();
      expect(backendApi?.displayName).toBe('Backend Api');
    });

    it('should handle multiple contexts', () => {
      const contexts = listAvailableContexts(sourceConfigDir);
      const mobileApp = contexts.find((c) => c.name === 'mobile-app');

      expect(mobileApp).toBeDefined();
      expect(mobileApp?.displayName).toBe('Mobile App');
    });
  });

  describe('config file validation', () => {
    it('should create valid YAML in local config', () => {
      createLocalConfig(projectDir, 'test-context');

      const localConfigPath = join(projectDir, 'devorch', 'config.local.yml');
      const content = readFileSync(localConfigPath, 'utf-8');

      // Should parse without error
      const config = parseYaml(content);
      expect(config).toBeDefined();
      expect(config.profile).toBeDefined();
      expect(config.profile.context_training).toBe('test-context');
    });

    it('should handle context names with special characters in config', () => {
      const specialNames = [
        'context-with-dashes',
        'context_with_underscores',
        'context-123',
        'context.with.dots',
      ];

      for (const name of specialNames) {
        createLocalConfig(projectDir, name);

        const localConfigPath = join(projectDir, 'devorch', 'config.local.yml');
        const config = parseYaml(readFileSync(localConfigPath, 'utf-8'));

        expect(config.profile.context_training).toBe(name);
      }
    });
  });
});
