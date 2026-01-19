/**
 * Ralph create-specs command
 * Boots Claude to investigate the codebase and write detailed specs
 */

import type { GlobalOptions } from '@/cli/lib/cli/command-registry.js';
import { loadConfig } from '@/cli/lib/config/config-loader.js';
import {
  featureExists,
  formatExistingSpecs,
  getExistingSpecs,
  getSpecsPath,
  renderCreateSpecsPrompt,
  runClaudeHeadless,
  runClaudeInteractive,
} from '@/cli/lib/harness/index.js';
import { flushAndExit } from '@/cli/lib/telemetry/telemetry.js';
import { logger } from '@/utils/logger.js';
import { log, promptConfirm, promptText } from '@/utils/ui.js';

interface CreateSpecsOptions extends GlobalOptions {
  feature?: string;
  headless?: boolean;
  verbose?: boolean;
}

export async function createSpecsCommand(options: CreateSpecsOptions): Promise<void> {
  logger.debug('Ralph create-specs command started', { options });

  // Prompt for feature name if not provided
  let featureName = options.feature;
  if (!featureName) {
    featureName = await promptText('Enter feature name:');
  }

  // Guardrail: Check if feature exists
  if (!featureExists(featureName)) {
    log(`Feature "${featureName}" not found.`, 'error');
    log(`Run \`devorch harness init ${featureName}\` first.`, 'info');
    await flushAndExit(1);
    return;
  }

  const specsPath = getSpecsPath(featureName);
  const isHeadless = options.headless ?? false;

  // Check for existing specs
  const existingSpecs = getExistingSpecs(specsPath);
  let existingSpecsContent = '';

  if (existingSpecs.length > 0) {
    if (isHeadless) {
      // In headless mode, include existing specs without prompting
      existingSpecsContent = formatExistingSpecs(existingSpecs);
      log(`Found ${existingSpecs.length} existing spec file(s), including as context.`, 'info');
    } else {
      log('', 'info');
      log(`Found ${existingSpecs.length} existing spec file(s):`, 'warn');
      for (const spec of existingSpecs) {
        log(`  - ${spec.name}`, 'info');
      }
      log('', 'info');

      const shouldRegenerate = await promptConfirm(
        'Regenerating will overwrite existing specs. Continue?'
      );

      if (!shouldRegenerate) {
        log('Cancelled. Existing specs preserved.', 'info');
        await flushAndExit(0);
        return;
      }

      // Include existing specs in the prompt for context
      existingSpecsContent = formatExistingSpecs(existingSpecs);
      log('Existing specs will be included as context for regeneration.', 'info');
    }
  }

  // Prompt for feature description
  log('', 'info');
  log(
    'Describe this feature - can be a short summary, detailed PRD, or anything in between.',
    'info'
  );
  log('', 'info');
  const description = await promptText('Feature description:');

  log('', 'info');
  if (isHeadless) {
    log(`Starting headless Claude session to create specs for "${featureName}"...`, 'info');
  } else {
    log(`Starting interactive Claude session to create specs for "${featureName}"...`, 'info');
    log('Claude will ask clarifying questions before creating specifications.', 'info');
  }
  log('', 'info');

  // Load and render the template
  let promptContent = renderCreateSpecsPrompt(featureName, description, specsPath);

  // Inject context training exploration if configured
  let contextTrainingName: string | undefined;
  try {
    const config = loadConfig();
    contextTrainingName = config.profile.context_training;
  } catch {
    // Config not found - continue without context training
  }

  if (contextTrainingName) {
    const contextTrainingPath = `devorch/context-training/${contextTrainingName}`;
    const contextPreamble = `## Load Project Context First

**IMPORTANT:** Before investigating, use the Explore subagent to understand project patterns:

\`\`\`
Task tool with subagent_type=Explore:
"Quickly scan ${contextTrainingPath} for key patterns and conventions.
Focus on: component patterns, testing requirements, naming conventions, and domain rules.
Summarize the highlights - don't load everything."
\`\`\`

---

`;
    promptContent = contextPreamble + promptContent;
  }

  // Add headless mode instructions
  if (isHeadless) {
    const headlessInstructions = `
---

## HEADLESS MODE - IMPORTANT

You are running in **headless mode** without user interaction.

**DO NOT use the AskUserQuestion tool.** Instead:
- Make reasonable assumptions based on the feature description
- Document your assumptions in the specs
- Choose sensible defaults for any ambiguous requirements
- Proceed directly to investigating the codebase and writing specs

Skip step 1 (Clarify Requirements) and go straight to step 2 (Investigate the Codebase).
`;
    promptContent = headlessInstructions + promptContent;
  }

  // Append existing specs if present
  if (existingSpecsContent) {
    promptContent = `${promptContent}\n\n${existingSpecsContent}`;
  }

  // Run Claude in appropriate mode
  const exitCode = isHeadless
    ? await runClaudeHeadless(promptContent)
    : await runClaudeInteractive(promptContent);

  if (exitCode === 0) {
    log('', 'info');
    log(`Specs created in: ${specsPath}`, 'success');
    log('', 'info');
    log('Next steps:', 'info');
    log(`  1. Review the specs in ${specsPath}`, 'info');
    log(`  2. Run: devorch harness loop ${featureName}`, 'info');
  } else {
    log('Claude session ended.', 'info');
    log(`Check ${specsPath} for any created specs.`, 'info');
  }
}
