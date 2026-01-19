import { describe, expect, it } from 'bun:test';
import { analyzePlan, countCriteria } from '@/cli/lib/harness/plan.js';

describe('lib/harness/plan', () => {
  describe('analyzePlan', () => {
    it('should detect completed status', () => {
      const content = `# Plan
## COMPLETED
Some content`;
      const analysis = analyzePlan(content);
      expect(analysis.isCompleted).toBe(true);
    });

    it('should detect not completed status', () => {
      const content = `# Plan
## Status: IN_PROGRESS
Some content`;
      const analysis = analyzePlan(content);
      expect(analysis.isCompleted).toBe(false);
    });

    it('should extract status line', () => {
      const content = `# Plan
## Status: IN_PROGRESS
Some content`;
      const analysis = analyzePlan(content);
      expect(analysis.statusLine).toBe('IN_PROGRESS');
    });

    it('should parse tasks', () => {
      const content = `# Plan
## Status: IN_PROGRESS

### Task 1: First task
**Acceptance Criteria:**
- [ ] Do something
- [x] Do another thing

### Task 2: Second task
**Acceptance Criteria:**
- [ ] Third thing
`;
      const analysis = analyzePlan(content);
      expect(analysis.tasks).toHaveLength(2);
      expect(analysis.tasks[0].name).toBe('First task');
      expect(analysis.tasks[1].name).toBe('Second task');
    });

    it('should parse acceptance criteria checkboxes', () => {
      const content = `### Task 1: Test task
- [ ] Unchecked
- [x] Checked lowercase
- [X] Checked uppercase
`;
      const analysis = analyzePlan(content);
      expect(analysis.tasks[0].criteria).toHaveLength(3);
      expect(analysis.tasks[0].criteria[0].checked).toBe(false);
      expect(analysis.tasks[0].criteria[0].text).toBe('Unchecked');
      expect(analysis.tasks[0].criteria[1].checked).toBe(true);
      expect(analysis.tasks[0].criteria[2].checked).toBe(true);
    });

    it('should handle empty plan', () => {
      const content = `# Plan
Nothing here`;
      const analysis = analyzePlan(content);
      expect(analysis.tasks).toHaveLength(0);
      expect(analysis.isCompleted).toBe(false);
      expect(analysis.statusLine).toBeNull();
    });

    it('should handle task with colon separator', () => {
      const content = `### Task 1: My task name
- [ ] Criterion`;
      const analysis = analyzePlan(content);
      expect(analysis.tasks[0].name).toBe('My task name');
    });

    it('should handle task with period separator', () => {
      const content = `### Task 1. My task name
- [ ] Criterion`;
      const analysis = analyzePlan(content);
      expect(analysis.tasks[0].name).toBe('My task name');
    });
  });

  describe('countCriteria', () => {
    it('should count total and completed criteria', () => {
      const analysis = {
        isCompleted: false,
        statusLine: null,
        tasks: [
          {
            name: 'Task 1',
            criteria: [
              { text: 'A', checked: true },
              { text: 'B', checked: false },
            ],
          },
          {
            name: 'Task 2',
            criteria: [
              { text: 'C', checked: true },
              { text: 'D', checked: true },
              { text: 'E', checked: false },
            ],
          },
        ],
      };
      const { total, completed } = countCriteria(analysis);
      expect(total).toBe(5);
      expect(completed).toBe(3);
    });

    it('should handle empty tasks', () => {
      const analysis = {
        isCompleted: false,
        statusLine: null,
        tasks: [],
      };
      const { total, completed } = countCriteria(analysis);
      expect(total).toBe(0);
      expect(completed).toBe(0);
    });
  });
});
