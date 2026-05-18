import { Module } from '@nestjs/common';

import { MailerModule } from '@modules/mailer/mailer.module';

import { RequestAccessController } from './request-access.controller';
import { RequestAccessService } from './request-access.service';

@Module({
  imports: [MailerModule],
  controllers: [RequestAccessController],
  providers: [RequestAccessService],
})
export class RequestAccessModule {}
