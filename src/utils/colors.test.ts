import { describe, expect, it } from 'bun:test';
import { colors } from '@/utils/colors.js';

describe('colors', () => {
  describe('colors object', () => {
    it('should have color properties defined', () => {
      expect(colors).toBeDefined();
      expect(typeof colors).toBe('object');
    });

    it('should have basic colors', () => {
      expect(colors.red).toBeDefined();
      expect(colors.green).toBeDefined();
      expect(colors.yellow).toBeDefined();
      expect(colors.blue).toBeDefined();
      expect(colors.cyan).toBeDefined();
      expect(colors.purple).toBeDefined();
      expect(colors.gray).toBeDefined();
    });

    it('should have style modifiers', () => {
      expect(colors.bold).toBeDefined();
      expect(colors.dim).toBeDefined();
    });
  });
});
