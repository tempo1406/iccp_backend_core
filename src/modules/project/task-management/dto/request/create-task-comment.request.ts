import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateTaskCommentRequest {
  @ApiProperty({ example: '@member@iccp.com Vui long review API contract moi.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  content: string;

  @ApiPropertyOptional({
    example: '6f3d0f0e-7b9f-4f50-9a67-209a6394df92',
    description: 'Comment cha nếu muốn trả lời (reply).',
  })
  @IsOptional()
  @IsUUID('4')
  parentCommentId?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['4b6f223b-2e53-4698-aa8e-6570f6cb2f60'],
    description:
      'Danh sach userId duoc mention. Neu bo trong, he thong se thu parse mention email tu content.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID('4', { each: true })
  mentionUserIds?: string[];
}
