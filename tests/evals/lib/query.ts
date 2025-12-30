/**
 * Query execution wrapper
 *
 * Wraps Claude SDK query execution with automatic message collection
 * and logging.
 */

import type { Options, SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { maybeLogMessage } from '../utils/message-utils.js';

/**
 * Execute a query and collect all messages
 *
 * @param prompt - Prompt to send to Claude
 * @param options - Claude Code options
 * @returns Array of messages from Claude
 */
export async function executeQuery(prompt: string, options: Options): Promise<SDKMessage[]> {
  const messages: SDKMessage[] = [];

  for await (const message of query({ prompt, options })) {
    maybeLogMessage(message);
    messages.push(message);
  }

  return messages;
}

/**
 * Execute a query with session resumption
 *
 * @param prompt - Prompt to send to Claude
 * @param options - Claude Code options
 * @param sessionId - Session ID to resume from
 * @param forkSession - Whether to fork the session
 * @returns Array of messages from Claude
 */
export async function executeQueryWithResume(
  prompt: string,
  options: Options,
  sessionId: string,
  forkSession: boolean = false
): Promise<SDKMessage[]> {
  const queryOptions: Options = {
    ...options,
    resume: sessionId,
    forkSession,
  };

  return executeQuery(prompt, queryOptions);
}
