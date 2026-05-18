import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationCoreService } from '@modules/notification/core/notification-core.service';
import { OrganizationMember } from '@modules/organization/core/entities/organization-member.entity';
import {
  PAYMENT_EVENTS,
  RenewalReminderEvent,
  SubscriptionExpiredEvent,
} from '@modules/payment/constants/payment-events.constant';

@Injectable()
export class BillingNotificationListener {
  private readonly logger = new Logger(BillingNotificationListener.name);

  constructor(
    private readonly notificationCoreService: NotificationCoreService,
    @InjectRepository(OrganizationMember)
    private readonly memberRepo: Repository<OrganizationMember>,
  ) {}

  @OnEvent(PAYMENT_EVENTS.RENEWAL_REMINDER)
  async handleRenewalReminder(event: RenewalReminderEvent): Promise<void> {
    const owners = await this.memberRepo.find({
      where: { organizationId: event.orgId, isOwner: true, isActive: true },
    });

    for (const owner of owners) {
      await this.notificationCoreService.send({
        userId: owner.userId,
        senderName: 'System',
        type: 'billing.renewal_reminder',
        title: `Gói "${event.planName}" sắp hết hạn`,
        message: `Gói cước "${event.planName}" của tổ chức sẽ hết hạn sau ${event.daysRemaining} ngày (${event.expiresAt}). Vui lòng gia hạn để tiếp tục sử dụng dịch vụ.`,
        idempotencyKey: `renewal:${owner.userId}:${event.orgId}:${event.expiresAt}:${event.daysRemaining}`,
        data: {
          module: 'billing',
          action: 'renewal_reminder',
          orgId: event.orgId,
          planName: event.planName,
          expiresAt: event.expiresAt,
          daysRemaining: event.daysRemaining,
        },
      });
    }

    if (owners.length > 0) {
      this.logger.log(
        `Sent renewal notification to ${owners.length} owner(s) of org ${event.orgId}`,
      );
    }
  }

  @OnEvent(PAYMENT_EVENTS.SUBSCRIPTION_EXPIRED)
  async handleSubscriptionExpired(
    event: SubscriptionExpiredEvent,
  ): Promise<void> {
    const owners = await this.memberRepo.find({
      where: { organizationId: event.orgId, isOwner: true, isActive: true },
    });

    const restoredText = event.restoredToFreePlan
      ? ' Tổ chức đã được chuyển về gói miễn phí.'
      : '';

    for (const owner of owners) {
      await this.notificationCoreService.send({
        userId: owner.userId,
        senderName: 'System',
        type: 'billing.subscription_expired',
        title: `Gói "${event.expiredPlanName}" đã hết hạn`,
        message: `Gói cước "${event.expiredPlanName}" của tổ chức đã hết hạn.${restoredText} Vui lòng nâng cấp để tiếp tục sử dụng đầy đủ dịch vụ.`,
        idempotencyKey: `expired:${owner.userId}:${event.orgId}:${event.expiredPlanName}:${event.restoredToFreePlan}`,
        data: {
          module: 'billing',
          action: 'subscription_expired',
          orgId: event.orgId,
          expiredPlanName: event.expiredPlanName,
          restoredToFreePlan: event.restoredToFreePlan,
        },
      });
    }

    if (owners.length > 0) {
      this.logger.log(
        `Sent subscription expired notification to ${owners.length} owner(s) of org ${event.orgId}`,
      );
    }
  }
}
