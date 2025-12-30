/**
 * Automatic session and checkpoint management
 *
 * Wraps the existing TestSession utilities to provide automatic checkpoint
 * management based on phase names.
 */

import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { TestSession as BaseTestSession, createTestSession } from '../utils/session-utils.js';
import type { SessionCheckpoint } from './types.js';

/**
 * Manages test session with automatic checkpointing
 *
 * This class wraps the existing TestSession utilities and provides
 * automatic checkpoint management based on phase names.
 */
export class SessionManager {
  private session: ReturnType<typeof createTestSession>;
  private scenarioName: string;

  constructor(scenarioName: string) {
    this.scenarioName = scenarioName;
    this.session = createTestSession(scenarioName);
  }

  /**
   * Check if a phase has been completed (checkpoint exists)
   */
  hasPhaseCheckpoint(phaseName: string): boolean {
    return this.session.hasCheckpoint(phaseName);
  }

  /**
   * Save checkpoint for a phase
   */
  savePhaseCheckpoint(phaseName: string, sessionId: string, messages: SDKMessage[]): void {
    this.session.saveCheckpoint(phaseName, sessionId, messages);
  }

  /**
   * Get session ID from a previous phase
   */
  getPhaseSessionId(phaseName: string): string | null {
    return this.session.getSessionId(phaseName);
  }

  /**
   * Load checkpoint data for a phase
   */
  loadPhaseCheckpoint(phaseName: string): SessionCheckpoint | null {
    const checkpoint = this.session.loadCheckpoint(phaseName);
    if (!checkpoint) return null;

    return {
      sessionId: checkpoint.sessionId,
      messages: checkpoint.messages,
      timestamp: checkpoint.timestamp,
    };
  }

  /**
   * Extract session ID from messages
   */
  extractSessionId(messages: SDKMessage[]): string | undefined {
    return BaseTestSession.extractSessionId(messages);
  }

  /**
   * Validate that session ID was extracted successfully
   * @throws Error if session ID is missing
   */
  validateSessionId(sessionId: string | undefined, phaseName: string): asserts sessionId is string {
    if (!sessionId) {
      throw new Error(
        `Failed to extract session ID from messages in phase "${phaseName}". ` +
          `This usually indicates a problem with the Claude SDK interaction.`
      );
    }
  }

  /**
   * Clear all checkpoints for this scenario
   */
  clearAllCheckpoints(): void {
    this.session.clearCheckpoints();
  }

  /**
   * Get scenario name
   */
  getScenarioName(): string {
    return this.scenarioName;
  }
}
