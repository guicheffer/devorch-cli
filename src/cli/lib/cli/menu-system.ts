import * as clack from '@clack/prompts';
import { colors } from '@/utils/colors.js';
import { type CommandMetadata, getCommandsByCategory } from './command-registry.js';

const LOGO = `
  ██████╗ ███████╗██╗   ██╗     ██████╗ ██████╗  ██████╗██╗  ██╗
  ██╔══██╗██╔════╝██║   ██║    ██╔═══██╗██╔══██╗██╔════╝██║  ██║
  ██║  ██║█████╗  ██║   ██║    ██║   ██║██████╔╝██║     ███████║
  ██║  ██║██╔══╝  ╚██╗ ██╔╝    ██║   ██║██╔══██╗██║     ██╔══██║
  ██████╔╝███████╗ ╚████╔╝     ╚██████╔╝██║  ██║╚██████╗██║  ██║
  ╚═════╝ ╚══════╝  ╚═══╝       ╚═════╝ ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
`;

export interface MenuOption {
  value: string;
  label: string;
  hint: string;
}

export type CategoryType = 'setup' | 'manage' | 'troubleshoot';

/**
 * Display the CLI logo and header
 */
export function displayHeader(version: string): void {
  console.clear();
  console.log(colors.red(LOGO));
  console.log(colors.dim('  Multi-Agent Development Workflows for Claude Code\n'));
  console.log(colors.dim(`  Version ${version}\n`));
}

/**
 * Convert command metadata to menu options
 */
function commandsToMenuOptions(commands: CommandMetadata[]): MenuOption[] {
  return commands.map((cmd) => ({
    value: cmd.name,
    label: cmd.description,
    hint: cmd.hint,
  }));
}

/**
 * Show main category menu (Level 1)
 */
export async function showMainMenu(version: string): Promise<string> {
  displayHeader(version);

  clack.intro(colors.red('DevOrch CLI'));
  console.log(colors.dim('  Press Ctrl+C at any time to cancel and return to menu\n'));

  const category = await clack.select({
    message: 'What would you like to do?',
    options: [
      { value: 'setup', label: 'Setup & Install', hint: 'Install, Bedrock setup, switch models' },
      { value: 'manage', label: 'Manage', hint: 'Check version, update templates' },
      {
        value: 'troubleshoot',
        label: 'Troubleshooting',
        hint: 'Diagnose, debug Bedrock, count tokens',
      },
      { value: 'exit', label: 'Exit', hint: '' },
    ],
  });

  if (clack.isCancel(category)) {
    return 'exit';
  }

  // Route to sub-menu based on category
  switch (category) {
    case 'setup':
      return await showCategoryMenu('setup');
    case 'manage':
      return await showCategoryMenu('manage');
    case 'troubleshoot':
      return await showCategoryMenu('troubleshoot');
    case 'exit':
      return 'exit';
    default:
      return 'back';
  }
}

/**
 * Show a category-specific menu (Level 2)
 */
export async function showCategoryMenu(category: CategoryType): Promise<string> {
  const commands = getCommandsByCategory(category);
  const options = commandsToMenuOptions(commands);

  // Add back button
  options.push({ value: 'back', label: '← Back to main menu', hint: '' });

  // Capitalize category for display
  const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);

  const action = await clack.select({
    message: `${categoryLabel}:`,
    options,
  });

  if (clack.isCancel(action)) {
    return 'back';
  }

  return action as string;
}

/**
 * Wait for user to press enter before continuing
 */
export async function waitForEnter(message = 'Press Enter to return to menu'): Promise<void> {
  console.log('');
  await clack.text({
    message,
    placeholder: '',
    validate: () => undefined, // Accept any input
  });
}

/**
 * Show outro message
 */
export function showOutro(message: string, color: 'green' | 'yellow' = 'green'): void {
  console.log('');
  clack.outro(colors[color](message));
}
