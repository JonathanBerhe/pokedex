export type Pokemon = {
  name: string;
  description: string;
  habitat: string;
  isLegendary: boolean;
}

/**
 * PokéAPI pokemon-species response (simplified)
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
}

