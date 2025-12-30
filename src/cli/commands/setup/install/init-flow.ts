import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  generateConfig,
  listAvailableCommands,
  listAvailableSkills,
} from '@/cli/lib/config/config-generator.js';
import type { HasteFS } from '@/cli/lib/filesystem/haste-fs.js';
import type { Config } from '@/schemas';
import type { CommandObject, SkillObject } from '@/schemas/config.js';
import { log, promptSelect, success } from '@/utils/ui.js';
import {
  installContextBoilerplate,
  promptContextSelection,
  showCustomContextInstructions,
} from './context-engine-manager.js';
import { createLocalConfig, promptLocalConfigCreation } from './local-config-manager.js';

interface InitFlowOptions {
  local?: string;
  agent?: string;
}

/**
 * Run the initialization flow to create config
 */
export async function runInitFlow(
  hasteFS: HasteFS,
  sourceConfigDir: string,
  cwd: string,
  options: InitFlowOptions
): Promise<void> {
  // Get available commands and skills
  const availableCommands = listAvailableCommands(hasteFS);
  const availableSkills = listAvailableSkills(hasteFS);

  // Use current directory name as project name
  const projectName = cwd.split('/').pop() || 'my-project';

  // Prompt for agent selection
  const agentChoice =
    options.agent ||
    (await promptSelect('Which AI agent are you using?', [
      { value: 'claude-code', label: 'Claude Code', hint: "Anthropic's Claude Code" },
    ]));

  const agents: 'claude-code'[] = [agentChoice as 'claude-code'];

  // Auto-select all commands (default behavior) - convert to CommandObject format
  const selectedCommands: CommandObject[] = availableCommands.map((cmd) => ({
    name: cmd,
    enabled: true,
  }));
  log(`\nInstalling all available commands (${selectedCommands.length} total)`, 'info');
  log('Subagents will be auto-resolved from command dependencies.', 'info');

  // Add all available skills with enabled: false by default
  const allSkills: SkillObject[] = availableSkills.map((skillName) => ({
    name: skillName,
    enabled: false,
  }));
  log(`Adding ${allSkills.length} skills (disabled by default, enable as needed).`, 'info');

  // Prompt for context selection and installation (mandatory - no skip)
  const selectedContext = await promptContextSelection(sourceConfigDir);

  // Generate config in devorch/config.yml
  const config: Config = {
    profile: {
      name: projectName,
      description: `devorch setup for ${projectName}`,
      agents,
    },
    commands: selectedCommands,
    skills: allSkills,
    // Subagents will be auto-resolved by dependency system during installation
    template_vars: {
      profile_name: projectName,
      generation_date: new Date().toISOString(),
    },
  };

  // Create devorch directory and write config there
  const specMachineDir = join(cwd, 'devorch');
  if (!existsSync(specMachineDir)) {
    mkdirSync(specMachineDir, { recursive: true });
  }

  const configPath = join(specMachineDir, 'config.yml');
  generateConfig(config, configPath);

  success(`✓ Config created at ${configPath}`);

  // Handle context installation based on selection
  if (selectedContext === 'custom') {
    showCustomContextInstructions();
  } else {
    installContextBoilerplate(selectedContext, sourceConfigDir, cwd);
    createLocalConfig(cwd, selectedContext);
  }
}

// Re-export for backwards compatibility
export { promptLocalConfigCreation };
