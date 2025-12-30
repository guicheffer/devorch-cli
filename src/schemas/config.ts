import { z } from 'zod';

/**
 * Schema for command objects with enabled/disabled flag
 */
const commandObjectSchema = z.object({
  name: z
    .string()
    .refine((cmd) => cmd.startsWith('/'), {
      message: 'Command names must start with "/" (e.g., "/new-spec")',
    })
    .describe('Command name starting with /'),
  enabled: z.boolean().default(true).describe('Whether this command is enabled'),
});

/**
 * Schema for subagent objects with enabled/disabled flag
 */
const subagentObjectSchema = z.object({
  name: z.string().describe('Subagent name in format domain/subagent-name'),
  enabled: z.boolean().default(true).describe('Whether this subagent is enabled'),
});

/**
 * Schema for skill objects with enabled/disabled flag
 */
const skillObjectSchema = z.object({
  name: z.string().describe('Skill name in format category/skill-name'),
  enabled: z.boolean().default(true).describe('Whether this skill is enabled'),
});

/**
 * Schemas for commands, subagents, and skills
 * All use the object format with enabled flag
 */
const commandSchema = commandObjectSchema;
const subagentSchema = subagentObjectSchema;
const skillSchema = skillObjectSchema;

/**
 * Schema for devorch.config.yml
 * Lives in the target repository (where the CLI is run)
 */
export const configSchema = z.object({
  profile: z.object({
    name: z.string().describe('Target project name'),
    description: z.string().optional().describe('Profile description'),
    agents: z
      .array(z.enum(['claude-code']))
      .min(1)
      .describe('Which AI agents to install for'),
    context_training: z
      .string()
      .optional()
      .describe(
        'Context training name to use for repository-specific customizations (e.g., "mobile-app"). Context trainings are stored in devorch/context-training/{name}/'
      ),
  }),

  // Component selections - all use object format with enabled flag
  commands: z
    .array(commandSchema)
    .describe('Which commands to install with enabled/disabled flags'),

  subagents: z
    .array(subagentSchema)
    .optional()
    .describe('Which subagents to install with enabled/disabled flags'),

  skills: z
    .array(skillSchema)
    .optional()
    .describe('Which skills to install with enabled/disabled flags'),

  template_vars: z
    .record(z.string(), z.string())
    .optional()
    .describe('Template variables shared by all agents'),
});

export type Config = z.infer<typeof configSchema>;

/**
 * Inferred types for commands, subagents, and skills
 */
export type CommandObject = z.infer<typeof commandObjectSchema>;
export type SubagentObject = z.infer<typeof subagentObjectSchema>;
export type SkillObject = z.infer<typeof skillObjectSchema>;

export type Command = CommandObject;
export type Subagent = SubagentObject;
export type Skill = SkillObject;

/**
 * Helper functions for working with commands
 */
export function getCommandName(command: Command): string {
  return command.name;
}

export function isCommandEnabled(command: Command): boolean {
  return command.enabled;
}

export function normalizeCommandToObject(command: Command | string): CommandObject {
  if (typeof command === 'string') {
    return { name: command, enabled: true };
  }
  return command;
}

export function normalizeCommandsArray(
  commands: (Command | string)[] | undefined
): CommandObject[] {
  if (!commands) return [];
  return commands.map(normalizeCommandToObject);
}

/**
 * Helper functions for working with subagents
 */
export function getSubagentName(subagent: Subagent): string {
  return subagent.name;
}

export function isSubagentEnabled(subagent: Subagent): boolean {
  return subagent.enabled;
}

export function normalizeSubagentToObject(subagent: Subagent | string): SubagentObject {
  if (typeof subagent === 'string') {
    return { name: subagent, enabled: true };
  }
  return subagent;
}

export function normalizeSubagentsArray(
  subagents: (Subagent | string)[] | undefined
): SubagentObject[] {
  if (!subagents) return [];
  return subagents.map(normalizeSubagentToObject);
}

/**
 * Helper functions for working with skills
 */
export function getSkillName(skill: Skill): string {
  return skill.name;
}

export function isSkillEnabled(skill: Skill): boolean {
  return skill.enabled;
}

export function normalizeSkillToObject(skill: Skill | string): SkillObject {
  if (typeof skill === 'string') {
    return { name: skill, enabled: true };
  }
  return skill;
}

export function normalizeSkillsArray(skills: (Skill | string)[] | undefined): SkillObject[] {
  if (!skills) return [];
  return skills.map(normalizeSkillToObject);
}

/**
 * Refined validation: config must have commands
 */
export function validateConfig(config: Config): { valid: boolean; error?: string } {
  if (!config.commands || config.commands.length === 0) {
    return {
      valid: false,
      error: 'Config must specify at least one command',
    };
  }

  return { valid: true };
}

/**
 * Default config template
 */
export const defaultConfig: Config = {
  profile: {
    name: 'my-project',
    description: 'My custom devorch setup',
    agents: ['claude-code'],
    // context_training: 'react-native-starter', // Uncomment and set to use repository-specific context training
  },
  commands: [
    { name: '/create-spec', enabled: true },
    { name: '/implement-spec', enabled: true },
    { name: '/analyze-tech-stack', enabled: true },
  ],
  subagents: [
    { name: 'specification/spec-initializer', enabled: true },
    { name: 'specification/spec-researcher', enabled: true },
    { name: 'specification/spec-writer', enabled: true },
    { name: 'specification/spec-verifier', enabled: true },
    { name: 'analysis/dependency-scanner', enabled: true },
    { name: 'analysis/tech-stack-analyzer', enabled: true },
    { name: 'analysis/tech-stack-merger', enabled: true },
  ],
  skills: [],
  template_vars: {
    profile_name: 'my-project',
    generation_date: new Date().toISOString(),
  },
};
