import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class DocumentVersionResponse {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  documentId: string;

  @ApiProperty()
  @Expose()
  version: number;

  @ApiProperty()
  @Expose()
  filePath: string;

  @ApiPropertyOptional()
  @Expose()
  fileName?: string;

  @ApiPropertyOptional()
  @Expose()
  fileSize?: number;

  @ApiProperty()
  @Expose()
  uploadedBy: string;

  @ApiPropertyOptional()
  @Expose()
  changeNotes?: string;

  @ApiProperty()
  @Expose()
  createdAt: Date;
}
