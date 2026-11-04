import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class ListMyDraftsQueryRequest {
  @ApiPropertyOptional({
    description: 'Page size for draft list',
    default: 20,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Cursor from previous response for next page',
    example:
      'eyJ1cGRhdGVkQXQiOiIyMDI2LTAzLTIzVDE1OjQ2OjEwLjAwMFoiLCJpZCI6IjEyM2U0NTY3LWU4OWItMTJkMy1hNDU2LTQyNjYxNDE3NDAwMCJ9',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Filter drafts by room id',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  roomId?: string;
}
