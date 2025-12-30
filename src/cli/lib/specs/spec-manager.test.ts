import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initializeState, writeState } from '@/cli/lib/installation/state-manager.js';
import {
  type ActiveSpec,
  clearActiveSpec,
  findSpecByName,
  getActiveSpec,
  getNewestSpec,
  isStaleSpec,
  listSpecs,
  selectSpec,
  setActiveSpec,
} from './spec-manager.js';

describe('spec-manager', () => {
  let testDir: string;
  const SPECS_DIR = 'devorch/specs';

  beforeEach(() => {
    testDir = join(tmpdir(), `devorch-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    // Initialize state
    // biome-ignore lint/suspicious/noExplicitAny: Test mock config
    const state = initializeState(testDir, {} as any, 'local');
    writeState(testDir, state);
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  function createSpec(folderName: string): string {
    const specPath = join(testDir, SPECS_DIR, folderName);
    mkdirSync(specPath, { recursive: true });
    // Create a dummy spec.md file
    writeFileSync(join(specPath, 'spec.md'), '# Test Spec');
    return specPath;
  }

  describe('listSpecs', () => {
    it('should return empty array when specs directory does not exist', () => {
      const specs = listSpecs(testDir);
      expect(specs).toEqual([]);
    });

    it('should list specs in date descending order', () => {
      createSpec('2025-11-15-feature-a');
      createSpec('2025-11-18-feature-b');
      createSpec('2025-11-17-feature-c');

      const specs = listSpecs(testDir);

      expect(specs).toHaveLength(3);
      expect(specs[0].folderName).toBe('2025-11-18-feature-b'); // Newest first
      expect(specs[1].folderName).toBe('2025-11-17-feature-c');
      expect(specs[2].folderName).toBe('2025-11-15-feature-a');
    });

    it('should parse spec names correctly', () => {
      createSpec('2025-11-18-user-authentication');

      const specs = listSpecs(testDir);

      expect(specs).toHaveLength(1);
      expect(specs[0].name).toBe('user-authentication');
      expect(specs[0].folderName).toBe('2025-11-18-user-authentication');
      expect(specs[0].date).toBe('2025-11-18');
    });

    it('should skip folders with invalid format', () => {
      createSpec('2025-11-18-valid-spec');
      mkdirSync(join(testDir, SPECS_DIR, 'invalid-folder'), { recursive: true });
      mkdirSync(join(testDir, SPECS_DIR, '2025-invalid'), { recursive: true });

      const specs = listSpecs(testDir);

      expect(specs).toHaveLength(1);
      expect(specs[0].folderName).toBe('2025-11-18-valid-spec');
    });

    it('should include relative path in spec info', () => {
      createSpec('2025-11-18-test-spec');

      const specs = listSpecs(testDir);

      expect(specs[0].path).toBe('devorch/specs/2025-11-18-test-spec');
    });
  });

  describe('getNewestSpec', () => {
    it('should return null when no specs exist', () => {
      const newest = getNewestSpec(testDir);
      expect(newest).toBeNull();
    });

    it('should return the most recent spec by date', () => {
      createSpec('2025-11-15-feature-a');
      createSpec('2025-11-18-feature-b');
      createSpec('2025-11-17-feature-c');

      const newest = getNewestSpec(testDir);

      expect(newest).not.toBeNull();
      expect(newest?.folderName).toBe('2025-11-18-feature-b');
      expect(newest?.name).toBe('feature-b');
    });
  });

  describe('getActiveSpec', () => {
    it('should return null when no active spec is set', () => {
      const active = getActiveSpec(testDir);
      expect(active).toBeNull();
    });

    it('should return active spec from state', () => {
      const _specPath = createSpec('2025-11-18-test-spec');
      const specs = listSpecs(testDir);
      const _activeSpec = setActiveSpec(testDir, specs[0]);

      const retrieved = getActiveSpec(testDir);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.folderName).toBe('2025-11-18-test-spec');
      expect(retrieved?.name).toBe('test-spec');
      expect(retrieved?.path).toBe('devorch/specs/2025-11-18-test-spec');
    });

    it('should return null and clear state when spec folder no longer exists', () => {
      const specPath = createSpec('2025-11-18-test-spec');
      const specs = listSpecs(testDir);
      setActiveSpec(testDir, specs[0]);

      // Delete the spec folder
      rmSync(specPath, { recursive: true, force: true });

      const retrieved = getActiveSpec(testDir);

      expect(retrieved).toBeNull();

      // Verify state was cleared
      const retrievedAgain = getActiveSpec(testDir);
      expect(retrievedAgain).toBeNull();
    });
  });

  describe('setActiveSpec', () => {
    it('should set active spec in state', () => {
      createSpec('2025-11-18-new-feature');
      const specs = listSpecs(testDir);

      const activeSpec = setActiveSpec(testDir, specs[0]);

      expect(activeSpec.path).toBe('devorch/specs/2025-11-18-new-feature');
      expect(activeSpec.name).toBe('new-feature');
      expect(activeSpec.folderName).toBe('2025-11-18-new-feature');
      expect(activeSpec.created).toBeDefined();
      expect(activeSpec.lastAccessed).toBeDefined();
    });

    it('should update lastAccessed when setting same spec again', async () => {
      createSpec('2025-11-18-test-spec');
      const specs = listSpecs(testDir);

      const first = setActiveSpec(testDir, specs[0]);
      // Small delay to ensure timestamps differ
      await new Promise((resolve) => setTimeout(resolve, 10));
      const second = setActiveSpec(testDir, specs[0]);

      expect(second.lastAccessed).not.toBe(first.lastAccessed);
      expect(new Date(second.lastAccessed).getTime()).toBeGreaterThan(
        new Date(first.lastAccessed).getTime()
      );
    });

    it('should overwrite previous active spec', () => {
      createSpec('2025-11-15-old-feature');
      createSpec('2025-11-18-new-feature');
      const specs = listSpecs(testDir);

      setActiveSpec(testDir, specs[1]); // Set old feature
      const active = setActiveSpec(testDir, specs[0]); // Set new feature

      expect(active.folderName).toBe('2025-11-18-new-feature');

      const retrieved = getActiveSpec(testDir);
      expect(retrieved?.folderName).toBe('2025-11-18-new-feature');
    });
  });

  describe('clearActiveSpec', () => {
    it('should remove active spec from state', () => {
      createSpec('2025-11-18-test-spec');
      const specs = listSpecs(testDir);
      setActiveSpec(testDir, specs[0]);

      expect(getActiveSpec(testDir)).not.toBeNull();

      clearActiveSpec(testDir);

      expect(getActiveSpec(testDir)).toBeNull();
    });

    it('should handle clearing when no active spec is set', () => {
      expect(() => clearActiveSpec(testDir)).not.toThrow();
      expect(getActiveSpec(testDir)).toBeNull();
    });
  });

  describe('findSpecByName', () => {
    beforeEach(() => {
      createSpec('2025-11-15-user-auth');
      createSpec('2025-11-18-user-profile');
      createSpec('2025-11-17-payment-system');
    });

    it('should find spec by full folder name', () => {
      const spec = findSpecByName(testDir, '2025-11-18-user-profile');

      expect(spec).not.toBeNull();
      expect(spec?.folderName).toBe('2025-11-18-user-profile');
      expect(spec?.name).toBe('user-profile');
    });

    it('should find spec by name only (without date)', () => {
      const spec = findSpecByName(testDir, 'payment-system');

      expect(spec).not.toBeNull();
      expect(spec?.folderName).toBe('2025-11-17-payment-system');
      expect(spec?.name).toBe('payment-system');
    });

    it('should prioritize full folder name over spec name', () => {
      // This tests that if both match, full folder name wins
      const spec = findSpecByName(testDir, '2025-11-15-user-auth');

      expect(spec?.folderName).toBe('2025-11-15-user-auth');
    });

    it('should return null when spec not found', () => {
      const spec = findSpecByName(testDir, 'nonexistent-spec');

      expect(spec).toBeNull();
    });

    it('should handle exact matches only', () => {
      const spec = findSpecByName(testDir, 'user'); // Partial match

      expect(spec).toBeNull();
    });
  });

  describe('isStaleSpec', () => {
    it('should return false when active spec is the newest', () => {
      createSpec('2025-11-18-latest-feature');
      const specs = listSpecs(testDir);
      const activeSpec = setActiveSpec(testDir, specs[0]);

      const result = isStaleSpec(testDir, activeSpec);

      expect(result.isStale).toBe(false);
      expect(result.newestSpec?.folderName).toBe('2025-11-18-latest-feature');
    });

    it('should return true when active spec is older than newest', () => {
      createSpec('2025-11-15-old-feature');
      createSpec('2025-11-18-new-feature');
      const specs = listSpecs(testDir);

      // Set the older one as active
      const oldSpec = specs.find((s) => s.folderName === '2025-11-15-old-feature');
      if (!oldSpec) throw new Error('Test setup failed: old spec not found');
      const activeSpec = setActiveSpec(testDir, oldSpec);

      const result = isStaleSpec(testDir, activeSpec);

      expect(result.isStale).toBe(true);
      expect(result.newestSpec?.folderName).toBe('2025-11-18-new-feature');
    });

    it('should return false when no specs exist', () => {
      const activeSpec: ActiveSpec = {
        path: 'devorch/specs/2025-11-15-deleted',
        name: 'deleted',
        folderName: '2025-11-15-deleted',
        created: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
      };

      const result = isStaleSpec(testDir, activeSpec);

      expect(result.isStale).toBe(false);
      expect(result.newestSpec).toBeNull();
    });
  });

  describe('selectSpec', () => {
    it('should return active spec when set', () => {
      createSpec('2025-11-15-old-feature');
      createSpec('2025-11-18-new-feature');
      const specs = listSpecs(testDir);

      // Set old feature as active
      const oldSpec = specs.find((s) => s.folderName === '2025-11-15-old-feature');
      if (!oldSpec) throw new Error('Test setup failed: old spec not found');
      setActiveSpec(testDir, oldSpec);

      const selected = selectSpec(testDir);

      expect(selected?.folderName).toBe('2025-11-15-old-feature');
    });

    it('should fall back to newest spec when no active spec is set', () => {
      createSpec('2025-11-15-old-feature');
      createSpec('2025-11-18-new-feature');

      const selected = selectSpec(testDir);

      expect(selected?.folderName).toBe('2025-11-18-new-feature');
    });

    it('should fall back to newest spec when active spec folder no longer exists', () => {
      const oldSpecPath = createSpec('2025-11-15-old-feature');
      createSpec('2025-11-18-new-feature');
      const specs = listSpecs(testDir);

      // Set old feature as active
      const oldSpec = specs.find((s) => s.folderName === '2025-11-15-old-feature');
      if (!oldSpec) throw new Error('Test setup failed: old spec not found');
      setActiveSpec(testDir, oldSpec);

      // Delete the active spec folder
      rmSync(oldSpecPath, { recursive: true, force: true });

      const selected = selectSpec(testDir);

      expect(selected?.folderName).toBe('2025-11-18-new-feature');
    });

    it('should return null when no specs exist', () => {
      const selected = selectSpec(testDir);

      expect(selected).toBeNull();
    });
  });
});
