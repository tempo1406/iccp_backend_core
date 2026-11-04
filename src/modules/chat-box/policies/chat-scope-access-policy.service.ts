import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ChatMemberRole,
  ChatRoomMember,
} from '@modules/chat-box/room-management/entities/room-member.entity';
import {
  ChatContextScope,
  ChatRoom,
} from '@modules/chat-box/room-management/entities/room.entity';
import { ProjectMember } from '@modules/project/core/entities/project-member.entity';
import { Project } from '@modules/project/core/entities/project.entity';
import { ProjectCoreService } from '@modules/project/core/project-core.service';
import { DataSource, In, IsNull, Repository } from 'typeorm';

type RoomScopeShape = Pick<ChatRoom, 'organizationId' | 'contextScope' | 'contextId'>;

export type ChatRoomScopeFilter = {
  contextScope?: ChatContextScope;
  contextId?: string;
};

export type SyncProjectRoomMembershipResult = {
  affectedRoomCount: number;
  deactivatedMembershipCount: number;
  transferredOwnershipCount: number;
  clearedOwnershipCount: number;
};

@Injectable()
export class ChatScopeAccessPolicyService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,

    @InjectRepository(ProjectMember)
    private readonly projectMemberRepo: Repository<ProjectMember>,

    @InjectRepository(ChatRoom)
    private readonly roomRepo: Repository<ChatRoom>,

    @InjectRepository(ChatRoomMember)
    private readonly roomMemberRepo: Repository<ChatRoomMember>,

    private readonly projectCoreService: ProjectCoreService,
    private readonly dataSource: DataSource,
  ) {}

  async resolveCreateRoomScope(
    organizationId: string,
    userId: string,
    contextScope?: ChatContextScope,
    contextId?: string,
  ): Promise<Required<Pick<RoomScopeShape, 'contextScope'>> & Pick<RoomScopeShape, 'contextId'>> {
    const effectiveScope = contextScope ?? ChatContextScope.ORGANIZATION;
    this.assertSupportedContextScope(effectiveScope);

    if (effectiveScope === ChatContextScope.ORGANIZATION) {
      return {
        contextScope: ChatContextScope.ORGANIZATION,
        contextId: undefined,
      };
    }

    if (!contextId) {
      throw new BadRequestException(
        'contextId is required for project-scoped rooms',
      );
    }

    await this.assertProjectScopeAccess(organizationId, contextId, userId);

    return {
      contextScope: ChatContextScope.PROJECT,
      contextId,
    };
  }

  async validateRoomScopeFilter(
    organizationId: string,
    userId: string,
    filter: ChatRoomScopeFilter,
  ): Promise<ChatRoomScopeFilter> {
    if (!filter.contextScope && !filter.contextId) {
      return {};
    }

    if (filter.contextId && !filter.contextScope) {
      throw new BadRequestException(
        'contextScope is required when contextId is provided',
      );
    }

    const contextScope = filter.contextScope;
    if (!contextScope) {
      return {};
    }

    this.assertSupportedContextScope(contextScope);

    if (contextScope === ChatContextScope.ORGANIZATION) {
      if (filter.contextId) {
        throw new BadRequestException(
          'contextId is not allowed for organization scope filters',
        );
      }
      return { contextScope };
    }

    if (filter.contextId) {
      await this.assertProjectScopeAccess(
        organizationId,
        filter.contextId,
        userId,
      );
    }

    return {
      contextScope,
      contextId: filter.contextId,
    };
  }

  async assertRoomScopeAccess(room: RoomScopeShape, userId: string): Promise<void> {
    this.assertSupportedContextScope(room.contextScope);

    if (room.contextScope === ChatContextScope.ORGANIZATION) {
      return;
    }

    if (!room.contextId) {
      throw new BadRequestException('Project-scoped room is missing contextId');
    }

    await this.assertProjectScopeAccess(room.organizationId, room.contextId, userId);
  }

  async assertUsersCanJoinRoomScope(
    room: RoomScopeShape,
    userIds: string[],
  ): Promise<void> {
    const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
    if (!uniqueUserIds.length) {
      return;
    }

    this.assertSupportedContextScope(room.contextScope);

    if (room.contextScope === ChatContextScope.ORGANIZATION) {
      return;
    }

    if (!room.contextId) {
      throw new BadRequestException('Project-scoped room is missing contextId');
    }

    await this.assertUsersBelongToProject(
      room.organizationId,
      room.contextId,
      uniqueUserIds,
    );
  }

  async syncProjectRoomMembershipRemoval(
    projectId: string,
    organizationId: string,
    userId: string,
  ): Promise<SyncProjectRoomMembershipResult> {
    const project = await this.projectCoreService.getProjectEntity(
      projectId,
      organizationId,
    );

    return this.dataSource.transaction(async (manager) => {
      const scopedRooms = await manager.find(ChatRoom, {
        where: {
          organizationId,
          contextScope: ChatContextScope.PROJECT,
          contextId: projectId,
        },
      });

      if (!scopedRooms.length) {
        return {
          affectedRoomCount: 0,
          deactivatedMembershipCount: 0,
          transferredOwnershipCount: 0,
          clearedOwnershipCount: 0,
        };
      }

      const roomIds = scopedRooms.map((room) => room.id);
      const memberships = await manager.find(ChatRoomMember, {
        where: {
          organizationId,
          userId,
          roomId: In(roomIds),
          isActive: true,
        },
      });

      if (!memberships.length) {
        return {
          affectedRoomCount: 0,
          deactivatedMembershipCount: 0,
          transferredOwnershipCount: 0,
          clearedOwnershipCount: 0,
        };
      }

      const membershipsByRoomId = new Map(
        memberships.map((membership) => [membership.roomId, membership]),
      );
      const candidateMembers = await manager.find(ChatRoomMember, {
        where: {
          organizationId,
          roomId: In(roomIds),
          isActive: true,
        },
      });

      const candidateUserIds = [...new Set(
        candidateMembers
          .map((member) => member.userId)
          .filter((candidateUserId) => candidateUserId !== userId),
      )];
      const projectMemberRows =
        candidateUserIds.length > 0
          ? await manager.find(ProjectMember, {
              where: {
                projectId,
                organizationId,
                userId: In(candidateUserIds),
                isActive: true,
                deletedAt: IsNull(),
              },
              select: ['userId'],
            })
          : [];

      const activeProjectUserIds = new Set([
        project.createdBy,
        ...(project.managerId ?? []),
        ...projectMemberRows.map((member) => member.userId),
      ]);

      const candidateMembersByRoomId = new Map<string, ChatRoomMember[]>();
      for (const member of candidateMembers) {
        if (member.userId === userId) {
          continue;
        }
        if (!activeProjectUserIds.has(member.userId)) {
          continue;
        }

        const items = candidateMembersByRoomId.get(member.roomId) ?? [];
        items.push(member);
        candidateMembersByRoomId.set(member.roomId, items);
      }

      const now = new Date();
      const roomsToUpdate: ChatRoom[] = [];
      const replacementsToUpdate: ChatRoomMember[] = [];
      let transferredOwnershipCount = 0;
      let clearedOwnershipCount = 0;

      for (const room of scopedRooms) {
        const membership = membershipsByRoomId.get(room.id);
        if (!membership || membership.memberRole !== ChatMemberRole.OWNER) {
          continue;
        }

        const replacement = (candidateMembersByRoomId.get(room.id) ?? [])
          .sort(
            (a, b) =>
              this.memberRolePriority(a.memberRole) -
              this.memberRolePriority(b.memberRole),
          )[0];

        if (replacement) {
          replacement.memberRole = ChatMemberRole.OWNER;
          room.ownerId = replacement.userId;
          replacementsToUpdate.push(replacement);
          roomsToUpdate.push(room);
          transferredOwnershipCount += 1;
          continue;
        }

        room.ownerId = undefined;
        roomsToUpdate.push(room);
        clearedOwnershipCount += 1;
      }

      for (const membership of memberships) {
        membership.isActive = false;
        membership.leftAt = now;
      }

      if (replacementsToUpdate.length > 0) {
        await manager.save(ChatRoomMember, replacementsToUpdate);
      }
      if (roomsToUpdate.length > 0) {
        await manager.save(ChatRoom, roomsToUpdate);
      }
      await manager.save(ChatRoomMember, memberships);

      return {
        affectedRoomCount: memberships.length,
        deactivatedMembershipCount: memberships.length,
        transferredOwnershipCount,
        clearedOwnershipCount,
      };
    });
  }

  private assertSupportedContextScope(contextScope: ChatContextScope): void {
    if (contextScope === ChatContextScope.DEPARTMENT) {
      throw new BadRequestException(
        'contextScope=department is not supported yet in chat-box',
      );
    }
  }

  private async assertProjectScopeAccess(
    organizationId: string,
    projectId: string,
    userId: string,
  ): Promise<void> {
    await this.projectCoreService.getProjectEntity(projectId, organizationId);
    await this.projectCoreService.ensureUserInProject(
      projectId,
      organizationId,
      userId,
    );
  }

  private async assertUsersBelongToProject(
    organizationId: string,
    projectId: string,
    userIds: string[],
  ): Promise<void> {
    const uniqueUserIds = [...new Set(userIds)];
    if (!uniqueUserIds.length) {
      return;
    }

    const project = await this.projectRepo.findOne({
      where: {
        id: projectId,
        organizationId,
        deletedAt: IsNull(),
      },
    });
    if (!project) {
      throw new BadRequestException('Project not found');
    }

    const projectMembers = await this.projectMemberRepo.find({
      where: {
        projectId,
        organizationId,
        userId: In(uniqueUserIds),
        isActive: true,
        deletedAt: IsNull(),
      },
      select: ['userId'],
    });

    const activeProjectUserIds = new Set([
      project.createdBy,
      ...(project.managerId ?? []),
      ...projectMembers.map((member) => member.userId),
    ]);
    const missingUserIds = uniqueUserIds.filter(
      (candidateUserId) => !activeProjectUserIds.has(candidateUserId),
    );

    if (missingUserIds.length > 0) {
      throw new ForbiddenException(
        `Users are not active members of project: ${missingUserIds.join(', ')}`,
      );
    }
  }

  private memberRolePriority(role: ChatMemberRole): number {
    switch (role) {
      case ChatMemberRole.ADMIN:
        return 1;
      case ChatMemberRole.MEMBER:
        return 2;
      case ChatMemberRole.GUEST:
        return 3;
      case ChatMemberRole.OWNER:
      default:
        return 0;
    }
  }
}
