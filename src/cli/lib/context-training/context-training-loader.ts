import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileExists } from '@/utils/files.js';
import { logger } from '@/utils/logger.js';
import { getProjectDir } from '../filesystem/paths.js';

/**
 * Get the context trainings directory path
 */
function getContextTrainingsDir(projectDir?: string): string {
  const cwd = getProjectDir(projectDir);
  return join(cwd, 'devorch', 'context-training');
}

/**
 * Get the path to a specific context-training directory
 */
function getContextTrainingPath(contextTrainingName: string, projectDir?: string): string {
  const contextTrainingDir = getContextTrainingsDir(projectDir);
  return join(contextTrainingDir, contextTrainingName);
}

/**
 * Check if a context training exists (has implementers directory)
 */
export function contextTrainingExists(contextTrainingName: string, projectDir?: string): boolean {
  const contextTrainingPath = getContextTrainingPath(contextTrainingName, projectDir);
  const implementersDir = join(contextTrainingPath, 'implementers');
  return fileExists(implementersDir);
}

/**
 * List all available context trainings in the repository
 */
export function listContextTrainings(projectDir?: string): string[] {
  const contextTrainingDir = getContextTrainingsDir(projectDir);

  if (!fileExists(contextTrainingDir)) {
    logger.debug('Context trainings directory does not exist', { contextTrainingDir });
    return [];
  }

  try {
    const entries = readdirSync(contextTrainingDir);
    const contextTrainings = entries.filter((entry: string) => {
      const entryPath = join(contextTrainingDir, entry);
      if (!statSync(entryPath).isDirectory()) {
        return false;
      }
      // Check for implementers directory
      const implementersDir = join(entryPath, 'implementers');
      return fileExists(implementersDir);
    });

    logger.debug('Found context trainings', { count: contextTrainings.length, contextTrainings });
    return contextTrainings;
  } catch (err) {
    logger.error('Failed to list context trainings', { error: err, contextTrainingDir });
    return [];
  }
}
