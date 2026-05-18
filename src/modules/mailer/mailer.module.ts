import { Module } from '@nestjs/common';
import { MailerService } from './mailer.service';

@Module({
  imports: [MailerModule],
  exports: [MailerService],
  providers: [MailerService],
})
export class MailerModule {}
