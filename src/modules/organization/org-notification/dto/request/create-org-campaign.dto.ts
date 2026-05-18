import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Org-scoped: targetOrgId is injected from header; SPECIFIC_USERS targets org members by userId
export enum OrgTargetType {
  ORG_ALL = 'ORG_ALL',
  ORG_ROLE = 'ORG_ROLE',
  SPECIFIC_USERS = 'SPECIFIC_USERS',
}

export class CreateOrgCampaignDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  message: string;

  @ApiProperty({ description: 'HTML content from TipTap' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ default: 'info' })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiProperty({ enum: OrgTargetType })
  @IsEnum(OrgTargetType)
  targetType: OrgTargetType;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  @ValidateIf(
    (o: CreateOrgCampaignDto) => o.targetType === OrgTargetType.ORG_ROLE,
  )
  targetRoleIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'User IDs for SPECIFIC_USERS target',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  @ValidateIf(
    (o: CreateOrgCampaignDto) => o.targetType === OrgTargetType.SPECIFIC_USERS,
  )
  targetUserIds?: string[];

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  sendEmail?: boolean;
}
