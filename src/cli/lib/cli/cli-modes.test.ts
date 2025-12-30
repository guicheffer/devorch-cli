import { describe, expect, it } from 'bun:test';
import { extractGlobalOptions, parseArgs } from '@/cli/lib/cli/cli-modes.js';

describe('cli-modes', () => {
  describe('parseArgs', () => {
    it('should parse command line arguments', () => {
      const args = parseArgs();
      expect(args).toBeDefined();
      expect(typeof args).toBe('object');
    });

    it('should have _ array for positional args', () => {
      const args = parseArgs();
      expect(Array.isArray(args._)).toBe(true);
    });
  });

  describe('extractGlobalOptions', () => {
    it('should extract verbose flag', () => {
      const argv = { _: [], verbose: true };
      const options = extractGlobalOptions(argv);
      expect(options).toBeDefined();
      expect(options.verbose).toBe(true);
    });

    it('should extract debug flag', () => {
      const argv = { _: [], debug: true };
      const options = extractGlobalOptions(argv);
      expect(options.debug).toBe(true);
    });

    it('should extract quiet flag', () => {
      const argv = { _: [], quiet: true };
      const options = extractGlobalOptions(argv);
      expect(options.quiet).toBe(true);
    });

    it('should handle no flags', () => {
      const argv = { _: [] };
      const options = extractGlobalOptions(argv);
      expect(options).toBeDefined();
      expect(options.verbose).toBeFalsy();
      expect(options.debug).toBeFalsy();
      expect(options.quiet).toBeFalsy();
    });

    it('should extract local path', () => {
      const argv = { _: [], local: '/path/to/local' };
      const options = extractGlobalOptions(argv);
      expect(options.local).toBe('/path/to/local');
    });
  });
});
