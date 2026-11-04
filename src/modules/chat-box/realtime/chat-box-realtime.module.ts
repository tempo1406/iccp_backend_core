import { ChatBoxCoreModule } from '@modules/chat-box/core/chat-box-core.module';
import { PresenceModule } from '@modules/chat-box/presence/presence.module';
import { ChatRoomMember } from '@modules/chat-box/room-management/entities/room-member.entity';
import { CustomCacheModule } from '@modules/cache/cache.module';
import { OrganizationMember } from '@modules/organization/core/entities/organization-member.entity';
import { WebsocketModule } from '@modules/websocket/websocket.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatBoxWsListener } from './chat-box-ws.listener';
import { ChatBoxGateway } from './chat-box.gateway';

@Module({
  imports: [
    CustomCacheModule,
    WebsocketModule,
    ChatBoxCoreModule,
    PresenceModule,
    TypeOrmModule.forFeature([ChatRoomMember, OrganizationMember]),
  ],
  providers: [ChatBoxGateway, ChatBoxWsListener],
})
export class ChatBoxRealtimeModule {}
