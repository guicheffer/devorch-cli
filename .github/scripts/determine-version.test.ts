import { describe, expect, test } from 'bun:test';
import {
  calculateNextVersion,
  determineBumpType,
  calculateMinCompatibleCli,
} from './determine-version';

describe('calculateNextVersion', () => {
  test('returns 1.0.0 when no latest release', () => {
    expect(calculateNextVersion('', 'patch')).toBe('1.0.0');
    expect(calculateNextVersion('', 'minor')).toBe('1.0.0');
    expect(calculateNextVersion('', 'major')).toBe('1.0.0');
  });

  test('bumps patch version', () => {
    expect(calculateNextVersion('v1.0.0', 'patch')).toBe('1.0.1');
    expect(calculateNextVersion('v2.5.3', 'patch')).toBe('2.5.4');
    expect(calculateNextVersion('1.0.9', 'patch')).toBe('1.0.10');
  });

  test('bumps minor version', () => {
    expect(calculateNextVersion('v1.0.0', 'minor')).toBe('1.1.0');
    expect(calculateNextVersion('v2.5.3', 'minor')).toBe('2.6.0');
    expect(calculateNextVersion('1.0.9', 'minor')).toBe('1.1.0');
  });

  test('bumps major version', () => {
    expect(calculateNextVersion('v1.0.0', 'major')).toBe('2.0.0');
    expect(calculateNextVersion('v2.5.3', 'major')).toBe('3.0.0');
    expect(calculateNextVersion('1.0.9', 'major')).toBe('2.0.0');
  });
});

describe('determineBumpType', () => {
  test('returns major when semver:major label present', () => {
    expect(determineBumpType(['semver:major'], [])).toBe('major');
    expect(determineBumpType(['semver:major', 'other-label'], [])).toBe('major');
  });

  test('returns minor when semver:minor label present', () => {
    expect(determineBumpType(['semver:minor'], [])).toBe('minor');
    expect(determineBumpType(['semver:minor', 'other-label'], [])).toBe('minor');
  });

  test('returns patch when semver:patch label present', () => {
    expect(determineBumpType(['semver:patch'], [])).toBe('patch');
    expect(determineBumpType(['semver:patch', 'other-label'], [])).toBe('patch');
  });

  test('returns skip when semver:skip label present', () => {
    expect(determineBumpType(['semver:skip'], [])).toBe('skip');
    expect(determineBumpType(['semver:skip'], ['src/cli/index.ts'])).toBe('skip');
  });

  test('returns minor when src/ files changed', () => {
    expect(determineBumpType([], ['src/cli/index.ts'])).toBe('minor');
    expect(determineBumpType([], ['src/utils/logger.ts'])).toBe('minor');
    expect(determineBumpType([], ['src/schemas/config.ts'])).toBe('minor');
    expect(determineBumpType([], ['src/cli/commands/foo.ts', 'templates/foo.md'])).toBe('minor');
  });

  test('returns patch when only template files changed', () => {
    expect(determineBumpType([], ['templates/foo.md'])).toBe('patch');
    expect(determineBumpType([], ['templates/spec/bar.md', 'templates/common/baz.md'])).toBe(
      'patch'
    );
  });

  test('returns patch when only installer files changed', () => {
    expect(determineBumpType([], ['installer/setup.sh'])).toBe('patch');
    expect(determineBumpType([], ['installer/entitlements.plist', 'README.md'])).toBe('patch');
  });

  test('returns skip when no release-worthy changes', () => {
    expect(determineBumpType([], [])).toBe('skip');
    expect(determineBumpType([], ['README.md'])).toBe('skip');
    expect(determineBumpType([], ['.github/workflows/ci.yml'])).toBe('skip');
    expect(determineBumpType([], ['docs/guide.md', 'CONTRIBUTING.md'])).toBe('skip');
  });

  test('labels take priority over file detection', () => {
    // Even with CLI changes, label should win
    expect(determineBumpType(['semver:patch'], ['src/cli/index.ts'])).toBe('patch');
    expect(determineBumpType(['semver:major'], ['templates/foo.md'])).toBe('major');
  });
});

describe('calculateMinCompatibleCli', () => {
  test('returns major.minor.0 for patch bumps', () => {
    expect(calculateMinCompatibleCli('1.2.3', '1.2.4', 'patch')).toBe('1.2.0');
    expect(calculateMinCompatibleCli('2.5.9', '2.5.10', 'patch')).toBe('2.5.0');
  });

  test('returns new version for minor bumps', () => {
    expect(calculateMinCompatibleCli('1.2.3', '1.3.0', 'minor')).toBe('1.3.0');
    expect(calculateMinCompatibleCli('2.5.9', '2.6.0', 'minor')).toBe('2.6.0');
  });

  test('returns new version for major bumps', () => {
    expect(calculateMinCompatibleCli('1.2.3', '2.0.0', 'major')).toBe('2.0.0');
    expect(calculateMinCompatibleCli('2.5.9', '3.0.0', 'major')).toBe('3.0.0');
  });

  test('handles empty current version for patch', () => {
    // When current is empty/invalid, falls back to new version
    expect(calculateMinCompatibleCli('', '1.0.0', 'patch')).toBe('1.0.0');
  });
});
