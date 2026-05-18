import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthJwtPayload } from '@modules/auth/types/auth-jwt.payload';
import { WsRooms } from './types';

/**
 * BaseGateway xử lý auth 1 lần tại handleConnection.
 * Child gateway chỉ cần inject JwtService + ConfigService và gọi super().
 */

export abstract class BaseGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  protected server: Server;

  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    protected readonly jwtService: JwtService,
    protected readonly configService: ConfigService,
  ) {}

  afterInit(): void {
    this.logger.log(`${this.constructor.name} initialized`);
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const payload = this.extractAndVerify(client);
      client.data.user = payload;
      client.data.userId = payload.sub;
      await client.join(WsRooms.user(payload.sub));
      this.logger.log(`Connected: ${client.id} (userId: ${payload.sub})`);
    } catch {
      client.emit('exception', { statusCode: 401, message: 'Unauthorized' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(
      `Disconnected: ${client.id} (userId: ${client.data?.userId ?? 'unknown'})`,
    );
  }

  protected async joinRoom(client: Socket, room: string): Promise<void> {
    await client.join(room);
    this.logger.debug(`${client.id} joined ${room}`);
  }

  protected async leaveRoom(client: Socket, room: string): Promise<void> {
    await client.leave(room);
    this.logger.debug(`${client.id} left ${room}`);
  }

  private extractAndVerify(client: Socket): AuthJwtPayload {
    // Hỗ trợ: socket.auth.token  hoặc  Authorization: Bearer <token>
    const raw: string | undefined =
      (client.handshake.auth?.accessToken as string | undefined) ??
      client.handshake.headers?.authorization?.split(' ')[1];

    if (!raw) throw new Error('Missing token');

    return this.jwtService.verify<AuthJwtPayload>(raw, {
      secret: this.configService.get<string>('jwt.secret') as string,
    });
  }
}
