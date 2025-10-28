import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import type { ILogger } from '../../domain/logger/logger.interface';
import { LOGGER_TOKEN } from '../../domain/logger/logger.interface';

@Injectable()
export class CacheWrapperService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @Inject(LOGGER_TOKEN) private readonly logger: ILogger,
  ) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.cacheManager.get<T>(key);
      return cached ?? null;
    } catch (error) {
      this.logger.warn(
        `Cache read operation failed: ${(error as Error).message}`,
        CacheWrapperService.name,
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
        CacheWrapperService.name,
      );
    }
  }
}
