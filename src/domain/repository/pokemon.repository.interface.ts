import { PokeApiSpeciesResponse } from '../model/pokemon.model';

export interface IPokemonRepository {
   getPokemonSpecies(name: string): Promise<PokeApiSpeciesResponse>;
}

export const POKEMON_REPOSITORY_TOKEN = Symbol('IPokemonRepository');
