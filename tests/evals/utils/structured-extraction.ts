/**
 * Simple utility to ask questions about text and get structured answers
 */

import {
  createSdkMcpServer,
  type Options,
  query,
  type SDKMessage,
  tool,
} from '@anthropic-ai/claude-agent-sdk';
import { formatMessage, getRawText } from 'claude-pretty-printer';
import { z } from 'zod';

/**
 * Result of asking a question
 */
export interface QuestionResult {
  success?: boolean;
  reason?: string;
}

/**
 * Pretty print question results
 */
export function printResults(results: QuestionResult[], questions: string[]): void {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊  Question Results');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  results.forEach((result, i) => {
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon}  Q${i + 1}: ${questions[i]}`);
    if (result.reason) {
      console.log(`    → ${result.reason}`);
    }
    console.log();
  });

  const passCount = results.filter((r) => r.success).length;
  const failCount = results.length - passCount;

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (failCount === 0) {
    console.log(`✅  All ${passCount} questions passed!`);
  } else {
    console.log(`❌  ${failCount} failed, ${passCount} passed`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

/**
 * Get failures from results
 */
export function getFailures(results: QuestionResult[], questions: string[]): QuestionResult[] {
  return results
    .map((r, i) => ({ index: i, question: questions[i], ...r }))
    .filter((r) => !r.success);
}

const QuestionResultItemSchema = z.object({
  success: z.boolean().describe('Whether the answer is yes/true'),
  reason: z.string().nullable().describe('Explanation or reason for the answer'),
});

const QuestionSchema = {
  answers: z
    .array(QuestionResultItemSchema)
    .describe('Array of answers, one for each question in order'),
};

/**
 * Tool for answering questions
 */
const answerQuestionsTool = tool(
  'answer_questions',
  'Answers yes/no questions about the provided text. Provide one answer per question in the same order.',
  QuestionSchema,
  async (args) => {
    return { content: [{ type: 'text', text: JSON.stringify(args) }] };
  }
);

/**
 * Create MCP server
 */
const questionMcpServer = createSdkMcpServer({
  name: 'question_answerer',
  tools: [answerQuestionsTool],
});

/**
 * Ask yes/no question(s) about some text and get structured answers
 *
 * @example
 * const results = await askQuestion(
 *   someText,
 *   ['Did it create a directory?', 'Did it delete a file?']
 * );
 * // => [
 * //   { success: true, reason: "Yes, mkdir command created a directory" },
 * //   { success: false, reason: "No, no file deletion occurred" }
 * // ]
 */
export async function askQuestion(
  text: string | SDKMessage[],
  questions: string[],
  options: Options
): Promise<QuestionResult[]> {
  try {
    const toolName = 'mcp__question_answerer__answer_questions';

    // Create prompt
    const numberedQuestions = questions.map((q, i) => `${i + 1}. ${q}`).join('\n');
    const prompt = `Here is some text:

<text>
${typeof text === 'string' ? text : text.map(getRawText).join('\n')}
</text>

Questions (answer each one separately in order):
${numberedQuestions}

Answer all questions using the answer_questions tool. Provide one answer per question in the same order.`;

    // Query with the MCP server
    const messages: SDKMessage[] = [];
    for await (const msg of query({
      prompt,
      options: {
        ...options,
        mcpServers: {
          question_answerer: questionMcpServer,
        },
      },
    })) {
      console.log(formatMessage(msg));
      messages.push(msg);
    }

    // Find the assistant message that contains the tool use
    // Note: MCP prefixes tool names with server name
    const assistantMsg = messages.find(
      (msg) =>
        msg.type === 'assistant' &&
        'message' in msg &&
        msg.message?.content &&
        Array.isArray(msg.message.content) &&
        msg.message.content.some((block) => block.type === 'tool_use' && block.name === toolName)
    );

    if (!assistantMsg || !('message' in assistantMsg) || !assistantMsg.message?.content) {
      console.log('No assistant message with tool use found');
      return [];
    }

    console.log(
      'Assistant message content:',
      JSON.stringify(assistantMsg.message.content, null, 2)
    );

    // Content must be an array to find tool use
    if (!Array.isArray(assistantMsg.message.content)) {
      console.log('Content is not an array:', assistantMsg.message.content);
      return [];
    }

    const toolUse = assistantMsg.message.content.find(
      (block) => block.type === 'tool_use' && block.name === toolName
    );

    if (!toolUse || toolUse.type !== 'tool_use') {
      console.log('Tool use not found. Content blocks:', assistantMsg.message.content);
      return [];
    }

    if (!('input' in toolUse) || !toolUse.input) {
      console.log('Tool use found but no input:', toolUse);
      return [];
    }

    // Validate with Zod
    const validation = z.object(QuestionSchema).safeParse(toolUse.input);

    if (!validation.success) {
      console.log('Validation failed:', validation.error.message);
      return [];
    }

    const answers = validation.data.answers;

    printResults(answers, questions);

    return answers;
  } catch (error) {
    console.error('Error in askQuestion:', error);
    return [];
  }
}
