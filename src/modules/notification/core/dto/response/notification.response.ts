import { plainToInstance } from 'class-transformer';
import { Notification } from '../../entities/notification.entity';
import { decorateNotificationDataWithFeedScope } from '../../utils/notification-feed-scope.util';

export class NotificationResponse {
  id: string;
  type: string;
  title: string;
  message: string;
  content: string | null;
  read: boolean;
  campaignId: string | null;
  sender: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
  data?: Record<string, unknown>;
  createdAt: string;

  static fromEntity(entity: Notification): NotificationResponse {
    return plainToInstance(NotificationResponse, {
      id: entity.id,
      type: entity.type,
      title: entity.title,
      message: entity.message,
      content: entity.content ?? null,
      read: entity.isRead,
      campaignId: entity.campaignId ?? null,
      sender: entity.senderId
        ? {
            id: entity.senderId,
            name: entity.senderName ?? '',
            avatarUrl: entity.senderAvatarUrl ?? null,
          }
        : null,
      data: decorateNotificationDataWithFeedScope(
        entity.data as Record<string, unknown> | null,
      ),
      createdAt: entity.createdAt.toISOString(),
    });
  }
}
