import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { In, IsNull, Repository, SelectQueryBuilder } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/request/create-notification.dto';
import { CleanupNotificationsRequest } from './dto/request/cleanup-notifications.request';
import {
  GetNotificationsQueryDto,
  NotificationFeedScope,
} from './dto/request/get-notifications-query.dto';
import { MarkAllNotificationsReadQuery } from './dto/request/mark-all-notifications-read.query';
import { NotificationsListResponse } from './dto/response/notifications-list.response';
import {
  NOTIFICATION_EVENTS,
  NotificationRealtimePayload,
} from './constants/notification-events.constant';
import {
  decorateNotificationDataWithFeedScope,
  NOTIFICATION_ACTIVITY_EVENT_TYPES,
} from './utils/notification-feed-scope.util';

@Injectable()
export class NotificationCoreService {
  private static readonly DEFAULT_READ_RETENTION_DAYS = 90;
  private static readonly DEFAULT_HARD_RETENTION_DAYS = 365;

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async send(dto: CreateNotificationDto): Promise<Notification | null> {
    const dedupeKey = dto.dedupeKey?.trim();
    if (dedupeKey) {
      const existing = await this.notificationRepo
        .createQueryBuilder('notification')
        .where('notification.user_id = :userId', { userId: dto.userId })
        .andWhere("notification.data ->> 'dedupeKey' = :dedupeKey", {
          dedupeKey,
        })
        .andWhere('notification.deleted_at IS NULL')
        .orderBy('notification.created_at', 'DESC')
        .getOne();

      if (existing) {
        return existing;
      }
    }

    const dataPayload = {
      ...(dto.data ?? {}),
      ...(dedupeKey ? { dedupeKey } : {}),
    };
    const shouldSaveData = Object.keys(dataPayload).length > 0;

    let saved: Notification;
    try {
      saved = await this.notificationRepo.save(
        this.notificationRepo.create({
          userId: dto.userId,
          title: dto.title,
          message: dto.message,
          content: dto.content ?? null,
          type: dto.type ?? 'info',
          data: shouldSaveData ? dataPayload : null,
          senderId: dto.senderId ?? null,
          senderName: dto.senderName ?? null,
          senderAvatarUrl: dto.senderAvatarUrl ?? null,
          idempotencyKey: dto.idempotencyKey ?? null,
        }),
      );
    } catch (e: unknown) {
      if ((e as { code?: string })?.code === '23505') {
        return null;
      }
      throw e;
    }

    if (dto.emitRealtime !== false) {
      this.emitNotificationCreated(saved);
    }
    return saved;
  }

  async sendForCampaign(dto: {
    userId: string;
    campaignId: string;
    title: string;
    message: string;
    content: string;
    type: string;
    senderId: string;
    senderName: string;
    senderAvatarUrl?: string;
  }): Promise<Notification> {
    const saved = await this.notificationRepo.save(
      this.notificationRepo.create({
        userId: dto.userId,
        title: dto.title,
        message: dto.message,
        type: dto.type,
        campaignId: dto.campaignId,
        content: dto.content,
        senderId: dto.senderId,
        senderName: dto.senderName,
        senderAvatarUrl: dto.senderAvatarUrl ?? null,
      }),
    );

    this.emitNotificationCreated(saved);
    return saved;
  }

  async createBySystemAdmin(
    dto: CreateNotificationDto,
  ): Promise<Notification | null> {
    return this.send(dto);
  }

  async findByUser(
    userId: string,
    query: GetNotificationsQueryDto,
    organizationId?: string,
  ): Promise<NotificationsListResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const unreadOnly = query.unreadOnly ?? false;
    const scope = query.scope ?? NotificationFeedScope.ALL;
    const normalizedOrganizationId = organizationId?.trim();

    const itemsQuery = this.createUserFeedQuery(userId, normalizedOrganizationId);
    this.applyFeedScopeConstraint(itemsQuery, scope);
    if (unreadOnly) {
      itemsQuery.andWhere('notification.is_read = false');
    }

    const totalQuery = this.createUserFeedQuery(userId, normalizedOrganizationId);
    this.applyFeedScopeConstraint(totalQuery, scope);
    if (unreadOnly) {
      totalQuery.andWhere('notification.is_read = false');
    }

    const unreadCountQuery = this.createUserFeedQuery(
      userId,
      normalizedOrganizationId,
    )
      .andWhere('notification.is_read = false');
    this.applyFeedScopeConstraint(unreadCountQuery, scope);

    const unreadAllQuery = this.createUserFeedQuery(
      userId,
      normalizedOrganizationId,
    ).andWhere('notification.is_read = false');

    const unreadActivityQuery = this.createUserFeedQuery(
      userId,
      normalizedOrganizationId,
    ).andWhere('notification.is_read = false');
    this.applyFeedScopeConstraint(
      unreadActivityQuery,
      NotificationFeedScope.ACTIVITY,
    );

