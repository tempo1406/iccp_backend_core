import { ChatBoxCoreModule } from '@modules/chat-box/core/chat-box-core.module';
import { ChatLinkPreviewModule } from '@modules/chat-box/link-preview/chat-link-preview.module';
import { MessageManagementModule } from '@modules/chat-box/message-management/message-management.module';
import { ChatBoxNotificationModule } from '@modules/chat-box/notifications/chat-box-notification.module';
import { PresenceModule } from '@modules/chat-box/presence/presence.module';
import { ChatBoxRealtimeModule } from '@modules/chat-box/realtime/chat-box-realtime.module';
import { RoomManagementModule } from '@modules/chat-box/room-management/room-management.module';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    ChatBoxCoreModule,
    ChatLinkPreviewModule,
    RoomManagementModule,
    MessageManagementModule,
    PresenceModule,
    ChatBoxRealtimeModule,
    ChatBoxNotificationModule,
  ],
})
export class ChatBoxModule {}
