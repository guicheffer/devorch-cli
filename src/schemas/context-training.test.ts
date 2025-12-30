import { describe, expect, it } from 'bun:test';
import {
  contextTrainingSchema,
  extractSkillReferences,
  SKILL_REFERENCE_PATTERN,
  validateSkillReferences,
} from './context-training.js';

describe('context training schema', () => {
  describe('contextTrainingSchema', () => {
    it('should validate complete tuning structure', () => {
      const data = {
        specification: '# Specification Guide',
        implementation: '# Implementation Guide',
        implementers: ['implementers/ui.md', 'implementers/state.md'],
        verifiers: ['verifiers/ui.md'],
        path: '/path/to/tuning',
      };

      const result = contextTrainingSchema.parse(data);

      expect(result.specification).toBe('# Specification Guide');
      expect(result.implementation).toBe('# Implementation Guide');
      expect(result.implementers).toEqual(['implementers/ui.md', 'implementers/state.md']);
      expect(result.verifiers).toEqual(['verifiers/ui.md']);
      expect(result.path).toBe('/path/to/tuning');
    });

    it('should validate tuning with empty arrays', () => {
      const data = {
        specification: '',
        implementation: '',
        implementers: [],
        verifiers: [],
        path: '/path/to/tuning',
      };

      const result = contextTrainingSchema.parse(data);

      expect(result.implementers).toEqual([]);
      expect(result.verifiers).toEqual([]);
    });

    it('should reject tuning without required fields', () => {
      const data = {
        specification: '# Spec',
        // missing implementation, implementers, verifiers, path
      };

      expect(() => contextTrainingSchema.parse(data)).toThrow();
    });
  });

  describe('SKILL_REFERENCE_PATTERN', () => {
    it('should match single-word skill references', () => {
      const text = 'Use **zustand-patterns** for state.';
      const matches = Array.from(text.matchAll(SKILL_REFERENCE_PATTERN));

      expect(matches).toHaveLength(1);
      expect(matches[0][1]).toBe('zustand-patterns');
    });

    it('should match domain/skill references', () => {
      const text = 'Use **react-native-core/component-patterns** for components.';
      const matches = Array.from(text.matchAll(SKILL_REFERENCE_PATTERN));

      expect(matches).toHaveLength(1);
      expect(matches[0][1]).toBe('react-native-core/component-patterns');
    });

    it('should match multiple skill references', () => {
      const text = 'Use **skill-1** and **domain/skill-2** and **skill-3**.';
      const matches = Array.from(text.matchAll(SKILL_REFERENCE_PATTERN));

      expect(matches).toHaveLength(3);
      expect(matches[0][1]).toBe('skill-1');
      expect(matches[1][1]).toBe('domain/skill-2');
      expect(matches[2][1]).toBe('skill-3');
    });

    it('should not match bold text without skill format', () => {
      const text = 'This is **bold text** but not a skill.';
      const matches = Array.from(text.matchAll(SKILL_REFERENCE_PATTERN));

      // Bold text with spaces is not a skill reference
      expect(matches).toHaveLength(0);
    });

    it('should not match single asterisks', () => {
      const text = 'This is *italic* not bold.';
      const matches = Array.from(text.matchAll(SKILL_REFERENCE_PATTERN));

      expect(matches).toHaveLength(0);
    });

    it('should match skill references with numbers', () => {
      const text = 'Use **skill-123** and **test-skill-456**.';
      const matches = Array.from(text.matchAll(SKILL_REFERENCE_PATTERN));

      expect(matches).toHaveLength(2);
      expect(matches[0][1]).toBe('skill-123');
      expect(matches[1][1]).toBe('test-skill-456');
    });

    it('should match skill references in multiline text', () => {
      const text = `
# Title

Use **skill-1** for this.

And use **skill-2** for that.
`;
      const matches = Array.from(text.matchAll(SKILL_REFERENCE_PATTERN));

      expect(matches).toHaveLength(2);
      expect(matches[0][1]).toBe('skill-1');
      expect(matches[1][1]).toBe('skill-2');
    });
  });

  describe('extractSkillReferences', () => {
    it('should extract skill references from markdown', () => {
      const markdown = 'Use **skill-1** and **skill-2** patterns.';
      const skills = extractSkillReferences(markdown);

      expect(skills).toEqual(['skill-1', 'skill-2']);
    });

    it('should extract domain/skill references', () => {
      const markdown = 'Use **react-native/component-patterns** and **zustand-patterns**.';
      const skills = extractSkillReferences(markdown);

      expect(skills).toEqual(['react-native/component-patterns', 'zustand-patterns']);
    });

    it('should return empty array when no skill references found', () => {
      const markdown = 'This is just plain text.';
      const skills = extractSkillReferences(markdown);

      expect(skills).toEqual([]);
    });

    it('should handle duplicate skill references', () => {
      const markdown = 'Use **skill-1** here and **skill-1** there.';
      const skills = extractSkillReferences(markdown);

      // Returns duplicates - deduplication is done by validator
      expect(skills).toEqual(['skill-1', 'skill-1']);
    });

    it('should extract skills from complex markdown', () => {
      const markdown = `
# Component Patterns

Follow **react-native-core/component-patterns** for structure.

## State Management

Use **zustand-patterns** for stores.

## Testing

Add test IDs using **testing/test-ids**.
`;
      const skills = extractSkillReferences(markdown);

      expect(skills).toEqual([
        'react-native-core/component-patterns',
        'zustand-patterns',
        'testing/test-ids',
      ]);
    });

    it('should handle empty markdown', () => {
      const skills = extractSkillReferences('');
      expect(skills).toEqual([]);
    });

    it('should not extract bold text that is not skill format', () => {
      const markdown = 'This is **important text** but not a skill reference.';
      const skills = extractSkillReferences(markdown);

      // "important text" has space, doesn't match skill format
      expect(skills).toEqual([]);
    });
  });

  describe('validateSkillReferences', () => {
    it('should return valid when all skills are available', () => {
      const markdown = 'Use **skill-1** and **skill-2**.';
      const availableSkills = ['skill-1', 'skill-2', 'skill-3'];

      const result = validateSkillReferences(markdown, availableSkills);

      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it('should return invalid when skills are missing', () => {
      const markdown = 'Use **skill-1** and **skill-2**.';
      const availableSkills = ['skill-1'];

      const result = validateSkillReferences(markdown, availableSkills);

      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['skill-2']);
    });

    it('should handle multiple missing skills', () => {
      const markdown = 'Use **skill-1**, **skill-2**, and **skill-3**.';
      const availableSkills = ['skill-1'];

      const result = validateSkillReferences(markdown, availableSkills);

      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['skill-2', 'skill-3']);
    });

    it('should return duplicates in missing skills array', () => {
      const markdown = 'Use **skill-1** here and **skill-1** there.';
      const availableSkills = ['skill-2'];

      const result = validateSkillReferences(markdown, availableSkills);

      expect(result.valid).toBe(false);
      // validateSkillReferences doesn't deduplicate - returns all missing references
      expect(result.missing).toEqual(['skill-1', 'skill-1']);
    });

    it('should return valid when no skill references found', () => {
      const markdown = 'Plain text without skill references.';
      const availableSkills = ['skill-1'];

      const result = validateSkillReferences(markdown, availableSkills);

      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it('should validate domain/skill references', () => {
      const markdown = 'Use **domain/skill-1** and **skill-2**.';
      const availableSkills = ['domain/skill-1', 'skill-2'];

      const result = validateSkillReferences(markdown, availableSkills);

      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it('should detect missing domain/skill references', () => {
      const markdown = 'Use **domain/skill-1** and **skill-2**.';
      const availableSkills = ['skill-2'];

      const result = validateSkillReferences(markdown, availableSkills);

      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['domain/skill-1']);
    });

    it('should handle empty available skills list', () => {
      const markdown = 'Use **skill-1**.';
      const availableSkills: string[] = [];

      const result = validateSkillReferences(markdown, availableSkills);

      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['skill-1']);
    });

    it('should validate complex markdown with multiple skills', () => {
      const markdown = `
# Component Patterns

Use **react-native-core/component-patterns** for structure.

## State Management

Use **zustand-patterns** for stores.

## Missing Skill

Reference **missing-skill** here.
`;
      const availableSkills = ['react-native-core/component-patterns', 'zustand-patterns'];

      const result = validateSkillReferences(markdown, availableSkills);

      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['missing-skill']);
    });
  });
});
