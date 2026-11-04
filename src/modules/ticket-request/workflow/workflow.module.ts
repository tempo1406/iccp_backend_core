import { Module } from '@nestjs/common';
import { TicketRequestCoreModule } from '../core/core.module';
import { TicketRequestWorkflowService } from './workflow.service';
import { TicketRequestWorkflowController } from './workflow.controller';

@Module({
  imports: [TicketRequestCoreModule],
  controllers: [TicketRequestWorkflowController],
  providers: [TicketRequestWorkflowService],
})
export class TicketRequestWorkflowModule {}
