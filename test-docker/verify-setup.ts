#!/usr/bin/env bun
/**
 * Verification script for setup-bedrock in Docker
 * Runs inside the container after setup completes
 */

import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => { passed: boolean; message: string; details?: string }) {
  try {
    const result = fn();
    results.push({ name, ...result });
  } catch (err) {
    results.push({
      name,
      passed: false,
      message: `Test threw an error: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
}

function printResults() {
  console.log('\n📊 Test Results\n');

  for (const result of results) {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.name}`);
    console.log(`   ${result.message}`);
    if (result.details) {
      console.log(`   ${result.details}`);
    }
    console.log('');
  }

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  const failed = total - passed;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`${'='.repeat(60)}\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

// Test 1: AWS config file exists
test('AWS config file exists', () => {
  const awsConfigPath = join(homedir(), '.aws', 'config');
  const exists = existsSync(awsConfigPath);

  return {
    passed: exists,
    message: exists ? 'File exists at ~/.aws/config' : 'File not found at ~/.aws/config',
    details: exists ? `Path: ${awsConfigPath}` : undefined,
  };
});

// Test 2: AWS config contains sso-bedrock profile
test('AWS config contains sso-bedrock profile', () => {
  const awsConfigPath = join(homedir(), '.aws', 'config');

  if (!existsSync(awsConfigPath)) {
    return {
      passed: false,
      message: 'Cannot check profile - config file does not exist',
    };
  }

  const content = readFileSync(awsConfigPath, 'utf-8');
  const hasProfile = content.includes('[profile sso-bedrock]');

  return {
    passed: hasProfile,
    message: hasProfile ? 'Profile sso-bedrock found' : 'Profile sso-bedrock not found',
    details: hasProfile
      ? 'Config contains: [profile sso-bedrock]'
      : 'Expected [profile sso-bedrock] in config',
  };
});

// Test 3: AWS config contains SSO configuration
test('AWS config contains SSO configuration', () => {
  const awsConfigPath = join(homedir(), '.aws', 'config');

  if (!existsSync(awsConfigPath)) {
    return { passed: false, message: 'Config file does not exist' };
  }

  const content = readFileSync(awsConfigPath, 'utf-8');
  const hasSsoStartUrl = content.includes('sso_start_url =');
  const hasSsoRegion = content.includes('sso_region =');
  const hasSsoAccountId = content.includes('sso_account_id =');
  const hasSsoRoleName = content.includes('sso_role_name =');

  const allPresent = hasSsoStartUrl && hasSsoRegion && hasSsoAccountId && hasSsoRoleName;

  return {
    passed: allPresent,
    message: allPresent ? 'SSO configuration complete' : 'SSO configuration incomplete',
    details: allPresent
      ? 'Contains: sso_start_url, sso_region, sso_account_id, sso_role_name'
      : `Missing: ${[
          !hasSsoStartUrl && 'sso_start_url',
          !hasSsoRegion && 'sso_region',
          !hasSsoAccountId && 'sso_account_id',
          !hasSsoRoleName && 'sso_role_name',
        ]
          .filter(Boolean)
          .join(', ')}`,
  };
});

// Test 4: AWS config contains correct SSO start URL
test('AWS config contains YourCompany SSO start URL', () => {
  const awsConfigPath = join(homedir(), '.aws', 'config');

  if (!existsSync(awsConfigPath)) {
    return { passed: false, message: 'Config file does not exist' };
  }

  const content = readFileSync(awsConfigPath, 'utf-8');
  const expectedUrl = 'https://d-93677e566e.awsapps.com/start';
  const hasUrl = content.includes(`sso_start_url = ${expectedUrl}`);

  return {
    passed: hasUrl,
    message: hasUrl ? 'SSO start URL is correct' : 'SSO start URL not found or incorrect',
    details: hasUrl ? `URL: ${expectedUrl}` : `Expected: ${expectedUrl}`,
  };
});

// Test 5: AWS config contains correct region
test('AWS config contains default region (eu-west-1)', () => {
  const awsConfigPath = join(homedir(), '.aws', 'config');

  if (!existsSync(awsConfigPath)) {
    return { passed: false, message: 'Config file does not exist' };
  }

  const content = readFileSync(awsConfigPath, 'utf-8');
  const hasRegion = content.includes('region = eu-west-1');

  return {
    passed: hasRegion,
    message: hasRegion ? 'Region set to eu-west-1' : 'Region not set to eu-west-1',
    details: hasRegion ? 'Default region configured correctly' : 'Expected: region = eu-west-1',
  };
});

// Test 6: AWS config contains SSO region
test('AWS config contains SSO region', () => {
  const awsConfigPath = join(homedir(), '.aws', 'config');

  if (!existsSync(awsConfigPath)) {
    return { passed: false, message: 'Config file does not exist' };
  }

  const content = readFileSync(awsConfigPath, 'utf-8');
  const hasRegion = content.includes('sso_region = eu-west-1');

  return {
    passed: hasRegion,
    message: hasRegion ? 'SSO region configured' : 'SSO region not configured',
    details: hasRegion ? 'SSO region: eu-west-1' : 'Expected: sso_region = eu-west-1',
  };
});

// Test 7: AWS config format is valid
test('AWS config has valid INI format', () => {
  const awsConfigPath = join(homedir(), '.aws', 'config');

  if (!existsSync(awsConfigPath)) {
    return { passed: false, message: 'Config file does not exist' };
  }

  const content = readFileSync(awsConfigPath, 'utf-8');
  const lines = content.split('\n');

  // Check for basic INI structure
  let hasValidStructure = true;
  let errorLine = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '' || line.startsWith('#')) continue;

    // Should be either a section header or key-value pair
    const isSectionHeader = /^\[[\w\s-]+\]$/.test(line);
    const isKeyValue = /^[\w_-]+\s*=\s*.+$/.test(line);

    if (!isSectionHeader && !isKeyValue) {
      hasValidStructure = false;
      errorLine = `Line ${i + 1}: "${line}"`;
      break;
    }
  }

  return {
    passed: hasValidStructure,
    message: hasValidStructure ? 'AWS config has valid INI format' : 'AWS config has invalid format',
    details: hasValidStructure ? `${lines.length} lines parsed successfully` : errorLine,
  };
});

// Test 8: Claude settings file check (optional in CI mode)
test('Claude settings file status', () => {
  const claudeSettingsPath = join(homedir(), '.claude', 'settings.json');
  const exists = existsSync(claudeSettingsPath);

  if (!exists) {
    // This is expected in CI mode
    return {
      passed: true,
      message: 'Claude settings not created (expected in --ci mode)',
      details: 'AWS SSO login skipped, so model selection was skipped',
    };
  }

  // If file exists, verify it's valid JSON
  try {
    const content = readFileSync(claudeSettingsPath, 'utf-8');
    const settings = JSON.parse(content);

    // Check if it has AWS-related config
    const hasAwsConfig =
      settings.auth?.type === 'aws' ||
      settings.model?.startsWith('eu.') ||
      settings.model?.startsWith('us.');

    return {
      passed: true,
      message: hasAwsConfig
        ? 'Claude settings exists with AWS config'
        : 'Claude settings exists (no AWS config yet)',
      details: `Model: ${settings.model || 'not set'}`,
    };
  } catch (err) {
    return {
      passed: false,
      message: 'Claude settings file exists but contains invalid JSON',
      details: err instanceof Error ? err.message : String(err),
    };
  }
});

// Test 9: Homebrew is installed and in PATH
test('Homebrew is accessible', () => {
  const brewPath = '/home/linuxbrew/.linuxbrew/bin/brew';
  const exists = existsSync(brewPath);

  return {
    passed: exists,
    message: exists ? 'Homebrew binary found' : 'Homebrew binary not found',
    details: exists ? `Path: ${brewPath}` : 'Expected at /home/linuxbrew/.linuxbrew/bin/brew',
  };
});

// Test 10: Claude Code is installed
test('Claude Code is installed', () => {
  const claudePath = '/home/linuxbrew/.linuxbrew/bin/claude';
  const exists = existsSync(claudePath);

  return {
    passed: exists,
    message: exists ? 'Claude Code binary found' : 'Claude Code binary not found',
    details: exists ? `Path: ${claudePath}` : 'Expected at /home/linuxbrew/.linuxbrew/bin/claude',
  };
});

// Test 11: AWS CLI is installed
test('AWS CLI is installed', () => {
  const awsPath = '/home/linuxbrew/.linuxbrew/bin/aws';
  const exists = existsSync(awsPath);

  return {
    passed: exists,
    message: exists ? 'AWS CLI binary found' : 'AWS CLI binary not found',
    details: exists ? `Path: ${awsPath}` : 'Expected at /home/linuxbrew/.linuxbrew/bin/aws',
  };
});

// Print AWS config for debugging
console.log('\n📄 AWS Config Contents:\n');
const awsConfigPath = join(homedir(), '.aws', 'config');
if (existsSync(awsConfigPath)) {
  const content = readFileSync(awsConfigPath, 'utf-8');
  console.log(content);
  console.log('\n' + '='.repeat(60) + '\n');
} else {
  console.log('❌ File not found\n');
}

// Run all tests
printResults();
