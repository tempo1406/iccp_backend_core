import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';

import { Role } from '@modules/rbac/entities/role.entity';
import { UserRole, ScopeType } from '@modules/rbac/entities/user-role.entity';
import { Permission } from '@modules/rbac/entities/permissions.entity';
import { RolePermission } from '@modules/rbac/entities/role-permission.entity';
import {
  PERMISSIONS,
  SYSTEM_ROLES,
} from '@modules/rbac/constant/permission.constant';
import { ValidationException } from '@common/exceptions/validation.exception';
import { ErrorCode } from '@common/constants/error-code.constant';

import { Project } from '../core/entities/project.entity';
import { ProjectMember } from '../core/entities/project-member.entity';
import { ProjectCoreService } from '../core/project-core.service';

import { CreateProjectRoleRequest } from './dto/request/create-project-role.request';
import { UpdateProjectRoleRequest } from './dto/request/update-project-role.request';
import { AssignPermissionsToProjectRoleRequest } from './dto/request/assign-permissions.request';
import { RevokePermissionsFromProjectRoleRequest } from './dto/request/revoke-permissions.request';
import { AssignRoleToProjectMemberRequest } from './dto/request/assign-role-to-member.request';
import { RevokeRoleFromProjectMemberRequest } from './dto/request/revoke-role-from-member.request';
import { ProjectRoleResponse } from './dto/response/project-role.response';
import { ProjectRoleDetailResponse } from './dto/response/project-role-detail.response';
import { ProjectMemberRoleResponse } from './dto/response/project-member-role.response';
import { PROJECT_REALTIME_EVENTS } from '../realtime/constants/project-realtime-events.constant';

const PROJECT_OWNER_ROLE_NAME = 'project_owner';
const PROJECT_MANAGER_ROLE_NAME = 'project_manager';

