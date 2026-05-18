import { IsOptional, IsString, IsUUID } from 'class-validator';

export class SyncDocumentMetadataRequest {
  @IsOptional()
  @IsString()
  accessScope?: string;

  @IsOptional()
  @IsUUID()
  folderId?: string;
}
