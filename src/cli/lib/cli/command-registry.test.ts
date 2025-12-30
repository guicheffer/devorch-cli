import { describe, expect, it } from 'bun:test';
import { COMMAND_REGISTRY, getCommandsByCategory } from '@/cli/lib/cli/command-registry.js';

describe('command-registry', () => {
  describe('COMMAND_REGISTRY', () => {
    it('should have command registry defined', () => {
      expect(COMMAND_REGISTRY).toBeDefined();
      expect(typeof COMMAND_REGISTRY).toBe('object');
    });

    it('should have install command', () => {
      expect(COMMAND_REGISTRY.install).toBeDefined();
      expect(COMMAND_REGISTRY.install?.description).toBeDefined();
    });

    it('should have commands with required properties', () => {
      const commands = Object.values(COMMAND_REGISTRY);
      expect(commands.length).toBeGreaterThan(0);

      for (const cmd of commands) {
        expect(cmd.description).toBeDefined();
        expect(cmd.category).toBeDefined();
        expect(typeof cmd.handler).toBe('function');
      }
    });
  });

  describe('getCommandsByCategory', () => {
    it('should get setup commands', () => {
      const setupCommands = getCommandsByCategory('setup');
      expect(Array.isArray(setupCommands)).toBe(true);
      expect(setupCommands.length).toBeGreaterThan(0);

      for (const cmd of setupCommands) {
        expect(cmd.category).toBe('setup');
      }
    });

    it('should get manage commands', () => {
      const manageCommands = getCommandsByCategory('manage');
      expect(Array.isArray(manageCommands)).toBe(true);

      for (const cmd of manageCommands) {
        expect(cmd.category).toBe('manage');
      }
    });

    it('should get troubleshoot commands', () => {
      const troubleshootCommands = getCommandsByCategory('troubleshoot');
      expect(Array.isArray(troubleshootCommands)).toBe(true);

      for (const cmd of troubleshootCommands) {
        expect(cmd.category).toBe('troubleshoot');
      }
    });
  });
});
