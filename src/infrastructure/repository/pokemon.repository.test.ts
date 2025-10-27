import { Test, TestingModule } from '@nestjs/testing';
import { HttpModule, HttpService } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PokemonRepository } from './pokemon.repository';
import * as exponentialBackoffUtil from './util/exponential-backoff.util';
import { AxiosResponse } from 'axios';
import { PokeApiSpeciesResponse } from 'src/domain/model/pokemon.model';
import KeyvRedis from '@keyv/redis';

describe('PokemonRepository integration test', () => {
  let repository: PokemonRepository;
  let cacheManager: Cache;
  let module: TestingModule;
  const mockHttpService = {
    get: jest.fn(),
    post: jest.fn(),
  };
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
  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        HttpModule,
        CacheModule.registerAsync({
          isGlobal: true,
          useFactory: () => {
            const store = new KeyvRedis('redis://localhost:6379');
            return { store };
          },
        }),
      ],
      providers: [
        PokemonRepository,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    repository = module.get<PokemonRepository>(PokemonRepository);
    cacheManager = module.get<Cache>(CACHE_MANAGER);
  });

  beforeEach(async () => {
    await cacheManager.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Cache Integration', () => {
    it('should cache Pokemon data after first request', async () => {
      // Arrange
      const pokemonName = 'pikachu';
      const cacheKey = `pokemon:species:${pokemonName}`;
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

      // Act
      const firstResult = await repository.getPokemonSpecies(pokemonName);
      const cachedData = await cacheManager.get(cacheKey);
      const secondResult = await repository.getPokemonSpecies(pokemonName);

      // Assert
      expect(cachedData).toBeDefined();
      expect(cachedData).toEqual(firstResult);
      expect(secondResult).toEqual(firstResult);
      expect(secondResult.name).toBe('pikachu');
      expect(secondResult.is_legendary).toBe(false);
    });

    it('should handle cache misses correctly', async () => {
      // Arrange
      const pokemonName = 'mewtwo';
      const cacheKey = `pokemon:species:${pokemonName}`;
      const axiosResponse: AxiosResponse<PokeApiSpeciesResponse> = {
        data: mockMewtwoApiResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };
      jest
        .spyOn(exponentialBackoffUtil, 'withExponentialBackoff')
        .mockResolvedValue(axiosResponse);

      // Act
      const cachedBefore = await cacheManager.get(cacheKey);
      const result = await repository.getPokemonSpecies(pokemonName);
      const cachedAfter = await cacheManager.get(cacheKey);

      // Assert
      expect(cachedBefore).toBeUndefined();
      expect(result).toBeDefined();
      expect(result.name).toBe('mewtwo');
      expect(result.is_legendary).toBe(true);
      expect(cachedAfter).toBeDefined();
      expect(cachedAfter).toEqual(result);
    });

    it('should normalize Pokemon names to lowercase', async () => {
      // Arrange
      const upperCaseName = 'PIKACHU';
      const lowerCaseName = 'pikachu';
      const cacheKey = `pokemon:species:${lowerCaseName}`;
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

      // Act
      const result = await repository.getPokemonSpecies(upperCaseName);
      const cachedData = await cacheManager.get(cacheKey);

      // Assert
      expect(cachedData).toBeDefined();
      expect(result.name).toBe(lowerCaseName);
    });

    it('should have infinite TTL (data persists)', async () => {
      // Arrange
      const pokemonName = 'pikachu';
      const cacheKey = `pokemon:species:${pokemonName}`;
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

      // Act
      const result = await repository.getPokemonSpecies(pokemonName);
      const cachedData = await cacheManager.get(cacheKey);

      // Wait a short period (simulating passage of time)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const stillCached = await cacheManager.get(cacheKey);

      // Assert
      expect(cachedData).toEqual(result);
      expect(stillCached).toEqual(result);
      expect(stillCached).toBeDefined();
    });

    it('should verify complete Pokemon data structure is cached', async () => {
      // Arrange
      const pokemonName = 'pikachu';
      const cacheKey = `pokemon:species:${pokemonName}`;
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

      // Act
      const result = await repository.getPokemonSpecies(pokemonName);
      const cached = await cacheManager.get(cacheKey);

      // Assert
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('flavor_text_entries');
      expect(result).toHaveProperty('habitat');
      expect(result).toHaveProperty('is_legendary');
      expect(cached).toEqual(result);
      expect(cached).toHaveProperty('flavor_text_entries');
    });
  });
});
