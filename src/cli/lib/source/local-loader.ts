import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { UserError } from '@/utils/errors.js';

/**
 * Validate local devorch path
 */
export function validateLocalPath(localPath: string): void {
  if (!existsSync(localPath)) {
    throw UserError.invalidLocalPath(localPath, 'Path does not exist');
  }

  const templatesDir = join(localPath, 'templates');
  if (!existsSync(templatesDir)) {
    throw UserError.invalidLocalPath(localPath, `Templates directory not found: ${templatesDir}`);
  }
}

/**
 * Get config directory from local path
 */
export function getLocalConfigDir(localPath: string): string {
  validateLocalPath(localPath);
  return localPath; // We'll compile from this directory
}
