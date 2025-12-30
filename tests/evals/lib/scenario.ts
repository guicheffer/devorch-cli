/**
 * Main TestScenario builder
 *
 * Provides the primary fluent API for creating and executing test scenarios.
 */

import { statSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Options } from '@anthropic-ai/claude-agent-sdk';
import { FixtureManager } from './fixtures.js';
import { PhaseRunner } from './phase.js';
import { ProjectBuilder, type TestProject } from './project.js';
import { SessionManager } from './session.js';
import type { FixtureConfig, ProjectConfig } from './types.js';

/**
 * Main test scenario builder
 *
 * Example usage:
 * ```typescript
 * const scenario = TestScenario.create('my-test')
 *   .withProject({
 *     commands: ['/train-context-2'],
 *     cloneRepo: 'yourcompany/web',
 *   })
 *   .withFixture('tech-stack.md')
 *   .build();
 *
 * await scenario.phase('check-prerequisites')
 *   .query('/devorch:train-context-2')
 *   .expect(['Did we find tech-stack.md?'])
 *   .run();
 * ```
 */
export class TestScenarioBuilder {
  private scenarioName: string;
  private projectConfig?: ProjectConfig;
  private fixtures: FixtureConfig[] = [];
  private testFileDir: string;
  private optionsOverrides: Partial<Options> = {};

  constructor(scenarioName: string, testFileDir: string) {
    this.scenarioName = scenarioName;
    this.testFileDir = testFileDir;
  }

  /**
   * Configure the test project
   */
  withProject(config: ProjectConfig): this {
    this.projectConfig = config;
    return this;
  }

  /**
   * Add a single fixture
   *
   * @param filename - Target filename in devorch dir
   * @param sourcePath - Optional source path (defaults to fixtures/{filename})
   */
  withFixture(filename: string, sourcePath?: string): this {
    this.fixtures.push({ targetFilename: filename, sourcePath });
    return this;
  }

  /**
   * Add multiple fixtures at once
   */
  withFixtures(filenames: string[]): this {
    for (const filename of filenames) {
      this.withFixture(filename);
    }
    return this;
  }

  /**
   * Add a fixture with inline content
   */
  withFixtureContent(filename: string, content: string): this {
    this.fixtures.push({ targetFilename: filename, content });
    return this;
  }

  /**
   * Override Claude Code options
   */
  withOptions(overrides: Partial<Options>): this {
    this.optionsOverrides = { ...this.optionsOverrides, ...overrides };
    return this;
  }

  /**
   * Build the test scenario (async - sets up project)
   */
  async build(): Promise<TestScenario> {
    // Validate configuration
    if (!this.projectConfig) {
      throw new Error(
        `Cannot build scenario "${this.scenarioName}" without project configuration. ` +
          `Use .withProject() to configure the test project.`
      );
    }

    // Create project builder
    const projectBuilder = new ProjectBuilder(this.scenarioName);

    // Apply project configuration
    if (this.projectConfig.commands) {
      projectBuilder.withCommands(...this.projectConfig.commands);
    }
    if (this.projectConfig.subagents) {
      projectBuilder.withSubagents(...this.projectConfig.subagents);
    }
    if (this.projectConfig.skills) {
      projectBuilder.withSkills(...this.projectConfig.skills);
    }
    if (this.projectConfig.contextTraining) {
      projectBuilder.withContextTraining(this.projectConfig.contextTraining);
    }
    if (this.projectConfig.cloneRepo) {
      projectBuilder.cloneRepo(this.projectConfig.cloneRepo);
    }

    // Build project (creates and installs)
    const testProject = await projectBuilder.build();

    // Load fixtures
    if (this.fixtures.length > 0) {
      const fixtureManager = new FixtureManager(this.testFileDir, testProject.getPaths());
      await fixtureManager.loadFixtures(this.fixtures);
    }

    // Create session manager
    const sessionManager = new SessionManager(this.scenarioName);

    // Get Claude Code options
    const baseOptions = testProject.getClaudeCodeOptions(this.optionsOverrides);

    return new TestScenario(this.scenarioName, testProject, sessionManager, baseOptions);
  }
}

/**
 * Represents a configured and ready test scenario
 */
export class TestScenario {
  private testProject: TestProject;
  private sessionManager: SessionManager;
  private baseOptions: Options;
  private lastPhaseName?: string;

  constructor(
    _scenarioName: string,
    testProject: TestProject,
    sessionManager: SessionManager,
    baseOptions: Options
  ) {
    this.testProject = testProject;
    this.sessionManager = sessionManager;
    this.baseOptions = baseOptions;
  }

  /**
   * Create a new phase
   *
   * @param name - Unique name for this phase
   */
  phase(name: string): PhaseRunner {
    const runner = new PhaseRunner(name, this.sessionManager, this.baseOptions, this.lastPhaseName);

    // Track this phase as the last executed
    this.lastPhaseName = name;

    return runner;
  }

  /**
   * Get the test project
   */
  getProject(): TestProject {
    return this.testProject;
  }

  /**
   * Get the session manager
   */
  getSessionManager(): SessionManager {
    return this.sessionManager;
  }

  /**
   * Clear all checkpoints for this scenario
   */
  clearCheckpoints(): void {
    this.sessionManager.clearAllCheckpoints();
  }

  /**
   * Cleanup the test project
   */
  cleanup(): void {
    this.testProject.cleanup();
  }

  /**
   * Static factory method for creating scenarios
   *
   * @param name - Scenario name
   * @param testFilePath - Path to the test file directory (use __dirname or import.meta.url)
   */
  static create(name: string, testFilePath?: string): TestScenarioBuilder {
    // Determine test file directory
    let testFileDir: string;

    if (testFilePath) {
      // Convert file:// URL to path
      const filePath = testFilePath.startsWith('file://')
        ? new URL(testFilePath).pathname
        : testFilePath;

      // Check if it's already a directory or a file
      try {
        const stats = statSync(filePath);
        testFileDir = stats.isDirectory() ? filePath : dirname(filePath);
      } catch {
        // If stat fails, assume it's a file path and get its directory
        testFileDir = dirname(filePath);
      }
    } else {
      // Fallback: use current working directory
      testFileDir = process.cwd();
    }

    return new TestScenarioBuilder(name, testFileDir);
  }
}
