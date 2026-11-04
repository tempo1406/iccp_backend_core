import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class ForwardMessageRequest {
  @ApiProperty({
    type: [String],
    example: [
      '2a14ea23-ce41-44be-825b-8bb8891716d1',
      '47e7a79a-20b7-4a4f-bfe2-122eaa8fee78',
    ],
    description: 'Danh sach room dich can forward message den',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  targetRoomIds: string[];

  @ApiPropertyOptional({
    example: 'Chuyen tiep cho team tham khao',
    description: 'Ghi chu bo sung truoc noi dung message goc',
  })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  note?: string;

  @ApiPropertyOptional({
    example: 'forward-1736154452000',
    description:
      'Prefix idempotency key. Backend se ghep voi targetRoomId de tao clientMessageId moi room',
  })
  @IsOptional()
  @IsString()
  @MaxLength(90)
  clientMessageIdPrefix?: string;
}
