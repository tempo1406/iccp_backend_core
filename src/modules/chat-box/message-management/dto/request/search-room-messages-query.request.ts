import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class SearchRoomMessagesQueryRequest {
  @ApiProperty({
    example: 'marketing plan',
    description: 'Tu khoa tim trong noi dung message cua room',
  })
  @IsString()
  q: string;

  @ApiPropertyOptional({
    description: 'So ket qua toi da tra ve moi lan',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description:
      'Cursor dang ISO datetime. Lay tiep cac message co sentAt nho hon cursor nay',
    example: '2026-03-18T03:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  cursor?: string;
}
