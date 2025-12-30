import type { CommandObject, SkillObject, SubagentObject } from '@/schemas/config';
import {
  normalizeCommandToObject,
  normalizeSkillToObject,
  normalizeSubagentToObject,
} from '@/schemas/config.js';
import { logger } from '@/utils/logger.js';

/**
 * Represents raw config that may have old string[] format or new object[] format
 */
export interface RawConfig {
  profile: {
    name: string;
    description?: string;
    agents: string[];
    context_training?: string;
  };
  commands?: Array<string | CommandObject>;
  subagents?: Array<string | SubagentObject>;
  skills?: Array<string | SkillObject>;
  template_vars?: Record<string, string>;
}

/**
 * Represents config with only the new object format
 */
export interface MigratedConfig {
  profile: {
    name: string;
    description?: string;
    agents: string[];
    context_training?: string;
  };
  commands: CommandObject[];
  subagents?: SubagentObject[];
  skills?: SkillObject[];
  template_vars?: Record<string, string>;
}

export interface MigrationResult {
  config: MigratedConfig;
  commandsMigrated: number;
  subagentsMigrated: number;
  skillsMigrated: number;
}

/**
 * Migrates config from old string[] format to new object format with enabled flag
 * This runs BEFORE schema validation to ensure the config matches the new schema
 */
export function migrateConfigFormat(rawConfig: RawConfig): MigrationResult {
  logger.debug('Starting config format migration');

  let commandsMigrated = 0;
  let subagentsMigrated = 0;
  let skillsMigrated = 0;

  // Migrate commands
  const commands: CommandObject[] = [];
  if (rawConfig.commands) {
    logger.debug('Migrating commands', { count: rawConfig.commands.length });
    for (const cmd of rawConfig.commands) {
      if (typeof cmd === 'string') {
        commands.push(normalizeCommandToObject(cmd));
        commandsMigrated++;
      } else {
        commands.push(cmd);
      }
    }
  }

  // Migrate subagents
  let subagents: SubagentObject[] | undefined;
  if (rawConfig.subagents) {
    subagents = [];
    for (const sub of rawConfig.subagents) {
      if (typeof sub === 'string') {
        subagents.push(normalizeSubagentToObject(sub));
        subagentsMigrated++;
      } else {
        subagents.push(sub);
      }
    }
  }

  // Migrate skills
  let skills: SkillObject[] | undefined;
  if (rawConfig.skills) {
    skills = [];
    for (const skill of rawConfig.skills) {
      if (typeof skill === 'string') {
        skills.push(normalizeSkillToObject(skill));
        skillsMigrated++;
      } else {
        skills.push(skill);
      }
    }
  }

  const migratedConfig: MigratedConfig = {
    profile: rawConfig.profile,
    commands,
    subagents,
    skills,
    template_vars: rawConfig.template_vars,
  };

  // Log migration summary if anything was migrated
  const totalMigrated = commandsMigrated + subagentsMigrated + skillsMigrated;
  if (totalMigrated > 0) {
    logger.info('Migrated config from old string format to new object format', {
      commandsMigrated,
      subagentsMigrated,
      skillsMigrated,
    });
  }

  return {
    config: migratedConfig,
    commandsMigrated,
    subagentsMigrated,
    skillsMigrated,
  };
}
