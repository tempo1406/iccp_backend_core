import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class MoveFolderRequest {
  @ApiPropertyOptional({
    description: 'ID folder cha mới (null = chuyển về root)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({
    description: 'Thứ tự hiển thị trong cùng cấp (0 = đầu tiên)',
    example: 2,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}
