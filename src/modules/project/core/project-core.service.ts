/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as dayjs from 'dayjs';
import { isUUID } from 'class-validator';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Project } from './entities/project.entity';
import { ProjectMember } from './entities/project-member.entity';
import {
  ProjectInvite,
  ProjectInviteRole,
  ProjectInviteStatus,
} from './entities/project-invite.entity';
import { CreateProjectRequest } from './dto/request/create-project.request';
import { UpdateProjectRequest } from './dto/request/update-project.request';
import { CreateProjectInviteRequest } from './dto/request/create-project-invite.request';
import { ProjectResponse } from './dto/response/project.response';
import { ProjectInviteResponse } from './dto/response/project-invite.response';
import { ProjectMemberResponse } from '../project-member/dto/response/project-member.response';
import { OrganizationMember } from '@modules/organization/core/entities/organization-member.entity';
import {
  PERMISSIONS,
  SYSTEM_ROLES,
} from '@modules/rbac/constant/permission.constant';
import { Role } from '@modules/rbac/entities/role.entity';
import { Permission } from '@modules/rbac/entities/permissions.entity';
import { RolePermission } from '@modules/rbac/entities/role-permission.entity';
import { ScopeType, UserRole } from '@modules/rbac/entities/user-role.entity';
import { Task } from '../task-management/entities/task.entity';
import { StatusTask } from '../status-task/entities/status-task.entity';
import { User } from '@modules/users/entities/user.entity';
import { MaillerService } from '@modules/mail/mail.service';
import { AllConfigType } from '@configs/config.type';
import { PROJECT_REALTIME_EVENTS } from '../realtime/constants/project-realtime-events.constant';
import { PROJECT_NOTIFICATION_EVENTS } from '../notifications/constants/project-notification-events.constant';
import {
  ProjectCreatedDomainEvent,
  ProjectMemberJoinedDomainEvent,
  PROJECT_DOMAIN_EVENTS,
} from './constants/project-domain-events.constant';

const PROJECT_OWNER_ROLE_NAME = 'project_owner';
const PROJECT_MANAGER_ROLE_NAME = 'project_manager';
const EMPLOYEE_ROLE_NAME = 'project_employee';
const DEFAULT_TASK_STATUSES = [
  'To Do',
  'In Progress',
  'Review',
  'Done',
] as const;

