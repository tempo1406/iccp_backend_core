import { plainToInstance } from 'class-transformer';
import { Notification } from '../../entities/notification.entity';
import { NotificationResponse } from './notification.response';

export class NotificationUnreadByScopeResponse {
  all: number;
  activity: number;
}

export class NotificationsListResponse {
  data: NotificationResponse[];
  total: number;
  unreadCount: number;
  unreadByScope: NotificationUnreadByScopeResponse;

  static fromEntities(
    entities: Notification[],
    total: number,
    unreadCount: number,
    unreadByScope: NotificationUnreadByScopeResponse,
  ): NotificationsListResponse {
    return plainToInstance(NotificationsListResponse, {
      data: entities.map((entity) => NotificationResponse.fromEntity(entity)),
      total,
      unreadCount,
      unreadByScope,
    });
  }
}
