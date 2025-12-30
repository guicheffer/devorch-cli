/**
 * Test project setup and management
 *
 * Wraps the existing project utilities to provide a fluent API for
 * setting up test projects with devorch installed.
 */

import type { Options } from '@anthropic-ai/claude-agent-sdk';
import { getClaudeCodeOptions } from '../utils/claude-code-utils.js';
import {
  cleanupTestProject as cleanupProject,
  createTestProject as createProject,
  installTestProject as installProject,
} from '../utils/project-utils.js';
import type { ProjectConfig, TestPaths } from './types.js';

/**
 * Builder for test project configuration
 */
export class ProjectBuilder {
  private config: ProjectConfig = {};
  private projectName: string;

  constructor(scenarioName: string) {
    // Add -eval suffix to distinguish from integration test projects
    this.projectName = `${scenarioName}-eval`;
  }

  /**
   * Add commands to install
   */
  withCommands(...commands: string[]): this {
    this.config.commands = [...(this.config.commands || []), ...commands];
    return this;
  }

  /**
   * Add subagents to install
   */
  withSubagents(...subagents: string[]): this {
    this.config.subagents = [...(this.config.subagents || []), ...subagents];
    return this;
  }

  /**
   * Add skills to install
   */
  withSkills(...skills: string[]): this {
    this.config.skills = [...(this.config.skills || []), ...skills];
    return this;
  }

  /**
   * Set context training
   */
  withContextTraining(contextTraining: string): this {
    this.config.contextTraining = contextTraining;
    return this;
  }

  /**
   * Clone a repository for testing
   */
  cloneRepo(repoPath: string): this {
    this.config.cloneRepo = repoPath;
    return this;
  }

  /**
   * Get the built configuration
   */
  getConfig(): ProjectConfig {
    return this.config;
  }

  /**
   * Get the project name
   */
  getProjectName(): string {
    return this.projectName;
  }

  /**
   * Build and setup the test project
   */
  async build(): Promise<TestProject> {
    const testPaths = await createProject(this.projectName, this.config);
    await installProject(testPaths);

    return new TestProject(testPaths);
  }
}

/**
 * Represents a configured test project
 */
export class TestProject {
  constructor(private paths: TestPaths) {}

  /**
   * Get test project paths
   */
  getPaths(): TestPaths {
    return this.paths;
  }

  /**
   * Get Claude Code options for this project
   */
  getClaudeCodeOptions(overrides?: Partial<Options>): Options {
    const baseOptions = getClaudeCodeOptions(this.paths);

    if (overrides) {
      return { ...baseOptions, ...overrides };
    }

    return baseOptions;
  }

  /**
   * Cleanup test project
   */
  cleanup(): void {
    cleanupProject(this.paths);
  }
}
