import { WsExceptionFilter } from '@common/filters/ws-exception.filter';
import { PresenceService } from '@modules/chat-box/presence/presence.service';
import { ChatRoomMember } from '@modules/chat-box/room-management/entities/room-member.entity';
import { OrganizationMember } from '@modules/organization/core/entities/organization-member.entity';
import { BaseGateway } from '@modules/websocket/base.gateway';
import { WsEvents, WsRooms } from '@modules/websocket/types';
import { WebsocketService } from '@modules/websocket/websocket.service';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { UseFilters } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import Redis from 'ioredis';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WsException,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { Repository } from 'typeorm';

type RoomSubscriptionPayload = {
  organizationId: string;
  roomId: string;
};

type TypingPayload = RoomSubscriptionPayload;

@UseFilters(WsExceptionFilter)
@WebSocketGateway({
  namespace: 'chat',
  cors: {
    origin: '*',
  },
})
export class ChatBoxGateway extends BaseGateway {
  private static readonly PRESENCE_DISCONNECT_GRACE_MS = 30_000;
  private static readonly PRESENCE_COUNTER_KEY_PREFIX =
    'chat:presence:socket-count:v1';
  private static readonly PRESENCE_OFFLINE_MARKER_KEY_PREFIX =
    'chat:presence:offline-marker:v1';
  private static readonly PRESENCE_COUNTER_TTL_SEC = 24 * 60 * 60;
  private static readonly TYPING_EXPIRE_MS = 5_000;
  private static readonly TYPING_RATE_LIMIT_WINDOW_MS = 350;
  private static readonly TYPING_RATE_LIMIT_KEY_PREFIX = 'chat:typing:rate:v1';

