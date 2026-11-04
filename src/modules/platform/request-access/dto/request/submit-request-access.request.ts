import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

function trimString({ value }: { value: unknown }): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export class SubmitRequestAccessRequest {
  @ApiProperty({ example: 'hello@company.com' })
  @IsEmail()
  @MaxLength(255)
  @Transform(trimString)
  email: string;

  @ApiPropertyOptional({ example: 'platform-landing-page' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(trimString)
  source?: string;

  @ApiPropertyOptional({ example: 'http://localhost:3000/' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2000)
  @Transform(trimString)
  pageUrl?: string;
}
