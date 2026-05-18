import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class CategoryResponse {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiPropertyOptional({ description: 'null = system-level category' })
  @Expose()
  organizationId?: string;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiPropertyOptional()
  @Expose()
  description?: string;

  @ApiProperty()
  @Expose()
  createdAt: Date;

  @ApiProperty()
  @Expose()
  updatedAt: Date;
}
