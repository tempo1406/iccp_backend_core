import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class FolderResponse {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiPropertyOptional()
  @Expose()
  organizationId?: string;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiPropertyOptional()
  @Expose()
  projectId?: string;

  @ApiPropertyOptional()
  @Expose()
  description?: string;

  @ApiProperty()
  @Expose()
  isSystem: boolean;

  @ApiPropertyOptional({ description: 'ID folder cha, null = root' })
  @Expose()
  parentId?: string;

  @ApiPropertyOptional({
    description: 'ID cha gốc trước khi bị ném vào Recovery',
  })
  @Expose()
  originalParentId?: string;

  @ApiPropertyOptional({ description: 'Materialized path' })
  @Expose()
  path?: string;

  @ApiProperty()
  @Expose()
  sortOrder: number;

  @ApiProperty()
  @Expose()
  createdBy: string;

  @ApiProperty()
  @Expose()
  createdAt: Date;

  @ApiProperty()
  @Expose()
  updatedAt: Date;
}
