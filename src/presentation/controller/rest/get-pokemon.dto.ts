import { IsString, IsNotEmpty, Matches, Length } from 'class-validator';

/**
 * DTO for getting Pokemon information
 */
export class GetPokemonDto {
  /**
   * Pokemon name
   * - Must be alphanumeric (lowercase letters, numbers, and hyphens allowed)
   * - Between 1 and 50 characters
   */
  @IsString()
  @IsNotEmpty({ message: 'Pokemon name is required' })
  @Length(1, 50, {
    message: 'Pokemon name must be between 1 and 50 characters',
  })
  @Matches(/^[a-z0-9-]+$/, {
    message:
      'Pokemon name must contain only lowercase letters, numbers, and hyphens',
  })
  name!: string;
}
