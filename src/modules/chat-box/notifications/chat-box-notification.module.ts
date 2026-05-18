import { ChatMessageMention } from '@modules/chat-box/message-management/entities/message-mention.entity';
import { ChatMessage } from '@modules/chat-box/message-management/entities/message.entity';
import { ChatUserPresence } from '@modules/chat-box/presence/entities/user-presence.entity';
import { ChatRoomMember } from '@modules/chat-box/room-management/entities/room-member.entity';
import { ChatRoom } from '@modules/chat-box/room-management/entities/room.entity';
import { NotificationModule } from '@modules/notification/notification.module';
import { OrganizationMember } from '@modules/organization/core/entities/organization-member.entity';
import { User } from '@modules/users/entities/user.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatBoxNotificationListener } from './chat-box-notification.listener';

@Module({
  imports: [
    NotificationModule,
    TypeOrmModule.forFeature([
      ChatRoom,
      ChatRoomMember,
      ChatMessage,
      ChatMessageMention,
      ChatUserPresence,
      OrganizationMember,
      User,
    ]),
  ],
  providers: [ChatBoxNotificationListener],
})
export class ChatBoxNotificationModule {}
