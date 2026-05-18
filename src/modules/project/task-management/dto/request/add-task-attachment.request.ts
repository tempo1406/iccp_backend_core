import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

export class AddTaskAttachmentRequest {
  @ApiProperty({ example: 'API Contract v1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName: string;

  @ApiProperty({ example: 'https://docs.google.com/document/d/xxxx/edit' })
  @IsUrl()
  fileUrl: string;

  @ApiPropertyOptional({ example: 'application/pdf' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  mimeType?: string;

  @ApiPropertyOptional({ example: 245760 })
  @IsOptional()
  @IsInt()
  @Min(0)
  fileSize?: number;
}
