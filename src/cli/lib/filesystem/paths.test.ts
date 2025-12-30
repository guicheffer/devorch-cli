import { describe, expect, it } from 'bun:test';
import { createTempDir, getProjectDir, INSTALL_PATHS } from '@/cli/lib/filesystem/paths.js';

describe('paths', () => {
  describe('getProjectDir', () => {
    it('should return current directory by default', () => {
      const projectDir = getProjectDir();
      expect(projectDir).toBe(process.cwd());
    });

    it('should return provided directory', () => {
      const projectDir = getProjectDir('/custom/path');
      expect(projectDir).toBe('/custom/path');
    });
  });

  describe('createTempDir', () => {
    it('should create a temporary directory', () => {
      const tempDir = createTempDir();
      expect(tempDir).toContain('devorch');
      expect(typeof tempDir).toBe('string');
    });

    it('should accept custom prefix', () => {
      const tempDir = createTempDir('custom');
      expect(tempDir).toContain('custom');
    });
  });

  describe('INSTALL_PATHS', () => {
    it('should provide claude paths', () => {
      expect(INSTALL_PATHS.claudeRoot()).toBe('.claude');
      expect(INSTALL_PATHS.claudeAgents()).toContain('.claude/agents');
      expect(INSTALL_PATHS.claudeCommands()).toContain('.claude/commands');
      expect(INSTALL_PATHS.claudeSkills()).toContain('.claude/skills');
    });

    it('should provide devorch paths', () => {
      expect(INSTALL_PATHS.specMachineRoot()).toBe('devorch/.state');
    });
  });
});
