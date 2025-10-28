import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { AxiosResponse, AxiosError } from 'axios';
import { TranslationRepository } from './translation.repository';
import {
  FunTranslationsResponse,
  TranslationType,
} from '../../domain/model/translation.model';
import * as exponentialBackoffUtil from './util/exponential-backoff.util';
import { createHash } from 'crypto';
import { CacheWrapperService } from '../cache/cache-wrapper.service';
import { ILogger, LOGGER_TOKEN } from '../../domain/logger/logger.interface';

describe('TranslationRepository', () => {
  let repository: TranslationRepository;
  let httpService: jest.Mocked<HttpService>;
  let cacheWrapper: jest.Mocked<CacheWrapperService>;
  let mockLogger: jest.Mocked<ILogger>;

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

    const mockCacheWrapper = {
      get: jest.fn(),
      set: jest.fn(),
    };

    mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TranslationRepository,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: CacheWrapperService,
          useValue: mockCacheWrapper,
        },
        {
          provide: LOGGER_TOKEN,
          useValue: mockLogger,
        },
      ],
    }).compile();

    repository = module.get<TranslationRepository>(TranslationRepository);
    httpService = module.get(HttpService);
    cacheWrapper = module.get(CacheWrapperService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('translate', () => {
    describe('Success Cases - Shakespeare Translation', () => {
      it('should translate text using Shakespeare endpoint', async () => {
        // Arrange
        cacheWrapper.get.mockResolvedValue(null);
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
        cacheWrapper.get.mockResolvedValue(null);
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
        cacheWrapper.get.mockResolvedValue(null);
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
        cacheWrapper.get.mockResolvedValue(null);
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
        cacheWrapper.get.mockResolvedValue(null);
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
        cacheWrapper.get.mockResolvedValue(null);
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
          'TranslationRepository',
        );
      });
    });

    describe('Caching', () => {
      it('should return cached translation when cache hit', async () => {
        // Arrange
        const textToTranslate = 'Hello world';
        const cachedTranslation = 'Translated text from cache';
        cacheWrapper.get.mockResolvedValue(cachedTranslation);

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

        cacheWrapper.get.mockResolvedValue('cached');

        // Act
        await repository.translate(
          textToTranslate,
          TranslationType.SHAKESPEARE,
        );

        // Assert
        expect(cacheWrapper.get).toHaveBeenCalledWith(expectedCacheKey);
      });

      it('should fetch from API and cache on cache miss', async () => {
        // Arrange
        cacheWrapper.get.mockResolvedValue(null);
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
        expect(cacheWrapper.set).toHaveBeenCalledWith(
          expect.stringContaining('translation:shakespeare:'),
          translatedText,
          0,
        );
      });

      it('should fetch from API when cache get fails (graceful degradation)', async () => {
        // Arrange
        cacheWrapper.get.mockResolvedValue(null); // Cache error returns null
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
        cacheWrapper.get.mockResolvedValue(null);
        cacheWrapper.set.mockResolvedValue(undefined);
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
        expect(cacheWrapper.set).toHaveBeenCalled();
      });
    });

    describe('Error Handling - Graceful Degradation', () => {
      it('should return null when translation fails due to rate limit (429)', async () => {
        // Arrange
        cacheWrapper.get.mockResolvedValue(null);
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
        cacheWrapper.get.mockResolvedValue(null);
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
        cacheWrapper.get.mockResolvedValue(null);
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
        cacheWrapper.get.mockResolvedValue(null);
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
        cacheWrapper.get.mockResolvedValue(null);
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
