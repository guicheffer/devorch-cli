import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { findConfig, loadConfig } from '@/cli/lib/config/config-loader.js';
import { listContextTrainings } from '@/cli/lib/context-training/context-training-loader.js';
import { getProjectDir } from '@/cli/lib/filesystem/paths.js';
import { install } from '@/cli/lib/installation/installer.js';
import {
  createInstallationLock,
  detectIncompleteInstallation,
  failInstallation,
  isInstallationLocked,
  removeInstallationLock,
} from '@/cli/lib/installation/state-manager.js';
import { loadConfigSource } from '@/cli/lib/source/config-source-loader.js';
import { logger } from '@/utils/logger.js';
import { intro, log, promptConfirm, spinner, success } from '@/utils/ui.js';
import { cleanupPreviousInstallation } from './cleanup.js';
import { promptLocalConfigCreation, runInitFlow } from './init-flow.js';

interface InstallOptions {
  local?: string;
  agent?: string;
}

export async function installCommand(options: InstallOptions) {
  intro('📦 Installing devorch');

  logger.debug('Install command started', { options });

  const projectDir = getProjectDir();
  logger.debug('Project directory', { projectDir });

  // Check for concurrent installation
  if (isInstallationLocked(projectDir)) {
    const { INSTALL_PATHS } = await import('@/cli/lib/filesystem/paths.js');
    const lockPath = join(projectDir, INSTALL_PATHS.lockFile());
    log(
      `⚠️  Another installation is in progress. Please wait for it to complete or remove the lock file at ${lockPath}`,
      'warn'
    );
    return;
  }

  // Check for incomplete installation
  const { incomplete, state } = detectIncompleteInstallation(projectDir);
  if (incomplete && state) {
    log('⚠️  Detected incomplete installation from previous attempt', 'warn');
    log(`Status: ${state.status}`, 'info');
    if (state.error) {
      log(`Error: ${state.error}`, 'error');
    }

    const shouldCleanup = await promptConfirm(
      'Would you like to clean up and start fresh? (No will exit)'
    );
    if (!shouldCleanup) {
      log('Installation cancelled.', 'info');
      log('\nTo clean up manually, remove these files:', 'info');
      log(`  ${join(projectDir, '.devorch-state.json')}`, 'info');
      log(`  ${join(projectDir, '.devorch-install.lock')}`, 'info');
      log('\nThen run "devorch install" again.', 'info');
      return;
    }

    log('Cleaning up incomplete installation...', 'info');
  }

  const configPath = findConfig(projectDir);
  logger.debug('Config path', { configPath });

  // Check if config exists
  if (!configPath) {
    log("No config found. Let's set up devorch!", 'info');
    const shouldContinue = await promptConfirm('Create devorch/config.yml now?');
    if (!shouldContinue) {
      log('Cancelled. Run "devorch install" when ready.', 'info');
      return;
    }

    // Load config source for init flow
    const source = await loadConfigSource({
      local: options.local,
      version: 'latest',
    });

    try {
      // Run init flow
      await runInitFlow(source.hasteFS, source.sourceConfigDir, process.cwd(), options);
      log('\nNow installing components...', 'info');
    } finally {
      source.cleanup();
    }
  }

  const config = loadConfig(projectDir);

  // Helper to get component count
  const getCount = (arr: unknown) => {
    if (!arr) return 0;
    if (Array.isArray(arr)) return arr.length;
    if (typeof arr === 'object' && arr !== null && 'components' in arr) {
      const obj = arr as { components: unknown[] };
      return obj.components.length;
    }
    return 0;
  };

  logger.debug('Config loaded', {
    agents: config.profile.agents,
    subagents: getCount(config.subagents),
    commands: getCount(config.commands),
  });

  // Create installation lock
  createInstallationLock(projectDir);

  // Load and compile config source
  logger.info('Loading config source', {
    local: options.local,
    version: 'latest',
  });
  const source = await loadConfigSource({
    local: options.local,
    version: 'latest',
    projectDir,
  });
  logger.info('Config source loaded', {
    sourceConfigDir: source.sourceConfigDir,
    hasteFS: {
      subagents: source.hasteFS.getAvailableSubagents().length,
      commands: source.hasteFS.getAvailableCommands().length,
      skills: source.hasteFS.getAvailableSkills().length,
    },
  });

  try {
    // Config is used as-is, no preset resolution needed
    log(`Installing components:`, 'info');
    log(`  Commands: ${config.commands.length}`, 'info');
    if (config.subagents) {
      log(`  Subagents: ${config.subagents.length}`, 'info');
    }
    if (config.skills) {
      log(`  Skills: ${config.skills.length}`, 'info');
    }

    // Clean existing devorch installations
    const s = spinner();
    s.start('Cleaning previous installation...');

    cleanupPreviousInstallation(projectDir, config.profile.agents);

    s.stop('✓ Cleaned previous installation');

    // Install subagents and commands
    // Note: HasteFS was created with sourceConfigDir/templates, so we need to pass the same path
    await install(
      config,
      join(source.sourceConfigDir, 'templates'),
      source.hasteFS,
      source.resolvedVersion,
      projectDir
    );

    // Remove installation lock after successful installation
    removeInstallationLock(projectDir);

    success('✓ Installation complete!');

    // Prompt for local config if it doesn't exist (non-fresh install only)
    const localConfigPath = join(projectDir, 'devorch', 'config.local.yml');
    if (!existsSync(localConfigPath)) {
      // For non-fresh installs, always ensure context-training is set up
      const availableContextTrainings = listContextTrainings(projectDir);

      if (availableContextTrainings.length > 0) {
        // Has context trainings - prompt to select one
        await promptLocalConfigCreation(projectDir, source.sourceConfigDir);
      } else {
        // No context trainings - offer to set up
        log('\n');
        log('💡 Context training not configured', 'info');
        log('   Consider running /analyze-tech-stack then /train-context', 'info');
        log('   This will generate patterns from your codebase', 'info');
      }
    } else {
      // Local config exists - show tip if context-training not configured
      const availableContextTrainings = listContextTrainings(projectDir);
      if (!config.profile.context_training && availableContextTrainings.length === 0) {
        log('\n');
        log('💡 Tip: Consider setting up context-training for better results', 'info');
        log('   Run /analyze-tech-stack then /train-context', 'info');
      }
    }
  } catch (err) {
    // Mark installation as failed
    failInstallation(projectDir, String(err));

    // Remove lock
    removeInstallationLock(projectDir);

    // Re-throw to let global error handler take over
    throw err;
  } finally {
    // Cleanup
    source.cleanup();
  }
}
