import { describe, expect, it } from 'bun:test';
import { getAgentFrontmatterFields } from '@/cli/lib/filesystem/frontmatter-filter.js';

describe('frontmatter-filter', () => {
  it('should get frontmatter fields for claude-code subagent', () => {
    const fields = getAgentFrontmatterFields('claude-code', 'subagent');

    expect(Array.isArray(fields)).toBe(true);
    expect(fields.length).toBeGreaterThan(0);
  });

  it('should get frontmatter fields for claude-code command', () => {
    const fields = getAgentFrontmatterFields('claude-code', 'command');

    expect(Array.isArray(fields)).toBe(true);
    expect(fields.length).toBeGreaterThan(0);
  });
});
