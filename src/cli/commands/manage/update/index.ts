import { chmodSync, existsSync, unlinkSync, writeFileSync } from 'node:fs';
import { arch, homedir, platform, tmpdir } from 'node:os';
import { join } from 'node:path';
import * as p from '@clack/prompts';
import { $ } from 'bun';
import { installCommand } from '@/cli/commands/setup/install/index.js';
import assetNames from '@/cli/lib/release/asset-names.json';
import { flushAndExit } from '@/cli/lib/telemetry/telemetry.js';
import { SystemError } from '@/utils/errors.js';
import { checkGhCli, getLatestRelease } from '@/utils/gh.js';
import { intro, outro, spinner } from '@/utils/ui.js';

const REPO = 'guicheffer/devorch';
const INSTALL_DIR = join(homedir(), '.local', 'bin');
const BINARY_NAME = 'devorch';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Get the expected binary name for the current platform
 */
function getExpectedBinaryName(): string {
  const os = platform();
  const architecture = arch();
  const key = `${os}-${architecture}` as keyof typeof assetNames.binaries;

  const binaryName = assetNames.binaries[key];
  if (!binaryName) {
    throw SystemError.unsupportedPlatform('platform', `${os}-${architecture}`);
  }

  return binaryName;
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch and parse the "What's Changed" section from release notes
 */
async function getChangesSummary(version: string): Promise<string | null> {
  try {
    const result = await $`gh release view ${version} --repo ${REPO} --json body --jq '.body'`
      .nothrow()
      .quiet();

    if (result.exitCode !== 0) {
      return null;
    }

    const body = result.stdout.toString().trim();

    // Extract content between "## What's Changed" and "---"
    const match = body.match(/## What's Changed\s*([\s\S]*?)(?=\n---|\n<details|$)/);
    if (match?.[1]) {
      return match[1].trim();
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * List all assets in a release
 */
async function listReleaseAssets(version: string): Promise<string[]> {
  try {
    const result =
      await $`gh release view ${version} --repo ${REPO} --json assets --jq '.assets[].name'`
        .nothrow()
        .quiet();

    if (result.exitCode !== 0) {
      return [];
    }

    return result.stdout
      .toString()
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Find binary assets from a list (filter out zips, tarballs, etc)
 */
function findBinaryAssets(assets: string[]): string[] {
  return assets.filter((name) => {
    // Include binaries, exclude packages
    const isZip = name.endsWith('.zip');
    const isTarGz = name.endsWith('.tar.gz');
    const isConfig = name === 'config.tar.gz';
    return !isZip && !isTarGz && !isConfig;
  });
}

/**
 * Try to download a binary with retries
 */
async function tryDownloadBinary(
  binaryName: string,
  version: string,
  outputPath: string,
  onRetry?: (attempt: number, error: string) => void
): Promise<{ success: boolean; error?: string }> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result =
        await $`gh release download ${version} --repo ${REPO} --pattern ${binaryName} --output ${outputPath} --clobber`
          .nothrow()
          .quiet();

      if (result.exitCode === 0) {
        return { success: true };
      }

      const stderr = result.stderr.toString().trim();

      // Check if asset simply doesn't exist (not a transient error)
      if (stderr.includes('no assets match') || stderr.includes('not found')) {
        return { success: false, error: 'Asset not found' };
      }

      // For other errors, retry with backoff
      if (attempt < MAX_RETRIES) {
        onRetry?.(attempt, stderr);
        await sleep(RETRY_DELAY_MS * attempt);
      } else {
        return {
          success: false,
          error: `Download failed after ${MAX_RETRIES} attempts: ${stderr}`,
        };
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (attempt >= MAX_RETRIES) {
        return { success: false, error: errMsg };
      }
      onRetry?.(attempt, errMsg);
      await sleep(RETRY_DELAY_MS * attempt);
    }
  }

  return { success: false, error: 'Unknown error' };
}

/**
 * Download the binary with smart recovery
 */
async function downloadBinary(
  version: string,
  outputPath: string,
  onStatus: (message: string) => void
): Promise<string> {
  const expectedName = getExpectedBinaryName();

  onStatus(`Downloading ${expectedName}...`);

  // Try the expected name first
  const result = await tryDownloadBinary(expectedName, version, outputPath, (attempt, error) => {
    onStatus(`Retry ${attempt}/${MAX_RETRIES}: ${error}`);
  });

  if (result.success) {
    return expectedName;
  }

  // Download failed - let's see what assets are available
  onStatus('Expected asset not found, checking available assets...');
  const allAssets = await listReleaseAssets(version);
  const binaryAssets = findBinaryAssets(allAssets);

  if (binaryAssets.length === 0) {
    throw SystemError.downloadFailed(
      `${platform()}-${arch()}`,
      [expectedName],
      `No binary assets found in release ${version}. Available assets: ${allAssets.join(', ') || 'none'}`
    );
  }

  // Clean up any partial download first
  if (existsSync(outputPath)) {
    try {
      unlinkSync(outputPath);
    } catch {
      // Ignore cleanup errors
    }
  }

  const selected = await p.select({
    message: `Could not find "${expectedName}" in release. Select a binary to download:`,
    options: [
      ...binaryAssets.map((name) => ({ value: name, label: name })),
      { value: '__cancel__', label: 'Cancel update' },
    ],
  });

  if (p.isCancel(selected) || selected === '__cancel__') {
    throw SystemError.downloadFailed(
      `${platform()}-${arch()}`,
      [expectedName],
      'Update cancelled by user.'
    );
  }

  onStatus(`Downloading ${selected}...`);
  const selectedResult = await tryDownloadBinary(
    selected as string,
    version,
    outputPath,
    (attempt, error) => {
      onStatus(`Retry ${attempt}/${MAX_RETRIES}: ${error}`);
    }
  );

  if (!selectedResult.success) {
    throw SystemError.downloadFailed(
      `${platform()}-${arch()}`,
      [expectedName, selected as string],
      selectedResult.error
    );
  }

  return selected as string;
}

/**
 * Get currently installed version
 */
async function getCurrentVersion(): Promise<string | null> {
  try {
    const result = await $`devorch --version`.nothrow().text();
    // Extract version - should be just "v1.0.50" or similar
    // Also handle old format "Version v1.0.50" for backward compatibility
    const match = result.match(/(?:Version\s+)?(v[\d.]+)/);
    return match?.[1]?.trim() ?? null;
  } catch {
    return null;
  }
}

/**
 * Create an update script that will replace the binary after the CLI exits
 * Returns the path to the update script
 */
async function createUpdateScript(
  tempBinaryPath: string,
  targetBinaryPath: string,
  version: string,
  cliPid: number
): Promise<string> {
  const isWindows = platform() === 'win32';
  const scriptExt = isWindows ? '.bat' : '.sh';
  const scriptPath = join(tmpdir(), `devorch-update-${Date.now()}${scriptExt}`);

  if (isWindows) {
    // Windows batch script - wait for parent process to exit first
    const script = `@echo off
echo Waiting for CLI (PID ${cliPid}) to exit...
:wait_loop
tasklist /FI "PID eq ${cliPid}" 2>NUL | find /I /N "devorch">NUL
if "%ERRORLEVEL%"=="0" (
    timeout /t 1 /nobreak >nul
    goto wait_loop
)
echo Updating devorch to ${version}...
move /y "${tempBinaryPath}" "${targetBinaryPath}"
if %errorlevel% equ 0 (
    echo Update completed successfully!
    REM Check if config exists before running install
    if exist "devorch.config.yml" (
        echo Installing updated templates...
        "${targetBinaryPath}" install 2>NUL || echo Failed to install templates. Run 'devorch install' manually.
    ) else if exist "devorch.config.yaml" (
        echo Installing updated templates...
        "${targetBinaryPath}" install 2>NUL || echo Failed to install templates. Run 'devorch install' manually.
    ) else if exist "devorch\\config.yml" (
        echo Installing updated templates...
        "${targetBinaryPath}" install 2>NUL || echo Failed to install templates. Run 'devorch install' manually.
    ) else if exist "devorch\\config.yaml" (
        echo Installing updated templates...
        "${targetBinaryPath}" install 2>NUL || echo Failed to install templates. Run 'devorch install' manually.
    ) else (
        echo No config file found, skipping template installation.
    )
) else (
    echo Update failed! Error: %errorlevel%
    echo Temp binary: ${tempBinaryPath}
    echo Target binary: ${targetBinaryPath}
)
del "%~f0"
`;
    writeFileSync(scriptPath, script);
  } else {
    // Unix shell script - wait for parent process to exit first
    const script = `#!/bin/sh
echo "Waiting for CLI (PID ${cliPid}) to exit..."
# Wait for the CLI process to exit (up to 10 seconds)
for i in 1 2 3 4 5 6 7 8 9 10; do
    if ! kill -0 ${cliPid} 2>/dev/null; then
        break
    fi
    sleep 1
done
echo "Updating devorch to ${version}..."
mv -f "${tempBinaryPath}" "${targetBinaryPath}"
if [ $? -eq 0 ]; then
    echo "Update completed successfully!"
    # Check if config exists before running install
    if [ -f "devorch.config.yml" ] || [ -f "devorch.config.yaml" ] || [ -f "devorch/config.yml" ] || [ -f "devorch/config.yaml" ]; then
        echo "Installing updated templates..."
        "${targetBinaryPath}" install 2>&1 || echo "Failed to install templates. Run 'devorch install' manually."
    else
        echo "No config file found, skipping template installation."
    fi
else
    echo "Update failed! Error: $?"
    echo "Temp binary: ${tempBinaryPath}"
    echo "Target binary: ${targetBinaryPath}"
fi
rm -f "$0"
`;
    writeFileSync(scriptPath, script);
    chmodSync(scriptPath, 0o755);
  }

  return scriptPath;
}

/**
 * Spawn the update process in a detached state
 */
async function spawnUpdateProcess(scriptPath: string): Promise<void> {
  const isWindows = platform() === 'win32';

  try {
    if (isWindows) {
      // Windows - use cmd.exe to run the batch script in background
      // The 'start' command with /b runs it in background without creating a new window
      await $`cmd.exe /c start /min ${scriptPath}`;
    } else {
      // Unix - run the shell script in background with nohup
      // The & at the end makes it run in background, nohup keeps it running after parent exits
      await $`sh -c "nohup ${scriptPath} &"`;
    }
  } catch (error) {
    throw SystemError.updateScriptFailed(scriptPath, error);
  }
}

export async function updateCommand() {
  intro('🔄 Updating devorch');

  const s = spinner();

  try {
    // Check gh CLI
    await checkGhCli();

    // Get current version
    s.start('Checking current version...');
    const currentVersion = await getCurrentVersion();
    if (currentVersion) {
      s.stop(`Current version: ${currentVersion}`);
    } else {
      s.stop('No current version detected');
    }

    // Get latest release
    s.start('Checking for latest version...');
    const latestVersion = await getLatestRelease(REPO);

    if (currentVersion === latestVersion) {
      s.stop(`✓ Already on latest version: ${latestVersion}`);
      // Run install to refresh templates
      await installCommand({});
      return;
    }

    s.stop(`Latest version: ${latestVersion}`);

    // Show what changed in the new version
    const changesSummary = await getChangesSummary(latestVersion);
    if (changesSummary) {
      p.note(changesSummary, "What's Changed");
    }

    // Prepare paths
    const binaryPath = join(INSTALL_DIR, BINARY_NAME);
    const tempPath = `${binaryPath}.new`;

    // Download new binary with retry and fallback logic
    s.start('Downloading...');
    const downloadedBinaryName = await downloadBinary(latestVersion, tempPath, (status) => {
      s.message(status);
    });
    s.stop(`✓ Downloaded ${latestVersion} (${downloadedBinaryName})`);

    // Make executable (Unix only)
    if (platform() !== 'win32') {
      chmodSync(tempPath, 0o755);
    }

    // Check if binary exists
    if (!existsSync(binaryPath)) {
      throw SystemError.binaryNotFound(binaryPath);
    }

    // Create an update script that will replace the binary after this process exits
    s.start('Preparing update...');
    const updateScriptPath = await createUpdateScript(
      tempPath,
      binaryPath,
      latestVersion,
      process.pid
    );
    s.stop(`✓ Prepared update script`);

    outro(
      `Successfully downloaded ${latestVersion}!\n\nThe update will complete automatically when this process exits.\nPlease wait a moment, then restart the CLI to use the new version.`
    );

    // Spawn detached process to perform the update after we exit
    await spawnUpdateProcess(updateScriptPath);

    // Give the update process a moment to start
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Exit the CLI so the binary can be replaced
    await flushAndExit(0);
  } catch (err) {
    s.stop('✗ Update failed');
    throw err;
  }
}
