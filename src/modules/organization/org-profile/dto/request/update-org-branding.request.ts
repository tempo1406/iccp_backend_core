import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsHexColor, IsOptional, IsString, MaxLength } from 'class-validator';

export enum BotPersona {
  FRIENDLY = 'friendly',
  PROFESSIONAL = 'professional',
  CONCISE = 'concise',
}

export class UpdateOrgBrandingRequest {
  @ApiPropertyOptional({
    example: '#3B82F6',
    description: 'Màu thương hiệu chính (hex color, e.g. #3B82F6)',
  })
  @IsHexColor()
  @IsOptional()
  brandColor?: string;

  @ApiPropertyOptional({
    example: 'ICCP Assistant',
    description: 'Tên hiển thị của chatbot trong widget',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  botName?: string;

  @ApiPropertyOptional({
    enum: BotPersona,
    example: BotPersona.FRIENDLY,
    description: 'Phong cách giao tiếp của bot: friendly | professional | concise',
  })
  @IsEnum(BotPersona)
  @IsOptional()
  botPersona?: BotPersona;
}
