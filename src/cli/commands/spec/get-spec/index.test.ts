import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initializeState, writeState } from '@/cli/lib/installation/state-manager.js';
import { listSpecs, setActiveSpec } from '@/cli/lib/specs/spec-manager.js';
import { getSpecCommand } from './index.js';

describe('get-spec command', () => {
  let testDir: string;
  let originalCwd: string;
  let consoleLogSpy: ReturnType<typeof spyOn>;
  let processExitSpy: ReturnType<typeof spyOn>;
  const SPECS_DIR = 'devorch/specs';

  beforeEach(() => {
    testDir = join(tmpdir(), `devorch-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    // Initialize state
    // biome-ignore lint/suspicious/noExplicitAny: Test mock config
    const state = initializeState(testDir, {} as any, 'local');
    writeState(testDir, state);

    // Mock process.cwd() to return test directory
    originalCwd = process.cwd();
    process.chdir(testDir);

    // Spy on console.log and process.exit
    consoleLogSpy = spyOn(console, 'log');
    processExitSpy = spyOn(process, 'exit').mockImplementation(((_code: number) => {
      // Don't actually exit, just record the call
      // biome-ignore lint/suspicious/noExplicitAny: Bun test mock type limitation
    }) as any);
  });

  afterEach(() => {
    // Restore original cwd
    process.chdir(originalCwd);

    // Restore spies
    consoleLogSpy.mockRestore();
    processExitSpy.mockRestore();

    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  function createSpec(folderName: string): string {
    const specPath = join(testDir, SPECS_DIR, folderName);
    mkdirSync(specPath, { recursive: true });
    writeFileSync(join(specPath, 'spec.md'), '# Test Spec');
    return specPath;
  }

  function getConsoleOutput(): string[] {
    return consoleLogSpy.mock.calls.map((call) => call[0] as string);
  }

  describe('get current spec', () => {
    it('should output NO_ACTIVE_SPEC when no spec is set', async () => {
      await getSpecCommand({});

      const output = getConsoleOutput();
      expect(output).toContain('NO_ACTIVE_SPEC=true');
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('should include newest spec info when no active spec', async () => {
      createSpec('2025-11-15-old-feature');
      createSpec('2025-11-18-new-feature');

      await getSpecCommand({});

      const output = getConsoleOutput();
      expect(output).toContain('NO_ACTIVE_SPEC=true');
      expect(output).toContain('NEWEST_SPEC=devorch/specs/2025-11-18-new-feature');
      expect(output).toContain('NEWEST_SPEC_NAME=new-feature');
      expect(output).toContain('NEWEST_SPEC_FOLDER=2025-11-18-new-feature');
      expect(output).toContain('NEWEST_SPEC_DATE=2025-11-18');
    });

    it('should output active spec info when set', async () => {
      createSpec('2025-11-18-test-feature');
      const specs = listSpecs(testDir);
      setActiveSpec(testDir, specs[0]);

      await getSpecCommand({});

      const output = getConsoleOutput();
      expect(output).toContain('CURRENT_SPEC=devorch/specs/2025-11-18-test-feature');
      expect(output).toContain('SPEC_NAME=test-feature');
      expect(output).toContain('FOLDER_NAME=2025-11-18-test-feature');
      expect(output.some((line) => line.startsWith('CREATED='))).toBe(true);
      expect(output.some((line) => line.startsWith('LAST_ACCESSED='))).toBe(true);
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('should output IS_STALE=false when active spec is newest', async () => {
      createSpec('2025-11-18-latest-feature');
      const specs = listSpecs(testDir);
      setActiveSpec(testDir, specs[0]);

      await getSpecCommand({});

      const output = getConsoleOutput();
      expect(output).toContain('IS_STALE=false');
    });

    it('should output IS_STALE=true when active spec is older', async () => {
      createSpec('2025-11-15-old-feature');
      createSpec('2025-11-18-new-feature');
      const specs = listSpecs(testDir);
      const oldSpec = specs.find((s) => s.folderName === '2025-11-15-old-feature');
      if (!oldSpec) throw new Error('Test setup failed: old spec not found');
      setActiveSpec(testDir, oldSpec);

      await getSpecCommand({});

      const output = getConsoleOutput();
      expect(output).toContain('CURRENT_SPEC=devorch/specs/2025-11-15-old-feature');
      expect(output).toContain('NEWEST_SPEC=devorch/specs/2025-11-18-new-feature');
      expect(output).toContain('IS_STALE=true');
    });

    it('should always include newest spec info with active spec', async () => {
      createSpec('2025-11-15-old-feature');
      createSpec('2025-11-18-new-feature');
      const specs = listSpecs(testDir);
      setActiveSpec(testDir, specs[0]); // Set newest as active

      await getSpecCommand({});

      const output = getConsoleOutput();
      expect(output).toContain('CURRENT_SPEC=devorch/specs/2025-11-18-new-feature');
      expect(output).toContain('NEWEST_SPEC=devorch/specs/2025-11-18-new-feature');
      expect(output).toContain('NEWEST_SPEC_NAME=new-feature');
    });
  });

  describe('set active spec', () => {
    it('should set spec by full folder name', async () => {
      createSpec('2025-11-18-user-auth');

      await getSpecCommand({ subCommand: '2025-11-18-user-auth' });

      const output = getConsoleOutput();
      expect(output).toContain('SUCCESS=true');
      expect(output).toContain('ACTIVE_SPEC=devorch/specs/2025-11-18-user-auth');
      expect(output).toContain('SPEC_NAME=user-auth');
      expect(output).toContain('FOLDER_NAME=2025-11-18-user-auth');
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('should set spec by name only (without date)', async () => {
      createSpec('2025-11-18-user-profile');

      await getSpecCommand({ subCommand: 'user-profile' });

      const output = getConsoleOutput();
      expect(output).toContain('SUCCESS=true');
      expect(output).toContain('ACTIVE_SPEC=devorch/specs/2025-11-18-user-profile');
      expect(output).toContain('SPEC_NAME=user-profile');
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('should output error when spec not found', async () => {
      createSpec('2025-11-18-existing-spec');

      await getSpecCommand({ subCommand: 'nonexistent-spec' });

      const output = getConsoleOutput();
      expect(output).toContain('ERROR=spec_not_found');
      expect(output).toContain("MESSAGE=Spec 'nonexistent-spec' not found");
      expect(output).toContain('AVAILABLE_SPECS:');
      expect(output).toContain('  - 2025-11-18-existing-spec (existing-spec)');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should output error when no specs exist', async () => {
      await getSpecCommand({ subCommand: 'any-spec' });

      const output = getConsoleOutput();
      expect(output).toContain('ERROR=no_specs_found');
      expect(output).toContain(
        'MESSAGE=No specs found. Run /gather-requirements to create a spec.'
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should list all available specs when spec not found', async () => {
      createSpec('2025-11-15-spec-a');
      createSpec('2025-11-18-spec-b');
      createSpec('2025-11-17-spec-c');

      await getSpecCommand({ subCommand: 'nonexistent' });

      const output = getConsoleOutput();
      expect(output).toContain('AVAILABLE_SPECS:');
      expect(output).toContain('  - 2025-11-15-spec-a (spec-a)');
      expect(output).toContain('  - 2025-11-18-spec-b (spec-b)');
      expect(output).toContain('  - 2025-11-17-spec-c (spec-c)');
    });

    it('should update last accessed timestamp when setting same spec', async () => {
      createSpec('2025-11-18-test-spec');

      await getSpecCommand({ subCommand: 'test-spec' });
      const firstOutput = getConsoleOutput();
      const firstAccessed = firstOutput.find((line) => line.startsWith('LAST_ACCESSED='));

      consoleLogSpy.mockClear();

      // Small delay to ensure timestamp differs
      await new Promise((resolve) => setTimeout(resolve, 10));

      await getSpecCommand({ subCommand: 'test-spec' });
      const secondOutput = getConsoleOutput();
      const secondAccessed = secondOutput.find((line) => line.startsWith('LAST_ACCESSED='));

      expect(secondAccessed).toBeDefined();
      expect(secondAccessed).not.toBe(firstAccessed);
    });
  });

  describe('error handling', () => {
    it('should handle spec not found errors', async () => {
      // This is already tested above, but ensuring error format is consistent
      await getSpecCommand({ subCommand: 'nonexistent' });

      const output = getConsoleOutput();
      expect(output).toContain('ERROR=no_specs_found');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('machine-readable output', () => {
    it('should output key=value format', async () => {
      createSpec('2025-11-18-test-spec');

      await getSpecCommand({ subCommand: 'test-spec' });

      const output = getConsoleOutput();

      // All output should be in KEY=value format
      for (const line of output) {
        expect(line).toMatch(/^[A-Z_]+=.+$/);
      }
    });

    it('should output parseable timestamps', async () => {
      createSpec('2025-11-18-test-spec');
      const specs = listSpecs(testDir);
      setActiveSpec(testDir, specs[0]);

      await getSpecCommand({});

      const output = getConsoleOutput();
      const created = output.find((line) => line.startsWith('CREATED='))?.split('=')[1];
      const lastAccessed = output.find((line) => line.startsWith('LAST_ACCESSED='))?.split('=')[1];

      expect(created).toBeDefined();
      expect(lastAccessed).toBeDefined();

      // Should be valid ISO timestamps
      if (!created || !lastAccessed) throw new Error('Timestamps not found in output');
      expect(() => new Date(created)).not.toThrow();
      expect(() => new Date(lastAccessed)).not.toThrow();
    });
  });
});
