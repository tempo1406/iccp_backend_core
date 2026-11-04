import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';

import { Role } from '@modules/rbac/entities/role.entity';
import { UserRole, ScopeType } from '@modules/rbac/entities/user-role.entity';
import { Permission } from '@modules/rbac/entities/permissions.entity';
import { RolePermission } from '@modules/rbac/entities/role-permission.entity';
import { RbacService } from '@modules/rbac/rbac.service';
import {
  PERMISSIONS,
  SYSTEM_ROLES,
} from '@modules/rbac/constant/permission.constant';
import { OrganizationMember } from '../core/entities/organization-member.entity';

import { CreateOrgRoleRequest } from './dto/request/create-org-role.request';
import { UpdateRoleRequest } from './dto/request/update-role.request';
import { AssignPermissionsToOrgRoleRequest } from './dto/request/assign-permissions.request';
import { RevokePermissionsRequest } from './dto/request/revoke-permissions.request';
import { UpdateRolePermissionsRequest } from './dto/request/update-role-permissions.request';
import { AssignRoleToMemberRequest } from './dto/request/assign-role-to-member.request';
import { RevokeRoleFromMemberRequest } from './dto/request/revoke-role-from-member.request';
import {
  GetRolesQueryRequest,
  ROLE_SORT_FIELDS,
} from './dto/request/get-roles-query.request';
import { OrgRoleResponse } from './dto/response/org-role.response';
import { OrgRoleDetailResponse } from './dto/response/org-role-detail.response';
import { UserOrgRoleResponse } from './dto/response/user-org-role.response';
import { PaginatedResponse } from '@common/dto/paginated.response';
import { PaginationHelper } from '@common/helpers/pagination.helper';
import { ValidationException } from '@common/exceptions/validation.exception';
import { ErrorCode } from '@common/constants/error-code.constant';
import { OrganizationCoreService } from '../core/organization-core.service';

interface CallerPermissionContext {
  isSystemAdmin: boolean;
  callerPermissions: string[];
  callerPermissionSet: Set<string>;
}

