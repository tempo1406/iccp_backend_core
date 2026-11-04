import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

/**
 * Guard nhẹ — KHÔNG verify JWT.
 * Chỉ check client.data.user đã được set bởi BaseGateway.handleConnection.
 * Dùng @UseGuards(WsAuthGuard) trên các @SubscribeMessage nhạy cảm.
 */
@Injectable()
export class WsAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient<Socket>();
    if (!client.data?.user) {
      throw new WsException({ statusCode: 401, message: 'Unauthorized' });
    }
    return true;
  }
}
