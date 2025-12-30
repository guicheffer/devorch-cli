/**
 * eval-test-builder
 *
 * A fluent API library for writing eval tests with automatic checkpoint
 * management, fixture loading, and validation.
 *
 * ## Quick Start
 *
 * ```typescript
 * import { TestScenario } from './lib/index.js';
 *
 * const scenario = TestScenario.create('my-test', __dirname)
 *   .withProject({
 *     commands: ['/train-context-2'],
 *     cloneRepo: 'yourcompany/web',
 *   })
 *   .withFixture('tech-stack.md')
 *   .build();
 *
 * // Execute phases
 * await scenario.phase('check-prerequisites')
 *   .query('/devorch:train-context-2')
 *   .expect(['Did we find tech-stack.md?'])
 *   .run();
 *
 * await scenario.phase('select-squad')
 *   .respond('Mobile')
 *   .expect(['Did we filter PRs?'])
 *   .run();
 * ```
 *
 * ## Features
 *
 * - **Automatic Checkpointing**: Phases are automatically checkpointed and skipped on re-runs
 * - **Fluent API**: Method chaining for readable test code
 * - **Fixture Management**: Easy loading of test fixtures
 * - **Validation**: Question-based validation of Claude's output
 * - **Session Management**: Automatic session resumption and forking
 * - **Error Context**: Clear error messages with helpful context
 *
 * ## API Documentation
 *
 * ### TestScenario.create()
 *
 * Create a new test scenario builder:
 *
 * ```typescript
 * TestScenario.create(name, testFilePath?)
 * ```
 *
 * - `name`: Unique scenario name
 * - `testFilePath`: Path to test file (use `import.meta.url`)
 *
 * ### Builder Methods
 *
 * - `.withProject(config)`: Configure test project
 * - `.withFixture(filename, sourcePath?)`: Add a fixture file
 * - `.withFixtures(filenames)`: Add multiple fixtures
 * - `.withFixtureContent(filename, content)`: Add fixture with inline content
 * - `.withOptions(overrides)`: Override Claude Code options
 * - `.build()`: Build and setup the test scenario (async)
 *
 * ### Phase Methods
 *
 * - `.phase(name)`: Create a new phase
 * - `.query(prompt)`: Send a fresh query to Claude
 * - `.respond(response)`: Respond to Claude (resumes from previous phase)
 * - `.resume()`: Resume from previous phase without prompt
 * - `.fork(enabled)`: Enable session forking
 * - `.expect(questions)`: Add validation questions
 * - `.withOptions(overrides)`: Override options for this phase
 * - `.run()`: Execute the phase (async)
 * - `.runForks(branches)`: Execute multiple fork branches (async)
 *
 * ### Cleanup
 *
 * ```typescript
 * scenario.clearCheckpoints(); // Clear all checkpoints
 * scenario.cleanup();          // Cleanup test project
 * ```
 *
 * ## Advanced Usage
 *
 * ### Fork Testing
 *
 * Test different conversation branches:
 *
 * ```typescript
 * const branches = await scenario.phase('choose-path')
 *   .query('What would you like to do?')
 *   .runForks([
 *     {
 *       respond: 'Option A',
 *       validate: ['Did we handle option A?'],
 *     },
 *     {
 *       respond: 'Option B',
 *       validate: ['Did we handle option B?'],
 *     },
 *   ]);
 * ```
 *
 * ### Custom Options
 *
 * Override Claude Code options per scenario or phase:
 *
 * ```typescript
 * // Scenario-level overrides
 * const scenario = TestScenario.create('my-test')
 *   .withProject({...})
 *   .withOptions({ maxTurns: 50 })
 *   .build();
 *
 * // Phase-level overrides
 * await scenario.phase('custom-phase')
 *   .query('...')
 *   .withOptions({ maxTurns: 100 })
 *   .run();
 * ```
 *
 * ### Inline Fixtures
 *
 * Create fixtures from strings:
 *
 * ```typescript
 * const scenario = TestScenario.create('my-test')
 *   .withProject({...})
 *   .withFixtureContent('config.yml', `
 *     key: value
 *   `)
 *   .build();
 * ```
 */

export { FixtureManager } from './fixtures.js';
export { PhaseRunner } from './phase.js';
export { ProjectBuilder, TestProject } from './project.js';
// Utility exports (for advanced usage)
export { executeQuery, executeQueryWithResume } from './query.js';
// Main API exports
export { TestScenario, TestScenarioBuilder } from './scenario.js';
export { SessionManager } from './session.js';
// Type exports
export type {
  FixtureConfig,
  ForkBranch,
  PhaseResult,
  ProjectConfig,
  QueryConfig,
  ScenarioConfig,
  SessionCheckpoint,
  TestPaths,
  ValidationResult,
} from './types.js';
export {
  allValidationsPassed,
  formatValidationResults,
  getFailedValidations,
  validateMessages,
} from './validation.js';
