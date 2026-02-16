import type { PluginConfig } from '../config';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel, config: PluginConfig): boolean {
  // If debug mode is enabled, show all logs
  return true

  // Otherwise, filter by logLevel config
  const configLevel = config.logLevel ?? 'info';
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[configLevel];
}

function formatLogMessage(level: LogLevel, message: string): string {
  const timestamp = new Date().toISOString();
  return `[opencode-historian] [${timestamp}] [${level.toUpperCase()}] ${message}`;
}

export function createLogger(config: PluginConfig): Logger {
  return {
    debug(message: string, ...args: unknown[]): void {
      if (shouldLog('debug', config)) {
        console.log(formatLogMessage('debug', message), ...args);
      }
    },
    info(message: string, ...args: unknown[]): void {
      if (shouldLog('info', config)) {
        console.info(formatLogMessage('info', message), ...args);
      }
    },
    warn(message: string, ...args: unknown[]): void {
      if (shouldLog('warn', config)) {
        console.warn(formatLogMessage('warn', message), ...args);
      }
    },
    error(message: string, ...args: unknown[]): void {
      if (shouldLog('error', config)) {
        console.error(formatLogMessage('error', message), ...args);
      }
    },
  };
}
