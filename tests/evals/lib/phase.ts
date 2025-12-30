/**
 * Phase runner with fluent API
 *
 * Provides a fluent API for defining and executing test phases with
 * automatic checkpoint management.
 */

import type { Options, SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { executeQuery, executeQueryWithResume } from './query.js';
import type { SessionManager } from './session.js';
import type { ForkBranch, PhaseResult, ValidationResult } from './types.js';
import { allValidationsPassed, getFailedValidations, validateMessages } from './validation.js';

/**
 * Phase runner for executing test phases
 */
export class PhaseRunner {
  private phaseName: string;
  private sessionManager: SessionManager;
  private baseOptions: Options;
  private previousPhase?: string;
  private promptToSend?: string;
  private shouldResume: boolean = false;
  private shouldFork: boolean = false;
  private questionsToValidate: string[] = [];
  private optionsOverrides: Partial<Options> = {};

  constructor(
    phaseName: string,
    sessionManager: SessionManager,
    baseOptions: Options,
    previousPhase?: string
  ) {
    this.phaseName = phaseName;
    this.sessionManager = sessionManager;
    this.baseOptions = baseOptions;
    this.previousPhase = previousPhase;
  }

  /**
   * Send a query to Claude
   */
  query(prompt: string): this {
    this.promptToSend = prompt;
    this.shouldResume = false;
    return this;
  }

  /**
   * Respond to Claude (resume from previous phase)
   */
  respond(response: string): this {
    this.promptToSend = response;
    this.shouldResume = true;
    return this;
  }

  /**
   * Resume from previous phase without sending a prompt
   * Useful for continuing a conversation
   */
  resume(): this {
    this.shouldResume = true;
    return this;
  }

  /**
   * Fork the session for testing different paths
   */
  fork(enabled: boolean = true): this {
    this.shouldFork = enabled;
    return this;
  }

  /**
   * Add validation questions
   */
  expect(questions: string[]): this {
    this.questionsToValidate.push(...questions);
    return this;
  }

  /**
   * Override options for this phase
   */
  withOptions(overrides: Partial<Options>): this {
    this.optionsOverrides = { ...this.optionsOverrides, ...overrides };
    return this;
  }

  /**
   * Execute the phase
   */
  async run(): Promise<PhaseResult> {
    // Check if checkpoint exists
    if (this.sessionManager.hasPhaseCheckpoint(this.phaseName)) {
      console.log(`✓ Skipping phase "${this.phaseName}" - checkpoint exists`);

      const checkpoint = this.sessionManager.loadPhaseCheckpoint(this.phaseName);
      if (!checkpoint) {
        throw new Error(`Failed to load checkpoint for phase "${this.phaseName}"`);
      }

      return {
        phaseName: this.phaseName,
        sessionId: checkpoint.sessionId,
        messages: checkpoint.messages,
        skipped: true,
      };
    }

    console.log(`Running phase: ${this.phaseName}`);

    // Build options
    const options: Options = {
      ...this.baseOptions,
      ...this.optionsOverrides,
    };

    // Execute query
    const messages = await this.executePhase(options);

    // Extract and validate session ID
    const sessionId = this.sessionManager.extractSessionId(messages);
    this.sessionManager.validateSessionId(sessionId, this.phaseName);

    // Save checkpoint
    this.sessionManager.savePhaseCheckpoint(this.phaseName, sessionId, messages);

    // Validate if questions provided
    let validationResults: ValidationResult[] | undefined;
    if (this.questionsToValidate.length > 0) {
      validationResults = await validateMessages(messages, this.questionsToValidate, options);

      // Check if all validations passed
      if (!allValidationsPassed(validationResults)) {
        const failed = getFailedValidations(validationResults);
        throw new Error(
          `Validation failed in phase "${this.phaseName}":\n` +
            failed.map((f) => `  ✗ ${f.question}`).join('\n')
        );
      }
    }

    return {
      phaseName: this.phaseName,
      sessionId,
      messages,
      validationResults,
      skipped: false,
    };
  }

  /**
   * Execute multiple fork branches in parallel
   */
  async runForks(branches: ForkBranch[]): Promise<PhaseResult[]> {
    // Get the previous session ID
    const previousSessionId = this.previousPhase
      ? this.sessionManager.getPhaseSessionId(this.previousPhase)
      : null;

    if (!previousSessionId) {
      throw new Error(
        `Cannot fork phase "${this.phaseName}" - no previous phase session found. ` +
          `Make sure a previous phase has been executed before forking.`
      );
    }

    // Execute all branches in parallel
    const results = await Promise.all(
      branches.map((branch, index) => this.executeBranch(branch, index, previousSessionId))
    );

    return results;
  }

  /**
   * Execute a single fork branch
   */
  private async executeBranch(
    branch: ForkBranch,
    branchIndex: number,
    previousSessionId: string
  ): Promise<PhaseResult> {
    const branchName = branch.branchName || `${this.phaseName}-branch-${branchIndex}`;
    const checkpointName = `${this.phaseName}-fork-${branchIndex}`;

    // Check if checkpoint exists
    if (this.sessionManager.hasPhaseCheckpoint(checkpointName)) {
      console.log(`✓ Skipping branch "${branchName}" - checkpoint exists`);

      const checkpoint = this.sessionManager.loadPhaseCheckpoint(checkpointName);
      if (!checkpoint) {
        throw new Error(`Failed to load checkpoint for branch "${branchName}"`);
      }

      return {
        phaseName: branchName,
        sessionId: checkpoint.sessionId,
        messages: checkpoint.messages,
        skipped: true,
      };
    }

    console.log(`Running fork branch: ${branchName}`);

    // Build options with fork enabled
    const options: Options = {
      ...this.baseOptions,
      ...this.optionsOverrides,
    };

    // Execute query with session resumption and fork
    const messages = await executeQueryWithResume(
      branch.respond,
      options,
      previousSessionId,
      true // forkSession
    );

    // Extract and validate session ID
    const sessionId = this.sessionManager.extractSessionId(messages);
    this.sessionManager.validateSessionId(sessionId, branchName);

    // Save checkpoint
    this.sessionManager.savePhaseCheckpoint(checkpointName, sessionId, messages);

    // Validate if questions provided
    let validationResults: ValidationResult[] | undefined;
    if (branch.validate && branch.validate.length > 0) {
      validationResults = await validateMessages(messages, branch.validate, options);

      if (!allValidationsPassed(validationResults)) {
        const failed = getFailedValidations(validationResults);
        throw new Error(
          `Validation failed in branch "${branchName}":\n` +
            failed.map((f) => `  ✗ ${f.question}`).join('\n')
        );
      }
    }

    return {
      phaseName: branchName,
      sessionId,
      messages,
      validationResults,
      skipped: false,
    };
  }

  /**
   * Execute the phase query
   */
  private async executePhase(options: Options): Promise<SDKMessage[]> {
    // Determine if we should resume from previous phase
    if (this.shouldResume) {
      const previousSessionId = this.previousPhase
        ? this.sessionManager.getPhaseSessionId(this.previousPhase)
        : null;

      if (!previousSessionId) {
        throw new Error(
          `Cannot resume in phase "${this.phaseName}" - no previous phase session found. ` +
            `Make sure a previous phase has been executed before resuming.`
        );
      }

      // If we have a prompt to send, use it; otherwise send empty string to continue
      const prompt = this.promptToSend || '';
      return executeQueryWithResume(prompt, options, previousSessionId, this.shouldFork);
    }

    // Fresh query
    if (!this.promptToSend) {
      throw new Error(
        `No prompt provided for phase "${this.phaseName}". ` +
          `Use .query(prompt) or .respond(response) to provide a prompt.`
      );
    }

    return executeQuery(this.promptToSend, options);
  }
}