  private readonly activeSocketIdsByUser = new Map<string, Set<string>>();
  private readonly pendingOfflineTimers = new Map<string, NodeJS.Timeout>();
  private readonly typingTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    jwtService: JwtService,
    configService: ConfigService,
    private readonly websocketService: WebsocketService,
    private readonly presenceService: PresenceService,
    @InjectRepository(ChatRoomMember)
    private readonly roomMemberRepo: Repository<ChatRoomMember>,
    @InjectRepository(OrganizationMember)
    private readonly organizationMemberRepo: Repository<OrganizationMember>,
    @InjectRedis()
    private readonly redis: Redis,
  ) {
    super(jwtService, configService);
  }

  override afterInit(): void {
    super.afterInit();
    this.websocketService.setServer(this.server, 'chat');
  }

  override async handleConnection(client: Socket): Promise<void> {
    await super.handleConnection(client);

    const userId = this.tryGetConnectedUserId(client);
    if (!userId) {
      return;
    }

    const wasOffline = await this.markSocketConnected(userId, client.id);
    if (wasOffline) {
      this.clearPendingOffline(userId);
    }

    try {
      await this.joinOrganizationRooms(client, userId);
      if (wasOffline) {
        await this.presenceService.handleSocketConnected(userId);
      }
    } catch (error) {
      this.logger.error(
        `Failed to process connection lifecycle for user ${userId}: ${(error as Error).message}`,
      );
    }
  }

  override handleDisconnect(client: Socket): void {
    super.handleDisconnect(client);

    const userId = this.tryGetConnectedUserId(client);
    if (!userId) {
      return;
    }

    void this.handleDisconnectLifecycle(userId, client.id);
  }

  @SubscribeMessage('chat.room.subscribe')
  async subscribeRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: RoomSubscriptionPayload,
  ): Promise<{ joinedRoom: string; organizationRoom: string }> {
    const { organizationId, roomId } =
      this.validateSubscriptionPayload(payload);
    const userId = this.getConnectedUserId(client);

    await this.assertRoomMembership(organizationId, roomId, userId);

    const joinedRoom = WsRooms.chatRoom(roomId);
    const organizationRoom = WsRooms.org(organizationId);

    await this.joinRoom(client, joinedRoom);
    await this.joinRoom(client, organizationRoom);

    return { joinedRoom, organizationRoom };
  }

  @SubscribeMessage('chat.room.unsubscribe')
  async unsubscribeRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: RoomSubscriptionPayload,
  ): Promise<{ leftRoom: string }> {
    const { roomId } = this.validateSubscriptionPayload(payload);
    const leftRoom = WsRooms.chatRoom(roomId);
    await this.leaveRoom(client, leftRoom);
    return { leftRoom };
  }

  @SubscribeMessage('chat.typing.start')
  async typingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: TypingPayload,
  ): Promise<{ expiresAt: string }> {
    const { organizationId, roomId } =
      this.validateSubscriptionPayload(payload);
    const userId = this.getConnectedUserId(client);
    await this.assertRoomMembership(organizationId, roomId, userId);
    const expiresAt = new Date(Date.now() + ChatBoxGateway.TYPING_EXPIRE_MS);
    const allowed = await this.allowTypingEvent({
      organizationId,
      roomId,
      userId,
      action: 'start',
    });
    if (!allowed) {
      return { expiresAt: expiresAt.toISOString() };
    }

    const typingKey = this.buildTypingKey({ organizationId, roomId, userId });

    this.clearTypingKey(typingKey);
    const timer = setTimeout(() => {
      this.typingTimers.delete(typingKey);
      this.server
        .to(WsRooms.chatRoom(roomId))
        .emit(WsEvents.CHAT_TYPING_STOPPED, {
          organizationId,
          roomId,
          userId,
          occurredAt: new Date().toISOString(),
        });
    }, ChatBoxGateway.TYPING_EXPIRE_MS);
    this.typingTimers.set(typingKey, timer);

    this.server
      .to(WsRooms.chatRoom(roomId))
      .except(client.id)
      .emit(WsEvents.CHAT_TYPING_STARTED, {
        organizationId,
        roomId,
        userId,
        occurredAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
      });

    return { expiresAt: expiresAt.toISOString() };
  }

  @SubscribeMessage('chat.typing.stop')
  async typingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: TypingPayload,
  ): Promise<{ stopped: true }> {
    const { organizationId, roomId } =
      this.validateSubscriptionPayload(payload);
    const userId = this.getConnectedUserId(client);
    await this.assertRoomMembership(organizationId, roomId, userId);
    const allowed = await this.allowTypingEvent({
      organizationId,
      roomId,
      userId,
      action: 'stop',
    });
    if (!allowed) {
      return { stopped: true };
    }

    const typingKey = this.buildTypingKey({ organizationId, roomId, userId });
    this.clearTypingKey(typingKey);

    this.server
      .to(WsRooms.chatRoom(roomId))
      .except(client.id)
      .emit(WsEvents.CHAT_TYPING_STOPPED, {
        organizationId,
        roomId,
        userId,
        occurredAt: new Date().toISOString(),
      });

    return { stopped: true };
  }

  private async allowTypingEvent(params: {
    organizationId: string;
    roomId: string;
    userId: string;
    action: 'start' | 'stop';
  }): Promise<boolean> {
    const rateKey =
      `${ChatBoxGateway.TYPING_RATE_LIMIT_KEY_PREFIX}:` +
      `${params.organizationId}:${params.roomId}:${params.userId}:${params.action}`;
    try {
      const result = await this.redis.set(
        rateKey,
        '1',
        'PX',
        ChatBoxGateway.TYPING_RATE_LIMIT_WINDOW_MS,
        'NX',
      );
      return result === 'OK';
    } catch (error) {
      this.logger.warn(
        `Typing rate-limit Redis check failed for user ${params.userId}: ${(error as Error).message}`,
      );
      return true;
    }
  }

  private getConnectedUserId(client: Socket): string {
    const userId = client.data?.userId;
    if (typeof userId !== 'string' || userId.length === 0) {
      throw new WsException({ statusCode: 401, message: 'Unauthorized' });
    }
    return userId;
  }

  private validateSubscriptionPayload(
    payload: RoomSubscriptionPayload,
  ): RoomSubscriptionPayload {
    const organizationId = payload?.organizationId;
    const roomId = payload?.roomId;

    if (!this.isUuidV4(organizationId) || !this.isUuidV4(roomId)) {
      throw new WsException({
        statusCode: 400,
        message: 'organizationId and roomId must be valid UUID',
      });
    }

    return { organizationId, roomId };
  }

  private tryGetConnectedUserId(client: Socket): string | null {
    const userId = client.data?.userId;
    if (typeof userId !== 'string' || userId.length === 0) {
      return null;
    }
    return userId;
  }

  private async markSocketConnectedShared(userId: string): Promise<boolean> {
    const counterKey = this.buildPresenceCounterKey(userId);
    try {
      const count = await this.redis.incr(counterKey);
      await this.redis.expire(
        counterKey,
        ChatBoxGateway.PRESENCE_COUNTER_TTL_SEC,
      );
      await this.redis.del(this.buildPresenceOfflineMarkerKey(userId));
      return count === 1;
    } catch (error) {
      this.logger.warn(
        `Failed to increment shared presence counter for user ${userId}: ${(error as Error).message}`,
      );
      return false;
    }
  }

  private async markSocketConnected(
    userId: string,
    socketId: string,
  ): Promise<boolean> {
    const current = this.activeSocketIdsByUser.get(userId);
    const wasOffline = !current || current.size === 0;
    const next = current ?? new Set<string>();
    next.add(socketId);
    this.activeSocketIdsByUser.set(userId, next);
    const wasOfflineShared = await this.markSocketConnectedShared(userId);
    return wasOffline || wasOfflineShared;
  }

  private markSocketDisconnected(userId: string, socketId: string): {
    removed: boolean;
    stillHasLocalSockets: boolean;
  } {
    const current = this.activeSocketIdsByUser.get(userId);
    if (!current) {
      return {
        removed: false,
        stillHasLocalSockets: false,
      };
    }

    current.delete(socketId);
    if (current.size === 0) {
      this.activeSocketIdsByUser.delete(userId);
      return {
        removed: true,
        stillHasLocalSockets: false,
      };
    }

    this.activeSocketIdsByUser.set(userId, current);
    return {
      removed: true,
      stillHasLocalSockets: true,
    };
  }

  private async decrementSharedSocketCount(userId: string): Promise<number> {
    try {
      const counterKey = this.buildPresenceCounterKey(userId);
      const next = await this.redis.eval(
        [
          "local current = redis.call('GET', KEYS[1])",
          'if not current then return 0 end',
          'local next = tonumber(current) - 1',
          "if next <= 0 then redis.call('DEL', KEYS[1]); return 0 end",
          "redis.call('SET', KEYS[1], next, 'EX', ARGV[1])",
          'return next',
        ].join('\n'),
        1,
        counterKey,
        String(ChatBoxGateway.PRESENCE_COUNTER_TTL_SEC),
      );
      return Number(next) || 0;
    } catch (error) {
      this.logger.warn(
        `Failed to decrement shared presence counter for user ${userId}: ${(error as Error).message}`,
      );
      return 0;
    }
  }

  private async getSharedSocketCount(userId: string): Promise<number> {
    try {
      const value = await this.redis.get(this.buildPresenceCounterKey(userId));
      if (!value) {
        return 0;
      }
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed < 0) {
        return 0;
      }
      return parsed;
    } catch (error) {
      this.logger.warn(
        `Failed to read shared presence counter for user ${userId}: ${(error as Error).message}`,
      );
      return 0;
    }
  }

  private async handleDisconnectLifecycle(
    userId: string,
    socketId: string,
  ): Promise<void> {
    const localState = this.markSocketDisconnected(userId, socketId);
    if (!localState.removed) {
      return;
    }

    const sharedCount = await this.decrementSharedSocketCount(userId);
    if (sharedCount > 0 || localState.stillHasLocalSockets) {
      return;
    }

    await this.clearTypingByUser(userId);
    this.scheduleOfflineTransition(userId);
  }

  private clearPendingOffline(userId: string): void {
    const timer = this.pendingOfflineTimers.get(userId);
    if (!timer) {
      return;
    }

    clearTimeout(timer);
    this.pendingOfflineTimers.delete(userId);
  }

  private scheduleOfflineTransition(userId: string): void {
    this.clearPendingOffline(userId);
    const marker = `${Date.now()}:${Math.random()}`;
    const markerKey = this.buildPresenceOfflineMarkerKey(userId);
    void this.redis
      .set(
        markerKey,
        marker,
        'PX',
        ChatBoxGateway.PRESENCE_DISCONNECT_GRACE_MS + 5_000,
      )
      .catch((error) => {
        this.logger.warn(
          `Failed to set offline marker for user ${userId}: ${(error as Error).message}`,
        );
      });

    const timer = setTimeout(() => {
      void (async () => {
        this.pendingOfflineTimers.delete(userId);
        try {
          const sharedSocketCount = await this.getSharedSocketCount(userId);
          if (sharedSocketCount > 0) {
            return;
          }
          const currentMarker = await this.redis.get(markerKey);
          if (currentMarker !== marker) {
            return;
          }
          await this.presenceService.handleSocketDisconnected(userId);
          await this.redis.del(markerKey);
        } catch (error) {
          this.logger.error(
            `Failed to update offline presence for user ${userId}: ${(error as Error).message}`,
          );
        }
      })();
    }, ChatBoxGateway.PRESENCE_DISCONNECT_GRACE_MS);

    this.pendingOfflineTimers.set(userId, timer);
  }

  private async joinOrganizationRooms(
    client: Socket,
    userId: string,
  ): Promise<void> {
    const memberships = await this.organizationMemberRepo.find({
      where: {
        userId,
        isActive: true,
        isDeleted: false,
      },
      select: ['organizationId'],
    });

    if (memberships.length === 0) {
      return;
    }

    const organizationIds = Array.from(
      new Set(memberships.map((membership) => membership.organizationId)),
    );

    await Promise.all(
      organizationIds.map((organizationId) =>
        this.joinRoom(client, WsRooms.org(organizationId)),
      ),
    );
  }

  private isUuidV4(value: unknown): value is string {
    if (typeof value !== 'string') {
      return false;
    }

    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }

  private async assertRoomMembership(
    organizationId: string,
    roomId: string,
    userId: string,
  ): Promise<void> {
    const isMember = await this.roomMemberRepo.findOne({
      where: {
        organizationId,
        roomId,
        userId,
        isActive: true,
      },
      select: ['id'],
    });
    if (!isMember) {
      throw new WsException({
        statusCode: 403,
        message: 'You are not an active member of this room',
      });
    }
  }

  private buildTypingKey(params: {
    organizationId: string;
    roomId: string;
    userId: string;
  }): string {
    return `${params.organizationId}:${params.roomId}:${params.userId}`;
  }

  private async clearTypingByUser(userId: string): Promise<void> {
    const keys = Array.from(this.typingTimers.keys()).filter((key) =>
      key.endsWith(`:${userId}`),
    );
    for (const key of keys) {
      this.clearTypingKey(key);
      const [organizationId, roomId] = key.split(':');
      if (organizationId && roomId) {
        this.server
          .to(WsRooms.chatRoom(roomId))
          .emit(WsEvents.CHAT_TYPING_STOPPED, {
            organizationId,
            roomId,
            userId,
            occurredAt: new Date().toISOString(),
          });
      }
    }
  }

  private buildPresenceCounterKey(userId: string): string {
    return `${ChatBoxGateway.PRESENCE_COUNTER_KEY_PREFIX}:${userId}`;
  }

  private buildPresenceOfflineMarkerKey(userId: string): string {
    return `${ChatBoxGateway.PRESENCE_OFFLINE_MARKER_KEY_PREFIX}:${userId}`;
  }

  private clearTypingKey(typingKey: string): void {
    const timer = this.typingTimers.get(typingKey);
    if (timer) {
      clearTimeout(timer);
      this.typingTimers.delete(typingKey);
    }
  }
}
