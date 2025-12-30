import { describe, expect, it } from 'bun:test';
import { deepMerge, generateFileId } from '@/cli/lib/markdown-di/utils.js';

describe('markdown-di/utils', () => {
  describe('generateFileId', () => {
    it('should generate file ID from path and base dir', () => {
      const baseDir = '/project';
      const filePath = '/project/templates/subagents/spec-writer.md';
      const fileId = generateFileId(filePath, baseDir);

      expect(fileId).toBeDefined();
      expect(typeof fileId).toBe('string');
      expect(fileId).toContain('templates');
    });

    it('should generate consistent file IDs', () => {
      const baseDir = '/project';
      const filePath = '/project/templates/test.md';

      const id1 = generateFileId(filePath, baseDir);
      const id2 = generateFileId(filePath, baseDir);

      expect(id1).toBe(id2);
    });

    it('should handle different base directories', () => {
      const filePath = '/project/templates/test.md';

      const id1 = generateFileId(filePath, '/project');
      const id2 = generateFileId(filePath, '/other');

      expect(id1).not.toBe(id2);
    });
  });

  describe('deepMerge', () => {
    it('should merge two objects', () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { b: 3, c: 4 };

      const result = deepMerge(obj1, obj2) as any;

      expect(result.a).toBe(1);
      expect(result.b).toBe(3); // obj2 value should override
      expect(result.c).toBe(4);
    });

    it('should handle nested objects', () => {
      const obj1 = { a: { x: 1, y: 2 } };
      const obj2 = { a: { y: 3, z: 4 } };

      const result = deepMerge(obj1, obj2) as any;

      expect(result.a.x).toBe(1);
      expect(result.a.y).toBe(3);
      expect(result.a.z).toBe(4);
    });

    it('should handle empty objects', () => {
      const obj1 = { a: 1 };
      const obj2 = {};

      const result = deepMerge(obj1, obj2);

      expect(result.a).toBe(1);
    });

    it('should not mutate original objects', () => {
      const obj1 = { a: 1 };
      const obj2 = { b: 2 };

      const result = deepMerge(obj1, obj2) as any;

      expect(obj1).toEqual({ a: 1 });
      expect(obj2).toEqual({ b: 2 });
      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('should handle arrays', () => {
      const obj1 = { arr: [1, 2] };
      const obj2 = { arr: [3, 4] };

      const result = deepMerge(obj1, obj2);

      expect(result.arr).toEqual([3, 4]); // Arrays should be replaced
    });
  });
});
