import { describe, expect, it } from 'bun:test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import fg from 'fast-glob';

/**
 * Meta-test to ensure all commands and subagents have snapshot tests
 */
describe('snapshot test coverage', () => {
  const templatesDir = join(process.cwd(), 'templates');
  const snapshotsDir = join(process.cwd(), 'tests/snapshots');

  it('should have a snapshot test for every command', async () => {
    // Find all command.md files
    const commandFiles = await fg('**/*/command.md', {
      cwd: templatesDir,
      absolute: false,
    });

    const missingTests: string[] = [];

    for (const commandFile of commandFiles) {
      // Extract command folder name (e.g., "dev-tools/panic/command.md" -> "panic")
      const parts = commandFile.split('/');
      const commandName = parts[parts.length - 2]; // Get folder name before command.md

      if (!commandName) continue;

      // Check if test file exists
      const testPath = join(snapshotsDir, 'commands', `${commandName}.test.ts`);
      if (!existsSync(testPath)) {
        missingTests.push(
          `${commandFile} (expected test: tests/snapshots/commands/${commandName}.test.ts)`
        );
      }
    }

    if (missingTests.length > 0) {
      const message = `Missing snapshot tests for ${missingTests.length} command(s):\n  - ${missingTests.join('\n  - ')}`;
      expect(missingTests).toEqual([]);
      throw new Error(message);
    }

    expect(commandFiles.length).toBeGreaterThan(0);
  });

  it('should have a snapshot test for every subagent', async () => {
    // Find all subagent .md files (excluding partials and command.md files)
    const subagentFiles = await fg('**/subagents/*.md', {
      cwd: templatesDir,
      absolute: false,
      ignore: ['**/partials/**', '**/command.md'],
    });

    const missingTests: string[] = [];

    for (const subagentFile of subagentFiles) {
      // Extract subagent name (e.g., "analysis/subagents/dependency-scanner.md" -> "dependency-scanner")
      const fileName = subagentFile.split('/').pop()?.replace('.md', '');

      if (!fileName) continue;

      // Check if test file exists
      const testPath = join(snapshotsDir, 'subagents', `${fileName}.test.ts`);
      if (!existsSync(testPath)) {
        missingTests.push(
          `${subagentFile} (expected test: tests/snapshots/subagents/${fileName}.test.ts)`
        );
      }
    }

    if (missingTests.length > 0) {
      const message = `Missing snapshot tests for ${missingTests.length} subagent(s):\n  - ${missingTests.join('\n  - ')}`;
      expect(missingTests).toEqual([]);
      throw new Error(message);
    }

    expect(subagentFiles.length).toBeGreaterThan(0);
  });

  it('should not have orphaned command snapshot tests', async () => {
    // Find all command test files
    const testFiles = await fg('*.test.ts', {
      cwd: join(snapshotsDir, 'commands'),
      absolute: false,
    });

    const orphanedTests: string[] = [];

    for (const testFile of testFiles) {
      const commandName = testFile.replace('.test.ts', '');

      // Check if corresponding command.md exists
      const commandFiles = await fg(`**/${commandName}/command.md`, {
        cwd: templatesDir,
        absolute: false,
      });

      if (commandFiles.length === 0) {
        orphanedTests.push(`tests/snapshots/commands/${testFile} (no matching template found)`);
      }
    }

    if (orphanedTests.length > 0) {
      const message = `Found ${orphanedTests.length} orphaned command test(s):\n  - ${orphanedTests.join('\n  - ')}`;
      expect(orphanedTests).toEqual([]);
      throw new Error(message);
    }

    expect(testFiles.length).toBeGreaterThan(0);
  });

  it('should not have orphaned subagent snapshot tests', async () => {
    // Find all subagent test files
    const testFiles = await fg('*.test.ts', {
      cwd: join(snapshotsDir, 'subagents'),
      absolute: false,
    });

    const orphanedTests: string[] = [];

    for (const testFile of testFiles) {
      const subagentName = testFile.replace('.test.ts', '');

      // Check if corresponding subagent .md exists
      const subagentFiles = await fg(`**/subagents/${subagentName}.md`, {
        cwd: templatesDir,
        absolute: false,
        ignore: ['**/partials/**'],
      });

      if (subagentFiles.length === 0) {
        orphanedTests.push(`tests/snapshots/subagents/${testFile} (no matching template found)`);
      }
    }

    if (orphanedTests.length > 0) {
      const message = `Found ${orphanedTests.length} orphaned subagent test(s):\n  - ${orphanedTests.join('\n  - ')}`;
      expect(orphanedTests).toEqual([]);
      throw new Error(message);
    }

    expect(testFiles.length).toBeGreaterThan(0);
  });
});
