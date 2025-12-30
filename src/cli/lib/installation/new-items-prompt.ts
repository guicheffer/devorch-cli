import * as clack from '@clack/prompts';
import type { HasteFS } from '@/cli/lib/filesystem/haste-fs.js';
import type { CommandObject, SkillObject, SubagentObject } from '@/schemas/config';
import { getCommandName, getSkillName, getSubagentName } from '@/schemas/config.js';
import { logger } from '@/utils/logger.js';

export interface NewItems {
  commands: string[];
  subagents: string[];
  skills: string[];
}

export interface PromptResult {
  enabledCommands: string[];
  enabledSubagents: string[];
  enabledSkills: string[];
}

/**
 * Detect items that are available in templates but not present in config
 */
export function detectNewItems(
  config: {
    commands: CommandObject[];
    subagents?: SubagentObject[];
    skills?: SkillObject[];
  },
  hasteFS: HasteFS
): NewItems {
  // Get all available items from templates
  const availableCommands = hasteFS.getAvailableCommands();
  const availableSubagents = hasteFS.getAvailableSubagents();
  const availableSkills = hasteFS.getAvailableSkills();

  // Get currently configured items
  const configuredCommands = new Set(config.commands.map(getCommandName));
  const configuredSubagents = new Set((config.subagents || []).map(getSubagentName));
  const configuredSkills = new Set((config.skills || []).map(getSkillName));

  // Find new items (available but not configured)
  const newCommands = availableCommands.filter((cmd) => !configuredCommands.has(cmd));
  const newSubagents = availableSubagents.filter((sub) => !configuredSubagents.has(sub));
  const newSkills = availableSkills.filter((skill) => !configuredSkills.has(skill));

  logger.debug('Detected new items', {
    newCommands: newCommands.length,
    newSubagents: newSubagents.length,
    newSkills: newSkills.length,
  });

  return {
    commands: newCommands,
    subagents: newSubagents,
    skills: newSkills,
  };
}

/**
 * Prompt user to select which new items to enable
 * Returns the names of items user selected to enable
 */
export async function promptForNewItems(
  newItems: NewItems,
  hasteFS: HasteFS
): Promise<PromptResult> {
  // Only count commands and skills (subagents are auto-resolved)
  const totalNew = newItems.commands.length + newItems.skills.length;

  if (totalNew === 0) {
    logger.debug('No new items to prompt for');
    return {
      enabledCommands: [],
      enabledSubagents: [],
      enabledSkills: [],
    };
  }

  logger.info(`Found ${totalNew} new items available`);

  // Skip prompt in non-interactive environments (CI, tests, etc.)
  if (!process.stdout.isTTY || process.env.CI === 'true') {
    logger.info('Non-interactive environment detected, skipping new items prompt');
    return {
      enabledCommands: [],
      enabledSubagents: [],
      enabledSkills: [],
    };
  }

  // Ask if user wants to review new items
  const wantsToReview = await clack.confirm({
    message: `${totalNew} new commands/skills are available. Review and select which to enable?`,
    initialValue: true,
  });

  if (clack.isCancel(wantsToReview) || !wantsToReview) {
    logger.info('User skipped enabling new items');
    return {
      enabledCommands: [],
      enabledSubagents: [],
      enabledSkills: [],
    };
  }

  const enabledCommands: string[] = [];
  const enabledSubagents: string[] = [];
  const enabledSkills: string[] = [];

  // Prompt for commands
  if (newItems.commands.length > 0) {
    logger.info(`${newItems.commands.length} new commands available`);
    const selectedCommands = await clack.multiselect({
      message: 'Select commands to enable:',
      options: newItems.commands.map((cmd) => {
        const node = hasteFS.getCommand(cmd);
        const description = node?.frontmatter?.description || '';
        return {
          value: cmd,
          label: cmd,
          hint: description,
        };
      }),
      required: false,
    });

    if (!clack.isCancel(selectedCommands)) {
      enabledCommands.push(...(selectedCommands as string[]));
      logger.info('User selected commands', { count: selectedCommands.length });
    }
  }

  // Skip prompting for subagents - they are auto-resolved from command dependencies

  // Prompt for skills
  if (newItems.skills.length > 0) {
    logger.info(`${newItems.skills.length} new skills available`);

    const selectedSkills = await clack.multiselect({
      message: 'Select skills to enable (use spacebar to select, enter to confirm):',
      options: newItems.skills.map((skill) => {
        const node = hasteFS.getSkill(skill);
        const description = node?.frontmatter?.description || skill.split('/')[0];
        return {
          value: skill,
          label: skill,
          hint: description,
        };
      }),
      required: false,
    });

    if (!clack.isCancel(selectedSkills)) {
      enabledSkills.push(...(selectedSkills as string[]));
      logger.info('User selected skills', { count: selectedSkills.length });
    }
  }

  return {
    enabledCommands,
    enabledSubagents,
    enabledSkills,
  };
}
