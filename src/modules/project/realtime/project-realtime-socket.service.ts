import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { WsEvent, WsEventPayloadMap, WsRooms } from '@modules/websocket/types';

@Injectable()
export class ProjectRealtimeSocketService {
  private readonly logger = new Logger(ProjectRealtimeSocketService.name);
  private server?: Server;

  setServer(server: Server): void {
    this.server = server;
  }

  emitToProject<E extends WsEvent>(
    projectId: string,
    event: E,
    payload: WsEventPayloadMap[E],
  ): void {
    this.getServer()?.to(WsRooms.project(projectId)).emit(event, payload);
    this.logger.debug(`[${event}] ${WsRooms.project(projectId)}`);
  }

  private getServer(): Server | undefined {
    if (!this.server) {
      this.logger.warn('Project socket server is not initialized');
    }

    return this.server;
  }
}
