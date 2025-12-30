/**
 * Tests for skill updater frontmatter schema
 */

import { describe, expect, it } from 'bun:test';
import { skillUpdaterFrontmatterSchema } from './skill-updater';

describe('skillUpdaterFrontmatterSchema', () => {
  it('should validate valid frontmatter', () => {
    const valid = {
      repos: ['yourcompany/web', 'yourcompany/zest-react-native'],
    };

    const result = skillUpdaterFrontmatterSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should validate single repo', () => {
    const valid = {
      repos: ['yourcompany/web'],
    };

    const result = skillUpdaterFrontmatterSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should accept repos with hyphens and underscores', () => {
    const valid = {
      repos: ['my-org/my-repo', 'my_org/my_repo', 'my-org/my_repo', 'my_org/my-repo'],
    };

    const result = skillUpdaterFrontmatterSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should reject empty repos array', () => {
    const invalid = {
      repos: [],
    };

    const result = skillUpdaterFrontmatterSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject missing repos', () => {
    const invalid = {};

    const result = skillUpdaterFrontmatterSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject invalid repo format (no slash)', () => {
    const invalid = {
      repos: ['yourcompany-web'],
    };

    const result = skillUpdaterFrontmatterSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject invalid repo format (multiple slashes)', () => {
    const invalid = {
      repos: ['yourcompany/web/extra'],
    };

    const result = skillUpdaterFrontmatterSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject invalid characters in repo name', () => {
    const invalid = {
      repos: ['hello@fresh/web'],
    };

    const result = skillUpdaterFrontmatterSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject repos that are not strings', () => {
    const invalid = {
      repos: [123, 456],
    };

    const result = skillUpdaterFrontmatterSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
