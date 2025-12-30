/**
 * A/B Test: Skill Description Format Comparison (v2)
 *
 * Tests which skill description format triggers auto-activation most reliably.
 * Uses ambiguous prompts and neutral skill names to stress-test descriptions.
 */

import { afterAll, beforeAll, describe, test } from 'bun:test';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Options, SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { loadAWSCredentials } from '../utils/bedrock-utils.js';
import { hasToolCall, maybeLogMessage } from '../utils/message-utils.js';

// Description formats to test
// Using a generic skill name "ticket-manager" to make descriptions more important
const FORMATS = {
  A: 'Manage Jira issues from command line',
  B: 'WHAT: Manage Jira issues. WHEN: reading tickets, adding comments, checking sprints. KEYWORDS: jira, ticket, issue, sprint, backlog, story.',
  C: 'Jira CLI tool. Triggers: jira, ticket, issue, sprint, backlog, story, epic, kanban, scrum.',
  D: '[CLI] Jira issue management. Use when: working with tickets, sprints, backlogs. Keywords: jira, ticket, issue, sprint, story, epic.',
  E: 'Manage Jira issues via CLI (use for: tickets, sprints, backlogs, stories). Keywords: jira, ticket, issue, sprint, backlog, story, epic, kanban.',
};

// Prompts categorized by difficulty
// EASY: Explicitly mentions "Jira"
// MEDIUM: Mentions ticket/issue concepts but not "Jira"
// HARD: Very ambiguous - requires understanding context
const TEST_PROMPTS = {
  easy: [
    'Read the Jira ticket SPEC-123',
    'Add a comment to Jira issue PROJ-456',
    'What Jira tickets are in this sprint?',
    'Create a new Jira story for this feature',
    'Show me my Jira backlog',
  ],
  medium: [
    'Check the status of ticket SPEC-123',
    'Add a comment to issue PROJ-456',
    'What tickets are assigned to me?',
    'Move this story to "In Progress"',
    'Show me the current sprint backlog',
    'List all open bugs in the project',
    'Create a new story for user authentication',
    'What epics are we working on?',
  ],
  hard: [
    'What work items are in the current iteration?',
    'Show me my assigned tasks',
    'Check the status of SPEC-123',
    'Add a note to PROJ-456',
    "What's blocking this story?",
    'Move this to done',
    'Show me the board',
    "What's in the backlog?",
    'Create a bug report for this crash',
    'What did I work on last sprint?',
  ],
};

// Track results across all tests
interface FormatResults {
  easy: { activated: number; total: number };
  medium: { activated: number; total: number };
  hard: { activated: number; total: number };
}
const results: Record<string, FormatResults> = {};

// Base directory for test projects
const TEST_PROJECTS_DIR = join(process.cwd(), 'tests/evals/projects');

/**
 * Create a minimal test project with just a skill file
 * Uses "ticket-manager" as skill name instead of "jira" to make description more important
 */
function createMinimalProject(name: string, skillDescription: string): string {
  const projectDir = join(TEST_PROJECTS_DIR, `skill-format-${name}-${Date.now()}`);
  const skillDir = join(projectDir, '.claude', 'skills', 'ticket-manager');

  // Create skill directory
  mkdirSync(skillDir, { recursive: true });

  // Write skill file with neutral name but Jira-specific content
  const skillContent = `---
name: ticket-manager
description: "${skillDescription}"
---

# Ticket Manager Skill

## When to Use

Use this skill when working with Jira tickets, issues, sprints, and project management.

## Quick Reference

\`\`\`bash
# List issues
jira issue list

# View specific issue
jira issue view SPEC-123

# Add comment
jira issue comment add SPEC-123 "My comment"

# Create issue
jira issue create --project SPEC --type Story --summary "Title"

# Sprint operations
jira sprint list
jira sprint active
\`\`\`

## Common Operations

- View ticket: \`jira issue view <KEY>\`
- List my issues: \`jira issue list --assignee @me\`
- Current sprint: \`jira sprint active\`
- Add comment: \`jira issue comment add <KEY> "comment"\`
`;

  writeFileSync(join(skillDir, 'SKILL.md'), skillContent, 'utf-8');

  return projectDir;
}

/**
 * Get Claude Code options for a project directory
 */
function getTestOptions(projectDir: string): Options {
  // Load AWS credentials for Bedrock
  const awsProfile = 'sso-bedrock';
  let awsEnv: Record<string, string>;
  try {
    awsEnv = loadAWSCredentials(awsProfile);
  } catch (_err) {
    awsEnv = {};
  }

  return {
    env: {
      PATH: process.env.PATH || '',
      ...awsEnv,
    },
    cwd: projectDir,
    maxTurns: 1,
    permissionMode: 'bypassPermissions',
    executable: 'bun',
    settingSources: ['local', 'project'],
  };
}

