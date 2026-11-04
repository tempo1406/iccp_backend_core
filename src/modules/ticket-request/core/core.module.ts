import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationCoreModule } from '@modules/organization/core/organization-core.module';
import { ProjectCoreModule } from '@modules/project/core/project-core.module';
import { MaillerModule } from '@modules/mail/mail.module';
import { NotificationCoreModule } from '@modules/notification/core/notification-core.module';
import { WebsocketModule } from '@modules/websocket/websocket.module';
import { TicketRequest } from './entities/ticket-request.entity';
import { TicketRequestCcMember } from './entities/ticket-request-cc-member.entity';
import { TicketRequestComment } from './entities/ticket-request-comment.entity';
import { TicketRequestActivity } from './entities/ticket-request-activity.entity';
import { OrganizationMember } from '@modules/organization/core/entities/organization-member.entity';
import { User } from '@modules/users/entities/user.entity';
import { TicketRequestCoreService } from './core.service';
import { TicketRequestCoreController } from './core.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TicketRequest,
      TicketRequestCcMember,
      TicketRequestComment,
      TicketRequestActivity,
      OrganizationMember,
      User,
    ]),
    OrganizationCoreModule,
    MaillerModule,
    NotificationCoreModule,
    WebsocketModule,
    ProjectCoreModule,
  ],
  controllers: [TicketRequestCoreController],
  providers: [TicketRequestCoreService],
  exports: [TicketRequestCoreService, TypeOrmModule],
})
export class TicketRequestCoreModule {}
