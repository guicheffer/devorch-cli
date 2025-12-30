/**
 * Validation helpers
 *
 * Wraps the askQuestion utility for question-based validation of Claude's output.
 */

import type { Options, SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { getRawText } from 'claude-pretty-printer';
import { askQuestion } from '../utils/structured-extraction.js';
import type { ValidationResult } from './types.js';

/**
 * Validate Claude's output by asking questions
 *
 * @param messages - Messages to validate
 * @param questions - Questions to ask
 * @param options - Claude Code options
 * @returns Validation results
 */
export async function validateMessages(
  messages: SDKMessage[],
  questions: string[],
  options: Options
): Promise<ValidationResult[]> {
  // Convert messages to text
  const text = messages.map(getRawText).join('\n');

  // Ask questions using structured extraction
  const results = await askQuestion(text, questions, options);

  // Convert to ValidationResult format
  return results.map((result, index) => ({
    question: questions[index],
    success: result.success ?? false,
    answer: result.reason ?? undefined,
    reasoning: result.reason ?? undefined,
  }));
}

/**
 * Check if all validations passed
 *
 * @param results - Validation results
 * @returns True if all validations passed
 */
export function allValidationsPassed(results: ValidationResult[]): boolean {
  return results.every((result) => result.success);
}

/**
 * Get failed validations
 *
 * @param results - Validation results
 * @returns Array of failed validations
 */
export function getFailedValidations(results: ValidationResult[]): ValidationResult[] {
  return results.filter((result) => !result.success);
}

/**
 * Format validation results for display
 *
 * @param results - Validation results
 * @returns Formatted string
 */
export function formatValidationResults(results: ValidationResult[]): string {
  const lines: string[] = [];

  for (const result of results) {
    const status = result.success ? '✓' : '✗';
    lines.push(`${status} ${result.question}`);

    if (result.answer) {
      lines.push(`  Answer: ${result.answer}`);
    }

    if (result.reasoning) {
      lines.push(`  Reasoning: ${result.reasoning}`);
    }
  }

  return lines.join('\n');
}
