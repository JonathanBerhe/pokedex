import { AxiosError } from 'axios';
import { ILogger } from '../../../domain/logger/logger.interface';

/**
 * Configuration for exponential backoff retry logic
 */
export interface ExponentialBackoffConfig {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
}

/**
 * Default configuration for exponential backoff
 */
const DEFAULT_CONFIG: Required<ExponentialBackoffConfig> = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
};

/**
 * Check if an error should trigger a retry based on HTTP status code
 * Retries on:
 * - 429 (Too Many Requests)
 * - 5xx (Server errors)
 *
 * @param error Error object from axios
 * @returns true if the error should trigger a retry
 */
export function shouldRetry(error: unknown): boolean {
  if (!(error instanceof AxiosError) || !error.response) {
    return false;
  }

  const status = error.response.status;
  return status === 429 || (status >= 500 && status < 600);
}

/**
 * Calculate the delay for the next retry attempt using exponential backoff
 *
 * @param attempt Current attempt number (0-indexed)
 * @param baseDelay Base delay in milliseconds
 * @param maxDelay Maximum delay in milliseconds
 * @returns Delay in milliseconds
 */
export function calculateDelay(
  attempt: number,
  baseDelay: number,
  maxDelay: number,
): number {
  const delay = baseDelay * Math.pow(2, attempt);
  return Math.min(delay, maxDelay);
}

/**
 * Execute a function with exponential backoff retry logic
 * Retries on 429 (Too Many Requests) and 5xx (Server errors)
 *
 * @param fn Async function to execute
 * @param config Exponential backoff configuration
 * @param logger Optional logger for retry attempts
 * @returns Promise with the result of the function
 * @throws Error if all retry attempts fail
 */
export async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  config: ExponentialBackoffConfig = {},
  logger?: ILogger,
  context?: string,
): Promise<T> {
  const { maxAttempts, baseDelay, maxDelay } = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (!shouldRetry(error)) {
        throw error;
      }

      // Don't delay on the last attempt
      if (attempt < maxAttempts - 1) {
        const delay = calculateDelay(attempt, baseDelay, maxDelay);
        const status =
          error instanceof AxiosError
            ? error.response?.status || 'unknown'
            : 'unknown';

        if (logger) {
          logger.warn(
            `Request failed with status ${status}. Retrying in ${delay}ms (attempt ${attempt + 1}/${maxAttempts})`,
            context,
          );
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // All attempts failed, throw the last error
  throw lastError;
}
