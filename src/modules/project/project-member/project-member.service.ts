import { ChatScopeAccessPolicyService } from '@modules/chat-box/policies/chat-scope-access-policy.service';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { ProjectMember } from '../core/entities/project-member.entity';
import { ProjectCoreService } from '../core/project-core.service';
import { UpdateProjectMemberRequest } from './dto/request/update-project-member.request';
import { ProjectMemberResponse } from './dto/response/project-member.response';
import { PERMISSIONS } from '@modules/rbac/constant/permission.constant';
import { CreateProjectMemberInviteRequest } from './dto/request/create-project-member-invite.request';
import { ProjectInviteResponse } from '../core/dto/response/project-invite.response';
import { ProjectInviteRole } from '../core/entities/project-invite.entity';
import { Role } from '@modules/rbac/entities/role.entity';
import { ScopeType, UserRole } from '@modules/rbac/entities/user-role.entity';
import { User } from '@modules/users/entities/user.entity';

@Injectable()
export class ProjectMemberService {
  constructor(
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepo: Repository<ProjectMember>,

    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,

    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,

    private readonly projectCoreService: ProjectCoreService,
    private readonly chatScopeAccessPolicyService: ChatScopeAccessPolicyService,
  ) {}

  async getMembers(
    projectId: string,
    orgId: string,
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<ProjectMemberResponse[]> {
    await this.projectCoreService.ensureUserInProject(projectId, orgId, userId, {
      allowOrgAdmin: true,
    });
    await this.projectCoreService.assertProjectPermission(
      userId,
      orgId,
      projectId,
      PERMISSIONS.PROJECTS.MEMBERS.LIST,
    );

    const take = Math.max(1, Math.min(limit, 100));
    const skip = (Math.max(page, 1) - 1) * take;

    const rows = await this.projectMemberRepo
      .createQueryBuilder('pm')
      .leftJoin(User, 'u', 'u.id = pm.user_id AND u.deleted_at IS NULL')
      .leftJoin(
        Role,
        'legacyRole',
        'legacyRole.id = pm.role_id AND legacyRole.deleted_at IS NULL',
      )
      .where('pm.project_id = :projectId', { projectId })
      .andWhere('pm.organization_id = :orgId', { orgId })
      .andWhere('pm.deleted_at IS NULL')
      .orderBy('pm.joined_at', 'ASC')
      .offset(skip)
      .limit(take)
      .select([
        'pm.id AS "id"',
        'pm.project_id AS "projectId"',
        'pm.organization_id AS "organizationId"',
        'pm.user_id AS "userId"',
        'pm.role_id AS "roleId"',
        'pm.allocated_hours_per_day AS "allocatedHoursPerDay"',
        'pm.is_active AS "isActive"',
        'pm.joined_at AS "joinedAt"',
        'pm.created_at AS "createdAt"',
        'u.first_name AS "firstName"',
        'u.last_name AS "lastName"',
        'u.email AS "email"',
        'u.avatar_url AS "avatar"',
        'legacyRole.name AS "roleName"',
      ])
      .getRawMany<{
        id: string;
        projectId: string;
        organizationId: string;
        userId: string;
        roleId?: string;
        allocatedHoursPerDay?: number;
        isActive: boolean;
        joinedAt: Date;
        createdAt: Date;
        firstName?: string;
        lastName?: string;
        email?: string;
        avatar?: string;
        roleName?: string;
      }>();

    const rolesByUserId = await this.getProjectRoleAssignmentsByUserIds(
      projectId,
      orgId,
      rows.map((row) => row.userId),
    );

    const members = rows.map((row) => {
      const fullName = [row.firstName, row.lastName]
        .filter(Boolean)
        .join(' ')
        .trim();
      const assignedRoles = rolesByUserId.get(row.userId) ?? [];
      const primaryAssignedRole = assignedRoles[0];
      const roleIds = assignedRoles.map((role) => role.roleId);
      const roleNames = assignedRoles.map((role) => role.roleName);
      const effectiveRoleId = row.roleId ?? primaryAssignedRole?.roleId;
      const effectiveRoleName = row.roleName ?? primaryAssignedRole?.roleName;

      return {
        id: row.id,
        projectId: row.projectId,
        organizationId: row.organizationId,
        userId: row.userId,
        roleId: effectiveRoleId,
        roleName: effectiveRoleName,
        roleIds,
        roleNames,
        roles: assignedRoles,
        allocatedHoursPerDay:
          row.allocatedHoursPerDay != null
            ? Number(row.allocatedHoursPerDay)
            : undefined,
        isActive: row.isActive,
        joinedAt: row.joinedAt,
        createdAt: row.createdAt,
        fullName: fullName || row.email || row.userId,
        email: row.email,
        avatar: row.avatar,
      };
    });

    return plainToInstance(ProjectMemberResponse, members);
  }

  async createMemberInvite(
    projectId: string,
    orgId: string,
    actorUserId: string,
    dto: CreateProjectMemberInviteRequest,
  ): Promise<ProjectInviteResponse[]> {
    await this.assertCanManageMembers(
      projectId,
      orgId,
      actorUserId,
      PERMISSIONS.PROJECTS.MEMBERS.ADD,
    );

    return this.projectCoreService.createProjectInvite(
      projectId,
      orgId,
      actorUserId,
      {
        inviteeUserIds: dto.inviteeUserIds,
        inviteeUserId: dto.inviteeUserId,
      },
      ProjectInviteRole.MEMBER,
    );
  }

  async updateMemberRole(
    projectId: string,
    memberId: string,
    orgId: string,
    actorUserId: string,
    dto: UpdateProjectMemberRequest,
  ): Promise<ProjectMemberResponse> {
    if (
      dto.roleId === undefined &&
      dto.allocatedHoursPerDay === undefined
    ) {
      throw new BadRequestException(
        'At least one of roleId or allocatedHoursPerDay is required',
      );
    }

    await this.assertCanManageMembers(
      projectId,
      orgId,
      actorUserId,
      PERMISSIONS.PROJECTS.MEMBERS.UPDATE,
    );
    const member = await this.projectMemberRepo.findOne({
      where: {
        id: memberId,
        projectId,
        organizationId: orgId,
        deletedAt: IsNull(),
      },
    });
    if (!member) throw new NotFoundException('Project member not found');

    if (dto.roleId !== undefined) {
      const role = await this.roleRepo.findOne({
        where: { id: dto.roleId, organizationId: orgId, projectId },
      });
      if (!role) {
        throw new NotFoundException('Project role not found');
      }
      if (role.projectId !== projectId) {
        throw new ForbiddenException('Role does not belong to this project');
      }

      member.roleId = dto.roleId;
    }

    if (dto.allocatedHoursPerDay !== undefined) {
      member.allocatedHoursPerDay = dto.allocatedHoursPerDay;
    }
    const saved = await this.projectMemberRepo.save(member);

    if (dto.roleId !== undefined) {
      await this.userRoleRepo
        .createQueryBuilder()
        .delete()
        .where('user_id = :userId', { userId: member.userId })
        .andWhere('organization_id = :orgId', { orgId })
        .andWhere('scope_type = :scopeType', { scopeType: ScopeType.PROJECT })
        .andWhere('scope_id = :projectId', { projectId })
        .execute();

      await this.userRoleRepo.save(
        this.userRoleRepo.create({
          userId: member.userId,
          organizationId: orgId,
          roleId: dto.roleId,
          scopeType: ScopeType.PROJECT,
          scopeId: projectId,
          assignedBy: actorUserId,
        }),
      );
      await this.projectCoreService.syncProjectManagerField(
        projectId,
        orgId,
        member.userId,
      );
    }

    return plainToInstance(ProjectMemberResponse, saved);
  }

  async removeMember(
    projectId: string,
    memberId: string,
    orgId: string,
    actorUserId: string,
  ): Promise<void> {
    await this.assertCanManageMembers(
      projectId,
      orgId,
      actorUserId,
      PERMISSIONS.PROJECTS.MEMBERS.REMOVE,
    );

    const member = await this.projectMemberRepo.findOne({
      where: {
        id: memberId,
        projectId,
        organizationId: orgId,
        deletedAt: IsNull(),
      },
    });
    if (!member) throw new NotFoundException('Project member not found');

    member.deletedAt = new Date();
    member.deletedBy = actorUserId;
    member.isActive = false;
    await this.projectMemberRepo.save(member);
    await this.projectCoreService.removeProjectManagerUser(
      projectId,
      orgId,
      member.userId,
    );
    await this.chatScopeAccessPolicyService.syncProjectRoomMembershipRemoval(
      projectId,
      orgId,
      member.userId,
    );
  }

  private async assertCanManageMembers(
    projectId: string,
    orgId: string,
    actorUserId: string,
    permissionCode: string,
  ): Promise<void> {
    const hasPermission = await this.projectCoreService.hasProjectPermission(
      actorUserId,
      orgId,
      projectId,
      permissionCode,
    );
    if (hasPermission) return;

    throw new ForbiddenException(`Missing permission: ${permissionCode}`);
  }

  private async getProjectRoleAssignmentsByUserIds(
    projectId: string,
    orgId: string,
    userIds: string[],
  ): Promise<
    Map<
      string,
      Array<{
        id: string;
        roleId: string;
        roleName: string;
        roleDescription?: string;
        scopeType: string;
        scopeId: string;
        assignedAt: Date;
      }>
    >
  > {
    const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
    const rolesByUserId = new Map<
      string,
      Array<{
        id: string;
        roleId: string;
        roleName: string;
        roleDescription?: string;
        scopeType: string;
        scopeId: string;
        assignedAt: Date;
      }>
    >();
    if (!uniqueUserIds.length) return rolesByUserId;

    const rows = await this.userRoleRepo
      .createQueryBuilder('ur')
      .innerJoin(Role, 'r', 'r.id = ur.role_id')
      .where('ur.user_id IN (:...userIds)', { userIds: uniqueUserIds })
      .andWhere('ur.organization_id = :orgId', { orgId })
      .andWhere('ur.scope_type = :scopeType', { scopeType: ScopeType.PROJECT })
      .andWhere('ur.scope_id = :projectId', { projectId })
      .andWhere(
        '(r.project_id = :projectId OR (r.project_id IS NULL AND r."organizationId" = :orgId))',
        { projectId, orgId },
      )
      .andWhere('r.deleted_at IS NULL')
      .select([
        'ur.id AS "id"',
        'ur.user_id AS "userId"',
        'ur.role_id AS "roleId"',
        'r.name AS "roleName"',
        'r.description AS "roleDescription"',
        'ur.scope_type AS "scopeType"',
        'ur.scope_id AS "scopeId"',
        'ur.assigned_at AS "assignedAt"',
      ])
      .orderBy(
        `CASE
          WHEN r.name = 'project_owner' THEN 0
          WHEN r.name = 'project_manager' THEN 1
          ELSE 2
        END`,
        'ASC',
      )
      .addOrderBy('ur.assigned_at', 'ASC')
      .getRawMany<{
        id: string;
        userId: string;
        roleId: string;
        roleName: string;
        roleDescription?: string;
        scopeType: string;
        scopeId: string;
        assignedAt: Date;
      }>();

    for (const row of rows) {
      const assignedRoles = rolesByUserId.get(row.userId) ?? [];
      assignedRoles.push({
        id: row.id,
        roleId: row.roleId,
        roleName: row.roleName,
        roleDescription: row.roleDescription,
        scopeType: row.scopeType,
        scopeId: row.scopeId,
        assignedAt: row.assignedAt,
      });
      rolesByUserId.set(row.userId, assignedRoles);
    }

    return rolesByUserId;
  }
}
