import * as clack from '@clack/prompts';
import { colors } from './colors.js';
import { UserError } from './errors.js';

/**
 * Display a colored message
 */
export function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
  switch (type) {
    case 'info':
      clack.log.info(message);
      break;
    case 'success':
      clack.log.success(colors.green(message));
      break;
    case 'error':
      clack.log.error(colors.red(message));
      break;
    case 'warn':
      clack.log.warn(colors.yellow(message));
      break;
  }
}

/**
 * Display a success message
 */
export function success(message: string) {
  clack.outro(colors.green(message));
}

/**
 * Create a spinner
 */
export function spinner() {
  return clack.spinner();
}

/**
 * Prompt for text input
 */
export async function promptText(message: string, defaultValue?: string): Promise<string> {
  const result = await clack.text({
    message,
    placeholder: defaultValue,
    defaultValue,
  });

  if (clack.isCancel(result)) {
    throw UserError.cancelled();
  }

  return result as string;
}

/**
 * Prompt for selection
 */
export async function promptSelect<T extends string>(
  message: string,
  options: { value: T; label: string; hint?: string }[]
): Promise<T> {
  const result = await clack.select({
    message,
    options,
  });

  if (clack.isCancel(result)) {
    throw UserError.cancelled();
  }

  return result as T;
}

/**
 * Prompt for multi-select
 */
export async function promptMultiSelect<T extends string>(
  message: string,
  options: { value: T; label: string; hint?: string }[],
  required = true,
  initialValues?: T[]
): Promise<T[]> {
  const result = await clack.multiselect({
    message,
    options: options as any,
    required,
    initialValues,
  });

  if (clack.isCancel(result)) {
    throw UserError.cancelled();
  }

  return result as T[];
}

/**
 * Prompt for confirmation
 */
export async function promptConfirm(message: string): Promise<boolean> {
  const result = await clack.confirm({
    message,
  });

  if (clack.isCancel(result)) {
    throw UserError.cancelled();
  }

  return result as boolean;
}

/**
 * Display intro message
 */
export function intro(message: string) {
  clack.intro(colors.red(message));
}

/**
 * Display outro message
 */
export function outro(message: string) {
  clack.outro(message);
}
