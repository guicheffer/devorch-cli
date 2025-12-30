/**
 * Simple utility functions to check tool usage in messages
 */

import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { formatMessage } from 'claude-pretty-printer';

export interface ToolUse {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

/**
 * Find all tool uses in a messages array
 */
export function findToolUses(messages: SDKMessage[]): ToolUse[] {
  const toolUses: ToolUse[] = [];

  for (const msg of messages) {
    if (msg.type === 'assistant' && Array.isArray(msg.message?.content)) {
      for (const content of msg.message.content) {
        if (
          typeof content === 'object' &&
          content !== null &&
          'type' in content &&
          content.type === 'tool_use'
        ) {
          toolUses.push(content as ToolUse);
        }
      }
    }
  }

  return toolUses;
}

/**
 * Find tool uses by name
 */
export function findToolUsesByName(messages: SDKMessage[], toolName: string): ToolUse[] {
  return findToolUses(messages).filter((tool) => tool.name === toolName);
}

/**
 * Check if a specific tool was called
 */
export function hasToolCall(messages: SDKMessage[], toolName: string): boolean {
  return findToolUsesByName(messages, toolName).length > 0;
}

/**
 * Conditionally log a formatted message based on VERBOSE_LOGS env var
 * Logs are ON by default. Set VERBOSE_LOGS=0 or VERBOSE_LOGS=false to disable
 */
export function maybeLogMessage(message: SDKMessage): void {
  const disabled = process.env.VERBOSE_LOGS === '0' || process.env.VERBOSE_LOGS === 'false';
  if (!disabled) {
    console.log(formatMessage(message));
  }
}
