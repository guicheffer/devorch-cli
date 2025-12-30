import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { findConfig, loadVersionedConfigOnly } from '@/cli/lib/config/config-loader.js';
import {
  mergeDependenciesIntoConfigArrays,
  writeConfigWithComments,
} from '@/cli/lib/config/config-writer.js';
import { type DependencyGraph, HasteFS } from '@/cli/lib/filesystem/haste-fs.js';
import { getProjectDir, INSTALL_PATHS } from '@/cli/lib/filesystem/paths.js';
import type { CodingAgent } from '@/cli/types/index.js';
import type { Config } from '@/schemas';
import type { CommandObject, SkillObject, SubagentObject } from '@/schemas/config';
import {
  getCommandName,
  getSubagentName,
  isCommandEnabled,
  isSubagentEnabled,
} from '@/schemas/config.js';
import { colors } from '@/utils/colors.js';
import { writeFile } from '@/utils/files.js';
import { logger } from '@/utils/logger.js';
import { installForAgent } from './agent-installer.js';
import { applyNameMigrations, type MigrationResult } from './command-migrations.js';
import { migrateConfigFormat, type RawConfig } from './config-format-migration.js';
import { detectNewItems, promptForNewItems } from './new-items-prompt.js';
import { completeInstallation, initializeState, updateStateComponents } from './state-manager.js';
import { verifyInstallation } from './verification.js';

/**
 * Populate config with all available items (disabled by default)
 * Returns the populated config and sets of existing items
 */
function populateAvailableItems(
  config: Config,
  hasteFS: HasteFS
): {
  config: Config;
  existingCommands: Set<string>;
  existingSubagents: Set<string>;
  existingSkills: Set<string>;
} {
  const allCommands = hasteFS.getAvailableCommands();
  const allSubagents = hasteFS.getAvailableSubagents();
  const allSkills = hasteFS.getAvailableSkills();

  // Create sets of existing items for quick lookup
  const existingCommands = new Set<string>(config.commands.map(getCommandName));
  const existingSubagents = new Set<string>((config.subagents || []).map(getSubagentName));
  const existingSkills = new Set<string>(
    (config.skills || []).map((s: { name: string }) => s.name)
  );

  // Add missing commands (disabled by default)
  const populatedCommands: CommandObject[] = [...config.commands];
  for (const cmdName of allCommands) {
    if (!existingCommands.has(cmdName)) {
      populatedCommands.push({ name: cmdName, enabled: false });
    }
  }

  // Add missing subagents (disabled by default)
  const populatedSubagents: SubagentObject[] = [...(config.subagents || [])];
  for (const subName of allSubagents) {
    if (!existingSubagents.has(subName)) {
      populatedSubagents.push({ name: subName, enabled: false });
    }
  }

  // Add missing skills (disabled by default)
  const populatedSkills: SkillObject[] = [...(config.skills || [])];
  for (const skillName of allSkills) {
    if (!existingSkills.has(skillName)) {
      populatedSkills.push({ name: skillName, enabled: false });
    }
  }

  return {
    config: {
      ...config,
      commands: populatedCommands,
      subagents: populatedSubagents,
      skills: populatedSkills,
    },
    existingCommands,
    existingSubagents,
    existingSkills,
  };
}

/**
 * Apply user selections from new items prompt
 */
function applyNewItemSelections(
  config: Config,
  enabledCommands: string[],
  enabledSubagents: string[],
  enabledSkills: string[]
): Config {
  return {
    ...config,
    commands: config.commands.map((cmd) =>
      enabledCommands.includes(getCommandName(cmd)) ? { ...cmd, enabled: true } : cmd
    ),
    subagents: config.subagents?.map((sub) =>
      enabledSubagents.includes(getSubagentName(sub)) ? { ...sub, enabled: true } : sub
    ),
    skills: config.skills?.map((skill) =>
      enabledSkills.includes(skill.name) ? { ...skill, enabled: true } : skill
    ),
  };
}

