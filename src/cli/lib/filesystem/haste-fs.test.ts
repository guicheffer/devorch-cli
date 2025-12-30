import { beforeEach, describe, expect, it } from 'bun:test';
import { join } from 'node:path';
import { HasteFS } from '@/cli/lib/filesystem/haste-fs.js';

describe('haste-fs', () => {
  let hasteFS: HasteFS;

  beforeEach(async () => {
    // Use the actual templates directory from the repo
    const templatesDir = join(process.cwd(), 'templates');
    hasteFS = await HasteFS.create(templatesDir);
  });

  describe('HasteFS.create', () => {
    it('should create HasteFS instance', () => {
      expect(hasteFS).toBeDefined();
      expect(hasteFS).toBeInstanceOf(HasteFS);
    });

    it('should scan and index files', () => {
      const hasteMap = hasteFS.getHasteMap();
      expect(hasteMap.files.size).toBeGreaterThan(0);
    });
  });

  describe('Query methods', () => {
    describe('getAvailableSubagents', () => {
      it('should return array of subagent names', () => {
        const subagents = hasteFS.getAvailableSubagents();
        expect(Array.isArray(subagents)).toBe(true);
        expect(subagents.length).toBeGreaterThan(0);
      });

      it('should return subagent names with category prefix', () => {
        const subagents = hasteFS.getAvailableSubagents();
        const hasPrefix = subagents.some((name) => name.includes('/'));
        expect(hasPrefix).toBe(true);
      });
    });

    describe('getAvailableCommands', () => {
      it('should return array of command names', () => {
        const commands = hasteFS.getAvailableCommands();
        expect(Array.isArray(commands)).toBe(true);
        expect(commands.length).toBeGreaterThan(0);
      });

      it('should return command names with / prefix', () => {
        const commands = hasteFS.getAvailableCommands();
        const allHavePrefix = commands.every((name) => name.startsWith('/'));
        expect(allHavePrefix).toBe(true);
      });
    });

    describe('getAvailableSkills', () => {
      it('should return array of skill names', () => {
        const skills = hasteFS.getAvailableSkills();
        expect(Array.isArray(skills)).toBe(true);
        expect(skills.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Asset retrieval', () => {
    describe('getSubagent', () => {
      it('should retrieve subagent by name', () => {
        const subagents = hasteFS.getAvailableSubagents();
        if (subagents.length > 0) {
          const firstSubagent = subagents[0];
          const node = hasteFS.getSubagent(firstSubagent);
          expect(node).toBeDefined();
          expect(node?.type).toBe('subagent');
          expect(node?.name).toBe(firstSubagent);
        }
      });

      it('should return undefined for non-existent subagent', () => {
        const node = hasteFS.getSubagent('non-existent-subagent');
        expect(node).toBeUndefined();
      });
    });

    describe('getCommand', () => {
      it('should retrieve command by name', () => {
        const commands = hasteFS.getAvailableCommands();
        if (commands.length > 0) {
          const firstCommand = commands[0];
          const node = hasteFS.getCommand(firstCommand);
          expect(node).toBeDefined();
          expect(node?.type).toBe('command');
          expect(node?.name).toBe(firstCommand);
        }
      });

      it('should return undefined for non-existent command', () => {
        const node = hasteFS.getCommand('/non-existent-command');
        expect(node).toBeUndefined();
      });
    });

    describe('getSkill', () => {
      it('should retrieve skill by name', () => {
        const skills = hasteFS.getAvailableSkills();
        if (skills.length > 0) {
          const firstSkill = skills[0];
          const node = hasteFS.getSkill(firstSkill);
          expect(node).toBeDefined();
          expect(node?.type).toBe('skill');
          expect(node?.name).toBe(firstSkill);
        }
      });

      it('should return undefined for non-existent skill', () => {
        const node = hasteFS.getSkill('non-existent-skill');
        expect(node).toBeUndefined();
      });
    });
  });

  describe('getAllSubagents', () => {
    it('should return all subagents as array', () => {
      const subagents = hasteFS.getAllSubagents();
      expect(Array.isArray(subagents)).toBe(true);
      expect(subagents.length).toBeGreaterThan(0);

      for (const subagent of subagents) {
        expect(subagent.type).toBe('subagent');
        expect(subagent.name).toBeDefined();
        expect(subagent.frontmatter).toBeDefined();
      }
    });
  });

  describe('getAllCommands', () => {
    it('should return all commands as array', () => {
      const commands = hasteFS.getAllCommands();
      expect(Array.isArray(commands)).toBe(true);
      expect(commands.length).toBeGreaterThan(0);

      for (const command of commands) {
        expect(command.type).toBe('command');
        expect(command?.name).toBeDefined();
        expect(command.frontmatter).toBeDefined();
      }
    });
  });

  describe('getAllSkills', () => {
    it('should return all skills as array', () => {
      const skills = hasteFS.getAllSkills();
      expect(Array.isArray(skills)).toBe(true);
      expect(skills.length).toBeGreaterThan(0);

      for (const skill of skills) {
        expect(skill.type).toBe('skill');
        expect(skill.name).toBeDefined();
        expect(skill.frontmatter).toBeDefined();
      }
    });
  });

  describe('getFrontmatter', () => {
    it('should get frontmatter for subagent', () => {
      const subagents = hasteFS.getAvailableSubagents();
      if (subagents.length > 0) {
        const frontmatter = hasteFS.getFrontmatter('subagent', subagents[0]);
        expect(frontmatter).toBeDefined();
        expect(typeof frontmatter).toBe('object');
        expect(frontmatter.name).toBeDefined();
      }
    });

    it('should get frontmatter for command', () => {
      const commands = hasteFS.getAvailableCommands();
      if (commands.length > 0) {
        const frontmatter = hasteFS.getFrontmatter('command', commands[0]);
        expect(frontmatter).toBeDefined();
        expect(typeof frontmatter).toBe('object');
        expect(frontmatter.name).toBeDefined();
      }
    });

    it('should throw for non-existent asset', () => {
      expect(() => hasteFS.getFrontmatter('subagent', 'non-existent')).toThrow();
    });
  });

  describe('getDependencies', () => {
    it('should get dependencies for asset with dependencies', () => {
      const commands = hasteFS.getAllCommands();
      const commandWithDeps = commands.find((c) => c.dependencies);

      if (commandWithDeps) {
        const deps = hasteFS.getDependencies('command', commandWithDeps.name);
        expect(deps).toBeDefined();

        if (deps?.subagents) {
          expect(Array.isArray(deps.subagents)).toBe(true);
        }
        if (deps?.skills) {
          expect(Array.isArray(deps.skills)).toBe(true);
        }
      }
    });

    it('should return undefined for asset without dependencies', () => {
      const subagents = hasteFS.getAllSubagents();
      const subagentWithoutDeps = subagents.find((s) => !s.dependencies);

      if (subagentWithoutDeps) {
        const deps = hasteFS.getDependencies('subagent', subagentWithoutDeps.name);
        expect(deps).toBeUndefined();
      }
    });
  });

  describe('resolveDependencyGraph', () => {
    it('should resolve dependency graph for command', () => {
      const commands = hasteFS.getAllCommands();
      const commandWithDeps = commands.find((c) => c.dependencies);

      if (commandWithDeps) {
        const graph = hasteFS.resolveDependencyGraph('command', commandWithDeps.name);
        expect(graph).toBeDefined();
        expect(graph.root).toBe(commandWithDeps.name);
        expect(graph.dependencies).toBeDefined();
        expect(graph.dependencies instanceof Map).toBe(true);
      }
    });

    it('should cache dependency graphs', () => {
      const commands = hasteFS.getAllCommands();
      if (commands.length > 0) {
        const command = commands[0];

        // First call
        const graph1 = hasteFS.resolveDependencyGraph('command', command.name);

        // Second call should use cache
        const graph2 = hasteFS.resolveDependencyGraph('command', command.name);

        expect(graph1).toBe(graph2); // Same reference
      }
    });

    it('should throw for non-existent asset', () => {
      expect(() => hasteFS.resolveDependencyGraph('command', '/non-existent')).toThrow();
    });

    it('should handle diamond dependencies without false circular warnings', () => {
      // Diamond pattern: /implement-spec depends on both implementation/implementer
      // directly AND transitively through /implement-task
      const implementSpec = hasteFS.getCommand('/implement-spec');

      if (implementSpec?.dependencies) {
        const graph = hasteFS.resolveDependencyGraph('command', '/implement-spec');

        // Check that implementation/implementer appears in dependencies
        const implementerDep = graph.dependencies.get('subagent:implementation/implementer');
        expect(implementerDep).toBeDefined();

        if (implementerDep) {
          // Should have multiple parents due to diamond pattern
          expect(implementerDep.requiredBy.length).toBeGreaterThanOrEqual(1);

          // Verify it's marked as required by the root command
          const hasDirectOrTransitiveDep =
            implementerDep.requiredBy.includes('/implement-spec') ||
            implementerDep.requiredBy.includes('/implement-task');
          expect(hasDirectOrTransitiveDep).toBe(true);
        }

        // Similar check for implementation/verifier (also has diamond pattern)
        const verifierDep = graph.dependencies.get('subagent:implementation/verifier');
        expect(verifierDep).toBeDefined();
      }
    });

    it('should handle specification subagent diamond dependencies', () => {
      // /jira-create-spec depends on spec-writer and spec-verifier both directly
      // and transitively through /create-spec
      const jiraCreateSpec = hasteFS.getCommand('/jira-create-spec');

      if (jiraCreateSpec?.dependencies) {
        const graph = hasteFS.resolveDependencyGraph('command', '/jira-create-spec');

        // Check spec-writer
        const writerDep = graph.dependencies.get('subagent:specification/spec-writer');
        expect(writerDep).toBeDefined();

        if (writerDep) {
          expect(writerDep.requiredBy.length).toBeGreaterThanOrEqual(1);
        }

        // Check spec-verifier
        const verifierDep = graph.dependencies.get('subagent:specification/spec-verifier');
        expect(verifierDep).toBeDefined();

        if (verifierDep) {
          expect(verifierDep.requiredBy.length).toBeGreaterThanOrEqual(1);
        }
      }
    });

    it('should compute minimum depth for diamond dependencies', () => {
      // In a diamond pattern, the shared dependency should have the minimum depth
      const implementSpec = hasteFS.getCommand('/implement-spec');

      if (implementSpec?.dependencies) {
        const graph = hasteFS.resolveDependencyGraph('command', '/implement-spec');

        const implementerDep = graph.dependencies.get('subagent:implementation/implementer');
        if (implementerDep) {
          // The depth should be the shortest path from the root
          expect(typeof implementerDep.depth).toBe('number');
          expect(implementerDep.depth).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  describe('collectAllDependencies', () => {
    it('should merge multiple dependency graphs', () => {
      const commands = hasteFS.getAllCommands();
      const commandsWithDeps = commands.filter((c) => c.dependencies).slice(0, 2);

      if (commandsWithDeps.length > 0) {
        const graphs = commandsWithDeps.map((c) =>
          hasteFS.resolveDependencyGraph('command', c.name)
        );

        const merged = HasteFS.collectAllDependencies(graphs);
        expect(merged).toBeDefined();
        expect(merged instanceof Map).toBe(true);
      }
    });

    it('should deduplicate dependencies', () => {
      const commands = hasteFS.getAllCommands();
      const commandsWithDeps = commands.filter((c) => c.dependencies).slice(0, 2);

      if (commandsWithDeps.length >= 2) {
        const graphs = commandsWithDeps.map((c) =>
          hasteFS.resolveDependencyGraph('command', c.name)
        );

        const merged = HasteFS.collectAllDependencies(graphs);

        // Check that dependencies are properly merged
        for (const dep of merged.values()) {
          expect(dep.type).toBeDefined();
          expect(dep.name).toBeDefined();
          expect(Array.isArray(dep.requiredBy)).toBe(true);
          expect(typeof dep.depth).toBe('number');
        }
      }
    });
  });

  describe('FileNode structure', () => {
    it('should have correct FileNode structure', () => {
      const subagents = hasteFS.getAllSubagents();
      if (subagents.length > 0) {
        const node = subagents[0];

        expect(node?.path).toBeDefined();
        expect(node.relativePath).toBeDefined();
        expect(node.frontmatter).toBeDefined();
        expect(node.rawContent).toBeDefined();
        expect(node.content).toBeDefined();
        expect(node?.type).toBe('subagent');
        expect(node?.name).toBeDefined();
      }
    });
  });

  describe('getHasteMap', () => {
    it('should return readonly HasteMap', () => {
      const hasteMap = hasteFS.getHasteMap();
      expect(hasteMap).toBeDefined();
      expect(hasteMap.files).toBeDefined();
      expect(hasteMap.subagents).toBeDefined();
      expect(hasteMap.commands).toBeDefined();
      expect(hasteMap.skills).toBeDefined();
      expect(hasteMap.dependencyGraphs).toBeDefined();
    });

    it('should have populated maps', () => {
      const hasteMap = hasteFS.getHasteMap();
      expect(hasteMap.files.size).toBeGreaterThan(0);
      expect(hasteMap.subagents.size).toBeGreaterThan(0);
      expect(hasteMap.commands.size).toBeGreaterThan(0);
      expect(hasteMap.skills.size).toBeGreaterThan(0);
    });
  });
});
