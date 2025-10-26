import { Module } from '@nestjs/common';
import { PokemonService } from './pokemon.service';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';

/**
 * Pokemon Application Module
 * Provides Pokemon service and infrastructure dependencies
 */
@Module({
  imports: [InfrastructureModule],
  providers: [PokemonService],
  exports: [PokemonService],
})
export class PokemonApplicationModule {}
