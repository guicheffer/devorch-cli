import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { contextTrainingExists, listContextTrainings } from './context-training-loader.js';

describe('context-training-loader', () => {
  let testDir: string;
  let contextTrainingsDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `devorch-test-${Date.now()}`);
    contextTrainingsDir = join(testDir, 'devorch', 'context-training');
    mkdirSync(contextTrainingsDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  /**
   * Helper to create a valid context-training directory with implementers
   */
  function createValidContextTraining(name: string) {
    const contextTrainingDir = join(contextTrainingsDir, name);
    mkdirSync(contextTrainingDir, { recursive: true });
    const implementersDir = join(contextTrainingDir, 'implementers');
    mkdirSync(implementersDir, { recursive: true });
    writeFileSync(join(implementersDir, 'ui.md'), '# UI implementer');
    return contextTrainingDir;
  }

  describe('contextTrainingExists', () => {
    it('should return false for non-existent contextTraining', () => {
      expect(contextTrainingExists('nonexistent', testDir)).toBe(false);
    });

    it('should return true for existing context training with implementers', () => {
      createValidContextTraining('test-context-training');
      expect(contextTrainingExists('test-context-training', testDir)).toBe(true);
    });

    it('should return false for directory without implementers', () => {
      const contextTrainingDir = join(contextTrainingsDir, 'incomplete');
      mkdirSync(contextTrainingDir, { recursive: true });

      expect(contextTrainingExists('incomplete', testDir)).toBe(false);
    });

    it('should return true for directory with empty implementers folder', () => {
      const contextTrainingDir = join(contextTrainingsDir, 'empty-impl');
      mkdirSync(contextTrainingDir, { recursive: true });
      mkdirSync(join(contextTrainingDir, 'implementers'), { recursive: true });

      expect(contextTrainingExists('empty-impl', testDir)).toBe(true);
    });
  });

  describe('listContextTrainings', () => {
    it('should return empty array when contextTrainings directory does not exist', () => {
      rmSync(contextTrainingsDir, { recursive: true, force: true });
      expect(listContextTrainings(testDir)).toEqual([]);
    });

    it('should return empty array when no contextTrainings exist', () => {
      expect(listContextTrainings(testDir)).toEqual([]);
    });

    it('should list all valid contextTrainings', () => {
      createValidContextTraining('contextTraining1');
      createValidContextTraining('contextTraining2');

      // Create invalid directory (no implementers)
      const invalidDir = join(contextTrainingsDir, 'invalid');
      mkdirSync(invalidDir, { recursive: true });

      const contextTrainings = listContextTrainings(testDir);
      expect(contextTrainings).toContain('contextTraining1');
      expect(contextTrainings).toContain('contextTraining2');
      expect(contextTrainings).not.toContain('invalid');
      expect(contextTrainings).toHaveLength(2);
    });

    it('should ignore files in context trainings directory', () => {
      writeFileSync(join(contextTrainingsDir, 'readme.txt'), 'Some file');
      createValidContextTraining('contextTraining1');

      const contextTrainings = listContextTrainings(testDir);
      expect(contextTrainings).toEqual(['contextTraining1']);
    });
  });
});
