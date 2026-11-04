import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class QueryTaskWorklogsRequest {
  @ApiPropertyOptional({ example: '2026-04-18' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  workDate?: string;

  @ApiPropertyOptional({ example: '4b6f223b-2e53-4698-aa8e-6570f6cb2f60' })
  @IsOptional()
  @IsUUID()
  userId?: string;
}