@Injectable()
export class ProjectRoleManageService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,

    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,

    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,

    @InjectRepository(RolePermission)
    private readonly rpRepo: Repository<RolePermission>,

    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,

    @InjectRepository(ProjectMember)
    private readonly projectMemberRepo: Repository<ProjectMember>,

    private readonly projectCoreService: ProjectCoreService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private async getProjectOrFail(
    projectId: string,
    orgId: string,
  ): Promise<Project> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId, organizationId: orgId, isActive: true },
    });

    if (!project) {
      throw new ValidationException(ErrorCode.P001);
    }

    return project;
  }

  private async getMemberOrFail(
    projectId: string,
    orgId: string,
    userId: string,
  ): Promise<ProjectMember> {
    const member = await this.projectMemberRepo.findOne({
      where: { projectId, organizationId: orgId, userId, isActive: true },
    });

    if (!member) {
      throw new ValidationException(ErrorCode.P002);
    }

    return member;
  }

  private async assertProjectPermission(
    callerId: string,
    project: Project,
    permissionCode: string,
  ): Promise<void> {
    await this.projectCoreService.assertProjectPermission(
      callerId,
      project.organizationId,
      project.id,
      permissionCode,
    );
  }

  private async checkCallerPermissions(
    callerId: string,
    project: Project,
    permissionCodes: string[],
  ): Promise<void> {
    if (!permissionCodes.length) return;

    const checks = await Promise.all(
      permissionCodes.map((permissionCode) =>
        this.projectCoreService.hasProjectPermission(
          callerId,
          project.organizationId,
          project.id,
          permissionCode,
        ),
      ),
    );

    const unauthorized = permissionCodes.filter((_, index) => !checks[index]);

    if (unauthorized.length > 0) {
      throw new ForbiddenException(
        `You cannot assign permissions you do not have: ${unauthorized.join(', ')}`,
      );
    }
  }

  async createRole(
    dto: CreateProjectRoleRequest,
    callerId: string,
    projectId: string,
    orgId: string,
  ): Promise<void> {
    const project = await this.getProjectOrFail(projectId, orgId);
    await this.assertProjectPermission(
      callerId,
      project,
      PERMISSIONS.PROJECTS.ROLES.CREATE,
    );

    const existing = await this.roleRepo.findOne({
      where: {
        name: dto.name,
        organizationId: project.organizationId,
        projectId: project.id,
      },
    });
    if (existing) {
      throw new ValidationException(ErrorCode.R002);
    }

    const role = this.roleRepo.create({
      name: dto.name,
      description: dto.description,
      organizationId: project.organizationId,
      projectId: project.id,
      isSystemRole: false,
      createdBy: callerId,
    });
    const saved = await this.roleRepo.save(role);

    if (dto.permissionCodes?.length) {
      await this.checkCallerPermissions(callerId, project, dto.permissionCodes);

      const permissions = await this.permissionRepo.find({
        where: { code: In(dto.permissionCodes) },
      });
      if (permissions.length !== dto.permissionCodes.length) {
        throw new ValidationException(ErrorCode.P005);
      }

      const rps = permissions.map((p) =>
        this.rpRepo.create({ roleId: saved.id, permissionId: p.id }),
      );
      await this.rpRepo.upsert(rps, ['roleId', 'permissionId']);
    }

    const roleDetail = await this.buildRoleDetailResponse(saved.id);
    this.eventEmitter.emit(PROJECT_REALTIME_EVENTS.ROLE_CREATED, {
      ...this.buildRealtimeMeta(projectId, callerId),
      role: roleDetail,
    });
  }

  async getMyRoles(
    userId: string,
    projectId: string,
    orgId: string,
  ): Promise<ProjectMemberRoleResponse[]> {
    await this.getProjectOrFail(projectId, orgId);
    const member = await this.projectMemberRepo.findOne({
      where: { projectId, organizationId: orgId, userId, isActive: true },
    });
    if (!member) {
      const canViewProjectRoles =
        (await this.projectCoreService.hasProjectPermission(
          userId,
          orgId,
          projectId,
          PERMISSIONS.PROJECTS.ROLES.VIEW,
        )) ||
        (await this.projectCoreService.hasProjectPermission(
          userId,
          orgId,
          projectId,
          PERMISSIONS.PROJECTS.ROLES.LIST,
        ));
      if (canViewProjectRoles) return [];
      throw new ValidationException(ErrorCode.P002);
    }

    const userRoles = await this.userRoleRepo
      .createQueryBuilder('ur')
      .innerJoin(Role, 'r', 'r.id = ur.role_id')
      .where('ur.user_id = :userId', { userId })
      .andWhere('ur.organization_id = :orgId', { orgId })
      .andWhere('ur.scope_type = :scope', { scope: ScopeType.PROJECT })
      .andWhere('ur.scope_id = :projectId', { projectId })
      .andWhere(
        '(r.project_id = :projectId OR (r.project_id IS NULL AND r."organizationId" = :orgId))',
        { projectId, orgId },
      )
      .select([
        'ur.id AS "id"',
        'ur.role_id AS "roleId"',
        'r.name AS "roleName"',
        'r.description AS "roleDescription"',
        'ur.scope_type AS "scopeType"',
        'ur.scope_id AS "scopeId"',
        'ur.assigned_at AS "assignedAt"',
      ])
      .getRawMany();

    return plainToInstance(ProjectMemberRoleResponse, userRoles);
  }

  async getRoles(
    projectId: string,
    orgId: string,
    callerId: string,
  ): Promise<ProjectRoleResponse[]> {
    const project = await this.getProjectOrFail(projectId, orgId);
    await this.assertProjectPermission(
      callerId,
      project,
      PERMISSIONS.PROJECTS.ROLES.LIST,
    );

    const roles = await this.roleRepo.find({
      where: { organizationId: project.organizationId, projectId: project.id },
      order: { createdAt: 'ASC' },
    });

    return plainToInstance(ProjectRoleResponse, roles);
  }

  async getRoleDetail(
    roleId: string,
    projectId: string,
    orgId: string,
    callerId: string,
  ): Promise<ProjectRoleDetailResponse> {
    const project = await this.getProjectOrFail(projectId, orgId);
    await this.assertProjectPermission(
      callerId,
      project,
      PERMISSIONS.PROJECTS.ROLES.VIEW,
    );

    const role = await this.roleRepo.findOne({
      where: {
        id: roleId,
        organizationId: project.organizationId,
        projectId: project.id,
      },
    });
    if (!role) {
      throw new ValidationException(ErrorCode.R001);
    }

    const permissions: { code: string }[] = await this.rpRepo
      .createQueryBuilder('rp')
      .innerJoin(Permission, 'perm', 'perm.id = rp.permission_id')
      .where('rp.role_id = :roleId', { roleId })
      .select('perm.code', 'code')
      .getRawMany();

    return plainToInstance(ProjectRoleDetailResponse, {
      ...role,
      permissions: permissions.map((p) => p.code),
    });
  }

  async updateRole(
    roleId: string,
    projectId: string,
    orgId: string,
    callerId: string,
    dto: UpdateProjectRoleRequest,
  ): Promise<void> {
    const project = await this.getProjectOrFail(projectId, orgId);
    await this.assertProjectPermission(
      callerId,
      project,
      PERMISSIONS.PROJECTS.ROLES.UPDATE,
    );

    const role = await this.roleRepo.findOne({
      where: {
        id: roleId,
        organizationId: project.organizationId,
        projectId: project.id,
      },
    });
    if (!role) {
      throw new ValidationException(ErrorCode.R001);
    }

    if (role.isSystemRole) {
      throw new ForbiddenException('You cannot edit a system role');
    }

    if (dto.name && dto.name !== role.name) {
      const duplicate = await this.roleRepo.findOne({
        where: {
          name: dto.name,
          organizationId: project.organizationId,
          projectId: project.id,
        },
      });
      if (duplicate) {
        throw new ValidationException(ErrorCode.R002);
      }
    }

    if (dto.name !== undefined) role.name = dto.name;
    if (dto.description !== undefined) role.description = dto.description;
    await this.roleRepo.save(role);

    const roleDetail = await this.buildRoleDetailResponse(role.id);
    this.eventEmitter.emit(PROJECT_REALTIME_EVENTS.ROLE_UPDATED, {
      ...this.buildRealtimeMeta(projectId, callerId),
      role: roleDetail,
    });
  }

  async deleteRole(
    roleId: string,
    projectId: string,
    orgId: string,
    callerId: string,
  ): Promise<void> {
    const project = await this.getProjectOrFail(projectId, orgId);
    await this.assertProjectPermission(
      callerId,
      project,
      PERMISSIONS.PROJECTS.ROLES.DELETE,
    );

    const role = await this.roleRepo.findOne({
      where: {
        id: roleId,
        organizationId: project.organizationId,
        projectId: project.id,
      },
    });
    if (!role) {
      throw new ValidationException(ErrorCode.R001);
    }

    if (role.isSystemRole) {
      throw new ForbiddenException('You cannot delete a system role');
    }

    await this.roleRepo.remove(role);
    this.eventEmitter.emit(PROJECT_REALTIME_EVENTS.ROLE_DELETED, {
      ...this.buildRealtimeMeta(projectId, callerId),
      roleId: role.id,
    });
  }

  async assignPermissions(
    dto: AssignPermissionsToProjectRoleRequest,
    callerId: string,
    projectId: string,
    orgId: string,
  ): Promise<void> {
    const project = await this.getProjectOrFail(projectId, orgId);
    await this.assertProjectPermission(
      callerId,
      project,
      PERMISSIONS.PROJECTS.ROLES.ASSIGN_PERMISSIONS,
    );

    const role = await this.roleRepo.findOne({
      where: {
        id: dto.roleId,
        organizationId: project.organizationId,
        projectId: project.id,
      },
    });
    if (!role) {
      throw new ValidationException(ErrorCode.R001);
    }

    await this.checkCallerPermissions(callerId, project, dto.permissionCodes);

    const permissions = await this.permissionRepo.find({
      where: { code: In(dto.permissionCodes) },
    });
    if (permissions.length !== dto.permissionCodes.length) {
      throw new ValidationException(ErrorCode.P005);
    }

    const rps = permissions.map((p) =>
      this.rpRepo.create({ roleId: dto.roleId, permissionId: p.id }),
    );
    await this.rpRepo.upsert(rps, ['roleId', 'permissionId']);

    const roleDetail = await this.buildRoleDetailResponse(dto.roleId);
    this.eventEmitter.emit(PROJECT_REALTIME_EVENTS.ROLE_PERMISSIONS_UPDATED, {
      ...this.buildRealtimeMeta(projectId, callerId),
      role: roleDetail,
    });
  }

  async revokePermissions(
    dto: RevokePermissionsFromProjectRoleRequest,
    callerId: string,
    projectId: string,
    orgId: string,
  ): Promise<void> {
    const project = await this.getProjectOrFail(projectId, orgId);
    await this.assertProjectPermission(
      callerId,
      project,
      PERMISSIONS.PROJECTS.ROLES.REVOKE_PERMISSIONS,
    );

    const role = await this.roleRepo.findOne({
      where: {
        id: dto.roleId,
        organizationId: project.organizationId,
        projectId: project.id,
      },
    });
    if (!role) {
      throw new ValidationException(ErrorCode.R001);
    }

    await this.checkCallerPermissions(callerId, project, dto.permissionCodes);

    const permissions = await this.permissionRepo.find({
      where: { code: In(dto.permissionCodes) },
    });
    if (!permissions.length) return;

    const permissionIds = permissions.map((p) => p.id);

    await this.rpRepo
      .createQueryBuilder()
      .delete()
      .where('role_id = :roleId', { roleId: dto.roleId })
      .andWhere('permission_id IN (:...permissionIds)', { permissionIds })
      .execute();

    const roleDetail = await this.buildRoleDetailResponse(dto.roleId);
    this.eventEmitter.emit(PROJECT_REALTIME_EVENTS.ROLE_PERMISSIONS_UPDATED, {
      ...this.buildRealtimeMeta(projectId, callerId),
      role: roleDetail,
    });
  }

  async assignRoleToMember(
    dto: AssignRoleToProjectMemberRequest,
    callerId: string,
    projectId: string,
    orgId: string,
  ): Promise<void> {
    const project = await this.getProjectOrFail(projectId, orgId);
    await this.assertProjectPermission(
      callerId,
      project,
      PERMISSIONS.PROJECTS.ROLES.ASSIGN_TO_MEMBER,
    );

    await this.getMemberOrFail(projectId, project.organizationId, dto.userId);

    if (callerId === dto.userId) {
      throw new ForbiddenException('You cannot assign role to yourself');
    }

    const role = await this.roleRepo.findOne({
      where: {
        id: dto.roleId,
        organizationId: project.organizationId,
        projectId: project.id,
      },
    });
    if (!role) {
      throw new ValidationException(ErrorCode.R001);
    }
    if (role.name === SYSTEM_ROLES.SYSTEM_ADMIN) {
      throw new ForbiddenException(
        'You cannot assign system_admin role through this endpoint',
      );
    }
    if (role.projectId !== project.id) {
      throw new ForbiddenException('Role does not belong to this project');
    }

    const existing = await this.userRoleRepo.findOne({
      where: {
        userId: dto.userId,
        organizationId: project.organizationId,
        roleId: dto.roleId,
        scopeType: ScopeType.PROJECT,
        scopeId: projectId,
      },
    });
    if (existing) {
      throw new ConflictException(ErrorCode.UR002);
    }

    const userRole = this.userRoleRepo.create({
      userId: dto.userId,
      organizationId: project.organizationId,
      roleId: dto.roleId,
      scopeType: ScopeType.PROJECT,
      scopeId: projectId,
      assignedBy: callerId,
    });
    await this.userRoleRepo.save(userRole);
    await this.syncProjectMemberPrimaryRoleId(
      dto.userId,
      projectId,
      project.organizationId,
    );
    await this.projectCoreService.syncProjectManagerField(
      projectId,
      project.organizationId,
      dto.userId,
    );

    this.eventEmitter.emit(
      PROJECT_REALTIME_EVENTS.ROLE_MEMBER_ASSIGNMENT_UPDATED,
      {
        ...this.buildRealtimeMeta(projectId, callerId),
        userId: dto.userId,
        roleIds: await this.getProjectRoleIdsForMember(
          dto.userId,
          projectId,
          project.organizationId,
        ),
      },
    );
  }

  async revokeRoleFromMember(
    dto: RevokeRoleFromProjectMemberRequest,
    projectId: string,
    orgId: string,
    callerId: string,
  ): Promise<void> {
    const project = await this.getProjectOrFail(projectId, orgId);
    await this.assertProjectPermission(
      callerId,
      project,
      PERMISSIONS.PROJECTS.ROLES.REVOKE_FROM_MEMBER,
    );

    await this.getMemberOrFail(projectId, project.organizationId, dto.userId);

    const userRole = await this.userRoleRepo.findOne({
      where: {
        userId: dto.userId,
        organizationId: project.organizationId,
        roleId: dto.roleId,
        scopeType: ScopeType.PROJECT,
        scopeId: projectId,
      },
    });

    if (!userRole) {
      throw new ValidationException(ErrorCode.UR001);
    }

    await this.assertProjectManagerCanRevokeRole(
      callerId,
      project,
      dto.roleId,
    );

    await this.userRoleRepo.remove(userRole);
    await this.syncProjectMemberPrimaryRoleId(
      dto.userId,
      projectId,
      project.organizationId,
    );
    await this.projectCoreService.syncProjectManagerField(
      projectId,
      project.organizationId,
      dto.userId,
    );
    this.eventEmitter.emit(
      PROJECT_REALTIME_EVENTS.ROLE_MEMBER_ASSIGNMENT_UPDATED,
      {
        ...this.buildRealtimeMeta(projectId, callerId),
        userId: dto.userId,
        roleIds: await this.getProjectRoleIdsForMember(
          dto.userId,
          projectId,
          project.organizationId,
        ),
      },
    );
  }

  async getMemberRoles(
    memberId: string,
    projectId: string,
    orgId: string,
    callerId: string,
  ): Promise<ProjectMemberRoleResponse[]> {
    const project = await this.getProjectOrFail(projectId, orgId);
    await this.assertProjectPermission(
      callerId,
      project,
      PERMISSIONS.PROJECTS.ROLES.VIEW,
    );
    await this.getMemberOrFail(projectId, project.organizationId, memberId);

    const userRoles = await this.userRoleRepo
      .createQueryBuilder('ur')
      .innerJoin(Role, 'r', 'r.id = ur.role_id')
      .where('ur.user_id = :memberId', { memberId })
      .andWhere('ur.organization_id = :orgId', { orgId })
      .andWhere('ur.scope_type = :scope', { scope: ScopeType.PROJECT })
      .andWhere('ur.scope_id = :projectId', { projectId })
      .andWhere(
        '(r.project_id = :projectId OR (r.project_id IS NULL AND r."organizationId" = :orgId))',
        { projectId, orgId },
      )
      .select([
        'ur.id AS "id"',
        'ur.role_id AS "roleId"',
        'r.name AS "roleName"',
        'r.description AS "roleDescription"',
        'ur.scope_type AS "scopeType"',
        'ur.scope_id AS "scopeId"',
        'ur.assigned_at AS "assignedAt"',
      ])
      .getRawMany();

    return plainToInstance(ProjectMemberRoleResponse, userRoles);
  }

  private async buildRoleDetailResponse(
    roleId: string,
  ): Promise<ProjectRoleDetailResponse> {
    const role = await this.roleRepo.findOne({
      where: { id: roleId },
    });
    if (!role) {
      throw new ValidationException(ErrorCode.R001);
    }

    const permissions: { code: string }[] = await this.rpRepo
      .createQueryBuilder('rp')
      .innerJoin(Permission, 'perm', 'perm.id = rp.permission_id')
      .where('rp.role_id = :roleId', { roleId })
      .select('perm.code', 'code')
      .getRawMany();

    return plainToInstance(ProjectRoleDetailResponse, {
      ...role,
      permissions: permissions.map((item) => item.code),
    });
  }

  private async getProjectRoleIdsForMember(
    userId: string,
    projectId: string,
    orgId: string,
  ): Promise<string[]> {
    const rows = await this.userRoleRepo
      .createQueryBuilder('ur')
      .innerJoin(Role, 'r', 'r.id = ur.role_id')
      .where('ur.user_id = :userId', { userId })
      .andWhere('ur.organization_id = :orgId', { orgId })
      .andWhere('ur.scope_type = :scopeType', { scopeType: ScopeType.PROJECT })
      .andWhere('ur.scope_id = :projectId', { projectId })
      .andWhere('r.project_id = :projectId', { projectId })
      .select('ur.role_id', 'roleId')
      .getRawMany<{ roleId: string }>();

    return [...new Set(rows.map((row) => row.roleId))];
  }

  private async assertProjectManagerCanRevokeRole(
    callerId: string,
    project: Project,
    roleId: string,
  ): Promise<void> {
    const role = await this.roleRepo.findOne({
      where: {
        id: roleId,
        organizationId: project.organizationId,
        projectId: project.id,
      },
    });
    if (!role) {
      throw new ValidationException(ErrorCode.R001);
    }

    if (role.name !== PROJECT_OWNER_ROLE_NAME) return;

    const isAssignedProjectManager = (project.managerId ?? []).includes(
      callerId,
    );
    const [hasProjectManagerRole, isProjectOwner, isOrgOrSystemAdmin] =
      await Promise.all([
        this.hasProjectScopedRole(
          callerId,
          project.organizationId,
          project.id,
          PROJECT_MANAGER_ROLE_NAME,
        ),
        this.hasProjectScopedRole(
          callerId,
          project.organizationId,
          project.id,
          PROJECT_OWNER_ROLE_NAME,
        ),
        this.hasOrganizationOrSystemAdminRole(callerId, project.organizationId),
      ]);
    const isProjectManager = isAssignedProjectManager || hasProjectManagerRole;

    if (isProjectManager && !isProjectOwner && !isOrgOrSystemAdmin) {
      throw new ForbiddenException(
        'Project managers cannot revoke the project_owner role',
      );
    }
  }

  private async hasProjectScopedRole(
    userId: string,
    orgId: string,
    projectId: string,
    roleName: string,
  ): Promise<boolean> {
    const row = await this.userRoleRepo
      .createQueryBuilder('ur')
      .innerJoin(Role, 'r', 'r.id = ur.role_id')
      .where('ur.user_id = :userId', { userId })
      .andWhere('ur.organization_id = :orgId', { orgId })
      .andWhere('ur.scope_type = :scopeType', { scopeType: ScopeType.PROJECT })
      .andWhere('ur.scope_id = :projectId', { projectId })
      .andWhere('r.name = :roleName', { roleName })
      .andWhere('r.project_id = :projectId', { projectId })
      .andWhere('r.deleted_at IS NULL')
      .getOne();

    return !!row;
  }

  private async hasOrganizationOrSystemAdminRole(
    userId: string,
    orgId: string,
  ): Promise<boolean> {
    const row = await this.userRoleRepo
      .createQueryBuilder('ur')
      .innerJoin(Role, 'r', 'r.id = ur.role_id')
      .where('ur.user_id = :userId', { userId })
      .andWhere(
        `(
          (r.name = :systemAdminRole AND r.isSystemRole = true)
          OR (
            ur.organization_id = :orgId
            AND ur.scope_type = :orgScope
            AND ur.scope_id IS NULL
            AND r.name = :orgAdminRole
            AND r.isSystemRole = true
          )
        )`,
        {
          systemAdminRole: SYSTEM_ROLES.SYSTEM_ADMIN,
          orgAdminRole: SYSTEM_ROLES.ORG_ADMIN,
          orgScope: ScopeType.ORGANIZATION,
          orgId,
        },
      )
      .getOne();

    return !!row;
  }

  private async syncProjectMemberPrimaryRoleId(
    userId: string,
    projectId: string,
    orgId: string,
  ): Promise<void> {
    const rows = await this.userRoleRepo
      .createQueryBuilder('ur')
      .innerJoin(Role, 'r', 'r.id = ur.role_id')
      .where('ur.user_id = :userId', { userId })
      .andWhere('ur.organization_id = :orgId', { orgId })
      .andWhere('ur.scope_type = :scopeType', { scopeType: ScopeType.PROJECT })
      .andWhere('ur.scope_id = :projectId', { projectId })
      .andWhere('r.project_id = :projectId', { projectId })
      .andWhere('r.deleted_at IS NULL')
      .select('ur.role_id', 'roleId')
      .orderBy(
        `CASE
          WHEN r.name = 'project_owner' THEN 0
          WHEN r.name = 'project_manager' THEN 1
          ELSE 2
        END`,
        'ASC',
      )
      .addOrderBy('ur.assigned_at', 'ASC')
      .getRawMany<{ roleId: string }>();

    await this.projectMemberRepo.update(
      { projectId, organizationId: orgId, userId },
      { roleId: (rows[0]?.roleId ?? null) as any },
    );
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

  async getAvailablePermissions(
    projectId: string,
    orgId: string,
    callerId: string,
  ): Promise<{ code: string; name: string; module: string }[]> {
    const project = await this.getProjectOrFail(projectId, orgId);
    await this.assertProjectPermission(
      callerId,
      project,
      PERMISSIONS.PROJECTS.ROLES.LIST,
    );

    const permissions = await this.permissionRepo.find({
      where: { module: 'projects' },
      order: { code: 'ASC' },
    });

    return permissions.map((p) => ({
      code: p.code,
      name: p.name,
      module: p.module,
    }));
  }
}
