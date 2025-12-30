import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
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
  commands: ['/worktree'], // Required: config must have at least one command
  skills: ['ui-design-system-rn-zest-components'], // Using domain-skill format
};
// ============================================================================

describe('integration: skills installation', () => {
  let paths: TestPaths;

  beforeAll(async () => {
    paths = createTestProject('skills', TEST_CONFIG);
    await installTestProject(paths);
  });

  afterAll(() => {
    cleanupTestProject(paths);
  });

  it('should create skills directory', () => {
    const skillsDir = join(paths.claudeDir, 'skills');
    expect(existsSync(skillsDir)).toBe(true);
  });

  it('should install configured skill', async () => {
    // Skills are now flattened: domain/skill -> domain-skill
    const skillDir = join(paths.claudeDir, 'skills/ui-design-system-rn-zest-components');
    expect(existsSync(skillDir)).toBe(true);
  });

  it('should have SKILL.md in skill directory', async () => {
    const skillFile = join(paths.claudeDir, 'skills/ui-design-system-rn-zest-components/SKILL.md');
    expect(existsSync(skillFile)).toBe(true);
  });

  it('should have reference files in skill directory', async () => {
    const referencesDir = join(
      paths.claudeDir,
      'skills/ui-design-system-rn-zest-components/references'
    );
    expect(existsSync(referencesDir)).toBe(true);

    const referenceFiles = await readdir(referencesDir);
    expect(referenceFiles.length).toBeGreaterThan(0);
  });

  it('should match skill snapshot', async () => {
    const skillFile = join(paths.claudeDir, 'skills/ui-design-system-rn-zest-components/SKILL.md');
    const content = await readFile(skillFile, 'utf-8');
    expect(content).toMatchSnapshot('skill-ui-design-system-rn-zest-components');
  });
});
