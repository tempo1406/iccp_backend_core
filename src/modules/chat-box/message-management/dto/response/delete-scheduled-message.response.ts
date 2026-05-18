import { ApiProperty } from '@nestjs/swagger';

export class DeleteScheduledMessageResponse {
  @ApiProperty({ example: '936af9ba-c2ca-4a89-9bf4-2f4b789ddf9f' })
  scheduledMessageId: string;

  @ApiProperty({ example: true })
  deleted: boolean;
}
