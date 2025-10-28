import { Global, Module } from '@nestjs/common';
import { LOGGER_TOKEN } from '../../domain/logger/logger.interface';
import { NestLoggerAdapter } from './nest-logger.adapter';

@Global()
@Module({
  providers: [
    {
      provide: LOGGER_TOKEN,
      useClass: NestLoggerAdapter,
    },
  ],
  exports: [LOGGER_TOKEN],
})
export class LoggerModule {}
