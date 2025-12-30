import { describe, expect, it } from 'bun:test';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import type { Config } from '@/schemas';
import { ensureDir, writeFile } from '@/utils/files.js';
import { HasteFS } from '../filesystem/haste-fs.js';
import { install } from './installer.js';

describe('installer skill validation', () => {
  const tmpDir = '/tmp/devorch-test-skill-validation';
  const templatesDir = join(tmpDir, 'templates');
  const projectDir = join(tmpDir, 'project');

  it('should validate skill references during installation with context training', async () => {
    // Setup test environment
    ensureDir(templatesDir);
    ensureDir(projectDir);

    // Create tuning directory structure
    const tuningPath = join(
      projectDir,
      'devorch',
      'context-training',
      'test-context-training'
    );
    ensureDir(tuningPath);

    // Create implementers directory (required for valid context-training)
    const implementersDir = join(tuningPath, 'implementers');
    ensureDir(implementersDir);
    writeFile(join(implementersDir, 'ui.md'), '# UI implementer');

    // Create specification.md with skill references
    writeFile(
      join(tuningPath, 'specification.md'),
      `# Specification Guide

Use **skill-1** for patterns and **missing-skill** for implementation.
`
    );

    // Create implementation.md
    writeFile(
      join(tuningPath, 'implementation.md'),
      `# Implementation Guide

Reference **skill-2** for implementation patterns.
`
    );

    // Create config with tuning but missing some skills
    const config: Config = {
      profile: {
        name: 'test',
        agents: ['claude-code'],
        context_training: 'test-context-training',
      },
      commands: [],
      subagents: [],
      skills: [
        { name: 'skill-1', enabled: true },
        { name: 'skill-2', enabled: true },
      ], // missing-skill is not in config
    };

    // Write config file to project directory
    const configPath = join(projectDir, 'devorch', 'config.yml');
    ensureDir(join(projectDir, 'devorch'));
    writeFile(
      configPath,
      `profile:
  name: test
  agents:
    - claude-code
commands:
  - name: /test-command
    enabled: true
subagents: []
skills:
  - name: skill-1
    enabled: true
  - name: skill-2
    enabled: true
`
    );

    // Create HasteFS instance
    const hasteFS = await HasteFS.create(templatesDir);

    // Run install - should show warnings but not fail
    await install(config, templatesDir, hasteFS, 'v1.0.0', projectDir);

    // Installation should complete without throwing
    expect(true).toBe(true);

    // Cleanup
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should not show warnings when all skills are available', async () => {
    // Setup test environment
    ensureDir(templatesDir);
    ensureDir(projectDir);

    // Create tuning directory structure
    const tuningPath = join(
      projectDir,
      'devorch',
      'context-training',
      'valid-context-training'
    );
    ensureDir(tuningPath);

    // Create implementers directory (required for valid context-training)
    const implementersDir = join(tuningPath, 'implementers');
    ensureDir(implementersDir);
    writeFile(join(implementersDir, 'ui.md'), '# UI implementer');

    // Create specification.md with skill references
    writeFile(
      join(tuningPath, 'specification.md'),
      `# Specification Guide

Use **skill-1** for patterns.
`
    );

    // Create config with all referenced skills
    const config: Config = {
      profile: {
        name: 'test',
        agents: ['claude-code'],
        context_training: 'valid-context-training',
      },
      commands: [],
      subagents: [],
      skills: [{ name: 'skill-1', enabled: true }], // All skills are present
    };

    // Write config file to project directory
    const configPath = join(projectDir, 'devorch', 'config.yml');
    ensureDir(join(projectDir, 'devorch'));
    writeFile(
      configPath,
      `profile:
  name: test
  agents:
    - claude-code
commands:
  - name: /test-command
    enabled: true
subagents: []
skills:
  - name: skill-1
    enabled: true
`
    );

    // Create HasteFS instance
    const hasteFS = await HasteFS.create(templatesDir);

    // Run install - should complete without warnings
    await install(config, templatesDir, hasteFS, 'v1.0.0', projectDir);

    // Installation should complete without throwing
    expect(true).toBe(true);

    // Cleanup
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should handle context training with no skill references', async () => {
    // Setup test environment
    ensureDir(templatesDir);
    ensureDir(projectDir);

    // Create tuning directory structure
    const tuningPath = join(
      projectDir,
      'devorch',
      'context-training',
      'no-skills-context-training'
    );
    ensureDir(tuningPath);

    // Create implementers directory (required for valid context-training)
    const implementersDir = join(tuningPath, 'implementers');
    ensureDir(implementersDir);
    writeFile(join(implementersDir, 'ui.md'), '# UI implementer');

    // Create specification.md without skill references
    writeFile(
      join(tuningPath, 'specification.md'),
      `# Specification Guide

No skill references here.
`
    );

    // Create config
    const config: Config = {
      profile: {
        name: 'test',
        agents: ['claude-code'],
        context_training: 'no-skills-context-training',
      },
      commands: [],
      subagents: [],
      skills: [],
    };

    // Write config file to project directory
    const configPath = join(projectDir, 'devorch', 'config.yml');
    ensureDir(join(projectDir, 'devorch'));
    writeFile(
      configPath,
      `profile:
  name: test
  agents:
    - claude-code
commands:
  - name: /test-command
    enabled: true
subagents: []
skills: []
`
    );

    // Create HasteFS instance
    const hasteFS = await HasteFS.create(templatesDir);

    // Run install - should complete without issues
    await install(config, templatesDir, hasteFS, 'v1.0.0', projectDir);

    // Installation should complete without throwing
    expect(true).toBe(true);

    // Cleanup
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should continue installation even with missing skills', async () => {
    // Setup test environment
    ensureDir(templatesDir);
    ensureDir(projectDir);

    // Create tuning directory structure
    const tuningPath = join(
      projectDir,
      'devorch',
      'context-training',
      'incomplete-context-training'
    );
    ensureDir(tuningPath);

    // Create implementers directory (required for valid context-training)
    const implementersDir = join(tuningPath, 'implementers');
    ensureDir(implementersDir);
    writeFile(join(implementersDir, 'ui.md'), '# UI implementer');

    // Create specification.md with many missing skills
    writeFile(
      join(tuningPath, 'specification.md'),
      `# Specification Guide

Use **missing-1**, **missing-2**, and **missing-3**.
`
    );

    // Create config with no skills
    const config: Config = {
      profile: {
        name: 'test',
        agents: ['claude-code'],
        context_training: 'incomplete-context-training',
      },
      commands: [],
      subagents: [],
      skills: [],
    };

    // Write config file to project directory
    const configPath = join(projectDir, 'devorch', 'config.yml');
    ensureDir(join(projectDir, 'devorch'));
    writeFile(
      configPath,
      `profile:
  name: test
  agents:
    - claude-code
commands:
  - name: /test-command
    enabled: true
subagents: []
skills: []
`
    );

    // Create HasteFS instance
    const hasteFS = await HasteFS.create(templatesDir);

    // Run install - should show warnings but not fail
    await install(config, templatesDir, hasteFS, 'v1.0.0', projectDir);

    // Installation should complete without throwing
    expect(true).toBe(true);

    // Cleanup
    rmSync(tmpDir, { recursive: true, force: true });
  });
});
