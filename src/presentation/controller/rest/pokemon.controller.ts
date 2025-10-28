import { Controller, Get, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiTooManyRequestsResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { PokemonService } from '../../../application/pokemon.service';
import { GetPokemonDto } from './get-pokemon.dto';
import { GetTranslatedPokemonDto } from './get-translated-pokemon.dto';
import { PokemonResponseDto } from './pokemon-response.dto';

@ApiTags('pokemon')
@Controller('pokemon')
export class PokemonController {
  constructor(private readonly pokemonService: PokemonService) {}

  @ApiOperation({
    summary: 'Get basic Pokemon information',
    description:
      'Returns Pokemon data including name, description, habitat, and legendary status',
  })
  @ApiParam({
    name: 'name',
    description: 'Pokemon name (lowercase, alphanumeric with hyphens)',
    example: 'mewtwo',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved Pokemon information',
    type: PokemonResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Pokemon not found',
  })
  @ApiTooManyRequestsResponse({
    description: 'Rate limit exceeded (10 requests per minute)',
  })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Get(':name')
  async getPokemon(
    @Param() params: GetPokemonDto,
  ): Promise<PokemonResponseDto> {
    return this.pokemonService.getPokemon(params.name);
  }

  @ApiOperation({
    summary: 'Get Pokemon with translated description',
    description:
      'Returns Pokemon data with description translated to Shakespeare or Yoda style. ' +
      'Yoda translation is used for cave habitat or legendary Pokemon, Shakespeare for others. ' +
      'Falls back to standard description if translation fails.',
  })
  @ApiParam({
    name: 'name',
    description: 'Pokemon name (lowercase, alphanumeric with hyphens)',
    example: 'mewtwo',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved Pokemon with translated description',
    type: PokemonResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Pokemon not found',
  })
  @ApiTooManyRequestsResponse({
    description: 'Rate limit exceeded (5 requests per hour)',
  })
  @Throttle({ default: { limit: 5, ttl: 3600000 } })
  @Get('translated/:name')
  async getTranslatedPokemon(
    @Param() params: GetTranslatedPokemonDto,
  ): Promise<PokemonResponseDto> {
    return this.pokemonService.getTranslatedPokemon(params.name);
  }
}
