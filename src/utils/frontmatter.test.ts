import { describe, expect, it } from 'bun:test';
import { extractFrontmatter, stringifyFrontmatter } from '@/utils/frontmatter.js';

describe('frontmatter', () => {
  describe('extractFrontmatter', () => {
    it('should extract frontmatter from content', () => {
      const markdown = `---
name: test
value: 42
---

# Content here`;

      const result = extractFrontmatter(markdown);
      expect(result).toBeDefined();
      expect(result?.name).toBe('test');
      expect(result?.value).toBe(42);
    });

    it('should return null for content without frontmatter', () => {
      const markdown = '# Just content';
      const result = extractFrontmatter(markdown);
      expect(result).toBeNull();
    });
  });

  describe('stringifyFrontmatter', () => {
    it('should not use folded scalars for long descriptions', () => {
      const content = '# My Content';
      const frontmatter = {
        name: 'test-command',
        description:
          'This is a very long description that would normally trigger gray-matter to use folded scalar YAML syntax which does not render nicely in Claude Code previews',
      };

      const result = stringifyFrontmatter(content, frontmatter);

      // Should not use folded scalar syntax (description: >-)
      // The pattern we're checking for is the YAML folded scalar operator at the start of a line
      expect(result).not.toMatch(/description:\s*>-\s*\n/);

      // Should contain the description (quoted or unquoted on same line)
      expect(result).toContain('description:');
      expect(result).toContain('very long description');
    });

    it('should preserve frontmatter structure', () => {
      const content = '# Test';
      const frontmatter = {
        name: 'example',
        value: 42,
        list: ['a', 'b', 'c'],
      };

      const result = stringifyFrontmatter(content, frontmatter);

      // Should contain frontmatter delimiters
      expect(result).toContain('---');

      // Should contain all fields
      expect(result).toContain('name:');
      expect(result).toContain('value:');
      expect(result).toContain('list:');

      // Should contain content
      expect(result).toContain('# Test');
    });
  });
});
