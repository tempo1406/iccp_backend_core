import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';

import { Organization } from '@modules/organization/core/entities/organization.entity';
import { OrganizationMember } from '@modules/organization/core/entities/organization-member.entity';
import { Subscription } from '@modules/billing/entities/subscription.entity';
import { SubscriptionPlan } from '@modules/billing/entities/subscription-plan.entity';
import { User } from '@modules/users/entities/user.entity';
import { Role } from '@modules/rbac/entities/role.entity';
import { RolePermission } from '@modules/rbac/entities/role-permission.entity';
import { Permission } from '@modules/rbac/entities/permissions.entity';
import { ValidationException } from '@common/exceptions/validation.exception';
import { ErrorCode } from '@common/constants/error-code.constant';

import { OrgListItemResponse } from './dto/response/org-list-item.response';
import { OrgDetailAdminResponse } from './dto/response/org-detail-admin.response';
import { SystemRoleAdminResponse } from './dto/response/system-role-admin.response';
import { UpdateSystemRoleRequest } from './dto/request/update-system-role.request';
import {
  GetSystemRolesQueryRequest,
  SYSTEM_ROLE_SORT_FIELDS,
} from './dto/request/get-system-roles-query.request';
import { PaginatedResponse } from '@common/dto/paginated.response';
import { PaginationHelper } from '@common/helpers/pagination.helper';
import { SYSTEM_ROLES } from '@modules/rbac/constant/permission.constant';

@Injectable()
export class ManageOrganizationService {
  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,

    @InjectRepository(OrganizationMember)
    private readonly memberRepo: Repository<OrganizationMember>,

    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,

    @InjectRepository(SubscriptionPlan)
    private readonly planRepo: Repository<SubscriptionPlan>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,

