import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { of } from 'rxjs';
import { AxiosResponse, AxiosError } from 'axios';
import { TranslationRepository } from './translation.repository';
import {
  FunTranslationsResponse,
  TranslationType,
} from '../../domain/model/translation.model';
import * as exponentialBackoffUtil from './util/exponential-backoff.util';
import { createHash } from 'crypto';

describe('TranslationRepository', () => {
  let repository: TranslationRepository;
  let httpService: jest.Mocked<HttpService>;
  let cacheManager: jest.Mocked<Cache>;

  // Realistic mock data from FunTranslations API
  const mockShakespeareResponse: FunTranslationsResponse = {
    success: { total: 1 },
    contents: {
      translated:
        'At which hour several of these pokémon gather,  their electricity couldst buildeth and cause lightning storms.',
      text: 'When several of these POKéMON gather, their electricity could build and cause lightning storms.',
      translation: 'shakespeare',
    },
  };

  const mockYodaResponse: FunTranslationsResponse = {
    success: { total: 1 },
    contents: {
      translated:
        'Created by a scientist after years of horrific gene splicing and dna engineering experiments,  it was.',
      text: 'It was created by a scientist after years of horrific gene splicing and DNA engineering experiments.',
      translation: 'yoda',
    },
  };

  beforeEach(async () => {
    const mockHttpService = {
      get: jest.fn(),
      post: jest.fn(),
    };

    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      reset: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TranslationRepository,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    repository = module.get<TranslationRepository>(TranslationRepository);
    httpService = module.get(HttpService);
    cacheManager = module.get(CACHE_MANAGER);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('translate', () => {
    describe('Success Cases - Shakespeare Translation', () => {
      it('should translate text using Shakespeare endpoint', async () => {
        // Arrange
        cacheManager.get.mockResolvedValue(undefined); // Cache miss
        const textToTranslate =
          'When several of these POKéMON gather, their electricity could build and cause lightning storms.';
        const axiosResponse: AxiosResponse<FunTranslationsResponse> = {
          data: mockShakespeareResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        };

        jest
          .spyOn(exponentialBackoffUtil, 'withExponentialBackoff')
          .mockResolvedValue(axiosResponse);
        httpService.post.mockReturnValue(of(axiosResponse) as any);

        // Act
        const result = await repository.translate(
          textToTranslate,
          TranslationType.SHAKESPEARE,
        );

        // Assert
        expect(result).toBe(mockShakespeareResponse.contents.translated);
        expect(result).toContain('At which hour');
      });

      it('should call HttpService.post with correct URL and body for Shakespeare', async () => {
        // Arrange
        cacheManager.get.mockResolvedValue(undefined); // Cache miss
        const textToTranslate = 'Hello world';
        const axiosResponse: AxiosResponse<FunTranslationsResponse> = {
          data: mockShakespeareResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        };

        const withExponentialBackoffSpy = jest
          .spyOn(exponentialBackoffUtil, 'withExponentialBackoff')
          .mockResolvedValue(axiosResponse);
        httpService.post.mockReturnValue(of(axiosResponse) as any);

        // Act
        await repository.translate(
          textToTranslate,
          TranslationType.SHAKESPEARE,
        );

        // Assert
        expect(withExponentialBackoffSpy).toHaveBeenCalled();
        const callbackFn = withExponentialBackoffSpy.mock.calls[0][0];

        await callbackFn();

        expect(httpService.post).toHaveBeenCalledWith(
          'https://api.funtranslations.com/translate/shakespeare',
          { text: textToTranslate },
        );
      });

      it('should extract translated text from response correctly', async () => {
        // Arrange
        cacheManager.get.mockResolvedValue(undefined); // Cache miss
        const axiosResponse: AxiosResponse<FunTranslationsResponse> = {
          data: mockShakespeareResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        };

        jest
          .spyOn(exponentialBackoffUtil, 'withExponentialBackoff')
          .mockResolvedValue(axiosResponse);
        httpService.post.mockReturnValue(of(axiosResponse) as any);

        // Act
        const result = await repository.translate(
          'test text',
          TranslationType.SHAKESPEARE,
        );

        // Assert
        expect(result).toBe(mockShakespeareResponse.contents.translated);
      });
    });

    describe('Success Cases - Yoda Translation', () => {
      it('should translate text using Yoda endpoint', async () => {
        // Arrange
        cacheManager.get.mockResolvedValue(undefined); // Cache miss
        const textToTranslate =
          'It was created by a scientist after years of horrific gene splicing and DNA engineering experiments.';
        const axiosResponse: AxiosResponse<FunTranslationsResponse> = {
          data: mockYodaResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        };

        jest
          .spyOn(exponentialBackoffUtil, 'withExponentialBackoff')
          .mockResolvedValue(axiosResponse);
        httpService.post.mockReturnValue(of(axiosResponse) as any);

        // Act
        const result = await repository.translate(
          textToTranslate,
          TranslationType.YODA,
        );

        // Assert
        expect(result).toBe(mockYodaResponse.contents.translated);
        expect(result).toContain('it was');
      });

      it('should call HttpService.post with correct URL and body for Yoda', async () => {
        // Arrange
        cacheManager.get.mockResolvedValue(undefined); // Cache miss
        const textToTranslate = 'Hello world';
        const axiosResponse: AxiosResponse<FunTranslationsResponse> = {
          data: mockYodaResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        };

        const withExponentialBackoffSpy = jest
          .spyOn(exponentialBackoffUtil, 'withExponentialBackoff')
          .mockResolvedValue(axiosResponse);
        httpService.post.mockReturnValue(of(axiosResponse) as any);

        // Act
        await repository.translate(textToTranslate, TranslationType.YODA);

        // Assert
        expect(withExponentialBackoffSpy).toHaveBeenCalled();
        const callbackFn = withExponentialBackoffSpy.mock.calls[0][0];

        await callbackFn();

        expect(httpService.post).toHaveBeenCalledWith(
          'https://api.funtranslations.com/translate/yoda',
          { text: textToTranslate },
        );
      });

      it('should call withExponentialBackoff with correct configuration', async () => {
        // Arrange
        cacheManager.get.mockResolvedValue(undefined); // Cache miss
        const axiosResponse: AxiosResponse<FunTranslationsResponse> = {
          data: mockYodaResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        };

        const withExponentialBackoffSpy = jest
          .spyOn(exponentialBackoffUtil, 'withExponentialBackoff')
          .mockResolvedValue(axiosResponse);
        httpService.post.mockReturnValue(of(axiosResponse) as any);

        // Act
        await repository.translate('test', TranslationType.YODA);

        // Assert
        expect(withExponentialBackoffSpy).toHaveBeenCalledWith(
          expect.any(Function),
          { maxAttempts: 3, baseDelay: 1000, maxDelay: 10000 },
          expect.any(Object), // Logger instance
        );
      });
    });

    describe('Caching', () => {
      it('should return cached translation when cache hit', async () => {
        // Arrange
        const textToTranslate = 'Hello world';
        const cachedTranslation = 'Translated text from cache';
        cacheManager.get.mockResolvedValue(cachedTranslation);

        // Act
        const result = await repository.translate(
          textToTranslate,
          TranslationType.SHAKESPEARE,
        );

        // Assert
        expect(result).toBe(cachedTranslation);
        expect(httpService.post).not.toHaveBeenCalled();
      });

      it('should generate correct cache key using hash', async () => {
        // Arrange
        const textToTranslate = 'Hello world';
        const textHash = createHash('sha256')
          .update(textToTranslate)
          .digest('hex');
        const expectedCacheKey = `translation:shakespeare:${textHash}`;

        cacheManager.get.mockResolvedValue('cached');

        // Act
        await repository.translate(
          textToTranslate,
          TranslationType.SHAKESPEARE,
        );

        // Assert
        expect(cacheManager.get).toHaveBeenCalledWith(expectedCacheKey);
      });

      it('should fetch from API and cache on cache miss', async () => {
        // Arrange
        cacheManager.get.mockResolvedValue(undefined);
        const textToTranslate = 'Test text';
        const translatedText = mockShakespeareResponse.contents.translated;
        const axiosResponse: AxiosResponse<FunTranslationsResponse> = {
          data: mockShakespeareResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        };

        jest
          .spyOn(exponentialBackoffUtil, 'withExponentialBackoff')
          .mockResolvedValue(axiosResponse);
        httpService.post.mockReturnValue(of(axiosResponse) as any);

        // Act
        const result = await repository.translate(
          textToTranslate,
          TranslationType.SHAKESPEARE,
        );

        // Assert
        expect(result).toBe(translatedText);
        expect(cacheManager.set).toHaveBeenCalledWith(
          expect.stringContaining('translation:shakespeare:'),
          translatedText,
          0,
        );
      });

      it('should fetch from API when cache get fails (graceful degradation)', async () => {
        // Arrange
        cacheManager.get.mockRejectedValue(new Error('Redis unavailable'));
        const axiosResponse: AxiosResponse<FunTranslationsResponse> = {
          data: mockShakespeareResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        };

        const withExponentialBackoffSpy = jest
          .spyOn(exponentialBackoffUtil, 'withExponentialBackoff')
          .mockResolvedValue(axiosResponse);
        httpService.post.mockReturnValue(of(axiosResponse) as any);

        // Act
        const result = await repository.translate(
          'test',
          TranslationType.SHAKESPEARE,
        );

        // Assert
        expect(result).toBe(mockShakespeareResponse.contents.translated);
        expect(withExponentialBackoffSpy).toHaveBeenCalled();
      });

      it('should return API data even when cache set fails', async () => {
        // Arrange
        cacheManager.get.mockResolvedValue(undefined);
        cacheManager.set.mockRejectedValue(new Error('Redis write failed'));
        const axiosResponse: AxiosResponse<FunTranslationsResponse> = {
          data: mockYodaResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        };

        jest
          .spyOn(exponentialBackoffUtil, 'withExponentialBackoff')
          .mockResolvedValue(axiosResponse);
        httpService.post.mockReturnValue(of(axiosResponse) as any);

        // Act
        const result = await repository.translate('test', TranslationType.YODA);

        // Assert
        expect(result).toBe(mockYodaResponse.contents.translated);
        expect(cacheManager.set).toHaveBeenCalled();
      });
    });

    describe('Error Handling - Graceful Degradation', () => {
      it('should return null when translation fails due to rate limit (429)', async () => {
        // Arrange
        cacheManager.get.mockResolvedValue(undefined); // Cache miss
        const axiosError = {
          response: {
            status: 429,
            data: { error: { code: 429, message: 'Too Many Requests' } },
          },
          message: 'Request failed with status code 429',
        } as AxiosError;

        jest
          .spyOn(exponentialBackoffUtil, 'withExponentialBackoff')
          .mockRejectedValue(axiosError);

        // Act
        const result = await repository.translate(
          'test text',
          TranslationType.SHAKESPEARE,
        );

        // Assert
        expect(result).toBeNull();
      });

      it('should return null when translation fails due to service error (500)', async () => {
        // Arrange
        cacheManager.get.mockResolvedValue(undefined); // Cache miss
        const axiosError = {
          response: {
            status: 500,
            data: { error: 'Internal Server Error' },
          },
          message: 'Request failed with status code 500',
        } as AxiosError;

        jest
          .spyOn(exponentialBackoffUtil, 'withExponentialBackoff')
          .mockRejectedValue(axiosError);

        // Act
        const result = await repository.translate(
          'test text',
          TranslationType.YODA,
        );

        // Assert
        expect(result).toBeNull();
      });

      it('should return null when translation fails due to service error (503)', async () => {
        // Arrange
        cacheManager.get.mockResolvedValue(undefined); // Cache miss
        const axiosError = {
          response: {
            status: 503,
            data: { error: 'Service Unavailable' },
          },
          message: 'Request failed with status code 503',
        } as AxiosError;

        jest
          .spyOn(exponentialBackoffUtil, 'withExponentialBackoff')
          .mockRejectedValue(axiosError);

        // Act
        const result = await repository.translate(
          'test text',
          TranslationType.SHAKESPEARE,
        );

        // Assert
        expect(result).toBeNull();
      });

      it('should return null on network errors', async () => {
        // Arrange
        cacheManager.get.mockResolvedValue(undefined); // Cache miss
        const networkError = new Error('Network Error');

        jest
          .spyOn(exponentialBackoffUtil, 'withExponentialBackoff')
          .mockRejectedValue(networkError);

        // Act
        const result = await repository.translate(
          'test text',
          TranslationType.YODA,
        );

        // Assert
        expect(result).toBeNull();
      });

      it('should return null for both translation types on error', async () => {
        // Arrange
        cacheManager.get.mockResolvedValue(undefined); // Cache miss
        const error = new Error('Service error');

        jest
          .spyOn(exponentialBackoffUtil, 'withExponentialBackoff')
          .mockRejectedValue(error);

        // Act
        const shakespeareResult = await repository.translate(
          'test',
          TranslationType.SHAKESPEARE,
        );
        const yodaResult = await repository.translate(
          'test',
          TranslationType.YODA,
        );

        // Assert
        expect(shakespeareResult).toBeNull();
        expect(yodaResult).toBeNull();
      });
    });
  });
});
