import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { INSTALL_PATHS } from '@/cli/lib/filesystem/paths.js';
import { logger } from '@/utils/logger.js';

/**
 * Clean up previous devorch installations
 */
export function cleanupPreviousInstallation(projectDir: string, _agents: 'claude-code'[]): void {
  logger.debug('Starting cleanup of previous installation');

  // Clean up Claude Code directories
  const agentsDir = join(projectDir, INSTALL_PATHS.claudeAgents());
  const commandsDir = join(projectDir, INSTALL_PATHS.claudeCommands());
  const skillsDir = join(projectDir, INSTALL_PATHS.claudeSkills());

  if (existsSync(agentsDir)) {
    rmSync(agentsDir, { recursive: true, force: true });
  }
  if (existsSync(commandsDir)) {
    rmSync(commandsDir, { recursive: true, force: true });
  }
  if (existsSync(skillsDir)) {
    rmSync(skillsDir, { recursive: true, force: true });
  }
}
