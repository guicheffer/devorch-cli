import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { SystemError } from './errors.js';
import { logger } from './logger.js';

/**
 * Check if a file exists
 */
export function fileExists(path: string): boolean {
  const exists = existsSync(path);
  logger.debug('File existence check', { path, exists });
  return exists;
}

/**
 * Read a file as string
 */
export function readFile(path: string): string {
  logger.fileOp('read', path);
  try {
    const content = readFileSync(path, 'utf-8');
    logger.fileOp('read', path, true);
    return content;
  } catch (err: any) {
    logger.fileOp('read', path, false);
    logger.error('Failed to read file', { path, error: err });
    if (err.code === 'ENOENT') {
      throw SystemError.fileNotFound(path);
    }
    if (err.code === 'EACCES' || err.code === 'EPERM') {
      throw SystemError.permissionDenied(path, 'read');
    }
    throw err;
  }
}

/**
 * Write content to a file (creates parent directories if needed)
 */
export function writeFile(path: string, content: string): void {
  logger.fileOp('write', path);
  try {
    const dir = dirname(path);
    if (!existsSync(dir)) {
      logger.debug('Creating parent directories', { dir });
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(path, content, 'utf-8');
    logger.fileOp('write', path, true);
  } catch (err: any) {
    logger.fileOp('write', path, false);
    logger.error('Failed to write file', { path, error: err });
    if (err.code === 'EACCES' || err.code === 'EPERM') {
      throw SystemError.permissionDenied(path, 'write');
    }
    if (err.code === 'ENOSPC') {
      throw SystemError.insufficientDiskSpace();
    }
    throw err;
  }
}

/**
 * Ensure a directory exists (creates it if needed)
 */
export function ensureDir(path: string): void {
  if (!existsSync(path)) {
    logger.debug('Creating directory', { path });
    try {
      mkdirSync(path, { recursive: true });
      logger.debug('Directory created', { path });
    } catch (err: any) {
      logger.error('Failed to create directory', { path, error: err });
      if (err.code === 'EACCES' || err.code === 'EPERM') {
        throw SystemError.permissionDenied(path, 'create-directory');
      }
      if (err.code === 'ENOSPC') {
        throw SystemError.insufficientDiskSpace();
      }
      throw err;
    }
  } else {
    logger.debug('Directory already exists', { path });
  }
}
