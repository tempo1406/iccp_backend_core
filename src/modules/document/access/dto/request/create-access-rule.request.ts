import {
  IsUUID,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  AccessType,
  ResourcePermission,
} from '../../../core/entities/document-access.entity';

export class AccessRuleItem {
  @ApiProperty({
    enum: AccessType,
    description: 'Loại đối tượng được cấp quyền',
  })
  @IsEnum(AccessType)
  @IsNotEmpty()
  accessType: string;

  @ApiProperty({ description: 'UUID của user / role / project' })
  @IsUUID()
  @IsNotEmpty()
  accessId: string;

  @ApiPropertyOptional({
    enum: ResourcePermission,
    default: ResourcePermission.VIEW,
    description: 'view | download | upload | edit | manage (mặc định: view)',
  })
  @IsEnum(ResourcePermission)
  @IsOptional()
  permission: string = ResourcePermission.VIEW;
}

export class CreateAccessRuleRequest {
  @ApiProperty({ type: [AccessRuleItem] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AccessRuleItem)
  rules: AccessRuleItem[];
}
