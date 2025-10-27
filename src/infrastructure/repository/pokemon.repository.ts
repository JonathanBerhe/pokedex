import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { firstValueFrom } from 'rxjs';
import { PokeApiSpeciesResponse } from '../../domain/model/pokemon.model';
import { IPokemonRepository } from '../../domain/repository/pokemon.repository.interface';
import { withExponentialBackoff } from './util/exponential-backoff.util';

/**
 * Repository for interacting with the PokéAPI
 * https://pokeapi.co/
 *
 * Implements caching with Redis:
 * - Cache key format: pokemon:species:{name}
 * - TTL: Infinite (Pokemon data never changes)
 * - Graceful degradation: Falls back to API if cache fails
 */
@Injectable()
export class PokemonRepository implements IPokemonRepository {
  private readonly baseUrl = 'https://pokeapi.co/api/v2';
  private readonly logger = new Logger(PokemonRepository.name);
  private readonly cacheKeyPrefix = 'pokemon:species';

  constructor(
    private readonly httpService: HttpService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  /**
   * Fetch Pokemon species information by name
   * Implements lazy-loading cache pattern:
   * 1. Check cache first
   * 2. If cache miss or error, fetch from API
   * 3. Store in cache for future requests
   *
   * @param name Pokemon name (lowercase)
   * @returns Pokemon species data
   * @throws NotFoundException if Pokemon not found
   */
  async getPokemonSpecies(name: string): Promise<PokeApiSpeciesResponse> {
    const normalizedName = name.toLowerCase();
    const cacheKey = `${this.cacheKeyPrefix}:${normalizedName}`;

    // Try to get from cache first
    try {
      const cached =
        await this.cacheManager.get<PokeApiSpeciesResponse>(cacheKey);
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
      const url = `${this.baseUrl}/pokemon-species/${normalizedName}`;

      // Wrap the HTTP call with exponential backoff for retries on 5xx and 429 errors
      const response = await withExponentialBackoff(
        async () =>
          firstValueFrom(this.httpService.get<PokeApiSpeciesResponse>(url)),
        { maxAttempts: 3, baseDelay: 1000, maxDelay: 10000 },
        this.logger,
      );

      const data = response.data;

      // Store in cache for future requests (TTL: infinite)
      try {
        await this.cacheManager.set(cacheKey, data, 0);
        this.logger.log(`Cached Pokemon data for ${cacheKey}`);
      } catch (error: any) {
        this.logger.warn(`Cache set failed for ${cacheKey}: ${error.message}`);
        // Don't throw - proceed without caching
      }

      return data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new NotFoundException(`Pokemon '${name}' not found`);
      }
      throw error;
    }
  }
}
