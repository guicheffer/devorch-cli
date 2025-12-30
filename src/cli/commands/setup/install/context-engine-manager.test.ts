import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  copyContextToProject,
  installContextBoilerplate,
  listAvailableContexts,
} from './context-engine-manager.js';

describe('context-engine-manager', () => {
  let testDir: string;
  let sourceConfigDir: string;
  let projectDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'devorch-test-'));
    sourceConfigDir = join(testDir, 'source');
    projectDir = join(testDir, 'project');

    mkdirSync(sourceConfigDir, { recursive: true });
    mkdirSync(projectDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  /**
   * Helper to create a valid context with implementers
   */
  function createValidContext(contextDir: string, implementerNames: string[] = ['ui.md']) {
    mkdirSync(contextDir, { recursive: true });
    const implementersDir = join(contextDir, 'implementers');
    mkdirSync(implementersDir, { recursive: true });
    for (const name of implementerNames) {
      writeFileSync(join(implementersDir, name), `# ${name.replace('.md', '')} implementer`);
    }
    return contextDir;
  }

  describe('listAvailableContexts', () => {
    it('should return empty array when context-engine directory does not exist', () => {
      const contexts = listAvailableContexts(sourceConfigDir);
      expect(contexts).toEqual([]);
    });

    it('should return empty array when context-engine directory is empty', () => {
      const contextsDir = join(sourceConfigDir, 'templates', 'context-engine');
      mkdirSync(contextsDir, { recursive: true });

      const contexts = listAvailableContexts(sourceConfigDir);
      expect(contexts).toEqual([]);
    });

    it('should list available contexts with implementers', () => {
      const contextsDir = join(sourceConfigDir, 'templates', 'context-engine');
      const testContextDir = join(contextsDir, 'test-context');
      createValidContext(testContextDir, ['ui.md', 'state.md']);

      const contexts = listAvailableContexts(sourceConfigDir);

      expect(contexts).toHaveLength(1);
      expect(contexts[0]).toMatchObject({
        name: 'test-context',
        displayName: 'Test Context',
      });
    });

    it('should skip directories without implementers', () => {
      const contextsDir = join(sourceConfigDir, 'templates', 'context-engine');
      mkdirSync(join(contextsDir, 'invalid-context'), { recursive: true });

      const contexts = listAvailableContexts(sourceConfigDir);
      expect(contexts).toEqual([]);
    });

    it('should include directories with empty implementers folder', () => {
      const contextsDir = join(sourceConfigDir, 'templates', 'context-engine');
      const emptyContext = join(contextsDir, 'empty-context');
      mkdirSync(join(emptyContext, 'implementers'), { recursive: true });

      const contexts = listAvailableContexts(sourceConfigDir);
      expect(contexts).toHaveLength(1);
      expect(contexts[0].name).toBe('empty-context');
    });

    it('should handle multiple contexts', () => {
      const contextsDir = join(sourceConfigDir, 'templates', 'context-engine');

      // Create first context
      const context1Dir = join(contextsDir, 'context-1');
      createValidContext(context1Dir);

      // Create second context
      const context2Dir = join(contextsDir, 'context-2');
      createValidContext(context2Dir, ['api.md', 'data.md', 'testing.md']);

      const contexts = listAvailableContexts(sourceConfigDir);

      expect(contexts).toHaveLength(2);
      expect(contexts[0].name).toBe('context-1');
      expect(contexts[1].name).toBe('context-2');
    });
  });

  describe('copyContextToProject', () => {
    it('should copy context directory to project context-training', () => {
      const contextsDir = join(sourceConfigDir, 'templates', 'context-engine');
      const testContextDir = join(contextsDir, 'test-context');
      createValidContext(testContextDir);

      // Add extra files
      writeFileSync(join(testContextDir, 'specification.md'), '# Spec', 'utf-8');

      copyContextToProject('test-context', sourceConfigDir, projectDir);

      const destDir = join(projectDir, 'devorch', 'context-training', 'test-context');
      expect(existsSync(destDir)).toBe(true);
      expect(existsSync(join(destDir, 'implementers', 'ui.md'))).toBe(true);
      expect(existsSync(join(destDir, 'specification.md'))).toBe(true);
    });

    it('should create context-training directory if it does not exist', () => {
      const contextsDir = join(sourceConfigDir, 'templates', 'context-engine');
      const testContextDir = join(contextsDir, 'test-context');
      createValidContext(testContextDir);

      copyContextToProject('test-context', sourceConfigDir, projectDir);

      const contextTrainingDir = join(projectDir, 'devorch', 'context-training');
      expect(existsSync(contextTrainingDir)).toBe(true);
    });

    it('should recursively copy nested directories', () => {
      const contextsDir = join(sourceConfigDir, 'templates', 'context-engine');
      const testContextDir = join(contextsDir, 'test-context');
      createValidContext(testContextDir);

      // Add nested verifiers
      const verifiersDir = join(testContextDir, 'verifiers');
      mkdirSync(verifiersDir, { recursive: true });
      writeFileSync(join(verifiersDir, 'testing.md'), '# Testing verifier', 'utf-8');

      copyContextToProject('test-context', sourceConfigDir, projectDir);

      const destVerifiersDir = join(
        projectDir,
        'devorch',
        'context-training',
        'test-context',
        'verifiers'
      );
      expect(existsSync(join(destVerifiersDir, 'testing.md'))).toBe(true);
    });
  });

  describe('installContextBoilerplate', () => {
    it('should install context boilerplate successfully', () => {
      const contextsDir = join(sourceConfigDir, 'templates', 'context-engine');
      const testContextDir = join(contextsDir, 'test-context');
      createValidContext(testContextDir);

      installContextBoilerplate('test-context', sourceConfigDir, projectDir);

      const destDir = join(projectDir, 'devorch', 'context-training', 'test-context');
      expect(existsSync(destDir)).toBe(true);
      expect(existsSync(join(destDir, 'implementers', 'ui.md'))).toBe(true);
    });

    it('should throw error if source context does not exist', () => {
      expect(() => {
        installContextBoilerplate('non-existent', sourceConfigDir, projectDir);
      }).toThrow();
    });
  });
});
