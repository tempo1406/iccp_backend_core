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
import { TargetType } from '../../entities/notification-campaign.entity';

export class CreateCampaignDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  message: string;

  @ApiProperty()
  @IsString()
  content: string;

  @ApiPropertyOptional({ default: 'info' })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiProperty({ enum: TargetType })
  @IsEnum(TargetType)
  targetType: TargetType;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  @ValidateIf(
    (o: CreateCampaignDto) =>
      o.targetType === TargetType.ORG_ALL ||
      o.targetType === TargetType.ORG_ROLE,
  )
  targetOrgId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  @ValidateIf((o: CreateCampaignDto) => o.targetType === TargetType.ORG_ROLE)
  targetRoleIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  @ValidateIf(
    (o: CreateCampaignDto) => o.targetType === TargetType.SPECIFIC_USERS,
  )
  targetUserIds?: string[];

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  sendEmail?: boolean;
}
