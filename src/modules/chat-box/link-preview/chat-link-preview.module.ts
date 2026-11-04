import { CustomCacheModule } from '@modules/cache/cache.module';
import { ChatMessage } from '@modules/chat-box/message-management/entities/message.entity';
import { ImagekitModule } from '@modules/imagekit/imagekit.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatLinkPreviewService } from './chat-link-preview.service';

@Module({
  imports: [
    CustomCacheModule,
    ImagekitModule,
    TypeOrmModule.forFeature([ChatMessage]),
  ],
  providers: [ChatLinkPreviewService],
  exports: [ChatLinkPreviewService],
})
export class ChatLinkPreviewModule {}
