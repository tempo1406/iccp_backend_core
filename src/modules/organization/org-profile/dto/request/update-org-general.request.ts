import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class UpdateOrgGeneralRequest {
  @ApiPropertyOptional({ example: 'ICCP Company', description: 'Tên tổ chức', maxLength: 255 })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    example: 'We build great things.',
    description: 'Mô tả tổ chức. Gửi null để xóa.',
    nullable: true,
  })
  @ValidateIf((o: UpdateOrgGeneralRequest) => o.description !== null)
  @IsString()
  @IsOptional()
  description?: string | null;

  @ApiPropertyOptional({
    example: 'https://cdn.imagekit.io/xxx/logo.png',
    description: 'URL logo tổ chức (upload qua /imagekit/upload trước). Gửi null để xóa.',
    nullable: true,
  })
  @ValidateIf((o: UpdateOrgGeneralRequest) => o.logoUrl !== null)
  @IsUrl()
  @IsOptional()
  logoUrl?: string | null;

  @ApiPropertyOptional({
    example: 'https://iccp.vn',
    description: 'Website chính thức của tổ chức. Gửi null để xóa.',
    maxLength: 500,
    nullable: true,
  })
  @ValidateIf((o: UpdateOrgGeneralRequest) => o.website !== null)
  @IsUrl({ require_tld: false })
  @IsOptional()
  @MaxLength(500)
  website?: string | null;

  @ApiPropertyOptional({
    example: 'contact@iccp.vn',
    description: 'Email liên hệ của tổ chức. Gửi null để xóa.',
    nullable: true,
  })
  @ValidateIf((o: UpdateOrgGeneralRequest) => o.contactEmail !== null)
  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  contactEmail?: string | null;
}
