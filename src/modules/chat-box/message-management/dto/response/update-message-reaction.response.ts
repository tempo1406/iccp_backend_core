import { ApiProperty } from '@nestjs/swagger';
import { MessageReactionSummaryResponse } from './message-reaction-summary.response';

export class UpdateMessageReactionResponse extends MessageReactionSummaryResponse {
  @ApiProperty({
    example: true,
    description:
      'Giá trị true khi request này làm thay đổi trạng thái reaction (thêm/xóa). false khi không có thay đổi.',
  })
  updated: boolean;
}
