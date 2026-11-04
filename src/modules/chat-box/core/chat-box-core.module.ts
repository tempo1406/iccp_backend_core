import { CustomCacheModule } from '@modules/cache/cache.module';
import { ChatScopeAccessPolicyService } from '@modules/chat-box/policies/chat-scope-access-policy.service';
import { ChatLinkPreviewModule } from '@modules/chat-box/link-preview/chat-link-preview.module';
import { ChatMessageAttachment } from '@modules/chat-box/message-management/entities/message-attachment.entity';
import { ChatMessageDraft } from '@modules/chat-box/message-management/entities/message-draft.entity';
import { ChatMessageMention } from '@modules/chat-box/message-management/entities/message-mention.entity';
import { ChatMessagePin } from '@modules/chat-box/message-management/entities/message-pin.entity';
import { ChatMessageReaction } from '@modules/chat-box/message-management/entities/message-reaction.entity';
import { ChatMessage } from '@modules/chat-box/message-management/entities/message.entity';
import { ChatReadState } from '@modules/chat-box/message-management/entities/read-state.entity';
import { ChatScheduledMessage } from '@modules/chat-box/message-management/entities/scheduled-message.entity';
import { ChatUserPresence } from '@modules/chat-box/presence/entities/user-presence.entity';
import { ChatRoomInvitation } from '@modules/chat-box/room-management/entities/room-invitation.entity';
import { ChatRoomMember } from '@modules/chat-box/room-management/entities/room-member.entity';
import { ChatRoomTabConfig } from '@modules/chat-box/room-management/entities/room-tab-config.entity';
import { ChatRoom } from '@modules/chat-box/room-management/entities/room.entity';
import { ImagekitModule } from '@modules/imagekit/imagekit.module';
import { NotificationModule } from '@modules/notification/notification.module';
import { OrganizationMember } from '@modules/organization/core/entities/organization-member.entity';
import { Organization } from '@modules/organization/core/entities/organization.entity';
import { ProjectCoreModule } from '@modules/project/core/project-core.module';
import { ProjectMember } from '@modules/project/core/entities/project-member.entity';
import { Project } from '@modules/project/core/entities/project.entity';
import { User } from '@modules/users/entities/user.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatBootstrapListener } from '@modules/chat-box/bootstrap/chat-bootstrap.listener';
import { ChatBootstrapRoomService } from '@modules/chat-box/bootstrap/chat-bootstrap-room.service';
import { ChatBackgroundQueueService } from '@modules/chat-box/workers/chat-background-queue.service';
import { ChatBoxCoreService } from './chat-box-core.service';

@Module({
  imports: [
    CustomCacheModule,
    ImagekitModule,
    NotificationModule,
    ChatLinkPreviewModule,
    ProjectCoreModule,
    TypeOrmModule.forFeature([
      ChatRoom,
      ChatRoomTabConfig,
      ChatRoomMember,
      ChatRoomInvitation,
      ChatMessage,
      ChatMessageAttachment,
      ChatMessageDraft,
      ChatMessageReaction,
      ChatMessageMention,
      ChatMessagePin,
      ChatReadState,
      ChatScheduledMessage,
      ChatUserPresence,
      Organization,
      OrganizationMember,
      Project,
      ProjectMember,
      User,
    ]),
  ],
  providers: [
    ChatBoxCoreService,
    ChatBackgroundQueueService,
    ChatScopeAccessPolicyService,
    ChatBootstrapRoomService,
    ChatBootstrapListener,
  ],
  exports: [
    ChatBoxCoreService,
    ChatScopeAccessPolicyService,
    ChatBootstrapRoomService,
  ],
})
export class ChatBoxCoreModule {}
