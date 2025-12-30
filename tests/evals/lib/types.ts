/**
 * Core types for the eval-test-builder library
 *
 * This library provides a fluent API for writing eval tests with automatic
 * checkpoint management, fixture loading, and validation.
 */

import type { Options, SDKMessage } from '@anthropic-ai/claude-agent-sdk';

/**
 * Configuration for creating a test scenario
 */
export interface ScenarioConfig {
  /** Unique name for this test scenario */
  name: string;
  /** Project configuration */
  project: ProjectConfig;
  /** Fixtures to load */
  fixtures?: FixtureConfig[];
  /** Claude Code options overrides */
  optionsOverrides?: Partial<Options>;
}

/**
 * Configuration for test project setup
 */
export interface ProjectConfig {
  /** Commands to install */
  commands?: string[];
  /** Subagents to install */
  subagents?: string[];
  /** Skills to install */
  skills?: string[];
  /** Context training to use */
  contextTraining?: string;
  /** Repository to clone for testing */
  cloneRepo?: string;
}

/**
 * Test project paths
 */
export interface TestPaths {
  projectDir: string;
  claudeDir: string;
  specMachineDir: string;
  configPath: string;
}

/**
 * Fixture configuration
 */
export interface FixtureConfig {
  /** Target filename in devorch dir */
  targetFilename: string;
  /** Source path (relative to test file or absolute) */
  sourcePath?: string;
  /** Content to write (alternative to sourcePath) */
  content?: string;
}

/**
 * Phase execution result
 */
export interface PhaseResult {
  /** Phase name */
  phaseName: string;
  /** Session ID */
  sessionId: string;
  /** Messages from Claude */
  messages: SDKMessage[];
  /** Validation results (if validation was performed) */
  validationResults?: ValidationResult[];
  /** Whether phase was skipped (checkpoint existed) */
  skipped: boolean;
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Question that was asked */
  question: string;
  /** Whether validation passed */
  success: boolean;
  /** Answer from Claude */
  answer?: string;
  /** Reasoning (if available) */
  reasoning?: string;
}

/**
 * Session checkpoint data
 */
export interface SessionCheckpoint {
  sessionId: string;
  messages: SDKMessage[];
  timestamp: number;
}

/**
 * Query configuration
 */
export interface QueryConfig {
  /** Prompt to send */
  prompt: string;
  /** Whether to resume from previous phase */
  resume?: boolean;
  /** Whether to fork the session */
  forkSession?: boolean;
  /** Options overrides */
  optionsOverrides?: Partial<Options>;
}

/**
 * Fork branch configuration for testing different paths
 */
export interface ForkBranch {
  /** Response to send */
  respond: string;
  /** Questions to validate */
  validate?: string[];
  /** Custom name for this branch */
  branchName?: string;
}
