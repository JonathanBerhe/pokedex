import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CacheWrapperService } from './cache-wrapper.service';
import { ILogger, LOGGER_TOKEN } from '../../domain/logger/logger.interface';

describe('CacheWrapperService', () => {
  let service: CacheWrapperService;
  let mockCacheManager: jest.Mocked<Cache>;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(async () => {
    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
    } as unknown as jest.Mocked<Cache>;

    mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheWrapperService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: LOGGER_TOKEN,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<CacheWrapperService>(CacheWrapperService);
  });

  describe('get', () => {
    it('should return cached value when cache hit', async () => {
      // Arrange
      const key = 'test:key';
      const cachedValue = { id: 1, name: 'test' };
      mockCacheManager.get.mockResolvedValue(cachedValue);

      // Act
      const result = await service.get(key);

      // Assert
      expect(result).toEqual(cachedValue);
      expect(mockCacheManager.get).toHaveBeenCalledWith(key);
    });

    it('should return null when cache miss (undefined)', async () => {
      // Arrange
      const key = 'test:key';
      mockCacheManager.get.mockResolvedValue(undefined);

      // Act
      const result = await service.get(key);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when cache miss (null)', async () => {
      // Arrange
      const key = 'test:key';
      mockCacheManager.get.mockResolvedValue(null);

      // Act
      const result = await service.get(key);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when cache throws error', async () => {
      // Arrange
      const key = 'test:key';
      mockCacheManager.get.mockRejectedValue(
        new Error('Cache connection failed'),
      );

      // Act
      const result = await service.get(key);

      // Assert
      expect(result).toBeNull();
    });

    it('should log warning when cache throws error', async () => {
      // Arrange
      const key = 'test:key';
      mockCacheManager.get.mockRejectedValue(
        new Error('Cache connection failed'),
      );

      // Act
      await service.get(key);

      // Assert
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Cache read operation failed: Cache connection failed',
        CacheWrapperService.name,
      );
    });

    it('should not throw when cache throws error', async () => {
      // Arrange
      const key = 'test:key';
      mockCacheManager.get.mockRejectedValue(
        new Error('Cache connection failed'),
      );

      // Act & Assert
      await expect(service.get(key)).resolves.toBeNull();
    });
  });

  describe('set', () => {
    it('should store value successfully', async () => {
      // Arrange
      const key = 'test:key';
      const value = { id: 1, name: 'test' };
      const ttl = 3600;
      mockCacheManager.set.mockResolvedValue(undefined);

      // Act
      await service.set(key, value, ttl);

      // Assert
      expect(mockCacheManager.set).toHaveBeenCalledWith(key, value, ttl);
    });

    it('should log warning when cache throws error', async () => {
      // Arrange
      const key = 'test:key';
      const value = { id: 1, name: 'test' };
      const ttl = 3600;
      mockCacheManager.set.mockRejectedValue(
        new Error('Cache connection failed'),
      );

      // Act
      await service.set(key, value, ttl);

      // Assert
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Cache write operation failed: Cache connection failed',
        CacheWrapperService.name,
      );
    });

    it('should not throw when cache throws error', async () => {
      // Arrange
      const key = 'test:key';
      const value = { id: 1, name: 'test' };
      const ttl = 3600;
      mockCacheManager.set.mockRejectedValue(
        new Error('Cache connection failed'),
      );

      // Act & Assert
      await expect(service.set(key, value, ttl)).resolves.toBeUndefined();
    });

    it('should handle infinite TTL (0)', async () => {
      // Arrange
      const key = 'test:key';
      const value = { id: 1, name: 'test' };
      const ttl = 0;
      mockCacheManager.set.mockResolvedValue(undefined);

      // Act
      await service.set(key, value, ttl);

      // Assert
      expect(mockCacheManager.set).toHaveBeenCalledWith(key, value, 0);
    });
  });
});
