import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  clearState,
  computeConfigHash,
  createInstallationLock,
  initializeState,
  isInstallationLocked,
  readState,
  removeInstallationLock,
  writeState,
} from '@/cli/lib/installation/state-manager.js';

describe('state-manager', () => {
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

  describe('computeConfigHash', () => {
    it('should compute hash for config', () => {
      const config = {
        profile: { name: 'test', description: 'test', agents: ['claude-code' as const] },
        subagents: [],
        commands: [],
        skills: [],
      };

      const hash = computeConfigHash(config as any);
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should produce same hash for same config', () => {
      const config = {
        profile: { name: 'test', description: 'test', agents: ['claude-code' as const] },
        subagents: ['agent1'],
        commands: [],
        skills: [],
      };

      const hash1 = computeConfigHash(config as any);
      const hash2 = computeConfigHash(config as any);
      expect(hash1).toBe(hash2);
    });
  });

  describe('readState', () => {
    it('should return null for non-existent state', () => {
      const state = readState(testDir);
      expect(state).toBeNull();
    });
  });

  describe('writeState', () => {
    it('should save state to disk', () => {
      const state = initializeState(testDir, {} as any, 'local');
      writeState(testDir, state);

      const statePath = join(testDir, 'devorch', '.state', 'state.json');
      expect(existsSync(statePath)).toBe(true);
    });
  });

  describe('installation lock', () => {
    it('should create and check lock', () => {
      expect(isInstallationLocked(testDir)).toBe(false);

      createInstallationLock(testDir);
      expect(isInstallationLocked(testDir)).toBe(true);

      removeInstallationLock(testDir);
      expect(isInstallationLocked(testDir)).toBe(false);
    });
  });

  describe('clearState', () => {
    it('should remove state file', () => {
      const state = initializeState(testDir, {} as any, 'local');
      writeState(testDir, state);

      expect(readState(testDir)).not.toBeNull();

      clearState(testDir);
      expect(readState(testDir)).toBeNull();
    });
  });
});
