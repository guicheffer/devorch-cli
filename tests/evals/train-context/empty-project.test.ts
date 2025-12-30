import { afterAll, beforeAll, describe, test } from 'bun:test';
import { TestScenario } from '../lib';

describe('Empty project: behavior when tech-stack.md is missing', () => {
  let scenario: TestScenario;

  beforeAll(async () => {
    scenario = await TestScenario.create('empty-project-no-tech-stack', import.meta.url)
      .withProject({
        commands: ['/train-context-2', '/analyze-tech-stack'],
      })
      .build();
  });

  afterAll(() => {
    scenario.cleanup();
  });

  test('should execute /train-context-2 and validate prerequisite checks', async () => {
    await scenario
      .phase('train-context-2')
      .query('/devorch:train-context-2')
      .expect([
        'Do the bash commands create the devorch/context-training directory?',
        'Do the bash commands check whether the devorch/tech-stack.md file exists?',
        'Do the bash commands check whether the devorch/context-training directory exists?',
        'Do the bash commands check whether jq/gh are installed?',
        'Do the bash commands check if gh is authenticated?',
        'Did the analysis not continue because no tech stack file was found?',
      ])
      .run();
  }, 300000);

  test('should execute /analyze-tech-stack and fail gracefully when tech-stack.md is missing', async () => {
    await scenario
      .phase('analyze-tech-stack')
      .respond('since we need a tech stack file, please run: /devorch:analyze-tech-stack')
      .fork(true)
      .expect(['Did the analysis not continue because no dependencies were found?'])
      .run();
  }, 600000);
});
