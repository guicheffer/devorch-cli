#!/usr/bin/env bun

/**
 * Determines the next version for a release using semantic versioning.
 * Used by GitHub Actions to calculate the next semantic version.
 *
 * Semver rules:
 * - Changes to src/cli/** = minor bump (CLI changes)
 * - Changes to templates/** only = patch bump (template changes)
 * - PR labels can override: semver:major, semver:minor, semver:patch
 */

import { appendFileSync } from 'node:fs';
import { $ } from 'bun';
import semver from 'semver';

type BumpType = 'major' | 'minor' | 'patch' | 'skip';

interface PRInfo {
  number: number;
  labels: string[];
  title: string;
  body: string;
}

/**
 * Extract the Summary section from PR body
 */
function extractSummary(body: string): string {
  // Look for ## Summary section
  const summaryMatch = body.match(/##\s*Summary\s*\n([\s\S]*?)(?=\n##|\n🤖|$)/i);
  if (summaryMatch?.[1]) {
    return summaryMatch[1].trim();
  }
  // Fallback: return the body before Test plan or emoji marker
  const fallback = body.split(/\n##\s*Test\s*plan|\n🤖/i)[0];
  return fallback?.trim() || '';
}

/**
 * Get the merged PR that triggered this build
 */
async function getMergedPR(): Promise<PRInfo | null> {
  try {
    // Get the commit message to find PR number
    const commitMsg = await $`git log -1 --format=%s`.text();
    const prMatch = commitMsg.match(/\(#(\d+)\)/);

    if (!prMatch) {
      console.log('No PR number found in commit message');
      return null;
    }

    const prNumber = parseInt(prMatch[1] ?? '0', 10);
    console.log(`Found PR #${prNumber} in commit message`);

    // Get PR details (labels, title, body)
    const prJson = await $`gh pr view ${prNumber} --json labels,title,body`.text();
    const prData = JSON.parse(prJson);

    const labels = (prData.labels || []).map((l: { name: string }) => l.name);
    const title = prData.title || '';
    const body = prData.body || '';

    console.log(`PR #${prNumber} title: ${title}`);
    console.log(`PR #${prNumber} labels: ${labels.join(', ') || '(none)'}`);

    return { number: prNumber, labels, title, body };
  } catch (err) {
    console.log('Could not get PR info:', err);
    return null;
  }
}

/**
 * Get changed files between current commit and previous release
 */
async function getChangedFiles(latestRelease: string): Promise<string[]> {
  try {
    if (!latestRelease) {
      // First release - list all files
      const allFiles = await $`git ls-files`.text();
      return allFiles
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean);
    }

    // Get changed files since last release
    const diff = await $`git diff --name-only ${latestRelease}..HEAD`.text();
    return diff
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean);
  } catch (err) {
    console.log('Could not get changed files:', err);
    return [];
  }
}

/**
 * Determine bump type from PR labels or changed files
 *
 * Release-worthy changes:
 * - src/ → minor (CLI binary changes)
 * - templates/ → patch (template-only update)
 *
 * Non-release changes (skip):
 * - .github/, docs/, tests/, installer/
 * - Config files (biome.json, tsconfig.json, etc.)
 * - Documentation (README.md, CONTRIBUTING.md, etc.)
 */
function determineBumpType(labels: string[], changedFiles: string[]): BumpType {
  // Check for explicit semver labels (highest priority)
  const bumpTypes: BumpType[] = ['skip', 'major', 'minor', 'patch'];
  for (const type of bumpTypes) {
    if (labels.includes(`semver:${type}`)) {
      console.log(`Bump type: ${type} (from PR label)`);
      return type;
    }
  }

  // Auto-detect from changed files
  const hasSrcChanges = changedFiles.some((f) => f.startsWith('src/'));
  const hasTemplateChanges = changedFiles.some((f) => f.startsWith('templates/'));
  const hasInstallerChanges = changedFiles.some((f) => f.startsWith('installer/'));

  if (hasSrcChanges) {
    console.log('Bump type: minor (detected src/ changes)');
    return 'minor';
  }

  if (hasTemplateChanges || hasInstallerChanges) {
    const reason = hasTemplateChanges ? 'template' : 'installer';
    console.log(`Bump type: patch (detected ${reason} changes)`);
    return 'patch';
  }

  // No release-worthy changes - skip release
  console.log('Bump type: skip (no src/, templates/, or installer/ changes)');
  return 'skip';
}

/**
 * Calculate minimum compatible CLI version based on bump type
 * - Patch: current major.minor (templates compatible with same CLI minor)
 * - Minor: new version (CLI update required)
 * - Major: new version (breaking change)
 */
function calculateMinCompatibleCli(
  currentVersion: string,
  newVersion: string,
  bumpType: BumpType
): string {
  if (bumpType === 'patch') {
    // For patch (templates only), min compatible is the current minor
    const parsed = semver.parse(currentVersion);
    if (parsed) {
      return `${parsed.major}.${parsed.minor}.0`;
    }
  }

  // For minor/major, the new version is required
  return newVersion;
}

/**
 * Calculate the next version based on the latest release and bump type
 */
function calculateNextVersion(latestRelease: string, bumpType: BumpType): string {
  if (!latestRelease) {
    return '1.0.0';
  }

  const clean = latestRelease.replace(/^v/, '');
  const incremented = semver.inc(clean, bumpType);

  if (!incremented) {
    throw new Error(`Failed to increment version ${clean} with bump type ${bumpType}`);
  }

  return incremented;
}

/**
 * Determine the tag name to use for the release
 */
function determineTagName(newVersion: string): string {
  return `v${newVersion}`;
}

/**
 * Get list of template files that changed (for release notes)
 */
function getTemplateChanges(changedFiles: string[]): string[] {
  return changedFiles.filter((f) => f.startsWith('templates/'));
}

async function main() {
  const githubOutput = process.env.GITHUB_OUTPUT;

  if (!githubOutput) {
    console.error('Error: GITHUB_OUTPUT environment variable not set');
    process.exit(1);
  }

  try {
    // Get latest release version from GitHub
    const result = await $`gh release list --limit 1 --json tagName --jq '.[0].tagName'`.nothrow();
    const latestRelease = result.exitCode === 0 ? result.text().trim() : '';

    console.log(latestRelease ? `Latest release: ${latestRelease}` : 'Latest release: none');

    // Get PR info for labels
    const prInfo = await getMergedPR();
    const labels = prInfo?.labels ?? [];

    // Get changed files since last release
    const changedFiles = await getChangedFiles(latestRelease);
    console.log(`Changed files: ${changedFiles.length}`);

    // Determine bump type
    const bumpType = determineBumpType(labels, changedFiles);

    // Handle skip - no release needed
    if (bumpType === 'skip') {
      console.log('\nNo release needed - skipping');
      appendFileSync(githubOutput, `skip=true\n`);
      appendFileSync(githubOutput, `bump_type=skip\n`);
      return;
    }

    // Calculate new version
    const newVersion = calculateNextVersion(latestRelease, bumpType);
    console.log(`New version: ${newVersion}`);

    // Determine tag name
    const tagName = determineTagName(newVersion);

    // Calculate min compatible CLI
    const minCompatibleCli = calculateMinCompatibleCli(
      latestRelease.replace(/^v/, ''),
      newVersion,
      bumpType
    );
    console.log(`Min compatible CLI: ${minCompatibleCli}`);

    // Get template changes for release notes
    const templateChanges = getTemplateChanges(changedFiles);

    // Extract PR title and summary for release notes
    const prTitle = prInfo?.title || '';
    const prSummary = prInfo?.body ? extractSummary(prInfo.body) : '';

    // Write outputs
    appendFileSync(githubOutput, `skip=false\n`);
    appendFileSync(githubOutput, `new_version=${newVersion}\n`);
    appendFileSync(githubOutput, `tag_name=${tagName}\n`);
    appendFileSync(githubOutput, `bump_type=${bumpType}\n`);
    appendFileSync(githubOutput, `min_compatible_cli=v${minCompatibleCli}\n`);
    appendFileSync(githubOutput, `changed_files=${JSON.stringify(templateChanges)}\n`);
    // Use EOF delimiter for multiline outputs
    appendFileSync(githubOutput, `pr_title<<EOF\n${prTitle}\nEOF\n`);
    appendFileSync(githubOutput, `pr_summary<<EOF\n${prSummary}\nEOF\n`);

    console.log('\nOutputs:');
    console.log(`  tag_name: ${tagName}`);
    console.log(`  bump_type: ${bumpType}`);
    console.log(`  min_compatible_cli: v${minCompatibleCli}`);
    console.log(`  changed_files: ${templateChanges.length} template files`);
    console.log(`  pr_title: ${prTitle}`);
    console.log(`  pr_summary: ${prSummary.substring(0, 100)}...`);
  } catch (error) {
    console.error('Error determining version:', error);
    process.exit(1);
  }
}

// Export for testing
export { calculateNextVersion, determineBumpType, calculateMinCompatibleCli };

if (import.meta.main) {
  main();
}
