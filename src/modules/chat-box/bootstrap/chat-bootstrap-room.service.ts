import {
  ChatJoinSource,
  ChatMemberRole,
  ChatRoomMember,
} from '@modules/chat-box/room-management/entities/room-member.entity';
import {
  ChatContextScope,
  ChatRoom,
  ChatRoomType,
  ChatRoomVisibility,
} from '@modules/chat-box/room-management/entities/room.entity';
import {
  buildProjectGeneralRoomKey,
  buildProjectGeneralRoomName,
  CHAT_DEFAULT_ROOM_KEYS,
  CHAT_DEFAULT_ROOM_NAMES,
} from '@modules/chat-box/bootstrap/constants/chat-default-room.constant';
import { OrganizationMember } from '@modules/organization/core/entities/organization-member.entity';
import { ProjectMember } from '@modules/project/core/entities/project-member.entity';
import { Project } from '@modules/project/core/entities/project.entity';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';

type ManagedRoomSeed = {
  organizationId: string;
  contextScope: ChatContextScope;
  contextId?: string;
  roomKey: string;
  roomName: string;
  topic?: string;
  description?: string;
  ownerUserId: string;
  createdByUserId: string;
};

@Injectable()
export class ChatBootstrapRoomService {
  private readonly logger = new Logger(ChatBootstrapRoomService.name);

  constructor(
    @InjectRepository(ChatRoom)
    private readonly roomRepo: Repository<ChatRoom>,

    @InjectRepository(ChatRoomMember)
    private readonly roomMemberRepo: Repository<ChatRoomMember>,

    @InjectRepository(OrganizationMember)
    private readonly organizationMemberRepo: Repository<OrganizationMember>,

    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,

    @InjectRepository(ProjectMember)
    private readonly projectMemberRepo: Repository<ProjectMember>,
  ) {}

  async ensureOrganizationDefaultRooms(
    organizationId: string,
    ownerUserId: string,
  ): Promise<void> {
    const activeOrgMemberIds = await this.getActiveOrganizationMemberIds(
      organizationId,
    );
    const memberIds = Array.from(
      new Set([ownerUserId, ...activeOrgMemberIds].filter(Boolean)),
    );
    if (memberIds.length === 0) {
      return;
    }

    const [generalRoom, announcementsRoom] = await Promise.all([
      this.ensureManagedRoom({
        organizationId,
        contextScope: ChatContextScope.ORGANIZATION,
        roomKey: CHAT_DEFAULT_ROOM_KEYS.ORGANIZATION_GENERAL,
        roomName: CHAT_DEFAULT_ROOM_NAMES.ORGANIZATION_GENERAL,
        topic: 'Company-wide conversations',
        description: 'Default channel for organization-wide chat.',
        ownerUserId,
        createdByUserId: ownerUserId,
      }),
      this.ensureManagedRoom({
        organizationId,
        contextScope: ChatContextScope.ORGANIZATION,
        roomKey: CHAT_DEFAULT_ROOM_KEYS.ORGANIZATION_ANNOUNCEMENTS,
        roomName: CHAT_DEFAULT_ROOM_NAMES.ORGANIZATION_ANNOUNCEMENTS,
        topic: 'Official company updates and announcements',
        description:
          'Read-only channel for members. Posting is restricted to owner/admin.',
        ownerUserId,
        createdByUserId: ownerUserId,
      }),
    ]);

    await Promise.all([
      this.ensureRoomMemberships(generalRoom, memberIds, ownerUserId),
      this.ensureRoomMemberships(announcementsRoom, memberIds, ownerUserId),
    ]);
  }

  async syncOrganizationDefaultRoomsForMember(
    organizationId: string,
    userId: string,
  ): Promise<void> {
    const activeMember = await this.organizationMemberRepo.findOne({
      where: {
        organizationId,
        userId,
        isActive: true,
        isDeleted: false,
      },
      select: ['userId'],
    });
    if (!activeMember) {
      return;
    }

    const rooms = await this.roomRepo.find({
      where: {
        organizationId,
        contextScope: ChatContextScope.ORGANIZATION,
        roomType: ChatRoomType.CHANNEL,
        roomKey: In([
          CHAT_DEFAULT_ROOM_KEYS.ORGANIZATION_GENERAL,
          CHAT_DEFAULT_ROOM_KEYS.ORGANIZATION_ANNOUNCEMENTS,
        ]),
      },
      select: ['id', 'organizationId', 'ownerId'],
    });
    if (rooms.length === 0) {
      return;
    }

    await Promise.all(
      rooms.map((room) =>
        this.ensureRoomMemberships(
          room as ChatRoom,
          [userId],
          room.ownerId ?? userId,
        ),
      ),
    );
  }

  async ensureProjectDefaultRoom(
    organizationId: string,
    projectId: string,
    actorUserId: string,
  ): Promise<ChatRoom | undefined> {
    const project = await this.projectRepo.findOne({
      where: {
        id: projectId,
        organizationId,
        deletedAt: IsNull(),
      },
      select: ['id', 'organizationId', 'slug', 'createdBy'],
    });
    if (!project) {
      this.logger.warn(
        `Skip project default room bootstrap: project not found. projectId=${projectId}, organizationId=${organizationId}`,
      );
      return undefined;
    }

    const activeProjectMemberIds = await this.getActiveProjectMemberIds(
      organizationId,
      project.id,
    );
    const memberIds = Array.from(
      new Set([
        project.createdBy,
        actorUserId,
        ...activeProjectMemberIds,
      ].filter(Boolean)),
    );
    const ownerUserId = memberIds.includes(project.createdBy)
      ? project.createdBy
      : memberIds[0];
    if (!ownerUserId) {
      return undefined;
    }

    const room = await this.ensureManagedRoom({
      organizationId,
      contextScope: ChatContextScope.PROJECT,
      contextId: project.id,
      roomKey: buildProjectGeneralRoomKey(project.id),
      roomName: buildProjectGeneralRoomName(project.slug),
      topic: `Default channel for ${project.slug}`,
      description: 'Default project channel for member collaboration.',
      ownerUserId,
      createdByUserId: ownerUserId,
    });

    if (memberIds.length > 0) {
      await this.ensureRoomMemberships(room, memberIds, ownerUserId);
    }

    return room;
  }

