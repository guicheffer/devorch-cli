import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { parse as yamlParse, stringify as yamlStringify } from 'yaml';

interface SessionCheckpoint {
  checkpointName: string;
  sessionId: string;
  messages: SDKMessage[];
  turnNumber: number;
  timestamp: number;
}

export class TestSession {
  private testName: string;
  private snapshotsDir: string;

  constructor(testName: string) {
    this.testName = testName;
    this.snapshotsDir = join(process.cwd(), 'tests/evals/snapshots', testName);
  }

  /**
   * Check if this phase already has a cached checkpoint
   */
  hasCheckpoint(checkpointName: string): boolean {
    const checkpointPath = this.getCheckpointPath(checkpointName);
    return existsSync(checkpointPath);
  }

  /**
   * Save checkpoint after phase completes
   */
  saveCheckpoint(checkpointName: string, sessionId: string, messages: SDKMessage[]): void {
    // Ensure snapshots directory exists
    if (!existsSync(this.snapshotsDir)) {
      mkdirSync(this.snapshotsDir, { recursive: true });
    }

    const checkpoint: SessionCheckpoint = {
      checkpointName,
      sessionId,
      messages,
      turnNumber: messages.length,
      timestamp: Date.now(),
    };

    const checkpointPath = this.getCheckpointPath(checkpointName);
    writeFileSync(
      checkpointPath,
      yamlStringify(checkpoint, {
        lineWidth: 0, // Don't wrap lines
        indent: 2,
        // Let YAML library choose the best format for each string
        // Simple strings: plain, Multi-line: block literal
      }),
      'utf-8'
    );

    console.log(`✓ Saved checkpoint: ${checkpointName} (session: ${sessionId})`);
  }

  /**
   * Get session ID from a checkpoint to resume from
   */
  getSessionId(checkpointName: string): string | null {
    const checkpoint = this.loadCheckpoint(checkpointName);
    return checkpoint?.sessionId ?? null;
  }

  /**
   * Load checkpoint data (for inspection/debugging)
   */
  loadCheckpoint(checkpointName: string): SessionCheckpoint | null {
    const checkpointPath = this.getCheckpointPath(checkpointName);

    if (!existsSync(checkpointPath)) {
      return null;
    }

    try {
      const data = readFileSync(checkpointPath, 'utf-8');
      return yamlParse(data) as SessionCheckpoint;
    } catch (error) {
      console.error(`Failed to load checkpoint ${checkpointName}:`, error);
      return null;
    }
  }

  /**
   * Clear all checkpoints for this test (force fresh run)
   */
  clearCheckpoints(): void {
    if (!existsSync(this.snapshotsDir)) {
      return;
    }

    const { readdirSync, unlinkSync } = require('node:fs');
    const files = readdirSync(this.snapshotsDir);

    for (const file of files) {
      if (file.endsWith('.yml')) {
        unlinkSync(join(this.snapshotsDir, file));
      }
    }

    console.log(`✓ Cleared all checkpoints for test: ${this.testName}`);
  }

  /**
   * Extract session ID from messages array
   */
  static extractSessionId(messages: SDKMessage[]): string | undefined {
    // Session ID is in the first message (system init message)
    for (const message of messages) {
      if ('session_id' in message && message.session_id) {
        return message.session_id;
      }
    }
    return undefined;
  }

  private getCheckpointPath(checkpointName: string): string {
    return join(this.snapshotsDir, `${checkpointName}.yml`);
  }
}

/**
 * Create a test session manager for the given test name
 */
export function createTestSession(testName: string): TestSession {
  return new TestSession(testName);
}
