import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class InviteMembersRequest {
  @ApiProperty({
    description: 'Danh sách email cần mời',
    example: ['user1@example.com', 'user2@example.com'],
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(50)
  @IsEmail({}, { each: true })
  emails: string[];

  @ApiPropertyOptional({
    description: 'Lời nhắn tùy chỉnh gửi kèm trong email mời',
    example: 'Dear team, welcome to our workspace. Please join before Friday.',
  })
  @Transform(({ value }) => {
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
  })
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  message?: string;
}
