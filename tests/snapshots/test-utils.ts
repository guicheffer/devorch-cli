import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  cleanupTestProject,
  createTestProject,
  installTestProject,
  type TestPaths,
} from '../integration/shared';

/**
 * Create a snapshot test for a command
 * @param commandName - The command name (e.g., 'panic' or 'train-context')
 * @param slashCommandName - The slash command name to install (e.g., '/panic' or '/train-context-2')
 */
export function createCommandSnapshotTest(commandName: string, slashCommandName: string) {
  describe(`command snapshot: ${slashCommandName}`, () => {
    let paths: TestPaths;

    beforeAll(async () => {
      paths = createTestProject(`${commandName}-snapshot`, {
        commands: [slashCommandName],
      });
      await installTestProject(paths);
    });

    afterAll(() => {
      cleanupTestProject(paths);
    });

    it(`should install ${commandName} command`, () => {
      const commandPath = join(paths.claudeDir, `commands/devorch/${commandName}.md`);
      expect(existsSync(commandPath)).toBe(true);
    });

    it('should match snapshot', async () => {
      const commandPath = join(paths.claudeDir, `commands/devorch/${commandName}.md`);
      const content = await readFile(commandPath, 'utf-8');
      expect(content).toMatchSnapshot();
    });
  });
}

/**
 * Create a snapshot test for a subagent
 * @param category - The category (e.g., 'analysis', 'specification')
 * @param name - The subagent name (e.g., 'dependency-scanner', 'spec-writer')
 */
export function createSubagentSnapshotTest(category: string, name: string) {
  describe(`subagent snapshot: ${category}/${name}`, () => {
    let paths: TestPaths;

    beforeAll(async () => {
      paths = createTestProject(`${name}-snapshot`, {
        commands: ['/worktree'], // Need at least one command for installation
        subagents: [`${category}/${name}`],
      });
      await installTestProject(paths);
    });

    afterAll(() => {
      cleanupTestProject(paths);
    });

    it(`should install ${name} subagent`, () => {
      const subagentPath = join(paths.claudeDir, `agents/devorch/${category}/${name}.md`);
      expect(existsSync(subagentPath)).toBe(true);
    });

    it('should match snapshot', async () => {
      const subagentPath = join(paths.claudeDir, `agents/devorch/${category}/${name}.md`);
      const content = await readFile(subagentPath, 'utf-8');
      expect(content).toMatchSnapshot();
    });
  });
}
