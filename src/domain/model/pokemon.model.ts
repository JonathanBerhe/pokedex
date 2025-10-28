/**
 * Pokemon domain interface - represents the contract for Pokemon data
 */
export interface IPokemon {
  name: string;
  description: string;
  habitat: string;
  isLegendary: boolean;
}

/**
 * Pokemon domain model - pure business entity without external dependencies
 */
export class Pokemon implements IPokemon {
  name!: string;
  description!: string;
  habitat!: string;
  isLegendary!: boolean;
}

/**
 * Pok�API pokemon-species response (simplified)
 */
export type PokeApiSpeciesResponse = {
  name: string;
  is_legendary: boolean;
  habitat: {
    name: string;
  } | null;
  flavor_text_entries: Array<{
    flavor_text: string;
    language: {
      name: string;
    };
  }>;
};