/**
 * Run Claude with a prompt and check if skill was activated
 */
async function testSkillActivation(
  projectDir: string,
  prompt: string
): Promise<{ activated: boolean; messages: SDKMessage[] }> {
  const options = getTestOptions(projectDir);
  const messages: SDKMessage[] = [];

  for await (const message of query({ prompt, options })) {
    maybeLogMessage(message);
    messages.push(message);
  }

  const activated = hasToolCall(messages, 'Skill');

  return { activated, messages };
}

/**
 * Clean up a test project
 */
function cleanupProject(projectDir: string): void {
  if (existsSync(projectDir)) {
    rmSync(projectDir, { recursive: true, force: true });
  }
}

describe('Skill Activation: Description Format Comparison v2', () => {
  beforeAll(() => {
    // Initialize results tracking
    for (const format of Object.keys(FORMATS)) {
      results[format] = {
        easy: { activated: 0, total: 0 },
        medium: { activated: 0, total: 0 },
        hard: { activated: 0, total: 0 },
      };
    }
  });

  afterAll(() => {
    // Print detailed summary
    console.log(
      '\n\n================================================================================'
    );
    console.log('=== ACTIVATION RATE SUMMARY (by difficulty) ===');
    console.log(
      '================================================================================\n'
    );

    // Calculate totals for each format
    const totals: Record<string, { activated: number; total: number; score: number }> = {};

    for (const [format, data] of Object.entries(results)) {
      const easyRate = data.easy.total > 0 ? data.easy.activated / data.easy.total : 0;
      const mediumRate = data.medium.total > 0 ? data.medium.activated / data.medium.total : 0;
      const hardRate = data.hard.total > 0 ? data.hard.activated / data.hard.total : 0;

      // Weighted score: hard prompts count more
      const weightedScore = easyRate * 1 + mediumRate * 2 + hardRate * 3;

      totals[format] = {
        activated: data.easy.activated + data.medium.activated + data.hard.activated,
        total: data.easy.total + data.medium.total + data.hard.total,
        score: weightedScore,
      };
    }

    // Sort by weighted score
    const sortedFormats = Object.entries(totals).sort(([, a], [, b]) => b.score - a.score);

    for (const [format, total] of sortedFormats) {
      const data = results[format];
      const easyRate =
        data.easy.total > 0 ? ((data.easy.activated / data.easy.total) * 100).toFixed(0) : '0';
      const mediumRate =
        data.medium.total > 0
          ? ((data.medium.activated / data.medium.total) * 100).toFixed(0)
          : '0';
      const hardRate =
        data.hard.total > 0 ? ((data.hard.activated / data.hard.total) * 100).toFixed(0) : '0';
      const overallRate =
        total.total > 0 ? ((total.activated / total.total) * 100).toFixed(0) : '0';

      const isBest = sortedFormats[0][0] === format;
      const marker = isBest ? ' ← BEST' : '';

      console.log(`Format ${format}:${marker}`);
      console.log(
        `  Easy:    ${easyRate.padStart(3)}% (${data.easy.activated}/${data.easy.total})`
      );
      console.log(
        `  Medium:  ${mediumRate.padStart(3)}% (${data.medium.activated}/${data.medium.total})`
      );
      console.log(
        `  Hard:    ${hardRate.padStart(3)}% (${data.hard.activated}/${data.hard.total})`
      );
      console.log(
        `  Overall: ${overallRate.padStart(3)}% (${total.activated}/${total.total}) [weighted: ${total.score.toFixed(2)}]`
      );
      console.log('');
    }

    console.log('================================================================================');
    console.log('Weighted score = (easy × 1) + (medium × 2) + (hard × 3)');
    console.log('Higher weighted score = better at handling ambiguous prompts');
    console.log(
      '================================================================================\n'
    );
  });

  // Test each format
  for (const [formatName, description] of Object.entries(FORMATS)) {
    describe(`Format ${formatName}`, () => {
      // Test each difficulty level
      for (const [difficulty, prompts] of Object.entries(TEST_PROMPTS)) {
        describe(`${difficulty.toUpperCase()} prompts`, () => {
          for (const prompt of prompts) {
            test(`"${prompt.slice(0, 45)}..."`, async () => {
              const projectDir = createMinimalProject(`${formatName}-${difficulty}`, description);

              try {
                const result = await testSkillActivation(projectDir, prompt);

                const difficultyKey = difficulty as keyof FormatResults;
                results[formatName][difficultyKey].total++;
                if (result.activated) {
                  results[formatName][difficultyKey].activated++;
                }

                // Log result
                const icon = result.activated ? '✓' : '✗';
                console.log(`[${formatName}/${difficulty}] ${icon} "${prompt.slice(0, 40)}..."`);
              } finally {
                cleanupProject(projectDir);
              }
            }, 120000);
          }
        });
      }
    });
  }
});
