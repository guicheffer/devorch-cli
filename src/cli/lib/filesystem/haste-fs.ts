import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import fg from 'fast-glob';
import matter from 'gray-matter';
import { SystemError } from '@/utils/errors.js';
import { logger } from '@/utils/logger.js';
import { getSchemas } from '@/utils/register-schemas.js';
import type { CodingAgent } from '../../types/index.js';
import { MarkdownDI } from '../markdown-di/index.js';
import { getAgentFrontmatterFields } from './frontmatter-filter.js';
import { resolveAssetName } from './name-utils.js';

// Re-export for backwards compatibility and convenience
export type { CodingAgent };

/**
 * A resolved dependency with metadata
 */
export interface ResolvedDependency {
  type: 'command' | 'subagent' | 'skill';
  name: string;
  requiredBy: string[]; // Parent assets that depend on this
  depth: number; // Distance from root asset (0 = explicit, 1+ = transitive)
}

/**
 * Dependency graph for a single asset
 */
export interface DependencyGraph {
  root: string;
  dependencies: Map<string, ResolvedDependency>;
}

/**
 * Represents a file in the HasteFS system
 */
export interface FileNode {
  /** Absolute path to the file */
  path: string;
  /** Relative path from source directory */
  relativePath: string;
  /** Parsed frontmatter data */
  // biome-ignore lint/suspicious/noExplicitAny: frontmatter is inherently dynamic
  frontmatter: Record<string, any>;
  /** Raw file content (with frontmatter, never compiled) */
  rawContent: string;
  /** Body content (without frontmatter) */
  content: string;
  /** Asset type (subagent, command, skill) */
  type: 'subagent' | 'command' | 'skill';
  /** Asset name extracted from frontmatter */
  name: string;
  /** Dependencies extracted from frontmatter */
  dependencies?: {
    subagents?: string[];
    skills?: string[];
    commands?: string[];
  };
  /** Compiled content cache per agent */
  compiled?: Map<CodingAgent, string>;
}

/**
 * HasteMap - In-memory file system cache with lookup indexes
 */
export interface HasteMap {
  /** All files indexed by relative path */
  files: Map<string, FileNode>;
  /** Subagents indexed by name (e.g., "specification/spec-writer") */
  subagents: Map<string, FileNode>;
  /** Commands indexed by name (e.g., "/create-spec"), storing all mode variants */
  commands: Map<string, FileNode[]>;
  /** Skills indexed by name (e.g., "zustand-patterns") */
  skills: Map<string, FileNode>;
  /** Pre-computed dependency graphs indexed by "type:name" (e.g., "command:/create-spec") */
  dependencyGraphs: Map<string, DependencyGraph>;
}

/**
 * HasteFS - Fast in-memory file system cache for devorch assets
 */
export class HasteFS {
  private markdownDI: MarkdownDI;

  private constructor(
    private hasteMap: HasteMap,
    _sourceDir: string
  ) {
    this.markdownDI = new MarkdownDI();
  }

  /**
   * Add a virtual subagent (merged from context-training customization) to HasteFS
   * This allows context-training-merged implementers/verifiers to be installed like regular subagents
   */
  addVirtualSubagent(name: string, rawContent: string, virtualPath: string): void {
    logger.debug('Adding virtual subagent to HasteFS', { name, virtualPath });

    // Parse frontmatter
    const { data: frontmatter, content: bodyContent } = matter(rawContent);

    // Create relative path for virtual subagent
    const relativePath = `subagents/${name}.md`;

    // Create file node
    const fileNode: FileNode = {
      path: virtualPath,
      relativePath,
      frontmatter,
      rawContent,
      content: bodyContent,
      type: 'subagent',
      name,
      dependencies: frontmatter.dependencies
        ? {
            subagents: frontmatter.dependencies.subagents as string[] | undefined,
            skills: frontmatter.dependencies.skills as string[] | undefined,
            commands: frontmatter.dependencies.commands as string[] | undefined,
          }
        : undefined,
    };

    // Add to maps
    this.hasteMap.files.set(relativePath, fileNode);
    this.hasteMap.subagents.set(name, fileNode);

    logger.info('Virtual subagent added to HasteFS', {
      name,
      relativePath,
      frontmatterKeys: Object.keys(frontmatter),
    });
  }

