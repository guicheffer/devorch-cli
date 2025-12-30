/**
 * Fixture loading and management
 *
 * Provides utilities for loading test fixtures from files or inline content.
 */

import { existsSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import type { FixtureConfig, TestPaths } from './types.js';

/**
 * Manages fixture loading for test scenarios
 */
export class FixtureManager {
  private testFileDir: string;
  private testPaths: TestPaths;

  /**
   * @param testFileDir - Directory containing the test file (for resolving relative paths)
   * @param testPaths - Test project paths
   */
  constructor(testFileDir: string, testPaths: TestPaths) {
    this.testFileDir = testFileDir;
    this.testPaths = testPaths;
  }

  /**
   * Load a single fixture by name
   * By default, looks in fixtures/ directory relative to test file
   *
   * @param filename - Target filename in devorch dir
   * @param sourcePath - Optional custom source path
   */
  async loadFixture(filename: string, sourcePath?: string): Promise<void> {
    const resolvedSourcePath = this.resolveSourcePath(filename, sourcePath);
    const targetPath = join(this.testPaths.specMachineDir, filename);

    await this.copyFixture(resolvedSourcePath, targetPath);
  }

  /**
   * Load multiple fixtures
   */
  async loadFixtures(fixtures: FixtureConfig[]): Promise<void> {
    await Promise.all(
      fixtures.map((fixture) => {
        if (fixture.content) {
          return this.writeFixtureContent(fixture.targetFilename, fixture.content);
        } else {
          return this.loadFixture(fixture.targetFilename, fixture.sourcePath);
        }
      })
    );
  }

  /**
   * Write fixture content directly
   */
  private async writeFixtureContent(targetFilename: string, content: string): Promise<void> {
    const targetPath = join(this.testPaths.specMachineDir, targetFilename);
    await Bun.write(targetPath, content);
  }

  /**
   * Resolve the source path for a fixture
   */
  private resolveSourcePath(filename: string, sourcePath?: string): string {
    if (sourcePath) {
      // If absolute path, use as-is
      if (isAbsolute(sourcePath)) {
        return sourcePath;
      }
      // Otherwise, resolve relative to test file directory
      return join(this.testFileDir, sourcePath);
    }

    // Default: look in fixtures/ directory relative to test file
    return join(this.testFileDir, 'fixtures', filename);
  }

  /**
   * Copy fixture file to target location
   */
  private async copyFixture(sourcePath: string, targetPath: string): Promise<void> {
    if (!existsSync(sourcePath)) {
      throw new Error(
        `Fixture file not found: ${sourcePath}\n` +
          `Make sure the fixture exists or provide a custom sourcePath.`
      );
    }

    const content = await Bun.file(sourcePath).text();
    await Bun.write(targetPath, content);
  }
}
