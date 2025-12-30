import { describe, expect, it } from 'bun:test';
import { showHelp, showVersion } from '@/cli/lib/cli/help.js';

describe('help', () => {
  describe('showHelp', () => {
    it('should execute without errors', () => {
      // showHelp outputs to console, we just verify it doesn't throw
      expect(() => showHelp('1.0.0')).not.toThrow();
    });

    it('should accept version string', () => {
      expect(() => showHelp('2.5.3')).not.toThrow();
    });
  });

  describe('showVersion', () => {
    it('should execute without errors', () => {
      // showVersion outputs to console, we just verify it doesn't throw
      expect(() => showVersion('1.0.0')).not.toThrow();
    });

    it('should accept version string', () => {
      expect(() => showVersion('3.1.4')).not.toThrow();
    });
  });
});
