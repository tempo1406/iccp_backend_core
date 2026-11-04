import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Matches,
  IsIn,
} from 'class-validator';

export class CreateOrganizationRequest {
  @ApiProperty({ description: 'Tên tổ chức', example: 'ICCP Company' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Slug duy nhất của tổ chức (dùng trong URL)',
    example: 'iccp-company',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug chỉ được chứa chữ thường, số và dấu gạch ngang',
  })
  slug: string;

  @ApiPropertyOptional({
    description: 'Mô tả tổ chức',
    example: 'A great company',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'URL logo tổ chức' })
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'Ngành nghề của tổ chức',
    example: 'Technology',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  industry?: string;

  @ApiPropertyOptional({
    description: 'Quy mô tổ chức',
    example: 'medium',
    enum: ['small', 'medium', 'large', 'enterprise'],
  })
  @IsString()
  @IsOptional()
  @IsIn(['small', 'medium', 'large', 'enterprise'])
  size?: string;

  @ApiPropertyOptional({ description: 'ID gói subscription (UUID)' })
  @IsUUID()
  @IsOptional()
  subscriptionPlanId?: string;
}
