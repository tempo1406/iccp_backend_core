import { Module } from '@nestjs/common';
import { TicketRequestCoreModule } from '../core/core.module';
import { TicketRequestCcMemberService } from './cc-member.service';
import { TicketRequestCcMemberController } from './cc-member.controller';

@Module({
  imports: [TicketRequestCoreModule],
  controllers: [TicketRequestCcMemberController],
  providers: [TicketRequestCcMemberService],
})
export class TicketRequestCcMemberModule {}
