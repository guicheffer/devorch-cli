import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { findConfig, loadConfig } from '@/cli/lib/config/config-loader.js';
import { countCustomAssets } from '@/cli/lib/discovery/asset-scanner.js';
import { getProjectDir, INSTALL_PATHS } from '@/cli/lib/filesystem/paths.js';
import { colors } from '@/utils/colors.js';
import { countTokensInDirectory, formatTokenCount } from '@/utils/token-counter.js';
import { intro, log, outro, spinner } from '@/utils/ui.js';

interface InstallationState {
  templateVersion?: string;
  installedAt?: string;
  configHash?: string;
}

interface DiagnosticCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn' | 'skip';
  message: string;
  fix?: string;
}

/**
 * Load installation state if it exists
 */
function loadState(projectDir: string): InstallationState | null {
  const statePath = join(projectDir, INSTALL_PATHS.stateFile());
  if (!existsSync(statePath)) {
    return null;
  }

  try {
    const stateContent = readFileSync(statePath, 'utf-8');
    return JSON.parse(stateContent);
  } catch (_err) {
    return null;
  }
}

/**
 * Calculate context token count of installed components
 */
function calculateContextTokens(projectDir: string): number {
  let totalTokens = 0;

  totalTokens += countTokensInDirectory(join(projectDir, INSTALL_PATHS.claudeAgents()));
  totalTokens += countTokensInDirectory(join(projectDir, INSTALL_PATHS.claudeCommands()));

  return totalTokens;
}

/**
 * Count installed components
 */
function countInstalledComponents(projectDir: string): {
  subagents: number;
  commands: number;
  skills: number;
} {
  let subagents = 0;
  let commands = 0;
  let skills = 0;

  const agentsDir = join(projectDir, INSTALL_PATHS.claudeAgents());
  if (existsSync(agentsDir)) {
    const files = readdirSync(agentsDir);
    subagents += files.filter((f: string) => f.endsWith('.md')).length;
  }

  const commandsDir = join(projectDir, INSTALL_PATHS.claudeCommands());
  if (existsSync(commandsDir)) {
    const files = readdirSync(commandsDir);
    commands += files.filter((f: string) => f.endsWith('.md')).length;
  }

  const skillsDir = join(projectDir, INSTALL_PATHS.claudeSkills());
  if (existsSync(skillsDir)) {
    const files = readdirSync(skillsDir);
    skills += files.filter((f: string) => f.endsWith('.md')).length;
  }

  return { subagents, commands, skills };
}

/**
 * Check if installation is out of date
 */
