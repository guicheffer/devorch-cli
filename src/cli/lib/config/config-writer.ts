import { copyFileSync, rmSync, writeFileSync } from 'node:fs';
import { stringify } from 'yaml';
import type { Config } from '@/schemas';
import { getCommandName, getSkillName, getSubagentName } from '@/schemas/config.js';
import { SystemError } from '@/utils/errors.js';
import { writeFile } from '@/utils/files.js';
import { logger } from '@/utils/logger.js';
import { stringifyYaml } from '@/utils/yaml.js';
import type { ResolvedDependency } from '../filesystem/haste-fs.js';
import { getProjectDir } from '../filesystem/paths.js';
import { findConfig, loadConfig } from './config-loader.js';

/**
 * Safely update config file with backup/restore on failure
 * @param projectDir - Project directory (optional, defaults to cwd)
 * @param updater - Function that receives current config and returns updated config
 */
export function updateConfig(
  projectDir: string | undefined,
  updater: (config: Config) => Config
): void {
  const dir = getProjectDir(projectDir);

  // Load current config (throws UserError.configNotFound if not found)
  logger.debug('Loading current config');
  const config = loadConfig(dir);

  // Get config path (we know it exists since loadConfig succeeded)
  const configPath = findConfig(dir);
  if (!configPath) {
    // This should never happen if loadConfig succeeded, but TypeScript needs the check
    throw new Error('Config path unexpectedly null after successful load');
  }

  // Create backup
  const backupPath = `${configPath}.backup`;
  logger.debug('Creating config backup', { configPath, backupPath });

  try {
    copyFileSync(configPath, backupPath);

    // Apply update
    logger.debug('Applying config update');
    const updated = updater(config);

    // Write updated config
    logger.debug('Writing updated config');
    const yaml = stringifyYaml(updated);
    writeFile(configPath, yaml);

    // Remove backup on success
    logger.debug('Removing backup file');
    rmSync(backupPath, { force: true });

    logger.info('Config updated successfully', { configPath });
  } catch (err) {
    // Restore backup on failure
    logger.error('Config update failed, restoring backup', { error: err });

    try {
      copyFileSync(backupPath, configPath);
      rmSync(backupPath, { force: true });
      logger.info('Backup restored successfully');
    } catch (restoreErr) {
      logger.error('Failed to restore backup', { error: restoreErr });
      throw SystemError.backupRestorationFailed(configPath, backupPath, err, restoreErr);
    }

    throw err;
  }
}

/**
 * Write config to YAML file
 * IMPORTANT: This function writes the provided config directly,
 * it does NOT include local config overrides (config.local.yml)
 */
export function writeConfigWithComments(
  config: Config,
  dependencies: Map<string, ResolvedDependency>,
  outputPath: string
): void {
  logger.debug('Writing config', {
    outputPath,
    dependencies: dependencies.size,
  });

  // Write the config directly (config param is already migrated and merged)
  // DO NOT reload from file as that would overwrite migrations

  // Serialize the config to YAML and write to file
  const yamlContent = stringify(config, {
    lineWidth: 0, // Prevent line wrapping
    defaultStringType: 'PLAIN',
    defaultKeyType: 'PLAIN',
  });

  writeFileSync(outputPath, yamlContent, 'utf-8');

  logger.info('Config written successfully', {
    outputPath,
    dependencies: dependencies.size,
  });
}

/**
 * Add dependency arrays to config if they don't exist
 */
export function ensureDependencyArrays(config: Config): Config {
  const updated = { ...config };

  // Ensure subagents array exists
  if (!updated.subagents) {
    updated.subagents = [];
  }

  // Ensure commands array exists (should always exist per schema)
  if (!updated.commands) {
    updated.commands = [];
  }

  // Ensure skills array exists
  if (!updated.skills) {
    updated.skills = [];
  }

  return updated;
}

/**
 * Merge dependencies into config arrays
 * Deduplicates and adds only missing dependencies
 * Auto-enables dependencies that are required
 */
export function mergeDependenciesIntoConfigArrays(
  config: Config,
  dependencies: Map<string, ResolvedDependency>
): Config {
  const updated = ensureDependencyArrays(config);

  // Extract arrays (already in object format)
  const commands = [...(updated.commands || [])];
  const subagents = [...(updated.subagents || [])];
  const skills = [...(updated.skills || [])];

  // Add missing dependencies and enable required items
  for (const [_key, dep] of dependencies) {
    if (dep.type === 'command') {
      const existingIndex = commands.findIndex((c) => getCommandName(c) === dep.name);
      if (existingIndex >= 0) {
        // Command exists - enable it if it's a dependency
        const existing = commands[existingIndex];
        if (existing && !existing.enabled) {
          commands[existingIndex] = { ...existing, enabled: true };
        }
      } else {
        // Command doesn't exist - add it with enabled: true
        commands.push({ name: dep.name, enabled: true });
      }
    } else if (dep.type === 'subagent') {
      const existingIndex = subagents.findIndex((s) => getSubagentName(s) === dep.name);
      if (existingIndex >= 0) {
        // Subagent exists - enable it if it's a dependency
        const existing = subagents[existingIndex];
        if (existing && !existing.enabled) {
          subagents[existingIndex] = { ...existing, enabled: true };
        }
      } else {
        // Subagent doesn't exist - add it with enabled: true
        subagents.push({ name: dep.name, enabled: true });
      }
    } else if (dep.type === 'skill') {
      const existingIndex = skills.findIndex((s) => getSkillName(s) === dep.name);
      if (existingIndex >= 0) {
        // Skill exists - enable it if it's a dependency
        const existing = skills[existingIndex];
        if (existing && !existing.enabled) {
          skills[existingIndex] = { ...existing, enabled: true };
        }
      } else {
        // Skill doesn't exist - add it with enabled: true
        skills.push({ name: dep.name, enabled: true });
      }
    }
  }

  // Sort arrays: enabled first (alphabetically), then disabled (alphabetically)
  const sortByEnabledThenName = <T extends { name: string; enabled: boolean }>(
    a: T,
    b: T
  ): number => {
    if (a.enabled !== b.enabled) {
      return a.enabled ? -1 : 1; // Enabled items first
    }
    return a.name.localeCompare(b.name);
  };

  updated.commands = commands.sort(sortByEnabledThenName);
  updated.subagents = subagents.sort(sortByEnabledThenName);
  updated.skills = skills.sort(sortByEnabledThenName);

  logger.debug('Merged dependencies into config', {
    totalCommands: commands.length,
    totalSubagents: subagents.length,
    totalSkills: skills.length,
    enabledCommands: commands.filter((c) => c.enabled).length,
    enabledSubagents: subagents.filter((s) => s.enabled).length,
    enabledSkills: skills.filter((s) => s.enabled).length,
  });

  return updated;
}
