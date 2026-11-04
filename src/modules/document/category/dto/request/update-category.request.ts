import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCategoryRequest {
  @ApiPropertyOptional({ description: 'Tên category mới', example: 'IT' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Mô tả mới' })
  @IsString()
  @IsOptional()
  description?: string;
}
