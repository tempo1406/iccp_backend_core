import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class GetMessageLinkPreviewQueryRequest {
  @ApiProperty({
    description: 'UUID room that contains the target message',
    example: '47e7a79a-20b7-4a4f-bfe2-122eaa8fee78',
  })
  @IsUUID('4')
  roomId: string;

  @ApiProperty({
    description: 'UUID target message to resolve preview metadata',
    example: '71f1cf08-e67c-4222-bfed-884848f2b137',
  })
  @IsUUID('4')
  messageId: string;
}