    const [items, total, unreadCount, unreadAll, unreadActivity] =
      await Promise.all([
      itemsQuery
        .orderBy('notification.created_at', 'DESC')
        .skip((page - 1) * limit)
        .take(limit)
        .getMany(),
      totalQuery.getCount(),
      unreadCountQuery.getCount(),
      unreadAllQuery.getCount(),
      unreadActivityQuery.getCount(),
    ]);

    return {
      ...NotificationsListResponse.fromEntities(items, total, unreadCount, {
        all: unreadAll,
        activity: unreadActivity,
      }),
    };
  }

  async countUnreadByUser(
    userId: string,
    organizationId?: string,
  ): Promise<number> {
    const normalizedOrganizationId = organizationId?.trim();
    if (!normalizedOrganizationId) {
      return await this.notificationRepo.count({
        where: {
          userId,
          isRead: false,
          deletedAt: IsNull(),
        },
      });
    }

    return await this.createUserFeedQuery(userId, normalizedOrganizationId)
      .andWhere('notification.is_read = false')
      .getCount();
  }

  async markAsRead(id: string, userId: string): Promise<number> {
    const notification = await this.notificationRepo.findOne({
      where: {
        id,
        userId,
        deletedAt: IsNull(),
      },
    });

    if (!notification || notification.isRead) {
      return 0;
    }

    notification.isRead = true;
    const saved = await this.notificationRepo.save(notification);
    this.emitNotificationUpdated(saved);
    return 1;
  }

  async markManyAsRead(userId: string, ids: string[]): Promise<number> {
    const normalizedIds = this.normalizeIds(ids);
    if (normalizedIds.length === 0) {
      return 0;
    }

    const notifications = await this.notificationRepo.find({
      where: {
        userId,
        id: In(normalizedIds),
        isRead: false,
        deletedAt: IsNull(),
      },
    });

    if (notifications.length === 0) {
      return 0;
    }

    const targetIds = notifications.map((notification) => notification.id);
    await this.notificationRepo.update(
      {
        userId,
        id: In(targetIds),
        isRead: false,
        deletedAt: IsNull(),
      },
      { isRead: true },
    );

    notifications.forEach((notification) => {
      notification.isRead = true;
      this.emitNotificationUpdated(notification);
    });

    return notifications.length;
  }

  async markAllAsRead(
    userId: string,
    query?: MarkAllNotificationsReadQuery,
  ): Promise<number> {
    const organizationId = query?.organizationId?.trim();
    const roomId = query?.roomId?.trim();

    const unreadQuery = this.notificationRepo
      .createQueryBuilder('notification')
      .where('user_id = :userId', { userId })
      .andWhere('is_read = false')
      .andWhere('deleted_at IS NULL');

    if (organizationId) {
      unreadQuery.andWhere(
        "COALESCE(data ->> 'organizationId', data ->> 'orgId') = :organizationId",
        {
          organizationId,
        },
      );
    }

    if (roomId) {
      unreadQuery.andWhere("data ->> 'roomId' = :roomId", { roomId });
    }

    const notifications = await unreadQuery.getMany();
    if (notifications.length === 0) {
      return 0;
    }

    const targetIds = notifications.map((notification) => notification.id);
    await this.notificationRepo.update(
      {
        userId,
        id: In(targetIds),
        isRead: false,
        deletedAt: IsNull(),
      },
      { isRead: true },
    );

    notifications.forEach((notification) => {
      notification.isRead = true;
      this.emitNotificationUpdated(notification);
    });

    return notifications.length;
  }

  async emitUpdatedByIds(
    userId: string,
    notificationIds: string[],
  ): Promise<void> {
    const normalizedIds = this.normalizeIds(notificationIds);
    if (normalizedIds.length === 0) {
      return;
    }

    const notifications = await this.notificationRepo.find({
      where: {
        userId,
        id: In(normalizedIds),
        deletedAt: IsNull(),
      },
    });

    notifications.forEach((notification) =>
      this.emitNotificationUpdated(notification),
    );
  }

  async updateInvitationStatus(params: {
    userId: string;
    invitationId: string;
    invitationStatus: string;
    acceptedAt?: Date;
    roomId?: string;
    roomName?: string;
    invitedByUserId?: string;
    invitedByDisplayName?: string;
    memberRole?: string;
    emitRealtime?: boolean;
  }): Promise<Notification[]> {
    const notifications = await this.notificationRepo
      .createQueryBuilder('notification')
      .where('notification.user_id = :userId', { userId: params.userId })
      .andWhere("notification.data ->> 'invitationId' = :invitationId", {
        invitationId: params.invitationId,
      })
      .andWhere('notification.deleted_at IS NULL')
      .orderBy('notification.created_at', 'DESC')
      .getMany();

    if (notifications.length === 0) {
      return [];
    }

    const acceptedAtIso = params.acceptedAt?.toISOString();
    const updated = notifications.map((notification) => {
      const existingData = (notification.data ?? {}) as Record<string, unknown>;
      notification.data = {
        ...existingData,
        eventType: 'chat.invitation.updated',
        invitationId: params.invitationId,
        invitationStatus: params.invitationStatus,
        status: params.invitationStatus,
        inviteStatus: params.invitationStatus,
        acceptedAt: acceptedAtIso ?? existingData['acceptedAt'] ?? null,
        roomId: params.roomId ?? existingData['roomId'],
        roomName: params.roomName ?? existingData['roomName'],
        invitedByUserId:
          params.invitedByUserId ??
          existingData['invitedByUserId'] ??
          existingData['actorUserId'],
        invitedByDisplayName:
          params.invitedByDisplayName ??
          existingData['invitedByDisplayName'] ??
          existingData['actorName'],
        memberRole: params.memberRole ?? existingData['memberRole'],
      };
      return notification;
    });

    const saved = await this.notificationRepo.save(updated);
    if (params.emitRealtime !== false) {
      saved.forEach((notification) =>
        this.emitNotificationUpdated(notification),
      );
    }

    return saved;
  }

  async cleanupOldNotifications(payload: CleanupNotificationsRequest): Promise<{
    deletedCount: number;
    readThresholdAt: string;
    hardThresholdAt: string;
  }> {
    const readRetentionDays =
      payload.readRetentionDays ??
      NotificationCoreService.DEFAULT_READ_RETENTION_DAYS;
    const hardRetentionDays =
      payload.hardRetentionDays ??
      NotificationCoreService.DEFAULT_HARD_RETENTION_DAYS;

    if (hardRetentionDays < readRetentionDays) {
      throw new BadRequestException(
        'hardRetentionDays must be greater than or equal to readRetentionDays',
      );
    }

    const now = Date.now();
    const readThreshold = new Date(
      now - readRetentionDays * 24 * 60 * 60 * 1000,
    );
    const hardThreshold = new Date(
      now - hardRetentionDays * 24 * 60 * 60 * 1000,
    );

    const result = await this.notificationRepo
      .createQueryBuilder()
      .delete()
      .from(Notification)
      .where('created_at < :hardThreshold', { hardThreshold })
      .orWhere('(is_read = true AND created_at < :readThreshold)', {
        readThreshold,
      })
      .execute();

    return {
      deletedCount: result.affected ?? 0,
      readThresholdAt: readThreshold.toISOString(),
      hardThresholdAt: hardThreshold.toISOString(),
    };
  }

  async remove(userId: string, id: string): Promise<boolean> {
    const result = await this.notificationRepo.softDelete({
      userId,
      id,
      deletedAt: IsNull(),
    });
    return (result.affected ?? 0) > 0;
  }

  private emitNotificationCreated(notification: Notification): void {
    this.eventEmitter.emit(NOTIFICATION_EVENTS.CREATED, {
      userId: notification.userId,
      notification: this.toRealtimePayload(notification),
    });
  }

  private createUserFeedQuery(
    userId: string,
    organizationId?: string,
  ): SelectQueryBuilder<Notification> {
    const query = this.notificationRepo
      .createQueryBuilder('notification')
      .where('notification.user_id = :userId', { userId })
      .andWhere('notification.deleted_at IS NULL');

    if (organizationId) {
      query.andWhere(
        "COALESCE(notification.data ->> 'organizationId', notification.data ->> 'orgId') = :organizationId",
        { organizationId },
      );
    }

    return query;
  }

  private applyFeedScopeConstraint(
    query: SelectQueryBuilder<Notification>,
    scope: NotificationFeedScope,
  ): void {
    if (scope !== NotificationFeedScope.ACTIVITY) {
      return;
    }

    query.andWhere(
      "COALESCE(notification.data ->> 'eventType', '') IN (:...activityEventTypes)",
      {
        activityEventTypes: [...NOTIFICATION_ACTIVITY_EVENT_TYPES],
      },
    );
  }

  private emitNotificationUpdated(notification: Notification): void {
    this.eventEmitter.emit(NOTIFICATION_EVENTS.UPDATED, {
      userId: notification.userId,
      notification: this.toRealtimePayload(notification),
    });
  }

  private normalizeIds(values: string[]): string[] {
    return Array.from(
      new Set(
        (values || [])
          .map((value) => value?.trim())
          .filter((value): value is string => Boolean(value)),
      ),
    );
  }

  private toRealtimePayload(
    notification: Notification,
  ): NotificationRealtimePayload {
    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      isRead: notification.isRead,
      content: notification.content ?? undefined,
      campaignId: notification.campaignId ?? undefined,
      senderId: notification.senderId ?? undefined,
      senderName: notification.senderName ?? undefined,
      senderAvatarUrl: notification.senderAvatarUrl ?? undefined,
      data: this.toNotificationDataPayload(notification),
      createdAt: notification.createdAt.toISOString(),
    };
  }

  private toNotificationDataPayload(
    notification: Notification,
  ): Record<string, unknown> {
    return decorateNotificationDataWithFeedScope(
      notification.data as Record<string, unknown> | null,
    );
  }
}
