import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class CacheWrapperService {
  private readonly logger = new Logger(CacheWrapperService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.cacheManager.get<T>(key);
      return cached ?? null;
    } catch (error) {
      this.logger.warn(
        `Cache read operation failed: ${(error as Error).message}`,
      );
      return null;
    }
  }

  async set(key: string, value: unknown, ttl: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl);
    } catch (error) {
      this.logger.warn(
        `Cache write operation failed: ${(error as Error).message}`,
      );
    }
  }
}
