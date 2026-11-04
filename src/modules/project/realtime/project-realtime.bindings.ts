/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ModuleRef } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { ProjectCoreService } from '../core/project-core.service';
import { ProjectMemberService } from '../project-member/project-member.service';
import { StatusTaskService } from '../status-task/status-task.service';
import { StatusTask } from '../status-task/entities/status-task.entity';
import { StatusTaskResponse } from '../status-task/dto/response/status-task.response';
import { PROJECT_REALTIME_EVENTS } from './constants/project-realtime-events.constant';

@Injectable()
export class ProjectRealtimeBindings implements OnModuleInit {
  private projectMemberService!: ProjectMemberService;
  private statusTaskService!: StatusTaskService;

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly eventEmitter: EventEmitter2,
    private readonly projectCoreService: ProjectCoreService,
    @InjectRepository(StatusTask)
    private readonly statusTaskRepo: Repository<StatusTask>,
  ) {}

  onModuleInit(): void {
    this.projectMemberService = this.moduleRef.get(ProjectMemberService, {
      strict: false,
    });
    this.statusTaskService = this.moduleRef.get(StatusTaskService, {
      strict: false,
    });
    this.bindProjectMemberRealtime();
    this.bindStatusRealtime();
  }

  private bindProjectMemberRealtime(): void {
    const service = this.projectMemberService as ProjectMemberService & {
      __projectRealtimePatched?: boolean;
      updateMemberRole: ProjectMemberService['updateMemberRole'];
      removeMember: ProjectMemberService['removeMember'];
    };

    if (service.__projectRealtimePatched) return;

    const originalUpdateMemberRole = service.updateMemberRole.bind(service);
    service.updateMemberRole = (async (
      projectId,
      memberId,
      orgId,
      actorUserId,
      dto,
    ) => {
      const response = await originalUpdateMemberRole(
        projectId,
        memberId,
        orgId,
        actorUserId,
        dto,
      );

      this.eventEmitter.emit(PROJECT_REALTIME_EVENTS.MEMBER_UPDATED, {
        ...this.buildRealtimeMeta(projectId, actorUserId),
        member: response,
      });

      return response;
    }) as ProjectMemberService['updateMemberRole'];

    const originalRemoveMember = service.removeMember.bind(service);
    service.removeMember = (async (projectId, memberId, orgId, actorUserId) => {
      const member = await this.projectCoreService.getProjectMemberResponseById(
        projectId,
        orgId,
        memberId,
      );

      await originalRemoveMember(projectId, memberId, orgId, actorUserId);

      this.eventEmitter.emit(PROJECT_REALTIME_EVENTS.MEMBER_REMOVED, {
        ...this.buildRealtimeMeta(projectId, actorUserId),
        memberId: member.id,
        userId: member.userId,
      });
    }) as ProjectMemberService['removeMember'];

    service.__projectRealtimePatched = true;
  }

  private bindStatusRealtime(): void {
    const service = this.statusTaskService as StatusTaskService & {
      __projectRealtimePatched?: boolean;
      createStatus: StatusTaskService['createStatus'];
      updateStatus: StatusTaskService['updateStatus'];
      deleteStatus: StatusTaskService['deleteStatus'];
    };

    if (service.__projectRealtimePatched) return;

    const originalCreateStatus = service.createStatus.bind(service);
    service.createStatus = (async (projectId, orgId, userId, dto) => {
      const response = await originalCreateStatus(
        projectId,
        orgId,
        userId,
        dto,
      );

      this.eventEmitter.emit(PROJECT_REALTIME_EVENTS.STATUS_CREATED, {
        ...this.buildRealtimeMeta(projectId, userId),
        statuses: await this.getActiveStatusResponses(projectId, orgId),
      });

      return response;
    }) as StatusTaskService['createStatus'];

    const originalUpdateStatus = service.updateStatus.bind(service);
    service.updateStatus = (async (projectId, statusId, orgId, userId, dto) => {
      const response = await originalUpdateStatus(
        projectId,
        statusId,
        orgId,
        userId,
        dto,
      );

      this.eventEmitter.emit(PROJECT_REALTIME_EVENTS.STATUS_UPDATED, {
        ...this.buildRealtimeMeta(projectId, userId),
        statuses: await this.getActiveStatusResponses(projectId, orgId),
      });

      return response;
    }) as StatusTaskService['updateStatus'];

    const originalDeleteStatus = service.deleteStatus.bind(service);
    service.deleteStatus = (async (projectId, statusId, orgId, userId, dto) => {
      await originalDeleteStatus(projectId, statusId, orgId, userId, dto);

      this.eventEmitter.emit(PROJECT_REALTIME_EVENTS.STATUS_DELETED, {
        ...this.buildRealtimeMeta(projectId, userId),
        statuses: await this.getActiveStatusResponses(projectId, orgId),
        deletedStatusId: statusId,
      });
    }) as StatusTaskService['deleteStatus'];

    service.__projectRealtimePatched = true;
  }

  private async getActiveStatusResponses(
    projectId: string,
    orgId: string,
  ): Promise<StatusTaskResponse[]> {
    const statuses = await this.statusTaskRepo.find({
      where: { projectId, organizationId: orgId, deletedAt: IsNull() },
      order: { orderIndex: 'ASC', createdAt: 'ASC' },
    });

    return plainToInstance(StatusTaskResponse, statuses);
  }

  private buildRealtimeMeta(
    projectId: string,
    actorUserId: string,
  ): {
    projectId: string;
    actorUserId: string;
    occurredAt: string;
  } {
    return {
      projectId,
      actorUserId,
      occurredAt: new Date().toISOString(),
    };
  }
}