  /**
   * Create a new HasteFS instance by scanning a source directory
   * @param sourceDir - Path to the templates/ directory containing subagents/, commands/, skills/
   * @returns HasteFS instance with populated indexes
   */
  static async create(sourceDir: string): Promise<HasteFS> {
    logger.info('Creating HasteFS', { sourceDir });

    // Define glob patterns for each asset type
    const patterns = [
      { pattern: '*/subagents/**/*.md', type: 'subagent' as const },
      { pattern: '*/*/command.md', type: 'command' as const },
      { pattern: 'skills/**/SKILL.md', type: 'skill' as const },
    ];

    // Initialize empty maps
    const files = new Map<string, FileNode>();
    const subagents = new Map<string, FileNode>();
    const commands = new Map<string, FileNode[]>();
    const skills = new Map<string, FileNode>();
    const dependencyGraphs = new Map<string, DependencyGraph>();

    // Scan all files in parallel
    const scanPromises = patterns.map(async ({ pattern, type }) => {
      const absolutePattern = join(sourceDir, pattern);
      logger.info(`Scanning pattern: ${absolutePattern}`, { type });

      const filePaths = await fg(absolutePattern, {
        absolute: true,
        onlyFiles: true,
      });

      logger.info(`Found ${filePaths.length} files for ${type}`, { type, pattern });

      // Log first few file paths to verify we're scanning the right location
      if (filePaths.length > 0) {
        logger.debug('Sample file paths', {
          type,
          samples: filePaths.slice(0, 3),
        });
      }

      // Read and parse all files in parallel
      return Promise.all(filePaths.map((filePath) => HasteFS.parseFile(filePath, sourceDir, type)));
    });

    // Wait for all scans to complete
    const results = await Promise.all(scanPromises);
    const allFileNodes = results.flat().filter((node): node is FileNode => node !== null);

    logger.info(`Parsed ${allFileNodes.length} valid file nodes`);

    // Build indexes
    for (const fileNode of allFileNodes) {
      // Add to files index (by relative path)
      files.set(fileNode.relativePath, fileNode);

      logger.debug('Indexing file node', {
        type: fileNode.type,
        name: fileNode.name,
        relativePath: fileNode.relativePath,
      });

      // Add to type-specific index (by name)
      switch (fileNode.type) {
        case 'subagent':
          subagents.set(fileNode.name, fileNode);
          logger.debug('Indexed subagent', { name: fileNode.name });
          break;
        case 'command': {
          // Commands can have multiple variants (single-agent, multi-agent)
          // Store all variants in an array
          const existing: FileNode[] = commands.get(fileNode.name) || [];
          existing.push(fileNode);
          commands.set(fileNode.name, existing);
          logger.debug('Indexed command', {
            name: fileNode.name,
            mode: fileNode.frontmatter.mode,
            variantCount: existing.length,
          });
          break;
        }
        case 'skill':
          skills.set(fileNode.name, fileNode);
          logger.debug('Indexed skill', { name: fileNode.name });
          break;
      }
    }

    logger.info('HasteFS created successfully', {
      totalFiles: files.size,
      subagents: subagents.size,
      commands: commands.size,
      skills: skills.size,
      subagentNames: Array.from(subagents.keys()).slice(0, 5),
      commandNames: Array.from(commands.keys()).slice(0, 5),
      skillNames: Array.from(skills.keys()).slice(0, 5),
    });

    return new HasteFS({ files, subagents, commands, skills, dependencyGraphs }, sourceDir);
  }

