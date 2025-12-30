import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import fg from 'fast-glob';
import type { FileNode, HasteFS } from '@/cli/lib/filesystem/haste-fs';
import { FOUNDRY_PATHS, INSTALL_PATHS } from '@/cli/lib/filesystem/paths';
import type { CodingAgent } from '@/cli/types';
import type { Config } from '@/schemas';
import {
  getCommandName,
  getSkillName,
  getSubagentName,
  isCommandEnabled,
  isSkillEnabled,
  isSubagentEnabled,
} from '@/schemas/config';
import { writeFile } from '@/utils/files';
import { logger } from '@/utils/logger.js';
import { spinner } from '@/utils/ui';

/**
 * Get output path for a file based on agent and file type
 */
function getOutputPath(fileId: string, _agent: CodingAgent, targetDir: string): string | null {
  // Strip .md extension if present (fileId comes with .md already)
  const cleanFileId = fileId.replace(/\.md$/, '');
  const skillsPrefix = `${FOUNDRY_PATHS.skills()}/`;

  // New structure: [domain]/subagents/[name].md
  // Check if this is a subagent (contains /subagents/ in path)
  if (cleanFileId.includes('/subagents/')) {
    const parts = cleanFileId.split('/');
    const domain = parts[0] ?? '';
    const filename = parts[parts.length - 1] ?? '';

    // Claude Code: .claude/agents/devorch/{domain}/{name}.md
    return join(targetDir, INSTALL_PATHS.claudeAgents(), domain, `${filename}.md`);
  }

  // New structure: [domain]/[command]/command.md
  // Check if this is a command (ends with /command or has command.md)
  if (cleanFileId.endsWith('/command') || cleanFileId.includes('/command')) {
    const parts = cleanFileId.split('/');
    const commandName = parts[1] ?? '';

    // Claude Code: .claude/commands/devorch/{command-name}.md (flat structure)
    // Use command folder name as filename
    return join(targetDir, INSTALL_PATHS.claudeCommands(), `${commandName}.md`);
  }

  // Skills: unchanged structure
  if (cleanFileId.startsWith(skillsPrefix)) {
    // Flatten the path structure: skills/domain/skill/SKILL -> domain-skill
    // Remove skills/ prefix and /SKILL suffix
    const skillPath = cleanFileId
      .replace(new RegExp(`^${skillsPrefix}`), '')
      .replace(/\/SKILL$/, '');
    const flattenedPath = skillPath.replace(/\//g, '-');
    return join(targetDir, INSTALL_PATHS.claudeSkills(), flattenedPath, 'SKILL.md');
  }

  return null;
}

/**
 * Copy skill assets (references/*.md and scripts/*) to the installation directory
 */
async function copySkillAssets(
  fileNode: FileNode,
  skillMainOutputPath: string,
  _sourceDir: string
): Promise<void> {
  const skillSourceDir = dirname(fileNode.path);
  const skillOutputDir = dirname(skillMainOutputPath);
  let totalFilesCopied = 0;

  // Copy references directory (*.md files)
  const referencesDir = join(skillSourceDir, 'references');
  if (existsSync(referencesDir)) {
    const referenceFiles = await fg(join(referencesDir, '**/*.md'), { absolute: true });

    logger.debug('Found skill reference files', {
      skill: fileNode.name,
      count: referenceFiles.length,
      files: referenceFiles,
    });

    for (const refFile of referenceFiles) {
      const relativePath = relative(skillSourceDir, refFile);
      const outputPath = join(skillOutputDir, relativePath);

      mkdirSync(dirname(outputPath), { recursive: true });
      copyFileSync(refFile, outputPath);
      logger.fileOp('write', outputPath, true);
      totalFilesCopied++;
    }
  }

  // Copy scripts directory (all files)
  const scriptsDir = join(skillSourceDir, 'scripts');
  if (existsSync(scriptsDir)) {
    const scriptFiles = await fg(join(scriptsDir, '**/*'), { absolute: true, onlyFiles: true });

    logger.debug('Found skill script files', {
      skill: fileNode.name,
      count: scriptFiles.length,
      files: scriptFiles,
    });

    for (const scriptFile of scriptFiles) {
      const relativePath = relative(skillSourceDir, scriptFile);
      const outputPath = join(skillOutputDir, relativePath);

      mkdirSync(dirname(outputPath), { recursive: true });
      copyFileSync(scriptFile, outputPath);
      logger.fileOp('write', outputPath, true);
      totalFilesCopied++;
    }
  }

  if (totalFilesCopied > 0) {
    logger.info('Copied skill assets', {
      skill: fileNode.name,
      count: totalFilesCopied,
    });
  } else {
    logger.debug('No additional assets found for skill', { skill: fileNode.name });
  }
}

/**
 * Asset configuration for unified installation loop
 */
type AssetConfig = {
  type: 'subagent' | 'command' | 'skill';
  getArray: (config: Config) => string[];
  getNode: (hasteFS: HasteFS, name: string) => FileNode | undefined;
  shouldInstall: (fileNode: FileNode, agent: CodingAgent) => boolean;
  postInstall?: (fileNode: FileNode, outputPath: string, sourceDir: string) => Promise<void>;
};

export async function installForAgent(
  agent: CodingAgent,
  sourceDir: string,
  config: Config,
  hasteFS: HasteFS,
  targetDir: string
): Promise<{ subagents: number; commands: number; skills: number }> {
  const s = spinner();
  s.start(`Installing for ${agent}...`);

  try {
    const counters = { subagent: 0, command: 0, skill: 0 };

    // Define asset configurations for unified loop
    const assetConfigs: AssetConfig[] = [
      {
        type: 'subagent',
        getArray: (config) => {
          const subagents = config.subagents || [];
          // Filter only enabled subagents and extract names
          return subagents.filter(isSubagentEnabled).map(getSubagentName);
        },
        getNode: (hasteFS, name) => hasteFS.getSubagent(name),
        shouldInstall: () => true,
      },
      {
        type: 'command',
        getArray: (config) => {
          const commands = config.commands || [];
          // Filter only enabled commands and extract names
          return commands.filter(isCommandEnabled).map(getCommandName);
        },
        getNode: (hasteFS, name) => hasteFS.getCommand(name, agent),
        shouldInstall: (fileNode, agent) => {
          const mode = fileNode.frontmatter.mode as string;
          return agent === 'claude-code' && mode === 'multi-agent';
        },
      },
      {
        type: 'skill',
        getArray: (config) => {
          const skills = config.skills || [];
          // Filter only enabled skills and extract names
          return skills.filter(isSkillEnabled).map(getSkillName);
        },
        getNode: (hasteFS, name) => hasteFS.getSkill(name),
        shouldInstall: (_fileNode, agent) => agent === 'claude-code',
        postInstall: copySkillAssets,
      },
    ];

    // Unified installation loop
    for (const assetConfig of assetConfigs) {
      const assetArray = assetConfig.getArray(config);
      logger.info(`Installing ${assetArray.length} ${assetConfig.type}s for ${agent}`, {
        [`${assetConfig.type}s`]: assetArray,
      });

      for (const assetName of assetArray) {
        try {
          logger.debug(`Processing ${assetConfig.type}: ${assetName}`, { agent });

          // Get file metadata
          const fileNode = assetConfig.getNode(hasteFS, assetName);
          if (!fileNode) {
            logger.warn(`${assetConfig.type} not found in HasteFS: ${assetName}`);
            continue;
          }

          logger.debug(`File node found`, {
            type: assetConfig.type,
            name: assetName,
            relativePath: fileNode.relativePath,
            hasCompiledCache: !!fileNode.compiled,
          });

          // Check if should install for this agent
          if (!assetConfig.shouldInstall(fileNode, agent)) {
            logger.debug(`Skipping ${assetName} (doesn't match ${agent} requirements)`, {
              type: assetConfig.type,
              mode: fileNode.frontmatter.mode,
            });
            continue;
          }

          // Get compiled content from HasteFS
          logger.debug(`Getting compiled content for ${assetConfig.type}: ${assetName}`, { agent });
          const compiled = await hasteFS.getCompiledContent(
            assetConfig.type,
            sourceDir,
            assetName,
            agent,
            config.profile.context_training
          );

          logger.debug(`Compiled content length: ${compiled.length}`, {
            type: assetConfig.type,
            name: assetName,
          });

          // Determine output path based on agent and file structure
          const outputPath = getOutputPath(fileNode.relativePath, agent, targetDir);
          if (!outputPath) {
            logger.warn(`Could not determine output path for ${assetConfig.type}: ${assetName}`);
            continue;
          }

          logger.info(`Writing ${assetConfig.type} to: ${outputPath}`, {
            name: assetName,
            agent,
            contentLength: compiled.length,
          });

          // Ensure output directory exists and write file
          mkdirSync(dirname(outputPath), { recursive: true });
          writeFile(outputPath, compiled);
          logger.fileOp('write', outputPath, true);

          // Post-install hook (e.g., copy skill references)
          if (assetConfig.postInstall) {
            await assetConfig.postInstall(fileNode, outputPath, sourceDir);
          }

          counters[assetConfig.type]++;
          logger.debug(`Installed ${assetConfig.type}: ${assetName}`, { outputPath });
        } catch (err) {
          logger.error(`Failed to install ${assetConfig.type}: ${assetName}`, { error: err });
        }
      }
    }

    const parts = [];
    if (counters.subagent > 0) parts.push(`${counters.subagent} subagents`);
    if (counters.command > 0) parts.push(`${counters.command} commands`);
    if (counters.skill > 0) parts.push(`${counters.skill} skill files`);

    s.stop(`✓ Installed ${parts.join(', ')} for ${agent}`);

    return {
      subagents: counters.subagent,
      commands: counters.command,
      skills: counters.skill,
    };
  } catch (err) {
    s.stop(`✗ Installation failed for ${agent}: ${err}`);
    throw err;
  }
}
