import { describe, test } from 'bun:test';
import { TestScenario } from '../lib/index.js';

describe('full run of new-spec without product', () => {
  test('should execute /new-spec and validate prerequisite checks', async () => {
    // Create and setup test scenario
    const scenario = await TestScenario.create('full-run-of-new-spec-without-product', __dirname)
      .withProject({
        commands: ['/new-spec', '/analyze-tech-stack'],
        cloneRepo: 'yourcompany/web',
      })
      .build();

    try {
      await scenario
        .phase('setup-until-label-selection')
        .query('/devorch:new-spec')
        .expect(['Did the new spec command stop because no product was found?'])
        .run();
    } finally {
      scenario.cleanup();
    }
  }, 10000000);
});
