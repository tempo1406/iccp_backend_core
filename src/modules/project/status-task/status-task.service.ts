import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { ProjectCoreService } from '../core/project-core.service';
import { StatusTask } from './entities/status-task.entity';
import { Task } from '../task-management/entities/task.entity';
import { CreateStatusTaskRequest } from './dto/request/create-status-task.request';
import { UpdateStatusTaskRequest } from './dto/request/update-status-task.request';
import { StatusTaskResponse } from './dto/response/status-task.response';
import { DeleteStatusTaskRequest } from './dto/request/delete-status-task.request';
import { PERMISSIONS } from '@modules/rbac/constant/permission.constant';

@Injectable()
export class StatusTaskService {
  constructor(
    @InjectRepository(StatusTask)
    private readonly statusTaskRepo: Repository<StatusTask>,

    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,

    private readonly projectCoreService: ProjectCoreService,
  ) {}

  async getStatuses(
    projectId: string,
    orgId: string,
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<StatusTaskResponse[]> {
    await this.projectCoreService.ensureUserInProject(projectId, orgId, userId, {
      allowOrgAdmin: true,
    });
    await this.projectCoreService.ensureDefaultTaskStatuses(projectId, orgId);
    await this.projectCoreService.assertProjectPermission(
      userId,
      orgId,
      projectId,
      PERMISSIONS.PROJECTS.STATUSES.LIST,
    );

    const take = Math.max(1, Math.min(limit, 100));
    const skip = (Math.max(page, 1) - 1) * take;

    const statuses = await this.statusTaskRepo.find({
      where: { projectId, organizationId: orgId, deletedAt: IsNull() },
      order: { orderIndex: 'ASC', createdAt: 'ASC' },
      skip,
      take,
    });

    return plainToInstance(StatusTaskResponse, statuses);
  }

  async createStatus(
    projectId: string,
    orgId: string,
    userId: string,
    dto: CreateStatusTaskRequest,
  ): Promise<StatusTaskResponse> {
    await this.projectCoreService.ensureUserInProject(projectId, orgId, userId, {
      allowOrgAdmin: true,
    });
    await this.assertCanManageStatuses(
      projectId,
      orgId,
      userId,
      PERMISSIONS.PROJECTS.STATUSES.CREATE,
    );

    const saved = await this.statusTaskRepo.manager.transaction(
      async (manager) => {
        const duplicatedName = await manager.findOne(StatusTask, {
          where: {
            projectId,
            organizationId: orgId,
            deletedAt: IsNull(),
            name: dto.name,
          },
        });
        if (duplicatedName) {
          throw new BadRequestException(
            'Status name already exists in this project',
          );
        }

        const existing = await manager.find(StatusTask, {
          where: { projectId, organizationId: orgId, deletedAt: IsNull() },
          order: { orderIndex: 'ASC', createdAt: 'ASC' },
        });

        const insertAt = this.clampOrderIndex(
          dto.orderIndex ?? existing.length + 1,
          1,
          existing.length + 1,
        );
        const isDefault = existing.length === 0;

        const status = manager.create(StatusTask, {
          projectId,
          organizationId: orgId,
          name: dto.name,
          orderIndex: insertAt,
          isDefault,
        });

        const reordered = [...existing];
        reordered.splice(insertAt - 1, 0, status);
        this.normalizeOrderIndexes(reordered);

        const savedStatuses = await manager.save(StatusTask, reordered);
        return savedStatuses.find((item) => item.id === status.id) ?? status;
      },
    );

    return plainToInstance(StatusTaskResponse, saved);
  }

  async updateStatus(
    projectId: string,
    statusId: string,
    orgId: string,
    userId: string,
    dto: UpdateStatusTaskRequest,
  ): Promise<StatusTaskResponse> {
    await this.projectCoreService.ensureUserInProject(projectId, orgId, userId, {
      allowOrgAdmin: true,
    });
    await this.assertCanManageStatuses(
      projectId,
      orgId,
      userId,
      PERMISSIONS.PROJECTS.STATUSES.UPDATE,
    );

    const saved = await this.statusTaskRepo.manager.transaction(
      async (manager) => {
        const status = await manager.findOne(StatusTask, {
          where: {
            id: statusId,
            projectId,
            organizationId: orgId,
            deletedAt: IsNull(),
          },
        });
        if (!status) throw new NotFoundException('Status not found');

        if (dto.name !== undefined && dto.name !== status.name) {
          const duplicatedName = await manager.findOne(StatusTask, {
            where: {
              projectId,
              organizationId: orgId,
              deletedAt: IsNull(),
              name: dto.name,
            },
          });
          if (duplicatedName) {
            throw new BadRequestException(
              'Status name already exists in this project',
            );
          }
          status.name = dto.name;
        }

        if (dto.isDefault !== undefined) {
          if (dto.isDefault) {
            await manager.update(
              StatusTask,
              { projectId, organizationId: orgId, deletedAt: IsNull() },
              { isDefault: false },
            );
          }
          status.isDefault = dto.isDefault;
        }

        if (dto.orderIndex === undefined) {
          return manager.save(StatusTask, status);
        }

        const activeStatuses = await manager.find(StatusTask, {
          where: { projectId, organizationId: orgId, deletedAt: IsNull() },
          order: { orderIndex: 'ASC', createdAt: 'ASC' },
        });
        const statusesWithoutCurrent = activeStatuses.filter(
          (item) => item.id !== status.id,
        );
        const insertAt = this.clampOrderIndex(
          dto.orderIndex,
          1,
          activeStatuses.length,
        );
        statusesWithoutCurrent.splice(insertAt - 1, 0, status);
        this.normalizeOrderIndexes(statusesWithoutCurrent);

        const savedStatuses = await manager.save(
          StatusTask,
          statusesWithoutCurrent,
        );
        return savedStatuses.find((item) => item.id === status.id) ?? status;
      },
    );

    await this.projectCoreService.recalculateProjectProgress(projectId, orgId);

    return plainToInstance(StatusTaskResponse, saved);
  }

  async deleteStatus(
    projectId: string,
    statusId: string,
    orgId: string,
    userId: string,
    dto?: DeleteStatusTaskRequest,
  ): Promise<void> {
    await this.projectCoreService.ensureUserInProject(projectId, orgId, userId, {
      allowOrgAdmin: true,
    });
    await this.assertCanManageStatuses(
      projectId,
      orgId,
      userId,
      PERMISSIONS.PROJECTS.STATUSES.DELETE,
    );

    const status = await this.statusTaskRepo.findOne({
      where: {
        id: statusId,
        projectId,
        organizationId: orgId,
        deletedAt: IsNull(),
      },
    });
    if (!status) throw new NotFoundException('Status not found');

    const activeStatuses = await this.statusTaskRepo.find({
      where: { projectId, organizationId: orgId, deletedAt: IsNull() },
      order: { orderIndex: 'ASC' },
    });
    if (activeStatuses.length <= 1) {
      throw new BadRequestException(
        'Cannot delete the last active status in project',
      );
    }

    const moveTarget = await this.resolveMoveTargetStatus(
      activeStatuses,
      status,
      projectId,
      orgId,
      dto?.moveToStatusId,
    );

    await this.statusTaskRepo.manager.transaction(async (manager) => {
      await manager
        .createQueryBuilder()
        .update(Task)
        .set({ statusId: moveTarget.id })
        .where('project_id = :projectId', { projectId })
        .andWhere('organization_id = :orgId', { orgId })
        .andWhere('status_id = :statusId', { statusId: status.id })
        .andWhere('deleted_at IS NULL')
        .execute();

      await manager.update(
        StatusTask,
        { id: status.id, projectId, organizationId: orgId },
        { deletedAt: new Date(), deletedBy: userId, isDefault: false },
      );

      const remainingStatuses = await manager.find(StatusTask, {
        where: { projectId, organizationId: orgId, deletedAt: IsNull() },
        order: { orderIndex: 'ASC', createdAt: 'ASC' },
      });
      this.normalizeOrderIndexes(remainingStatuses);
      await manager.save(StatusTask, remainingStatuses);
    });

    await this.projectCoreService.recalculateProjectProgress(projectId, orgId);
  }

  private async resolveMoveTargetStatus(
    activeStatuses: StatusTask[],
    deletingStatus: StatusTask,
    projectId: string,
    orgId: string,
    moveToStatusId?: string,
  ): Promise<StatusTask> {
    if (moveToStatusId) {
      const target = activeStatuses.find((item) => item.id === moveToStatusId);
      if (!target || target.id === deletingStatus.id) {
        throw new BadRequestException(
          'moveToStatusId must be another active status in this project',
        );
      }
      return target;
    }

    const previous = activeStatuses
      .filter(
        (item) =>
          item.id !== deletingStatus.id &&
          item.orderIndex < deletingStatus.orderIndex,
      )
      .sort((a, b) => b.orderIndex - a.orderIndex)[0];
    if (previous) return previous;

    const next = activeStatuses
      .filter(
        (item) =>
          item.id !== deletingStatus.id &&
          item.orderIndex > deletingStatus.orderIndex,
      )
      .sort((a, b) => a.orderIndex - b.orderIndex)[0];
    if (next) return next;

    const fallback = await this.statusTaskRepo.findOne({
      where: { projectId, organizationId: orgId, deletedAt: IsNull() },
      order: { orderIndex: 'ASC' },
    });
    if (!fallback || fallback.id === deletingStatus.id) {
      throw new BadRequestException(
        'No available status to move tasks before deletion',
      );
    }
    return fallback;
  }

  private async assertCanManageStatuses(
    projectId: string,
    orgId: string,
    userId: string,
    permissionCode: string,
  ): Promise<void> {
    const hasPermission = await this.projectCoreService.hasProjectPermission(
      userId,
      orgId,
      projectId,
      permissionCode,
    );
    if (hasPermission) return;

    throw new ForbiddenException('Missing permission: ' + permissionCode);
  }

  private clampOrderIndex(
    orderIndex: number,
    min: number,
    max: number,
  ): number {
    return Math.max(min, Math.min(orderIndex, max));
  }

  private normalizeOrderIndexes(statuses: StatusTask[]): void {
    statuses.forEach((item, index) => {
      item.orderIndex = index + 1;
    });
  }
}
