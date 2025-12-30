import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ensureDir, fileExists, readFile, writeFile } from '@/utils/files.js';

describe('files', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `devorch-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('fileExists', () => {
    it('should return true for existing file', () => {
      const filePath = join(testDir, 'test.txt');
      writeFileSync(filePath, 'content');

      expect(fileExists(filePath)).toBe(true);
    });

    it('should return false for non-existing file', () => {
      const filePath = join(testDir, 'nonexistent.txt');
      expect(fileExists(filePath)).toBe(false);
    });
  });

  describe('readFile', () => {
    it('should read file content', () => {
      const filePath = join(testDir, 'test.txt');
      writeFileSync(filePath, 'test content');

      const content = readFile(filePath);
      expect(content).toBe('test content');
    });
  });

  describe('writeFile', () => {
    it('should write file content', () => {
      const filePath = join(testDir, 'test.txt');

      writeFile(filePath, 'new content');

      expect(existsSync(filePath)).toBe(true);
      expect(readFile(filePath)).toBe('new content');
    });

    it('should overwrite existing file', () => {
      const filePath = join(testDir, 'test.txt');

      writeFile(filePath, 'content1');
      writeFile(filePath, 'content2');

      expect(readFile(filePath)).toBe('content2');
    });
  });

  describe('ensureDir', () => {
    it('should create directory if it does not exist', () => {
      const dirPath = join(testDir, 'new-dir');
      expect(existsSync(dirPath)).toBe(false);

      ensureDir(dirPath);
      expect(existsSync(dirPath)).toBe(true);
    });

    it('should create nested directories', () => {
      const nestedPath = join(testDir, 'a', 'b', 'c');
      ensureDir(nestedPath);
      expect(existsSync(nestedPath)).toBe(true);
    });
  });
});
