import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { NotFoundException } from '@nestjs/common';
import { of } from 'rxjs';
import { AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { PokemonRepository } from './pokemon.repository';
import { PokeApiSpeciesResponse } from '../../domain/model/pokemon.model';
import * as exponentialBackoffUtil from './util/exponential-backoff.util';

describe('PokemonRepository', () => {
  let repository: PokemonRepository;
  let httpService: jest.Mocked<HttpService>;
  let cacheManager: jest.Mocked<Cache>;
  const mockPikachuApiResponse: PokeApiSpeciesResponse = {
    name: 'pikachu',
    flavor_text_entries: [
      {
        flavor_text:
          'When several of these POKéMON gather, their electricity could build and cause lightning storms.',
        language: {
          name: 'en',
        },
      },
    ],
    habitat: {
      name: 'forest',
    },
    is_legendary: false,
  };

  const mockMewtwoApiResponse: PokeApiSpeciesResponse = {
    name: 'mewtwo',
    flavor_text_entries: [
      {
        flavor_text:
          'It was created by a scientist after years of horrific gene splicing and DNA engineering experiments.',
        language: {
          name: 'en',
        },
      },
    ],
    habitat: {
      name: 'rare',
    },
    is_legendary: true,
  };

  beforeEach(async () => {
    const mockHttpService = {
      get: jest.fn(),
      post: jest.fn(),
    };

    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      reset: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PokemonRepository,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    repository = module.get<PokemonRepository>(PokemonRepository);
    httpService = module.get(HttpService);
    cacheManager = module.get(CACHE_MANAGER);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPokemonSpecies', () => {
    describe('Success Cases', () => {
      it('should fetch and return Pokemon species data correctly', async () => {
        // Arrange
        cacheManager.get.mockResolvedValue(undefined); // Cache miss
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
        expect(result.habitat!.name).toBe('forest');
        expect(result.is_legendary).toBe(false);
      });

      it('should convert Pokemon name to lowercase', async () => {
        // Arrange
        cacheManager.get.mockResolvedValue(undefined);
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
        await callbackFn();
        expect(httpService.get).toHaveBeenCalledWith(
          'https://pokeapi.co/api/v2/pokemon-species/pikachu',
        );
      });

      it('should call HttpService.get with correct URL', async () => {
        // Arrange
        cacheManager.get.mockResolvedValue(undefined);
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
        cacheManager.get.mockResolvedValue(undefined);
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
          expect.any(Object),
        );
      });
    });

    describe('Caching', () => {
      it('should return cached data when cache hit', async () => {
        // Arrange
        cacheManager.get.mockResolvedValue(mockPikachuApiResponse);

        // Act
        const result = await repository.getPokemonSpecies('pikachu');

        // Assert
        expect(result).toEqual(mockPikachuApiResponse);
        expect(cacheManager.get).toHaveBeenCalledWith(
          'pokemon:species:pikachu',
        );
        expect(httpService.get).not.toHaveBeenCalled();
      });

      it('should fetch from API and cache on cache miss', async () => {
        // Arrange
        cacheManager.get.mockResolvedValue(undefined);
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
        expect(cacheManager.get).toHaveBeenCalledWith(
          'pokemon:species:pikachu',
        );
        expect(cacheManager.set).toHaveBeenCalledWith(
          'pokemon:species:pikachu',
          mockPikachuApiResponse,
          0,
        );
      });

      it('should fetch from API when cache get fails (graceful degradation)', async () => {
        // Arrange
        cacheManager.get.mockRejectedValue(new Error('Redis unavailable'));
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
        const result = await repository.getPokemonSpecies('pikachu');

        // Assert
        expect(result).toEqual(mockPikachuApiResponse);
        expect(withExponentialBackoffSpy).toHaveBeenCalled();
      });

      it('should return API data even when cache set fails', async () => {
        // Arrange
        cacheManager.get.mockResolvedValue(undefined);
        cacheManager.set.mockRejectedValue(new Error('Redis write failed'));
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
        expect(cacheManager.set).toHaveBeenCalled();
      });
    });

    describe('Error Handling', () => {
      it('should throw NotFoundException when API returns 404', async () => {
        // Arrange
        cacheManager.get.mockResolvedValue(undefined);
        const axiosError = new AxiosError(
          'Request failed with status code 404',
          '404',
          undefined,
          undefined,
          {
            status: 404,
            statusText: 'Not Found',
            data: { detail: 'Not found.' },
            headers: {},
            config: {} as InternalAxiosRequestConfig,
          },
        );
        jest
          .spyOn(exponentialBackoffUtil, 'withExponentialBackoff')
          .mockRejectedValue(axiosError);

        // Act & Assert
        await expect(
          repository.getPokemonSpecies('invalidpokemon'),
        ).rejects.toThrow(NotFoundException);
      });

      it('should propagate other HTTP errors (500)', async () => {
        // Arrange
        cacheManager.get.mockResolvedValue(undefined); // Cache miss
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
        cacheManager.get.mockResolvedValue(undefined); // Cache miss
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
        cacheManager.get.mockResolvedValue(undefined); // Cache miss
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
