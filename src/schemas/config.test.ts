import { describe, expect, it } from 'bun:test';
import {
  configSchema,
  defaultConfig,
  getCommandName,
  getSkillName,
  getSubagentName,
  isCommandEnabled,
  isSkillEnabled,
  isSubagentEnabled,
  normalizeCommandToObject,
  normalizeSkillToObject,
  normalizeSubagentToObject,
  validateConfig,
} from './config.js';

describe('config schema', () => {
  describe('configSchema', () => {
    it('should validate minimal valid config with new object format', () => {
      const data = {
        profile: {
          name: 'test-project',
          agents: ['claude-code'],
        },
        commands: [{ name: '/test-command', enabled: true }],
      };

      const result = configSchema.parse(data);

      expect(result.profile.name).toBe('test-project');
      expect(result.profile.agents).toEqual(['claude-code']);
      expect(result.commands).toEqual([{ name: '/test-command', enabled: true }]);
    });

    it('should validate config with optional context_training field', () => {
      const data = {
        profile: {
          name: 'test-project',
          agents: ['claude-code'],
          context_training: 'react-native-starter',
        },
        commands: [{ name: '/test-command', enabled: true }],
      };

      const result = configSchema.parse(data);

      expect(result.profile.context_training).toBe('react-native-starter');
    });

    it('should validate config without context_training field', () => {
      const data = {
        profile: {
          name: 'test-project',
          agents: ['claude-code'],
        },
        commands: [{ name: '/test-command', enabled: true }],
      };

      const result = configSchema.parse(data);

      expect(result.profile.context_training).toBeUndefined();
    });

    it('should validate config with optional subagents and skills', () => {
      const data = {
        profile: {
          name: 'test-project',
          agents: ['claude-code'],
        },
        commands: [{ name: '/test-command', enabled: true }],
        subagents: [{ name: 'subagent/test', enabled: true }],
        skills: [{ name: 'skill/test', enabled: true }],
      };

      const result = configSchema.parse(data);

      expect(result.subagents).toEqual([{ name: 'subagent/test', enabled: true }]);
      expect(result.skills).toEqual([{ name: 'skill/test', enabled: true }]);
    });

    it('should validate config with claude-code agent', () => {
      const data = {
        profile: {
          name: 'test-project',
          agents: ['claude-code'],
        },
        commands: [{ name: '/test-command', enabled: true }],
      };

      const result = configSchema.parse(data);

      expect(result.profile.agents).toEqual(['claude-code']);
    });

    it('should validate config with description', () => {
      const data = {
        profile: {
          name: 'test-project',
          description: 'Test project description',
          agents: ['claude-code'],
        },
        commands: [{ name: '/test-command', enabled: true }],
      };

      const result = configSchema.parse(data);

      expect(result.profile.description).toBe('Test project description');
    });

    it('should validate config with template_vars', () => {
      const data = {
        profile: {
          name: 'test-project',
          agents: ['claude-code'],
        },
        commands: [{ name: '/test-command', enabled: true }],
        template_vars: {
          profile_name: 'test',
          generation_date: '2025-01-01',
        },
      };

      const result = configSchema.parse(data);

      expect(result.template_vars).toEqual({
        profile_name: 'test',
        generation_date: '2025-01-01',
      });
    });

    it('should reject config without profile', () => {
      const data = {
        commands: ['/test-command'],
      };

      expect(() => configSchema.parse(data)).toThrow();
    });

    it('should reject config without profile.name', () => {
      const data = {
        profile: {
          agents: ['claude-code'],
        },
        commands: ['/test-command'],
      };

      expect(() => configSchema.parse(data)).toThrow();
    });

    it('should reject config without profile.agents', () => {
      const data = {
        profile: {
          name: 'test-project',
        },
        commands: ['/test-command'],
      };

      expect(() => configSchema.parse(data)).toThrow();
    });

    it('should reject config with empty agents array', () => {
      const data = {
        profile: {
          name: 'test-project',
          agents: [],
        },
        commands: ['/test-command'],
      };

      expect(() => configSchema.parse(data)).toThrow();
    });

    it('should reject config with invalid agent', () => {
      const data = {
        profile: {
          name: 'test-project',
          agents: ['invalid-agent'],
        },
        commands: ['/test-command'],
      };

      expect(() => configSchema.parse(data)).toThrow();
    });

    it('should reject config without commands', () => {
      const data = {
        profile: {
          name: 'test-project',
          agents: ['claude-code'],
        },
      };

      expect(() => configSchema.parse(data)).toThrow();
    });

    it('should NOT reject config with deprecated standards field (schema allows it)', () => {
      // Note: The schema itself allows unknown fields - the deprecation warning
      // happens in the loader, not in schema validation
      const data = {
        profile: {
          name: 'test-project',
          agents: ['claude-code'],
        },
        commands: [{ name: '/test-command', enabled: true }],
        standards: ['old-standard'], // Deprecated but schema doesn't reject
      };

      // Schema validation should pass (passthrough mode)
      // The loader will warn about this field
      expect(() => configSchema.parse(data)).not.toThrow();
    });
  });

  describe('validateConfig', () => {
    it('should return valid for config with commands', () => {
      const config = {
        profile: {
          name: 'test-project',
          agents: ['claude-code' as const],
        },
        commands: [{ name: '/test-command', enabled: true }],
      };

      const result = validateConfig(config);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return invalid for config without commands', () => {
      const config = {
        profile: {
          name: 'test-project',
          agents: ['claude-code' as const],
        },
        commands: [],
      };

      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Config must specify at least one command');
    });

    it('should return invalid for config with undefined commands', () => {
      const config = {
        profile: {
          name: 'test-project',
          agents: ['claude-code' as const],
        },
        commands: undefined as any,
      };

      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Config must specify at least one command');
    });
  });

  describe('defaultConfig', () => {
    it('should have valid structure', () => {
      const result = configSchema.parse(defaultConfig);

      expect(result.profile.name).toBe('my-project');
      expect(result.profile.agents).toEqual(['claude-code']);
    });

    it('should have context_training field commented out (not present in parsed object)', () => {
      // The default config object should not have tuning field
      // (it's shown as comment in YAML, but not in the object)
      expect(defaultConfig.profile.context_training).toBeUndefined();
    });

    it('should NOT have standards field (deprecated)', () => {
      // Ensure standards field is not present in default config
      expect((defaultConfig as any).standards).toBeUndefined();
    });

    it('should have at least one command', () => {
      expect(defaultConfig.commands.length).toBeGreaterThan(0);
    });

    it('should pass validateConfig', () => {
      const result = validateConfig(defaultConfig);

      expect(result.valid).toBe(true);
    });
  });

  describe('helper functions', () => {
    describe('command helpers', () => {
      it('should get command name', () => {
        const cmd = { name: '/test-command', enabled: true };
        expect(getCommandName(cmd)).toBe('/test-command');
      });

      it('should check if command is enabled', () => {
        expect(isCommandEnabled({ name: '/test', enabled: true })).toBe(true);
        expect(isCommandEnabled({ name: '/test', enabled: false })).toBe(false);
      });

      it('should normalize string to command object', () => {
        const result = normalizeCommandToObject('/test-command');
        expect(result).toEqual({ name: '/test-command', enabled: true });
      });

      it('should normalize command object to itself', () => {
        const cmd = { name: '/test', enabled: false };
        const result = normalizeCommandToObject(cmd);
        expect(result).toEqual(cmd);
      });
    });

    describe('subagent helpers', () => {
      it('should get subagent name', () => {
        const sub = { name: 'domain/subagent', enabled: true };
        expect(getSubagentName(sub)).toBe('domain/subagent');
      });

      it('should check if subagent is enabled', () => {
        expect(isSubagentEnabled({ name: 'test', enabled: true })).toBe(true);
        expect(isSubagentEnabled({ name: 'test', enabled: false })).toBe(false);
      });

      it('should normalize string to subagent object', () => {
        const result = normalizeSubagentToObject('domain/subagent');
        expect(result).toEqual({ name: 'domain/subagent', enabled: true });
      });

      it('should normalize subagent object to itself', () => {
        const sub = { name: 'test', enabled: false };
        const result = normalizeSubagentToObject(sub);
        expect(result).toEqual(sub);
      });
    });

    describe('skill helpers', () => {
      it('should get skill name', () => {
        const skill = { name: 'category/skill', enabled: true };
        expect(getSkillName(skill)).toBe('category/skill');
      });

      it('should check if skill is enabled', () => {
        expect(isSkillEnabled({ name: 'test', enabled: true })).toBe(true);
        expect(isSkillEnabled({ name: 'test', enabled: false })).toBe(false);
      });

      it('should normalize string to skill object', () => {
        const result = normalizeSkillToObject('category/skill');
        expect(result).toEqual({ name: 'category/skill', enabled: true });
      });

      it('should normalize skill object to itself', () => {
        const skill = { name: 'test', enabled: false };
        const result = normalizeSkillToObject(skill);
        expect(result).toEqual(skill);
      });
    });
  });

  describe('new object format validation', () => {
    it('should validate config with all object formats', () => {
      const data = {
        profile: {
          name: 'test-project',
          agents: ['claude-code'],
        },
        commands: [
          { name: '/command1', enabled: true },
          { name: '/command2', enabled: false },
        ],
        subagents: [
          { name: 'domain/subagent1', enabled: true },
          { name: 'domain/subagent2', enabled: false },
        ],
        skills: [
          { name: 'category/skill1', enabled: true },
          { name: 'category/skill2', enabled: false },
        ],
      };

      const result = configSchema.parse(data);

      expect(result.commands).toHaveLength(2);
      expect(result.subagents).toHaveLength(2);
      expect(result.skills).toHaveLength(2);
    });

    it('should require enabled field to be boolean', () => {
      const data = {
        profile: {
          name: 'test-project',
          agents: ['claude-code'],
        },
        commands: [{ name: '/test', enabled: 'yes' }], // Invalid: string instead of boolean
      };

      expect(() => configSchema.parse(data)).toThrow();
    });

    it('should require name field in command object', () => {
      const data = {
        profile: {
          name: 'test-project',
          agents: ['claude-code'],
        },
        commands: [{ enabled: true }], // Missing name field
      };

      expect(() => configSchema.parse(data)).toThrow();
    });

    it('should validate command name starts with /', () => {
      const data = {
        profile: {
          name: 'test-project',
          agents: ['claude-code'],
        },
        commands: [{ name: 'test-command', enabled: true }], // Missing leading slash
      };

      expect(() => configSchema.parse(data)).toThrow();
    });
  });
});
