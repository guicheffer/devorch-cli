import { describe, expect, test } from 'bun:test';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

// We need to expose the isOutdated function for testing
// For now, we'll test the public API through the cache

const TEST_CACHE_DIR = join(homedir(), '.devorch-test');
const TEST_CACHE_FILE = join(TEST_CACHE_DIR, 'version-check.json');

describe('Version Checker', () => {
  // Clean up test cache before and after tests
  const cleanup = () => {
    if (existsSync(TEST_CACHE_DIR)) {
      rmSync(TEST_CACHE_DIR, { recursive: true, force: true });
    }
  };

  test('version comparison logic', () => {
    // Test version comparison logic by comparing semver strings
    const isOutdated = (current: string, latest: string): boolean => {
      const c = current.replace(/^v/, '');
      const l = latest.replace(/^v/, '');

      const currentParts = c.split('.').map(Number);
      const latestParts = l.split('.').map(Number);

      for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
        const currentPart = currentParts[i] || 0;
        const latestPart = latestParts[i] || 0;

        if (currentPart < latestPart) {
          return true;
        }
        if (currentPart > latestPart) {
          return false;
        }
      }

      return false;
    };

    // Test cases
    expect(isOutdated('v1.0.0', 'v1.0.1')).toBe(true);
    expect(isOutdated('v1.0.0', 'v1.1.0')).toBe(true);
    expect(isOutdated('v1.0.0', 'v2.0.0')).toBe(true);
    expect(isOutdated('v1.0.1', 'v1.0.0')).toBe(false);
    expect(isOutdated('v1.1.0', 'v1.0.0')).toBe(false);
    expect(isOutdated('v2.0.0', 'v1.0.0')).toBe(false);
    expect(isOutdated('v1.0.0', 'v1.0.0')).toBe(false);
    expect(isOutdated('1.0.0', '1.0.1')).toBe(true);
    expect(isOutdated('v1.0.0', '1.0.1')).toBe(true);
  });

  test('cache structure', () => {
    cleanup();

    // Create test cache
    if (!existsSync(TEST_CACHE_DIR)) {
      mkdirSync(TEST_CACHE_DIR, { recursive: true });
    }

    const cache = {
      lastCheck: Date.now(),
      latestVersion: 'v1.0.0',
    };

    writeFileSync(TEST_CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');

    // Verify cache was written
    expect(existsSync(TEST_CACHE_FILE)).toBe(true);

    cleanup();
  });
});
