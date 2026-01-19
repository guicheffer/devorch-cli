/**
 * Template loading and rendering for Harness commands
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Mustache from 'mustache';

/**
 * Directory containing ralph templates
 */
const TEMPLATES_DIR = join(__dirname, 'templates');

/**
 * Available template names
 */
export type TemplateName =
  | 'ascii-art.txt'
  | 'PLAN.template.md'
  | 'PROMPT.template.md'
  | 'create-specs-prompt.md'
  | 'iteration-report.template.md';

/**
 * Load a raw template file
 */
export function loadTemplate(name: TemplateName): string {
  const templatePath = join(TEMPLATES_DIR, name);
  return readFileSync(templatePath, 'utf-8');
}

/**
 * Load and render a template with Mustache
 */
export function renderTemplate(name: TemplateName, context: Record<string, string>): string {
  const template = loadTemplate(name);
  return Mustache.render(template, context);
}

/**
 * Get the ASCII art banner
 */
export function getAsciiArt(): string {
  return loadTemplate('ascii-art.txt');
}

/**
 * Render the PROMPT.md template for a feature
 */
export function renderPromptTemplate(featureName: string, contextTrainingName: string): string {
  return renderTemplate('PROMPT.template.md', {
    FEATURE_NAME: featureName,
    HARNESS_DIR: `devorch/harness/${featureName}`,
    CONTEXT_TRAINING_PATH: `devorch/context-training/${contextTrainingName}`,
  });
}

/**
 * Render the PLAN.md template for a feature
 */
export function renderPlanTemplate(featureName: string): string {
  return renderTemplate('PLAN.template.md', {
    FEATURE_NAME: featureName,
  });
}

/**
 * Render the create-specs prompt template
 */
export function renderCreateSpecsPrompt(
  featureName: string,
  description: string,
  specsPath: string
): string {
  return renderTemplate('create-specs-prompt.md', {
    FEATURE_NAME: featureName,
    DESCRIPTION: description,
    SPECS_PATH: specsPath,
  });
}

/**
 * Render the iteration report template
 */
export function renderIterationReport(context: {
  iterationNumber: string;
  timestamp: string;
  taskId: string;
  taskName: string;
  status: string;
}): string {
  return renderTemplate('iteration-report.template.md', {
    ITERATION_NUMBER: context.iterationNumber,
    TIMESTAMP: context.timestamp,
    TASK_ID: context.taskId,
    TASK_NAME: context.taskName,
    STATUS: context.status,
  });
}
