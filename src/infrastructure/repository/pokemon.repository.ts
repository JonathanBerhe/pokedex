import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { PokeApiSpeciesResponse } from '../../domain/model/pokemon.model';
import { IPokemonRepository } from '../../domain/repository/pokemon.repository.interface';
import { withExponentialBackoff } from './util/exponential-backoff.util';
import { CacheWrapperService } from '../cache/cache-wrapper.service';

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
    private readonly cacheWrapper: CacheWrapperService,
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

    const cached =
      await this.cacheWrapper.get<PokeApiSpeciesResponse>(cacheKey);
    if (cached) {
      this.logger.log(`Cache hit for ${cacheKey}`);
      return cached;
    }

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

      await this.cacheWrapper.set(cacheKey, data, 0);
      this.logger.log(`Cached Pokemon data for ${cacheKey}`);

      return data;
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 404) {
        throw new NotFoundException(`Pokemon '${name}' not found`);
      }
      throw error;
    }
  }
}
