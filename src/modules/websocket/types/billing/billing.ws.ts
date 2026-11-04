export interface BillingPaymentWsPayload {
  orgId: string;
  planName: string;
  amount: number;
  currency: string;
  status: 'success' | 'failed';
  transactionId?: string;
}

export interface BillingSubscriptionWsPayload {
  orgId: string;
  planName: string;
  expiresAt: string;
}

export interface BillingRenewalReminderWsPayload {
  orgId: string;
  planName: string;
  expiresAt: string;
  daysRemaining: number;
}

export interface BillingSubscriptionExpiredWsPayload {
  orgId: string;
  expiredPlanName: string;
  restoredToFreePlan: boolean;
}
