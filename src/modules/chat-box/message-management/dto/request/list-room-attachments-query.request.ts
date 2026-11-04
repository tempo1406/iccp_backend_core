import { PaginationRequest } from '@common/dto/pagination.request';
import { ChatAttachmentType } from '@modules/chat-box/message-management/entities/message-attachment.entity';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ListRoomAttachmentsQueryRequest extends PaginationRequest {
  @ApiPropertyOptional({
    enum: ChatAttachmentType,
    description:
      'Loc theo loai attachment: file/image/video/audio. Bo trong de lay tat ca.',
  })
  @IsOptional()
  @IsEnum(ChatAttachmentType)
  type?: ChatAttachmentType;

  @ApiPropertyOptional({
    example: 'report',
    description: 'Tim theo ten file hoac noi dung message',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
