import { Module } from '@nestjs/common';
import { TicketRequestCoreModule } from './core/core.module';
import { TicketRequestWorkflowModule } from './workflow/workflow.module';
import { TicketRequestCommentModule } from './comment/comment.module';
import { TicketRequestCcMemberModule } from './cc-member/cc-member.module';

@Module({
  imports: [
    TicketRequestCoreModule,
    TicketRequestWorkflowModule,
    TicketRequestCommentModule,
    TicketRequestCcMemberModule,
  ],
})
export class TicketRequestModule {}
