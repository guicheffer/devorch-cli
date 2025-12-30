import type { Options } from '@anthropic-ai/claude-agent-sdk';
import { withLogging } from 'claude-pretty-printer/hooks';
import { loadAWSCredentials } from './bedrock-utils';
import type { TestPaths } from './project-utils';

export function getClaudeCodeOptions(testPaths: TestPaths): Options {
  // Load AWS SSO credentials
  const awsProfile = 'sso-bedrock';
  let awsEnv: Record<string, string>;
  try {
    awsEnv = loadAWSCredentials(awsProfile);
    console.log('✓ Loaded AWS credentials from profile:', awsProfile);
  } catch (err) {
    console.error('✗ Failed to load AWS credentials:', err);
    throw err;
  }

  // Merge AWS credentials with current PATH
  const fullEnv = {
    PATH: process.env.PATH || '',
    ...awsEnv,
  };

  return {
    env: fullEnv,
    cwd: testPaths.projectDir,
    maxTurns: 50,
    hooks: withLogging({}),
    permissionMode: 'bypassPermissions',
    executable: 'bun',
    settingSources: ['local', 'project'], // Fix: Enables command/agent discovery
    stderr: (data: string) => {
      console.error('STDERR:', data);
    },
  };
}
