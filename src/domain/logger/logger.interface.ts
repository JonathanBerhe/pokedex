export interface ILogger {
  log(message: string, context?: string): void;
  warn(message: string, context?: string): void;
  error(message: string, context?: string): void;
  debug(message: string, context?: string): void;
}

export const LOGGER_TOKEN = Symbol('ILogger');
