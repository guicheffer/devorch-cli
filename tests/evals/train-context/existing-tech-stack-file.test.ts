import { describe, test } from 'bun:test';
import { TestScenario } from '../lib/index.js';

describe('full run of train-context-2', () => {
  test('should execute /train-context-2 and validate prerequisite checks', async () => {
    // Create and setup test scenario
    const scenario = await TestScenario.create('full-run-of-train-context-2', __dirname)
      .withProject({
        commands: ['/train-context-2', '/analyze-tech-stack'],
        cloneRepo: 'yourcompany/web',
      })
      .withFixture('tech-stack.md')
      .build();

    try {
      await scenario
        .phase('setup-until-label-selection')
        .query('/devorch:train-context-2')
        .expect([
          'Did we find sufficient squad labels?',
          'Did we find sufficient tribe labels?',
          'Did the pr-fetcher subagent analyze the repository for available labels?',
          'Did the pr-fetcher subagent present choices including all labels and squad-specific labels?',
        ])
        .run();

      await scenario
        .phase('setup-after-label-selection')
        .respond('all labels are fine')
        .fork(true)
        .expect([
          'did we present the prs by size?',
          'did we give the user the ability to select prs to analyze by quantity and time range?',
          'did we give the user the ability to select prs by pr change size (small, medium, big)?',
        ])
        .run();

      await scenario
        .phase('setup-after-pr-selection')
        .respond('1. fastest, 2. last 3 months, 3. balanced')
        .fork(true)
        .expect(['did it find patterns across n+ domains from the PRs?'])
        .run();

      await scenario.phase('setup-after-pattern-analysis').respond('proceed anyway').run();
    } finally {
      scenario.cleanup();
    }
  }, 10000000);
});