    @InjectRepository(RolePermission)
    private readonly rpRepo: Repository<RolePermission>,

    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
  ) {}

  /**
   * Lấy danh sách tất cả organization (kèm số member, owner, plan, billing).
   */
  async getAllOrgs(): Promise<OrgListItemResponse[]> {
    // 1. Lấy toàn bộ orgs
    const orgs = await this.orgRepo.find({ order: { createdAt: 'DESC' } });
    if (!orgs.length) return [];

    const orgIds = orgs.map((o) => o.id);
    const ownerIds = [...new Set(orgs.map((o) => o.ownerId))];

    // 2. Load owners
    const owners = await this.userRepo
      .createQueryBuilder('u')
      .select(['u.id', 'u.email', 'u.firstName', 'u.lastName', 'u.phone'])
      .whereInIds(ownerIds)
      .getMany();
    const ownerMap = new Map(owners.map((u) => [u.id, u]));

    // 3. Count members per org
    const memberCounts: { organizationId: string; cnt: string }[] =
      await this.memberRepo
        .createQueryBuilder('m')
        .select('m.organization_id', 'organizationId')
        .addSelect('COUNT(*)', 'cnt')
        .where('m.organization_id IN (:...orgIds)', { orgIds })
        .andWhere('m.is_active = true')
        .andWhere('m.is_deleted = false')
        .groupBy('m.organization_id')
        .getRawMany();
    const memberCountMap = new Map(
      memberCounts.map((r) => [r.organizationId, parseInt(r.cnt, 10)]),
    );

    // 4. Load subscriptions (1 active per org — lấy mới nhất)
    const subscriptions = await this.subscriptionRepo
      .createQueryBuilder('s')
      .where('s.organization_id IN (:...orgIds)', { orgIds })
      .orderBy('s.created_at', 'DESC')
      .getMany();
    // Chỉ giữ subscription đầu tiên (mới nhất) của mỗi org
    const subscriptionMap = new Map<string, Subscription>();
    for (const sub of subscriptions) {
      if (!subscriptionMap.has(sub.organizationId)) {
        subscriptionMap.set(sub.organizationId, sub);
      }
    }

    // 5. Load plans
    const planIds = [
      ...new Set(
        [...subscriptionMap.values()].map((s) => s.planId).filter(Boolean),
      ),
    ];
    const plans =
      planIds.length > 0
        ? await this.planRepo
            .createQueryBuilder('p')
            .whereInIds(planIds)
            .getMany()
        : [];
    const planMap = new Map(plans.map((p) => [p.id, p]));

    // 6. Assemble
    return orgs.map((org) => {
      const owner = ownerMap.get(org.ownerId);
      const sub = subscriptionMap.get(org.id);
      const plan = sub ? planMap.get(sub.planId) : undefined;

      const res = new OrgListItemResponse();
      res.id = org.id;
      res.name = org.name;
      res.slug = org.slug;
      res.logoUrl = org.logoUrl;
      res.industry = org.industry;
      res.size = org.size;
      res.isActive = org.isActive;
      res.createdAt = org.createdAt;

      res.ownerId = org.ownerId;
      res.ownerEmail = owner?.email ?? '';
      res.ownerFullName =
        [owner?.firstName, owner?.lastName].filter(Boolean).join(' ') ||
        undefined;

      res.memberCount = memberCountMap.get(org.id) ?? 0;

      if (sub) {
        res.subscriptionId = sub.id;
        res.subscriptionStatus = sub.status;
        res.billingCycle = sub.billingCycle;
        res.billingStartDate = sub.startDate;
        res.billingEndDate = sub.endDate;
      }
      if (plan) {
        res.planName = plan.name;
        res.planCode = plan.code;
      }

      return res;
    });
  }

  /**
   * Lấy chi tiết 1 organization kèm full plan info.
   */
  async getOrgDetail(orgId: string): Promise<OrgDetailAdminResponse> {
    const org = await this.orgRepo.findOne({ where: { id: orgId } });
    if (!org) {
      throw new NotFoundException(`Organization ${orgId} not found`);
    }

    // Owner
    const owner = await this.userRepo
      .createQueryBuilder('u')
      .select(['u.id', 'u.email', 'u.firstName', 'u.lastName', 'u.phone'])
      .where('u.id = :id', { id: org.ownerId })
      .getOne();

    // Member count
    const memberCount = await this.memberRepo.count({
      where: { organizationId: orgId, isActive: true, isDeleted: false },
    });

    // Latest subscription
    const sub = await this.subscriptionRepo
      .createQueryBuilder('s')
      .where('s.organization_id = :orgId', { orgId })
      .orderBy('s.created_at', 'DESC')
      .getOne();

    // Plan
    const plan = sub
      ? await this.planRepo.findOne({ where: { id: sub.planId } })
      : null;

    const res = new OrgDetailAdminResponse();
    // Base fields
    res.id = org.id;
    res.name = org.name;
    res.slug = org.slug;
    res.logoUrl = org.logoUrl;
    res.industry = org.industry;
    res.size = org.size;
    res.isActive = org.isActive;
    res.createdAt = org.createdAt;
    res.updatedAt = org.updatedAt;
    res.description = org.description;
    res.settings = org.settings;

    // Owner
    res.ownerId = org.ownerId;
    res.ownerEmail = owner?.email ?? '';
    res.ownerFullName =
      [owner?.firstName, owner?.lastName].filter(Boolean).join(' ') ||
      undefined;
    res.ownerFirstName = owner?.firstName;
    res.ownerLastName = owner?.lastName;
    res.ownerPhone = owner?.phone;

    // Members
    res.memberCount = memberCount;

    // Subscription
    if (sub) {
      res.subscriptionId = sub.id;
      res.subscriptionStatus = sub.status;
      res.billingCycle = sub.billingCycle;
      res.billingStartDate = sub.startDate;
      res.billingEndDate = sub.endDate;
      res.trialEndsAt = sub.trialEndsAt;
    }

    // Plan details
    if (plan) {
      res.planName = plan.name;
      res.planCode = plan.code;
      res.planPriceMonthly = plan.priceMonthly;
      res.planPriceYearly = plan.priceYearly;
      res.planMaxUsers = plan.maxUsers;
      res.planMaxDocuments = plan.maxDocuments;
      res.planMaxStorageGb = plan.maxStorageGb;
      res.planMaxProjects = plan.maxProjects;
      res.planFeatures = plan.features;
    }

    return res;
  }

  /**
   * Get global system roles.
   */
  async getSystemRoles(
    query: GetSystemRolesQueryRequest = {},
  ): Promise<PaginatedResponse<SystemRoleAdminResponse>> {
    return this.getSystemLevelRoles(query, true);
  }

  private async getSystemLevelRoles(
    query: GetSystemRolesQueryRequest,
    isSystemRole: boolean,
  ): Promise<PaginatedResponse<SystemRoleAdminResponse>> {
    const alias = 'role';
    const qb = this.roleRepo
      .createQueryBuilder(alias)
      .where(`${alias}.isSystemRole = :isSystem`, { isSystem: isSystemRole })
      .andWhere(`${alias}.organizationId IS NULL`)
      .andWhere(`${alias}.projectId IS NULL`);

    if (query.search) {
      qb.andWhere(
        `(${alias}.name ILIKE :search OR ${alias}.description ILIKE :search)`,
        {
          search: `%${query.search}%`,
        },
      );
    }

    PaginationHelper.applyToQueryBuilder(
      qb,
      query,
      SYSTEM_ROLE_SORT_FIELDS,
      alias,
    );

    const [roles, total] = await qb.getManyAndCount();

    const permissionMap = await this.getPermissionCodesByRoleIds(
      roles.map((r) => r.id),
    );

    const items = roles.map((role) =>
      plainToInstance(SystemRoleAdminResponse, {
        ...role,
        permissionCodes: permissionMap.get(role.id) ?? [],
      }),
    );

    const meta = PaginationHelper.buildMeta(total, query);
    return new PaginatedResponse(items, meta);
  }

  /**
   * Update a global system role.
   * system_admin is protected because it is the platform root role.
   */
  async updateSystemRole(
    roleId: string,
    dto: UpdateSystemRoleRequest,
  ): Promise<SystemRoleAdminResponse> {
    const role = await this.roleRepo.findOne({
      where: {
        id: roleId,
        isSystemRole: true,
        organizationId: IsNull(),
        projectId: IsNull(),
      },
    });

    if (!role) {
      throw new NotFoundException(`System role ${roleId} not found`);
    }

    if (role.name === SYSTEM_ROLES.SYSTEM_ADMIN) {
      throw new ForbiddenException('Cannot update system_admin role');
    }

    if (dto.name !== undefined && dto.name !== role.name) {
      const existing = await this.roleRepo.findOne({
        where: {
          name: dto.name,
          organizationId: IsNull(),
        },
      });

      if (existing && existing.id !== role.id) {
        throw new ConflictException(
          `System-level role "${dto.name}" already exists`,
        );
      }

      role.name = dto.name;
    }

    if (dto.description !== undefined) {
      role.description = dto.description;
    }

    await this.roleRepo.save(role);

    if (dto.permissionCodes !== undefined) {
      await this.syncRolePermissions(role.id, dto.permissionCodes);
    }

    const permissionMap = await this.getPermissionCodesByRoleIds([role.id]);

    return plainToInstance(SystemRoleAdminResponse, {
      ...role,
      permissionCodes: permissionMap.get(role.id) ?? [],
    });
  }

  private async syncRolePermissions(
    roleId: string,
    permissionCodes: string[],
  ): Promise<void> {
    const uniqueCodes = [...new Set(permissionCodes)];
    const permissions =
      uniqueCodes.length > 0
        ? await this.permissionRepo.find({ where: { code: In(uniqueCodes) } })
        : [];

    if (permissions.length !== uniqueCodes.length) {
      throw new ValidationException(
        ErrorCode.R003,
        'Some permission codes are invalid',
      );
    }

    const current = await this.rpRepo.find({ where: { roleId } });
    const currentPermissionIds = new Set(
      current.map((item) => item.permissionId),
    );
    const targetPermissionIds = new Set(permissions.map((item) => item.id));

    const toAdd = permissions
      .filter((item) => !currentPermissionIds.has(item.id))
      .map((item) =>
        this.rpRepo.create({
          roleId,
          permissionId: item.id,
        }),
      );

    if (toAdd.length > 0) {
      await this.rpRepo.upsert(toAdd, ['roleId', 'permissionId']);
    }

    const permissionIdsToRemove = current
      .filter((item) => !targetPermissionIds.has(item.permissionId))
      .map((item) => item.permissionId);

    if (permissionIdsToRemove.length > 0) {
      await this.rpRepo.delete({
        roleId,
        permissionId: In(permissionIdsToRemove),
      });
    }
  }

  private async getPermissionCodesByRoleIds(
    roleIds: string[],
  ): Promise<Map<string, string[]>> {
    if (!roleIds.length) return new Map();

    const rows = await this.rpRepo
      .createQueryBuilder('rp')
      .innerJoin(Permission, 'perm', 'perm.id = rp.permission_id')
      .where('rp.role_id IN (:...roleIds)', { roleIds })
      .select(['rp.role_id AS "roleId"', 'perm.code AS "permissionCode"'])
      .orderBy('perm.code', 'ASC')
      .getRawMany<{ roleId: string; permissionCode: string }>();

    const map = new Map<string, string[]>();
    for (const row of rows) {
      const current = map.get(row.roleId) ?? [];
      current.push(row.permissionCode);
      map.set(row.roleId, current);
    }
    return map;
  }
}
