import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WebsocketService } from '@modules/websocket/websocket.service';
import { WsEvents } from '@modules/websocket/types';
import {
  PAYMENT_EVENTS,
  PaymentSuccessEvent,
  PaymentFailedEvent,
  RenewalReminderEvent,
  SubscriptionExpiredEvent,
} from '../constants/payment-events.constant';

@Injectable()
export class PaymentWsListener {
  constructor(private readonly websocketService: WebsocketService) {}

  @OnEvent(PAYMENT_EVENTS.SUCCESS)
  handlePaymentSuccess(event: PaymentSuccessEvent): void {
    this.websocketService.emitToOrg(
      event.orgId,
      WsEvents.BILLING_PAYMENT_SUCCESS,
      {
        orgId: event.orgId,
        planName: event.planName,
        amount: event.amount,
        currency: event.currency,
        status: 'success',
        transactionId: event.transactionId,
      },
    );
  }

  @OnEvent(PAYMENT_EVENTS.FAILED)
  handlePaymentFailed(event: PaymentFailedEvent): void {
    this.websocketService.emitToOrg(
      event.orgId,
      WsEvents.BILLING_PAYMENT_FAILED,
      {
        orgId: event.orgId,
        planName: event.planName,
        amount: event.amount,
        currency: event.currency,
        status: 'failed',
      },
    );
  }

  @OnEvent(PAYMENT_EVENTS.RENEWAL_REMINDER)
  handleRenewalReminder(event: RenewalReminderEvent): void {
    this.websocketService.emitToOrg(
      event.orgId,
      WsEvents.BILLING_SUBSCRIPTION_RENEWAL_REMINDER,
      {
        orgId: event.orgId,
        planName: event.planName,
        expiresAt: event.expiresAt,
        daysRemaining: event.daysRemaining,
      },
    );
  }

  @OnEvent(PAYMENT_EVENTS.SUBSCRIPTION_EXPIRED)
  handleSubscriptionExpired(event: SubscriptionExpiredEvent): void {
    this.websocketService.emitToOrg(
      event.orgId,
      WsEvents.BILLING_SUBSCRIPTION_EXPIRED,
      {
        orgId: event.orgId,
        expiredPlanName: event.expiredPlanName,
        restoredToFreePlan: event.restoredToFreePlan,
      },
    );
  }
}
