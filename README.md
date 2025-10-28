# Pokedex API

A fun REST API that returns Pokemon information with optional "fun" translations. Built with NestJS and TypeScript.

## Quick Start

**Prerequisites**: Docker and Docker Compose only.

### On macOs
```bash
brew install --cask docker
```

The fastest way to run this application is using Docker Compose:

```bash
# Clone the repository
git clone https://github.com/JonathanBerhe/pokedex
cd pokedex

# Start the API
docker compose up --build
```

That's it! The application will be available at http://localhost:3000

To stop the services:
```bash
docker compose down
```

## API Endpoints

**OpenAPI API Documentation**: Access the API docs at http://localhost:3000/api

### 1. Get Basic Pokemon Information

**Endpoint**: `GET /pokemon/:name`

**Rate Limit**: 10 requests per minute

**Example**:
```bash
curl http://localhost:3000/pokemon/mewtwo
```

**Response**:
```json
{
  "name": "mewtwo",
  "description": "It was created by a scientist after years of horrific gene splicing and DNA engineering experiments.",
  "habitat": "rare",
  "isLegendary": true
}
```

### 2. Get Translated Pokemon Information

**Endpoint**: `GET /pokemon/translated/:name`

**Rate Limit**: 5 requests per hour

**Example**:
```bash
curl http://localhost:3000/pokemon/translated/mewtwo
```

**Response**:
```json
{
  "name": "mewtwo",
  "description": "Created by a scientist after years of horrific gene splicing and dna engineering experiments, it was.",
  "habitat": "rare",
  "isLegendary": true
}
```

### Example Pokemon to Try

- `mewtwo` - Legendary Pokemon (Yoda translation)
- `pikachu` - Regular Pokemon (Shakespeare translation)
- `zubat` - Cave habitat Pokemon (Yoda translation)
- `charizard` - Regular Pokemon (Shakespeare translation)

### Manual E2E Testing

Test scripts are provided to easily verify all endpoints:

```bash
# With jq for formatted JSON output
./test-endpoints.sh

./test-rate-limit.sh
```

These scripts test:
- Basic Pokemon information endpoints
- Translated descriptions (both Yoda and Shakespeare)
- Error handling for invalid Pokemon
- The rate limiter

## External APIs Used

- **PokéAPI**: https://pokeapi.co/ - Pokemon data
- **FunTranslations API**: https://funtranslations.com/ - Shakespeare and Yoda translations
  - Note: Free tier has 5 requests/hour limit


## Architecture

This project implements **Clean Architecture**, an approach that organizes code into concentric layers where dependencies flow inward toward the core business logic. 
The key principle is that inner layers should never depend on outer layers, which creates a system where business rules remain stable and isolated from technical implementation details.

```
src/
├── domain/              # Business entities and repository interfaces (no dependencies)
│   ├── model/           # Domain models and types
│   └── repository/      # Repository contracts (interfaces)
│
├── application/         # Business logic and use cases
│   └── pokemon.service.ts with tests
│
├── infrastructure/      # External dependencies and implementations
│   ├── cache/           # Redis cache module with wrapper service for error handling
│   └── repository/      # Repository implementations (PokéAPI, FunTranslations)
│       └── util/        # Shared utilities (exponential backoff)
│
├── presentation/        # HTTP interface layer
│   └── controller/rest/ # REST controllers and DTOs
│
├── app.module.ts        # Root module
└── main.ts              # Application entry point

test/                    # E2E tests
.github/workflows/       # CI/CD pipeline
```

### The Core: Domain Layer

At the center of the architecture is the **Domain Layer**, which defines the fundamental business concepts of the application. This layer contains Pokemon and Translation models that represent our business entities, along with repository interfaces that specify contracts for data access. Critically, this layer has zero dependencies on external frameworks, databases, or third-party libraries. The domain simply declares "I need Pokemon data" through an interface, without caring about whether that data comes from PokéAPI, a database, or a test mock.

This independence is achieved through **Dependency Inversion**: instead of concrete implementations, the domain defines abstractions (interfaces) that outer layers must satisfy. This means we can change how we fetch Pokemon data without ever touching the domain definitions.

### Business Logic: Application Layer

The **Application Layer** orchestrates business workflows by implementing use cases like "fetch Pokemon information" or "get translated Pokemon description." This layer depends on domain interfaces and coordinates operations across multiple repositories. For instance, when handling a translated Pokemon request, the application service retrieves Pokemon data, determines which translation type to apply based on habitat and legendary status, fetches the translation, and gracefully falls back to the standard description if translation fails.

Importantly, this layer works with abstractions, not implementations. It calls repository interfaces defined in the domain without knowing whether those repositories talk to external APIs, read from a cache, or return mock data. This separation makes business logic testable in isolation—we can verify translation rules by mocking repositories rather than making real API calls.

### Technical Details: Infrastructure Layer

The **Infrastructure Layer** provides concrete implementations for all the abstractions defined by inner layers. Here we find the actual HTTP clients that communicate with PokéAPI and FunTranslations, Redis cache configuration, and utility functions like exponential backoff retry logic. Each repository implementation satisfies a domain interface, bridging the gap between abstract business needs and concrete technical solutions.