  /**
   * Parse a single file and extract metadata
   * Returns null if the file doesn't have a name field (e.g., partial/workflow files)
   */
  private static async parseFile(
    filePath: string,
    sourceDir: string,
    type: 'subagent' | 'command' | 'skill'
  ): Promise<FileNode | null> {
    try {
      logger.debug('Parsing file', { filePath, type });

      const content = readFileSync(filePath, 'utf-8');
      const relativePath = relative(sourceDir, filePath);

      logger.debug('File read', { relativePath, contentLength: content.length });

      // Parse frontmatter
      const { data: frontmatter, content: bodyContent } = matter(content);

      logger.debug('Frontmatter parsed', {
        relativePath,
        frontmatterKeys: Object.keys(frontmatter),
        hasName: !!frontmatter.name,
      });

      // Extract name from frontmatter
      const baseName = frontmatter.name as string;
      if (!baseName) {
        // Skip files without a name field (e.g., partial/workflow files)
        logger.debug(`Skipping file without name field: ${relativePath}`, { type });
        return null;
      }

      // Resolve full asset name (includes category/domain prefix for subagents/skills)
      const name = resolveAssetName(baseName, relativePath, type);

      logger.debug('Asset name determined', {
        type,
        baseName,
        finalName: name,
      });

      // Extract dependencies if present
      let dependencies: FileNode['dependencies'];
      if (frontmatter.dependencies) {
        dependencies = {
          subagents: frontmatter.dependencies.subagents as string[] | undefined,
          skills: frontmatter.dependencies.skills as string[] | undefined,
          commands: frontmatter.dependencies.commands as string[] | undefined,
        };
        logger.debug('Dependencies extracted', { name, dependencies });
      }

      logger.fileOp('read', filePath, true);

      logger.debug('File parsed successfully', {
        type,
        name,
        relativePath,
        rawContentLength: content.length,
        contentLength: bodyContent.length,
        hasDependencies: !!dependencies,
      });

      return {
        path: filePath,
        relativePath,
        frontmatter,
        rawContent: content,
        content: bodyContent,
        type,
        name,
        dependencies,
      };
    } catch (error) {
      logger.error(`Failed to parse file: ${filePath}`, { error });
      throw error;
    }
  }

  /**
   * Get a file by its relative path
   * @param relativePath - Relative path from source directory
   * @returns FileNode or undefined if not found
   */
  getFile(relativePath: string): FileNode | undefined {
    return this.hasteMap.files.get(relativePath);
  }

  /**
   * Get a subagent by name
   * @param name - Subagent name (e.g., "specification/spec-writer")
   * @returns FileNode or undefined if not found
   */
  getSubagent(name: string): FileNode | undefined {
    return this.hasteMap.subagents.get(name);
  }

  /**
   * Get a command by name, optionally filtering by agent mode
   * @param name - Command name (e.g., "/create-spec")
   * @param agent - Optional agent to filter by mode (claude-code = multi-agent)
   * @returns FileNode or undefined if not found
   */
  getCommand(name: string, agent?: CodingAgent): FileNode | undefined {
    const variants = this.hasteMap.commands.get(name);
    if (!variants || variants.length === 0) {
      return undefined;
    }

    // If no agent specified, return first variant
    if (!agent) {
      return variants[0];
    }

    // Filter by agent mode preference (claude-code uses multi-agent)
    const preferredMode = 'multi-agent';
    const matchingVariant = variants.find((v) => v.frontmatter.mode === preferredMode);

    // Return matching variant, or fall back to first variant
    return matchingVariant || variants[0];
  }

  /**
   * Get a skill by name
   * @param name - Skill name (e.g., "zustand-patterns")
   * @returns FileNode or undefined if not found
   */
  getSkill(name: string): FileNode | undefined {
    return this.hasteMap.skills.get(name);
  }

  /**
   * Get all subagents
   */
  getAllSubagents(): FileNode[] {
    return Array.from(this.hasteMap.subagents.values());
  }

  /**
   * Get all commands (flattened from all variants)
   */
  getAllCommands(): FileNode[] {
    return Array.from(this.hasteMap.commands.values()).flat();
  }

