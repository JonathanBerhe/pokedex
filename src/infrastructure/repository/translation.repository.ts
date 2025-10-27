import { Injectable, Logger, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { type Cache } from 'cache-manager';
import { createHash } from 'crypto';
import { firstValueFrom } from 'rxjs';
import { FunTranslationsResponse, TranslationType } from '../../domain/model/translation.model';
import { ITranslationRepository } from '../../domain/repository/translation.repository.interface';
import { withExponentialBackoff } from './util/exponential-backoff.util';

/**
 * Client for interacting with the FunTranslations API
 * https://funtranslations.com/
 *
 * Note: The free API has rate limits (5 requests/hour)
 *
 * Implements caching with Redis:
 * - Cache key format: translation:{type}:{hash(text)}
 * - Uses SHA256 hash to avoid key length issues with long texts
 * - TTL: Infinite (translations don't change)
 * - Graceful degradation: Falls back to API if cache fails
 */
@Injectable()
export class TranslationRepository implements ITranslationRepository {
  private readonly baseUrl = 'https://api.funtranslations.com/translate';
  private readonly logger = new Logger(TranslationRepository.name);
  private readonly cacheKeyPrefix = 'translation';

  constructor(
    private readonly httpService: HttpService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  /**
   * Generate cache key for translation
   * Uses SHA256 hash of text to avoid key length issues
   * Format: translation:{type}:{hash}
   *
   * @param text Text to translate
   * @param type Translation type
   * @returns Cache key
   */
  private generateCacheKey(text: string, type: TranslationType): string {
    const textHash = createHash('sha256').update(text).digest('hex');
    return `${this.cacheKeyPrefix}:${type}:${textHash}`;
  }

  /**
   * Translate text using the specified translation type
   * Implements lazy-loading cache pattern:
   * 1. Check cache first
   * 2. If cache miss or error, fetch from API
   * 3. Store in cache for future requests
   *
   * @param text Text to translate
   * @param type Translation type (shakespeare or yoda)
   * @returns Translated text, or null if translation fails
   */
  async translate(
    text: string,
    type: TranslationType,
  ): Promise<string | null> {
    const cacheKey = this.generateCacheKey(text, type);

    // Try to get from cache first
    try {
      const cached = await this.cacheManager.get<string>(cacheKey);
      if (cached) {
        this.logger.log(`Cache hit for ${cacheKey}`);
        return cached;
      }
    } catch (error: any) {
      this.logger.warn(`Cache get failed for ${cacheKey}: ${error.message}`);
      // Continue to API call - cache failure should not break functionality
    }

    // Cache miss or error - fetch from API
    try {
      const url = `${this.baseUrl}/${type}`;

      // Wrap the HTTP call with exponential backoff for retries on 5xx and 429 errors
      const response = await withExponentialBackoff(
        async () =>
          firstValueFrom(
            this.httpService.post<FunTranslationsResponse>(url, {
              text,
            }),
          ),
        { maxAttempts: 3, baseDelay: 1000, maxDelay: 10000 },
        this.logger,
      );

      const translatedText = response.data.contents.translated;

      // Store in cache for future requests (TTL: infinite)
      try {
        await this.cacheManager.set(cacheKey, translatedText, 0);
        this.logger.log(`Cached translation for ${cacheKey}`);
      } catch (error: any) {
        this.logger.warn(`Cache set failed for ${cacheKey}: ${error.message}`);
        // Don't throw - proceed without caching
      }

      return translatedText;
    } catch (error: any) {
      // Log the error but don't throw - we'll fall back to standard description
      this.logger.warn(
        `Translation failed for type '${type}': ${error.message}`,
      );
      return null;
    }
  }
}
