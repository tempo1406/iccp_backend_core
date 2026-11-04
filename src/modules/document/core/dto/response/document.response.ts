import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { AccessRuleResponse } from '../../../access/dto/response/access-rule.response';

export class DocumentResponse {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiPropertyOptional({ description: 'null = system-level document' })
  @Expose()
  organizationId?: string;

  @ApiPropertyOptional()
  @Expose()
  folderId?: string;

  @ApiPropertyOptional()
  @Expose()
  categoryId?: string;

  @ApiProperty()
  @Expose()
  title: string;

  @ApiPropertyOptional()
  @Expose()
  description?: string;

  @ApiPropertyOptional()
  @Expose()
  fileName?: string;

  @ApiProperty({ description: 'ImageKit URL' })
  @Expose()
  filePath: string;

  @ApiPropertyOptional({ description: 'Kích thước file (bytes)' })
  @Expose()
  fileSize?: number;

  @ApiPropertyOptional({ description: 'pdf, docx, txt...' })
  @Expose()
  fileType?: string;

  @ApiPropertyOptional()
  @Expose()
  mimeType?: string;

  @ApiProperty()
  @Expose()
  uploadedBy: string;

  @ApiProperty({ description: 'pending | processing | indexed | failed' })
  @Expose()
  status: string;

  @ApiProperty({ description: 'organization | project | role | user | system' })
  @Expose()
  accessScope: string;

  @ApiPropertyOptional()
  @Expose()
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'Version hiện tại' })
  @Expose()
  version: number;

  @ApiProperty()
  @Expose()
  isActive: boolean;

  @ApiPropertyOptional()
  @Expose()
  indexedAt?: Date;

  @ApiProperty()
  @Expose()
  createdAt: Date;

  @ApiProperty()
  @Expose()
  updatedAt: Date;

  @ApiPropertyOptional({ type: [AccessRuleResponse] })
  @Expose()
  @Type(() => AccessRuleResponse)
  accessRules?: AccessRuleResponse[];
}