This layer also handles cross-cutting concerns like network resilience. When an external API request fails with a retryable error (429 rate limit or 5xx server error), the exponential backoff utility automatically retries with increasing delays. The cache module wraps Redis operations and implements graceful degradation—if Redis is unavailable, the application continues functioning by falling back to direct API calls.

### HTTP Interface: Presentation Layer

The **Presentation Layer** exposes business capabilities through REST endpoints. Controllers in this layer are thin adapters that handle HTTP-specific concerns: extracting parameters from URLs, validating request formats with DTOs, and serializing responses to JSON. They delegate all business logic to application services and focus solely on translating between HTTP and the application's domain language.

This separation means we could add GraphQL endpoints, gRPC services, or CLI commands alongside REST without modifying business logic. The application layer remains agnostic about how it's being consumed.

### Benefits in Practice

This architecture delivers tangible benefits throughout the development lifecycle. **Testing becomes straightforward**: unit tests verify business logic with simple mocks, integration tests validate repository implementations against real services, and e2e tests confirm HTTP behavior—each layer tested at the appropriate level. **Maintenance is simplified** because changes have clear boundaries—adding a new translation provider touches only the infrastructure layer, while modifying translation rules affects only the application layer.

The architecture also supports **evolutionary design**. When we added Redis caching, only the infrastructure layer changed. When rate limiting was introduced, it was added at the presentation layer without touching business logic. The system can grow in complexity while remaining comprehensible because each layer has well-defined responsibilities and dependencies flow in one direction: inward toward the core domain.

## Production-Ready Features

This application includes several features that make it ready for real-world deployment:

### Intelligent Caching with Redis
The application implements a comprehensive caching strategy using Redis to handle external API rate limits and improve performance. Pokemon species data is cached indefinitely (since Pokemon data never changes), while translations use SHA256-hashed keys to handle long text efficiently. The cache implements graceful degradation—if Redis is unavailable, the application continues functioning by falling back to direct API calls. The implementation uses a lazy-loading pattern (cache-aside strategy) and includes comprehensive integration tests.

### Request Validation & Security
All incoming requests are validated using DTOs. The global ValidationPipe enforces strict validation rules, automatically transforms and sanitizes input, and returns clear error messages for invalid requests. This prevents malformed data from reaching business logic and provides a better developer experience.

### Network Resilience
The application handles external API failures gracefully with exponential backoff retry logic. When requests fail with retryable errors (429 rate limits or 5xx server errors), the system automatically retries with increasing delays (configurable up to 3 attempts). Non-retryable errors (like 404s) fail fast without wasting resources.

### Rate Limiting
Route-specific rate limiting protects both the application and external APIs from abuse. The basic Pokemon endpoint allows 10 requests per minute, while the translation endpoint enforces 5 requests per hour (matching FunTranslations API limits). When limits are exceeded, the API returns HTTP 429 with appropriate error messages.

### Testing
The project includes three levels of testing: unit tests verify business logic in isolation with mocked dependencies, integration tests validate repository implementations against real Redis instances, and e2e tests confirm HTTP behavior including routing, validation, and error handling. 

### Containerization & CI/CD
The application is fully containerized with a multi-stage Dockerfile optimized for production. Docker Compose orchestrates the API and Redis services for one-command deployment. A GitHub Actions CI pipeline automatically runs linting, unit tests, integration tests, and e2e tests on every push and pull request.

### Error Handling
NestJS exception filters provide consistent error responses across the application. Custom exceptions like `NotFoundException` are properly mapped to HTTP status codes, while unexpected errors are handled gracefully without exposing internal implementation details.

### Interactive API Documentation
The API includes comprehensive OpenAPI/Swagger documentation accessible at `/api`. The interactive documentation allows developers to explore all endpoints, view request/response schemas, understand validation rules, and test API calls directly from the browser. Documentation is automatically generated from code decorators, ensuring it stays in sync with implementation. Each endpoint includes detailed descriptions, example values, and all possible response codes including error scenarios.

## Future Production Enhancements

While the current implementation is (almost) production-ready, the following enhancements would be valuable for a large-scale production deployment:

### API Versioning
Implement URI-based versioning (`/v1/pokemon/:name`) or header-based versioning to support multiple API versions simultaneously. This enables gradual migration of clients and deprecation of old endpoints without breaking existing integrations.

### Observability & Monitoring
Add structured logging with correlation IDs to trace requests across services, integrate with monitoring platforms like Datadog or New Relic for real-time alerts, and implement distributed tracing to understand performance bottlenecks. Health check endpoints would enable load balancers and orchestrators to route traffic intelligently.

### Advanced Configuration Management
Replace environment variables with `@nestjs/config` for type-safe, validated configuration. Implement separate config files for development, staging, and production environments.

### Authentication & Authorization
Implement API key authentication to track usage per client and enable quota management.

### Performance Optimization
Optimize external API calls by parallelizing independent requests where possible. Implement connection pooling for HTTP clients to reduce connection overhead. Add response compression (gzip).

### Advanced Testing & Deployment
Add load testing with tools like Artillery or k6 to understand breaking points. Implement contract testing to catch API changes early. Deploy to Kubernetes with horizontal pod autoscaling, health checks, and resource limits. Use blue-green or canary deployments for zero-downtime releases.



