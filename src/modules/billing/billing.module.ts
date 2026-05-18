import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingService } from './billing.service';
import { BillingCronService } from './billing-cron.service';
import { BillingNotificationListener } from './listeners/billing-notification.listener';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { Subscription } from './entities/subscription.entity';
import { Invoice } from './entities/invoice.entity';
import { BillingController } from './billing.controller';
import { NotificationCoreModule } from '@modules/notification/core/notification-core.module';
import { OrganizationMember } from '@modules/organization/core/entities/organization-member.entity';
import { Organization } from '@modules/organization/core/entities/organization.entity';
import { OrganizationPlanSyncService } from './services/organization-plan-sync.service';
import { CustomCacheModule } from '@modules/cache/cache.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SubscriptionPlan,
      Subscription,
      Invoice,
      OrganizationMember,
      Organization,
    ]),
    CustomCacheModule,
    NotificationCoreModule,
  ],
  controllers: [BillingController],
  providers: [
    BillingService,
    BillingCronService,
    BillingNotificationListener,
    OrganizationPlanSyncService,
  ],
  exports: [BillingService, OrganizationPlanSyncService, BillingCronService],
})
export class BillingModule {}
