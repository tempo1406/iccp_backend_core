import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WebsocketService } from '@modules/websocket/websocket.service';
import { WsEvents } from '@modules/websocket/types';
import {
  NOTIFICATION_EVENTS,
  NotificationCreatedEvent,
  NotificationUpdatedEvent,
} from '../constants/notification-events.constant';

@Injectable()
export class NotificationWsListener {
  constructor(private readonly websocketService: WebsocketService) {}

  @OnEvent(NOTIFICATION_EVENTS.CREATED)
  handleNotificationCreated(event: NotificationCreatedEvent): void {
    this.websocketService.emitToUser(
      event.userId,
      WsEvents.NOTIFICATION_NEW,
      event.notification,
      { namespace: 'notifications' },
    );
  }

  @OnEvent(NOTIFICATION_EVENTS.UPDATED)
  handleNotificationUpdated(event: NotificationUpdatedEvent): void {
    this.websocketService.emitToUser(
      event.userId,
      WsEvents.NOTIFICATION_UPDATED,
      event.notification,
      { namespace: 'notifications' },
    );
  }
}
