import { SYSTEM_ROLES } from '@modules/rbac/constant/permission.constant';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsString } from 'class-validator';

export class SyncPermissionRequest {
  @ApiProperty({
    description:
      'Danh sách permission codes cần sync. Để trống [] để sync toàn bộ permissions từ constant.',
    example: ['documents.create', 'projects.view'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  permissionCodes: string[];

  @ApiProperty({
    description:
      'Danh sách system roles sẽ được gán các permissions trên. Để trống [] để gán cho toàn bộ system roles.',
    example: [SYSTEM_ROLES.SYSTEM_ADMIN],
    enum: SYSTEM_ROLES,
    isArray: true,
  })
  @IsArray()
  @IsEnum(SYSTEM_ROLES, { each: true })
  systemRoles: (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES][];
}
