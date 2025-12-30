import { describe, test } from 'bun:test';
import { join } from 'node:path';
import { TestScenario } from '../lib/index.js';

describe('full run of plan-product without product', () => {
  test('should execute /plan-product and validate prerequisite checks', async () => {
    // Create and setup test scenario
    const scenario = await TestScenario.create('full-run-of-plan-product', __dirname)
      .withProject({
        commands: ['/plan-product'],
        cloneRepo: 'yourcompany/web',
      })
      .withFixture('tech-stack.md')
      .build();

    scenario.clearCheckpoints();

    try {
      await scenario
        .phase('start-of-plan-product')
        .query('/devorch:plan-product')
        .expect(['did the command ask for a product name?'])
        .run();

      await scenario.phase('name-product').query('new-funnel-design').fork(true).run();

      await scenario
        .phase('post-product-brief')
        .query(await Bun.file(join(__dirname, 'fixtures', 'product-brief.md')).text())
        .fork(true)
        .run();
    } finally {
      scenario.cleanup();
    }
  }, 10000000);
});
