import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { WebsocketModule } from '@modules/websocket/websocket.module';
import { NotificationCoreService } from './notification-core.service';
import { NotificationCoreController } from './notification-core.controller';
import { NotificationGateway } from './gateways/notification.gateway';
import { NotificationWsListener } from './listeners/notification-ws.listener';

@Module({
  imports: [TypeOrmModule.forFeature([Notification]), WebsocketModule],
  controllers: [NotificationCoreController],
  providers: [
    NotificationCoreService,
    NotificationGateway,
    NotificationWsListener,
  ],
  exports: [NotificationCoreService],
})
export class NotificationCoreModule {}
