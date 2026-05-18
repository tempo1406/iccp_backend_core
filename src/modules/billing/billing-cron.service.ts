import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  Subscription,
  SubscriptionStatus,
} from './entities/subscription.entity';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import {
  PAYMENT_EVENTS,
  SubscriptionExpiredEvent,
} from '@modules/payment/constants/payment-events.constant';
import { OrganizationPlanSyncService } from './services/organization-plan-sync.service';

@Injectable()
export class BillingCronService {
  private readonly logger = new Logger(BillingCronService.name);

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
    @InjectRepository(SubscriptionPlan)
    private readonly planRepo: Repository<SubscriptionPlan>,
    private readonly eventEmitter: EventEmitter2,
    private readonly organizationPlanSyncService: OrganizationPlanSyncService,
  ) {}

  /** BullMQ processor calls this to expire subscriptions safely across instances. */
  async handleExpiredSubscriptions(): Promise<void> {
    // Find subscriptions about to expire (need org + plan info for notifications)
    const expiringSubs = await this.subscriptionRepo
      .createQueryBuilder('sub')
      .leftJoinAndMapOne(
        'sub.__plan',
        SubscriptionPlan,
        'plan',
        'plan.id = sub.plan_id',
      )
      .where('sub.status = :status', { status: SubscriptionStatus.ACTIVE })
      .andWhere('sub.end_date IS NOT NULL')
      .andWhere('sub.end_date < NOW()')
      .getMany();

    if (expiringSubs.length === 0) return;

    // Mark them as expired
    const ids = expiringSubs.map((s) => s.id);
    await this.subscriptionRepo
      .createQueryBuilder()
      .update(Subscription)
      .set({ status: SubscriptionStatus.EXPIRED })
      .where('id IN (:...ids)', { ids })
      .execute();

    this.logger.log(`Marked ${expiringSubs.length} subscriptions as expired`);

    // Restore free plan for each org and emit notification event
    const freePlan = await this.planRepo.findOne({
      where: { code: 'free', isActive: true },
    });

    for (const sub of expiringSubs) {
      const planName = (sub as any).__plan?.name ?? 'Unknown';

      let restoredToFreePlan = false;
      if (freePlan) {
        // Check no other active/trial/pending-payment subscription exists
        const hasActive = await this.subscriptionRepo.findOne({
          where: {
            organizationId: sub.organizationId,
            status: In([
              SubscriptionStatus.ACTIVE,
              SubscriptionStatus.TRIAL,
              SubscriptionStatus.PENDING_PAYMENT,
            ]),
          },
        });

        if (!hasActive) {
          const freeSub = this.subscriptionRepo.create({
            organizationId: sub.organizationId,
            planId: freePlan.id,
            status: SubscriptionStatus.ACTIVE,
            billingCycle: undefined,
            startDate: undefined,
            endDate: undefined,
          });
          await this.subscriptionRepo.save(freeSub);
          await this.organizationPlanSyncService.syncPlan(
            sub.organizationId,
            freePlan.id,
          );
          restoredToFreePlan = true;

          this.logger.log(`Restored free plan for org ${sub.organizationId}`);
        }
      }

      this.eventEmitter.emit(PAYMENT_EVENTS.SUBSCRIPTION_EXPIRED, {
        orgId: sub.organizationId,
        expiredPlanName: planName,
        restoredToFreePlan,
      } as SubscriptionExpiredEvent);
    }
  }

  /** BullMQ processor calls this to send renewal reminders. */
  async handleRenewalReminders(): Promise<void> {
    const subs = await this.subscriptionRepo
      .createQueryBuilder('sub')
      .where('sub.status = :status', { status: SubscriptionStatus.ACTIVE })
      .andWhere('sub.end_date IS NOT NULL')
      .andWhere("sub.end_date <= NOW() + INTERVAL '3 days'")
      .andWhere('sub.end_date > NOW()')
      .getMany();

    for (const sub of subs) {
      const plan = await this.planRepo.findOne({
        where: { id: sub.planId },
      });

      const endDate = new Date(sub.endDate!);
      const now = new Date();
      const daysRemaining = Math.ceil(
        (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      this.eventEmitter.emit(PAYMENT_EVENTS.RENEWAL_REMINDER, {
        orgId: sub.organizationId,
        planName: plan?.name ?? 'Unknown',
        expiresAt: sub.endDate!.toString(),
        daysRemaining,
      });
    }

    if (subs.length > 0) {
      this.logger.log(
        `Sent renewal reminders for ${subs.length} subscriptions`,
      );
    }
  }

  /** BullMQ processor calls this to cancel orphaned pending-payment subscriptions. */
  async handleOrphanedPendingPayments(): Promise<void> {
    const orphanedSubs = await this.subscriptionRepo
      .createQueryBuilder('sub')
      .where('sub.status = :status', {
        status: SubscriptionStatus.PENDING_PAYMENT,
      })
      .andWhere("sub.created_at < NOW() - INTERVAL '24 hours'")
      .getMany();

    if (!orphanedSubs.length) {
      return;
    }

    const ids = orphanedSubs.map((sub) => sub.id);
    await this.subscriptionRepo
      .createQueryBuilder()
      .update(Subscription)
      .set({ status: SubscriptionStatus.CANCELLED })
      .where('id IN (:...ids)', { ids })
      .execute();

    const freePlan = await this.planRepo.findOne({
      where: { code: 'free', isActive: true },
    });
    if (freePlan) {
      for (const sub of orphanedSubs) {
        const hasActive = await this.subscriptionRepo.findOne({
          where: {
            organizationId: sub.organizationId,
            status: In([
              SubscriptionStatus.ACTIVE,
              SubscriptionStatus.TRIAL,
              SubscriptionStatus.PENDING_PAYMENT,
            ]),
          },
        });

        if (hasActive) continue;

        const freeSub = this.subscriptionRepo.create({
          organizationId: sub.organizationId,
          planId: freePlan.id,
          status: SubscriptionStatus.ACTIVE,
          billingCycle: undefined,
          startDate: undefined,
          endDate: undefined,
        });
        await this.subscriptionRepo.save(freeSub);
        await this.organizationPlanSyncService.syncPlan(
          sub.organizationId,
          freePlan.id,
        );
      }
    }

    if (ids.length > 0) {
      this.logger.log(
        `Cancelled ${ids.length} orphaned pending-payment subscriptions`,
      );
    }
  }

  /** BullMQ processor calls this to expire trials and restore fallback plans. */
  async handleExpiredTrials(): Promise<void> {
    const expiringTrials = await this.subscriptionRepo
      .createQueryBuilder('sub')
      .leftJoinAndMapOne(
        'sub.__plan',
        SubscriptionPlan,
        'plan',
        'plan.id = sub.plan_id',
      )
      .where('sub.status = :status', { status: SubscriptionStatus.TRIAL })
      .andWhere('sub.trial_ends_at IS NOT NULL')
      .andWhere('sub.trial_ends_at < NOW()')
      .getMany();

    if (expiringTrials.length === 0) return;

    const ids = expiringTrials.map((s) => s.id);
    await this.subscriptionRepo
      .createQueryBuilder()
      .update(Subscription)
      .set({ status: SubscriptionStatus.EXPIRED })
      .where('id IN (:...ids)', { ids })
      .execute();

    this.logger.log(
      `Expired ${expiringTrials.length} free-trial subscriptions`,
    );

    const freePlan = await this.planRepo.findOne({
      where: { code: 'free', isActive: true },
    });

    for (const sub of expiringTrials) {
      const planName = (sub as any).__plan?.name ?? 'Unknown';

      let restoredToFreePlan = false;
      if (freePlan) {
        const hasActive = await this.subscriptionRepo.findOne({
          where: {
            organizationId: sub.organizationId,
            status: In([
              SubscriptionStatus.ACTIVE,
              SubscriptionStatus.TRIAL,
              SubscriptionStatus.PENDING_PAYMENT,
            ]),
          },
        });

        if (!hasActive) {
          const freeSub = this.subscriptionRepo.create({
            organizationId: sub.organizationId,
            planId: freePlan.id,
            status: SubscriptionStatus.ACTIVE,
            billingCycle: undefined,
            startDate: undefined,
            endDate: undefined,
          });
          await this.subscriptionRepo.save(freeSub);
          await this.organizationPlanSyncService.syncPlan(
            sub.organizationId,
            freePlan.id,
          );
          restoredToFreePlan = true;

          this.logger.log(
            `Restored free plan for org ${sub.organizationId} after trial expired`,
          );
        }
      }

      this.eventEmitter.emit(PAYMENT_EVENTS.SUBSCRIPTION_EXPIRED, {
        orgId: sub.organizationId,
        expiredPlanName: planName,
        restoredToFreePlan,
      } as SubscriptionExpiredEvent);
    }
  }
}
