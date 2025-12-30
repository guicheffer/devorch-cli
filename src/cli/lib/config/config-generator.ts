import type { Config } from '@/schemas';
import { writeFile } from '@/utils/files.js';
import { stringifyYaml } from '@/utils/yaml.js';
import type { HasteFS } from '../filesystem/haste-fs.js';

/**
 * List available subagents from HasteFS cache
 */
export function listAvailableSubagents(hasteFS: HasteFS): string[] {
  return hasteFS.getAvailableSubagents();
}

/**
 * List available commands from HasteFS cache
 */
export function listAvailableCommands(hasteFS: HasteFS): string[] {
  return hasteFS.getAvailableCommands();
}

/**
 * List available skills from HasteFS cache
 */
export function listAvailableSkills(hasteFS: HasteFS): string[] {
  return hasteFS.getAvailableSkills();
}

/**
 * Generate and save config file
 */
export function generateConfig(config: Config, targetPath: string): void {
  const yaml = stringifyYaml(config);
  writeFile(targetPath, yaml);
}
