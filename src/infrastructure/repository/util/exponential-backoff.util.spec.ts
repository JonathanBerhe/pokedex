import { Logger } from '@nestjs/common';
import { AxiosError, InternalAxiosRequestConfig } from 'axios';
import {
  shouldRetry,
  calculateDelay,
  withExponentialBackoff,
} from './exponential-backoff.util';

describe('Exponential Backoff Utility', () => {
  describe('shouldRetry', () => {
    it('should return true for 429 status code', () => {
      // Arrange
      const error = new AxiosError(
        'Too Many Requests',
        '429',
        undefined,
        undefined,
        {
          status: 429,
          statusText: 'Too Many Requests',
          data: {},
          headers: {},
          config: {} as InternalAxiosRequestConfig,
        },
      );

      // Act
      const result = shouldRetry(error);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true for 5xx status codes', () => {
      // Arrange
      const testCases = [500, 502, 503, 504, 599];

      for (const status of testCases) {
        const error = new AxiosError(
          `Server Error ${status}`,
          `${status}`,
          undefined,
          undefined,
          {
            status,
            statusText: 'Server Error',
            data: {},
            headers: {},
            config: {} as InternalAxiosRequestConfig,
          },
        );

        // Act
        const result = shouldRetry(error);

        // Assert
        expect(result).toBe(true);
      }
    });

    it('should return false for 4xx status codes (except 429)', () => {
      // Arrange
      const testCases = [400, 401, 403, 404, 422];

      for (const status of testCases) {
        const error = new AxiosError(
          `Client Error ${status}`,
          `${status}`,
          undefined,
          undefined,
          {
            status,
            statusText: 'Client Error',
            data: {},
            headers: {},
            config: {} as InternalAxiosRequestConfig,
          },
        );

        // Act
        const result = shouldRetry(error);

        // Assert
        expect(result).toBe(false);
      }
    });

    it('should return false for 2xx status codes', () => {
      // Arrange
      const error = new AxiosError('Success', '200', undefined, undefined, {
        status: 200,
        statusText: 'OK',
        data: {},
        headers: {},
        config: {} as InternalAxiosRequestConfig,
      });

      // Act
      const result = shouldRetry(error);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for errors without response', () => {
      // Arrange
      const error = new Error('Network error');

      // Act
      const result = shouldRetry(error);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('calculateDelay', () => {
    it('should calculate exponential delay correctly', () => {
      // Arrange
      const baseDelay = 1000;
      const maxDelay = 10000;

      // Act & Assert
      expect(calculateDelay(0, baseDelay, maxDelay)).toBe(1000); // 1000 * 2^0
      expect(calculateDelay(1, baseDelay, maxDelay)).toBe(2000); // 1000 * 2^1
      expect(calculateDelay(2, baseDelay, maxDelay)).toBe(4000); // 1000 * 2^2
      expect(calculateDelay(3, baseDelay, maxDelay)).toBe(8000); // 1000 * 2^3
    });

    it('should cap delay at maxDelay', () => {
      // Arrange
      const baseDelay = 1000;
      const maxDelay = 5000;

      // Act
      const result = calculateDelay(10, baseDelay, maxDelay);

      // Assert
      expect(result).toBe(maxDelay);
    });

    it('should handle custom base delay', () => {
      // Arrange
      const baseDelay = 500;
      const maxDelay = 10000;

      // Act & Assert
      expect(calculateDelay(0, baseDelay, maxDelay)).toBe(500);
      expect(calculateDelay(1, baseDelay, maxDelay)).toBe(1000);
      expect(calculateDelay(2, baseDelay, maxDelay)).toBe(2000);
    });
  });

  describe('withExponentialBackoff', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should succeed on first attempt', async () => {
      // Arrange
      const mockFn = jest.fn().mockResolvedValue('success');

      // Act
      const result = await withExponentialBackoff(mockFn);

      // Assert
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on 429 error and succeed', async () => {
      // Arrange
      const error = new AxiosError(
        'Too Many Requests',
        '429',
        undefined,
        undefined,
        {
          status: 429,
          statusText: 'Too Many Requests',
          data: {},
          headers: {},
          config: {} as InternalAxiosRequestConfig,
        },
      );
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success');

      // Act
      const promise = withExponentialBackoff(mockFn);
      await jest.runAllTimersAsync();
      const result = await promise;

      // Assert
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should retry on 5xx error and succeed', async () => {
      // Arrange
      const error = new AxiosError(
        'Service Unavailable',
        '503',
        undefined,
        undefined,
        {
          status: 503,
          statusText: 'Service Unavailable',
          data: {},
          headers: {},
          config: {} as InternalAxiosRequestConfig,
        },
      );
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success');

      // Act
      const promise = withExponentialBackoff(mockFn);
      await jest.runAllTimersAsync();
      const result = await promise;

      // Assert
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should not retry on 404 error', async () => {
      // Arrange
      const error = new AxiosError('Not Found', '404', undefined, undefined, {
        status: 404,
        statusText: 'Not Found',
        data: {},
        headers: {},
        config: {} as InternalAxiosRequestConfig,
      });
      const mockFn = jest.fn().mockRejectedValue(error);

      // Act & Assert
      await expect(withExponentialBackoff(mockFn)).rejects.toEqual(error);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should exhaust all retry attempts and throw last error', async () => {
      // Arrange
      const error = new AxiosError(
        'Internal Server Error',
        '500',
        undefined,
        undefined,
        {
          status: 500,
          statusText: 'Internal Server Error',
          data: {},
          headers: {},
          config: {} as InternalAxiosRequestConfig,
        },
      );
      const mockFn = jest.fn().mockRejectedValue(error);

      // Act & Assert
      const promise = withExponentialBackoff(mockFn, { maxAttempts: 3 });

      // Use Promise.race to handle both timer advancement and promise rejection
      const result = Promise.race([
        promise.catch((e) => e),
        (async () => {
          await jest.runAllTimersAsync();
        })(),
      ]);

      const caughtError = await result;
      expect(caughtError).toEqual(error);
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should use custom configuration', async () => {
      // Arrange
      const error = new AxiosError(
        'Internal Server Error',
        '500',
        undefined,
        undefined,
        {
          status: 500,
          statusText: 'Internal Server Error',
          data: {},
          headers: {},
          config: {} as InternalAxiosRequestConfig,
        },
      );
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success');

      // Act
      const promise = withExponentialBackoff(mockFn, {
        maxAttempts: 3,
        baseDelay: 500,
        maxDelay: 5000,
      });

      await jest.runAllTimersAsync();
      const result = await promise;

      // Assert
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should log retry attempts when logger is provided', async () => {
      // Arrange
      const mockLogger = {
        warn: jest.fn(),
      } as unknown as Logger;

      const error = new AxiosError(
        'Too Many Requests',
        '429',
        undefined,
        undefined,
        {
          status: 429,
          statusText: 'Too Many Requests',
          data: {},
          headers: {},
          config: {} as InternalAxiosRequestConfig,
        },
      );

      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success');

      // Act
      const promise = withExponentialBackoff(mockFn, {}, mockLogger);
      await jest.runAllTimersAsync();
      await promise;

      // Assert
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Request failed with status 429'),
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Retrying in'),
      );
    });

    it('should implement exponential backoff delays', async () => {
      // Arrange
      const error = new AxiosError(
        'Internal Server Error',
        '500',
        undefined,
        undefined,
        {
          status: 500,
          statusText: 'Internal Server Error',
          data: {},
          headers: {},
          config: {} as InternalAxiosRequestConfig,
        },
      );
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success');

      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

      // Act
      const promise = withExponentialBackoff(mockFn, {
        maxAttempts: 3,
        baseDelay: 1000,
      });

      await jest.runAllTimersAsync();
      await promise;

      // Assert
      // First retry: 1000ms, Second retry: 2000ms
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2000);
    });
  });
});
