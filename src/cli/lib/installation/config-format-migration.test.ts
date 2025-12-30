import { describe, expect, it } from 'bun:test';
import { migrateConfigFormat, type RawConfig } from './config-format-migration.js';

describe('config-format-migration', () => {
  describe('migrateConfigFormat', () => {
    it('should migrate string commands to object format', () => {
      const rawConfig: RawConfig = {
        profile: {
          name: 'test-project',
          agents: ['claude-code'],
        },
        commands: ['/command1', '/command2'],
      };

      const result = migrateConfigFormat(rawConfig);

      expect(result.config.commands).toEqual([
        { name: '/command1', enabled: true },
        { name: '/command2', enabled: true },
      ]);
      expect(result.commandsMigrated).toBe(2);
    });

    it('should migrate string subagents to object format', () => {
      const rawConfig: RawConfig = {
        profile: {
          name: 'test-project',
          agents: ['claude-code'],
        },
        commands: [{ name: '/test', enabled: true }],
        subagents: ['domain/subagent1', 'domain/subagent2'],
      };

      const result = migrateConfigFormat(rawConfig);

      expect(result.config.subagents).toEqual([
        { name: 'domain/subagent1', enabled: true },
        { name: 'domain/subagent2', enabled: true },
      ]);
      expect(result.subagentsMigrated).toBe(2);
    });

    it('should migrate string skills to object format', () => {
      const rawConfig: RawConfig = {
        profile: {
          name: 'test-project',
          agents: ['claude-code'],
        },
        commands: [{ name: '/test', enabled: true }],
        skills: ['category/skill1', 'category/skill2'],
      };

      const result = migrateConfigFormat(rawConfig);

      expect(result.config.skills).toEqual([
        { name: 'category/skill1', enabled: true },
        { name: 'category/skill2', enabled: true },
      ]);
      expect(result.skillsMigrated).toBe(2);
    });

    it('should not migrate already-migrated object format', () => {
      const rawConfig: RawConfig = {
        profile: {
          name: 'test-project',
          agents: ['claude-code'],
        },
        commands: [
          { name: '/command1', enabled: true },
          { name: '/command2', enabled: false },
        ],
      };

      const result = migrateConfigFormat(rawConfig);

      expect(result.config.commands).toEqual([
        { name: '/command1', enabled: true },
        { name: '/command2', enabled: false },
      ]);
      expect(result.commandsMigrated).toBe(0);
    });

    it('should handle mixed string and object formats', () => {
      const rawConfig: RawConfig = {
        profile: {
          name: 'test-project',
          agents: ['claude-code'],
        },
        commands: [
          '/command1', // String
          { name: '/command2', enabled: false }, // Object
          '/command3', // String
        ],
      };

      const result = migrateConfigFormat(rawConfig);

      expect(result.config.commands).toEqual([
        { name: '/command1', enabled: true },
        { name: '/command2', enabled: false },
        { name: '/command3', enabled: true },
      ]);
      expect(result.commandsMigrated).toBe(2);
    });

    it('should handle undefined arrays', () => {
      const rawConfig: RawConfig = {
        profile: {
          name: 'test-project',
          agents: ['claude-code'],
        },
        commands: [{ name: '/test', enabled: true }],
        // subagents and skills undefined
      };

      const result = migrateConfigFormat(rawConfig);

      expect(result.config.subagents).toBeUndefined();
      expect(result.config.skills).toBeUndefined();
      expect(result.subagentsMigrated).toBe(0);
      expect(result.skillsMigrated).toBe(0);
    });

    it('should preserve profile and template_vars', () => {
      const rawConfig: RawConfig = {
        profile: {
          name: 'test-project',
          description: 'Test description',
          agents: ['claude-code'],
          context_training: 'my-context',
        },
        commands: ['/test'],
        template_vars: {
          custom_var: 'value',
        },
      };

      const result = migrateConfigFormat(rawConfig);

      expect(result.config.profile).toEqual(rawConfig.profile);
      expect(result.config.template_vars).toEqual(rawConfig.template_vars);
    });

    it('should return correct migration counts', () => {
      const rawConfig: RawConfig = {
        profile: {
          name: 'test-project',
          agents: ['claude-code'],
        },
        commands: ['/cmd1', '/cmd2'],
        subagents: ['sub1', 'sub2', 'sub3'],
        skills: ['skill1'],
      };

      const result = migrateConfigFormat(rawConfig);

      expect(result.commandsMigrated).toBe(2);
      expect(result.subagentsMigrated).toBe(3);
      expect(result.skillsMigrated).toBe(1);
    });

    it('should report zero migrations for already-migrated config', () => {
      const rawConfig: RawConfig = {
        profile: {
          name: 'test-project',
          agents: ['claude-code'],
        },
        commands: [{ name: '/cmd1', enabled: true }],
        subagents: [{ name: 'sub1', enabled: true }],
        skills: [{ name: 'skill1', enabled: true }],
      };

      const result = migrateConfigFormat(rawConfig);

      expect(result.commandsMigrated).toBe(0);
      expect(result.subagentsMigrated).toBe(0);
      expect(result.skillsMigrated).toBe(0);
    });
  });
});
