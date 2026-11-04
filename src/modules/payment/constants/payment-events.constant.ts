export const PAYMENT_EVENTS = {
  SUCCESS: 'payment.success',
  FAILED: 'payment.failed',
  RENEWAL_REMINDER: 'payment.renewal_reminder',
  SUBSCRIPTION_EXPIRED: 'payment.subscription_expired',
} as const;

export interface PaymentSuccessEvent {
  orgId: string;
  planName: string;
  amount: number;
  currency: string;
  transactionId: string;
}

export interface PaymentFailedEvent {
  orgId: string;
  planName: string;
  amount: number;
  currency: string;
  reason?: string;
}

export interface RenewalReminderEvent {
  orgId: string;
  planName: string;
  expiresAt: string;
  daysRemaining: number;
}

export interface SubscriptionExpiredEvent {
  orgId: string;
  expiredPlanName: string;
  restoredToFreePlan: boolean;
}
