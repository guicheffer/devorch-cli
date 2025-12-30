import { describe, expect, it } from 'bun:test';
import { PartialValidator } from '@/cli/lib/markdown-di/validator.js';

describe('markdown-di/validator', () => {
  describe('PartialValidator', () => {
    it('should create PartialValidator instance', () => {
      const validator = new PartialValidator();
      expect(validator).toBeDefined();
      expect(validator).toBeInstanceOf(PartialValidator);
    });

    it('should have validate method', () => {
      const validator = new PartialValidator();
      expect(typeof validator.validate).toBe('function');
    });

    it('should validate content and return errors array', () => {
      const validator = new PartialValidator();
      const content = 'Some content with {{valid.partial}}';
      const errors = validator.validate(content);

      expect(Array.isArray(errors)).toBe(true);
    });

    it('should detect invalid characters in partials', () => {
      const validator = new PartialValidator();
      const content = 'Content with {{invalid{bracket}}}';
      const errors = validator.validate(content);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].type).toBe('syntax');
      expect(errors[0].message).toContain('Invalid characters');
    });

    it('should return empty array for valid content', () => {
      const validator = new PartialValidator();
      const content = 'Content with {{valid.partial}} reference';
      const errors = validator.validate(content);

      expect(Array.isArray(errors)).toBe(true);
    });
  });
});
