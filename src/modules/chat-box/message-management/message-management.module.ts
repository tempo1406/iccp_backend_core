import { ChatBoxCoreModule } from '@modules/chat-box/core/chat-box-core.module';
import { ChatLinkPreviewModule } from '@modules/chat-box/link-preview/chat-link-preview.module';
import { Module } from '@nestjs/common';
import { MessageManagementController } from './message-management.controller';
import { MessageManagementService } from './message-management.service';

@Module({
  imports: [ChatBoxCoreModule, ChatLinkPreviewModule],
  controllers: [MessageManagementController],
  providers: [MessageManagementService],
  exports: [MessageManagementService],
})
export class MessageManagementModule {}
