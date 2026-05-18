import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
  IsEmail,
} from 'class-validator';

function trimString({ value }: { value: unknown }): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export class SubmitLandingPageLeadRequest {
  @ApiPropertyOptional({ example: 'lead' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  @Transform(trimString)
  formType?: string;

  @ApiPropertyOptional({ example: 'newsletter-signup' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  @Transform(trimString)
  formName?: string;

  @ApiPropertyOptional({ example: 'Nguyen Van A' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  @Transform(trimString)
  fullName?: string;

  @ApiPropertyOptional({ example: 'customer@example.com' })
  @IsOptional()
  @ValidateIf((_object, value) => value !== undefined)
  @IsEmail()
  @MaxLength(255)
  @Transform(trimString)
  email?: string;

  @ApiPropertyOptional({ example: '0901234567' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  @Transform(trimString)
  phone?: string;

  @ApiPropertyOptional({ example: 'Can you contact me this week?' })
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  @Transform(trimString)
  message?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/org/demo/landing-page',
  })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  @Transform(trimString)
  pageUrl?: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  @IsObject()
  @IsOptional()
  fields?: Record<string, string>;
}
