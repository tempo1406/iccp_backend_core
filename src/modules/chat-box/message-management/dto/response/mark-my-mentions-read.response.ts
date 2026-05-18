import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MarkMyMentionsReadResponse {
  @ApiProperty({ example: 3 })
  updatedCount: number;

  @ApiPropertyOptional({
    example: '2a14ea23-ce41-44be-825b-8bb8891716d1',
    nullable: true,
  })
  roomId?: string;
}
