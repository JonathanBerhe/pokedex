import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  NotFoundException,
} from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PokemonService } from '../src/application/pokemon.service';

describe('Pokemon Controller (e2e)', () => {
  let app: INestApplication;
  let mockPokemonService: jest.Mocked<PokemonService>;

  // Mock data
  const mockPikachuResponse = {
    name: 'pikachu',
    description:
      'When several of these POKéMON gather, their electricity could build and cause lightning storms.',
    habitat: 'forest',
    isLegendary: false,
  };

  const mockMewtwoResponse = {
    name: 'mewtwo',
    description:
      'It was created by a scientist after years of horrific gene splicing and DNA engineering experiments.',
    habitat: 'rare',
    isLegendary: true,
  };

  const mockTranslatedPikachuResponse = {
    name: 'pikachu',
    description:
      'At which hour several of these pokémon gather, their electricity couldst buildeth and cause lightning storms.',
    habitat: 'forest',
    isLegendary: false,
  };

  const mockTranslatedMewtwoResponse = {
    name: 'mewtwo',
    description:
      'Created by a scientist after years of horrific gene splicing and dna engineering experiments, it was.',
    habitat: 'rare',
    isLegendary: true,
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PokemonService)
      .useValue({
        getPokemon: jest.fn(),
        getTranslatedPokemon: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();

    // Apply the same global pipes as in main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    await app.init();

    mockPokemonService = moduleFixture.get(PokemonService);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /pokemon/:name', () => {
    describe('Success Cases', () => {
      it('should return basic Pokemon information with HTTP 200', () => {
        // Arrange
        mockPokemonService.getPokemon.mockResolvedValue(mockPikachuResponse);

        // Act & Assert
        return request(app.getHttpServer())
          .get('/pokemon/pikachu')
          .expect(200)
          .expect((res) => {
            expect(res.body).toEqual(mockPikachuResponse);
            expect(res.body).toHaveProperty('name', 'pikachu');
            expect(res.body).toHaveProperty('description');
            expect(res.body).toHaveProperty('habitat', 'forest');
            expect(res.body).toHaveProperty('isLegendary', false);
          });
      });

      it('should handle Pokemon names with hyphens', () => {
        // Arrange
        const mockHyphenatedPokemon = {
          name: 'ho-oh',
          description: 'A legendary bird Pokemon.',
          habitat: 'rare',
          isLegendary: true,
        };
        mockPokemonService.getPokemon.mockResolvedValue(mockHyphenatedPokemon);

        // Act & Assert
        return request(app.getHttpServer())
          .get('/pokemon/ho-oh')
          .expect(200)
          .expect((res) => {
            expect(res.body.name).toBe('ho-oh');
          });
      });

      it('should delegate to Pokemon service with correct parameter', async () => {
        // Arrange
        mockPokemonService.getPokemon.mockResolvedValue(mockMewtwoResponse);

        // Act
        await request(app.getHttpServer()).get('/pokemon/mewtwo').expect(200);

        // Assert
        expect(mockPokemonService.getPokemon).toHaveBeenCalledWith('mewtwo');
        expect(mockPokemonService.getPokemon).toHaveBeenCalledTimes(1);
      });

      it('should return JSON response with correct content-type', () => {
        // Arrange
        mockPokemonService.getPokemon.mockResolvedValue(mockPikachuResponse);

        // Act & Assert
        return request(app.getHttpServer())
          .get('/pokemon/pikachu')
          .expect('Content-Type', /json/)
          .expect(200);
      });

      it('should return all required fields in response', () => {
        // Arrange
        mockPokemonService.getPokemon.mockResolvedValue(mockMewtwoResponse);

        // Act & Assert
        return request(app.getHttpServer())
          .get('/pokemon/mewtwo')
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('name');
            expect(res.body).toHaveProperty('description');
            expect(res.body).toHaveProperty('habitat');
            expect(res.body).toHaveProperty('isLegendary');
            expect(typeof res.body.name).toBe('string');
            expect(typeof res.body.description).toBe('string');
            expect(typeof res.body.habitat).toBe('string');
            expect(typeof res.body.isLegendary).toBe('boolean');
          });
      });
    });

    describe('Validation - Request DTOs', () => {
      it('should reject Pokemon names with uppercase letters', () => {
        // Act & Assert
        return request(app.getHttpServer())
          .get('/pokemon/PIKACHU')
          .expect(400)
          .expect((res) => {
            expect(res.body.message).toContain(
              'Pokemon name must contain only lowercase letters, numbers, and hyphens',
            );
          });
      });

      it('should reject Pokemon names with special characters', () => {
        // Act & Assert
        return request(app.getHttpServer())
          .get('/pokemon/pika$chu')
          .expect(400)
          .expect((res) => {
            expect(res.body.message).toContain(
              'Pokemon name must contain only lowercase letters, numbers, and hyphens',
            );
          });
      });

      it('should reject Pokemon names with spaces', () => {
        // Act & Assert
        return request(app.getHttpServer())
          .get('/pokemon/pika chu')
          .expect(400)
          .expect((res) => {
            expect(res.body.message).toContain(
              'Pokemon name must contain only lowercase letters, numbers, and hyphens',
            );
          });
      });

      it('should reject Pokemon names that are too long', () => {
        // Arrange
        const longName = 'a'.repeat(51);

        // Act & Assert
        return request(app.getHttpServer())
          .get(`/pokemon/${longName}`)
          .expect(400)
          .expect((res) => {
            expect(res.body.message).toContain(
              'Pokemon name must be between 1 and 50 characters',
            );
          });
      });

      it('should not invoke service when validation fails', async () => {
        // Act
        await request(app.getHttpServer()).get('/pokemon/INVALID').expect(400);

        // Assert
        expect(mockPokemonService.getPokemon).not.toHaveBeenCalled();
      });
    });

    describe('Error Handling', () => {
      it('should return 404 when service throws NotFoundException', () => {
        // Arrange
        mockPokemonService.getPokemon.mockRejectedValue(
          new NotFoundException('Pokemon not found'),
        );

        // Act & Assert
        return request(app.getHttpServer())
          .get('/pokemon/invalidpokemon')
          .expect(404);
      });

      it('should propagate errors from service layer', () => {
        // Arrange
        mockPokemonService.getPokemon.mockRejectedValue(
          new Error('Service error'),
        );

        // Act & Assert
        return request(app.getHttpServer()).get('/pokemon/pikachu').expect(500);
      });
    });

    describe('Rate Limiting', () => {
      it('should enforce rate limit of 10 requests per minute', async () => {
        // Arrange
        mockPokemonService.getPokemon.mockResolvedValue(mockPikachuResponse);

        // Act - Make 10 successful requests
        for (let i = 0; i < 10; i++) {
          await request(app.getHttpServer())
            .get('/pokemon/pikachu')
            .expect(200);
        }

        // Assert - 11th request should be rate limited
        return request(app.getHttpServer())
          .get('/pokemon/pikachu')
          .expect(429)
          .expect((res) => {
            expect(res.body.message).toContain('Too Many Requests');
          });
      });

      it('should not invoke service when rate limit is exceeded', async () => {
        // Arrange
        mockPokemonService.getPokemon.mockResolvedValue(mockPikachuResponse);
        jest.clearAllMocks();

        // Act - Make requests until rate limited
        for (let i = 0; i < 10; i++) {
          await request(app.getHttpServer()).get('/pokemon/pikachu');
        }

        jest.clearAllMocks();

        // Make rate-limited request
        await request(app.getHttpServer()).get('/pokemon/pikachu').expect(429);

        // Assert - Service should not be called for rate-limited request
        expect(mockPokemonService.getPokemon).not.toHaveBeenCalled();
      });
    });
  });

  describe('GET /pokemon/translated/:name', () => {
    describe('Success Cases', () => {
      it('should return Pokemon with translated description and HTTP 200', () => {
        // Arrange
        mockPokemonService.getTranslatedPokemon.mockResolvedValue(
          mockTranslatedPikachuResponse,
        );

        // Act & Assert
        return request(app.getHttpServer())
          .get('/pokemon/translated/pikachu')
          .expect(200)
          .expect((res) => {
            expect(res.body).toEqual(mockTranslatedPikachuResponse);
            expect(res.body).toHaveProperty('name', 'pikachu');
            expect(res.body).toHaveProperty('description');
            expect(res.body).toHaveProperty('habitat', 'forest');
            expect(res.body).toHaveProperty('isLegendary', false);
          });
      });

      it('should return translated description for legendary Pokemon', () => {
        // Arrange
        mockPokemonService.getTranslatedPokemon.mockResolvedValue(
          mockTranslatedMewtwoResponse,
        );

        // Act & Assert
        return request(app.getHttpServer())
          .get('/pokemon/translated/mewtwo')
          .expect(200)
          .expect((res) => {
            expect(res.body.description).toBe(
              mockTranslatedMewtwoResponse.description,
            );
          });
      });

      it('should delegate to Pokemon service with correct parameter', async () => {
        // Arrange
        mockPokemonService.getTranslatedPokemon.mockResolvedValue(
          mockTranslatedMewtwoResponse,
        );

        // Act
        await request(app.getHttpServer())
          .get('/pokemon/translated/mewtwo')
          .expect(200);

        // Assert
        expect(mockPokemonService.getTranslatedPokemon).toHaveBeenCalledWith(
          'mewtwo',
        );
        expect(mockPokemonService.getTranslatedPokemon).toHaveBeenCalledTimes(
          1,
        );
      });

      it('should handle fallback to standard description', () => {
        // Arrange - Service returns standard description (translation failed)
        mockPokemonService.getTranslatedPokemon.mockResolvedValue(
          mockPikachuResponse,
        );

        // Act & Assert
        return request(app.getHttpServer())
          .get('/pokemon/translated/pikachu')
          .expect(200)
          .expect((res) => {
            expect(res.body.description).toBe(mockPikachuResponse.description);
          });
      });

      it('should return JSON response with correct content-type', () => {
        // Arrange
        mockPokemonService.getTranslatedPokemon.mockResolvedValue(
          mockTranslatedPikachuResponse,
        );

        // Act & Assert
        return request(app.getHttpServer())
          .get('/pokemon/translated/pikachu')
          .expect('Content-Type', /json/)
          .expect(200);
      });
    });

    describe('Validation - Request DTOs', () => {
      it('should reject Pokemon names with uppercase letters', () => {
        // Act & Assert
        return request(app.getHttpServer())
          .get('/pokemon/translated/MEWTWO')
          .expect(400)
          .expect((res) => {
            expect(res.body.message).toContain(
              'Pokemon name must contain only lowercase letters, numbers, and hyphens',
            );
          });
      });

      it('should reject Pokemon names with special characters', () => {
        // Act & Assert
        return request(app.getHttpServer())
          .get('/pokemon/translated/mew@two')
          .expect(400)
          .expect((res) => {
            expect(res.body.message).toContain(
              'Pokemon name must contain only lowercase letters, numbers, and hyphens',
            );
          });
      });

      it('should not invoke service when validation fails', async () => {
        // Act
        await request(app.getHttpServer())
          .get('/pokemon/translated/INVALID')
          .expect(400);

        // Assert
        expect(mockPokemonService.getTranslatedPokemon).not.toHaveBeenCalled();
      });
    });

    describe('Error Handling', () => {
      it('should return 404 when service throws NotFoundException', () => {
        // Arrange
        mockPokemonService.getTranslatedPokemon.mockRejectedValue(
          new NotFoundException('Pokemon not found'),
        );

        // Act & Assert
        return request(app.getHttpServer())
          .get('/pokemon/translated/invalidpokemon')
          .expect(404);
      });

      it('should propagate errors from service layer', () => {
        // Arrange
        mockPokemonService.getTranslatedPokemon.mockRejectedValue(
          new Error('Service error'),
        );

        // Act & Assert
        return request(app.getHttpServer())
          .get('/pokemon/translated/pikachu')
          .expect(500);
      });
    });

    describe('Rate Limiting', () => {
      it('should enforce rate limit of 5 requests per hour', async () => {
        // Arrange
        mockPokemonService.getTranslatedPokemon.mockResolvedValue(
          mockTranslatedMewtwoResponse,
        );

        // Act - Make 5 successful requests
        for (let i = 0; i < 5; i++) {
          await request(app.getHttpServer())
            .get('/pokemon/translated/mewtwo')
            .expect(200);
        }

        // Assert - 6th request should be rate limited
        return request(app.getHttpServer())
          .get('/pokemon/translated/mewtwo')
          .expect(429)
          .expect((res) => {
            expect(res.body.message).toContain('Too Many Requests');
          });
      });

      it('should not invoke service when rate limit is exceeded', async () => {
        // Arrange
        mockPokemonService.getTranslatedPokemon.mockResolvedValue(
          mockTranslatedMewtwoResponse,
        );
        jest.clearAllMocks();

        // Act - Make requests until rate limited
        for (let i = 0; i < 5; i++) {
          await request(app.getHttpServer()).get('/pokemon/translated/mewtwo');
        }

        jest.clearAllMocks();

        // Make rate-limited request
        await request(app.getHttpServer())
          .get('/pokemon/translated/mewtwo')
          .expect(429);

        // Assert - Service should not be called for rate-limited request
        expect(mockPokemonService.getTranslatedPokemon).not.toHaveBeenCalled();
      });
    });
  });

  describe('Route Mapping', () => {
    it('should correctly map GET /pokemon/:name to getPokemon handler', async () => {
      // Arrange
      mockPokemonService.getPokemon.mockResolvedValue(mockPikachuResponse);

      // Act
      await request(app.getHttpServer()).get('/pokemon/pikachu').expect(200);

      // Assert
      expect(mockPokemonService.getPokemon).toHaveBeenCalled();
      expect(mockPokemonService.getTranslatedPokemon).not.toHaveBeenCalled();
    });

    it('should correctly map GET /pokemon/translated/:name to getTranslatedPokemon handler', async () => {
      // Arrange
      mockPokemonService.getTranslatedPokemon.mockResolvedValue(
        mockTranslatedPikachuResponse,
      );

      // Act
      await request(app.getHttpServer())
        .get('/pokemon/translated/pikachu')
        .expect(200);

      // Assert
      expect(mockPokemonService.getTranslatedPokemon).toHaveBeenCalled();
      expect(mockPokemonService.getPokemon).not.toHaveBeenCalled();
    });

    it('should not accept POST requests on GET endpoints', () => {
      // Act & Assert
      return request(app.getHttpServer()).post('/pokemon/pikachu').expect(404);
    });

    it('should not accept PUT requests on GET endpoints', () => {
      // Act & Assert
      return request(app.getHttpServer()).put('/pokemon/pikachu').expect(404);
    });

    it('should not accept DELETE requests on GET endpoints', () => {
      // Act & Assert
      return request(app.getHttpServer())
        .delete('/pokemon/pikachu')
        .expect(404);
    });
  });
});
