import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Config } from '@/schemas';
import { readFile } from '@/utils/files';
import { logger } from '@/utils/logger';
import { INSTALL_PATHS } from '../filesystem/paths';

/**
 * Verify that an installed file is valid
 */
export function verifyInstalledFile(filePath: string): { valid: boolean; error?: string } {
  if (!existsSync(filePath)) {
    return { valid: false, error: 'File does not exist' };
  }

  try {
    const content = readFile(filePath);

    // Check for minimum content length
    if (content.length < 50) {
      return { valid: false, error: 'File content too short (possible corruption)' };
    }

    // Check for valid front matter (should have --- markers)
    const frontmatterMatch = content.match(/^---\n[\s\S]*?\n---/);
    if (!frontmatterMatch) {
      return { valid: false, error: 'Missing or invalid front matter' };
    }

    // Check that there's content after front matter
    const afterFrontmatter = content.substring(frontmatterMatch[0].length).trim();
    if (afterFrontmatter.length < 20) {
      return { valid: false, error: 'No content after front matter' };
    }

    return { valid: true };
  } catch (err) {
    return { valid: false, error: `Failed to read file: ${err}` };
  }
}

/**
 * Verify installation by checking all expected files
 */
export function verifyInstallation(
  config: Config,
  projectDir: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  logger.info('Verifying installation');

  // Check claude agents directory
  const agentsDir = join(projectDir, INSTALL_PATHS.claudeAgents());
  if (!existsSync(agentsDir)) {
    errors.push(`Claude agents directory is missing`);
  }

  // Check claude commands directory
  const commandsDir = join(projectDir, INSTALL_PATHS.claudeCommands());
  if (!existsSync(commandsDir)) {
    errors.push(`Claude commands directory is missing`);
  }

  // Check claude skills directory if skills are configured
  const skillArray = config.skills || [];
  if (skillArray.length > 0) {
    const skillsDir = join(projectDir, INSTALL_PATHS.claudeSkills());
    if (!existsSync(skillsDir)) {
      errors.push(`Claude skills directory is missing`);
    }
  }

  const valid = errors.length === 0;

  if (valid) {
    logger.info('Installation verification passed');
  } else {
    logger.error('Installation verification failed', { errors });
  }

  return { valid, errors };
}
