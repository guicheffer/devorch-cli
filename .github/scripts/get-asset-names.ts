#!/usr/bin/env bun
/**
 * Script to output asset names for GitHub Actions release workflow.
 * Reads from the centralized asset-names.json config.
 *
 * Usage: bun run .github/scripts/get-asset-names.ts [type]
 * Types: macos-arm64, macos-x64, linux-x64, linux-arm64, windows-x64
 *
 * Without arguments, outputs all asset names as GitHub Actions outputs.
 */

import assetNames from '../../src/cli/lib/release/asset-names.json';

const binaryMapping: Record<string, keyof typeof assetNames.binaries> = {
  'macos-arm64': 'darwin-arm64',
  'macos-x64': 'darwin-x64',
  'linux-x64': 'linux-x64',
  'linux-arm64': 'linux-arm64',
  'windows-x64': 'win32-x64',
};

const type = process.argv[2];

if (!type) {
  // Output all asset names as environment variables for GitHub Actions

  // Binaries
  console.log(`BINARY_MACOS_ARM64=${assetNames.binaries['darwin-arm64']}`);
  console.log(`BINARY_MACOS_X64=${assetNames.binaries['darwin-x64']}`);
  console.log(`BINARY_LINUX_X64=${assetNames.binaries['linux-x64']}`);
  console.log(`BINARY_LINUX_ARM64=${assetNames.binaries['linux-arm64']}`);
  console.log(`BINARY_WINDOWS_X64=${assetNames.binaries['win32-x64']}`);

  // Packages (zip files, without version suffix)
  console.log(`PKG_MAC_APPLE_SILICON=${assetNames.packages['mac-apple-silicon']}`);
  console.log(`PKG_MAC_INTEL=${assetNames.packages['mac-intel']}`);
  console.log(`PKG_LINUX=${assetNames.packages['linux']}`);
  console.log(`PKG_LINUX_ARM=${assetNames.packages['linux-arm']}`);
  console.log(`PKG_WINDOWS=${assetNames.packages['windows']}`);

  process.exit(0);
}

const key = binaryMapping[type];
if (!key) {
  console.error(`Unknown type: ${type}`);
  console.error(`Valid types: ${Object.keys(binaryMapping).join(', ')}`);
  process.exit(1);
}

console.log(assetNames.binaries[key]);
