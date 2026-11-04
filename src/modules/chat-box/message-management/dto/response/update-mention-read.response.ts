import { ApiProperty } from '@nestjs/swagger';
import { MentionResponse } from './mention.response';

export class UpdateMentionReadResponse {
  @ApiProperty({
    example: true,
    description:
      'Giá trị true khi trạng thái đã đọc của mention thay đổi trong request này',
  })
  updated: boolean;

  @ApiProperty({ type: MentionResponse })
  mention: MentionResponse;
}
