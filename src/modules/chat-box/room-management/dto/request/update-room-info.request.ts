import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateRoomInfoRequest {
  @ApiPropertyOptional({
    example: 'marketing-private',
    description: 'Ten room moi',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    example: 'Kenh thao luan noi bo team marketing',
    description: 'Topic ngan cho room',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  topic?: string;

  @ApiPropertyOptional({
    example: 'Noi trao doi cong viec, tai lieu va thong bao cua team marketing',
    description: 'Mo ta chi tiet room',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
