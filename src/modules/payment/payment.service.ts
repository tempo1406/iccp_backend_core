import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { plainToInstance } from 'class-transformer';
import { Transactional } from 'typeorm-transactional';
import {
  PaymentTransaction,
  PaymentTransactionStatus,
} from './entities/payment-transaction.entity';
import {
  Invoice,
  InvoiceStatus,
} from '@modules/billing/entities/invoice.entity';
import {
  Subscription,
  SubscriptionStatus,
} from '@modules/billing/entities/subscription.entity';
import { SubscriptionPlan } from '@modules/billing/entities/subscription-plan.entity';
import { PayosClient } from './clients/payos.client';
import { PayosConfig } from './configs/payos.config';
import {
  CreatePaymentLinkRequest,
  BillingCycle,
} from './dto/request/create-payment-link.request';
import { ChangePlanRequest } from './dto/request/change-plan.request';
import {
  QueryTransactionRequest,
  TRANSACTION_SORT_FIELDS,
} from './dto/request/query-transaction.request';
import { PaymentLinkResponse } from './dto/response/payment-link.response';
import { PaymentStatusResponse } from './dto/response/payment-status.response';
import { PaymentTransactionResponse } from './dto/response/payment-transaction.response';
import { PaginatedResponse } from '@common/dto/paginated.response';
import { PaginationHelper } from '@common/helpers/pagination.helper';
import { OrganizationPlanSyncService } from '@modules/billing/services/organization-plan-sync.service';
import { PAYMENT_EVENTS } from './constants/payment-events.constant';
import type { Webhook } from '@payos/node';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(PaymentTransaction)
    private readonly transactionRepo: Repository<PaymentTransaction>,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
    @InjectRepository(SubscriptionPlan)
    private readonly planRepo: Repository<SubscriptionPlan>,
    private readonly payosClient: PayosClient,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly organizationPlanSyncService: OrganizationPlanSyncService,
  ) {}

  // ========================
  // Org-facing
  // ========================

  @Transactional()
  async createPaymentLink(
    dto: CreatePaymentLinkRequest,
    orgId: string,
  ): Promise<PaymentLinkResponse> {
    const plan = await this.planRepo.findOne({
      where: { id: dto.planId, isActive: true },
    });
    if (!plan) {
      throw new NotFoundException('Plan not found or inactive');
    }

    const amount =
      dto.billingCycle === BillingCycle.MONTHLY
        ? Number(plan.priceMonthly)
        : Number(plan.priceYearly);

    if (amount <= 0) {
      throw new BadRequestException('Cannot create payment for a free plan');
    }

    // Check duplicate: org must not have another current paid subscription lifecycle.
    const existingSub = await this.subscriptionRepo.findOne({
      where: {
        organizationId: orgId,
        status: In([
          SubscriptionStatus.ACTIVE,
          SubscriptionStatus.TRIAL,
          SubscriptionStatus.PENDING_PAYMENT,
        ]),
      },
    });
    if (existingSub) {
      const existingPlan = await this.planRepo.findOne({
        where: { id: existingSub.planId },
      });

      if (existingPlan?.code === 'free') {
        existingSub.status = SubscriptionStatus.CANCELLED;
        await this.subscriptionRepo.save(existingSub);
      } else {
        throw new ConflictException(
          'Organization already has an active subscription. Cancel it before purchasing a new plan.',
        );
      }
    }

    const orderCode = Number(
      `${Date.now()}${Math.floor(Math.random() * 100)}`.slice(-9),
    );

    // Create subscription
    const now = new Date();
    const endDate = new Date(now);
    if (dto.billingCycle === BillingCycle.MONTHLY) {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    const hasTrial = plan.trialDays > 0;
    const trialEndsAt = hasTrial
      ? new Date(now.getTime() + plan.trialDays * 24 * 60 * 60 * 1000)
      : undefined;

    const subscription = this.subscriptionRepo.create({
      organizationId: orgId,
      planId: dto.planId,
      status: hasTrial
        ? SubscriptionStatus.TRIAL
        : SubscriptionStatus.PENDING_PAYMENT,
      billingCycle: dto.billingCycle,
      startDate: now,
      endDate,
      trialEndsAt,
    });
    const savedSubscription = await this.subscriptionRepo.save(subscription);

    if (hasTrial) {
      await this.organizationPlanSyncService.syncPlan(orgId, savedSubscription.planId);
    }

    // Create invoice
    const invoiceNumber = `INV-${Date.now()}`;
    const invoice = this.invoiceRepo.create({
      organizationId: orgId,
      subscriptionId: savedSubscription.id,
      invoiceNumber,
      amount,
      taxAmount: 0,
      totalAmount: amount,
      currency: 'VND',
      status: InvoiceStatus.PENDING,
      issueDate: now,
      dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });
    const savedInvoice = await this.invoiceRepo.save(invoice);

    // Create transaction record
    const transaction = this.transactionRepo.create({
      organizationId: orgId,
      subscriptionId: savedSubscription.id,
      invoiceId: savedInvoice.id,
      orderCode,
      amount,
      currency: 'VND',
      description: `Thanh toan goi ${plan.name} - ${dto.billingCycle}`,
      status: PaymentTransactionStatus.PENDING,
    });
    const savedTransaction = await this.transactionRepo.save(transaction);

    // Call PayOS
    const payosConfig = this.configService.get<PayosConfig>('payos')!;
    const payosResult = await this.payosClient.createPaymentLink({
      orderCode,
      amount,
      description: `${plan.name} - ${dto.billingCycle}`,
      returnUrl: payosConfig.returnUrl,
      cancelUrl: payosConfig.cancelUrl,
      items: [
        {
          name: `Goi ${plan.name} (${dto.billingCycle})`,
          quantity: 1,
          price: amount,
        },
      ],
    });

    // Update transaction with PayOS response
    savedTransaction.checkoutUrl = payosResult.checkoutUrl;
    savedTransaction.payosResponse = payosResult;
    await this.transactionRepo.save(savedTransaction);

    return plainToInstance(PaymentLinkResponse, {
      checkoutUrl: payosResult.checkoutUrl,
      orderCode: payosResult.orderCode,
      amount: payosResult.amount,
      transactionId: savedTransaction.id,
    });
  }

  @Transactional()
  async changePlan(
    dto: ChangePlanRequest,
    orgId: string,
  ): Promise<PaymentLinkResponse> {
    // Cancel current active/trial/pending-payment subscription first
    const existingSub = await this.subscriptionRepo.findOne({
      where: {
        organizationId: orgId,
        status: In([
          SubscriptionStatus.ACTIVE,
          SubscriptionStatus.TRIAL,
          SubscriptionStatus.PENDING_PAYMENT,
        ]),
      },
    });
    if (existingSub) {
      existingSub.status = SubscriptionStatus.CANCELLED;
      await this.subscriptionRepo.save(existingSub);
    }

    // Create payment link for the new plan
    return this.createPaymentLink(
      { planId: dto.planId, billingCycle: dto.billingCycle },
      orgId,
    );
  }

  async getPaymentStatus(
    orderCode: number,
    orgId: string,
  ): Promise<PaymentStatusResponse> {
    await this.verifyTransactionOwnership(orderCode, orgId);

    const paymentInfo = await this.payosClient.getPaymentStatus(orderCode);

    return plainToInstance(PaymentStatusResponse, {
      orderCode: paymentInfo.orderCode,
      status: paymentInfo.status,
      amount: paymentInfo.amount,
      amountPaid: paymentInfo.amountPaid,
      amountRemaining: paymentInfo.amountRemaining,
      createdAt: paymentInfo.createdAt,
      transactions: paymentInfo.transactions,
    });
  }

  @Transactional()
  async confirmPayment(
    orderCode: number,
    orgId: string,
  ): Promise<PaymentStatusResponse> {
    const transaction = await this.verifyTransactionOwnership(orderCode, orgId);
    const paymentInfo = await this.payosClient.getPaymentStatus(orderCode);

    // Only sync if local status is still PENDING
    if (
      transaction.status === PaymentTransactionStatus.PENDING &&
      paymentInfo.status === 'PAID'
    ) {
      transaction.status = PaymentTransactionStatus.PAID;
      transaction.payosResponse = paymentInfo;
      await this.transactionRepo.save(transaction);

      if (transaction.invoiceId) {
        await this.invoiceRepo.update(transaction.invoiceId, {
          status: InvoiceStatus.PAID,
          paidAt: new Date(),
          paymentMethod: 'payos',
          paymentReference:
            paymentInfo.transactions?.[0]?.reference ?? String(orderCode),
        });
      }
      const plan = await this.activateSubscriptionAndGetPlan(
        transaction.subscriptionId,
      );

      this.eventEmitter.emit(PAYMENT_EVENTS.SUCCESS, {
        orgId: transaction.organizationId,
        planName: plan?.name ?? 'Unknown',
        amount: Number(transaction.amount),
        currency: transaction.currency,
        transactionId: transaction.id,
      });
    } else if (
      transaction.status === PaymentTransactionStatus.PENDING &&
      paymentInfo.status === 'CANCELLED'
    ) {
      transaction.status = PaymentTransactionStatus.CANCELLED;
      transaction.payosResponse = paymentInfo;
      await this.transactionRepo.save(transaction);

      if (transaction.invoiceId) {
        await this.invoiceRepo.update(transaction.invoiceId, {
          status: InvoiceStatus.CANCELLED,
        });
      }

      // Cleanup: cancel the orphaned subscription
      if (transaction.subscriptionId) {
        await this.subscriptionRepo.update(transaction.subscriptionId, {
          status: SubscriptionStatus.CANCELLED,
        });
      }

      // Restore free plan if org has no remaining active subscription
      await this.restoreFreePlan(transaction.organizationId);
    }

    return plainToInstance(PaymentStatusResponse, {
      orderCode: paymentInfo.orderCode,
      status: paymentInfo.status,
      amount: paymentInfo.amount,
      amountPaid: paymentInfo.amountPaid,
      amountRemaining: paymentInfo.amountRemaining,
      createdAt: paymentInfo.createdAt,
      transactions: paymentInfo.transactions,
    });
  }

  @Transactional()
  async cancelPayment(orderCode: number, orgId: string): Promise<void> {
    const transaction = await this.verifyTransactionOwnership(orderCode, orgId);

    if (transaction.status !== PaymentTransactionStatus.PENDING) {
      throw new BadRequestException(
        'Only pending transactions can be cancelled',
      );
    }

    await this.payosClient.cancelPayment(orderCode, 'Cancelled by user');

    transaction.status = PaymentTransactionStatus.CANCELLED;
    await this.transactionRepo.save(transaction);

    if (transaction.invoiceId) {
      await this.invoiceRepo.update(transaction.invoiceId, {
        status: InvoiceStatus.CANCELLED,
      });
    }

    // Cleanup: cancel the subscription that was waiting for payment
    if (transaction.subscriptionId) {
      await this.subscriptionRepo.update(transaction.subscriptionId, {
        status: SubscriptionStatus.CANCELLED,
      });
    }

    // Restore free plan if org has no remaining active subscription
    await this.restoreFreePlan(orgId);
  }

  // ========================
  // Webhook (public)
  // ========================

  @Transactional()
  async handleWebhook(webhookBody: Webhook): Promise<void> {
    let webhookData;
    try {
      webhookData = await this.payosClient.verifyWebhookData(webhookBody);
    } catch {
      throw new ForbiddenException('Invalid webhook signature');
    }

    const transaction = await this.transactionRepo.findOne({
      where: { orderCode: webhookData.orderCode },
    });
    if (!transaction) {
      this.logger.warn(
        `Transaction not found for orderCode: ${webhookData.orderCode}`,
      );
      return;
    }

    const isSuccess = webhookData.code === '00' && webhookBody.success === true;

    if (isSuccess) {
      // Update transaction
      transaction.status = PaymentTransactionStatus.PAID;
      transaction.payosResponse = webhookData;
      await this.transactionRepo.save(transaction);

      // Update invoice
      if (transaction.invoiceId) {
        await this.invoiceRepo.update(transaction.invoiceId, {
          status: InvoiceStatus.PAID,
          paidAt: new Date(),
          paymentMethod: 'payos',
          paymentReference: webhookData.reference,
        });
      }
      // Update subscription
      const plan = await this.activateSubscriptionAndGetPlan(
        transaction.subscriptionId,
      );

      this.eventEmitter.emit(PAYMENT_EVENTS.SUCCESS, {
        orgId: transaction.organizationId,
        planName: plan?.name ?? 'Unknown',
        amount: Number(transaction.amount),
        currency: transaction.currency,
        transactionId: transaction.id,
      });
    } else {
      transaction.status = PaymentTransactionStatus.FAILED;
      transaction.payosResponse = webhookData;
      await this.transactionRepo.save(transaction);

      if (transaction.invoiceId) {
        await this.invoiceRepo.update(transaction.invoiceId, {
          status: InvoiceStatus.CANCELLED,
        });
      }

      // Cleanup: cancel the subscription on payment failure
      if (transaction.subscriptionId) {
        await this.subscriptionRepo.update(transaction.subscriptionId, {
          status: SubscriptionStatus.CANCELLED,
        });
      }

      const plan = transaction.subscriptionId
        ? await this.getPlanBySubscriptionId(transaction.subscriptionId)
        : null;

      this.eventEmitter.emit(PAYMENT_EVENTS.FAILED, {
        orgId: transaction.organizationId,
        planName: plan?.name ?? 'Unknown',
        amount: Number(transaction.amount),
        currency: transaction.currency,
        reason: webhookData.desc,
      });

      // Restore free plan if org has no remaining active subscription
      await this.restoreFreePlan(transaction.organizationId);
    }
  }

  // ========================
  // Admin-only
  // ========================

  async confirmWebhookUrl(webhookUrl: string): Promise<any> {
    return this.payosClient.confirmWebhookUrl(webhookUrl);
  }

  async getTransactions(
    query: QueryTransactionRequest,
  ): Promise<PaginatedResponse<PaymentTransactionResponse>> {
    const qb = this.transactionRepo.createQueryBuilder('tx');

    if (query.status) {
      qb.andWhere('tx.status = :status', { status: query.status });
    }

    if (query.organizationId) {
      qb.andWhere('tx.organization_id = :orgId', {
        orgId: query.organizationId,
      });
    }

    PaginationHelper.applyToQueryBuilder(
      qb,
      query,
      TRANSACTION_SORT_FIELDS,
      'tx',
    );

    const [items, total] = await qb.getManyAndCount();
    const meta = PaginationHelper.buildMeta(total, query);

    return new PaginatedResponse(
      plainToInstance(PaymentTransactionResponse, items),
      meta,
    );
  }

  // ========================
  // Private helpers
  // ========================

  private async verifyTransactionOwnership(
    orderCode: number,
    orgId: string,
  ): Promise<PaymentTransaction> {
    const transaction = await this.transactionRepo.findOne({
      where: { orderCode },
    });
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }
    if (transaction.organizationId !== orgId) {
      throw new ForbiddenException(
        'Transaction does not belong to this organization',
      );
    }
    return transaction;
  }

  private async getPlanBySubscriptionId(
    subscriptionId: string,
  ): Promise<SubscriptionPlan | null> {
    const subscription = await this.subscriptionRepo.findOne({
      where: { id: subscriptionId },
    });
    if (!subscription) return null;

    return this.planRepo.findOne({ where: { id: subscription.planId } });
  }

  private buildActivationDates(
    subscription: Subscription,
  ): Pick<Subscription, 'startDate' | 'endDate'> | null {
    if (!subscription.billingCycle) {
      return null;
    }

    const startDate = subscription.trialEndsAt
      ? new Date(subscription.trialEndsAt)
      : new Date();
    const endDate = new Date(startDate);

    if (subscription.billingCycle === BillingCycle.MONTHLY) {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    return { startDate, endDate };
  }

  private async activateSubscriptionAndGetPlan(
    subscriptionId?: string,
  ): Promise<SubscriptionPlan | null> {
    if (!subscriptionId) return null;

    const subscription = await this.subscriptionRepo.findOne({
      where: { id: subscriptionId },
    });
    if (!subscription) return null;

    const updatePayload: Partial<Subscription> = {
      status: SubscriptionStatus.ACTIVE,
    };
    const activationDates = this.buildActivationDates(subscription);

    if (activationDates) {
      Object.assign(updatePayload, activationDates);
    }

    await this.subscriptionRepo.update(subscriptionId, updatePayload);
    await this.organizationPlanSyncService.syncPlan(
      subscription.organizationId,
      subscription.planId,
    );

    return this.planRepo.findOne({ where: { id: subscription.planId } });
  }
  /**
   * Restore org to free plan after a paid subscription is cancelled/failed.
   * Only creates if org has no remaining active/trial/pending-payment subscription.
   */
  private async restoreFreePlan(orgId: string): Promise<void> {
    const hasActive = await this.subscriptionRepo.findOne({
      where: {
        organizationId: orgId,
        status: In([
          SubscriptionStatus.ACTIVE,
          SubscriptionStatus.TRIAL,
          SubscriptionStatus.PENDING_PAYMENT,
        ]),
      },
    });
    if (hasActive) return;

    const freePlan = await this.planRepo.findOne({
      where: { code: 'free', isActive: true },
    });
    if (!freePlan) {
      this.logger.warn(`Free plan not found, cannot restore for org ${orgId}`);
      return;
    }

    const subscription = this.subscriptionRepo.create({
      organizationId: orgId,
      planId: freePlan.id,
      status: SubscriptionStatus.ACTIVE,
    });
    await this.subscriptionRepo.save(subscription);
    await this.organizationPlanSyncService.syncPlan(orgId, freePlan.id);

    this.logger.log(`Restored free plan for org ${orgId}`);
  }
}