@Injectable()
export class RoleManageService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,

    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,

    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,

    @InjectRepository(RolePermission)
    private readonly rpRepo: Repository<RolePermission>,

    @InjectRepository(OrganizationMember)
    private readonly orgMemberRepo: Repository<OrganizationMember>,

    private readonly rbacService: RbacService,

    private readonly organizationCoreService: OrganizationCoreService,

    private readonly dataSource: DataSource,
  ) {}

  private toStringArray(value: string | string[] | null | undefined): string[] {
    if (Array.isArray(value)) {
      return value.filter(
        (item): item is string => typeof item === 'string' && item.length > 0,
      );
    }
    if (typeof value === 'string' && value.length > 0) {
      return [value];
    }
    return [];
  }

  private normalizePermissionCodes(permissionCodes?: string[]): string[] {
    return Array.from(
      new Set(
        (permissionCodes ?? [])
          .map((code) => code.trim())
          .filter((code) => code.length > 0),
      ),
    );
  }

  private async getOrganizationRoleOrThrow(
    roleId: string,
    orgId: string,
  ): Promise<Role> {
    const role = await this.roleRepo.findOne({
      where: { id: roleId, organizationId: orgId, projectId: IsNull() },
    });
    if (!role) {
      throw new ValidationException(ErrorCode.R001);
    }
    return role;
  }

  private async getPermissionEntitiesOrThrow(
    permissionCodes: string[],
  ): Promise<Permission[]> {
    const normalizedPermissionCodes =
      this.normalizePermissionCodes(permissionCodes);
    if (normalizedPermissionCodes.length === 0) {
      return [];
    }

    const permissions = await this.permissionRepo.find({
      where: { code: In(normalizedPermissionCodes) },
    });

    const permissionCodeSet = new Set(
      permissions.map((permission) => permission.code),
    );
    const invalidCodes = normalizedPermissionCodes.filter(
      (code) => !permissionCodeSet.has(code),
    );
    if (invalidCodes.length > 0) {
      throw new ValidationException(ErrorCode.V000);
    }

    return permissions;
  }

  private async getRolePermissionCodes(roleId: string): Promise<string[]> {
    const permissions: { code: string }[] = await this.rpRepo
      .createQueryBuilder('rp')
      .innerJoin(Permission, 'perm', 'perm.id = rp.permission_id')
      .where('rp.role_id = :roleId', { roleId })
      .select('perm.code', 'code')
      .getRawMany();

    return permissions.map((permission) => permission.code);
  }

  private async getCallerPermissionContext(
    callerId: string,
    orgId: string,
  ): Promise<CallerPermissionContext> {
    const callerSystemRoles = this.toStringArray(
      await this.rbacService.getUserSystemRole(callerId),
    );
    const isSystemAdmin = callerSystemRoles.includes(SYSTEM_ROLES.SYSTEM_ADMIN);
    const callerPermissions = isSystemAdmin
      ? []
      : this.toStringArray(
          await this.rbacService.getUserPermissions(callerId, orgId),
        );

    return {
      isSystemAdmin,
      callerPermissions,
      callerPermissionSet: new Set(callerPermissions),
    };
  }

  // Tạo role mới trong org
  async createRole(
    dto: CreateOrgRoleRequest,
    callerId: string,
    orgId: string,
  ): Promise<void> {
    try {
      const organization =
        await this.organizationCoreService.getOrganizationById(orgId);
      if (!organization) {
        throw new ValidationException(ErrorCode.O001);
      }

      // Check trùng tên trong cùng org
      const existing = await this.roleRepo.findOne({
        where: { name: dto.name, organizationId: orgId, projectId: IsNull() },
      });
      if (existing) {
        throw new ValidationException(ErrorCode.R002);
      }

      // Validate permissions + anti-escalation TRƯỚC transaction để fail-fast
      const normalizedPermissionCodes = this.normalizePermissionCodes(
        dto.permissionCodes,
      );
      let permissionsToAssign: Permission[] = [];
      if (normalizedPermissionCodes.length > 0) {
        permissionsToAssign = await this.getPermissionEntitiesOrThrow(
          normalizedPermissionCodes,
        );

        const callerContext = await this.getCallerPermissionContext(
          callerId,
          orgId,
        );
        if (!callerContext.isSystemAdmin) {
          const unauthorized = normalizedPermissionCodes.filter(
            (code) => !callerContext.callerPermissionSet.has(code),
          );
          if (unauthorized.length > 0) {
            throw new ForbiddenException(
              `You cannot assign permissions you do not have: ${unauthorized.join(', ')}`,
            );
          }
        }
      }

      // Transaction đảm bảo atomicity: role + permissions cùng commit hoặc cùng rollback
      await this.dataSource.transaction(async (manager) => {
        const role = manager.create(Role, {
          name: dto.name,
          description: dto.description,
          organizationId: orgId,
          projectId: undefined,
          isSystemRole: false,
          createdBy: callerId,
        });
        const saved = await manager.save(role);

        if (permissionsToAssign.length) {
          const rps = permissionsToAssign.map((p) =>
            manager.create(RolePermission, {
              roleId: saved.id,
              permissionId: p.id,
            }),
          );
          await manager.upsert(RolePermission, rps, ['roleId', 'permissionId']);
        }
      });
    } catch (error) {
      console.error('Error creating org role:', error);
      throw error;
    }
  }

  // Lấy role hiện tại của user trong org (có thể filter theo scopeType)
  async getMyRole(
    userId: string,
    orgId: string,
    scopeType?: ScopeType,
  ): Promise<UserOrgRoleResponse[]> {
    try {
      const organization =
        await this.organizationCoreService.getOrganizationById(orgId);

      if (!organization) {
        throw new ValidationException(ErrorCode.O001);
      }

      const qb = this.userRoleRepo
        .createQueryBuilder('ur')
        .innerJoin(Role, 'r', 'r.id = ur.role_id')
        .where('ur.user_id = :userId', { userId })
        .andWhere('ur.organization_id = :orgId', { orgId });

      // Filter theo scopeType nếu có — dùng để FE hiện multi-tab (org vs project)
      if (scopeType) {
        qb.andWhere('ur.scope_type = :scope', { scope: scopeType });
      }

      const userRoles = await qb
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

      return plainToInstance(UserOrgRoleResponse, userRoles);
    } catch (error) {
      console.error('Error getting my role:', error);
      throw error;
    }
  }

  // Lấy danh sách tất cả roles trong org (có phân trang + filter)
  async getRoles(
    orgId: string,
    query: GetRolesQueryRequest = {},
  ): Promise<PaginatedResponse<OrgRoleResponse>> {
    try {
      const organization =
        await this.organizationCoreService.getOrganizationById(orgId);

      if (!organization) {
        throw new ValidationException(ErrorCode.O001);
      }

      const alias = 'role';
      const qb = this.roleRepo
        .createQueryBuilder(alias)
        // Bao gồm org_admin trong WHERE để total chính xác (fix pagination bug)
        .where(
          `((${alias}.organizationId = :orgId AND ${alias}.projectId IS NULL) OR (${alias}.isSystemRole = :isSystem AND ${alias}.name = :adminName AND ${alias}.projectId IS NULL))`,
          { orgId, isSystem: true, adminName: SYSTEM_ROLES.ORG_ADMIN },
        );

      // Filter theo tên role (ILIKE)
      if (query.search) {
        qb.andWhere(`${alias}.name ILIKE :search`, {
          search: `%${query.search}%`,
        });
      }

      PaginationHelper.applyToQueryBuilder(qb, query, ROLE_SORT_FIELDS, alias);

      // getManyAndCount() = 1 query thay vì 2 queries riêng (getCount + getMany)
      const [roles, total] = await qb.getManyAndCount();

      const items = plainToInstance(OrgRoleResponse, roles);
      const meta = PaginationHelper.buildMeta(total, query);

      return new PaginatedResponse(items, meta);
    } catch (error) {
      console.error('Error getting org roles:', error);
      throw error;
    }
  }

  // Lấy chi tiết 1 role (kèm permissions)
  async getRoleDetail(
    roleId: string,
    orgId: string,
  ): Promise<OrgRoleDetailResponse> {
    try {
      const organization =
        await this.organizationCoreService.getOrganizationById(orgId);

      if (!organization) {
        throw new ValidationException(ErrorCode.O001);
      }

      const role = await this.roleRepo.findOne({
        where: { id: roleId, organizationId: orgId, projectId: IsNull() },
      });
      if (!role) {
        throw new ValidationException(ErrorCode.R001);
      }

      const permissions = await this.getRolePermissionCodes(roleId);

      return plainToInstance(OrgRoleDetailResponse, {
        ...role,
        permissions,
      });
    } catch (error) {
      console.error('Error getting role detail:', error);
      throw error;
    }
  }

  // Cập nhật role (name, description) — không cho sửa role owner mặc định
  async updateRole(
    roleId: string,
    orgId: string,
    dto: UpdateRoleRequest,
  ): Promise<void> {
    try {
      const organization =
        await this.organizationCoreService.getOrganizationById(orgId);

      if (!organization) {
        throw new ValidationException(ErrorCode.O001);
      }

      const role = await this.roleRepo.findOne({
        where: { id: roleId, organizationId: orgId, projectId: IsNull() },
      });
      if (!role) {
        throw new ValidationException(ErrorCode.R001);
      }

      // Chặn sửa tên role mặc định owner
      if (role.name === SYSTEM_ROLES.ORG_ADMIN) {
        throw new ForbiddenException(
          'You cannot edit the default organization owner role',
        );
      }

      // Nếu đổi tên, check trùng trong cùng org
      if (dto.name && dto.name !== role.name) {
        const duplicate = await this.roleRepo.findOne({
          where: { name: dto.name, organizationId: orgId, projectId: IsNull() },
        });
        if (duplicate) {
          throw new ValidationException(ErrorCode.R002);
        }
      }

      if (dto.name !== undefined) role.name = dto.name;
      if (dto.description !== undefined) role.description = dto.description;

      await this.roleRepo.save(role);
    } catch (error) {
      console.error('Error updating role:', error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Xoá role — không cho xoá owner, member mặc định
  // ─────────────────────────────────────────────────────────────────────────────
  async deleteRole(roleId: string, orgId: string): Promise<void> {
    try {
      const role = await this.roleRepo.findOne({
        where: { id: roleId, organizationId: orgId, projectId: IsNull() },
      });
      if (!role) {
        throw new ValidationException(ErrorCode.R001);
      }

      // Không cho xoá system role (org_admin, system_admin, user...)
      if (role.isSystemRole) {
        throw new ForbiddenException(
          `You cannot delete the system role "${role.name}"`,
        );
      }

      // Sử dụng softRemove() để trigger RoleSubscriber cascade soft delete
      await this.roleRepo.softRemove(role);
    } catch (error) {
      console.error('Error deleting role:', error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Gán permissions cho role trong org (anti-privilege-escalation)
  // ─────────────────────────────────────────────────────────────────────────────
  async assignPermissions(
    dto: AssignPermissionsToOrgRoleRequest,
    callerId: string,
    orgId: string,
  ): Promise<void> {
    try {
      await this.getOrganizationRoleOrThrow(dto.roleId, orgId);

      const normalizedPermissionCodes = this.normalizePermissionCodes(
        dto.permissionCodes,
      );
      const permissions = await this.getPermissionEntitiesOrThrow(
        normalizedPermissionCodes,
      );

      // Anti privilege escalation: caller không thể gán permission mình không có
      // system_admin bypass
      const callerContext = await this.getCallerPermissionContext(
        callerId,
        orgId,
      );
      if (!callerContext.isSystemAdmin) {
        const unauthorized = normalizedPermissionCodes.filter(
          (code) => !callerContext.callerPermissionSet.has(code),
        );
        if (unauthorized.length > 0) {
          throw new ForbiddenException(
            `You cannot assign permissions you do not have: ${unauthorized.join(', ')}`,
          );
        }
      }

      // Upsert để tránh duplicate
      const rps = permissions.map((p) =>
        this.rpRepo.create({ roleId: dto.roleId, permissionId: p.id }),
      );
      await this.rpRepo.upsert(rps, ['roleId', 'permissionId']);
    } catch (error) {
      console.error('Error assigning permissions:', error);
      throw error;
    }
  }

  async updateRolePermissions(
    roleId: string,
    dto: UpdateRolePermissionsRequest,
    callerId: string,
    orgId: string,
  ): Promise<void> {
    try {
      await this.getOrganizationRoleOrThrow(roleId, orgId);

      const requestedPermissionCodes = this.normalizePermissionCodes(
        dto.permissionCodes,
      );
      const requestedPermissions = await this.getPermissionEntitiesOrThrow(
        requestedPermissionCodes,
      );
      const requestedPermissionSet = new Set(requestedPermissionCodes);

      const currentPermissionCodes = await this.getRolePermissionCodes(roleId);
      const currentPermissionSet = new Set(currentPermissionCodes);

      const callerContext = await this.getCallerPermissionContext(
        callerId,
        orgId,
      );

      let toAddCodes: string[] = [];
      let toRemoveCodes: string[] = [];

      if (callerContext.isSystemAdmin) {
        toAddCodes = requestedPermissionCodes.filter(
          (code) => !currentPermissionSet.has(code),
        );
        toRemoveCodes = currentPermissionCodes.filter(
          (code) => !requestedPermissionSet.has(code),
        );
      } else {
        const unauthorized = requestedPermissionCodes.filter(
          (code) => !callerContext.callerPermissionSet.has(code),
        );
        if (unauthorized.length > 0) {
          throw new ForbiddenException(
            `You cannot update permissions you do not have: ${unauthorized.join(', ')}`,
          );
        }

        const currentManageablePermissionCodes = currentPermissionCodes.filter(
          (code) => callerContext.callerPermissionSet.has(code),
        );
        const currentManageablePermissionSet = new Set(
          currentManageablePermissionCodes,
        );

        toAddCodes = requestedPermissionCodes.filter(
          (code) => !currentManageablePermissionSet.has(code),
        );
        toRemoveCodes = currentManageablePermissionCodes.filter(
          (code) => !requestedPermissionSet.has(code),
        );

        if (
          toAddCodes.length > 0 &&
          !callerContext.callerPermissionSet.has(
            PERMISSIONS.RBAC.ROLES.ASSIGN_PERMISSIONS,
          )
        ) {
          throw new ForbiddenException(
            'You do not have permission to assign role permissions',
          );
        }

        if (
          toRemoveCodes.length > 0 &&
          !callerContext.callerPermissionSet.has(
            PERMISSIONS.RBAC.ROLES.REVOKE_PERMISSIONS,
          )
        ) {
          throw new ForbiddenException(
            'You do not have permission to revoke role permissions',
          );
        }
      }

      const toAddCodeSet = new Set(toAddCodes);
      const permissionsToAdd = requestedPermissions.filter((permission) =>
        toAddCodeSet.has(permission.code),
      );
      const permissionsToRemove =
        toRemoveCodes.length > 0
          ? await this.permissionRepo.find({
              where: { code: In(toRemoveCodes) },
            })
          : [];

      await this.dataSource.transaction(async (manager) => {
        if (permissionsToAdd.length > 0) {
          const rolePermissions = permissionsToAdd.map((permission) =>
            manager.create(RolePermission, {
              roleId,
              permissionId: permission.id,
            }),
          );

          await manager.upsert(RolePermission, rolePermissions, [
            'roleId',
            'permissionId',
          ]);
        }

        if (permissionsToRemove.length > 0) {
          await manager.delete(RolePermission, {
            roleId,
            permissionId: In(
              permissionsToRemove.map((permission) => permission.id),
            ),
          });
        }
      });
    } catch (error) {
      console.error('Error updating role permissions:', error);
      throw error;
    }
  }

  // Gán role cho member trong org
  async assignRoleToMember(
    dto: AssignRoleToMemberRequest,
    callerId: string,
    orgId: string,
  ): Promise<void> {
    try {
      const organization =
        await this.organizationCoreService.getOrganizationById(orgId);

      if (!organization) {
        throw new ValidationException(ErrorCode.O001);
      }

      const member = await this.orgMemberRepo.findOne({
        where: { organizationId: orgId, userId: dto.userId, isActive: true },
      });
      if (!member) {
        throw new ValidationException(ErrorCode.O003);
      }

      if (callerId === member.userId) {
        throw new ForbiddenException('You cannot assign role to yourself');
      }

      // Role phải thuộc org, hoặc là built-in org_admin — nhưng không cho gán system_admin
      const role = await this.roleRepo.findOne({ where: { id: dto.roleId } });
      if (!role) {
        throw new ValidationException(ErrorCode.R001);
      }
      if (role.name === SYSTEM_ROLES.SYSTEM_ADMIN) {
        throw new ForbiddenException(
          'You cannot assign system_admin role through this endpoint',
        );
      }
      // role thuộc org này, hoặc là system role org_admin
      if (
        !role.isSystemRole &&
        (role.organizationId !== orgId || !!role.projectId)
      ) {
        throw new ForbiddenException(
          'Role does not belong to this organization',
        );
      }

      const existing = await this.userRoleRepo.findOne({
        where: {
          userId: dto.userId,
          organizationId: orgId,
          roleId: dto.roleId,
          scopeType: ScopeType.ORGANIZATION,
        },
      });
      if (existing) {
        throw new ConflictException(ErrorCode.UR002);
      }

      const userRole = this.userRoleRepo.create({
        userId: dto.userId,
        organizationId: orgId,
        roleId: dto.roleId,
        scopeType: ScopeType.ORGANIZATION,
        assignedBy: callerId,
      });
      await this.userRoleRepo.save(userRole);
    } catch (error) {
      console.error('Error assigning role to member:', error);
      throw error;
    }
  }

  // Thu hồi role khỏi member trong org
  async revokeRoleFromMember(
    dto: RevokeRoleFromMemberRequest,
    orgId: string,
  ): Promise<void> {
    try {
      const organization =
        await this.organizationCoreService.getOrganizationById(orgId);

      if (!organization) {
        throw new ValidationException(ErrorCode.O001);
      }

      const member = await this.orgMemberRepo.findOne({
        where: { organizationId: orgId, userId: dto.userId, isActive: true },
      });
      if (!member) {
        throw new ValidationException(ErrorCode.O003);
      }

      // Không thu hồi role của owner tổ chức
      if (member.isOwner) {
        throw new ForbiddenException(
          'You cannot revoke the role of the organization owner',
        );
      }

      const userRole = await this.userRoleRepo.findOne({
        where: {
          userId: dto.userId,
          organizationId: orgId,
          roleId: dto.roleId,
          scopeType: ScopeType.ORGANIZATION,
        },
      });

      if (!userRole) {
        throw new ValidationException(ErrorCode.UR001);
      }

      await this.userRoleRepo.remove(userRole);
    } catch (error) {
      console.error('Error revoking role from member:', error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Lấy danh sách roles của một member cụ thể trong org (có thể filter theo scopeType)
  // ─────────────────────────────────────────────────────────────────────────────
  async getMemberRoles(
    memberId: string,
    orgId: string,
    scopeType?: ScopeType,
  ): Promise<UserOrgRoleResponse[]> {
    try {
      await this.organizationCoreService.getOrganizationById(orgId);

      const member = await this.orgMemberRepo.findOne({
        where: { organizationId: orgId, userId: memberId, isActive: true },
      });
      if (!member) {
        throw new ValidationException(ErrorCode.O003);
      }

      const qb = this.userRoleRepo
        .createQueryBuilder('ur')
        .innerJoin(Role, 'r', 'r.id = ur.role_id')
        .where('ur.user_id = :memberId', { memberId })
        .andWhere('ur.organization_id = :orgId', { orgId })
        .andWhere('r.deleted_at IS NULL');

      // Filter theo scopeType nếu có — dùng để FE hiện multi-tab (org vs project)
      if (scopeType) {
        qb.andWhere('ur.scope_type = :scope', { scope: scopeType });
      }

      const userRoles = await qb
        .select([
          'ur.id AS "id"',
          'ur.role_id AS "roleId"',
          'r.name AS "roleName"',
          'r.description AS "roleDescription"',
          'r.deleted_at AS "deletedAt"',
          'ur.scope_type AS "scopeType"',
          'ur.scope_id AS "scopeId"',
          'ur.assigned_at AS "assignedAt"',
        ])
        .getRawMany();

      return plainToInstance(UserOrgRoleResponse, userRoles);
    } catch (error) {
      console.error('Error getting member roles:', error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Thu hồi permissions khỏi role trong org
  // ─────────────────────────────────────────────────────────────────────────────
  async revokePermissions(
    dto: RevokePermissionsRequest,
    orgId: string,
  ): Promise<void> {
    try {
      const role = await this.roleRepo.findOne({
        where: { id: dto.roleId, organizationId: orgId, projectId: IsNull() },
      });
      if (!role) {
        throw new ValidationException(ErrorCode.R001);
      }

      // NOTE: Không áp dụng anti-privilege-escalation cho REVOKE.
      // REVOKE là giảm quyền, không phải tăng → không có nguy cơ privilege escalation.
      // Access control đã được đảm bảo bởi RequirePermission(RBAC.ROLES.REVOKE_PERMISSIONS) ở controller.
      // Chỉ cần đảm bảo role thuộc org (đã check ở trên)
      // và caller không thể sửa system role (isSystemRole=true roles không có orgId → query sẽ miss).

      // Lấy permission IDs (không tìm thấy thì bỏ qua — revoke là idempotent)
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
    } catch (error) {
      console.error('Error revoking permissions:', error);
      throw error;
    }
  }
}
