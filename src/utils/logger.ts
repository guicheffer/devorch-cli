import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { INSTALL_PATHS } from '@/cli/lib/filesystem/paths.js';
import { colors } from './colors.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  level?: LogLevel;
  quiet?: boolean;
  verbose?: boolean;
  debug?: boolean;
  logFile?: string;
  telemetryHook?: (level: LogLevel, message: string, context?: Record<string, unknown>) => void;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

class Logger {
  private level: LogLevel;
  private quiet: boolean;
  private logFile?: string;
  private telemetryHook?: (
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>
  ) => void;

  constructor(options: LoggerOptions = {}) {
    // Determine log level based on flags
    if (options.debug) {
      this.level = 'debug';
    } else if (options.verbose) {
      this.level = 'debug';
    } else if (options.level) {
      this.level = options.level;
    } else {
      this.level = 'info';
    }

    this.quiet = options.quiet || false;
    this.logFile = options.logFile;
    this.telemetryHook = options.telemetryHook;

    // Ensure log file directory exists
    if (this.logFile) {
      const logDir = join(process.cwd(), INSTALL_PATHS.specMachineRoot());
      if (!existsSync(logDir)) {
        mkdirSync(logDir, { recursive: true });
      }
    }
  }

  /**
   * Check if a log level should be displayed
   */
  private shouldLog(level: LogLevel): boolean {
    if (this.quiet && level !== 'error') {
      return false;
    }

    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.level);
    const messageLevelIndex = levels.indexOf(level);

    return messageLevelIndex >= currentLevelIndex;
  }

  /**
   * Format a log entry for console output
   */
  private formatConsole(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    const time = timestamp.split('T')[1]?.split('.')[0] ?? '';

    let prefix = '';
    let coloredMessage = message;

    switch (level) {
      case 'debug':
        prefix = colors.dim(`[${time}] DEBUG`);
        coloredMessage = colors.dim(message);
        break;
      case 'info':
        prefix = colors.dim(`[${time}]`);
        break;
      case 'warn':
        prefix = colors.yellow(`[${time}] WARN`);
        coloredMessage = colors.yellow(message);
        break;
      case 'error':
        prefix = colors.red(`[${time}] ERROR`);
        coloredMessage = colors.red(message);
        break;
    }

    return `${prefix} ${coloredMessage}`;
  }

  /**
   * Format a log entry for file output
   */
  private formatFile(entry: LogEntry): string {
    const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
    return `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}${contextStr}\n`;
  }

  /**
   * Write log entry to file
   */
  private writeToFile(entry: LogEntry) {
    if (!this.logFile) return;

    try {
      const logPath = join(process.cwd(), this.logFile);
      const formatted = this.formatFile(entry);
      appendFileSync(logPath, formatted);
    } catch (_err) {
      // Silently fail if we can't write to log file
      // Don't want to break the app due to logging issues
    }
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: Record<string, unknown>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'debug',
      message,
      context,
    };

    if (this.shouldLog('debug')) {
      console.log(this.formatConsole('debug', message));
      if (context) {
        console.log(colors.dim(JSON.stringify(context, null, 2)));
      }
    }

    this.writeToFile(entry);
    this.telemetryHook?.('debug', message, context);
  }

  /**
   * Log an info message
   */
  info(message: string, context?: Record<string, unknown>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      context,
    };

    if (this.shouldLog('info')) {
      console.log(this.formatConsole('info', message));
    }

    this.writeToFile(entry);
    this.telemetryHook?.('info', message, context);
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: Record<string, unknown>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      context,
    };

    if (this.shouldLog('warn')) {
      console.warn(this.formatConsole('warn', message));
      if (context) {
        console.warn(colors.yellow(JSON.stringify(context, null, 2)));
      }
    }

    this.writeToFile(entry);
    this.telemetryHook?.('warn', message, context);
  }

  /**
   * Log an error message
   */
  error(message: string, context?: Record<string, unknown>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      context,
    };

    if (this.shouldLog('error')) {
      console.error(this.formatConsole('error', message));
      if (context) {
        console.error(colors.red(JSON.stringify(context, null, 2)));
      }
    }

    this.writeToFile(entry);
    this.telemetryHook?.('error', message, context);
  }

  /**
   * Log a file operation
   */
  fileOp(operation: 'read' | 'write' | 'delete', path: string, success = true) {
    this.debug(`File ${operation}: ${path}`, { operation, path, success });
  }

  /**
   * Log an API call
   */
  apiCall(
    method: string,
    endpoint: string,
    payload?: unknown,
    response?: unknown,
    error?: unknown
  ) {
    this.debug(`API ${method} ${endpoint}`, {
      method,
      endpoint,
      payload,
      response,
      error,
    });
  }

  /**
   * Update log level dynamically
   */
  setLevel(level: LogLevel) {
    this.level = level;
  }

  /**
   * Update quiet mode
   */
  setQuiet(quiet: boolean) {
    this.quiet = quiet;
  }

  /**
   * Get current log file path
   */
  getLogFile(): string | undefined {
    return this.logFile;
  }
}

// Global logger instance
let globalLogger: Logger | null = null;

/**
 * Initialize the global logger
 */
export function initLogger(options: LoggerOptions): Logger {
  globalLogger = new Logger(options);
  return globalLogger;
}

/**
 * Get the global logger instance
 */
export function getLogger(): Logger {
  if (!globalLogger) {
    globalLogger = new Logger();
  }
  return globalLogger;
}

/**
 * Convenience functions for logging
 */
export const logger = {
  debug: (message: string, context?: Record<string, unknown>) =>
    getLogger().debug(message, context),
  info: (message: string, context?: Record<string, unknown>) => getLogger().info(message, context),
  warn: (message: string, context?: Record<string, unknown>) => getLogger().warn(message, context),
  error: (message: string, context?: Record<string, unknown>) =>
    getLogger().error(message, context),
  fileOp: (operation: 'read' | 'write' | 'delete', path: string, success?: boolean) =>
    getLogger().fileOp(operation, path, success),
  apiCall: (
    method: string,
    endpoint: string,
    payload?: unknown,
    response?: unknown,
    error?: unknown
  ) => getLogger().apiCall(method, endpoint, payload, response, error),
};
