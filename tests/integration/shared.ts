import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { $ } from 'bun';

export interface TestConfig {
  commands?: string[];
  subagents?: string[];
  skills?: string[];
}

export interface TestPaths {
  projectDir: string;
  claudeDir: string;
  specMachineDir: string;
  configPath: string;
}

/**
 * Creates an ephemeral test project with a custom config
 */
export function createTestProject(testName: string, config: TestConfig): TestPaths {
  // Create temporary directory
  const projectDir = join(tmpdir(), `devorch-test-${testName}-${Date.now()}`);
  mkdirSync(projectDir, { recursive: true });

  // Create config file
  const configPath = join(projectDir, 'devorch.config.yml');
  const configContent = `profile:
  name: ${testName}
  description: Test project for ${testName}
  version: local
  agents:
    - claude-code
commands:${config.commands?.length ? `\n${config.commands.map((c) => `  - name: ${c}\n    enabled: true`).join('\n')}` : ' []'}
subagents:${config.subagents?.length ? `\n${config.subagents.map((s) => `  - name: ${s}\n    enabled: true`).join('\n')}` : ' []'}
skills:${config.skills?.length ? `\n${config.skills.map((s) => `  - name: ${s}\n    enabled: true`).join('\n')}` : ' []'}
`;

  writeFileSync(configPath, configContent, 'utf-8');

  return {
    projectDir,
    claudeDir: join(projectDir, '.claude'),
    specMachineDir: join(projectDir, 'devorch', '.state'),
    configPath,
  };
}

/**
 * Runs installation for a test project
 */
export async function installTestProject(paths: TestPaths) {
  // Find project root (where package.json is)
  const projectRoot = join(import.meta.dir, '..', '..');
  await $`bun ${join(projectRoot, 'src/cli/index.ts')} install --local=${projectRoot} --quiet`
    .cwd(paths.projectDir)
    .quiet();
}

/**
 * Cleans up a test project
 */
export function cleanupTestProject(paths: TestPaths) {
  if (existsSync(paths.projectDir)) {
    rmSync(paths.projectDir, { recursive: true, force: true });
  }
}
