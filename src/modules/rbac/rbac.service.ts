import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Repository, In, IsNull } from 'typeorm';
import { UserRole } from './entities/user-role.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { RolePermission } from './entities/role-permission.entity';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permissions.entity';
import { AssignPermissionRequest } from './dto/request/assign-permission.request';
import { CreateSystemOrgRoleRequest } from './dto/request/create-org-role.request';
import { CreateSystemRoleRequest } from './dto/request/create-system-role.request';
import {
  flattenPermissions,
  PERMISSIONS,
  SYSTEM_ROLES,
} from './constant/permission.constant';
import { MyPermissionsResponse } from './dto/response/my-permissions.response';
import { MyRolePermissionsResponse } from './dto/response/my-role-permissions.response';
import { plainToInstance } from 'class-transformer';
import { PermissionResponse } from './dto/response/permission.response';
import { RoleResponse } from './dto/response/role.response';
import { SyncPermissionRequest } from './dto/request/sync-permission.request';
import { ValidationException } from '@common/exceptions/validation.exception';
import { ErrorCode } from '@common/constants/error-code.constant';

@Injectable()
export class RbacService {
  constructor(
    @InjectRepository(UserRole) private userRoleRepo: Repository<UserRole>,
    @InjectRepository(RolePermission)
    private rpRepo: Repository<RolePermission>,
    @InjectRepository(Role) private roleRepo: Repository<Role>,
    @InjectRepository(Permission)
    private permissionRepo: Repository<Permission>,
  ) {}

  async hasPermission(
    userId: string,
    permissionCode: string,
    organizationId?: string,
  ): Promise<boolean> {
    try {
      const where: any = { userId };
      // check nếu là role system admin thì bypass all
      const systemRoles = await this.getUserSystemRole(userId);
      if (systemRoles.includes(SYSTEM_ROLES.SYSTEM_ADMIN)) return true;

      if (organizationId) where.organizationId = organizationId;

      const userRoles = await this.userRoleRepo.find({ where });
      if (!userRoles.length) return false;

      const roleIds = userRoles.map((ur) => ur.roleId);

      const match = await this.rpRepo
        .createQueryBuilder('rp')
        .innerJoin(Permission, 'perm', 'perm.id = rp.permission_id')
        .where('rp.role_id IN (:...roleIds)', { roleIds })
        .andWhere('perm.code = :code', { code: permissionCode })
        .getOne();
      return !!match;
    } catch (error) {
      console.error('Error checking permission:', error);
      throw error;
    }
  }

  async getUserPermissions(
    userId: string,
    organizationId?: string,
  ): Promise<string[]> {
    try {
      const where: any = { userId };
      if (organizationId) where.organizationId = organizationId;
      const userRoles = await this.userRoleRepo.find({ where });
      if (!userRoles.length) return [];

      const roleIds = userRoles.map((ur) => ur.roleId);
      const rps: { code: string }[] = await this.rpRepo
        .createQueryBuilder('rp')
        .innerJoin(Permission, 'perm', 'perm.id = rp.permission_id')
        .select('perm.code', 'code')
        .where('rp.role_id IN (:...roleIds)', { roleIds })
        .getRawMany();
      return rps.map((r) => r.code);
    } catch (error) {
      console.error('Error getting user permissions:', error);
      throw error;
    }
  }

  async getUserSystemRole(userId: string): Promise<string[]> {
    try {
      // Lấy tất cả system roles GLOBAL (organizationId IS NULL)
      // org-scoped assignments (vd org_admin trong tổ chức) không được tính
      const results = await this.userRoleRepo
        .createQueryBuilder('ur')
        .innerJoin(Role, 'r', 'r.id = ur.role_id')
        .where('ur.userId = :userId', { userId })
        .andWhere('ur.organizationId IS NULL')
        .andWhere('r.isSystemRole = true')
        .select('r.name', 'roleName')
        .distinct(true)
        .getRawMany<{ roleName: string }>();
      return results.map((row) => row.roleName);
    } catch (error) {
      console.error('Error getting user system role:', error);
      throw error;
    }
  }

