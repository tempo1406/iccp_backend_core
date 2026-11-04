import { ChatNotifyLevel } from '@modules/chat-box/room-management/entities/room-member.entity';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';

export class UpdateMyRoomNotifySettingsRequest {
  @ApiPropertyOptional({
    enum: ChatNotifyLevel,
    description:
      'Mức nhận thông báo trong room: all (tất cả), mentions (chỉ mention), mute (tắt thông báo).',
    example: ChatNotifyLevel.MENTIONS,
  })
  @IsOptional()
  @IsEnum(ChatNotifyLevel)
  notifyLevel?: ChatNotifyLevel;

  @ApiPropertyOptional({
    description:
      'Thời điểm kết thúc mute theo ISO datetime. Chỉ áp dụng khi notifyLevel = mute. Nếu bỏ trống thì mute vô thời hạn.',
    example: '2026-03-16T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  muteUntil?: string;
}