/**
 * Install all subagents, commands, and skills based on config
 * Uses HasteFS for efficient compilation with agent-specific frontmatter
 * Automatically resolves and installs dependencies
 */
export async function install(
  config: Config,
  sourceDir: string,
  hasteFS: HasteFS,
  resolvedVersion: string,
  targetDir?: string
): Promise<void> {
  const projectDir = getProjectDir(targetDir);
  const results: Record<CodingAgent, { subagents: number; commands: number; skills: number }> =
    {} as Record<CodingAgent, { subagents: number; commands: number; skills: number }>;

  // Collect warnings and errors during installation
  const installationIssues: Array<{ type: 'error' | 'warning'; message: string }> = [];

  // Load versioned config (without local overrides) for persisting changes
  // The runtime config (with local overrides) is passed as parameter
  const versionedConfig = loadVersionedConfigOnly(projectDir);
  const runtimeConfig = config;

  // Step 0: Migrate config format from string[] to object[] if needed
  logger.info('Checking config format...');
  const migrationResult = migrateConfigFormat(versionedConfig as unknown as RawConfig);
  let workingConfig = migrationResult.config as unknown as Config;
  const formatMigrated =
    migrationResult.commandsMigrated > 0 ||
    migrationResult.subagentsMigrated > 0 ||
    migrationResult.skillsMigrated > 0;

  // Step 0.5: Apply name migrations BEFORE populating available items
  // This prevents duplicates when old names get migrated to new names that already exist
  logger.info('Checking for name migrations...');
  // Cast to expected type - Config commands always have name after format migration
  const nameMigrationResult = applyNameMigrations(
    workingConfig as unknown as {
      commands: Array<{ name: string }>;
      subagents?: Array<{ name: string }>;
      skills?: Array<{ name: string }>;
    }
  );
  workingConfig = nameMigrationResult.config as unknown as Config;
  const earlyMigrations: MigrationResult = nameMigrationResult.migrations;

  if (
    earlyMigrations.commandMigrations.length > 0 ||
    earlyMigrations.subagentMigrations.length > 0 ||
    earlyMigrations.skillMigrations.length > 0
  ) {
    logger.info('Applied name migrations', {
      commands: earlyMigrations.commandMigrations.length,
      subagents: earlyMigrations.subagentMigrations.length,
      skills: earlyMigrations.skillMigrations.length,
    });
  }

  // Step 0.6: Populate all available commands, subagents, and skills (disabled by default)
  logger.info('Populating all available items...');
  const populationResult = populateAvailableItems(workingConfig, hasteFS);
  workingConfig = populationResult.config;
  const { existingCommands, existingSubagents, existingSkills } = populationResult;

  // Step 0.75: Resolve dependencies for ENABLED commands to filter out dependent skills
  logger.info('Resolving dependencies for enabled commands...');
  const enabledCommandGraphs: DependencyGraph[] = [];
  for (const agent of workingConfig.profile.agents as CodingAgent[]) {
    const enabledCommands = workingConfig.commands.filter(isCommandEnabled);
    for (const commandObj of enabledCommands) {
      const commandName = getCommandName(commandObj);
      try {
        const graph = hasteFS.resolveDependencyGraph('command', commandName, agent);
        enabledCommandGraphs.push(graph);
      } catch (err) {
        logger.debug('Failed to resolve dependencies for enabled command', {
          command: commandName,
          error: err,
        });
      }
    }
  }

  // Collect all dependencies from enabled commands
  const enabledCommandDeps = HasteFS.collectAllDependencies(enabledCommandGraphs);
  const dependentSkills = new Set(
    Array.from(enabledCommandDeps.values())
      .filter((d) => d.type === 'skill')
      .map((d) => d.name)
  );

  logger.debug('Dependent skills from enabled commands', {
    count: dependentSkills.size,
    skills: Array.from(dependentSkills),
  });

  // Step 0.8: Detect new items and prompt user
  const newItems = detectNewItems(
    {
      commands: workingConfig.commands.filter((c) => existingCommands.has(getCommandName(c))),
      subagents: workingConfig.subagents?.filter((s) => existingSubagents.has(getSubagentName(s))),
      skills: workingConfig.skills?.filter((s) => existingSkills.has(s.name)),
    },
    hasteFS
  );

  // Filter out skills that are already dependencies of enabled commands
  const newSkillsToPrompt = newItems.skills.filter((skill) => !dependentSkills.has(skill));
  const newItemsToPrompt = {
    commands: newItems.commands,
    subagents: [], // Never prompt for subagents
    skills: newSkillsToPrompt,
  };

  const totalNewItems = newItemsToPrompt.commands.length + newItemsToPrompt.skills.length;

  if (totalNewItems > 0) {
    logger.info(`Found ${totalNewItems} new items available`);
    const promptResult = await promptForNewItems(newItemsToPrompt, hasteFS);
    workingConfig = applyNewItemSelections(
      workingConfig,
      promptResult.enabledCommands,
      promptResult.enabledSubagents,
      promptResult.enabledSkills
    );
  }

  logger.info('Starting installation', {
    agents: workingConfig.profile.agents,
    subagents: workingConfig.subagents?.length || 0,
    commands: workingConfig.commands?.length || 0,
    skills: workingConfig.skills?.length || 0,
    enabledCommands: workingConfig.commands.filter(isCommandEnabled).length,
    enabledSubagents: (workingConfig.subagents || []).filter(isSubagentEnabled).length,
    enabledSkills: (workingConfig.skills || []).filter((s) => s.enabled).length,
  });

  // Step 1: Resolve dependencies for all explicit assets
  // Note: Config names have already been migrated at Step 0.6, so we just resolve directly
  logger.info('Resolving dependencies...');
  const graphs: DependencyGraph[] = [];

  // Resolve dependencies for each agent to handle agent-specific command variants
  for (const agent of workingConfig.profile.agents as CodingAgent[]) {
    // Resolve dependencies for ENABLED commands only
    const enabledCommands = workingConfig.commands.filter(isCommandEnabled);
    for (const commandObj of enabledCommands) {
      const commandName = getCommandName(commandObj);
      try {
        const graph = hasteFS.resolveDependencyGraph('command', commandName, agent);
        graphs.push(graph);
        logger.debug('Resolved command dependencies', {
          command: commandName,
          agent,
          dependencies: graph.dependencies.size,
        });
      } catch (err) {
        logger.warn('Failed to resolve dependencies for command', {
          command: commandName,
          agent,
          error: err,
        });
        installationIssues.push({
          type: 'warning',
          message: `Command ${commandName} not found or failed to resolve`,
        });
        // Continue with other commands even if one fails
      }
    }
  }

  // Resolve dependencies for ENABLED subagents only
  const enabledSubagents = (workingConfig.subagents || []).filter(isSubagentEnabled);
  for (const subagentObj of enabledSubagents) {
    const subagentName = getSubagentName(subagentObj);
    try {
      // Use full subagent name with category prefix (matches HasteFS indexing)
      const graph = hasteFS.resolveDependencyGraph('subagent', subagentName);
      graphs.push(graph);
      logger.debug('Resolved subagent dependencies', {
        subagent: subagentName,
        dependencies: graph.dependencies.size,
      });
    } catch (err) {
      logger.warn('Failed to resolve dependencies for subagent', {
        subagent: subagentName,
        error: err,
      });
      installationIssues.push({
        type: 'warning',
        message: `Subagent '${subagentName}' not found or failed to resolve`,
      });
      // Continue with other subagents even if one fails
    }
  }

  // Step 2: Collect all unique dependencies
  const allDeps = HasteFS.collectAllDependencies(graphs);
  logger.info('Dependencies resolved', {
    totalDependencies: allDeps.size,
    subagents: Array.from(allDeps.values()).filter((d) => d.type === 'subagent').length,
    skills: Array.from(allDeps.values()).filter((d) => d.type === 'skill').length,
  });

  // Step 3: Merge dependencies into config
  const enrichedConfig = mergeDependenciesIntoConfigArrays(workingConfig, allDeps);

  // Step 4: Write updated config with comments (if anything changed)
  const nameMigrationsApplied =
    earlyMigrations.commandMigrations.length > 0 ||
    earlyMigrations.subagentMigrations.length > 0 ||
    earlyMigrations.skillMigrations.length > 0;
  const shouldWriteConfig =
    allDeps.size > 0 || formatMigrated || nameMigrationsApplied || totalNewItems > 0;

  if (shouldWriteConfig) {
    const configPath = findConfig(projectDir);
    if (configPath) {
      logger.info('Updating config file', {
        formatMigrated,
        nameMigrationsApplied,
        newItemsDetected: totalNewItems,
        dependenciesAdded: allDeps.size,
      });
      writeConfigWithComments(enrichedConfig, allDeps, configPath);
    }
  }

  // Step 5: Clean up old metadata files (from previous versions)
  logger.debug('Cleaning up old metadata files...');
  const oldClaudeMetadata = join(projectDir, '.claude', '.devorch.installed.yml');
  const oldCursorMetadata = join(projectDir, '.cursor', '.devorch.installed.yml');
  if (existsSync(oldClaudeMetadata)) {
    rmSync(oldClaudeMetadata);
    logger.debug('Removed old Claude metadata file');
  }
  if (existsSync(oldCursorMetadata)) {
    rmSync(oldCursorMetadata);
    logger.debug('Removed old Cursor metadata file from previous installation');
  }

  // Step 6: Initialize installation state with enriched config
  initializeState(projectDir, enrichedConfig, resolvedVersion);

  // Step 7: Install for each AI agent
  // Use runtime config for installation to preserve local overrides (e.g., context_training)
  const runtimeEnrichedConfig = {
    ...enrichedConfig,
    profile: {
      ...enrichedConfig.profile,
      context_training: runtimeConfig.profile.context_training,
    },
  };

  for (const agent of enrichedConfig.profile.agents as CodingAgent[]) {
    logger.info(`Installing for agent: ${agent}`);
    const stats = await installForAgent(
      agent,
      sourceDir,
      runtimeEnrichedConfig,
      hasteFS,
      projectDir
    );
    results[agent] = stats;
    logger.info(`Installed for ${agent}`, stats);

    // Ensure directory structure exists even if no files were written
    // Claude Code only (Cursor no longer supported)
    const claudeAgentsDir = join(projectDir, INSTALL_PATHS.claudeAgents());
    const claudeCommandsDir = join(projectDir, INSTALL_PATHS.claudeCommands());
    const claudeSkillsDir = join(projectDir, INSTALL_PATHS.claudeSkills());

    mkdirSync(claudeAgentsDir, { recursive: true });
    mkdirSync(claudeCommandsDir, { recursive: true });
    mkdirSync(claudeSkillsDir, { recursive: true });

    // Add .gitignore files to agent and command directories
    // (These only contain devorch generated files)
    const agentCommandGitignore = '*\n!.gitignore\n';
    writeFile(join(claudeAgentsDir, '.gitignore'), agentCommandGitignore);
    writeFile(join(claudeCommandsDir, '.gitignore'), agentCommandGitignore);

    // Add .gitignore to skills directory listing only enabled skills
    // These are skills installed by devorch (users can add custom skills that won't be listed here)
    const enabledSkills =
      enrichedConfig.skills?.filter((s) => {
        if (typeof s === 'string') return true; // Old format - assume enabled
        return s.enabled !== false; // Object format - check enabled flag
      }) || [];

    const skillGitignoreLines = ['# Skills installed by devorch (auto-generated)', ''];
    for (const skill of enabledSkills) {
      const skillName = typeof skill === 'object' ? skill.name : skill;
      const skillPath = skillName.replace(/\//g, '-');
      skillGitignoreLines.push(`${skillPath}/`);
    }

    if (enabledSkills.length > 0) {
      const skillsGitignore = `${skillGitignoreLines.join('\n')}\n`;
      writeFile(join(claudeSkillsDir, '.gitignore'), skillsGitignore);
    }

    // Update state with component counts
    updateStateComponents(projectDir, agent, stats);
  }

  // Step 8: Add .gitignore to devorch directory
  const specMachineDir = join(projectDir, 'devorch');
  mkdirSync(specMachineDir, { recursive: true });
  const specMachineGitignorePatterns = [
    '.state/',
    'config.local.yml',
    'config.local.yaml',
    'specs/*/verification/',
    'specs/*/implementation/',
  ];
  const specMachineGitignore = `${specMachineGitignorePatterns.join('\n')}\n`;
  writeFile(join(specMachineDir, '.gitignore'), specMachineGitignore);

  // Verify installation
  const verification = verifyInstallation(enrichedConfig, projectDir);
  if (!verification.valid) {
    logger.warn('Installation verification detected issues', { errors: verification.errors });
    for (const error of verification.errors) {
      installationIssues.push({
        type: 'error',
        message: error,
      });
    }
  }

  // Mark installation as complete
  completeInstallation(projectDir);

  // Display summary
  console.log('\n📦 Installation Summary:\n');

  // Show auto-installed dependencies if any
  if (allDeps.size > 0) {
    console.log('  Auto-installed dependencies:');
    for (const [_key, dep] of allDeps) {
      const parents = dep.requiredBy.join(', ');
      console.log(`    • ${dep.name} (${dep.type}) - required by ${parents}`);
    }
    console.log('');
  }

  for (const agent of enrichedConfig.profile.agents as CodingAgent[]) {
    const stats = results[agent];
    console.log(`  ${agent}:`);
    console.log(`    ✓ ${stats.subagents} subagents installed to .claude/agents/devorch/`);
    console.log(`    ✓ ${stats.commands} commands installed to .claude/commands/devorch/`);
    if (stats.skills > 0) {
      console.log(`    ✓ ${stats.skills} skill files installed to .claude/skills/`);
    }
  }
  console.log('');

  // Display auto-migrations summary
  if (nameMigrationsApplied) {
    console.log(colors.green(colors.bold('✨ Auto-migrations applied:\n')));

    if (earlyMigrations.commandMigrations.length > 0) {
      console.log(colors.green(`  Commands (${earlyMigrations.commandMigrations.length}):`));
      for (const migration of earlyMigrations.commandMigrations) {
        console.log(colors.green(`    • ${migration.from} → ${migration.to}`));
      }
      console.log('');
    }

    if (earlyMigrations.subagentMigrations.length > 0) {
      console.log(colors.green(`  Subagents (${earlyMigrations.subagentMigrations.length}):`));
      for (const migration of earlyMigrations.subagentMigrations) {
        console.log(colors.green(`    • ${migration.from} → ${migration.to}`));
      }
      console.log('');
    }

    if (earlyMigrations.skillMigrations.length > 0) {
      console.log(colors.green(`  Skills (${earlyMigrations.skillMigrations.length}):`));
      for (const migration of earlyMigrations.skillMigrations) {
        console.log(colors.green(`    • ${migration.from} → ${migration.to}`));
      }
      console.log('');
    }

    console.log(colors.dim('  Config file has been updated with the new names.\n'));
  }

  // Display issues summary at the end
  if (installationIssues.length > 0) {
    const warnings = installationIssues.filter((i) => i.type === 'warning');
    const errors = installationIssues.filter((i) => i.type === 'error');

    console.log(colors.yellow(colors.bold('⚠️  Installation Issues:\n')));

    if (warnings.length > 0) {
      console.log(colors.yellow(`  Warnings (${warnings.length}):`));
      for (const warning of warnings) {
        console.log(colors.yellow(`    • ${warning.message}`));
      }
      console.log('');
    }

    if (errors.length > 0) {
      console.log(colors.red(`  Errors (${errors.length}):`));
      for (const error of errors) {
        console.log(colors.red(`    • ${error.message}`));
      }
      console.log('');
    }
  }
}
