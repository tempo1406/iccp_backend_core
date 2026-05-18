import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class MarkMyMentionsReadRequest {
  @ApiPropertyOptional({
    description:
      'Nếu truyền roomId thì chỉ đánh dấu đã đọc mentions trong room đó; nếu bỏ trống thì đánh dấu toàn bộ mentions trong organization.',
    example: '2a14ea23-ce41-44be-825b-8bb8891716d1',
  })
  @IsOptional()
  @IsUUID()
  roomId?: string;
}
