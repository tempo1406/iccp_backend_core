export interface NotificationWsPayload {
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
