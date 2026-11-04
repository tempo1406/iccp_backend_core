import { Module } from '@nestjs/common';
import { TicketRequestCoreModule } from '../core/core.module';
import { TicketRequestCommentService } from './comment.service';
import { TicketRequestCommentController } from './comment.controller';

@Module({
  imports: [TicketRequestCoreModule],
  controllers: [TicketRequestCommentController],
  providers: [TicketRequestCommentService],
})
export class TicketRequestCommentModule {}
