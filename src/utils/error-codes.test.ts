import { describe, expect, it } from 'bun:test';
import { ERROR_REGISTRY, getErrorDefinition, getErrorsByCategory } from '@/utils/error-codes.js';

describe('error-codes', () => {
  describe('ERROR_REGISTRY', () => {
    it('should have error registry defined', () => {
      expect(ERROR_REGISTRY).toBeDefined();
      expect(typeof ERROR_REGISTRY).toBe('object');
    });

    it('should have error definitions', () => {
      const errorCodes = Object.keys(ERROR_REGISTRY);
      expect(errorCodes.length).toBeGreaterThan(0);
    });

    it('should have errors with required properties', () => {
      const errors = Object.values(ERROR_REGISTRY);

      for (const error of errors) {
        expect(error.code).toBeDefined();
        expect(error.title).toBeDefined();
        expect(error.category).toBeDefined();
        expect(error.suggestions).toBeDefined();
        expect(Array.isArray(error.suggestions)).toBe(true);
        expect(['User', 'System', 'Network', 'Validation', 'Internal']).toContain(error.category);
      }
    });
  });

  describe('getErrorDefinition', () => {
    it('should get error definition by code', () => {
      const errorCodes = Object.keys(ERROR_REGISTRY);
      if (errorCodes.length > 0) {
        const firstCode = errorCodes[0];
        const definition = getErrorDefinition(firstCode);
        expect(definition).toBeDefined();
        expect(definition?.code).toBe(firstCode);
      }
    });

    it('should return undefined for non-existent code', () => {
      const definition = getErrorDefinition('NON_EXISTENT_CODE');
      expect(definition).toBeUndefined();
    });
  });

  describe('getErrorsByCategory', () => {
    it('should get errors by User category', () => {
      const userErrors = getErrorsByCategory('User');
      expect(Array.isArray(userErrors)).toBe(true);

      for (const error of userErrors) {
        expect(error.category).toBe('User');
      }
    });

    it('should get errors by System category', () => {
      const systemErrors = getErrorsByCategory('System');
      expect(Array.isArray(systemErrors)).toBe(true);

      for (const error of systemErrors) {
        expect(error.category).toBe('System');
      }
    });

    it('should get errors by Validation category', () => {
      const validationErrors = getErrorsByCategory('Validation');
      expect(Array.isArray(validationErrors)).toBe(true);

      for (const error of validationErrors) {
        expect(error.category).toBe('Validation');
      }
    });
  });
});