  /**
   * Get all skills
   */
  getAllSkills(): FileNode[] {
    return Array.from(this.hasteMap.skills.values());
  }

  /**
   * Get the complete HasteMap
   */
  getHasteMap(): Readonly<HasteMap> {
    return this.hasteMap;
  }

  /**
   * Query API: Get list of all available subagent names
   * @returns Array of subagent names (e.g., ["specification/spec-writer", "implementers/ui-implementer"])
   */
  getAvailableSubagents(): string[] {
    return Array.from(this.hasteMap.subagents.keys());
  }

  /**
   * Query API: Get list of all available command names
   * @returns Array of command names (e.g., ["/create-spec", "/worktree"])
   */
  getAvailableCommands(): string[] {
    return Array.from(this.hasteMap.commands.keys());
  }

  /**
   * Query API: Get list of all available skill names
   * @returns Array of skill names (e.g., ["zustand-patterns", "zest-design-system"])
   */
  getAvailableSkills(): string[] {
    return Array.from(this.hasteMap.skills.keys());
  }

  /**
   * Query API: Get frontmatter for a specific asset
   * @param type - Asset type (subagent, command, or skill)
   * @param name - Asset name
   * @returns Frontmatter object
   * @throws SystemError if asset not found
   */
  // biome-ignore lint/suspicious/noExplicitAny: frontmatter is inherently dynamic
  getFrontmatter(type: 'subagent' | 'command' | 'skill', name: string): Record<string, any> {
    let fileNode: FileNode | undefined;

    switch (type) {
      case 'subagent':
        fileNode = this.hasteMap.subagents.get(name);
        break;
      case 'command': {
        // Get first variant for commands (they may have multiple)
        const variants = this.hasteMap.commands.get(name);
        fileNode = variants?.[0];
        break;
      }
      case 'skill':
        fileNode = this.hasteMap.skills.get(name);
        break;
    }

    if (!fileNode) {
      throw SystemError.fileNotFound(`${type}/${name}`, 'get-frontmatter');
    }

    return fileNode.frontmatter;
  }

  /**
   * Query API: Get dependencies for a specific asset
   * @param type - Asset type (subagent, command, or skill)
   * @param name - Asset name
   * @returns Dependencies object or undefined if no dependencies
   * @throws SystemError if asset not found
   */
  getDependencies(
    type: 'subagent' | 'command' | 'skill',
    name: string
  ): { subagents?: string[]; skills?: string[]; commands?: string[] } | undefined {
    let fileNode: FileNode | undefined;

    switch (type) {
      case 'subagent':
        fileNode = this.hasteMap.subagents.get(name);
        break;
      case 'command': {
        // Get first variant for commands (they may have multiple)
        const variants = this.hasteMap.commands.get(name);
        fileNode = variants?.[0];
        break;
      }
      case 'skill':
        fileNode = this.hasteMap.skills.get(name);
        break;
    }

    if (!fileNode) {
      throw SystemError.fileNotFound(`${type}/${name}`, 'get-dependencies');
    }

    return fileNode.dependencies;
  }

