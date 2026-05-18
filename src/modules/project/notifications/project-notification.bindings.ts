/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ProjectMember } from '../core/entities/project-member.entity';
import { ProjectMemberService } from '../project-member/project-member.service';
import { ProjectRoleManageService } from '../role-manage/project-role-manage.service';
import { PROJECT_NOTIFICATION_EVENTS } from './constants/project-notification-events.constant';

@Injectable()
export class ProjectNotificationBindings implements OnModuleInit {
  private projectMemberService!: ProjectMemberService;
  private projectRoleManageService!: ProjectRoleManageService;

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly eventEmitter: EventEmitter2,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepo: Repository<ProjectMember>,
  ) {}

  onModuleInit(): void {
    this.projectMemberService = this.moduleRef.get(ProjectMemberService, {
      strict: false,
    });
    this.projectRoleManageService = this.moduleRef.get(
      ProjectRoleManageService,
      {
        strict: false,
      },
    );

    this.bindProjectMemberNotifications();
    this.bindProjectRoleNotifications();
  }

  private bindProjectMemberNotifications(): void {
    const service = this.projectMemberService as ProjectMemberService & {
      __projectNotificationPatched?: boolean;
      updateMemberRole: ProjectMemberService['updateMemberRole'];
      removeMember: ProjectMemberService['removeMember'];
    };

    if (service.__projectNotificationPatched) return;

    const originalUpdateMemberRole = service.updateMemberRole.bind(service);
    service.updateMemberRole = (async (
      projectId,
      memberId,
      orgId,
      actorUserId,
      dto,
    ) => {
      const member = await this.projectMemberRepo.findOne({
        where: {
          id: memberId,
          projectId,
          organizationId: orgId,
          deletedAt: IsNull(),
        },
      });

      const response = await originalUpdateMemberRole(
        projectId,
        memberId,
        orgId,
        actorUserId,
        dto,
      );

      if (member && dto.roleId !== undefined) {
        this.eventEmitter.emit(
          PROJECT_NOTIFICATION_EVENTS.MEMBER_ROLE_CHANGED,
          {
            projectId,
            organizationId: orgId,
            actorUserId,
            occurredAt: new Date().toISOString(),
            targetUserId: member.userId,
            changeType: 'replaced',
            roleId: dto.roleId,
            previousRoleId: member.roleId,
          },
        );
      }

      return response;
    }) as ProjectMemberService['updateMemberRole'];

    const originalRemoveMember = service.removeMember.bind(service);
    service.removeMember = (async (projectId, memberId, orgId, actorUserId) => {
      const member = await this.projectMemberRepo.findOne({
        where: {
          id: memberId,
          projectId,
          organizationId: orgId,
          deletedAt: IsNull(),
        },
      });

      await originalRemoveMember(projectId, memberId, orgId, actorUserId);

      if (member) {
        this.eventEmitter.emit(PROJECT_NOTIFICATION_EVENTS.MEMBER_REMOVED, {
          projectId,
          organizationId: orgId,
          actorUserId,
          occurredAt: new Date().toISOString(),
          targetUserId: member.userId,
        });
      }
    }) as ProjectMemberService['removeMember'];

    service.__projectNotificationPatched = true;
  }

  private bindProjectRoleNotifications(): void {
    const service = this
      .projectRoleManageService as ProjectRoleManageService & {
      __projectNotificationPatched?: boolean;
      assignRoleToMember: ProjectRoleManageService['assignRoleToMember'];
      revokeRoleFromMember: ProjectRoleManageService['revokeRoleFromMember'];
    };

    if (service.__projectNotificationPatched) return;

    const originalAssignRoleToMember = service.assignRoleToMember.bind(service);
    service.assignRoleToMember = (async (dto, callerId, projectId, orgId) => {
      await originalAssignRoleToMember(dto, callerId, projectId, orgId);

      this.eventEmitter.emit(PROJECT_NOTIFICATION_EVENTS.MEMBER_ROLE_CHANGED, {
        projectId,
        organizationId: orgId,
        actorUserId: callerId,
        occurredAt: new Date().toISOString(),
        targetUserId: dto.userId,
        changeType: 'assigned',
        roleId: dto.roleId,
      });
    }) as ProjectRoleManageService['assignRoleToMember'];

    const originalRevokeRoleFromMember =
      service.revokeRoleFromMember.bind(service);
    service.revokeRoleFromMember = (async (dto, projectId, orgId, callerId) => {
      await originalRevokeRoleFromMember(dto, projectId, orgId, callerId);

      this.eventEmitter.emit(PROJECT_NOTIFICATION_EVENTS.MEMBER_ROLE_CHANGED, {
        projectId,
        organizationId: orgId,
        actorUserId: callerId,
        occurredAt: new Date().toISOString(),
        targetUserId: dto.userId,
        changeType: 'revoked',
        roleId: dto.roleId,
      });
    }) as ProjectRoleManageService['revokeRoleFromMember'];

    service.__projectNotificationPatched = true;
  }
}
