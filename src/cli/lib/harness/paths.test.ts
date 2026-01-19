import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import {
  featureExists,
  getFeaturePath,
  getHarnessRootPath,
  getLogsPath,
  getPlanPath,
  getPromptPath,
  getSpecsPath,
  HARNESS_ROOT,
  listFeatures,
} from '@/cli/lib/harness/paths.js';

describe('lib/harness/paths', () => {
  const cwd = process.cwd();

  describe('HARNESS_ROOT', () => {
    it('should be devorch/harness', () => {
      expect(HARNESS_ROOT).toBe('devorch/harness');
    });
  });

  describe('getHarnessRootPath', () => {
    it('should return path under cwd', () => {
      expect(getHarnessRootPath()).toBe(join(cwd, 'devorch/harness'));
    });
  });

  describe('getFeaturePath', () => {
    it('should return path with feature name', () => {
      expect(getFeaturePath('my-feature')).toBe(join(cwd, 'devorch/harness/my-feature'));
    });
  });

  describe('getPromptPath', () => {
    it('should return PROMPT.md path', () => {
      expect(getPromptPath('my-feature')).toBe(join(cwd, 'devorch/harness/my-feature/PROMPT.md'));
    });
  });

  describe('getPlanPath', () => {
    it('should return PLAN.md path', () => {
      expect(getPlanPath('my-feature')).toBe(join(cwd, 'devorch/harness/my-feature/PLAN.md'));
    });
  });

  describe('getSpecsPath', () => {
    it('should return specs directory path', () => {
      expect(getSpecsPath('my-feature')).toBe(join(cwd, 'devorch/harness/my-feature/specs'));
    });
  });

  describe('getLogsPath', () => {
    it('should return logs directory path', () => {
      expect(getLogsPath('my-feature')).toBe(join(cwd, 'devorch/harness/my-feature/logs'));
    });
  });

  describe('featureExists', () => {
    const testFeaturePath = join(cwd, 'devorch/harness/test-feature-exists');

    afterEach(() => {
      rmSync(testFeaturePath, { recursive: true, force: true });
    });

    it('should return false for non-existent feature', () => {
      expect(featureExists('non-existent-feature-xyz')).toBe(false);
    });

    it('should return true for existing feature', () => {
      mkdirSync(testFeaturePath, { recursive: true });
      expect(featureExists('test-feature-exists')).toBe(true);
    });
  });

  describe('listFeatures', () => {
    const testRalphRoot = join(cwd, 'devorch/harness');
    const testFeature1 = join(testRalphRoot, 'test-list-feature-1');
    const testFeature2 = join(testRalphRoot, 'test-list-feature-2');

    beforeEach(() => {
      mkdirSync(testFeature1, { recursive: true });
      mkdirSync(testFeature2, { recursive: true });
    });

    afterEach(() => {
      rmSync(testFeature1, { recursive: true, force: true });
      rmSync(testFeature2, { recursive: true, force: true });
    });

    it('should list features as directories', () => {
      const features = listFeatures();
      expect(features).toContain('test-list-feature-1');
      expect(features).toContain('test-list-feature-2');
    });
  });
});
