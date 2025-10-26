import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PokemonControllerRESTModule } from './presentation/controller/rest/pokemon-controller.module';

@Module({
  imports: [
    // Global rate limiting configuration
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000, // 1 minute in milliseconds
        limit: 10, // 10 requests per minute by default
      },
    ]),
    PokemonControllerRESTModule,
  ],
  controllers: [],
  providers: [
    // Apply throttler guard globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
