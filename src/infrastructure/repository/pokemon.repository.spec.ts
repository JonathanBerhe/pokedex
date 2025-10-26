import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { NotFoundException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AxiosResponse, AxiosError } from 'axios';
import { PokemonRepository } from './pokemon.repository';
import { PokeApiSpeciesResponse } from '../../domain/model/pokemon.model';
import * as exponentialBackoffUtil from './util/exponential-backoff.util';

describe('PokemonRepository', () => {
  let repository: PokemonRepository;
  let httpService: jest.Mocked<HttpService>;

  // Realistic mock data from PokéAPI
  const mockPikachuApiResponse: PokeApiSpeciesResponse = {
    name: 'pikachu',
    flavor_text_entries: [
      {
        flavor_text:
          'When several of these POKéMON gather, their electricity could build and cause lightning storms.',
        language: { name: 'en', url: 'https://pokeapi.co/api/v2/language/9/' },
      },
    ],
    habitat: { name: 'forest', url: 'https://pokeapi.co/api/v2/pokemon-habitat/3/' },
    is_legendary: false,
  };

  const mockMewtwoApiResponse: PokeApiSpeciesResponse = {
    name: 'mewtwo',
    flavor_text_entries: [
      {
        flavor_text:
          'It was created by a scientist after years of horrific gene splicing and DNA engineering experiments.',
        language: { name: 'en', url: 'https://pokeapi.co/api/v2/language/9/' },
      },
    ],
    habitat: { name: 'rare', url: 'https://pokeapi.co/api/v2/pokemon-habitat/5/' },
    is_legendary: true,
  };

  beforeEach(async () => {
    const mockHttpService = {
      get: jest.fn(),
      post: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PokemonRepository,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    repository = module.get<PokemonRepository>(PokemonRepository);
    httpService = module.get(HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPokemonSpecies', () => {
    describe('Success Cases', () => {
      it('should fetch and return Pokemon species data correctly', async () => {
        // Arrange
        const axiosResponse: AxiosResponse<PokeApiSpeciesResponse> = {
          data: mockPikachuApiResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        };

        jest
          .spyOn(exponentialBackoffUtil, 'withExponentialBackoff')
          .mockResolvedValue(axiosResponse);
        httpService.get.mockReturnValue(of(axiosResponse) as any);

        // Act
        const result = await repository.getPokemonSpecies('pikachu');

        // Assert
        expect(result).toEqual(mockPikachuApiResponse);
        expect(result.name).toBe('pikachu');
        expect(result.habitat.name).toBe('forest');
        expect(result.is_legendary).toBe(false);
      });

      it('should convert Pokemon name to lowercase', async () => {
        // Arrange
        const axiosResponse: AxiosResponse<PokeApiSpeciesResponse> = {
          data: mockPikachuApiResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        };

        const withExponentialBackoffSpy = jest
          .spyOn(exponentialBackoffUtil, 'withExponentialBackoff')
          .mockResolvedValue(axiosResponse);
        httpService.get.mockReturnValue(of(axiosResponse) as any);

        // Act
        await repository.getPokemonSpecies('PIKACHU');

        // Assert
        expect(withExponentialBackoffSpy).toHaveBeenCalled();
        const callbackFn = withExponentialBackoffSpy.mock.calls[0][0];

        // Execute the callback to verify URL construction
        await callbackFn();

        expect(httpService.get).toHaveBeenCalledWith(
          'https://pokeapi.co/api/v2/pokemon-species/pikachu',
        );
      });

      it('should call HttpService.get with correct URL', async () => {
        // Arrange
        const axiosResponse: AxiosResponse<PokeApiSpeciesResponse> = {
          data: mockMewtwoApiResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        };

        const withExponentialBackoffSpy = jest
          .spyOn(exponentialBackoffUtil, 'withExponentialBackoff')
          .mockResolvedValue(axiosResponse);
        httpService.get.mockReturnValue(of(axiosResponse) as any);

        // Act
        await repository.getPokemonSpecies('mewtwo');

        // Assert
        expect(withExponentialBackoffSpy).toHaveBeenCalled();
        const callbackFn = withExponentialBackoffSpy.mock.calls[0][0];

        await callbackFn();

        expect(httpService.get).toHaveBeenCalledWith(
          'https://pokeapi.co/api/v2/pokemon-species/mewtwo',
        );
        expect(httpService.get).toHaveBeenCalledTimes(1);
      });

      it('should call withExponentialBackoff with correct configuration', async () => {
        // Arrange
        const axiosResponse: AxiosResponse<PokeApiSpeciesResponse> = {
          data: mockPikachuApiResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        };

        const withExponentialBackoffSpy = jest
          .spyOn(exponentialBackoffUtil, 'withExponentialBackoff')
          .mockResolvedValue(axiosResponse);
        httpService.get.mockReturnValue(of(axiosResponse) as any);

        // Act
        await repository.getPokemonSpecies('pikachu');

        // Assert
        expect(withExponentialBackoffSpy).toHaveBeenCalledWith(
          expect.any(Function),
          { maxAttempts: 3, baseDelay: 1000, maxDelay: 10000 },
          expect.any(Object), // Logger instance
        );
      });
    });

    describe('Error Handling', () => {
      it('should throw NotFoundException when API returns 404', async () => {
        // Arrange
        const axiosError = {
          response: {
            status: 404,
            data: { detail: 'Not found.' },
          },
          message: 'Request failed with status code 404',
        } as AxiosError;

        jest
          .spyOn(exponentialBackoffUtil, 'withExponentialBackoff')
          .mockRejectedValue(axiosError);

        // Act & Assert
        await expect(
          repository.getPokemonSpecies('invalidpokemon'),
        ).rejects.toThrow(NotFoundException);

        await expect(
          repository.getPokemonSpecies('invalidpokemon'),
        ).rejects.toThrow("Pokemon 'invalidpokemon' not found");
      });

      it('should propagate other HTTP errors (500)', async () => {
        // Arrange
        const axiosError = {
          response: {
            status: 500,
            data: { error: 'Internal Server Error' },
          },
          message: 'Request failed with status code 500',
        } as AxiosError;

        jest
          .spyOn(exponentialBackoffUtil, 'withExponentialBackoff')
          .mockRejectedValue(axiosError);

        // Act & Assert
        await expect(repository.getPokemonSpecies('pikachu')).rejects.toEqual(
          axiosError,
        );
      });

      it('should propagate other HTTP errors (503)', async () => {
        // Arrange
        const axiosError = {
          response: {
            status: 503,
            data: { error: 'Service Unavailable' },
          },
          message: 'Request failed with status code 503',
        } as AxiosError;

        jest
          .spyOn(exponentialBackoffUtil, 'withExponentialBackoff')
          .mockRejectedValue(axiosError);

        // Act & Assert
        await expect(repository.getPokemonSpecies('pikachu')).rejects.toEqual(
          axiosError,
        );
      });

      it('should propagate network errors', async () => {
        // Arrange
        const networkError = new Error('Network Error');

        jest
          .spyOn(exponentialBackoffUtil, 'withExponentialBackoff')
          .mockRejectedValue(networkError);

        // Act & Assert
        await expect(repository.getPokemonSpecies('pikachu')).rejects.toThrow(
          'Network Error',
        );
      });
    });
  });
});
