import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;
}

export class CreateTemplateRequest {
  @ApiProperty()
  @IsString()
  @MaxLength(30)
  @Transform(trimString)
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  html?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  projectData?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  thumbnailUrl?: string;
}
