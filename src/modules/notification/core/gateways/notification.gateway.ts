import { WebSocketGateway } from '@nestjs/websockets';
import { UseFilters } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BaseGateway } from '@modules/websocket/base.gateway';
import { WsExceptionFilter } from '@common/filters/ws-exception.filter';
import { WebsocketService } from '@modules/websocket/websocket.service';

@UseFilters(WsExceptionFilter)
@WebSocketGateway({
  namespace: 'notifications',
  cors: {
    origin: '*',
  },
})
export class NotificationGateway extends BaseGateway {
  constructor(
    jwtService: JwtService,
    configService: ConfigService,
    private readonly websocketService: WebsocketService,
  ) {
    super(jwtService, configService);
  }

  override afterInit(): void {
    super.afterInit();
    // Register the server with WebsocketService after the gateway is initialized.
    this.websocketService.setServer(this.server, 'notifications');
  }
}
