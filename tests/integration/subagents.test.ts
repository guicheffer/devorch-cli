import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  cleanupTestProject,
  createTestProject,
  installTestProject,
  type TestPaths,
} from './shared';

// ============================================================================
// NOTE: Individual snapshot tests for each command and subagent are in:
//   - tests/snapshots/commands/*.test.ts (9 command tests)
//   - tests/snapshots/subagents/*.test.ts (22 subagent tests)
// This file tests the basic installation behavior.
// ============================================================================

describe('integration: subagents installation', () => {
  let paths: TestPaths;

  beforeAll(async () => {
    paths = createTestProject('subagents', {
      commands: ['/worktree'], // Required: config must have at least one command
      subagents: ['specification/spec-writer'],
    });
    await installTestProject(paths);
  });

  afterAll(() => {
    cleanupTestProject(paths);
  });

  it('should create subagents directory', () => {
    const agentsDir = join(paths.claudeDir, 'agents/devorch');
    expect(existsSync(agentsDir)).toBe(true);
  });

  it('should install configured subagent', () => {
    const subagentPath = join(paths.claudeDir, 'agents/devorch/specification/spec-writer.md');
    expect(existsSync(subagentPath)).toBe(true);
  });
});
