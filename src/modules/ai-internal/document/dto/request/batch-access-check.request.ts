import { IsArray, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class BatchAccessCheckRequest {
  @IsUUID()
  userId: string;

  @IsUUID()
  organizationId: string;

  @IsArray()
  @IsString({ each: true })
  documentIds: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  roleIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  projectIds?: string[];

  @IsOptional()
  @IsIn(['view', 'download', 'edit', 'manage'])
  requiredPermission?: 'view' | 'download' | 'edit' | 'manage';
}
