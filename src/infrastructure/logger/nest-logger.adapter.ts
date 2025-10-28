import { Injectable, Logger } from '@nestjs/common';
import { ILogger } from '../../domain/logger/logger.interface';

@Injectable()
export class NestLoggerAdapter implements ILogger {
  log(message: string, context?: string): void {
    Logger.log(message, context);
  }

  warn(message: string, context?: string): void {
    Logger.warn(message, context);
  }

  error(message: string, context?: string): void {
    Logger.error(message, context);
  }

  debug(message: string, context?: string): void {
    Logger.debug(message, context);
  }
}
