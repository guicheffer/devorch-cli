/**
 * Version check utilities - simplified to just determine blocking and messages
 */

export const UPDATE_TYPES = {
  NONE: 'none',
  PATCH: 'patch',
  MINOR: 'minor',
  MAJOR: 'major',
} as const;

export type UpdateType = (typeof UPDATE_TYPES)[keyof typeof UPDATE_TYPES];

/** Returns true if this update should block execution */
export function isBlockingUpdate(cliUpdateType: UpdateType): boolean {
  return cliUpdateType === UPDATE_TYPES.MAJOR;
}

/** Generate user message based on update types */
export function getUpdateMessage(
  cliUpdateType: UpdateType,
  templatesUpdateType: UpdateType,
  latestVersion: string
): string | undefined {
  if (cliUpdateType === UPDATE_TYPES.MAJOR) {
    return 'Major update required. Run `devorch update` and restart.';
  }
  if (cliUpdateType === UPDATE_TYPES.MINOR) {
    return `CLI update available (${latestVersion}). Run \`devorch update\` after this task.`;
  }
  if (templatesUpdateType !== UPDATE_TYPES.NONE) {
    return 'Template update available. Run `devorch install` after this task.';
  }
  return undefined;
}
