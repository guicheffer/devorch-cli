/**
 * Shared utilities for formatting list command outputs
 */

import { colors } from './colors.js';

export interface ListItem {
  name: string;
  description: string;
  version?: string;
  installed: boolean;
  installedPaths?: string[];
  metadata?: Record<string, string>;
}

/**
 * Format and display a list of items
 */
export function displayList(items: ListItem[], itemType: string) {
  if (items.length === 0) {
    console.log(colors.yellow(`\n  No ${itemType} found.\n`));
    return;
  }

  console.log(`\n  Found ${items.length} ${itemType}${items.length === 1 ? '' : 's'}:\n`);

  for (const item of items) {
    const status = item.installed ? colors.green('✓') : colors.dim('○');
    const version = item.version ? colors.dim(`v${item.version}`) : '';

    console.log(`  ${status} ${colors.bold(item.name)} ${version}`);
    console.log(`     ${colors.dim(item.description)}`);

    // Display additional metadata if present
    if (item.metadata) {
      for (const [key, value] of Object.entries(item.metadata)) {
        if (value) {
          console.log(`     ${colors.dim(`${key}: ${value}`)}`);
        }
      }
    }

    // Show installation paths
    if (item.installed && item.installedPaths && item.installedPaths.length > 0) {
      for (const path of item.installedPaths) {
        console.log(`     ${colors.green(`Installed at: ${path}`)}`);
      }
    }

    console.log('');
  }
}

/**
 * Display legend for list output
 */
export function displayLegend() {
  console.log(colors.dim('  Legend:'));
  console.log(colors.dim(`    ${colors.green('✓')} Installed`));
  console.log(colors.dim(`    ${colors.dim('○')} Available\n`));
}

/**
 * Display installation instructions
 */
export function displayInstallInstructions(hasUninstalled: boolean) {
  if (hasUninstalled) {
    console.log(colors.dim('  To install, add items to your devorch.config.yml'));
    console.log(colors.dim('  and run: devorch install\n'));
  }
}
