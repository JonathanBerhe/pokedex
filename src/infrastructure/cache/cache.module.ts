import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import KeyvRedis from '@keyv/redis';

/**
 * Global cache module using Redis as the backing store
 *
 * Configuration:
 * - Redis host: localhost (development)
 * - Redis port: 6379 (default)
 * - TTL: 0 (infinite) - Pokemon and translation data never changes
 *
 * Graceful degradation:
 * - If Redis is unavailable, cache operations will fail silently
 * - Repositories handle cache failures and fall back to API calls
 */
@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => {
        try {
          // TODO: use the config service here.
          const store = new KeyvRedis('redis://localhost:6379')
          return { store };
        } catch (error) {
          // TODO: improve this.
          //
          // If Redis connection fails, return memory cache as fallback
          console.warn(
            'Failed to connect to Redis, falling back to in-memory cache:',
            error,
          );
          return {
            ttl: 0,
          };
        }
      },
    }),
  ],
  exports: [CacheModule],
})
export class RedisCacheModule {}