  /**
   * Resolve dependency graph for a specific asset
   * Handles transitive dependencies: command → subagent → skill
   * Results are cached for subsequent calls
   *
   * @param type - Asset type (subagent or command, skills have no dependencies)
   * @param name - Asset name
   * @param agent - Optional agent to select variant for commands (claude-code = multi-agent)
   * @returns DependencyGraph with all resolved dependencies
   * @throws SystemError if asset not found
   */
  resolveDependencyGraph(
    type: 'subagent' | 'command',
    name: string,
    agent?: CodingAgent
  ): DependencyGraph {
    // Include agent in cache key for commands so we cache per agent
    const graphKey = type === 'command' && agent ? `${type}:${name}:${agent}` : `${type}:${name}`;

    // Return cached graph if available
    const cached = this.hasteMap.dependencyGraphs.get(graphKey);
    if (cached) {
      logger.debug('Using cached dependency graph', { type, name, agent });
      return cached;
    }

    logger.debug('Computing dependency graph', { type, name, agent });

    // Verify asset exists
    let fileNode: FileNode | undefined;
    if (type === 'subagent') {
      fileNode = this.hasteMap.subagents.get(name);
    } else {
      // For commands, select variant based on agent mode preference (claude-code = multi-agent)
      const variants = this.hasteMap.commands.get(name);
      if (variants) {
        if (agent) {
          const preferredMode = 'multi-agent';
          fileNode = variants.find((v) => v.frontmatter.mode === preferredMode) || variants[0];
          logger.debug('Selected command variant for dependency resolution', {
            name,
            agent,
            preferredMode,
            selectedMode: fileNode?.frontmatter.mode,
            variantCount: variants.length,
          });
        } else {
          fileNode = variants[0];
        }
      }
    }
    if (!fileNode) {
      throw SystemError.fileNotFound(`${type}/${name}`, 'resolve-dependency-graph');
    }

    // Initialize dependency graph
    const dependencies = new Map<string, ResolvedDependency>();

    // Recursively resolve dependencies
    this.resolveDependenciesRecursive(fileNode, name, 0, dependencies, new Set());

    // Create and cache the graph
    const graph: DependencyGraph = {
      root: name,
      dependencies,
    };

    this.hasteMap.dependencyGraphs.set(graphKey, graph);
    logger.debug('Cached dependency graph', { type, name, dependencyCount: dependencies.size });

    return graph;
  }

  /**
   * Recursive helper to resolve dependencies
   * @private
   */
  private resolveDependenciesRecursive(
    fileNode: FileNode,
    parentName: string,
    depth: number,
    dependencies: Map<string, ResolvedDependency>,
    visited: Set<string>
  ): void {
    const nodeKey = `${fileNode.type}:${fileNode.name}`;

    // Prevent circular dependencies
    if (visited.has(nodeKey)) {
      logger.warn('Circular dependency detected', { nodeKey, depth });
      return;
    }

    visited.add(nodeKey);

    if (!fileNode.dependencies) {
      return;
    }

    // Process subagent dependencies (commands and subagents can depend on subagents)
    if (fileNode.dependencies.subagents) {
      for (const subagentName of fileNode.dependencies.subagents) {
        const depKey = `subagent:${subagentName}`;

        // Add or update the dependency
        const existing = dependencies.get(depKey);
        if (existing) {
          if (!existing.requiredBy.includes(parentName)) {
            existing.requiredBy.push(parentName);
          }
          existing.depth = Math.min(existing.depth, depth);
          // Already processed this dependency's transitive deps, skip recursion
          continue;
        }

        dependencies.set(depKey, {
          type: 'subagent',
          name: subagentName,
          requiredBy: [parentName],
          depth,
        });

        // Recursively resolve subagent's dependencies
        const subagentNode = this.hasteMap.subagents.get(subagentName);
        if (subagentNode) {
          this.resolveDependenciesRecursive(
            subagentNode,
            subagentName,
            depth + 1,
            dependencies,
            visited
          );
        } else {
          logger.warn('Subagent dependency not found', { subagentName, parentName });
        }
      }
    }

    // Process command dependencies (commands can depend on other commands)
    if (fileNode.dependencies.commands) {
      for (const commandName of fileNode.dependencies.commands) {
        const depKey = `command:${commandName}`;

        // Add or update the dependency
        const existing = dependencies.get(depKey);
        if (existing) {
          if (!existing.requiredBy.includes(parentName)) {
            existing.requiredBy.push(parentName);
          }
          existing.depth = Math.min(existing.depth, depth);
          // Already processed this dependency's transitive deps, skip recursion
          continue;
        }

        dependencies.set(depKey, {
          type: 'command',
          name: commandName,
          requiredBy: [parentName],
          depth,
        });

        // Recursively resolve command's dependencies
        const commandVariants = this.hasteMap.commands.get(commandName);
        if (commandVariants && commandVariants.length > 0) {
          // Use first variant (or we could use preferredMode, but for deps it shouldn't matter)
          const commandNode = commandVariants[0];
          this.resolveDependenciesRecursive(
            commandNode,
            commandName,
            depth + 1,
            dependencies,
            visited
          );
        } else {
          logger.warn('Command dependency not found', { commandName, parentName });
        }
      }
    }

    // Process skill dependencies (commands and subagents can depend on skills)
    if (fileNode.dependencies.skills) {
      for (const skillName of fileNode.dependencies.skills) {
        const depKey = `skill:${skillName}`;

        const existing = dependencies.get(depKey);
        if (existing) {
          if (!existing.requiredBy.includes(parentName)) {
            existing.requiredBy.push(parentName);
          }
          existing.depth = Math.min(existing.depth, depth);
          // Skills are leaf nodes, no need to continue
          continue;
        }

        dependencies.set(depKey, {
          type: 'skill',
          name: skillName,
          requiredBy: [parentName],
          depth,
        });
        // Skills don't have further dependencies (leaf nodes)
      }
    }

    // Remove from visited set after processing
    visited.delete(nodeKey);
  }

