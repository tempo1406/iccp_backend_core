import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { WsEvent, WsEventPayloadMap, WsRooms } from './types';

type EmitOptions = {
  namespace?: string;
};

/**
 * WebsocketService là "port" duy nhất để các module khác push event tới client.
 * Không module nào được import Server trực tiếp — chỉ gọi qua service này.
 */
@Injectable()
export class WebsocketService {
  private readonly logger = new Logger(WebsocketService.name);
  private readonly servers = new Map<string, Server>();
  private defaultNamespace?: string;

  /** Gọi bởi gateway.afterInit() sau khi server khởi tạo */
  setServer(server: Server, namespace = 'default'): void {
    this.servers.set(namespace, server);
    if (!this.defaultNamespace) {
      this.defaultNamespace = namespace;
    }
  }

  emitToUser<E extends WsEvent>(
    userId: string,
    event: E,
    data: WsEventPayloadMap[E],
    options?: EmitOptions,
  ): void {
    const server = this.resolveServer(options?.namespace);
    if (!server) return;
    server.to(WsRooms.user(userId)).emit(event, data);
    this.logger.debug(
      `-> [${event}] ${WsRooms.user(userId)} (ns=${this.resolveNamespaceLabel(options?.namespace)})`,
    );
  }

  emitToOrg<E extends WsEvent>(
    orgId: string,
    event: E,
    data: WsEventPayloadMap[E],
    options?: EmitOptions,
  ): void {
    const server = this.resolveServer(options?.namespace);
    if (!server) return;
    server.to(WsRooms.org(orgId)).emit(event, data);
    this.logger.debug(
      `-> [${event}] ${WsRooms.org(orgId)} (ns=${this.resolveNamespaceLabel(options?.namespace)})`,
    );
  }

  emitToProject<E extends WsEvent>(
    projectId: string,
    event: E,
    data: WsEventPayloadMap[E],
    options?: EmitOptions,
  ): void {
    const server = this.resolveServer(options?.namespace);
    if (!server) return;
    server.to(WsRooms.project(projectId)).emit(event, data);
    this.logger.debug(
      `-> [${event}] ${WsRooms.project(projectId)} (ns=${this.resolveNamespaceLabel(options?.namespace)})`,
    );
  }

  emitToRoom<E extends WsEvent>(
    room: string,
    event: E,
    data: WsEventPayloadMap[E],
    options?: EmitOptions,
  ): void {
    const server = this.resolveServer(options?.namespace);
    if (!server) return;
    server.to(room).emit(event, data);
    this.logger.debug(
      `-> [${event}] ${room} (ns=${this.resolveNamespaceLabel(options?.namespace)})`,
    );
  }

  private resolveServer(namespace?: string): Server | null {
    if (namespace && this.servers.has(namespace)) {
      return this.servers.get(namespace) ?? null;
    }

    if (this.defaultNamespace && this.servers.has(this.defaultNamespace)) {
      return this.servers.get(this.defaultNamespace) ?? null;
    }

    const first = this.servers.values().next();
    return first.done ? null : first.value;
  }

  private resolveNamespaceLabel(namespace?: string): string {
    return namespace || this.defaultNamespace || 'unknown';
  }
}
