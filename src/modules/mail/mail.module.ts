import { Module } from '@nestjs/common';
import { MaillerService } from './mail.service';
import { MaillerController } from './mail.controller';
import { MailerModule } from '@modules/mailer/mailer.module';

@Module({
  imports: [MailerModule],
  controllers: [MaillerController],
  providers: [MaillerService],
  exports: [MaillerService],
})
export class MaillerModule {}