function isOutOfDate(installedAt?: string): boolean {
  if (!installedAt) return false;

  const installed = new Date(installedAt);
  const now = new Date();
  const daysSinceInstall = Math.floor(
    (now.getTime() - installed.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Consider installation out of date if older than 30 days
  return daysSinceInstall > 30;
}

/**
 * Run diagnostic checks
 */
function runDiagnosticChecks(projectDir: string, configPath: string | null): DiagnosticCheck[] {
  const checks: DiagnosticCheck[] = [];

  // Check 1: Config file exists
  if (!configPath) {
    checks.push({
      name: 'Configuration file',
      status: 'fail',
      message: 'No devorch.config.yml found',
      fix: 'Run "devorch install" to create a config file',
    });
    return checks; // Can't continue without config
  }

  checks.push({
    name: 'Configuration file',
    status: 'pass',
    message: `Found at ${configPath}`,
  });

  // Check 2: Config is valid
  try {
    const config = loadConfig(projectDir);
    checks.push({
      name: 'Configuration validity',
      status: 'pass',
      message: 'Config file is valid',
    });

    // Check 3: Installation directories exist
    let missingDirs = 0;

    const agentsDir = join(projectDir, INSTALL_PATHS.claudeAgents());
    const commandsDir = join(projectDir, INSTALL_PATHS.claudeCommands());

    if (!existsSync(agentsDir)) missingDirs++;
    if (!existsSync(commandsDir)) missingDirs++;

    if (missingDirs > 0) {
      checks.push({
        name: 'Installation directories',
        status: 'warn',
        message: `${missingDirs} expected directories are missing`,
        fix: 'Run "devorch install" to create missing directories',
      });
    } else {
      checks.push({
        name: 'Installation directories',
        status: 'pass',
        message: 'All expected directories exist',
      });
    }

    // Check 4: Installed components exist
    const expectedSubagents = config.subagents?.length ?? 0;
    const expectedCommands = config.commands?.length ?? 0;
    let foundSubagents = 0;
    let foundCommands = 0;

    if (existsSync(agentsDir)) {
      const files = readdirSync(agentsDir);
      foundSubagents += files.filter((f: string) => f.endsWith('.md')).length;
    }

    if (existsSync(commandsDir)) {
      const files = readdirSync(commandsDir);
      foundCommands += files.filter((f: string) => f.endsWith('.md')).length;
    }

    if (foundSubagents < expectedSubagents || foundCommands < expectedCommands) {
      checks.push({
        name: 'Installed components',
        status: 'warn',
        message: `Expected ${expectedSubagents} subagents and ${expectedCommands} commands, found ${foundSubagents} and ${foundCommands}`,
        fix: 'Run "devorch install" to install missing components',
      });
    } else {
      checks.push({
        name: 'Installed components',
        status: 'pass',
        message: `All ${expectedSubagents} subagents and ${expectedCommands} commands installed`,
      });
    }

    // Check 5: Context token count
    const totalTokens = calculateContextTokens(projectDir);
    const formattedTokens = formatTokenCount(totalTokens);

    if (totalTokens > 125000) {
      checks.push({
        name: 'Context size',
        status: 'warn',
        message: `Installation size: ${formattedTokens} tokens`,
        fix: 'Consider removing unused components from config',
      });
    } else {
      checks.push({
        name: 'Context size',
        status: 'pass',
        message: `Installation size: ${formattedTokens} tokens`,
      });
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    checks.push({
      name: 'Configuration validity',
      status: 'fail',
      message: `Invalid config: ${errorMessage}`,
      fix: 'Fix errors in devorch.config.yml',
    });
    return checks; // Can't continue with invalid config
  }

  // Check 6: GitHub CLI authentication
  try {
    execSync('gh auth status', { stdio: 'pipe' });
    checks.push({
      name: 'GitHub CLI',
      status: 'pass',
      message: 'GitHub CLI is installed and authenticated',
    });
  } catch (_err) {
    checks.push({
      name: 'GitHub CLI',
      status: 'warn',
      message: 'GitHub CLI not authenticated',
      fix: 'Run "gh auth login" to authenticate',
    });
  }

  // Check 7: Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0] ?? '0', 10);
  if (majorVersion < 18) {
    checks.push({
      name: 'Node.js version',
      status: 'fail',
      message: `Node.js ${nodeVersion} detected (minimum: v18.0.0)`,
      fix: 'Upgrade to Node.js 18 or higher',
    });
  } else {
    checks.push({
      name: 'Node.js version',
      status: 'pass',
      message: `Node.js ${nodeVersion}`,
    });
  }

  return checks;
}

/**
 * Display diagnostic results
 */
function displayDiagnosticResults(checks: DiagnosticCheck[]) {
  console.log('');
  log('Diagnostic Results:', 'info');
  console.log('');

  for (const check of checks) {
    let icon = '';
    let color = (text: string) => text;

    switch (check.status) {
      case 'pass':
        icon = colors.green('✓');
        color = colors.green;
        break;
      case 'fail':
        icon = colors.red('✗');
        color = colors.red;
        break;
      case 'warn':
        icon = colors.yellow('⚠');
        color = colors.yellow;
        break;
      case 'skip':
        icon = colors.dim('○');
        color = colors.dim;
        break;
    }

    console.log(`${icon} ${colors.bold(check.name)}`);
    console.log(`  ${color(check.message)}`);
    if (check.fix) {
      console.log(`  ${colors.dim(`Fix: ${check.fix}`)}`);
    }
    console.log('');
  }

  // Summary
  const passed = checks.filter((c) => c.status === 'pass').length;
  const failed = checks.filter((c) => c.status === 'fail').length;
  const warnings = checks.filter((c) => c.status === 'warn').length;

  if (failed > 0) {
    outro(colors.red(`${failed} critical issues found`));
  } else if (warnings > 0) {
    outro(colors.yellow(`${passed} checks passed, ${warnings} warnings`));
  } else {
    outro(colors.green('All checks passed!'));
  }
}

/**
 * Display installation status overview
 */
function displayStatusOverview(projectDir: string, _configPath: string) {
  const config = loadConfig(projectDir);
  const state = loadState(projectDir);
  const VERSION = process.env.BUILD_VERSION || 'dev';

  console.log('');
  log('Installation Overview:', 'info');
  console.log('');

  // CLI Version
  log(`${colors.bold('CLI Version:')} ${VERSION}`, 'info');

  // Template version (from state)
  const templateVersion = state?.templateVersion || 'not installed';
  log(`${colors.bold('Template Version:')} ${templateVersion}`, 'info');

  // Installation date
  if (state?.installedAt) {
    const installedDate = new Date(state.installedAt);
    const dateStr = installedDate.toLocaleDateString();
    const timeStr = installedDate.toLocaleTimeString();
    log(`${colors.bold('Last Installation:')} ${dateStr} at ${timeStr}`, 'info');

    if (isOutOfDate(state.installedAt)) {
      log(
        `${colors.yellow('⚠')} Installation is more than 30 days old - consider updating`,
        'warn'
      );
    }
  }

  console.log('');

  // Profile information
  log(`${colors.bold('Profile:')} ${config.profile.name}`, 'info');
  if (config.profile.description) {
    log(`${colors.bold('Description:')} ${config.profile.description}`, 'info');
  }

  // Agents
  const agentsStr = config.profile.agents.join(', ');
  log(`${colors.bold('Agents:')} ${agentsStr}`, 'info');

  console.log('');

  // Installed components
  const installed = countInstalledComponents(projectDir);
  log(`${colors.bold('Installed Components:')}`, 'info');
  log(`  Subagents: ${installed.subagents}`, 'info');
  log(`  Commands: ${installed.commands}`, 'info');
  log(`  Skills: ${installed.skills}`, 'info');

  console.log('');

  // Context token count
  const totalTokens = calculateContextTokens(projectDir);

  log(`${colors.bold('Context Size:')}`, 'info');
  log(`  Installation: ${formatTokenCount(totalTokens)} tokens`, 'info');

  console.log('');

  // Installation paths
  log(`${colors.bold('Installation Paths:')}`, 'info');
  log(`  Claude Agents: ${INSTALL_PATHS.claudeAgents()}`, 'info');
  log(`  Claude Commands: ${INSTALL_PATHS.claudeCommands()}`, 'info');
  log(`  Claude Skills: ${INSTALL_PATHS.claudeSkills()}`, 'info');

  console.log('');

  // Custom assets
  try {
    const customCount = countCustomAssets(projectDir);

    if (customCount > 0) {
      log(`${colors.bold('Custom Assets:')}`, 'info');
      log(`  Found ${customCount} custom assets in your project`, 'info');
      console.log('');
    }
  } catch (_error) {
    // Silently skip if scanning fails
  }
}

/**
 * Diagnose devorch installation (combines status + doctor)
 */
export async function diagnoseCommand() {
  intro('Diagnose - Installation Status & Health Checks');

  const projectDir = getProjectDir();
  const configPath = findConfig(projectDir);

  if (!configPath) {
    log('No devorch installation found', 'warn');
    outro(colors.yellow('Run "devorch install" to get started'));
    return;
  }

  // Display status overview
  displayStatusOverview(projectDir, configPath);

  // Run diagnostic checks
  const s = spinner();
  s.start('Running health checks...');

  const checks = runDiagnosticChecks(projectDir, configPath);

  s.stop('Health checks complete');

  // Display diagnostic results
  displayDiagnosticResults(checks);
}
