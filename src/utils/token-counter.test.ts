import { describe, expect, it } from 'bun:test';
import { formatTokenCount } from '@/utils/token-counter.js';

describe('token-counter', () => {
  it('should format token counts in millions', () => {
    const formatted = formatTokenCount(2500000);
    expect(formatted).toContain('2.5M');
  });

  it('should format token counts in thousands', () => {
    const formatted = formatTokenCount(5000);
    expect(formatted).toContain('5k');
  });

  it('should format small token counts', () => {
    const formatted = formatTokenCount(42);
    expect(formatted).toBe('42');
  });
});
