import { Module } from '@nestjs/common';
import { PokemonController } from './pokemon.controller';
import { PokemonApplicationModule } from '../../../application/pokemon.module';

@Module({
  imports: [PokemonApplicationModule],
  controllers: [PokemonController],
})
export class PokemonControllerRESTModule {}
