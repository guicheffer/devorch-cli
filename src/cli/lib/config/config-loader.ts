import { join } from 'node:path';
import type { ZodError } from 'zod';
import { type Config, configSchema, validateConfig as validateConfigStructure } from '@/schemas';
import type { Skill } from '@/schemas/config';
import { colors } from '@/utils/colors.js';
import { UserError, ValidationError } from '@/utils/errors.js';
import { fileExists, readFile } from '@/utils/files.js';
import { logger } from '@/utils/logger.js';
import { parseYaml } from '@/utils/yaml.js';
import { contextTrainingExists } from '../context-training/context-training-loader.js';
import { getProjectDir } from '../filesystem/paths.js';
import { migrateConfigFormat, type RawConfig } from '../installation/config-format-migration.js';

const CONFIG_FILENAMES = ['devorch.config.yml', 'devorch.config.yaml'];
const CONFIG_FILENAMES_IN_DEVORCH_DIR = ['config.yml', 'config.yaml'];
const LOCAL_CONFIG_FILENAMES = ['config.local.yml', 'config.local.yaml'];

/**
 * Find config file in specified directory
 * Search order:
 * 1. devorch.config.yml in project root (primary)
 * 2. devorch/config.yml (secondary)
 */
export function findConfig(projectDir?: string): string | null {
  const cwd = getProjectDir(projectDir);
  logger.debug('Searching for config file', { cwd, filenames: CONFIG_FILENAMES });

  // First, check project root for devorch.config.yml
  for (const filename of CONFIG_FILENAMES) {
    const configPath = join(cwd, filename);
    if (fileExists(configPath)) {
      logger.debug('Found config file in project root', { configPath });
      return configPath;
    }
  }

  // Then, check devorch/ directory for config.yml
  const specMachineDir = join(cwd, 'devorch');
  for (const filename of CONFIG_FILENAMES_IN_DEVORCH_DIR) {
    const configPath = join(specMachineDir, filename);
    if (fileExists(configPath)) {
      logger.debug('Found config file in devorch directory', { configPath });
      return configPath;
    }
  }

  logger.debug('No config file found', {
    searchedPaths: [
      ...CONFIG_FILENAMES.map((f) => join(cwd, f)),
      ...CONFIG_FILENAMES_IN_DEVORCH_DIR.map((f) => join(specMachineDir, f)),
    ],
  });
  return null;
}

/**
 * Find local config file in devorch directory
 */
function findLocalConfig(projectDir?: string): string | null {
  const cwd = getProjectDir(projectDir);
  const specMachineDir = join(cwd, 'devorch');
  logger.debug('Searching for local config file', {
    specMachineDir,
    filenames: LOCAL_CONFIG_FILENAMES,
  });

  for (const filename of LOCAL_CONFIG_FILENAMES) {
    const configPath = join(specMachineDir, filename);
    if (fileExists(configPath)) {
      logger.debug('Found local config file', { configPath });
      return configPath;
    }
  }

  logger.debug('No local config file found');
  return null;
}

/**
 * Deep merge two objects (local overrides base)
 */
function deepMerge<T extends Record<string, unknown>>(
  base: T | undefined,
  override: Partial<T> | undefined
): T {
  if (!override) return base as T;
  if (!base) return override as T;

  const result = { ...base } as Record<string, unknown>;

  for (const key in override) {
    const overrideValue = override[key];
    if (overrideValue && typeof overrideValue === 'object' && !Array.isArray(overrideValue)) {
      result[key] = deepMerge(
        base[key] as Record<string, unknown>,
        overrideValue as Record<string, unknown>
      );
    } else {
      result[key] = overrideValue;
    }
  }

  return result as T;
}

/**
 * Environment variable override mappings
 * Maps env var names to config paths
 */
const ENV_VAR_OVERRIDES: Record<string, string[]> = {
  DEVORCH_CONTEXT_TRAINING: ['profile', 'context_training'],
  DEVORCH_VERSION: ['profile', 'version'],
  DEVORCH_NAME: ['profile', 'name'],
  DEVORCH_DESCRIPTION: ['profile', 'description'],
};

/**
 * Apply environment variable overrides to config
 */
function applyEnvVarOverrides(config: Config): Config {
  const overrides: Record<string, string> = {};

  for (const [envVar, path] of Object.entries(ENV_VAR_OVERRIDES)) {
    const value = process.env[envVar];
    if (value !== undefined) {
      overrides[envVar] = value;

      // Apply override by traversing path
      let target: any = config;
      for (let i = 0; i < path.length - 1; i++) {
        target = target[path[i]];
      }
      target[path[path.length - 1]] = value;

      logger.debug('Applied env var override', { envVar, path: path.join('.'), value });
    }
  }

  if (Object.keys(overrides).length > 0) {
    logger.info('Config overridden by environment variables', { overrides });
  }

  return config;
}

/**
 * Load and validate ONLY the versioned config file (without local config merge)
 * Use this when you need to write back to the config file to avoid polluting
 * the versioned config with local-only overrides like context_training
 */
