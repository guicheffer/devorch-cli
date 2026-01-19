import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  countSpecs,
  formatExistingSpecs,
  getExistingSpecs,
  hasSpecs,
} from '@/cli/lib/harness/specs.js';

describe('lib/harness/specs', () => {
  const testDir = join(process.cwd(), 'tests', '.tmp-specs-test');

  beforeEach(() => {
    // Clean up and create test directory
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('hasSpecs', () => {
    it('should return false for non-existent directory', () => {
      expect(hasSpecs('/non/existent/path')).toBe(false);
    });

    it('should return false for empty directory', () => {
      expect(hasSpecs(testDir)).toBe(false);
    });

    it('should return false for directory with non-md files', () => {
      writeFileSync(join(testDir, 'file.txt'), 'content');
      expect(hasSpecs(testDir)).toBe(false);
    });

    it('should return true for directory with md files', () => {
      writeFileSync(join(testDir, 'spec.md'), 'content');
      expect(hasSpecs(testDir)).toBe(true);
    });
  });

  describe('countSpecs', () => {
    it('should return 0 for non-existent directory', () => {
      expect(countSpecs('/non/existent/path')).toBe(0);
    });

    it('should return 0 for empty directory', () => {
      expect(countSpecs(testDir)).toBe(0);
    });

    it('should count only md files', () => {
      writeFileSync(join(testDir, 'spec1.md'), 'content');
      writeFileSync(join(testDir, 'spec2.md'), 'content');
      writeFileSync(join(testDir, 'other.txt'), 'content');
      expect(countSpecs(testDir)).toBe(2);
    });
  });

  describe('getExistingSpecs', () => {
    it('should return empty array for non-existent directory', () => {
      expect(getExistingSpecs('/non/existent/path')).toEqual([]);
    });

    it('should return empty array for empty directory', () => {
      expect(getExistingSpecs(testDir)).toEqual([]);
    });

    it('should return specs with names and content', () => {
      writeFileSync(join(testDir, '00-overview.md'), '# Overview');
      writeFileSync(join(testDir, '01-api.md'), '# API');

      const specs = getExistingSpecs(testDir);
      expect(specs).toHaveLength(2);
      expect(specs.find((s) => s.name === '00-overview.md')?.content).toBe('# Overview');
      expect(specs.find((s) => s.name === '01-api.md')?.content).toBe('# API');
    });

    it('should only return md files', () => {
      writeFileSync(join(testDir, 'spec.md'), 'md content');
      writeFileSync(join(testDir, 'other.txt'), 'txt content');

      const specs = getExistingSpecs(testDir);
      expect(specs).toHaveLength(1);
      expect(specs[0].name).toBe('spec.md');
    });
  });

  describe('formatExistingSpecs', () => {
    it('should return empty string for empty array', () => {
      expect(formatExistingSpecs([])).toBe('');
    });

    it('should format specs with markdown code blocks', () => {
      const specs = [
        { name: '00-overview.md', content: '# Overview\nSome content' },
        { name: '01-api.md', content: '# API' },
      ];

      const formatted = formatExistingSpecs(specs);

      expect(formatted).toContain('## Existing Specs');
      expect(formatted).toContain('### 00-overview.md');
      expect(formatted).toContain('```markdown');
      expect(formatted).toContain('# Overview\nSome content');
      expect(formatted).toContain('### 01-api.md');
    });
  });
});
