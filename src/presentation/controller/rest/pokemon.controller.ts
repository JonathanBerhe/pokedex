import { Controller, Get, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PokemonService } from '../../../application/pokemon.service';
import { Pokemon } from '../../../domain/model/pokemon.model';
import { GetPokemonDto } from './get-pokemon.dto';
import { GetTranslatedPokemonDto } from './get-translated-pokemon.dto';

@Controller('pokemon')
export class PokemonController {
  constructor(private readonly pokemonService: PokemonService) {}

  /**
   * GET /pokemon/:name
   * Returns basic Pokemon information with standard description
   *
   * Rate limit: 10 requests per minute
   *
   * @param params Request params containing Pokemon name
   * @returns Pokemon response
   */
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @Get(':name')
  async getPokemon(
    @Param() params: GetPokemonDto,
  ): Promise<Pokemon> {
    return this.pokemonService.getPokemon(params.name);
  }

  /**
   * GET /pokemon/translated/:name
   * Returns Pokemon information with translated description
   *
   * Rate limit: 5 requests per hour
   *
   * @param params Request params containing Pokemon name
   * @returns Pokemon response with translated description
   */
  @Throttle({ default: { limit: 5, ttl: 3600000 } }) // 5 requests per hour
  @Get('translated/:name')
  async getTranslatedPokemon(
    @Param() params: GetTranslatedPokemonDto,
  ): Promise<Pokemon> {
    return this.pokemonService.getTranslatedPokemon(params.name);
  }
}
