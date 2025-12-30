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

// Expected subagent dependencies for /panic command
const EXPECTED_SUBAGENTS = [
  'dev-tools/conversation-analyzer',
  'dev-tools/command-history-collector',
  'dev-tools/error-analyzer',
  'dev-tools/environment-collector',
  'dev-tools/file-context-collector',
];

describe('integration: commands installation', () => {
  let paths: TestPaths;

  beforeAll(async () => {
    paths = createTestProject('commands', { commands: ['/panic'] });
    await installTestProject(paths);
  });

  afterAll(() => {
    cleanupTestProject(paths);
  });

  it('should create commands directory', () => {
    const commandsDir = join(paths.claudeDir, 'commands/devorch');
    expect(existsSync(commandsDir)).toBe(true);
  });

  it('should create agents directory', () => {
    const agentsDir = join(paths.claudeDir, 'agents/devorch');
    expect(existsSync(agentsDir)).toBe(true);
  });

  it('should install configured command', () => {
    const commandPath = join(paths.claudeDir, 'commands/devorch/panic.md');
    expect(existsSync(commandPath)).toBe(true);
  });

  it('should auto-install all dependent subagents', () => {
    for (const subagent of EXPECTED_SUBAGENTS) {
      const category = subagent.split('/')[0];
      const name = subagent.split('/')[1];
      const subagentPath = join(paths.claudeDir, `agents/devorch/${category}/${name}.md`);
      expect(existsSync(subagentPath)).toBe(true);
    }
  });
});
