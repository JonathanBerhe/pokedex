import { Test, TestingModule } from '@nestjs/testing';
import { HttpModule, HttpService } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { TranslationRepository } from './translation.repository';
import {
  FunTranslationsResponse,
  TranslationType,
} from '../../domain/model/translation.model';
import { createHash } from 'crypto';
import * as exponentialBackoffUtil from './util/exponential-backoff.util';
import { AxiosResponse, InternalAxiosRequestConfig, AxiosError } from 'axios';
import KeyvRedis from '@keyv/redis';
import { CacheWrapperService } from '../cache/cache-wrapper.service';

describe('TranslationRepository integration test', () => {
  let repository: TranslationRepository;
  let cacheManager: Cache;
  let module: TestingModule;
  const mockHttpService = {
    get: jest.fn(),
    post: jest.fn(),
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

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        HttpModule,
        CacheModule.registerAsync({
          isGlobal: true,
          useFactory: () => {
            const store = new KeyvRedis('redis://localhost:6379');
            return { store };
          },
        }),
      ],
      providers: [
        TranslationRepository,
        CacheWrapperService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    repository = module.get<TranslationRepository>(TranslationRepository);
    cacheManager = module.get<Cache>(CACHE_MANAGER);
  });

  beforeEach(async () => {
    await cacheManager.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Cache Integration', () => {
    it('should cache translation when API returns result', async () => {
      // Arrange
      const text = mockYodaResponse.contents.translated;
      const type = TranslationType.SHAKESPEARE;
      const textHash = createHash('sha256').update(text).digest('hex');
      const cacheKey = `translation:${type}:${textHash}`;
      const axiosResponse: AxiosResponse<FunTranslationsResponse> = {
        data: mockYodaResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as InternalAxiosRequestConfig,
      };
      jest
        .spyOn(exponentialBackoffUtil, 'withExponentialBackoff')
        .mockResolvedValue(axiosResponse);

      // Act
      const result = await repository.translate(text, type);

      // Assert
      const cachedData = await cacheManager.get(cacheKey);
      expect(cachedData).toBeDefined();
      expect(cachedData).toEqual(result);
      const secondResult = await repository.translate(text, type);
      expect(secondResult).toEqual(result);
    });

    it('should use different cache keys for different translation types', () => {
      // Arrange
      const text = 'Same text';
      const shakespeareHash = createHash('sha256').update(text).digest('hex');
      const yodaHash = createHash('sha256').update(text).digest('hex');
      const shakespeareKey = `translation:shakespeare:${shakespeareHash}`;
      const yodaKey = `translation:yoda:${yodaHash}`;

      // Act & Assert
      expect(shakespeareKey).not.toEqual(yodaKey);
      expect(shakespeareHash).toEqual(yodaHash); // Same text = same hash
    });

    it('should handle long text with hash-based keys', () => {
      // Arrange
      const longText =
        'This is a very long Pokemon description that would normally create a very long cache key if we used the raw text instead of a hash. ' +
        'By using SHA256 hashing, we ensure that the cache key length is constant regardless of the input text length. ' +
        'This prevents potential issues with Redis key length limitations and keeps the cache keys manageable.';
      const hash = createHash('sha256').update(longText).digest('hex');
      const cacheKey = `translation:shakespeare:${hash}`;

      // Act & Assert
      expect(hash.length).toBe(64);
      expect(cacheKey.length).toBeLessThan(200);
    });

    it('should not cache when translation fails (returns null)', async () => {
      // Arrange
      const text = 'This will likely be rate limited';
      const type = TranslationType.YODA;
      const textHash = createHash('sha256').update(text).digest('hex');
      const cacheKey = `translation:${type}:${textHash}`;
      const axiosError = new AxiosError(
        'Request failed with status code 503',
        '503',
        undefined,
        undefined,
        {
          status: 503,
          statusText: 'Service Unavailable',
          data: { error: 'Service Unavailable' },
          headers: {},
          config: {} as InternalAxiosRequestConfig,
        },
      );
      jest
        .spyOn(exponentialBackoffUtil, 'withExponentialBackoff')
        .mockRejectedValue(axiosError);

      // Act
      const result = await repository.translate(text, type);

      // Assert
      expect(result).toBeNull();
      const cachedData = await cacheManager.get(cacheKey);
      expect(cachedData).toBeUndefined();
    });
  });
});