  // Role: Tạo org role dành cho những user có quyền rbac.roles.create
  /**
   * Tạo role trong organization.
   * - organizationId bắt buộc (lấy từ header X-Organization-Id)
   * - isSystemRole luôn false
   * - Caller phải có quyền được kiểm tra bởi PermissionGuard
   */
  async createOrgRole(
    dto: CreateSystemOrgRoleRequest,
    callerId: string,
    organizationId: string,
  ): Promise<void> {
    try {
      const existing = await this.roleRepo.findOne({
        where: { name: dto.name, organizationId, projectId: IsNull() },
      });
      if (existing) {
        throw new ConflictException(
          `Role "${dto.name}" already exists in this organization`,
        );
      }

      const role = this.roleRepo.create({
        name: dto.name,
        description: dto.description,
        organizationId,
        projectId: undefined,
        isSystemRole: false,
        createdBy: callerId,
      });
      const saved = await this.roleRepo.save(role);

      if (dto.permissionCodes?.length) {
        await this.assignPermissionsToRole(
          { roleId: saved.id, permissionCodes: dto.permissionCodes },
          callerId,
          organizationId,
        );
      }
    } catch (error) {
      console.error('Error creating org role:', error);
      throw error;
    }
  }

  /**
   * Tạo system role.
   * - organizationId = null (system-wide)
   * - isSystemRole = true
   * - Chỉ system_admin mới được gọi, kiểm tra bởi RolesGuard
   */
  async createSystemRole(
    dto: CreateSystemRoleRequest,
    callerId: string,
  ): Promise<void> {
    try {
      const existing = await this.roleRepo.findOne({
        where: { name: dto.name, organizationId: IsNull(), projectId: IsNull() },
      });
      if (existing) {
        throw new ConflictException(`System role "${dto.name}" already exists`);
      }

      const role = this.roleRepo.create({
        name: dto.name,
        description: dto.description,
        organizationId: undefined,
        projectId: undefined,
        isSystemRole: true,
        createdBy: callerId,
      });
      const saved = await this.roleRepo.save(role);

      if (dto.permissionCodes?.length) {
        await this.assignPermissionsToSystemRole(
          saved.id,
          dto.permissionCodes,
        );
      }
    } catch (error) {
      console.error('Error creating system role:', error);
      throw error;
    }
  }

  /**
   * Gán permissions vào role.
   * - Anti privilege escalation: caller không gán permission mình không có
   * - Không gán vào system role (isSystemRole = true)
   */
  private async assignPermissionsToSystemRole(
    roleId: string,
    permissionCodes: string[],
  ): Promise<void> {
    const permissions = await this.permissionRepo.findBy({
      code: In(permissionCodes),
    });

    if (!permissions.length) {
      throw new NotFoundException('No valid permissions found');
    }

    const rps = permissions.map((permission) =>
      this.rpRepo.create({ roleId, permissionId: permission.id }),
    );
    await this.rpRepo.upsert(rps, ['roleId', 'permissionId']);
  }

