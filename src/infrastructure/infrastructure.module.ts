import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TRANSLATION_REPOSITORY_TOKEN } from 'src/domain/repository/translation.repository.interface';
import { POKEMON_REPOSITORY_TOKEN } from 'src/domain/repository/pokemon.repository.interface';
import { TranslationRepository } from './repository/translation.repository';
import { PokemonRepository } from './repository/pokemon.repository';
import { RedisCacheModule } from './cache/cache.module';

/**
 * Infrastructure module
 * Provides repositories with caching support
 */
@Module({
  imports: [HttpModule, RedisCacheModule],
  providers: [
    {
      provide: TRANSLATION_REPOSITORY_TOKEN,
      useClass: TranslationRepository,
    },
    {
      provide: POKEMON_REPOSITORY_TOKEN,
      useClass: PokemonRepository,
    },
  ],
  exports: [TRANSLATION_REPOSITORY_TOKEN, POKEMON_REPOSITORY_TOKEN],
})
export class InfrastructureModule {}
