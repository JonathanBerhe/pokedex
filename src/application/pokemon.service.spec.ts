import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PokemonService } from './pokemon.service';
import { PokeApiSpeciesResponse } from '../domain/model/pokemon.model';
import { TranslationType } from '../domain/model/translation.model';
import {
  POKEMON_REPOSITORY_TOKEN,
  IPokemonRepository,
} from '../domain/repository/pokemon.repository.interface';
import {
  TRANSLATION_REPOSITORY_TOKEN,
  ITranslationRepository,
} from '../domain/repository/translation.repository.interface';
import { ILogger, LOGGER_TOKEN } from '../domain/logger/logger.interface';

describe('PokemonService', () => {
  let service: PokemonService;
  let pokemonRepository: jest.Mocked<IPokemonRepository>;
  let translationRepository: jest.Mocked<ITranslationRepository>;
  let mockLogger: jest.Mocked<ILogger>;

  // Mock data
  const mockMewtwoSpecies: PokeApiSpeciesResponse = {
    name: 'mewtwo',
    is_legendary: true,
    habitat: {
      name: 'rare',
    },
    flavor_text_entries: [
      {
        flavor_text:
          'It was created by\na scientist after\nyears of horrific\fgene splicing and\nDNA engineering\nexperiments.',
        language: {
          name: 'en',
        },
      },
    ],
  };

  const mockPikachuSpecies: PokeApiSpeciesResponse = {
    name: 'pikachu',
    is_legendary: false,
    habitat: {
      name: 'forest',
    },
    flavor_text_entries: [
      {
        flavor_text:
          'When several of\nthese POKéMON\ngather, their\felectricity could\nbuild and cause\nlightning storms.',
        language: {
          name: 'en',
        },
      },
    ],
  };

  const mockZubatSpecies: PokeApiSpeciesResponse = {
    name: 'zubat',
    is_legendary: false,
    habitat: {
      name: 'cave',
    },
    flavor_text_entries: [
      {
        flavor_text:
          'Forms colonies in\nperpetually dark\nplaces. Uses\fultrasonic waves\nto identify and\napproach targets.',
        language: {
          name: 'en',
        },
      },
    ],
  };

  beforeEach(async () => {
    const mockPokemonRepository = {
      getPokemonSpecies: jest.fn(),
    };

    const mockTranslationRepository = {
      translate: jest.fn(),
    };

    mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PokemonService,
        {
          provide: POKEMON_REPOSITORY_TOKEN,
          useValue: mockPokemonRepository,
        },
        {
          provide: TRANSLATION_REPOSITORY_TOKEN,
          useValue: mockTranslationRepository,
        },
        {
          provide: LOGGER_TOKEN,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<PokemonService>(PokemonService);
    pokemonRepository = module.get(POKEMON_REPOSITORY_TOKEN);
    translationRepository = module.get(TRANSLATION_REPOSITORY_TOKEN);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPokemon', () => {
    it('should return basic Pokemon information with cleaned description', async () => {
      // Arrange
      pokemonRepository.getPokemonSpecies.mockResolvedValue(mockMewtwoSpecies);

      // Act
      const result = await service.getPokemon('mewtwo');

      // Assert
      expect(result).toEqual({
        name: 'mewtwo',
        description:
          'It was created by a scientist after years of horrific gene splicing and DNA engineering experiments.',
        habitat: 'rare',
        isLegendary: true,
      });
      expect(pokemonRepository.getPokemonSpecies).toHaveBeenCalledWith(
        'mewtwo',
      );
    });

    it('should handle Pokemon without habitat', async () => {
      // Arrange
      const mockSpecies = {
        ...mockMewtwoSpecies,
        habitat: null,
      };
      pokemonRepository.getPokemonSpecies.mockResolvedValue(mockSpecies);

      // Act
      const result = await service.getPokemon('mewtwo');

      // Assert
      expect(result.habitat).toBe('unknown');
    });

    it('should throw NotFoundException when Pokemon not found', async () => {
      // Arrange
      pokemonRepository.getPokemonSpecies.mockRejectedValue(
        new NotFoundException('Pokemon not found'),
      );

      // Act & Assert
      await expect(service.getPokemon('invalidpokemon')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle Pokemon with no English description', async () => {
      // Arrange
      const mockSpecies = {
        ...mockMewtwoSpecies,
        flavor_text_entries: [
          {
            flavor_text: 'Japanese description',
            language: { name: 'ja' },
          },
        ],
      };
      pokemonRepository.getPokemonSpecies.mockResolvedValue(mockSpecies);

      // Act
      const result = await service.getPokemon('mewtwo');

      // Assert
      expect(result.description).toBe('No description available.');
    });
  });

  describe('getTranslatedPokemon', () => {
    it('should use Yoda translation for legendary Pokemon', async () => {
      // Arrange
      pokemonRepository.getPokemonSpecies.mockResolvedValue(mockMewtwoSpecies);
      translationRepository.translate.mockResolvedValue(
        'Created by a scientist after years of horrific gene splicing and dna engineering experiments, it was.',
      );

      // Act
      const result = await service.getTranslatedPokemon('mewtwo');

      // Assert
      expect(translationRepository.translate).toHaveBeenCalledWith(
        expect.any(String),
        TranslationType.YODA,
      );
      expect(result.description).toBe(
        'Created by a scientist after years of horrific gene splicing and dna engineering experiments, it was.',
      );
    });

    it('should use Yoda translation for cave habitat Pokemon', async () => {
      // Arrange
      pokemonRepository.getPokemonSpecies.mockResolvedValue(mockZubatSpecies);
      translationRepository.translate.mockResolvedValue(
        'In perpetually dark places, forms colonies. Uses ultrasonic waves to identify and approach targets.',
      );

      // Act
      const result = await service.getTranslatedPokemon('zubat');

      // Assert
      expect(translationRepository.translate).toHaveBeenCalledWith(
        expect.any(String),
        TranslationType.YODA,
      );
      expect(result.description).toContain('In perpetually dark places');
    });

    it('should use Shakespeare translation for non-legendary, non-cave Pokemon', async () => {
      // Arrange
      pokemonRepository.getPokemonSpecies.mockResolvedValue(mockPikachuSpecies);
      translationRepository.translate.mockResolvedValue(
        'At which hour several of these pokémon gather,  their electricity couldst buildeth and cause lightning storms.',
      );

      // Act
      const result = await service.getTranslatedPokemon('pikachu');

      // Assert
      expect(translationRepository.translate).toHaveBeenCalledWith(
        expect.any(String),
        TranslationType.SHAKESPEARE,
      );
      expect(result.description).toContain('At which hour');
    });

    it('should fall back to standard description if translation fails', async () => {
      // Arrange
      pokemonRepository.getPokemonSpecies.mockResolvedValue(mockPikachuSpecies);
      translationRepository.translate.mockResolvedValue(null);

      // Act
      const result = await service.getTranslatedPokemon('pikachu');

      // Assert
      expect(result.description).toBe(
        'When several of these POKéMON gather, their electricity could build and cause lightning storms.',
      );
    });

    it('should return all required fields with translated description', async () => {
      // Arrange
      pokemonRepository.getPokemonSpecies.mockResolvedValue(mockMewtwoSpecies);
      translationRepository.translate.mockResolvedValue('Translated text');

      // Act
      const result = await service.getTranslatedPokemon('mewtwo');

      // Assert
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('habitat');
      expect(result).toHaveProperty('isLegendary');
      expect(result.name).toBe('mewtwo');
      expect(result.habitat).toBe('rare');
      expect(result.isLegendary).toBe(true);
    });
  });

  describe('determineTranslationType', () => {
    it('should return Yoda for cave habitat', () => {
      // Arrange
      const habitat = 'cave';
      const isLegendary = false;

      // Act
      const result = service.determineTranslationType(habitat, isLegendary);

      // Assert
      expect(result).toBe(TranslationType.YODA);
    });

    it('should return Yoda for legendary Pokemon', () => {
      // Arrange
      const habitat = 'forest';
      const isLegendary = true;

      // Act
      const result = service.determineTranslationType(habitat, isLegendary);

      // Assert
      expect(result).toBe(TranslationType.YODA);
    });

    it('should return Shakespeare for non-cave, non-legendary Pokemon', () => {
      // Arrange
      const habitat = 'forest';
      const isLegendary = false;

      // Act
      const result = service.determineTranslationType(habitat, isLegendary);

      // Assert
      expect(result).toBe(TranslationType.SHAKESPEARE);
    });
  });
});
