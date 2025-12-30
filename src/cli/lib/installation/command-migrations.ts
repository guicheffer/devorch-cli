/**
 * Maps old command/subagent/skill names to their new names
 * Used to provide helpful migration messages when old names are referenced
 */

export const COMMAND_MIGRATIONS: Record<string, string> = {
  '/new-spec': '/gather-requirements',
  '/ux-change-native': '/design-change-native',
  '/ux-change-web': '/design-change-web',
  '/ux-verify-figma-file': '/verify-figma-file',
  '/train-context-2': '/train-context',
  '/verify-figma-file': '/zest-check',
  '/jira-verify-figma-file': '/jira-zest-check',
};

export const SUBAGENT_MIGRATIONS: Record<string, string> = {
  'specification/role-mapper': 'implementation/domain-mapper',
  'specification/tasks-list-creator': 'implementation/tasks-list-creator',
  'implementation/role-mapper': 'implementation/domain-mapper',
};

export const SKILL_MIGRATIONS: Record<string, string> = {
  // Web skill migrations - both / and - formats supported
  // Old slash format (ui-design-system/skill-name)
  'ui-design-system/web-accessibility': 'ui-design-system-web-accessibility',
  'ui-design-system/styled-components-patterns': 'ui-design-system-web-styled-components',
  'ui-design-system/zest-web-integration': 'ui-design-system-web-zest-integration',
  'ui-design-system/zest-components-web-patterns': 'ui-design-system-web-zest-components',
  'ui-design-system/zest-component-creation-web': 'ui-design-system-web-zest-component-creation',
  // Old dash format (ui-design-system-skill-name)
  'ui-design-system-web-accessibility': 'ui-design-system-web-accessibility',
  'ui-design-system-styled-components-patterns': 'ui-design-system-web-styled-components',
  'ui-design-system-zest-web-integration': 'ui-design-system-web-zest-integration',
  'ui-design-system-zest-components-web-patterns': 'ui-design-system-web-zest-components',
  'ui-design-system-zest-component-creation-web': 'ui-design-system-web-zest-component-creation',

  // React Native skill migrations - both / and - formats supported
  // Old slash format (ui-design-system/skill-name)
  'ui-design-system/rn-accessibility': 'ui-design-system-rn-accessibility',
  'ui-design-system/styling-patterns': 'ui-design-system-rn-styling-patterns',
  'ui-design-system/zest-integration': 'ui-design-system-rn-zest-integration',
  'ui-design-system/zest-components': 'ui-design-system-rn-zest-components',
  'ui-design-system/zest-component-creation-native': 'ui-design-system-rn-zest-component-creation',
  'ui-design-system/responsive-design': 'ui-design-system-rn-responsive-design',
  'ui-design-system/images': 'ui-design-system-rn-images',
  // Old dash format (ui-design-system-skill-name)
  'ui-design-system-rn-accessibility': 'ui-design-system-rn-accessibility',
  'ui-design-system-styling-patterns': 'ui-design-system-rn-styling-patterns',
  'ui-design-system-zest-integration': 'ui-design-system-rn-zest-integration',
  'ui-design-system-zest-components': 'ui-design-system-rn-zest-components',
  'ui-design-system-zest-component-creation-native': 'ui-design-system-rn-zest-component-creation',
  'ui-design-system-responsive-design': 'ui-design-system-rn-responsive-design',
  'ui-design-system-images': 'ui-design-system-rn-images',
};

/**
 * Get migration suggestion for a command
 */
export function getMigratedCommand(oldName: string): string | undefined {
  return COMMAND_MIGRATIONS[oldName];
}

/**
 * Get migration suggestion for a subagent
 */
export function getMigratedSubagent(oldName: string): string | undefined {
  return SUBAGENT_MIGRATIONS[oldName];
}

/**
 * Get migration suggestion for a skill
 */
export function getMigratedSkill(oldName: string): string | undefined {
  return SKILL_MIGRATIONS[oldName];
}

export interface MigrationResult {
  commandMigrations: Array<{ from: string; to: string }>;
  subagentMigrations: Array<{ from: string; to: string }>;
  skillMigrations: Array<{ from: string; to: string }>;
}

/**
 * Apply all name migrations to a config upfront.
 * This should be called BEFORE dependency resolution to prevent errors.
 */
export function applyNameMigrations<
  T extends {
    commands: Array<{ name: string } | string>;
    subagents?: Array<{ name: string } | string>;
    skills?: Array<{ name: string } | string>;
  },
>(config: T): { config: T; migrations: MigrationResult } {
  const migrations: MigrationResult = {
    commandMigrations: [],
    subagentMigrations: [],
    skillMigrations: [],
  };

  // Helper to get name from object or string
  const getName = (item: { name: string } | string): string =>
    typeof item === 'string' ? item : item.name;

  // Helper to update name in object or string
  const updateName = <U extends { name: string } | string>(item: U, newName: string): U => {
    if (typeof item === 'string') {
      return newName as U;
    }
    // TypeScript needs explicit object handling for spread
    const obj = item as { name: string };
    return { ...obj, name: newName } as U;
  };

  // Migrate commands
  const migratedCommands = config.commands.map((cmd) => {
    const name = getName(cmd);
    const newName = getMigratedCommand(name);
    if (newName && newName !== name) {
      migrations.commandMigrations.push({ from: name, to: newName });
      return updateName(cmd, newName);
    }
    return cmd;
  });

  // Migrate subagents
  const migratedSubagents = config.subagents?.map((sub) => {
    const name = getName(sub);
    const newName = getMigratedSubagent(name);
    if (newName && newName !== name) {
      migrations.subagentMigrations.push({ from: name, to: newName });
      return updateName(sub, newName);
    }
    return sub;
  });

  // Migrate skills
  const migratedSkills = config.skills?.map((skill) => {
    const name = getName(skill);
    const newName = getMigratedSkill(name);
    if (newName && newName !== name) {
      migrations.skillMigrations.push({ from: name, to: newName });
      return updateName(skill, newName);
    }
    return skill;
  });

  // Deduplicate arrays (keep first occurrence, which preserves enabled status)
  const dedupeByName = <U extends { name: string } | string>(items: U[]): U[] => {
    const seen = new Set<string>();
    return items.filter((item) => {
      const name = getName(item);
      if (seen.has(name)) return false;
      seen.add(name);
      return true;
    });
  };

  return {
    config: {
      ...config,
      commands: dedupeByName(migratedCommands),
      subagents: migratedSubagents ? dedupeByName(migratedSubagents) : undefined,
      skills: migratedSkills ? dedupeByName(migratedSkills) : undefined,
    },
    migrations,
  };
}
