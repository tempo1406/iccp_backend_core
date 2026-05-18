import { UseFilters } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WsException,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { WsExceptionFilter } from '@common/filters/ws-exception.filter';
import { ProjectCoreService } from '../core/project-core.service';
import { BaseGateway } from '@modules/websocket/base.gateway';
import { WsRooms } from '@modules/websocket/types';
import { ProjectRealtimeSocketService } from './project-realtime-socket.service';

const PROJECT_SUBSCRIBE_EVENT = 'project.subscribe';
const PROJECT_UNSUBSCRIBE_EVENT = 'project.unsubscribe';

@UseFilters(WsExceptionFilter)
@WebSocketGateway({
  namespace: '/projects',
  cors: {
    origin: '*',
  },
})
export class ProjectGateway extends BaseGateway {
  constructor(
    jwtService: JwtService,
    configService: ConfigService,
    private readonly projectRealtimeSocketService: ProjectRealtimeSocketService,
    private readonly projectCoreService: ProjectCoreService,
  ) {
    super(jwtService, configService);
  }

  override afterInit(): void {
    super.afterInit();
    this.projectRealtimeSocketService.setServer(this.server);
  }

  @SubscribeMessage(PROJECT_SUBSCRIBE_EVENT)
  async handleProjectSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { projectId?: string },
  ): Promise<{ ok: true; projectId: string; room: string }> {
    const projectId = body?.projectId?.trim();
    if (!projectId) {
      throw new WsException({
        statusCode: 400,
        message: 'projectId is required',
      });
    }

    try {
      await this.projectCoreService.assertRealtimeProjectAccess(
        projectId,
        client.data.userId as string,
      );
    } catch (error) {
      throw new WsException(this.toWsError(error));
    }

    const room = WsRooms.project(projectId);
    await this.joinRoom(client, room);

    return { ok: true, projectId, room };
  }

  @SubscribeMessage(PROJECT_UNSUBSCRIBE_EVENT)
  async handleProjectUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { projectId?: string },
  ): Promise<{ ok: true; projectId: string }> {
    const projectId = body?.projectId?.trim();
    if (!projectId) {
      throw new WsException({
        statusCode: 400,
        message: 'projectId is required',
      });
    }

    await this.leaveRoom(client, WsRooms.project(projectId));
    return { ok: true, projectId };
  }

  private toWsError(error: unknown): { statusCode: number; message: string } {
    if (
      typeof error === 'object' &&
      error !== null &&
      'getStatus' in error &&
      typeof error.getStatus === 'function' &&
      'message' in error &&
      typeof error.message === 'string'
    ) {
      return {
        statusCode: error.getStatus() as number,
        message: error.message,
      };
    }

    return {
      statusCode: 500,
      message: 'Internal websocket error',
    };
  }
}
