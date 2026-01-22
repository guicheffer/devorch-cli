import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { $ } from 'bun';
import { stringify } from 'yaml';
import type { Config } from '@/schemas/config';

/**
 * Cache directory for cloned repositories
 */
const REPO_CACHE_DIR = join(tmpdir(), 'devorch-test-repos');

export interface TestConfig {
  commands?: string[];
  subagents?: string[];
  skills?: string[];
  contextTraining?: string;
  cloneRepo?: string; // Optional git repo URL to clone (shallow clone with --depth 1)
}

export interface TestPaths {
  projectDir: string;
  claudeDir: string;
  specMachineDir: string;
  configPath: string;
}

/**
 * Get cache path for a repository
 */
function getRepoCachePath(repoName: string): string {
  // Convert repo name to safe directory name (e.g., "yourcompany/web" -> "yourcompany-web")
  const safeName = repoName.replace(/\//g, '-');
  return join(REPO_CACHE_DIR, safeName);
}

/**
 * Clone or copy repository from cache
 */
async function cloneOrCopyRepo(repoName: string, targetDir: string): Promise<void> {
  const cachePath = getRepoCachePath(repoName);

  // Check if cached copy exists
  if (existsSync(cachePath)) {
    console.log(`📦 Using cached repository from ${cachePath}`);
    cpSync(cachePath, targetDir, {
      recursive: true,
      filter: (src) => {
        // Exclude .claude directories from cache to ensure clean test environment
        return !src.includes('/.claude');
      },
    });
    console.log('✓ Repository copied from cache (excluding .claude)');
  } else {
    // Clone to cache first
    console.log(`🔄 Cloning repository to cache: ${repoName}`);

    // Ensure cache directory exists
    if (!existsSync(REPO_CACHE_DIR)) {
      mkdirSync(REPO_CACHE_DIR, { recursive: true });
    }

    try {
      await $`gh repo clone ${repoName} ${cachePath} -- --depth 1`;
      console.log('✓ Repository cloned to cache');

      // Copy from cache to target (excluding .claude)
      cpSync(cachePath, targetDir, {
        recursive: true,
        filter: (src) => {
          // Exclude .claude directories from cache to ensure clean test environment
          return !src.includes('/.claude');
        },
      });
      console.log('✓ Repository copied to project (excluding .claude)');
    } catch (error) {
      // Clean up partial cache on failure
      if (existsSync(cachePath)) {
        rmSync(cachePath, { recursive: true, force: true });
      }
      console.error('✗ Failed to clone repository:', error);
      throw error;
    }
  }
}

/**
 * Creates a persistent test project with a custom config
 * Reuses the same directory to preserve SDK sessions between runs
 */
export async function createTestProject(testName: string, config: TestConfig): Promise<TestPaths> {
  // Use persistent directory in tests/evals/projects to preserve SDK sessions
  const projectDir = join(process.cwd(), 'tests/evals/projects', testName);

  // If cloneRepo is specified, clone or copy from cache
  if (config.cloneRepo) {
    // Remove existing directory if it exists
    if (existsSync(projectDir)) {
      rmSync(projectDir, { recursive: true, force: true });
    }

    await cloneOrCopyRepo(config.cloneRepo, projectDir);
  } else {
    // Only create if doesn't exist - preserve existing directory for SDK session persistence
    if (!existsSync(projectDir)) {
      mkdirSync(projectDir, { recursive: true });
    }
  }

  // Create config file
  const configPath = join(projectDir, 'devorch.config.yml');

  // Build config object matching schema
  const configObj: Config = {
    profile: {
      name: testName,
      description: `Eval test project for ${testName}`,
      agents: ['claude-code'],
      ...(config.contextTraining && { context_training: config.contextTraining }),
    },
    commands: (config.commands || []).map((name) => ({ name, enabled: true })),
    ...(config.subagents &&
      config.subagents.length > 0 && {
        subagents: config.subagents.map((name) => ({ name, enabled: true })),
      }),
    ...(config.skills &&
      config.skills.length > 0 && {
        skills: config.skills.map((name) => ({ name, enabled: true })),
      }),
  };

  // Convert to YAML and write
  const configContent = stringify(configObj);
  writeFileSync(configPath, configContent, 'utf-8');

  const paths = {
    projectDir,
    claudeDir: join(projectDir, '.claude'),
    specMachineDir: join(projectDir, 'devorch'),
    configPath,
  };

  // Log all paths for debugging
  console.log('\n📁 Test Project Paths:');
  console.log(`  Project:      ${paths.projectDir}`);
  console.log(`  Claude:       ${paths.claudeDir}`);
  console.log(`  devorch: ${paths.specMachineDir}`);
  console.log(`  Config:       ${paths.configPath}\n`);

  return paths;
}

/**
 * Runs installation for a test project
 */
export async function installTestProject(paths: TestPaths) {
  console.log(`📦 Installing devorch in ${paths.projectDir}...`);

  try {
    // Suppress CLI output by redirecting stdout/stderr to null
    await $`bun ${join(process.cwd(), 'src/cli/index.ts')} install --local=${process.cwd()}`
      .cwd(paths.projectDir)
      .quiet();

    console.log('✓ Installation completed');
  } catch (error) {
    console.error('✗ Installation failed:', error);
    throw error;
  }
}

/**
 * Cleans up a test project
 */
export function cleanupTestProject(paths: TestPaths | undefined) {
  if (paths && existsSync(paths.projectDir)) {
    rmSync(paths.projectDir, { recursive: true, force: true });
  }
}

/**
 * Directory for storing eval snapshots (can be gitignored or committed)
 */
export const EVAL_SNAPSHOTS_DIR = join(process.cwd(), 'tests/evals/snapshots');