export function loadVersionedConfigOnly(projectDir?: string): Config {
  const cwd = getProjectDir(projectDir);
  logger.debug('Loading versioned config only (no local merge)', { projectDir: cwd });

  const configPath = findConfig(projectDir);

  if (!configPath) {
    const searchedPaths = CONFIG_FILENAMES.map((f) => join(cwd, f));
    logger.error('Config file not found', { searchedPaths });
    throw UserError.configNotFound(searchedPaths);
  }

  try {
    logger.debug('Reading config file', { configPath });
    const content = readFile(configPath);

    // Check if empty
    if (!content || content.trim() === '') {
      logger.error('Config file is empty', { configPath });
      throw ValidationError.emptyConfig(configPath);
    }

    // Parse YAML
    let data: any;
    try {
      logger.debug('Parsing YAML config');
      data = parseYaml(content);
    } catch (yamlErr) {
      logger.error('YAML parsing failed', { configPath, error: (yamlErr as Error).message });
      throw UserError.invalidYaml(configPath, (yamlErr as Error).message);
    }

    // Apply format migration BEFORE schema validation
    logger.debug('Checking for config format migration');
    const migrationResult = migrateConfigFormat(data as RawConfig);
    data = migrationResult.config;

    // Validate with Zod schema
    let config: Config;
    try {
      logger.debug('Validating config schema');
      config = configSchema.parse(data);
    } catch (zodErr) {
      logger.error('Schema validation failed', { configPath, error: zodErr });
      throw ValidationError.fromZodError(zodErr as ZodError, {
        filePath: configPath,
        operation: 'parse-config',
      });
    }

    // NOTE: We intentionally skip local config merge here
    // This ensures the returned config only contains versioned data

    // Validate config structure (commands required)
    logger.debug('Validating config structure');
    const validation = validateConfigStructure(config);
    if (!validation.valid) {
      logger.error('Config structure validation failed', { validation });
      throw UserError.missingCommands(validation.error);
    }

    logger.info('Versioned config loaded successfully (no local merge)', {
      configPath,
      agents: config.profile.agents,
      contextTraining: config.profile.context_training || 'none',
    });

    return config;
  } catch (err) {
    // Re-throw our custom errors
    if (err instanceof UserError || err instanceof ValidationError) {
      throw err;
    }
    // Wrap unknown errors
    logger.error('Unexpected error loading config', { error: err });
    throw err;
  }
}

/**
 * Load and validate config from file (includes local config merge)
 * Use this for runtime config to get the full merged configuration
 */
