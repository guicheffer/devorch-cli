import { describe, expect, it } from 'bun:test';
import { createProgressBar, getStatusIcon, sleep } from '@/cli/lib/harness/utils.js';

describe('lib/harness/utils', () => {
  describe('sleep', () => {
    it('should sleep for approximately the specified time', async () => {
      const start = Date.now();
      await sleep(50);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(45);
      expect(elapsed).toBeLessThan(100);
    });
  });

  describe('createProgressBar', () => {
    it('should create a progress bar at 0%', () => {
      const bar = createProgressBar(0, 10);
      expect(bar).toBe('[----------]');
    });

    it('should create a progress bar at 50%', () => {
      const bar = createProgressBar(50, 10);
      expect(bar).toBe('[#####-----]');
    });

    it('should create a progress bar at 100%', () => {
      const bar = createProgressBar(100, 10);
      expect(bar).toBe('[##########]');
    });

    it('should handle custom widths', () => {
      const bar = createProgressBar(25, 20);
      expect(bar).toBe('[#####---------------]');
    });

    it('should round percentages correctly', () => {
      const bar = createProgressBar(33, 10);
      expect(bar).toBe('[###-------]');
    });
  });

  describe('getStatusIcon', () => {
    it('should return [DONE] for completed status', () => {
      expect(getStatusIcon('completed')).toBe('[DONE]');
    });

    it('should return [....] for in_progress status', () => {
      expect(getStatusIcon('in_progress')).toBe('[....]');
    });

    it('should return [    ] for not_started status', () => {
      expect(getStatusIcon('not_started')).toBe('[    ]');
    });
  });
});
