import { describe, expect, test } from 'bun:test';
import { parsePlan, generateMatrix } from './parse-plan';

describe('parsePlan', () => {
  test('parses simple plan with incomplete tasks', () => {
    const content = `
# My Feature

## Phase 1: Setup
- [ ] Task 1
- [ ] Task 2

## Phase 2: Implementation
- [ ] Task 3
    `;

    const phases = parsePlan(content);

    expect(phases).toHaveLength(2);
    expect(phases[0]).toEqual({
      phase_number: 1,
      phase_name: 'Setup',
      has_incomplete_tasks: true,
    });
    expect(phases[1]).toEqual({
      phase_number: 2,
      phase_name: 'Implementation',
      has_incomplete_tasks: true,
    });
  });

  test('identifies completed tasks', () => {
    const content = `
## Phase 1: Setup
- [x] Task 1
- [x] Task 2

## Phase 2: Implementation
- [ ] Task 3
- [x] Task 4
    `;

    const phases = parsePlan(content);

    expect(phases[0]?.has_incomplete_tasks).toBe(false);
    expect(phases[1]?.has_incomplete_tasks).toBe(true);
  });

  test('handles phases with no tasks', () => {
    const content = `
## Phase 1: Setup

This phase has no tasks yet.

## Phase 2: Implementation
- [ ] Task 1
    `;

    const phases = parsePlan(content);

    expect(phases[0]?.has_incomplete_tasks).toBe(false);
    expect(phases[1]?.has_incomplete_tasks).toBe(true);
  });

  test('handles mixed task formats', () => {
    const content = `
## Phase 1: Setup
- [ ] Incomplete task
- [x] Complete task
- [X] Also complete
- [ ] Another incomplete
    `;

    const phases = parsePlan(content);

    expect(phases[0]?.has_incomplete_tasks).toBe(true);
  });

  test('parses phase names with special characters', () => {
    const content = `
## Phase 1: Setup (Infrastructure & Config)
- [ ] Task 1

## Phase 2: API Integration - External Services
- [ ] Task 2
    `;

    const phases = parsePlan(content);

    expect(phases[0]?.phase_name).toBe('Setup (Infrastructure & Config)');
    expect(phases[1]?.phase_name).toBe('API Integration - External Services');
  });

  test('handles indented tasks', () => {
    const content = `
## Phase 1: Setup
  - [ ] Task 1
    - [ ] Sub-task
  - [x] Task 2
    `;

    const phases = parsePlan(content);

    expect(phases[0]?.has_incomplete_tasks).toBe(true);
  });

  test('ignores non-phase headings', () => {
    const content = `
# Main Title

## Phase 1: First Phase
- [ ] Task 1

## Not a Phase
This should be ignored.

## Phase 2: Second Phase
- [ ] Task 2

### Sub-heading
Not a phase either.
    `;

    const phases = parsePlan(content);

    expect(phases).toHaveLength(2);
    expect(phases[0]?.phase_number).toBe(1);
    expect(phases[1]?.phase_number).toBe(2);
  });

  test('handles empty content', () => {
    const content = '';
    const phases = parsePlan(content);
    expect(phases).toHaveLength(0);
  });

  test('handles content with no phases', () => {
    const content = `
# Some Document

This is just regular markdown.

- [ ] A random checkbox
- [x] Another checkbox
    `;

    const phases = parsePlan(content);
    expect(phases).toHaveLength(0);
  });
});

describe('generateMatrix', () => {
  test('generates matrix for incomplete phases only', () => {
    const phases = [
      { phase_number: 1, phase_name: 'Setup', has_incomplete_tasks: false },
      { phase_number: 2, phase_name: 'Implementation', has_incomplete_tasks: true },
      { phase_number: 3, phase_name: 'Testing', has_incomplete_tasks: true },
    ];

    const matrix = JSON.parse(generateMatrix(phases));

    expect(matrix.include).toHaveLength(2);
    expect(matrix.include[0]).toEqual({
      phase_number: 2,
      phase_name: 'Implementation',
    });
    expect(matrix.include[1]).toEqual({
      phase_number: 3,
      phase_name: 'Testing',
    });
  });

  test('generates empty matrix when all phases complete', () => {
    const phases = [
      { phase_number: 1, phase_name: 'Setup', has_incomplete_tasks: false },
      { phase_number: 2, phase_name: 'Implementation', has_incomplete_tasks: false },
    ];

    const matrix = JSON.parse(generateMatrix(phases));

    expect(matrix.include).toHaveLength(0);
  });

  test('generates empty matrix for no phases', () => {
    const phases: ReturnType<typeof parsePlan> = [];

    const matrix = JSON.parse(generateMatrix(phases));

    expect(matrix.include).toHaveLength(0);
  });

  test('preserves phase order', () => {
    const phases = [
      { phase_number: 3, phase_name: 'Third', has_incomplete_tasks: true },
      { phase_number: 1, phase_name: 'First', has_incomplete_tasks: true },
      { phase_number: 2, phase_name: 'Second', has_incomplete_tasks: true },
    ];

    const matrix = JSON.parse(generateMatrix(phases));

    expect(matrix.include[0]?.phase_number).toBe(3);
    expect(matrix.include[1]?.phase_number).toBe(1);
    expect(matrix.include[2]?.phase_number).toBe(2);
  });
});

describe('integration', () => {
  test('full parse and generate workflow', () => {
    const content = `
# Add User Authentication

## Context
Adding OAuth authentication for users.

## Phase 1: Setup Infrastructure
- [x] Install passport
- [x] Configure OAuth providers

## Phase 2: Add Routes
- [ ] Create /auth/google route
- [ ] Create /auth/github route
- [ ] Add callback handlers

## Phase 3: Token Management
- [ ] Add Redis storage
- [ ] Implement refresh logic

## Phase 4: Testing
- [x] Unit tests
- [x] Integration tests
    `;

    const phases = parsePlan(content);
    const matrix = JSON.parse(generateMatrix(phases));

    expect(matrix.include).toHaveLength(2);
    expect(matrix.include).toEqual([
      { phase_number: 2, phase_name: 'Add Routes' },
      { phase_number: 3, phase_name: 'Token Management' },
    ]);
  });
});
