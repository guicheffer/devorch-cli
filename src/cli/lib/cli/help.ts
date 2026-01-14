import { colors } from '@/utils/colors.js';

const LOGO = `
  ███████╗██████╗ ███████╗ ██████╗    ███╗   ███╗ █████╗  ██████╗██╗  ██╗██╗███╗   ██╗███████╗
  ██╔════╝██╔══██╗██╔════╝██╔════╝    ████╗ ████║██╔══██╗██╔════╝██║  ██║██║████╗  ██║██╔════╝
  ███████╗██████╔╝█████╗  ██║         ██╔████╔██║███████║██║     ███████║██║██╔██╗ ██║█████╗
  ╚════██║██╔═══╝ ██╔══╝  ██║         ██║╚██╔╝██║██╔══██║██║     ██╔══██║██║██║╚██╗██║██╔══╝
  ███████║██║     ███████╗╚██████╗    ██║ ╚═╝ ██║██║  ██║╚██████╗██║  ██║██║██║ ╚████║███████╗
  ╚══════╝╚═╝     ╚══════╝ ╚═════╝    ╚═╝     ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝╚══════╝
`;

/**
 * Display help information
 */
export function showHelp(version: string): void {
  console.log(colors.red(LOGO));
  console.log(colors.bold('DevOrch CLI'));
  console.log(colors.dim(`Version ${version}\n`));
  console.log('Usage:');
  console.log('  devorch              Start interactive menu');
  console.log('  devorch <command>    Run a specific command\n');
  console.log('Commands:');
  console.log('  install                   Setup and install devorch');
  console.log('                            (creates config if missing, then installs)');
  console.log('  diagnose                  Show installation status and run health checks');
  console.log('  count-tokens <dir>        Count tokens in a directory');
  console.log('  update                    Update CLI and install updated templates');
  console.log('  check-version             Check if CLI and templates are up-to-date\n');
  console.log('Options:');
  console.log('  --local <path>            Use local devorch repository');
  console.log('  --agent <agent>           Pre-select AI agent (install only)');
  console.log('  --ci                      Auto-confirm all prompts (for CI/automation)');
  console.log('  --debug                   Enable debug mode with verbose logging');
  console.log('  --verbose                 Enable verbose output');
  console.log('  --quiet                   Minimize output (errors only)');
  console.log('  --help                    Show this help');
  console.log('  --version                 Show version\n');
  console.log('Examples:');
  console.log('  devorch                              Start interactive menu');
  console.log('  devorch install                      Setup and install devorch');
  console.log('  devorch install --debug              Install with debug logging');
  console.log('  devorch install --local ~/devorch    Install with local templates');
  console.log('  devorch diagnose                     Check installation health');
  console.log('  devorch update                       Update CLI and templates\n');
  console.log('Configuration:');
  console.log('  Edit devorch.config.yml to add/remove components, then run install\n');
}

/**
 * Display version information
 */
export function showVersion(version: string): void {
  console.log(version);
}
