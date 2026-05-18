import { Module } from '@nestjs/common';
import { OrganizationCoreModule } from './core/organization-core.module';
import { RoleManageModule } from './role-manage/role-manage.module';
import { MemberManageModule } from './member-manage/member-manage.module';
import { InviteManagerModule } from './invite-manager/invite-manager.module';
import { OrgNotificationModule } from './org-notification/org-notification.module';
import { WorkingTimeModule } from './working-time/working-time.module';
import { OrgSettingsModule } from './settings/org-settings.module';
import { OrgProfileModule } from './org-profile/org-profile.module';
import { LandingPageModule } from './landing-page/landing-page.module';

@Module({
  imports: [
    OrganizationCoreModule,
    RoleManageModule,
    MemberManageModule,
    InviteManagerModule,
    OrgNotificationModule,
    WorkingTimeModule,
    OrgSettingsModule,
    OrgProfileModule,
    LandingPageModule,
  ],
})
export class OrganizationModule {}