  /**
   * Collect and merge dependencies from multiple dependency graphs
   * Useful when installing multiple commands/subagents at once
   *
   * @param graphs - Array of dependency graphs to merge
   * @returns Map of all unique dependencies with merged metadata
   */
  static collectAllDependencies(graphs: DependencyGraph[]): Map<string, ResolvedDependency> {
    const allDeps = new Map<string, ResolvedDependency>();

    for (const graph of graphs) {
      for (const [key, dep] of graph.dependencies) {
        const existing = allDeps.get(key);

        if (existing) {
          // Merge requiredBy arrays
          for (const parent of dep.requiredBy) {
            if (!existing.requiredBy.includes(parent)) {
              existing.requiredBy.push(parent);
            }
          }
          // Use minimum depth
          existing.depth = Math.min(existing.depth, dep.depth);
        } else {
          // Create a copy to avoid shared references
          allDeps.set(key, { ...dep, requiredBy: [...dep.requiredBy] });
        }
      }
    }

    logger.debug('Collected all dependencies', {
      totalGraphs: graphs.length,
      uniqueDependencies: allDeps.size,
    });

    return allDeps;
  }

  /**
   * Get compiled content for a specific asset and agent
   * Compiles the file once per agent and caches the result
   *
   * @param type - Asset type (subagent, command, or skill)
   * @param sourceDir - Source directory
   * @param name - Asset name
   * @param agent - Target agent (claude-code)
   * @returns Compiled content string
   * @throws SystemError if asset not found
   */
  async getCompiledContent(
    type: 'subagent' | 'command' | 'skill',
    sourceDir: string,
    name: string,
    agent: CodingAgent,
    contextTrainingName?: string
  ): Promise<string> {
    logger.debug('getCompiledContent called', {
      type,
      name,
      agent,
      sourceDir,
      contextTrainingName,
    });

    // Get the file node
    let fileNode: FileNode | undefined;

    switch (type) {
      case 'subagent':
        fileNode = this.hasteMap.subagents.get(name);
        logger.debug('Subagent lookup', { name, found: !!fileNode });
        break;
      case 'command': {
        // For commands, select variant based on agent mode preference (claude-code = multi-agent)
        const variants = this.hasteMap.commands.get(name);
        if (variants) {
          const preferredMode = 'multi-agent';
          fileNode = variants.find((v) => v.frontmatter.mode === preferredMode) || variants[0];
          logger.debug('Command lookup', {
            name,
            variantCount: variants.length,
            preferredMode,
            selectedMode: fileNode?.frontmatter.mode,
            found: !!fileNode,
          });
        }
        break;
      }
      case 'skill':
        fileNode = this.hasteMap.skills.get(name);
        logger.debug('Skill lookup', { name, found: !!fileNode });
        break;
    }

    if (!fileNode) {
      logger.error('Asset not found in HasteFS', { type, name, agent, sourceDir });
      throw SystemError.fileNotFound(`${type}/${name}`, 'get-compiled-content');
    }

    logger.debug('FileNode details', {
      type,
      name,
      path: fileNode.path,
      relativePath: fileNode.relativePath,
      hasCompiled: !!fileNode.compiled,
      compiledAgents: fileNode.compiled ? Array.from(fileNode.compiled.keys()) : [],
      sourceDir,
    });

    // Check if already compiled for this agent
    if (fileNode.compiled?.has(agent)) {
      logger.info('Using cached compiled content', { type, name, agent });
      const cached = fileNode.compiled.get(agent);
      if (cached) {
        logger.debug('Cached content length', { type, name, agent, length: cached.length });
        return cached;
      }
    }

    // Compile the file
    logger.info('Compiling file (no cache)', { type, name, agent, path: fileNode.path, sourceDir });
    const compiled = await this.compile(fileNode, sourceDir, agent, contextTrainingName);

    logger.debug('Compilation complete', { type, name, agent, compiledLength: compiled.length });

    // Cache the result
    if (!fileNode.compiled) {
      fileNode.compiled = new Map();
    }
    fileNode.compiled.set(agent, compiled);

    logger.debug('Cached compiled content', { type, name, agent });

    return compiled;
  }