@Injectable()
export class ProjectCoreService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,

    @InjectRepository(ProjectMember)
    private readonly projectMemberRepo: Repository<ProjectMember>,

    @InjectRepository(ProjectInvite)
    private readonly projectInviteRepo: Repository<ProjectInvite>,

    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,

    @InjectRepository(StatusTask)
    private readonly statusTaskRepo: Repository<StatusTask>,

    @InjectRepository(OrganizationMember)
    private readonly memberRepo: Repository<OrganizationMember>,

    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,

    @InjectRepository(RolePermission)
    private readonly rolePermissionRepo: Repository<RolePermission>,

    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,

    private readonly mailService: MaillerService,
    private readonly configService: ConfigService<AllConfigType>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createProject(
    orgId: string,
    userId: string,
    dto: CreateProjectRequest,
  ): Promise<ProjectResponse> {
    await this.assertOrganizationPermission(
      userId,
      orgId,
      PERMISSIONS.PROJECTS.PROJECTS.CREATE,
    );

    const managerIds = this.uniqueUserIds(dto.managerId ?? []);
    for (const managerId of managerIds) {
      await this.ensureActiveMember(orgId, managerId);
    }
    const slug = await this.deriveUniqueProjectSlug(orgId, dto.name);

    const project = this.projectRepo.create({
      organizationId: orgId,
      name: dto.name,
      description: dto.description,
      slug,
      status: dto.status,
      priority: dto.priority,
      startDate: dto.startDate,
      endDate: dto.endDate,
      managerId: managerIds.length ? managerIds : null,
      createdBy: userId,
      estimatedBudget: dto.estimatedBudget,
      actualBudget: dto.actualBudget,
      budgetCurrency: dto.budgetCurrency,
      progress: 0,
      isActive: true,
    });

    const saved = await this.projectRepo.save(project);
    await this.ensureDefaultTaskStatuses(saved.id, saved.organizationId);

    await this.ensureProjectMember(
      saved.id,
      saved.organizationId,
      userId,
      userId,
    );

    await this.ensureProjectOwnerRole(
      saved.organizationId,
      saved.id,
      userId,
      userId,
    );

    for (const managerId of managerIds) {
      await this.ensureProjectMember(
        saved.id,
        saved.organizationId,
        managerId,
        userId,
      );

      if (managerId !== userId) {
        await this.ensureProjectManagerRole(
          saved.organizationId,
          saved.id,
          managerId,
          userId,
        );
      }
    }

    const projectCreatedEvent: ProjectCreatedDomainEvent = {
      organizationId: saved.organizationId,
      projectId: saved.id,
      projectSlug: saved.slug,
      ownerUserId: saved.createdBy,
      actorUserId: userId,
      occurredAt: new Date().toISOString(),
    };
    this.eventEmitter.emit(
      PROJECT_DOMAIN_EVENTS.PROJECT_CREATED,
      projectCreatedEvent,
    );

    return plainToInstance(ProjectResponse, saved);
  }

  async ensureDefaultTaskStatuses(
    projectId: string,
    orgId: string,
  ): Promise<void> {
    const activeStatuses = await this.statusTaskRepo.find({
      where: { projectId, organizationId: orgId, deletedAt: IsNull() },
      order: { orderIndex: 'ASC', createdAt: 'ASC' },
    });
    if (activeStatuses.length > 0) return;

    const now = new Date();
    const statuses = DEFAULT_TASK_STATUSES.map((name, index) =>
      this.statusTaskRepo.create({
        projectId,
        organizationId: orgId,
        name,
        orderIndex: index + 1,
        isDefault: index === 0,
        createdAt: now,
        updatedAt: now,
      }),
    );

    await this.statusTaskRepo.save(statuses);
  }

  async getProjects(
    orgId: string,
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<ProjectResponse[]> {
    const canListAll = await this.hasOrganizationPermission(
      userId,
      orgId,
      PERMISSIONS.PROJECTS.PROJECTS.LIST,
    );

    const take = Math.max(1, Math.min(limit, 100));
    const skip = (Math.max(page, 1) - 1) * take;

    if (canListAll) {
      const projects = await this.projectRepo.find({
        where: { organizationId: orgId, deletedAt: IsNull() },
        order: { createdAt: 'DESC' },
        skip,
        take,
      });

      return plainToInstance(ProjectResponse, projects);
    }

    const projects = await this.projectRepo
      .createQueryBuilder('project')
      .leftJoin(
        ProjectMember,
        'pm',
        [
          'pm.project_id = project.id',
          'pm.organization_id = :orgId',
          'pm.user_id = :userId',
          'pm.is_active = true',
          'pm.deleted_at IS NULL',
        ].join(' AND '),
        { orgId, userId },
      )
      .where('project.organization_id = :orgId', { orgId })
      .andWhere('project.deleted_at IS NULL')
      .andWhere(
        '(project.created_by = :userId OR :userId = ANY(COALESCE(project.manager_id, ARRAY[]::uuid[])) OR pm.id IS NOT NULL)',
        { userId },
      )
      .orderBy('project.created_at', 'DESC')
      .skip(skip)
      .take(take)
      .getMany();

    return plainToInstance(ProjectResponse, projects);
  }

  async getProjectBySlug(
    slug: string,
    orgId: string,
    userId: string,
  ): Promise<ProjectResponse> {
    const project = await this.getProjectEntityBySlug(slug, orgId);
    await this.ensureCanViewProject(project, orgId, userId);
    return plainToInstance(ProjectResponse, project);
  }

  async getProject(
    identifier: string,
    orgId: string,
    userId: string,
  ): Promise<ProjectResponse> {
    if (isUUID(identifier)) {
      return this.getProjectById(identifier, orgId, userId);
    }

    return this.getProjectBySlug(identifier, orgId, userId);
  }

  async getProjectById(
    projectId: string,
    orgId: string,
    userId: string,
  ): Promise<ProjectResponse> {
    const project = await this.getProjectEntity(projectId, orgId);
    await this.ensureCanViewProject(project, orgId, userId);
    return plainToInstance(ProjectResponse, project);
  }

  async updateProject(
    projectId: string,
    orgId: string,
    userId: string,
    dto: UpdateProjectRequest,
  ): Promise<ProjectResponse> {
    const project = await this.getProjectEntity(projectId, orgId);
    await this.ensureCanUpdateProject(project, orgId, userId);

    if (dto.managerId !== undefined) {
      const nextManagerIds = this.uniqueUserIds(dto.managerId);

      for (const managerId of nextManagerIds) {
        await this.ensureActiveMember(orgId, managerId);
        await this.ensureProjectMember(project.id, orgId, managerId, userId);
        if (managerId === project.createdBy) {
          await this.ensureProjectOwnerRole(
            project.organizationId,
            project.id,
            managerId,
            userId,
          );
        } else {
          await this.ensureProjectManagerRole(
            project.organizationId,
            project.id,
            managerId,
            userId,
          );
        }
      }

      project.managerId = nextManagerIds.length ? nextManagerIds : null;
    }

    const {
      progress: _progress,
      managerId: _managerId,
      budget: _legacyBudget,
      ...payload
    } = dto as UpdateProjectRequest & { budget?: number };
    Object.assign(project, payload);

    if (dto.name !== undefined || !project.slug) {
      project.slug = await this.deriveUniqueProjectSlug(
        orgId,
        project.name,
        project.id,
      );
    }

    const saved = await this.projectRepo.save(project);
    const response = plainToInstance(ProjectResponse, saved);
    this.eventEmitter.emit(PROJECT_REALTIME_EVENTS.PROJECT_UPDATED, {
      ...this.buildRealtimeMeta(saved.id, userId),
      project: response,
    });
    return response;
  }

  async recalculateProjectProgress(
    projectId: string,
    orgId: string,
  ): Promise<number> {
    const activeTaskBaseQuery = this.taskRepo
      .createQueryBuilder('task')
      .where('task.project_id = :projectId', { projectId })
      .andWhere('task.organization_id = :orgId', { orgId })
      .andWhere('task.deleted_at IS NULL');

    const totalTasks = await activeTaskBaseQuery.getCount();
    let progress = 0;

    if (totalTasks > 0) {
      const doneTasks = await activeTaskBaseQuery
        .clone()
        .leftJoin(
          StatusTask,
          'status',
          [
            'status.id = task.status_id',
            'status.project_id = task.project_id',
            'status.organization_id = task.organization_id',
            'status.deleted_at IS NULL',
          ].join(' AND '),
        )
        .andWhere(
          "LOWER(REGEXP_REPLACE(COALESCE(status.name, ''), '\\s+', '_', 'g')) = :doneStatus",
          { doneStatus: 'done' },
        )
        .getCount();

      progress = Math.round((doneTasks / totalTasks) * 100);
    }

    await this.projectRepo
      .createQueryBuilder()
      .update(Project)
      .set({ progress })
      .where('id = :projectId', { projectId })
      .andWhere('organization_id = :orgId', { orgId })
      .andWhere('deleted_at IS NULL')
      .execute();

    return progress;
  }

  async deleteProject(
    projectId: string,
    orgId: string,
    userId: string,
  ): Promise<void> {
    const project = await this.getProjectEntity(projectId, orgId);
    await this.ensureCanDeleteProject(project, orgId, userId);

    await this.projectRepo.manager.transaction(async (manager) => {
      const now = new Date();

      await manager
        .createQueryBuilder()
        .update(Task)
        .set({ deletedAt: now, deletedBy: userId })
        .where('project_id = :projectId', { projectId })
        .andWhere('organization_id = :orgId', { orgId })
        .andWhere('deleted_at IS NULL')
        .execute();

      await manager
        .createQueryBuilder()
        .update(StatusTask)
        .set({ deletedAt: now, deletedBy: userId })
        .where('project_id = :projectId', { projectId })
        .andWhere('organization_id = :orgId', { orgId })
        .andWhere('deleted_at IS NULL')
        .execute();

      await manager
        .createQueryBuilder()
        .update(ProjectMember)
        .set({ deletedAt: now, deletedBy: userId, isActive: false })
        .where('project_id = :projectId', { projectId })
        .andWhere('organization_id = :orgId', { orgId })
        .andWhere('deleted_at IS NULL')
        .execute();

      await manager
        .createQueryBuilder()
        .update(ProjectInvite)
        .set({ deletedAt: now, deletedBy: userId })
        .where('project_id = :projectId', { projectId })
        .andWhere('organization_id = :orgId', { orgId })
        .andWhere('deleted_at IS NULL')
        .execute();

      await manager.delete(UserRole, {
        organizationId: orgId,
        scopeType: ScopeType.PROJECT,
        scopeId: projectId,
      });

      const roleRepo = manager.getRepository(Role);
      const projectRoles = await roleRepo.find({
        where: {
          organizationId: orgId,
          projectId,
          deletedAt: IsNull(),
        },
      });

      if (projectRoles.length) {
        const roleIds = projectRoles.map((role) => role.id);
        await manager.delete(RolePermission, { roleId: In(roleIds) });
        await manager.delete(UserRole, { roleId: In(roleIds) });
        await roleRepo.softDelete(roleIds);
      }

      await manager
        .createQueryBuilder()
        .update(Project)
        .set({ deletedAt: now, deletedBy: userId, isActive: false })
        .where('id = :projectId', { projectId })
        .andWhere('organization_id = :orgId', { orgId })
        .andWhere('deleted_at IS NULL')
        .execute();
    });
  }

  async createProjectInvite(
    projectId: string,
    orgId: string,
    actorUserId: string,
    dto: CreateProjectInviteRequest,
    role: ProjectInviteRole = ProjectInviteRole.PM,
  ): Promise<ProjectInviteResponse[]> {
    const project = await this.getProjectEntity(projectId, orgId);
    await this.assertCanManageProjectInvites(project, orgId, actorUserId);
    const inviteeUserIds = this.resolveInviteeUserIds(dto);

    const invites: ProjectInvite[] = [];
    for (const inviteeUserId of inviteeUserIds) {
      await this.ensureActiveMember(orgId, inviteeUserId);
      const invite = await this.createProjectInviteInternal(
        projectId,
        orgId,
        actorUserId,
        inviteeUserId,
        role,
      );
      invites.push(invite);
      this.eventEmitter.emit(PROJECT_REALTIME_EVENTS.MEMBER_INVITED, {
        ...this.buildRealtimeMeta(projectId, actorUserId),
        invite: plainToInstance(ProjectInviteResponse, invite),
      });
      this.eventEmitter.emit(PROJECT_NOTIFICATION_EVENTS.INVITE_CREATED, {
        ...this.buildRealtimeMeta(projectId, actorUserId),
        organizationId: orgId,
        inviteId: invite.id,
        inviteeUserId,
        role,
      });
    }

    return plainToInstance(ProjectInviteResponse, invites);
  }

  async getMyProjectInvites(
    orgId: string,
    inviteeUserId: string,
    status?: ProjectInviteStatus,
  ): Promise<ProjectInviteResponse[]> {
    await this.ensureActiveMember(orgId, inviteeUserId);

    const effectiveStatus = status ?? ProjectInviteStatus.PENDING;

    const where: {
      organizationId: string;
      inviteeUserId: string;
      deletedAt: ReturnType<typeof IsNull>;
      status: ProjectInviteStatus;
    } = {
      organizationId: orgId,
      inviteeUserId,
      deletedAt: IsNull(),
      status: effectiveStatus,
    };

    const invites = await this.projectInviteRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });

    return plainToInstance(ProjectInviteResponse, invites);
  }

  async acceptProjectInviteByToken(
    token: string,
    actorUserId: string,
  ): Promise<void> {
    const invite = await this.projectInviteRepo.findOne({
      where: { token, deletedAt: IsNull() },
    });
    if (!invite) {
      throw new NotFoundException('Project invite not found');
    }

    await this.acceptProjectInviteInternal(invite, actorUserId);
  }

  async rejectProjectInvite(
    inviteId: string,
    orgId: string,
    actorUserId: string,
  ): Promise<void> {
    const invite = await this.getProjectInviteEntity(inviteId, orgId);

    if (invite.inviteeUserId !== actorUserId) {
      throw new ForbiddenException('You are not allowed to reject this invite');
    }

    if (invite.status === ProjectInviteStatus.REJECTED) {
      return;
    }

    if (invite.status !== ProjectInviteStatus.PENDING) {
      throw new BadRequestException('Only pending invite can be rejected');
    }

    invite.status = ProjectInviteStatus.REJECTED;
    await this.projectInviteRepo.save(invite);
  }

  async cancelProjectInvite(
    inviteId: string,
    orgId: string,
    actorUserId: string,
  ): Promise<void> {
    const invite = await this.getProjectInviteEntity(inviteId, orgId);
    const project = await this.getProjectEntity(invite.projectId, orgId);

    const isInviter = invite.inviterUserId === actorUserId;
    if (!isInviter) {
      await this.assertCanManageProjectInvites(project, orgId, actorUserId);
    }

    if (invite.status === ProjectInviteStatus.CANCELED && invite.deletedAt) {
      return;
    }

    invite.status = ProjectInviteStatus.CANCELED;
    invite.deletedAt = new Date();
    invite.deletedBy = actorUserId;
    await this.projectInviteRepo.save(invite);
  }

  private async acceptProjectInviteInternal(
    invite: ProjectInvite,
    actorUserId: string,
  ): Promise<void> {
    if (invite.inviteeUserId !== actorUserId) {
      throw new ForbiddenException('You are not allowed to accept this invite');
    }

    if (invite.status === ProjectInviteStatus.ACCEPTED) {
      return;
    }

    if (invite.status !== ProjectInviteStatus.PENDING) {
      throw new BadRequestException('Only pending invite can be accepted');
    }

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      throw new ForbiddenException('Invitation token has expired');
    }

    await this.ensureActiveMember(invite.organizationId, actorUserId);

    await this.projectInviteRepo.manager.transaction(async (manager) => {
      await manager.update(
        ProjectInvite,
        {
          id: invite.id,
          organizationId: invite.organizationId,
          deletedAt: IsNull(),
        },
        {
          status: ProjectInviteStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
      );

      const existingMember = await manager.findOne(ProjectMember, {
        where: {
          projectId: invite.projectId,
          organizationId: invite.organizationId,
          userId: actorUserId,
        },
        withDeleted: true,
      });

      if (existingMember) {
        existingMember.isActive = true;
        existingMember.deletedAt = null as any;
        existingMember.deletedBy = null as any;
        await manager.save(existingMember);
      } else {
        await manager.save(
          ProjectMember,
          manager.create(ProjectMember, {
            projectId: invite.projectId,
            organizationId: invite.organizationId,
            userId: actorUserId,
            isActive: true,
          }),
        );
      }
    });

    if (invite.role === ProjectInviteRole.PM) {
      await this.ensureProjectManagerRole(
        invite.organizationId,
        invite.projectId,
        actorUserId,
        invite.inviterUserId,
      );
      const member = await this.getProjectMemberResponseByUserId(
        invite.projectId,
        invite.organizationId,
        actorUserId,
      );
      this.eventEmitter.emit(PROJECT_REALTIME_EVENTS.MEMBER_JOINED, {
        ...this.buildRealtimeMeta(invite.projectId, actorUserId),
        member,
      });
      this.emitProjectMemberJoinedEvent({
        organizationId: invite.organizationId,
        projectId: invite.projectId,
        userId: actorUserId,
        actorUserId,
      });
      return;
    }

    await this.ensureDefaultProjectScopeRole(
      invite.organizationId,
      invite.projectId,
      actorUserId,
      invite.inviterUserId,
    );

    const member = await this.getProjectMemberResponseByUserId(
      invite.projectId,
      invite.organizationId,
      actorUserId,
    );
    this.eventEmitter.emit(PROJECT_REALTIME_EVENTS.MEMBER_JOINED, {
      ...this.buildRealtimeMeta(invite.projectId, actorUserId),
      member,
    });
    this.emitProjectMemberJoinedEvent({
      organizationId: invite.organizationId,
      projectId: invite.projectId,
      userId: actorUserId,
      actorUserId,
    });
  }

  async getProjectEntity(projectId: string, orgId: string): Promise<Project> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId, organizationId: orgId, deletedAt: IsNull() },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  async assertRealtimeProjectAccess(
    projectId: string,
    userId: string,
  ): Promise<Project> {
    if (!isUUID(projectId)) {
      throw new BadRequestException('Invalid projectId');
    }

    const project = await this.projectRepo.findOne({
      where: { id: projectId, deletedAt: IsNull() },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.ensureUserInProject(project.id, project.organizationId, userId, {
      allowOrgAdmin: true,
    });
    return project;
  }

  async getProjectMemberResponseByUserId(
    projectId: string,
    orgId: string,
    memberUserId: string,
  ): Promise<ProjectMemberResponse> {
    return this.getProjectMemberResponse(projectId, orgId, { memberUserId });
  }

  async getProjectMemberResponseById(
    projectId: string,
    orgId: string,
    memberId: string,
  ): Promise<ProjectMemberResponse> {
    return this.getProjectMemberResponse(projectId, orgId, { memberId });
  }

  private async getProjectMemberResponse(
    projectId: string,
    orgId: string,
    filters: {
      memberUserId?: string;
      memberId?: string;
    },
  ): Promise<ProjectMemberResponse> {
    const row = await this.projectMemberRepo
      .createQueryBuilder('pm')
      .leftJoin(User, 'u', 'u.id = pm.user_id AND u.deleted_at IS NULL')
      .where('pm.project_id = :projectId', { projectId })
      .andWhere('pm.organization_id = :orgId', { orgId })
      .andWhere(filters.memberUserId ? 'pm.user_id = :memberUserId' : '1=1', {
        memberUserId: filters.memberUserId,
      })
      .andWhere(filters.memberId ? 'pm.id = :memberId' : '1=1', {
        memberId: filters.memberId,
      })
      .andWhere('pm.deleted_at IS NULL')
      .select([
        'pm.id AS "id"',
        'pm.project_id AS "projectId"',
        'pm.organization_id AS "organizationId"',
        'pm.user_id AS "userId"',
        'pm.role_id AS "roleId"',
        'pm.is_active AS "isActive"',
        'pm.joined_at AS "joinedAt"',
        'pm.created_at AS "createdAt"',
        'u.first_name AS "firstName"',
        'u.last_name AS "lastName"',
        'u.email AS "email"',
        'u.avatar_url AS "avatar"',
      ])
      .getRawOne<{
        id: string;
        projectId: string;
        organizationId: string;
        userId: string;
        roleId?: string;
        isActive: boolean;
        joinedAt: Date;
        createdAt: Date;
        firstName?: string;
        lastName?: string;
        email?: string;
        avatar?: string;
      }>();

    if (!row) {
      throw new NotFoundException('Project member not found');
    }

    const fullName = [row.firstName, row.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();

    return plainToInstance(ProjectMemberResponse, {
      id: row.id,
      projectId: row.projectId,
      organizationId: row.organizationId,
      userId: row.userId,
      roleId: row.roleId,
      isActive: row.isActive,
      joinedAt: row.joinedAt,
      createdAt: row.createdAt,
      fullName: fullName || row.email || row.userId,
      email: row.email,
      avatar: row.avatar,
    });
  }

  async getProjectEntityBySlug(slug: string, orgId: string): Promise<Project> {
    const normalizedSlug = this.normalizeProjectSlug(slug);
    if (!normalizedSlug) {
      throw new BadRequestException('Invalid project slug');
    }

    const project = await this.projectRepo
      .createQueryBuilder('project')
      .where('project.organization_id = :orgId', { orgId })
      .andWhere('project.deleted_at IS NULL')
      .andWhere('UPPER(project.slug) = :slug', { slug: normalizedSlug })
      .orderBy('project.created_at', 'DESC')
      .getOne();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  async ensureActiveMember(orgId: string, userId: string): Promise<void> {
    const member = await this.memberRepo.findOne({
      where: {
        organizationId: orgId,
        userId,
        isActive: true,
        isDeleted: false,
      },
    });

    if (!member) {
      throw new NotFoundException(
        'Assigned user is not an active member of this organization',
      );
    }
  }

  async ensureUserInProject(
    projectId: string,
    orgId: string,
    userId: string,
    options: { allowOrgAdmin?: boolean } = {},
  ): Promise<void> {
    const member = await this.projectMemberRepo.findOne({
      where: {
        projectId,
        organizationId: orgId,
        userId,
        isActive: true,
        deletedAt: IsNull(),
      },
    });

    if (!member) {
      const project = await this.getProjectEntity(projectId, orgId);

      if (
        project.createdBy === userId ||
        this.hasProjectManager(project, userId)
      ) {
        await this.ensureProjectMember(projectId, orgId, userId, userId);
        return;
      }

      if (
        options.allowOrgAdmin &&
        ((await this.isSystemAdmin(userId)) ||
          (await this.isOrganizationAdmin(userId, orgId)))
      ) {
        return;
      }

      throw new ForbiddenException('User is not a member of this project');
    }
  }

  async ensureProjectMember(
    projectId: string,
    orgId: string,
    userId?: string,
    actorUserId?: string,
  ): Promise<boolean> {
    if (!userId) return false;

    const existing = await this.projectMemberRepo.findOne({
      where: {
        projectId,
        organizationId: orgId,
        userId,
      },
      withDeleted: true,
    });

    if (existing) {
      const wasActive = existing.isActive && !existing.deletedAt;
      existing.isActive = true;
      existing.deletedAt = null as any;
      existing.deletedBy = null as any;
      await this.projectMemberRepo.save(existing);
      if (wasActive) {
        return false;
      }

      this.emitProjectMemberJoinedEvent({
        organizationId: orgId,
        projectId,
        userId,
        actorUserId: actorUserId ?? userId,
      });
      return true;
    }

    const member = this.projectMemberRepo.create({
      projectId,
      organizationId: orgId,
      userId,
      isActive: true,
    });
    await this.projectMemberRepo.save(member);
    this.emitProjectMemberJoinedEvent({
      organizationId: orgId,
      projectId,
      userId,
      actorUserId: actorUserId ?? userId,
    });
    return true;
  }

  async ensureDefaultProjectScopeRole(
    organizationId: string,
    projectId: string,
    userId: string,
    assignedBy: string,
  ): Promise<void> {
    await this.ensureProjectEmployeeRole(
      organizationId,
      projectId,
      userId,
      assignedBy,
    );
  }

  async assertProjectPermission(
    userId: string,
    orgId: string,
    projectId: string,
    permissionCode: string,
  ): Promise<void> {
    const allowed = await this.hasProjectPermission(
      userId,
      orgId,
      projectId,
      permissionCode,
    );

    if (!allowed) {
      throw new ForbiddenException(`Missing permission: ${permissionCode}`);
    }
  }

  async assertOrganizationPermission(
    userId: string,
    orgId: string,
    permissionCode: string,
  ): Promise<void> {
    const allowed = await this.hasOrganizationPermission(
      userId,
      orgId,
      permissionCode,
    );

    if (!allowed) {
      throw new ForbiddenException(`Missing permission: ${permissionCode}`);
    }
  }

  async hasOrganizationPermission(
    userId: string,
    orgId: string,
    permissionCode: string,
  ): Promise<boolean> {
    if (await this.isSystemAdmin(userId)) return true;

    const roleRows = await this.userRoleRepo
      .createQueryBuilder('ur')
      .select('ur.role_id', 'roleId')
      .where('ur.user_id = :userId', { userId })
      .andWhere('(ur.organization_id = :orgId OR ur.organization_id IS NULL)', {
        orgId,
      })
      .andWhere('ur.scope_type = :orgScope', {
        orgScope: ScopeType.ORGANIZATION,
      })
      .getRawMany<{ roleId: string }>();

    if (!roleRows.length) return false;

    const roleIds = [...new Set(roleRows.map((row) => row.roleId))];

    const permissionMatch = await this.rolePermissionRepo
      .createQueryBuilder('rp')
      .innerJoin(Permission, 'perm', 'perm.id = rp.permission_id')
      .where('rp.role_id IN (:...roleIds)', { roleIds })
      .andWhere('perm.code = :permissionCode', { permissionCode })
      .getOne();

    return !!permissionMatch;
  }

  async hasProjectPermission(
    userId: string,
    orgId: string,
    projectId: string,
    permissionCode: string,
  ): Promise<boolean> {
    if (await this.isSystemAdmin(userId)) return true;
    if (await this.isOrganizationAdmin(userId, orgId)) return true;
    if (
      permissionCode.startsWith('projects.roles.') &&
      (await this.isProjectManager(userId, orgId, projectId))
    ) {
      return true;
    }

    const roleRows = await this.userRoleRepo
      .createQueryBuilder('ur')
      .select('ur.role_id', 'roleId')
      .where('ur.user_id = :userId', { userId })
      .andWhere('(ur.organization_id = :orgId OR ur.organization_id IS NULL)', {
        orgId,
      })
      .andWhere(
        '(ur.scope_type = :orgScope OR (ur.scope_type = :projectScope AND ur.scope_id = :projectId))',
        {
          orgScope: ScopeType.ORGANIZATION,
          projectScope: ScopeType.PROJECT,
          projectId,
        },
      )
      .getRawMany<{ roleId: string }>();

    if (!roleRows.length) return false;

    const roleIds = [...new Set(roleRows.map((row) => row.roleId))];

    const permissionMatch = await this.rolePermissionRepo
      .createQueryBuilder('rp')
      .innerJoin(Permission, 'perm', 'perm.id = rp.permission_id')
      .where('rp.role_id IN (:...roleIds)', { roleIds })
      .andWhere('perm.code = :permissionCode', { permissionCode })
      .getOne();

    return !!permissionMatch;
  }

  private async getProjectInviteEntity(
    inviteId: string,
    orgId: string,
  ): Promise<ProjectInvite> {
    const invite = await this.projectInviteRepo.findOne({
      where: { id: inviteId, organizationId: orgId, deletedAt: IsNull() },
    });

    if (!invite) {
      throw new NotFoundException('Project invite not found');
    }

    return invite;
  }

  private async createProjectInviteInternal(
    projectId: string,
    orgId: string,
    inviterUserId: string,
    inviteeUserId: string,
    role: ProjectInviteRole = ProjectInviteRole.PM,
  ): Promise<ProjectInvite> {
    if (inviterUserId === inviteeUserId) {
      throw new BadRequestException('Cannot invite yourself');
    }

    const pendingInvite = await this.projectInviteRepo.findOne({
      where: {
        projectId,
        organizationId: orgId,
        inviteeUserId,
        role,
        status: ProjectInviteStatus.PENDING,
        deletedAt: IsNull(),
      },
    });

    if (pendingInvite) {
      if (
        !pendingInvite.token ||
        !pendingInvite.expiresAt ||
        pendingInvite.expiresAt < new Date()
      ) {
        pendingInvite.token = this.generateInviteToken();
        pendingInvite.expiresAt = this.buildInviteExpiryDate();
        await this.projectInviteRepo.save(pendingInvite);
      }

      await this.sendProjectInviteEmail(pendingInvite);
      return pendingInvite;
    }

    const activeMember = await this.projectMemberRepo.findOne({
      where: {
        projectId,
        organizationId: orgId,
        userId: inviteeUserId,
        isActive: true,
        deletedAt: IsNull(),
      },
    });

    if (activeMember && role === ProjectInviteRole.MEMBER) {
      throw new ConflictException('User is already a member of this project');
    }

    if (
      activeMember &&
      role === ProjectInviteRole.PM &&
      (await this.isProjectManager(inviteeUserId, orgId, projectId))
    ) {
      const acceptedInvite = await this.projectInviteRepo.findOne({
        where: {
          projectId,
          organizationId: orgId,
          inviteeUserId,
          role: ProjectInviteRole.PM,
          status: ProjectInviteStatus.ACCEPTED,
          deletedAt: IsNull(),
        },
        order: { createdAt: 'DESC' },
      });

      if (acceptedInvite) {
        return acceptedInvite;
      }

      throw new ConflictException('User is already PM/owner of this project');
    }

    const invite = this.projectInviteRepo.create({
      projectId,
      organizationId: orgId,
      inviteeUserId,
      inviterUserId,
      role,
      status: ProjectInviteStatus.PENDING,
      token: this.generateInviteToken(),
      expiresAt: this.buildInviteExpiryDate(),
    });

    const savedInvite = await this.projectInviteRepo.save(invite);
    await this.sendProjectInviteEmail(savedInvite);
    return savedInvite;
  }

  private generateInviteToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private buildInviteExpiryDate(): Date {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    return expiresAt;
  }

  private async sendProjectInviteEmail(invite: ProjectInvite): Promise<void> {
    if (!invite.token) return;

    const invitee = await this.userRepo.findOne({
      where: { id: invite.inviteeUserId, deletedAt: IsNull() },
    });
    if (!invitee?.email) return;

    const project = await this.projectRepo.findOne({
      where: {
        id: invite.projectId,
        organizationId: invite.organizationId,
        deletedAt: IsNull(),
      },
    });
    if (!project) return;

    const acceptUrl = this.buildProjectInviteAcceptUrl(invite.token);
    await this.mailService.sendMailInvitation(
      invitee.email,
      `Project ${project.name}`,
      acceptUrl,
      dayjs(invite.expiresAt ?? this.buildInviteExpiryDate()).format(
        'HH:mm - DD/MM/YYYY',
      ),
    );
  }

  private buildProjectInviteAcceptUrl(token: string): string {
    const appConfig = this.configService.get('app', { infer: true })!;
    return `${appConfig.frontendDomain}/project-invites/accept?token=${encodeURIComponent(token)}`;
  }

  private async assertCanManageProjectInvites(
    project: Project,
    orgId: string,
    actorUserId: string,
  ): Promise<void> {
    if (
      project.createdBy === actorUserId ||
      this.hasProjectManager(project, actorUserId)
    ) {
      return;
    }

    const hasPermission = await this.hasProjectPermission(
      actorUserId,
      orgId,
      project.id,
      PERMISSIONS.PROJECTS.PROJECTS.UPDATE,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        'You do not have permission to manage project invites',
      );
    }
  }

  private async ensureCanViewProject(
    project: Project,
    orgId: string,
    actorUserId: string,
  ): Promise<void> {
    if (
      this.hasProjectManager(project, actorUserId) ||
      project.createdBy === actorUserId
    ) {
      return;
    }

    const hasPermission = await this.hasProjectPermission(
      actorUserId,
      orgId,
      project.id,
      PERMISSIONS.PROJECTS.PROJECTS.VIEW,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        'Only project manager/creator or user with project-view permission can view project',
      );
    }
  }

  private async ensureCanUpdateProject(
    project: Project,
    orgId: string,
    actorUserId: string,
  ): Promise<void> {
    if (
      this.hasProjectManager(project, actorUserId) ||
      project.createdBy === actorUserId
    ) {
      return;
    }

    const hasPermission = await this.hasProjectPermission(
      actorUserId,
      orgId,
      project.id,
      PERMISSIONS.PROJECTS.PROJECTS.UPDATE,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        'Only project manager/creator or user with project-update permission can update project',
      );
    }
  }

  private async ensureCanDeleteProject(
    project: Project,
    orgId: string,
    actorUserId: string,
  ): Promise<void> {
    if (
      this.hasProjectManager(project, actorUserId) ||
      project.createdBy === actorUserId
    ) {
      return;
    }

    const hasPermission = await this.hasProjectPermission(
      actorUserId,
      orgId,
      project.id,
      PERMISSIONS.PROJECTS.PROJECTS.DELETE,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        'Only project manager/creator or user with project-delete permission can delete project',
      );
    }
  }

  private async ensureProjectManagerRole(
    organizationId: string,
    projectId: string,
    managerUserId: string,
    actorUserId: string,
  ): Promise<void> {
    const pmRole = await this.ensureProjectManagerRoleDefinition(
      organizationId,
      projectId,
      actorUserId,
    );

    const existing = await this.userRoleRepo.findOne({
      where: {
        userId: managerUserId,
        organizationId,
        roleId: pmRole.id,
        scopeType: ScopeType.PROJECT,
        scopeId: projectId,
      },
    });

    if (existing) {
      await this.syncProjectMemberRoleId(
        projectId,
        organizationId,
        managerUserId,
        pmRole.id,
      );
      await this.syncProjectManagerField(
        projectId,
        organizationId,
        managerUserId,
      );
      return;
    }

    const userRole = this.userRoleRepo.create({
      userId: managerUserId,
      organizationId,
      roleId: pmRole.id,
      scopeType: ScopeType.PROJECT,
      scopeId: projectId,
      assignedBy: actorUserId,
    });

    await this.userRoleRepo.save(userRole);
    await this.syncProjectMemberRoleId(
      projectId,
      organizationId,
      managerUserId,
      pmRole.id,
    );
    await this.syncProjectManagerField(
      projectId,
      organizationId,
      managerUserId,
    );
  }

  private async ensureProjectOwnerRole(
    organizationId: string,
    projectId: string,
    ownerUserId: string,
    actorUserId: string,
  ): Promise<void> {
    const ownerRole = await this.ensureProjectOwnerRoleDefinition(
      organizationId,
      projectId,
      actorUserId,
    );

    const existing = await this.userRoleRepo.findOne({
      where: {
        userId: ownerUserId,
        organizationId,
        roleId: ownerRole.id,
        scopeType: ScopeType.PROJECT,
        scopeId: projectId,
      },
    });

    if (existing) {
      await this.syncProjectMemberRoleId(
        projectId,
        organizationId,
        ownerUserId,
        ownerRole.id,
      );
      return;
    }

    const userRole = this.userRoleRepo.create({
      userId: ownerUserId,
      organizationId,
      roleId: ownerRole.id,
      scopeType: ScopeType.PROJECT,
      scopeId: projectId,
      assignedBy: actorUserId,
    });

    await this.userRoleRepo.save(userRole);
    await this.syncProjectMemberRoleId(
      projectId,
      organizationId,
      ownerUserId,
      ownerRole.id,
    );
  }

  private async ensureProjectManagerRoleDefinition(
    organizationId: string,
    projectId: string,
    createdBy: string,
  ): Promise<Role> {
    let role = await this.roleRepo.findOne({
      where: {
        organizationId,
        projectId,
        name: PROJECT_MANAGER_ROLE_NAME,
      },
    });

    if (!role) {
      role = await this.roleRepo.save(
        this.roleRepo.create({
          organizationId,
          projectId,
          name: PROJECT_MANAGER_ROLE_NAME,
          description:
            'Project manager role with full permissions in project scope',
          isSystemRole: false,
          createdBy,
        }),
      );
    }

    const projectPermissions = await this.permissionRepo.find({
      where: { module: 'projects' },
    });

    if (!projectPermissions.length) return role;

    const entries = projectPermissions.map((permission) =>
      this.rolePermissionRepo.create({
        roleId: role.id,
        permissionId: permission.id,
      }),
    );

    await this.rolePermissionRepo.upsert(entries, ['roleId', 'permissionId']);
    return role;
  }

  private async ensureProjectOwnerRoleDefinition(
    organizationId: string,
    projectId: string,
    createdBy: string,
  ): Promise<Role> {
    let role = await this.roleRepo.findOne({
      where: {
        organizationId,
        projectId,
        name: PROJECT_OWNER_ROLE_NAME,
      },
    });

    if (!role) {
      role = await this.roleRepo.save(
        this.roleRepo.create({
          organizationId,
          projectId,
          name: PROJECT_OWNER_ROLE_NAME,
          description:
            'Project owner role with full permissions in project scope',
          isSystemRole: false,
          createdBy,
        }),
      );
    }

    const projectPermissions = await this.permissionRepo.find({
      where: { module: 'projects' },
    });

    if (!projectPermissions.length) return role;

    const entries = projectPermissions.map((permission) =>
      this.rolePermissionRepo.create({
        roleId: role.id,
        permissionId: permission.id,
      }),
    );

    await this.rolePermissionRepo.upsert(entries, ['roleId', 'permissionId']);
    return role;
  }

  private async ensureProjectEmployeeRole(
    organizationId: string,
    projectId: string,
    userId: string,
    assignedBy: string,
  ): Promise<void> {
    const role = await this.ensureProjectEmployeeRoleDefinition(
      organizationId,
      projectId,
      assignedBy,
    );

    if (!role) return;

    const existing = await this.userRoleRepo.findOne({
      where: {
        userId,
        organizationId,
        roleId: role.id,
        scopeType: ScopeType.PROJECT,
        scopeId: projectId,
      },
    });

    if (existing) {
      await this.syncProjectMemberRoleId(
        projectId,
        organizationId,
        userId,
        role.id,
      );
      return;
    }

    const userRole = this.userRoleRepo.create({
      userId,
      organizationId,
      roleId: role.id,
      scopeType: ScopeType.PROJECT,
      scopeId: projectId,
      assignedBy,
    });

    await this.userRoleRepo.save(userRole);
    await this.syncProjectMemberRoleId(
      projectId,
      organizationId,
      userId,
      role.id,
    );
  }

  private async ensureProjectEmployeeRoleDefinition(
    organizationId: string,
    projectId: string,
    createdBy: string,
  ): Promise<Role | null> {
    let role = await this.roleRepo.findOne({
      where: {
        organizationId,
        projectId,
        name: EMPLOYEE_ROLE_NAME,
      },
    });
    if (role) {
      return role;
    }

    role = await this.roleRepo.save(
      this.roleRepo.create({
        organizationId,
        projectId,
        name: EMPLOYEE_ROLE_NAME,
        description: 'Project employee role',
        isSystemRole: false,
        createdBy,
      }),
    );

    const sourceRole =
      (await this.roleRepo.findOne({
        where: {
          name: EMPLOYEE_ROLE_NAME,
          organizationId,
          projectId: IsNull(),
        },
      })) ||
      (await this.roleRepo.findOne({
        where: {
          name: SYSTEM_ROLES.USER,
          isSystemRole: true,
          organizationId: IsNull(),
          projectId: IsNull(),
        },
      }));

    if (!sourceRole) {
      return role;
    }

    const sourcePermissions = await this.rolePermissionRepo.find({
      where: { roleId: sourceRole.id },
    });

    if (!sourcePermissions.length) {
      return role;
    }

    const entries = sourcePermissions.map((item) =>
      this.rolePermissionRepo.create({
        roleId: role.id,
        permissionId: item.permissionId,
      }),
    );

    await this.rolePermissionRepo.upsert(entries, ['roleId', 'permissionId']);
    return role;
  }

  private async isSystemAdmin(userId: string): Promise<boolean> {
    const systemAdmin = await this.userRoleRepo
      .createQueryBuilder('ur')
      .innerJoin(Role, 'r', 'r.id = ur.role_id')
      .where('ur.user_id = :userId', { userId })
      .andWhere('r.name = :systemAdminRole', {
        systemAdminRole: SYSTEM_ROLES.SYSTEM_ADMIN,
      })
      .andWhere('r.isSystemRole = true')
      .getOne();

    return !!systemAdmin;
  }

  private async isOrganizationAdmin(
    userId: string,
    orgId: string,
  ): Promise<boolean> {
    const orgAdmin = await this.userRoleRepo
      .createQueryBuilder('ur')
      .innerJoin(Role, 'r', 'r.id = ur.role_id')
      .where('ur.user_id = :userId', { userId })
      .andWhere('ur.organization_id = :orgId', { orgId })
      .andWhere('ur.scope_type = :scopeType', {
        scopeType: ScopeType.ORGANIZATION,
      })
      .andWhere('ur.scope_id IS NULL')
      .andWhere('r.name = :orgAdminRole', {
        orgAdminRole: SYSTEM_ROLES.ORG_ADMIN,
      })
      .andWhere('r.isSystemRole = true')
      .getOne();

    return !!orgAdmin;
  }

  private emitProjectMemberJoinedEvent(params: {
    organizationId: string;
    projectId: string;
    userId: string;
    actorUserId: string;
  }): void {
    const payload: ProjectMemberJoinedDomainEvent = {
      organizationId: params.organizationId,
      projectId: params.projectId,
      userId: params.userId,
      actorUserId: params.actorUserId,
      occurredAt: new Date().toISOString(),
    };
    this.eventEmitter.emit(PROJECT_DOMAIN_EVENTS.MEMBER_JOINED, payload);
  }

  private async syncProjectMemberRoleId(
    projectId: string,
    organizationId: string,
    userId: string,
    roleId: string,
  ): Promise<void> {
    const member = await this.projectMemberRepo.findOne({
      where: {
        projectId,
        organizationId,
        userId,
      },
      withDeleted: true,
    });
    if (!member) return;

    member.roleId = roleId;
    member.isActive = true;
    member.deletedAt = null as any;
    member.deletedBy = null as any;
    await this.projectMemberRepo.save(member);
  }

  private async isProjectManager(
    userId: string,
    orgId: string,
    projectId: string,
  ): Promise<boolean> {
    const project = await this.getProjectEntity(projectId, orgId);
    if (
      this.hasProjectManager(project, userId) ||
      project.createdBy === userId
    ) {
      return true;
    }

    const scopedPrivilegedRole = await this.userRoleRepo
      .createQueryBuilder('ur')
      .innerJoin(Role, 'r', 'r.id = ur.role_id')
      .where('ur.user_id = :userId', { userId })
      .andWhere('ur.organization_id = :orgId', { orgId })
      .andWhere('ur.scope_type = :scopeType', { scopeType: ScopeType.PROJECT })
      .andWhere('ur.scope_id = :projectId', { projectId })
      .andWhere('r.name IN (:...roleNames)', {
        roleNames: [PROJECT_MANAGER_ROLE_NAME, PROJECT_OWNER_ROLE_NAME],
      })
      .getOne();

    return !!scopedPrivilegedRole;
  }

  async isUserProjectManager(
    userId: string,
    orgId: string,
    projectId: string,
  ): Promise<boolean> {
    return this.isProjectManager(userId, orgId, projectId);
  }

  async isUserAssignedProjectManager(
    userId: string,
    orgId: string,
    projectId: string,
  ): Promise<boolean> {
    const project = await this.getProjectEntity(projectId, orgId);
    if (this.hasProjectManager(project, userId)) {
      return true;
    }

    return this.hasProjectManagerScopedRole(userId, orgId, projectId);
  }

  async ensureUserIsAssignedProjectManager(
    projectId: string,
    orgId: string,
    userId: string,
  ): Promise<void> {
    const isProjectManager = await this.isUserAssignedProjectManager(
      userId,
      orgId,
      projectId,
    );
    if (!isProjectManager) {
      throw new ForbiddenException(
        'User is not a project manager of this project',
      );
    }
  }

  async isUserEligibleOvertimeRequester(
    userId: string,
    orgId: string,
    projectId: string,
  ): Promise<boolean> {
    if (await this.isOrganizationAdmin(userId, orgId)) {
      return false;
    }

    const project = await this.getProjectEntity(projectId, orgId);
    if (
      project.createdBy === userId ||
      this.hasProjectManager(project, userId)
    ) {
      return true;
    }

    const [hasManagerRole, hasOwnerRole] = await Promise.all([
      this.hasProjectManagerScopedRole(userId, orgId, projectId),
      this.hasProjectOwnerScopedRole(userId, orgId, projectId),
    ]);

    return hasManagerRole || hasOwnerRole;
  }

  async ensureUserCanCreateOvertimeRequest(
    projectId: string,
    orgId: string,
    userId: string,
  ): Promise<void> {
    const isEligible = await this.isUserEligibleOvertimeRequester(
      userId,
      orgId,
      projectId,
    );
    if (!isEligible) {
      throw new ForbiddenException(
        'User is not a project manager or owner of this project',
      );
    }
  }

  async isUserProjectOwner(
    userId: string,
    orgId: string,
    projectId: string,
  ): Promise<boolean> {
    const project = await this.getProjectEntity(projectId, orgId);
    if (project.createdBy === userId) {
      return true;
    }

    return this.hasProjectOwnerScopedRole(userId, orgId, projectId);
  }

  async ensureUserIsProjectOwner(
    projectId: string,
    orgId: string,
    userId: string,
  ): Promise<void> {
    const isOwner = await this.isUserProjectOwner(userId, orgId, projectId);
    if (!isOwner) {
      throw new ForbiddenException('User is not an owner of this project');
    }
  }

  async getActiveProjectMemberUserIds(
    projectId: string,
    orgId: string,
  ): Promise<string[]> {
    const members = await this.projectMemberRepo.find({
      where: {
        projectId,
        organizationId: orgId,
        isActive: true,
        deletedAt: IsNull(),
      },
      select: ['userId'],
    });
    return [...new Set(members.map((m) => m.userId))];
  }

  async getProjectsForMember(
    orgId: string,
    userId: string,
  ): Promise<{ id: string; name: string }[]> {
    const projects = await this.projectRepo
      .createQueryBuilder('project')
      .where('project.organization_id = :orgId', { orgId })
      .andWhere('project.deleted_at IS NULL')
      .andWhere('project.is_active = true')
      .andWhere(
        `(
          project.created_by = :userId
          OR :userId = ANY(COALESCE(project.manager_id, ARRAY[]::uuid[]))
          OR EXISTS (
            SELECT 1 FROM project.project_members pm
            WHERE pm.project_id = project.id
              AND pm.user_id = :userId
              AND pm.is_active = true
              AND pm.deleted_at IS NULL
          )
        )`,
        { userId },
      )
      .select(['project.id', 'project.name'])
      .orderBy('project.name', 'ASC')
      .getMany();

    return projects.map((p) => ({ id: p.id, name: p.name }));
  }

  async getProjectsOwnedByUser(
    orgId: string,
    userId: string,
  ): Promise<{ id: string; name: string }[]> {
    const ownerProjectRows = await this.userRoleRepo
      .createQueryBuilder('ur')
      .innerJoin(Role, 'r', 'r.id = ur.role_id')
      .select('ur.scope_id', 'projectId')
      .where('ur.user_id = :userId', { userId })
      .andWhere('ur.organization_id = :orgId', { orgId })
      .andWhere('ur.scope_type = :scopeType', { scopeType: ScopeType.PROJECT })
      .andWhere('r.name = :roleName', { roleName: PROJECT_OWNER_ROLE_NAME })
      .getRawMany<{ projectId: string }>();

    const ownedProjectIds = new Set(
      ownerProjectRows.map((row) => row.projectId),
    );

    const projects = await this.projectRepo.find({
      where: {
        organizationId: orgId,
        deletedAt: IsNull(),
        isActive: true,
      },
      select: ['id', 'name', 'createdBy'],
      order: { name: 'ASC' },
    });

    return projects
      .filter(
        (project) =>
          project.createdBy === userId || ownedProjectIds.has(project.id),
      )
      .map((project) => ({ id: project.id, name: project.name }));
  }

  async getProjectsManagedByUser(
    orgId: string,
    userId: string,
  ): Promise<{ id: string; name: string }[]> {
    const managerProjectRows = await this.userRoleRepo
      .createQueryBuilder('ur')
      .innerJoin(Role, 'r', 'r.id = ur.role_id')
      .select('ur.scope_id', 'projectId')
      .where('ur.user_id = :userId', { userId })
      .andWhere('ur.organization_id = :orgId', { orgId })
      .andWhere('ur.scope_type = :scopeType', { scopeType: ScopeType.PROJECT })
      .andWhere('r.name = :roleName', { roleName: PROJECT_MANAGER_ROLE_NAME })
      .getRawMany<{ projectId: string }>();

    const managedProjectIds = new Set(
      managerProjectRows.map((row) => row.projectId),
    );

    const projects = await this.projectRepo.find({
      where: {
        organizationId: orgId,
        deletedAt: IsNull(),
        isActive: true,
      },
      select: ['id', 'name', 'managerId'],
      order: { name: 'ASC' },
    });

    return projects
      .filter(
        (project) =>
          this.hasProjectManager(project, userId) ||
          managedProjectIds.has(project.id),
      )
      .map((project) => ({ id: project.id, name: project.name }));
  }

  async getProjectsEligibleForOvertimeRequest(
    orgId: string,
    userId: string,
  ): Promise<{ id: string; name: string }[]> {
    if (await this.isOrganizationAdmin(userId, orgId)) {
      return [];
    }

    const [managedProjects, ownedProjects] = await Promise.all([
      this.getProjectsManagedByUser(orgId, userId),
      this.getProjectsOwnedByUser(orgId, userId),
    ]);

    const projectMap = new Map<string, { id: string; name: string }>();
    for (const project of [...managedProjects, ...ownedProjects]) {
      projectMap.set(project.id, project);
    }

    return [...projectMap.values()].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }

  async syncProjectManagerField(
    projectId: string,
    orgId: string,
    userId: string,
  ): Promise<void> {
    const project = await this.getProjectEntity(projectId, orgId);
    const hasManagerRole = await this.hasProjectManagerScopedRole(
      userId,
      orgId,
      projectId,
    );

    if (hasManagerRole) {
      await this.addManagerToProject(project, userId);
      return;
    }

    await this.removeManagerFromProject(project, userId);
  }

  async removeProjectManagerUser(
    projectId: string,
    orgId: string,
    userId: string,
  ): Promise<void> {
    const project = await this.getProjectEntity(projectId, orgId);
    await this.removeManagerFromProject(project, userId);
  }

  private hasProjectManager(project: Project, userId: string): boolean {
    return this.getProjectManagerIds(project).includes(userId);
  }

  private getProjectManagerIds(project: Project): string[] {
    return this.uniqueUserIds(project.managerId ?? []);
  }

  private async addManagerToProject(
    project: Project,
    userId: string,
  ): Promise<void> {
    const managerIds = this.getProjectManagerIds(project);
    if (managerIds.includes(userId)) {
      return;
    }

    project.managerId = [...managerIds, userId];
    await this.projectRepo.save(project);
  }

  private async removeManagerFromProject(
    project: Project,
    userId: string,
  ): Promise<void> {
    const managerIds = this.getProjectManagerIds(project);
    if (!managerIds.includes(userId)) {
      return;
    }

    const nextManagerIds = managerIds.filter((id) => id !== userId);
    project.managerId = nextManagerIds.length ? nextManagerIds : null;
    await this.projectRepo.save(project);
  }

  private async hasProjectManagerScopedRole(
    userId: string,
    orgId: string,
    projectId: string,
  ): Promise<boolean> {
    const managerRole = await this.userRoleRepo
      .createQueryBuilder('ur')
      .innerJoin(Role, 'r', 'r.id = ur.role_id')
      .where('ur.user_id = :userId', { userId })
      .andWhere('ur.organization_id = :orgId', { orgId })
      .andWhere('ur.scope_type = :scopeType', { scopeType: ScopeType.PROJECT })
      .andWhere('ur.scope_id = :projectId', { projectId })
      .andWhere('r.name = :roleName', { roleName: PROJECT_MANAGER_ROLE_NAME })
      .getOne();

    return !!managerRole;
  }

  private async hasProjectOwnerScopedRole(
    userId: string,
    orgId: string,
    projectId: string,
  ): Promise<boolean> {
    const ownerRole = await this.userRoleRepo
      .createQueryBuilder('ur')
      .innerJoin(Role, 'r', 'r.id = ur.role_id')
      .where('ur.user_id = :userId', { userId })
      .andWhere('ur.organization_id = :orgId', { orgId })
      .andWhere('ur.scope_type = :scopeType', { scopeType: ScopeType.PROJECT })
      .andWhere('ur.scope_id = :projectId', { projectId })
      .andWhere('r.name = :roleName', { roleName: PROJECT_OWNER_ROLE_NAME })
      .getOne();

    return !!ownerRole;
  }

  private uniqueUserIds(input: string[]): string[] {
    return [...new Set(input.filter(Boolean))];
  }

  private resolveInviteeUserIds(dto: CreateProjectInviteRequest): string[] {
    const inviteeUserIds = this.uniqueUserIds([
      ...(dto.inviteeUserIds ?? []),
      ...(dto.inviteeUserId ? [dto.inviteeUserId] : []),
    ]);

    if (!inviteeUserIds.length) {
      throw new BadRequestException(
        'At least one inviteeUserId or inviteeUserIds is required',
      );
    }

    return inviteeUserIds;
  }

  private async deriveUniqueProjectSlug(
    orgId: string,
    name: string,
    excludeProjectId?: string,
  ): Promise<string> {
    const baseSlug = this.deriveInitialsProjectSlug(name) ?? 'PROJECT';
    let attempt = 0;

    while (attempt < 1000) {
      const suffix = attempt === 0 ? '' : `-${attempt + 1}`;
      const candidate = `${baseSlug}${suffix}`;

      const query = this.projectRepo
        .createQueryBuilder('project')
        .where('project.organization_id = :orgId', { orgId })
        .andWhere('UPPER(project.slug) = :slug', { slug: candidate });

      if (excludeProjectId) {
        query.andWhere('project.id != :excludeProjectId', { excludeProjectId });
      }

      const exists = await query.getExists();
      if (!exists) {
        return candidate;
      }

      attempt += 1;
    }

    throw new ConflictException('Cannot generate unique project slug');
  }

  private normalizeProjectSlug(value?: string): string | undefined {
    if (!value) return undefined;

    const ascii = value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();

    const normalized = ascii
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 200);

    return normalized || undefined;
  }

  private deriveInitialsProjectSlug(value?: string): string | undefined {
    if (!value) return undefined;

    const ascii = value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();

    const words = ascii
      .replace(/[^A-Z0-9]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (!words.length) return undefined;

    const initials = words
      .map((word) => word[0])
      .join('')
      .slice(0, 60);

    return this.normalizeProjectSlug(initials);
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
