import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsUUID,
} from 'class-validator';

function toUuidArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) =>
        typeof item === 'string' ? item.split(',') : [String(item)],
      )
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  return [];
}

export class ListMessageReactionsBatchQueryRequest {
  @ApiProperty({
    description:
      'Danh sach messageIds can lay reaction summary. Ho tro query repeat hoac comma-separated.',
    type: [String],
    example: [
      '2f4b1046-1280-4e8d-815f-59d51b7ebc2e',
      'fd4f66c6-9a07-4c49-bf90-d82a8a6f27fa',
    ],
  })
  @Transform(({ value }) => toUuidArray(value))
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  messageIds: string[];
}