  /**
   * Compile a single file with frontmatter filtering for a specific agent
   * Filters frontmatter fields based on agent requirements without full compilation
   *
   * @private
   * @param fileNode - File node to compile
   * @param sourceDir - Source directory
   * @param agent - Target agent for compilation
   * @returns Compiled content string
   */
  private async compile(
    fileNode: FileNode,
    sourceDir: string,
    agent: CodingAgent,
    contextTrainingName?: string
  ): Promise<string> {
    logger.debug('Starting compilation', {
      type: fileNode.type,
      name: fileNode.name,
      agent,
      rawContentLength: fileNode.rawContent.length,
      frontmatterKeys: Object.keys(fileNode.frontmatter),
      contextTrainingName,
    });

    const allowedFields = getAgentFrontmatterFields(agent, fileNode.type);
    const schemas = getSchemas();

    logger.debug('Using raw content for compilation', {
      type: fileNode.type,
      name: fileNode.name,
      rawContentLength: fileNode.rawContent.length,
    });

    const compiled = await this.markdownDI.process({
      content: fileNode.rawContent,
      baseDir: sourceDir,
      mode: 'build',
      currentFile: fileNode.path,
      onBeforeCompile: async (context) => {
        const updatedFrontmatter: Record<string, unknown> = {
          ...context.frontmatter,
          'output-frontmatter': allowedFields,
        };

        // Inject context-training-name if provided
        if (contextTrainingName) {
          updatedFrontmatter['context-training-name'] = contextTrainingName;
          logger.debug('Injected context-training-name', { contextTrainingName });
        }

        // Always inject artifacts-path variable
        updatedFrontmatter['artifacts-path'] = 'devorch/.state/artifacts';
        logger.debug('Injected artifacts-path', { artifactsPath: 'devorch/.state/artifacts' });

        return updatedFrontmatter;
      },
      validateFrontmatter: (frontmatter, schemaName) => {
        const schema = schemas[schemaName as keyof typeof schemas];

        if (!schema) {
          return { valid: false, errors: [`Schema ${schemaName} not found`] };
        }

        try {
          schema.safeParse(frontmatter);
        } catch (error) {
          return {
            valid: false,
            errors: [`Failed to validate frontmatter for ${schemaName}: ${error}`],
          };
        }

        return { valid: true, errors: [] };
      },
    });

    logger.debug('Compilation result', {
      compiled,
      contentLength: compiled.content.length,
      frontmatterKeys: Object.keys(compiled.frontmatter),
      errors: compiled.errors,
      dependencies: compiled.dependencies,
    });

    return compiled.content;
  }
}