export function loadConfig(projectDir?: string): Config {
  const cwd = getProjectDir(projectDir);
  logger.debug('Loading config', { projectDir: cwd });

  const configPath = findConfig(projectDir);

  if (!configPath) {
    const searchedPaths = CONFIG_FILENAMES.map((f) => join(cwd, f));
    logger.error('Config file not found', { searchedPaths });
    throw UserError.configNotFound(searchedPaths);
  }

  try {
    logger.debug('Reading config file', { configPath });
    const content = readFile(configPath);

    // Check if empty
    if (!content || content.trim() === '') {
      logger.error('Config file is empty', { configPath });
      throw ValidationError.emptyConfig(configPath);
    }

    // Parse YAML
    let data: any;
    try {
      logger.debug('Parsing YAML config');
      data = parseYaml(content);
    } catch (yamlErr) {
      logger.error('YAML parsing failed', { configPath, error: (yamlErr as Error).message });
      throw UserError.invalidYaml(configPath, (yamlErr as Error).message);
    }

    // Apply format migration BEFORE schema validation
    logger.debug('Checking for config format migration');
    const migrationResult = migrateConfigFormat(data as RawConfig);
    data = migrationResult.config;

    // Validate with Zod schema
    let config: Config;
    try {
      logger.debug('Validating config schema');
      config = configSchema.parse(data);
    } catch (zodErr) {
      logger.error('Schema validation failed', { configPath, error: zodErr });
      throw ValidationError.fromZodError(zodErr as ZodError, {
        filePath: configPath,
        operation: 'parse-config',
      });
    }

    // Merge with local config if it exists
    const localConfigPath = findLocalConfig(projectDir);
    if (localConfigPath) {
      try {
        logger.debug('Loading local config file', { localConfigPath });
        const localContent = readFile(localConfigPath);
        if (localContent && localContent.trim() !== '') {
          const localData = parseYaml(localContent);
          logger.debug('Merging local config with main config');
          const mergedData = deepMerge(data, localData);
          config = configSchema.parse(mergedData);
          logger.info('Local config applied', { localConfigPath });
        }
      } catch (localErr) {
        logger.warn('Failed to load local config, skipping', {
          localConfigPath,
          error: (localErr as Error).message,
        });
        console.warn(
          colors.yellow(
            `\n⚠️  Warning: Failed to load local config from ${localConfigPath}: ${(localErr as Error).message}`
          )
        );
        console.warn(colors.dim('   Continuing with main config only.\n'));
      }
    }

    // Apply environment variable overrides (highest priority)
    config = applyEnvVarOverrides(config);

    // Validate config structure (commands required)
    logger.debug('Validating config structure');
    const validation = validateConfigStructure(config);
    if (!validation.valid) {
      logger.error('Config structure validation failed', { validation });
      throw UserError.missingCommands(validation.error);
    }

    // Check for deprecated standards field
    if ((data as any).standards) {
      logger.warn('Deprecated standards field found in config', { configPath });
      console.warn(
        colors.yellow('\n⚠️  Warning: The "standards" field is deprecated and has been removed.')
      );
      console.warn(
        colors.dim('   The standards system has been replaced by the context training system.')
      );
      console.warn(
        colors.dim(
          '   Run /train-context to create repository-specific context trainings that replace standards.'
        )
      );
      console.warn(colors.dim('   Remove the "standards" field from your config.\n'));
    }

    // Check for deprecated preset references
    if ((data as any).profile?.preset) {
      logger.warn('Deprecated preset field found in config', { configPath });
      console.warn(
        colors.yellow('\n⚠️  Warning: The "preset" field is deprecated and has been removed.')
      );
      console.warn(
        colors.dim('   Presets have been replaced by command dependencies and context trainings.')
      );
      console.warn(
        colors.dim(
          '   Install commands using dependencies, and use /train-context for customizations.'
        )
      );
      console.warn(colors.dim('   Remove the "preset" field from your config.\n'));
    }

    // Validate context training reference if specified
    if (config.profile.context_training) {
      logger.debug('Validating context training reference', {
        contextTraining: config.profile.context_training,
      });
      if (!contextTrainingExists(config.profile.context_training, projectDir)) {
        logger.warn('Context training not found', {
          contextTraining: config.profile.context_training,
          expectedPath: `devorch/context-training/${config.profile.context_training}/`,
        });
        console.warn(
          colors.yellow(
            `\n⚠️  Warning: Context training "${config.profile.context_training}" not found in devorch/context-training/`
          )
        );
        console.warn(
          colors.dim(
            '   Run /train-context to create a context training or remove it from devorch/config.local.yml.\n'
          )
        );
      } else {
        logger.debug('Context training reference valid', {
          contextTraining: config.profile.context_training,
        });
      }
    }

    const getComponentCount = (component: string[] | Skill[] | undefined): number => {
      if (!component) return 0;
      return Array.isArray(component) ? component.length : 0;
    };

    logger.info('Config loaded successfully', {
      configPath,
      agents: config.profile.agents,
      subagentsCount: getComponentCount(config.subagents),
      commandsCount: getComponentCount(config.commands),
      skillsCount: getComponentCount(config.skills),
      contextTraining: config.profile.context_training || 'none',
    });

    return config;
  } catch (err) {
    // Re-throw our custom errors
    if (err instanceof UserError || err instanceof ValidationError) {
      throw err;
    }
    // Wrap unknown errors
    logger.error('Unexpected error loading config', { error: err });
    throw err;
  }
}

/**
 * Validate config without loading
 */
export function validateConfig(cwd: string = getProjectDir()): {
  valid: boolean;
  errors?: string[];
} {
  const configPath = findConfig(cwd);

  if (!configPath) {
    const specMachineDir = join(cwd, 'devorch');
    const searchedPaths = [
      ...CONFIG_FILENAMES.map((f) => join(cwd, f)),
      ...CONFIG_FILENAMES_IN_DEVORCH_DIR.map((f) => join(specMachineDir, f)),
    ];
    return {
      valid: false,
      errors: [
        'Config file not found',
        `Searched for: ${searchedPaths.join(', ')}`,
        "Run 'devorch install' to create a config",
      ],
    };
  }

  try {
    const content = readFile(configPath);

    // Check if empty
    if (!content || content.trim() === '') {
      return {
        valid: false,
        errors: ['Config file is empty', `File: ${configPath}`],
      };
    }

    // Parse YAML
    let data: any;
    try {
      data = parseYaml(content);
    } catch (yamlErr) {
      return {
        valid: false,
        errors: [
          'Failed to parse YAML',
          `File: ${configPath}`,
          `Error: ${(yamlErr as Error).message}`,
          'Check YAML syntax (indentation, quotes, etc.)',
        ],
      };
    }

    // Validate with Zod schema
    try {
      const config = configSchema.parse(data);

      // Validate config structure
      const validation = validateConfigStructure(config);
      if (!validation.valid) {
        return {
          valid: false,
          errors: [
            validation.error || 'Invalid config structure',
            "Add a preset (profile.preset: 'quick-fixes')",
            'Or specify components (subagents and commands arrays)',
          ],
        };
      }

      return { valid: true };
    } catch (zodErr) {
      const errors = ['Schema validation failed:'];
      if ((zodErr as ZodError).issues) {
        for (const issue of (zodErr as ZodError).issues) {
          const field = issue.path.join('.');
          errors.push(`  - ${field}: ${issue.message}`);
        }
      } else {
        errors.push((zodErr as ZodError).message);
      }
      return { valid: false, errors };
    }
  } catch (err) {
    if (err instanceof Error) {
      return { valid: false, errors: [err.message] };
    }
    return { valid: false, errors: ['Unknown validation error'] };
  }
}
