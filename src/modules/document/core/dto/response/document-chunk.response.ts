import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class DocumentChunkResponse {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  documentId: string;

  @ApiProperty()
  @Expose()
  chunkIndex: number;

  @ApiProperty()
  @Expose()
  content: string;

  @ApiProperty()
  @Expose()
  tokenCount: number;

  @ApiPropertyOptional()
  @Expose()
  metadata?: Record<string, any>;

  @ApiProperty()
  @Expose()
  createdAt: Date;
}
