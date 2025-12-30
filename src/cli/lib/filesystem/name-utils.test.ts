import { describe, expect, it } from 'bun:test';
import { resolveAssetName } from './name-utils.js';

describe('resolveAssetName', () => {
  describe('subagents', () => {
    it('should extract domain from path (new structure)', () => {
      const result = resolveAssetName(
        'spec-writer',
        'specification/subagents/spec-writer.md',
        'subagent'
      );
      expect(result).toBe('specification/spec-writer');
    });

    it('should extract domain for implementers (new structure)', () => {
      const result = resolveAssetName(
        'implementer',
        'implementation/subagents/implementer.md',
        'subagent'
      );
      expect(result).toBe('implementation/implementer');
    });

    it('should extract domain for verifiers (new structure)', () => {
      const result = resolveAssetName(
        'verifier',
        'implementation/subagents/verifier.md',
        'subagent'
      );
      expect(result).toBe('implementation/verifier');
    });

    it('should extract domain for dev-tools agents (new structure)', () => {
      const result = resolveAssetName(
        'environment-collector',
        'dev-tools/subagents/environment-collector.md',
        'subagent'
      );
      expect(result).toBe('dev-tools/environment-collector');
    });

    it('should handle shallow paths (no domain)', () => {
      const result = resolveAssetName('product-planner', 'product-planner.md', 'subagent');
      expect(result).toBe('product-planner');
    });

    it('should preserve existing slashes in baseName', () => {
      const result = resolveAssetName(
        'custom/agent',
        'specification/subagents/agent.md',
        'subagent'
      );
      expect(result).toBe('custom/agent');
    });
  });

  describe('skills', () => {
    it('should extract domain from path', () => {
      const result = resolveAssetName(
        'zest-components',
        'skills/ui-design-system/zest-components/SKILL.md',
        'skill'
      );
      expect(result).toBe('ui-design-system-zest-components');
    });

    it('should extract domain for different domains', () => {
      const result = resolveAssetName(
        'zustand-patterns',
        'skills/state-management/zustand-patterns/SKILL.md',
        'skill'
      );
      expect(result).toBe('state-management-zustand-patterns');
    });

    it('should handle platform skills', () => {
      const result = resolveAssetName(
        'ios-patterns',
        'skills/platform/ios-patterns/SKILL.md',
        'skill'
      );
      expect(result).toBe('platform-ios-patterns');
    });

    it('should preserve existing slashes in baseName', () => {
      const result = resolveAssetName('domain/skill', 'skills/domain/skill/SKILL.md', 'skill');
      expect(result).toBe('domain/skill');
    });

    it('should handle root-level skills without domain', () => {
      const result = resolveAssetName('root-skill', 'skills/root-skill.md', 'skill');
      expect(result).toBe('root-skill');
    });
  });

  describe('commands', () => {
    it('should return baseName as-is for commands (new structure)', () => {
      const result = resolveAssetName(
        '/create-spec',
        'specification/create-spec/command.md',
        'command'
      );
      expect(result).toBe('/create-spec');
    });

    it('should return baseName for dev-tools commands (new structure)', () => {
      const result = resolveAssetName('/worktree', 'dev-tools/worktree/command.md', 'command');
      expect(result).toBe('/worktree');
    });

    it('should preserve slashes in command names', () => {
      const result = resolveAssetName('/custom/command', 'domain/custom/command.md', 'command');
      expect(result).toBe('/custom/command');
    });
  });

  describe('edge cases', () => {
    it('should handle shallow paths for subagents', () => {
      const result = resolveAssetName('agent', 'agent.md', 'subagent');
      expect(result).toBe('agent');
    });

    it('should handle shallow paths for skills', () => {
      const result = resolveAssetName('skill', 'skills/skill.md', 'skill');
      expect(result).toBe('skill');
    });

    it('should handle domain with empty subagents folder', () => {
      const result = resolveAssetName('name', 'domain/subagents//name.md', 'subagent');
      expect(result).toBe('domain/name');
    });
  });
});
