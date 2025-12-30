/**
 * Tests for generate-update-matrix.ts
 *
 * Tests the skill auto-discovery and matrix generation logic
 */

import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const TEST_DIR = join(process.cwd(), '.test-matrix-generation');
const SCRIPT_PATH = join(process.cwd(), '.github/scripts/generate-update-matrix.ts');

describe('generate-update-matrix', () => {
	beforeEach(() => {
		// Create test directory structure
		if (existsSync(TEST_DIR)) {
			rmSync(TEST_DIR, { recursive: true, force: true });
		}
		mkdirSync(TEST_DIR, { recursive: true });
	});

	afterEach(() => {
		// Cleanup
		if (existsSync(TEST_DIR)) {
			rmSync(TEST_DIR, { recursive: true, force: true });
		}
	});

	it('should discover skills with valid frontmatter', () => {
		// Create test skill structure
		const skillPath = join(TEST_DIR, 'templates/skills/test-category/test-skill/.updater');
		mkdirSync(skillPath, { recursive: true });

		// Create prompt.md with valid frontmatter
		writeFileSync(
			join(skillPath, 'prompt.md'),
			`---
repos:
  - org/repo1
  - org/repo2
---

## Test Prompt
`
		);

		// Run script with test directory
		const result = execSync(`cd ${TEST_DIR} && bun run ${SCRIPT_PATH}`, {
			encoding: 'utf-8',
		});

		const matrix = JSON.parse(result);

		expect(matrix.include).toHaveLength(1);
		expect(matrix.include[0]).toMatchObject({
			skill: 'test-skill',
			skill_path: 'templates/skills/test-category/test-skill',
			repos: 'org/repo1,org/repo2',
		});
	});

	it('should discover multiple skills', () => {
		// Create first skill
		const skill1Path = join(TEST_DIR, 'templates/skills/category1/skill1/.updater');
		mkdirSync(skill1Path, { recursive: true });
		writeFileSync(
			join(skill1Path, 'prompt.md'),
			`---
repos:
  - org/repo1
---

## Prompt 1
`
		);

		// Create second skill
		const skill2Path = join(TEST_DIR, 'templates/skills/category2/skill2/.updater');
		mkdirSync(skill2Path, { recursive: true });
		writeFileSync(
			join(skill2Path, 'prompt.md'),
			`---
repos:
  - org/repo2
  - org/repo3
---

## Prompt 2
`
		);

		const result = execSync(`cd ${TEST_DIR} && bun run ${SCRIPT_PATH}`, {
			encoding: 'utf-8',
		});

		const matrix = JSON.parse(result);

		expect(matrix.include).toHaveLength(2);
		expect(matrix.include[0].skill).toBe('skill1');
		expect(matrix.include[1].skill).toBe('skill2');
	});

	it('should sort skills alphabetically', () => {
		// Create skills in non-alphabetical order
		const skillZPath = join(TEST_DIR, 'templates/skills/category/zebra/.updater');
		mkdirSync(skillZPath, { recursive: true });
		writeFileSync(
			join(skillZPath, 'prompt.md'),
			`---
repos:
  - org/repo1
---

## Zebra
`
		);

		const skillAPath = join(TEST_DIR, 'templates/skills/category/apple/.updater');
		mkdirSync(skillAPath, { recursive: true });
		writeFileSync(
			join(skillAPath, 'prompt.md'),
			`---
repos:
  - org/repo2
---

## Apple
`
		);

		const result = execSync(`cd ${TEST_DIR} && bun run ${SCRIPT_PATH}`, {
			encoding: 'utf-8',
		});

		const matrix = JSON.parse(result);

		expect(matrix.include).toHaveLength(2);
		expect(matrix.include[0].skill).toBe('apple');
		expect(matrix.include[1].skill).toBe('zebra');
	});

	it('should ignore skills without .updater directory', () => {
		// Create skill without .updater
		const skillPath = join(TEST_DIR, 'templates/skills/category/no-updater');
		mkdirSync(skillPath, { recursive: true });
		writeFileSync(join(skillPath, 'SKILL.md'), '# Skill without updater');

		// Create skill with .updater
		const updaterPath = join(TEST_DIR, 'templates/skills/category/with-updater/.updater');
		mkdirSync(updaterPath, { recursive: true });
		writeFileSync(
			join(updaterPath, 'prompt.md'),
			`---
repos:
  - org/repo1
---

## With Updater
`
		);

		const result = execSync(`cd ${TEST_DIR} && bun run ${SCRIPT_PATH}`, {
			encoding: 'utf-8',
		});

		const matrix = JSON.parse(result);

		expect(matrix.include).toHaveLength(1);
		expect(matrix.include[0].skill).toBe('with-updater');
	});

	it('should ignore .updater without prompt.md', () => {
		// Create .updater without prompt.md
		const updaterPath = join(TEST_DIR, 'templates/skills/category/no-prompt/.updater');
		mkdirSync(updaterPath, { recursive: true });
		writeFileSync(join(updaterPath, 'other-file.md'), '# Not a prompt');

		// Create valid skill
		const validPath = join(TEST_DIR, 'templates/skills/category/valid/.updater');
		mkdirSync(validPath, { recursive: true });
		writeFileSync(
			join(validPath, 'prompt.md'),
			`---
repos:
  - org/repo1
---

## Valid
`
		);

		const result = execSync(`cd ${TEST_DIR} && bun run ${SCRIPT_PATH}`, {
			encoding: 'utf-8',
		});

		const matrix = JSON.parse(result);

		expect(matrix.include).toHaveLength(1);
		expect(matrix.include[0].skill).toBe('valid');
	});

	it('should fail on missing frontmatter', () => {
		const skillPath = join(TEST_DIR, 'templates/skills/category/no-frontmatter/.updater');
		mkdirSync(skillPath, { recursive: true });
		writeFileSync(
			join(skillPath, 'prompt.md'),
			`## No Frontmatter

This prompt has no frontmatter.
`
		);

		expect(() => {
			execSync(`cd ${TEST_DIR} && bun run ${SCRIPT_PATH}`, {
				encoding: 'utf-8',
			});
		}).toThrow();
	});

	it('should fail on empty repos array', () => {
		const skillPath = join(TEST_DIR, 'templates/skills/category/empty-repos/.updater');
		mkdirSync(skillPath, { recursive: true });
		writeFileSync(
			join(skillPath, 'prompt.md'),
			`---
repos: []
---

## Empty Repos
`
		);

		expect(() => {
			execSync(`cd ${TEST_DIR} && bun run ${SCRIPT_PATH}`, {
				encoding: 'utf-8',
			});
		}).toThrow();
	});

	it('should fail on missing repos field', () => {
		const skillPath = join(TEST_DIR, 'templates/skills/category/no-repos/.updater');
		mkdirSync(skillPath, { recursive: true });
		writeFileSync(
			join(skillPath, 'prompt.md'),
			`---
other_field: value
---

## No Repos
`
		);

		expect(() => {
			execSync(`cd ${TEST_DIR} && bun run ${SCRIPT_PATH}`, {
				encoding: 'utf-8',
			});
		}).toThrow();
	});

	it('should handle nested skill directories', () => {
		// Create deeply nested skill
		const nestedPath = join(
			TEST_DIR,
			'templates/skills/category/subcategory/deep/nested-skill/.updater'
		);
		mkdirSync(nestedPath, { recursive: true });
		writeFileSync(
			join(nestedPath, 'prompt.md'),
			`---
repos:
  - org/repo1
---

## Nested
`
		);

		const result = execSync(`cd ${TEST_DIR} && bun run ${SCRIPT_PATH}`, {
			encoding: 'utf-8',
		});

		const matrix = JSON.parse(result);

		expect(matrix.include).toHaveLength(1);
		expect(matrix.include[0].skill).toBe('nested-skill');
		expect(matrix.include[0].skill_path).toBe(
			'templates/skills/category/subcategory/deep/nested-skill'
		);
	});

	it('should handle repos with hyphens and underscores', () => {
		const skillPath = join(TEST_DIR, 'templates/skills/category/special-chars/.updater');
		mkdirSync(skillPath, { recursive: true });
		writeFileSync(
			join(skillPath, 'prompt.md'),
			`---
repos:
  - my-org/my-repo
  - my_org/my_repo
  - mixed-org/mixed_repo
---

## Special Chars
`
		);

		const result = execSync(`cd ${TEST_DIR} && bun run ${SCRIPT_PATH}`, {
			encoding: 'utf-8',
		});

		const matrix = JSON.parse(result);

		expect(matrix.include).toHaveLength(1);
		expect(matrix.include[0].repos).toBe('my-org/my-repo,my_org/my_repo,mixed-org/mixed_repo');
	});
});
