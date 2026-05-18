import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { DocumentStatus } from '@modules/document/core/entities/document.entity';

export class UpdateDocumentStatusRequest {
  @IsEnum(DocumentStatus)
  status: DocumentStatus;

  @IsOptional()
  @IsString()
  errorMessage?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  indexedChunks?: number;
}
