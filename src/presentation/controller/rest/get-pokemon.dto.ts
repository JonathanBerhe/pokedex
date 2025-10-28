import { IsString, IsNotEmpty, Matches, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for getting Pokemon information
 */
export class GetPokemonDto {
  @ApiProperty({
    description:
      'Pokemon name (lowercase letters, numbers, and hyphens only, 1-50 characters)',
    example: 'mewtwo',
    pattern: '^[a-z0-9-]+$',
    minLength: 1,
    maxLength: 50,
  })
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
