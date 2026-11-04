import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCategoryRequest {
  @ApiProperty({ description: 'Tên category', example: 'HR' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: 'Mô tả category',
    example: 'Tài liệu nhân sự',
  })
  @IsString()
  @IsOptional()
  description?: string;
}
