import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export enum ChatReadStateMode {
  MARK_READ = 'mark_read',
  MARK_UNREAD = 'mark_unread',
}

export class UpdateReadStateRequest {
  @ApiPropertyOptional({
    enum: ChatReadStateMode,
    description:
      'mark_read (mac dinh): danh dau da doc. mark_unread: danh dau chua doc tu mot message.',
    example: ChatReadStateMode.MARK_READ,
  })
  @IsOptional()
  @IsEnum(ChatReadStateMode)
  mode?: ChatReadStateMode;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Tuy chon cho mode=mark_read. Danh dau da doc den message id nay trong cung room. Neu bo trong, he thong danh dau den message moi nhat hien tai.',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  @IsOptional()
  @IsUUID()
  lastReadMessageId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Bat buoc cho mode=mark_unread. Danh dau unread bat dau tu message id nay.',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  @IsOptional()
  @IsUUID()
  fromMessageId?: string;
}
