import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailerModule } from '@modules/mailer/mailer.module';
import { NotificationCoreModule } from '@modules/notification/core/notification-core.module';
import { Organization } from '../core/entities/organization.entity';

import { OrganizationLandingPage } from './entities/organization-landing-page.entity';
import { OrganizationLandingPageDraft } from './entities/organization-landing-page-draft.entity';
import { OrganizationLandingPageLead } from './entities/organization-landing-page-lead.entity';
import { OrganizationLandingPageTemplate } from './entities/organization-landing-page-template.entity';
import { LandingPageService } from './landing-page.service';
import { LandingPageController } from './landing-page.controller';

@Module({
  imports: [
    MailerModule,
    NotificationCoreModule,
    TypeOrmModule.forFeature([
      Organization,
      OrganizationLandingPage,
      OrganizationLandingPageDraft,
      OrganizationLandingPageLead,
      OrganizationLandingPageTemplate,
    ]),
  ],
  controllers: [LandingPageController],
  providers: [LandingPageService],
})
export class LandingPageModule {}
