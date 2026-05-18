import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class DocumentSummaryResponse {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  title: string;

  @ApiProperty({ required: false })
  @Expose()
  fileType?: string;

  @ApiProperty({ required: false })
  @Expose()
  fileSize?: number;

  @ApiProperty()
  @Expose()
  isActive: boolean;

  @ApiProperty()
  @Expose()
  version: number;

  @ApiProperty()
  @Expose()
  createdAt: Date;

  @ApiProperty()
  @Expose()
  updatedAt: Date;
}

export class FolderTreeResponse {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiProperty({ required: false })
  @Expose()
  parentId?: string;

  @ApiProperty()
  @Expose()
  isSystem: boolean;

  @ApiProperty()
  @Expose()
  sortOrder: number;

  @ApiProperty({ required: false })
  @Expose()
  description?: string;

  @ApiProperty({ type: () => [DocumentSummaryResponse] })
  @Expose()
  @Type(() => DocumentSummaryResponse)
  documents: DocumentSummaryResponse[];

  @ApiProperty({ type: () => [FolderTreeResponse] })
  @Expose()
  @Type(() => FolderTreeResponse)
  children: FolderTreeResponse[];
}

export class TreeResponse {
  @ApiProperty({ type: () => [FolderTreeResponse] })
  @Expose()
  @Type(() => FolderTreeResponse)
  folders: FolderTreeResponse[];

  @ApiProperty({ type: () => [DocumentSummaryResponse] })
  @Expose()
  @Type(() => DocumentSummaryResponse)
  rootDocuments: DocumentSummaryResponse[];
}