  async syncProjectDefaultRoomForMember(
    organizationId: string,
    projectId: string,
    userId: string,
  ): Promise<void> {
    const activeMember = await this.projectMemberRepo.findOne({
      where: {
        organizationId,
        projectId,
        userId,
        isActive: true,
        deletedAt: IsNull(),
      },
      select: ['userId'],
    });
    if (!activeMember) {
      return;
    }

    const room = await this.ensureProjectDefaultRoom(
      organizationId,
      projectId,
      userId,
    );
    if (!room) {
      return;
    }

    await this.ensureRoomMemberships(room, [userId], room.ownerId ?? userId);
  }

  private async ensureManagedRoom(seed: ManagedRoomSeed): Promise<ChatRoom> {
    const existing = await this.roomRepo.findOne({
      where: {
        organizationId: seed.organizationId,
        roomKey: seed.roomKey,
      },
    });

    if (existing) {
      let changed = false;

      if (!existing.name && seed.roomName) {
        existing.name = seed.roomName;
        changed = true;
      }
      if (!existing.topic && seed.topic) {
        existing.topic = seed.topic;
        changed = true;
      }
      if (!existing.description && seed.description) {
        existing.description = seed.description;
        changed = true;
      }
      if (!existing.ownerId && seed.ownerUserId) {
        existing.ownerId = seed.ownerUserId;
        changed = true;
      }

      if (
        existing.contextScope !== seed.contextScope ||
        (existing.contextId ?? undefined) !== (seed.contextId ?? undefined)
      ) {
        this.logger.warn(
          `Managed room scope mismatch for key=${seed.roomKey}, roomId=${existing.id}. Existing scope will be preserved.`,
        );
      }

      if (changed) {
        return this.roomRepo.save(existing);
      }

      return existing;
    }

    const room = this.roomRepo.create({
      organizationId: seed.organizationId,
      roomType: ChatRoomType.CHANNEL,
      visibility: ChatRoomVisibility.PUBLIC,
      name: seed.roomName,
      roomKey: seed.roomKey,
      topic: seed.topic,
      description: seed.description,
      contextScope: seed.contextScope,
      contextId:
        seed.contextScope === ChatContextScope.PROJECT
          ? seed.contextId
          : undefined,
      createdBy: seed.createdByUserId,
      ownerId: seed.ownerUserId,
      allowMemberPinMessages: false,
      allowGuestPinMessages: false,
    });
    return this.roomRepo.save(room);
  }

  private async ensureRoomMemberships(
    room: ChatRoom,
    targetUserIds: string[],
    ownerUserId: string,
  ): Promise<void> {
    const userIds = Array.from(
      new Set([ownerUserId, ...targetUserIds].filter(Boolean)),
    );
    if (userIds.length === 0) {
      return;
    }

    const existingMembers = await this.roomMemberRepo.find({
      where: {
        organizationId: room.organizationId,
        roomId: room.id,
        userId: In(userIds),
      },
    });
    const existingByUserId = new Map(
      existingMembers.map((member) => [member.userId, member]),
    );

    const rowsToSave: ChatRoomMember[] = [];

    for (const targetUserId of userIds) {
      const existing = existingByUserId.get(targetUserId);
      const shouldBeOwner = targetUserId === ownerUserId;

      if (!existing) {
        rowsToSave.push(
          this.roomMemberRepo.create({
            organizationId: room.organizationId,
            roomId: room.id,
            userId: targetUserId,
            memberRole: shouldBeOwner
              ? ChatMemberRole.OWNER
              : ChatMemberRole.MEMBER,
            joinSource: ChatJoinSource.AUTO,
            isActive: true,
          }),
        );
        continue;
      }

      let changed = false;
      if (!existing.isActive) {
        existing.isActive = true;
        existing.leftAt = undefined;
        existing.joinSource = ChatJoinSource.AUTO;
        changed = true;
      }
      if (shouldBeOwner && existing.memberRole !== ChatMemberRole.OWNER) {
        existing.memberRole = ChatMemberRole.OWNER;
        changed = true;
      }

      if (changed) {
        rowsToSave.push(existing);
      }
    }

    if (rowsToSave.length > 0) {
      await this.roomMemberRepo.save(rowsToSave);
    }
  }

  private async getActiveOrganizationMemberIds(
    organizationId: string,
  ): Promise<string[]> {
    const members = await this.organizationMemberRepo.find({
      where: {
        organizationId,
        isActive: true,
        isDeleted: false,
      },
      select: ['userId'],
    });
    return members.map((member) => member.userId);
  }

  private async getActiveProjectMemberIds(
    organizationId: string,
    projectId: string,
  ): Promise<string[]> {
    const members = await this.projectMemberRepo.find({
      where: {
        organizationId,
        projectId,
        isActive: true,
        deletedAt: IsNull(),
      },
      select: ['userId'],
    });
    return members.map((member) => member.userId);
  }
}
