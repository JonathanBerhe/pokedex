import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import KeyvRedis from '@keyv/redis';

/**
 * Global cache module using Redis as the backing store
 *
 * Configuration:
 * - Redis host: from REDIS_HOST env var (default: localhost)
 * - Redis port: from REDIS_PORT env var (default: 6379)
 * - TTL: 0 (infinite) - Pokemon and translation data never changes
 *
 * Graceful degradation:
 * - If Redis is unavailable, cache operations will fail silently
 * - Repositories handle cache failures and fall back to API calls
 */
@Global()
@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
      useFactory: () => {
        try {
          const redisHost = process.env.REDIS_HOST || 'localhost';
          const redisPort = process.env.REDIS_PORT || '6379';
          const redisUrl = `redis://${redisHost}:${redisPort}`;

          console.log(`Connecting to Redis at ${redisUrl}`);
          const store = new KeyvRedis(redisUrl);
          return { store };
        } catch (error) {
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
