import { Inject, Injectable } from '@nestjs/common';
import { Pokemon, PokeApiSpeciesResponse } from '../domain/model/pokemon.model';
import { TranslationType } from '../domain/model/translation.model';
import {
  type ITranslationRepository,
  TRANSLATION_REPOSITORY_TOKEN,
} from '../domain/repository/translation.repository.interface';
import {
  type IPokemonRepository,
  POKEMON_REPOSITORY_TOKEN,
} from '../domain/repository/pokemon.repository.interface';

/**
 * Pokemon service - contains business logic for Pokemon operations
 */
@Injectable()
export class PokemonService {
  constructor(
    @Inject(POKEMON_REPOSITORY_TOKEN)
    private readonly pokemonRepository: IPokemonRepository,
    @Inject(TRANSLATION_REPOSITORY_TOKEN)
    private readonly translationRepository: ITranslationRepository,
  ) {}

  /**
   * Get basic Pokemon information
   * @param name Pokemon name
   * @returns Pokemon response with standard description
   */
  async getPokemon(name: string): Promise<Pokemon> {
    const speciesData = await this.pokemonRepository.getPokemonSpecies(name);
    const description = this.extractEnglishDescription(speciesData);

    return {
      name: speciesData.name,
      description,
      habitat: speciesData.habitat?.name || 'unknown',
      isLegendary: speciesData.is_legendary,
    };
  }

  /**
   * Get Pokemon information with translated description
   * @param name Pokemon name
   * @returns Pokemon response with translated description
   */
  async getTranslatedPokemon(name: string): Promise<Pokemon> {
    const speciesData = await this.pokemonRepository.getPokemonSpecies(name);
    const description = this.extractEnglishDescription(speciesData);
    const habitat = speciesData.habitat?.name || 'unknown';
    const isLegendary = speciesData.is_legendary;

    // Determine translation type based on habitat and legendary status
    const translationType = this.determineTranslationType(habitat, isLegendary);

    // Attempt to translate the description
    const translatedDescription = await this.translationRepository.translate(
      description,
      translationType,
    );

    return {
      name: speciesData.name,
      description: translatedDescription || description, // Fall back to standard if translation fails
      habitat,
      isLegendary,
    };
  }

  /**
   * Extract the first English description from flavor_text_entries
   * @param speciesData Pokemon species data
   * @returns English description with newlines/form feeds removed
   */
  private extractEnglishDescription(
    speciesData: PokeApiSpeciesResponse,
  ): string {
    const englishEntry = speciesData.flavor_text_entries.find(
      (entry) => entry.language.name === 'en',
    );

    if (!englishEntry) {
      return 'No description available.';
    }

    // Remove newlines and form feed characters
    return englishEntry.flavor_text.replace(/[\n\f]/g, ' ');
  }

  // TODO: Maybe a Strategy Pattern might be better.
  /**
   * Determine which translation type to use based on habitat and legendary status
   * Rules:
   * - If habitat is "cave" OR Pokemon is legendary � Yoda translation
   * - Otherwise � Shakespeare translation
   *
   * @param habitat Pokemon habitat
   * @param isLegendary Whether Pokemon is legendary
   * @returns Translation type to use
   */
  public determineTranslationType(
    habitat: string,
    isLegendary: boolean,
  ): TranslationType {
    if (habitat === 'cave' || isLegendary) {
      return TranslationType.YODA;
    }
    return TranslationType.SHAKESPEARE;
  }
}
