import os from 'node:os';
import * as Sentry from '@sentry/node';

interface TelemetryConfig {
  enabled?: boolean;
  environment?: string;
}

interface EventMetadata {
  type: string; // e.g., 'cli', 'slash-command', 'user-action', etc.
  duration?: number;
  [key: string]: unknown; // Allow any additional properties
}

/**
 * Telemetry client for tracking CLI usage with Sentry
 *
 * Features:
 * - Command usage tracking via breadcrumbs
 * - Error tracking
 * - Performance monitoring
 * - User identification via username (hostname captured separately by Sentry)
 * - Non-blocking, fails gracefully
 */
export class Telemetry {
  private enabled: boolean;
  private computerId: string;
  private version: string;

  constructor(config: TelemetryConfig, version: string) {
    this.version = version;
    this.enabled = this.isEnabled(config.enabled);
    this.computerId = this.getComputerId();

    if (!this.enabled) {
      return;
    }

    try {
      Sentry.init({
        dsn: 'https://53db7d758b11dcf3e709e80a2931d6ed@o46710.ingest.us.sentry.io/4510397257154560',
        environment: config.environment || process.env.NODE_ENV || 'production',
        release: `devorch@${version}`,

        // Performance monitoring
        tracesSampleRate: 0.1, // 10% of transactions

        // Profiling
        profilesSampleRate: 0.1, // 10% of transactions

        // Do not send default PII (includes IP address)
        sendDefaultPii: false,

        // Transport options
        transport: Sentry.makeNodeTransport,

        // Don't capture console logs or breadcrumbs automatically
        integrations: [Sentry.captureConsoleIntegration({ levels: [] })],

        // Privacy: Filter out sensitive data
        beforeSend(event) {
          // Remove command line arguments that might contain secrets
          if (event.extra) {
            delete event.extra.argv;
            delete event.extra.env;
          }

          // Remove breadcrumb data that might contain paths or arguments
          if (event.breadcrumbs) {
            event.breadcrumbs.forEach((breadcrumb) => {
              if (breadcrumb.data?.args) {
                delete breadcrumb.data.args;
              }
              if (breadcrumb.data?.path) {
                delete breadcrumb.data.path;
              }
            });
          }

          return event;
        },
      });

      // Set user context with username (hostname is in server_name)
      Sentry.setUser({
        id: this.computerId,
        username: this.computerId,
      });

      // Set global context
      Sentry.setContext('cli', {
        version: this.version,
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        cwd: '<redacted>', // Don't send actual working directory
      });
    } catch (_err) {
      // Fail silently if telemetry initialization fails
      this.enabled = false;
    }
  }

  /**
   * Track a generic event (success case only)
   */
  trackEvent(eventName: string, metadata: EventMetadata): void {
    if (!this.enabled) return;

    try {
      Sentry.captureMessage(eventName, {
        level: 'info',
        tags: {
          event: eventName,
          event_type: metadata.type,
          cli_version: this.version,
        },
        extra: {
          ...metadata,
        },
      });
    } catch (_err) {
      // Fail silently
    }
  }

  /**
   * Capture an exception/error
   */
  captureException(error: Error, context?: Record<string, unknown>): void {
    if (!this.enabled) return;

    try {
      Sentry.captureException(error, {
        tags: {
          cli_version: this.version,
        },
        extra: context,
      });
    } catch (_err) {
      // Fail silently
    }
  }

  /**
   * Add a breadcrumb for logger integration
   */
  addLogBreadcrumb(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    context?: Record<string, unknown>
  ): void {
    if (!this.enabled) return;

    try {
      // Map logger levels to Sentry levels
      const sentryLevel: Sentry.SeverityLevel =
        level === 'warn' ? 'warning' : (level as Sentry.SeverityLevel);

      Sentry.addBreadcrumb({
        category: 'log',
        message,
        level: sentryLevel,
        data: context,
      });
    } catch (_err) {
      // Fail silently
    }
  }

  /**
   * Start a transaction for performance monitoring
   */
  startTransaction(name: string, op: string): Sentry.Span | null {
    if (!this.enabled) return null;

    try {
      return Sentry.startInactiveSpan({
        name,
        op,
      });
    } catch (_err) {
      return null;
    }
  }

  /**
   * Flush pending events without closing
   * Use this before process.exit() calls
   */
  async flush(timeout = 500): Promise<void> {
    if (!this.enabled) return;

    try {
      await Sentry.flush(timeout);
    } catch (_err) {
      // Fail silently
    }
  }

  /**
   * Flush all pending events and close connection
   * Should be called before CLI exits
   */
  async shutdown(): Promise<void> {
    if (!this.enabled) return;

    try {
      await Sentry.close(2000); // Wait up to 2 seconds to flush
    } catch (_err) {
      // Fail silently
    }
  }

  /**
   * Check if telemetry is enabled based on config and environment
   */
  private isEnabled(configEnabled?: boolean): boolean {
    // Telemetry is disabled by default
    // To enable, set DEVORCH_TELEMETRY=true and configure your own Sentry DSN
    if (process.env.DEVORCH_TELEMETRY !== 'true') {
      return false;
    }

    // Respect config setting
    if (configEnabled === false) {
      return false;
    }

    // Disable in CI environments by default
    const isCI = process.env.CI === 'true' || process.env.CONTINUOUS_INTEGRATION === 'true';

    if (isCI) {
      return false;
    }

    return true;
  }

  /**
   * Get computer identifier for user tracking
   * Uses username to identify the user (hostname is already captured by Sentry in server_name)
   * In company environments, this typically maps to employee names
   */
  private getComputerId(): string {
    try {
      return os.userInfo().username;
    } catch (_err) {
      return 'unknown';
    }
  }
}

/**
 * Global telemetry instance
 */
let telemetryInstance: Telemetry | null = null;

/**
 * Initialize telemetry
 */
export function initTelemetry(config: TelemetryConfig, version: string): Telemetry {
  telemetryInstance = new Telemetry(config, version);
  return telemetryInstance;
}

/**
 * Get telemetry instance
 */
export function getTelemetry(): Telemetry | null {
  return telemetryInstance;
}

/**
 * Flush telemetry (use before process.exit())
 */
export async function flushTelemetry(timeout = 2000): Promise<void> {
  if (telemetryInstance) {
    await telemetryInstance.flush(timeout);
  }
}

/**
 * Flush telemetry and exit with code
 * Convenience wrapper to ensure telemetry is flushed before exit
 */
export async function flushAndExit(code = 0, timeout = 2000): Promise<never> {
  await flushTelemetry(timeout);
  process.exit(code);
}

/**
 * Shutdown telemetry
 */
export async function shutdownTelemetry(): Promise<void> {
  if (telemetryInstance) {
    await telemetryInstance.shutdown();
  }
}
