import { describe, expect, it } from 'bun:test';
import { MarkdownDI } from '@/cli/lib/markdown-di/index.js';

describe('markdown-di/index', () => {
  describe('MarkdownDI', () => {
    it('should create MarkdownDI instance', () => {
      const markdownDI = new MarkdownDI();
      expect(markdownDI).toBeDefined();
      expect(markdownDI).toBeInstanceOf(MarkdownDI);
    });

    it('should have process method', () => {
      const markdownDI = new MarkdownDI();
      expect(typeof markdownDI.process).toBe('function');
    });

    it('should process markdown content', async () => {
      const markdownDI = new MarkdownDI();
      const content = '---\nname: test\n---\n\n# Test Content';
      const options = {
        content,
        baseDir: process.cwd(),
        mode: 'build' as const,
      };

      const result = await markdownDI.process(options);

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.frontmatter).toBeDefined();
      expect(result.errors).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });
});
