import { ApiProperty } from '@nestjs/swagger';

export class PokemonResponseDto {
  @ApiProperty({
    description: 'The name of the Pokemon',
    example: 'mewtwo',
  })
  name!: string;

  @ApiProperty({
    description:
      'The description of the Pokemon (translated if using /translated endpoint)',
    example:
      'It was created by a scientist after years of horrific gene splicing and DNA engineering experiments.',
  })
  description!: string;

  @ApiProperty({
    description: 'The habitat where the Pokemon lives',
    example: 'rare',
    nullable: true,
  })
  habitat!: string;

  @ApiProperty({
    description: 'Whether the Pokemon is legendary',
    example: true,
  })
  isLegendary!: boolean;
}