  async assignPermissionsToRole(
    dto: AssignPermissionRequest,
    callerId: string,
    organizationId?: string,
  ): Promise<void> {
    try {
      const role = await this.roleRepo.findOneBy({ id: dto.roleId });
      if (!role) throw new NotFoundException('Role not found');
      if (role.isSystemRole) {
        throw new ForbiddenException(
          'Cannot modify permissions of a system role via this endpoint',
        );
      }

      // Validate role phải thuộc đúng org — chặn cross-org escalation
      if (
        organizationId &&
        (role.organizationId !== organizationId || !!role.projectId)
      ) {
        throw new ForbiddenException(
          'Role does not belong to this organization',
        );
      }

      // system_admin bypass anti-escalation (họ có all permissions)
      const callerSystemRoles = await this.getUserSystemRole(callerId);
      if (!callerSystemRoles.includes(SYSTEM_ROLES.SYSTEM_ADMIN)) {
        const callerPermissions = await this.getUserPermissions(
          callerId,
          organizationId,
        );
        const unauthorized = dto.permissionCodes.filter(
          (code) => !callerPermissions.includes(code),
        );
        if (unauthorized.length > 0) {
          throw new ForbiddenException(
            `Cannot assign permissions you don't have: ${unauthorized.join(', ')}`,
          );
        }
      }

      const permissions = await this.permissionRepo.findBy({
        code: In(dto.permissionCodes),
      });
      if (!permissions.length) {
        throw new NotFoundException('No valid permissions found');
      }

      const rps = permissions.map((p) =>
        this.rpRepo.create({ roleId: dto.roleId, permissionId: p.id }),
      );
      await this.rpRepo.upsert(rps, ['roleId', 'permissionId']);
    } catch (error) {
      console.error('Error assigning permissions to role:', error);
      throw error;
    }
  }

  /**
   * Xoá role — không cho xoá system_admin
   */
  async deleteRole(roleId: string): Promise<void> {
    try {
      const role = await this.roleRepo.findOneBy({ id: roleId });
      if (!role) throw new NotFoundException('Role not found');
      if (role.name === SYSTEM_ROLES.SYSTEM_ADMIN) {
        throw new ForbiddenException('Cannot delete system_admin role');
      }

      await this.roleRepo.remove(role);
    } catch (error) {
      console.error('Error deleting role:', error);
      throw error;
    }
  }

  // Permission: Lấy toàn bộ permissions trong hệ thống — chỉ system_admin
  /**
   * Lấy toàn bộ permissions trong hệ thống — chỉ system_admin
   */
  async getAllPermissions(): Promise<PermissionResponse[]> {
    try {
      const permissions = await this.permissionRepo.find({
        order: { module: 'ASC', code: 'ASC' },
      });
      return plainToInstance(PermissionResponse, permissions);
    } catch (error) {
      console.error('Error getting all permissions:', error);
      throw error;
    }
  }

  // Permission: Lấy permissions của chính user đang auth
  /**
   * Lấy permissions của chính user đang auth
   */
  async getMyPermissions(
    userId: string,
    organizationId?: string,
  ): Promise<MyPermissionsResponse> {
    try {
      const permissions = await this.getUserPermissions(userId, organizationId);
      return plainToInstance(MyPermissionsResponse, {
        permissions,
        organizationId,
      });
    } catch (error) {
      console.error('Error getting my permissions:', error);
      throw error;
    }
  }

