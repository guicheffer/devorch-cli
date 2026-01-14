import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test';
import * as configLoader from '@/cli/lib/config/config-loader.js';
import * as contextTrainingLoader from '@/cli/lib/context-training/context-training-loader.js';
import type { Config } from '@/schemas';
import { getContextTrainingCommand } from './index.js';

describe('get-context-training command', () => {
  let exitSpy: ReturnType<typeof spyOn>;
  let consoleSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    // Mock process.exit to prevent test from exiting
    exitSpy = spyOn(process, 'exit').mockImplementation(() => undefined as never);
    // Capture console.log output
    consoleSpy = spyOn(console, 'log').mockImplementation(() => {
      // Intentionally empty - we're just capturing calls, not logging
    });
  });

  afterEach(() => {
    exitSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('should output empty when no context-training configured', async () => {
    // Mock config with no context-training
    spyOn(configLoader, 'loadConfig').mockReturnValue({
      profile: {
        name: 'test',
        agents: ['claude-code'],
        context_training: undefined,
      },
      commands: [],
    } as Partial<Config> as Config);

    await getContextTrainingCommand();

    expect(consoleSpy).toHaveBeenCalledWith('CONTEXT_TRAINING=');
    expect(consoleSpy).toHaveBeenCalledWith('CONFIGURED=false');
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('should output context-training name when configured', async () => {
    // Mock config with context-training
    spyOn(configLoader, 'loadConfig').mockReturnValue({
      profile: {
        name: 'test',
        agents: ['claude-code'],
        context_training: 'my-context',
      },
      commands: [],
    } as Partial<Config> as Config);

    // Mock context-training exists
    spyOn(contextTrainingLoader, 'contextTrainingExists').mockReturnValue(true);

    await getContextTrainingCommand();

    expect(consoleSpy).toHaveBeenCalledWith('CONTEXT_TRAINING=my-context');
    expect(consoleSpy).toHaveBeenCalledWith('CONFIGURED=true');
    expect(consoleSpy).toHaveBeenCalledWith('EXISTS=true');
    expect(consoleSpy).toHaveBeenCalledWith('PATH=devorch/context-training/my-context/');
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('should indicate when context-training does not exist', async () => {
    // Mock config with context-training
    spyOn(configLoader, 'loadConfig').mockReturnValue({
      profile: {
        name: 'test',
        agents: ['claude-code'],
        context_training: 'missing-context',
      },
      commands: [],
    } as Partial<Config> as Config);

    // Mock context-training does not exist
    spyOn(contextTrainingLoader, 'contextTrainingExists').mockReturnValue(false);

    await getContextTrainingCommand();

    expect(consoleSpy).toHaveBeenCalledWith('CONTEXT_TRAINING=missing-context');
    expect(consoleSpy).toHaveBeenCalledWith('CONFIGURED=true');
    expect(consoleSpy).toHaveBeenCalledWith('EXISTS=false');
    expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('PATH='));
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('should handle errors gracefully', async () => {
    // Mock config loading error
    spyOn(configLoader, 'loadConfig').mockImplementation(() => {
      throw new Error('Config error');
    });

    await getContextTrainingCommand();

    expect(consoleSpy).toHaveBeenCalledWith('ERROR=command_failed');
    expect(consoleSpy).toHaveBeenCalledWith('MESSAGE=Config error');
    expect(exitSpy).toHaveBeenCalledWith(2);
  });
});
