import * as Sentry from '@sentry/node';

// Agent commands
import { agentCommand } from '@/cli/commands/agent/index.js';
// Troubleshoot commands
import { countTokensCommand } from '@/cli/commands/diagnose/count-tokens.js';
import { diagnoseCommand } from '@/cli/commands/diagnose/index.js';
// Workflow commands
import { harnessCommand } from '@/cli/commands/harness/index.js';
// Manage commands
import { checkVersionCommand } from '@/cli/commands/manage/check-version/index.js';
import { updateCommand } from '@/cli/commands/manage/update/index.js';
// Setup commands
import { installCommand } from '@/cli/commands/setup/install/index.js';
// Spec commands
import { getContextTrainingCommand } from '@/cli/commands/spec/get-context-training/index.js';
import { getSpecCommand } from '@/cli/commands/spec/get-spec/index.js';

// Telemetry
import { getTelemetry } from '@/cli/lib/telemetry/telemetry.js';

/**
 * Global options that can be passed to any command
 */
export interface GlobalOptions {
  local?: string;
  agent?: string;
  debug?: boolean;
  verbose?: boolean;
  quiet?: boolean;
  subCommand?: string;
  ci?: boolean;
}

/**
 * Command handler function type
 */
export type CommandHandler = (options?: GlobalOptions) => Promise<void>;

/**
 * Command metadata
 */
export interface CommandMetadata {
  name: string;
  handler: CommandHandler;
  category: 'setup' | 'manage' | 'spec' | 'troubleshoot' | 'agent' | 'workflow';
  description: string;
  hint: string;
}

/**
 * Registry of all available commands
 */
export const COMMAND_REGISTRY: Record<string, CommandMetadata> = {
  // Agent commands
  agent: {
    name: 'agent',
    handler: agentCommand,
    category: 'agent',
    description: 'Agent-specific utilities',
    hint: 'Commands for AI agents (schemas, etc.)',
  },

  // Manage commands
  'check-version': {
    name: 'check-version',
    handler: checkVersionCommand,
    category: 'manage',
    description: 'Check version status',
    hint: 'Check if CLI and templates are up-to-date',
  },
  update: {
    name: 'update',
    handler: updateCommand,
    category: 'manage',
    description: 'Update installation',
    hint: 'Update to latest version',
  },

  // Setup commands
  install: {
    name: 'install',
    handler: installCommand,
    category: 'setup',
    description: 'Install devorch',
    hint: 'Setup and install components',
  },

  // Spec commands
  'get-context-training': {
    name: 'get-context-training',
    handler: getContextTrainingCommand,
    category: 'spec',
    description: 'Get current context-training config',
    hint: 'Show configured context-training name',
  },
  'get-spec': {
    name: 'get-spec',
    handler: getSpecCommand,
    category: 'spec',
    description: 'Get or set active spec',
    hint: 'Manage active spec for workflows',
  },

  // Troubleshoot commands
  'count-tokens': {
    name: 'count-tokens',
    handler: countTokensCommand,
    category: 'troubleshoot',
    description: 'Count tokens in directory',
    hint: 'Count tokens in a given directory',
  },
  diagnose: {
    name: 'diagnose',
    handler: diagnoseCommand,
    category: 'troubleshoot',
    description: 'Diagnose installation',
    hint: 'Show status and run health checks',
  },

  // Workflow commands
  harness: {
    name: 'harness',
    handler: harnessCommand,
    category: 'workflow',
    description: 'Ralph Wiggum autonomous loop',
    hint: 'Run external harness loop for autonomous development',
  },
};

/**
 * Get commands by category
 */
export function getCommandsByCategory(category: CommandMetadata['category']): CommandMetadata[] {
  return Object.values(COMMAND_REGISTRY).filter((cmd) => cmd.category === category);
}

/**
 * Get command metadata by name
 */
export function getCommand(name: string): CommandMetadata | undefined {
  return COMMAND_REGISTRY[name];
}

/**
 * Execute a command by name with options
 */
export async function executeCommand(
  name: string,
  options: GlobalOptions & Record<string, unknown> = {}
): Promise<void> {
  const command = getCommand(name);
  if (!command) {
    throw new Error(`Unknown command: ${name}`);
  }

  const telemetry = getTelemetry();
  const startTime = Date.now();

  try {
    await command.handler(options);

    // Track successful command execution
    const duration = Date.now() - startTime;
    telemetry?.trackEvent(name, {
      type: 'cli',
      duration,
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    const error = err instanceof Error ? err : new Error(String(err));

    // Track error directly with Sentry
    Sentry.captureException(error, {
      tags: {
        command: name,
        command_type: 'cli',
        cli_version: process.env.BUILD_VERSION || 'dev',
      },
      extra: {
        duration_ms: duration,
      },
    });

    throw err;
  }
}
