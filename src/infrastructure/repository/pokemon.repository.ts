import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PokeApiSpeciesResponse } from '../../domain/model/pokemon.model';
import { IPokemonRepository } from '../../domain/repository/pokemon.repository.interface';
import { withExponentialBackoff } from './util/exponential-backoff.util';

/**
 * Repository for interacting with the PokéAPI
 * https://pokeapi.co/
 */
@Injectable()
export class PokemonRepository implements IPokemonRepository {
  private readonly baseUrl = 'https://pokeapi.co/api/v2';
  private readonly logger = new Logger(PokemonRepository.name);

  constructor(private readonly httpService: HttpService) {}

  /**
   * Fetch Pokemon species information by name
   * @param name Pokemon name (lowercase)
   * @returns Pokemon species data
   * @throws NotFoundException if Pokemon not found
   */
  async getPokemonSpecies(name: string): Promise<PokeApiSpeciesResponse> {
    try {
      const url = `${this.baseUrl}/pokemon-species/${name.toLowerCase()}`;

      // Wrap the HTTP call with exponential backoff for retries on 5xx and 429 errors
      const response = await withExponentialBackoff(
        async () =>
          firstValueFrom(
            this.httpService.get<PokeApiSpeciesResponse>(url),
          ),
        { maxAttempts: 3, baseDelay: 1000, maxDelay: 10000 },
        this.logger,
      );

      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new NotFoundException(`Pokemon '${name}' not found`);
      }
      throw error;
    }
  }
}