  async syncPermissions(
    dto: SyncPermissionRequest,
    userId: string,
  ): Promise<{ created: number; assigned: number }> {
    try {
      const callerSystemRoles = await this.getUserSystemRole(userId);
      if (!callerSystemRoles.includes(SYSTEM_ROLES.SYSTEM_ADMIN)) {
        throw new ForbiddenException('Only system_admin can sync permissions');
      }

      // 1. Constant là nguồn sự thật — toàn bộ valid codes
      const allConstantCodes = new Set(flattenPermissions(PERMISSIONS));

      const codesFromDto =
        dto.permissionCodes?.length > 0
          ? dto.permissionCodes.filter((code) => allConstantCodes.has(code))
          : [];

      if (dto.permissionCodes?.length > 0 && codesFromDto.length === 0) {
        throw new ValidationException(
          ErrorCode.R003,
          'No valid permissions found',
        );
      }

      // Nếu truyền danh sách cụ thể → chỉ lấy những code tồn tại trong constant
      // Nếu để trống → sync toàn bộ constant
      const codesToSync: string[] =
        dto.permissionCodes?.length > 0
          ? dto.permissionCodes.filter((code) => allConstantCodes.has(code))
          : [...allConstantCodes];

      // 2. So sánh với DB — chỉ tạo những cái chưa có
      const existing = await this.permissionRepo.findBy({
        code: In(codesToSync),
      });
      const existingCodes = new Set(existing.map((p) => p.code));

      const toCreate = codesToSync
        .filter((code) => !existingCodes.has(code))
        .map((code) =>
          this.permissionRepo.create({
            code,
            name: code,
            module: code.split('.')[0],
          }),
        );

      const created =
        toCreate.length > 0 ? await this.permissionRepo.save(toCreate) : [];

      const allPermissions = [...existing, ...created];

      // 3. Xác định system roles sẽ được gán permissions
      const targetRoleNames: string[] =
        dto.systemRoles?.length > 0
          ? dto.systemRoles
          : Object.values(SYSTEM_ROLES);

      const systemRoles = await this.roleRepo.findBy({
        name: In(targetRoleNames),
        isSystemRole: true,
      });

      // 4. Upsert role_permissions cho từng target role
      let assignedCount = 0;
      for (const role of systemRoles) {
        const rps = allPermissions.map((p) =>
          this.rpRepo.create({ roleId: role.id, permissionId: p.id }),
        );
        await this.rpRepo.upsert(rps, ['roleId', 'permissionId']);
        assignedCount += rps.length;
      }

      return { created: created.length, assigned: assignedCount };
    } catch (error) {
      console.error('Error syncing permissions:', error);
      throw error;
    }
  }

  /**
   * Lấy roles + permissions của user đang auth.
   * - Nếu có organizationId → lấy roles trong org đó
   * - Nếu không → chỉ lấy roles system-level (organizationId IS NULL)
   */
  async getUserIdsWithPermission(
    orgId: string,
    permissionCode: string,
  ): Promise<string[]> {
    const rows = await this.userRoleRepo
      .createQueryBuilder('ur')
      .innerJoin(RolePermission, 'rp', 'rp.role_id = ur.role_id')
      .innerJoin(Permission, 'perm', 'perm.id = rp.permission_id')
      .where('ur.organization_id = :orgId', { orgId })
      .andWhere('perm.code = :code', { code: permissionCode })
      .select('DISTINCT ur.user_id', 'userId')
      .getRawMany<{ userId: string }>();
    return rows.map((r) => r.userId);
  }

  async getUserIdsWithRole(orgId: string, roleName: string): Promise<string[]> {
    const rows = await this.userRoleRepo
      .createQueryBuilder('ur')
      .innerJoin(Role, 'r', 'r.id = ur.role_id')
      .where('ur.organization_id = :orgId', { orgId })
      .andWhere('r.name = :roleName', { roleName })
      .select('DISTINCT ur.user_id', 'userId')
      .getRawMany<{ userId: string }>();
    return rows.map((r) => r.userId);
  }

  async getMyRoleAndPermissions(
    userId: string,
    organizationId?: string,
  ): Promise<MyRolePermissionsResponse> {
    try {
      const where: any = { userId };
      if (organizationId) {
        where.organizationId = organizationId;
      } else {
        where.organizationId = IsNull();
      }

      const userRoles = await this.userRoleRepo.find({ where });
      if (!userRoles.length) {
        return { roles: [], permissions: [], organizationId };
      }

      const roleIds = userRoles.map((ur) => ur.roleId);

      const [roles, permRows] = await Promise.all([
        this.roleRepo.findBy({ id: In(roleIds) }),
        this.rpRepo
          .createQueryBuilder('rp')
          .innerJoin(Permission, 'perm', 'perm.id = rp.permission_id')
          .select('DISTINCT perm.code', 'code')
          .where('rp.role_id IN (:...roleIds)', { roleIds })
          .getRawMany<{ code: string }>(),
      ]);

      return {
        roles: plainToInstance(RoleResponse, roles),
        permissions: permRows.map((r) => r.code),
        organizationId,
      };
    } catch (error) {
      console.error('Error getting my role and permissions:', error);
      throw error;
    }
  }
}
