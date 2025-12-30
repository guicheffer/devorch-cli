import { describe, expect, it } from 'bun:test';
import { CircularDependencyDetector, DependencyResolver } from '@/cli/lib/markdown-di/resolver.js';

describe('markdown-di/resolver', () => {
  describe('DependencyResolver', () => {
    it('should create DependencyResolver instance', () => {
      const context = {
        baseDir: '/base/dir',
        mode: 'build' as const,
        visitedFiles: new Set<string>(),
      };
      const resolver = new DependencyResolver(context);
      expect(resolver).toBeDefined();
      expect(resolver).toBeInstanceOf(DependencyResolver);
    });

    it('should have resolveFilePath method', () => {
      const context = {
        baseDir: '/base/dir',
        mode: 'build' as const,
        visitedFiles: new Set<string>(),
      };
      const resolver = new DependencyResolver(context);
      expect(typeof resolver.resolveFilePath).toBe('function');
    });

    it('should have resolveGlobPattern method', () => {
      const context = {
        baseDir: '/base/dir',
        mode: 'build' as const,
        visitedFiles: new Set<string>(),
      };
      const resolver = new DependencyResolver(context);
      expect(typeof resolver.resolveGlobPattern).toBe('function');
    });

    it('should have resolve method', () => {
      const context = {
        baseDir: '/base/dir',
        mode: 'build' as const,
        visitedFiles: new Set<string>(),
      };
      const resolver = new DependencyResolver(context);
      expect(typeof resolver.resolve).toBe('function');
    });

    it('should resolve file path', () => {
      const context = {
        baseDir: '/base/dir',
        mode: 'build' as const,
        visitedFiles: new Set<string>(),
      };
      const resolver = new DependencyResolver(context);
      const resolved = resolver.resolveFilePath('/base', 'test.md');
      expect(resolved).toBe('/base/test.md');
    });
  });

  describe('CircularDependencyDetector', () => {
    it('should create CircularDependencyDetector instance', () => {
      const detector = new CircularDependencyDetector();
      expect(detector).toBeDefined();
      expect(detector).toBeInstanceOf(CircularDependencyDetector);
    });

    it('should have detect method', () => {
      const detector = new CircularDependencyDetector();
      expect(typeof detector.detect).toBe('function');
    });

    it('should detect circular dependencies', () => {
      const detector = new CircularDependencyDetector();
      const errors = detector.detect('file1.md', ['file2.md']);
      expect(Array.isArray(errors)).toBe(true);
    });
  });
});
