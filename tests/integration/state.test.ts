import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  cleanupTestProject,
  createTestProject,
  installTestProject,
  type TestPaths,
} from './shared';

// ============================================================================
// TEST CONFIG - Easy to modify!
// ============================================================================
const TEST_CONFIG = {
  commands: ['/worktree'],
  subagents: ['specification/spec-writer'],
  skills: ['zest-design-system'],
};
// ============================================================================

describe('integration: installation state', () => {
  let paths: TestPaths;

  beforeAll(async () => {
    paths = createTestProject('state', TEST_CONFIG);
    await installTestProject(paths);
  });

  afterAll(() => {
    cleanupTestProject(paths);
  });

  it('should create state file', () => {
    const stateFile = join(paths.specMachineDir, 'state.json');
    expect(existsSync(stateFile)).toBe(true);
  });

  it('should have valid state structure', async () => {
    const stateFile = join(paths.specMachineDir, 'state.json');
    const content = await readFile(stateFile, 'utf-8');
    const state = JSON.parse(content);

    // Verify state structure (don't snapshot timestamps)
    expect(state).toHaveProperty('templateVersion');
    expect(state).toHaveProperty('installed_at');
    expect(state).toHaveProperty('components');
    expect(state).toHaveProperty('status');
    expect(state.status).toBe('complete');
  });

  it('should track all installed components', async () => {
    const stateFile = join(paths.specMachineDir, 'state.json');
    const content = await readFile(stateFile, 'utf-8');
    const state = JSON.parse(content);

    // Verify top-level arrays
    expect(state).toHaveProperty('commands');
    expect(state).toHaveProperty('subagents');
    expect(state).toHaveProperty('skills');

    // Verify expected components are tracked
    expect(state.commands).toContain('/worktree');
    expect(state.subagents).toContain('specification/spec-writer');
    expect(state.skills).toContain('zest-design-system');

    // Verify components structure (per-agent counts)
    expect(state.components).toHaveProperty('claude-code');
    expect(state.components['claude-code']).toHaveProperty('commands');
    expect(state.components['claude-code']).toHaveProperty('subagents');
    expect(state.components['claude-code']).toHaveProperty('skills');
  });
});
