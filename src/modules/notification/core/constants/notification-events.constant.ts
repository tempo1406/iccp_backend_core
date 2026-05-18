export const NOTIFICATION_EVENTS = {
  CREATED: 'notification.created',
  UPDATED: 'notification.updated',
} as const;

export interface NotificationRealtimePayload {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  content?: string;
  campaignId?: string;
  senderId?: string;
  senderName?: string;
  senderAvatarUrl?: string;
  data?: Record<string, unknown>;
  createdAt: string;
}

export interface NotificationCreatedEvent {
  userId: string;
  notification: NotificationRealtimePayload;
}

export interface NotificationUpdatedEvent {
  userId: string;
  notification: NotificationRealtimePayload;
}

export const CAMPAIGN_EVENTS = {
  PROCESS: 'campaign.process',
} as const;

export interface CampaignProcessEvent {
  campaignId: string;
  recipientIds: string[];
}
