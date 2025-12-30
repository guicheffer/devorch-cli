/**
 * Test summary utility for collecting and displaying test results
 */

interface TestResult {
  testName: string;
  status: 'pass' | 'fail' | 'skip';
  duration?: number;
  error?: string;
  timestamp: number;
}

class TestSummaryCollector {
  private results: TestResult[] = [];
  private startTime: number = Date.now();

  recordPass(testName: string, duration?: number) {
    this.results.push({
      testName,
      status: 'pass',
      duration,
      timestamp: Date.now(),
    });
  }

  recordFail(testName: string, error: string, duration?: number) {
    this.results.push({
      testName,
      status: 'fail',
      error,
      duration,
      timestamp: Date.now(),
    });
  }

  recordSkip(testName: string) {
    this.results.push({
      testName,
      status: 'skip',
      timestamp: Date.now(),
    });
  }

  printSummary() {
    const totalDuration = ((Date.now() - this.startTime) / 1000).toFixed(2);
    const passed = this.results.filter((r) => r.status === 'pass').length;
    const failed = this.results.filter((r) => r.status === 'fail').length;
    const skipped = this.results.filter((r) => r.status === 'skip').length;

    console.log(`\n${'='.repeat(80)}`);
    console.log('📊  TEST SUMMARY');
    console.log('='.repeat(80));

    // Print all results
    for (const result of this.results) {
      const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⏭️';
      const durationStr = result.duration ? ` (${(result.duration / 1000).toFixed(2)}s)` : '';
      console.log(`${icon}  ${result.testName}${durationStr}`);

      if (result.error) {
        // Print error with indentation
        const errorLines = result.error.split('\n');
        for (const line of errorLines) {
          console.log(`    ${line}`);
        }
      }
    }

    console.log('='.repeat(80));
    console.log(
      `Total: ${this.results.length} tests | ✅ ${passed} passed | ❌ ${failed} failed | ⏭️ ${skipped} skipped | ⏱️  ${totalDuration}s`
    );
    console.log(`${'='.repeat(80)}\n`);
  }

  getResults() {
    return this.results;
  }

  hasFailed() {
    return this.results.some((r) => r.status === 'fail');
  }

  clear() {
    this.results = [];
    this.startTime = Date.now();
  }
}

// Global instance
let globalSummary: TestSummaryCollector | null = null;

export function getTestSummary(): TestSummaryCollector {
  if (!globalSummary) {
    globalSummary = new TestSummaryCollector();
  }
  return globalSummary;
}

export function resetTestSummary() {
  globalSummary = new TestSummaryCollector();
}

/**
 * Wrapper for test execution that automatically tracks results
 */
export async function trackTest<T>(
  testName: string,
  fn: () => Promise<T>,
  _options?: { skipOnCheckpoint?: boolean }
): Promise<T> {
  const summary = getTestSummary();
  const startTime = Date.now();

  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    summary.recordPass(testName, duration);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    summary.recordFail(testName, errorMessage, duration);
    throw error;
  }
}

/**
 * Print summary at the end of test suite
 * Use in afterAll() hook
 */
export function printTestSummary() {
  const summary = getTestSummary();
  summary.printSummary();
}
