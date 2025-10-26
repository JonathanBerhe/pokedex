import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { FunTranslationsResponse, TranslationType } from '../../domain/model/translation.model';
import { ITranslationRepository } from '../../domain/repository/translation.repository.interface';
import { withExponentialBackoff } from './util/exponential-backoff.util';

/**
 * Client for interacting with the FunTranslations API
 * https://funtranslations.com/
 *
 * Note: The free API has rate limits (5 requests/hour)
 * In production, consider caching or using a paid plan
 */
@Injectable()
export class TranslationRepository implements ITranslationRepository {
  private readonly baseUrl = 'https://api.funtranslations.com/translate';
  private readonly logger = new Logger(TranslationRepository.name); // Take this as parameter

  constructor(private readonly httpService: HttpService) {}

  /**
   * Translate text using the specified translation type
   * @param text Text to translate
   * @param type Translation type (shakespeare or yoda)
   * @returns Translated text, or null if translation fails
   */
  async translate(
    text: string,
    type: TranslationType,
  ): Promise<string | null> {
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

      return response.data.contents.translated;
    } catch (error: any) {
      // Log the error but don't throw - we'll fall back to standard description
      this.logger.warn(
        `Translation failed for type '${type}': ${error.message}`,
      );
      return null;
    }
  }
}
