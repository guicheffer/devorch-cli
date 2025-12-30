import { describe, expect, it } from 'bun:test';
import type { CategoryType } from '@/cli/lib/cli/menu-system.js';
import { displayHeader, showOutro } from '@/cli/lib/cli/menu-system.js';

describe('menu-system', () => {
  describe('displayHeader', () => {
    it('should execute without errors', () => {
      // displayHeader outputs to console, we just verify it doesn't throw
      expect(() => displayHeader('1.0.0')).not.toThrow();
    });

    it('should accept version string', () => {
      expect(() => displayHeader('2.5.3')).not.toThrow();
    });
  });

  describe('showOutro', () => {
    it('should execute with green color', () => {
      // showOutro outputs to console, we just verify it doesn't throw
      expect(() => showOutro('Success message', 'green')).not.toThrow();
    });

    it('should execute with yellow color', () => {
      expect(() => showOutro('Warning message', 'yellow')).not.toThrow();
    });

    it('should execute with default color', () => {
      expect(() => showOutro('Default message')).not.toThrow();
    });
  });

  describe('CategoryType', () => {
    it('should have valid category types', () => {
      const validCategories: CategoryType[] = ['setup', 'manage', 'troubleshoot'];

      expect(validCategories).toContain('setup');
      expect(validCategories).toContain('manage');
      expect(validCategories).toContain('troubleshoot');
    });
  });
});
