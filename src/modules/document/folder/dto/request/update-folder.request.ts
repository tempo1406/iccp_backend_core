import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateFolderRequest {
  @ApiPropertyOptional({
    description: 'Tên folder mới',
    example: 'HR Policies',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Mô tả mới' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Thứ tự hiển thị mới' })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}
