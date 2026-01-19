/**
 * Ralph list command
 * Lists all existing features in the ralph directory
 */

import type { GlobalOptions } from '@/cli/lib/cli/command-registry.js';
import { getFeatureInfo, getStatusIcon, listFeatures } from '@/cli/lib/harness/index.js';
import { logger } from '@/utils/logger.js';
import { log } from '@/utils/ui.js';

export async function listCommand(_options: GlobalOptions): Promise<void> {
  logger.debug('Ralph list command started');

  const features = listFeatures();

  if (features.length === 0) {
    log('No features found.', 'info');
    log('', 'info');
    log('Create a new feature with:', 'info');
    log('  devorch harness init <feature-name>', 'info');
    return;
  }

  console.log('');
  console.log(`Found ${features.length} feature(s):\n`);

  for (const feature of features) {
    const info = getFeatureInfo(feature);
    const statusIcon = getStatusIcon(info.status);
    const specsInfo = info.specsCount > 0 ? `${info.specsCount} specs` : 'no specs';
    const logsInfo = info.logsCount > 0 ? `${info.logsCount} iterations` : 'no iterations';

    console.log(`  ${statusIcon} ${feature}`);
    console.log(`     ${specsInfo}, ${logsInfo}`);
    console.log('');
  }

  console.log('Commands:');
  console.log('  devorch harness status <feature>   - View detailed progress');
  console.log('  devorch harness loop <feature>     - Start/resume the loop');
}
