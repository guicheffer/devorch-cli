import { spawnSync } from 'node:child_process';

/**
 * Load AWS SSO credentials from the specified profile.
 * If AWS credentials are already present in the environment, returns them directly.
 * Otherwise, runs `aws configure export-credentials --profile <profile>` to get temporary credentials.
 */
export function loadAWSCredentials(profile: string): Record<string, string> {
  // Check if credentials are already in the environment
  if (
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.CLAUDE_CODE_USE_BEDROCK === '1'
  ) {
    console.log('Using AWS credentials from environment variables');
    return {
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
      AWS_SESSION_TOKEN: process.env.AWS_SESSION_TOKEN || '',
      AWS_REGION: process.env.AWS_REGION || 'eu-west-1',
      CLAUDE_CODE_USE_BEDROCK: process.env.CLAUDE_CODE_USE_BEDROCK,
      ANTHROPIC_MODEL:
        process.env.ANTHROPIC_MODEL || 'global.anthropic.claude-sonnet-4-5-20250929-v1:0',
    };
  }

  // Load credentials from AWS SSO profile
  console.log(`Loading AWS credentials from profile: ${profile}`);
  const result = spawnSync(
    'aws',
    ['configure', 'export-credentials', '--profile', profile, '--format', 'process'],
    {
      encoding: 'utf-8',
    }
  );

  if (result.error) {
    throw new Error(`Failed to load AWS credentials: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(`AWS CLI error: ${result.stderr}`);
  }

  try {
    const credentials = JSON.parse(result.stdout);
    return {
      AWS_ACCESS_KEY_ID: credentials.AccessKeyId,
      AWS_SECRET_ACCESS_KEY: credentials.SecretAccessKey,
      AWS_SESSION_TOKEN: credentials.SessionToken,
      AWS_REGION: process.env.AWS_REGION || 'eu-west-1',
      CLAUDE_CODE_USE_BEDROCK: '1',
      ANTHROPIC_MODEL:
        process.env.ANTHROPIC_MODEL || 'global.anthropic.claude-sonnet-4-5-20250929-v1:0',
    };
  } catch (err) {
    throw new Error(`Failed to parse AWS credentials: ${err}`);
  }
}
