import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BotPersona } from '../request/update-org-branding.request';

export class OrgBrandingResponse {
  @ApiPropertyOptional({
    example: '#3B82F6',
    description: 'Màu thương hiệu (hex)',
  })
  brandColor?: string | null;

  @ApiPropertyOptional({ example: 'ICCP Assistant', description: 'Tên bot' })
  botName?: string | null;

  @ApiPropertyOptional({ enum: BotPersona, example: BotPersona.FRIENDLY })
  botPersona?: BotPersona | null;
}

export class OrgBrandingUpdateResponse {
  @ApiPropertyOptional({ type: OrgBrandingResponse })
  branding?: OrgBrandingResponse;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class OrgProfileResponse {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'ICCP Company' })
  name: string;

  @ApiProperty({ example: 'iccp-company' })
  slug: string;

  @ApiPropertyOptional({ example: 'We build great things.' })
  description?: string;

  @ApiPropertyOptional({ example: 'https://cdn.imagekit.io/xxx/logo.png' })
  logoUrl?: string;

  @ApiPropertyOptional({ example: 'https://iccp.vn' })
  website?: string;

  @ApiPropertyOptional({ example: 'contact@iccp.vn' })
  contactEmail?: string;

  @ApiPropertyOptional({ example: 'Technology' })
  industry?: string;

  @ApiPropertyOptional({ example: 'medium' })
  size?: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiPropertyOptional({ type: OrgBrandingResponse })
  branding?: OrgBrandingResponse;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
