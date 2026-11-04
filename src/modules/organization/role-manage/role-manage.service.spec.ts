import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { RoleManageService } from './role-manage.service';
import { Role } from '@modules/rbac/entities/role.entity';
import { UserRole, ScopeType } from '@modules/rbac/entities/user-role.entity';
import { Permission } from '@modules/rbac/entities/permissions.entity';
import { RolePermission } from '@modules/rbac/entities/role-permission.entity';
import { OrganizationMember } from '../core/entities/organization-member.entity';
import { RbacService } from '@modules/rbac/rbac.service';
import { OrganizationCoreService } from '../core/organization-core.service';
import { ValidationException } from '@common/exceptions/validation.exception';
import { SYSTEM_ROLES } from '@modules/rbac/constant/permission.constant';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const ORG_ID = 'org-uuid-1';
const CALLER_ID = 'caller-uuid-1';
const ROLE_ID = 'role-uuid-1';

const mockOrg = { id: ORG_ID, name: 'Test Org' };
const mockRole = (overrides: Partial<Role> = {}): Role =>
  ({
    id: ROLE_ID,
    name: 'custom_role',
    description: 'A test role',
    isSystemRole: false,
    organizationId: ORG_ID,
    createdBy: CALLER_ID,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    deletedAt: undefined,
    ...overrides,
  }) as Role;

const mockOrgAdminRole = (): Role =>
  mockRole({
    id: 'org-admin-uuid',
    name: SYSTEM_ROLES.ORG_ADMIN,
    isSystemRole: true,
    organizationId: undefined,
  });

// Mock QueryBuilder
const createMockQueryBuilder = (result: any = []) => {
  const qb: any = {
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(result),
    getRawOne: jest.fn().mockResolvedValue(result),
    getMany: jest.fn().mockResolvedValue(result),
    getCount: jest
      .fn()
      .mockResolvedValue(Array.isArray(result) ? result.length : 0),
    // getManyAndCount returns [items, total]
    getManyAndCount: jest
      .fn()
      .mockResolvedValue([result, Array.isArray(result) ? result.length : 0]),
    execute: jest.fn().mockResolvedValue({ affected: 1 }),
  };
  return qb;
};

describe('RoleManageService', () => {
  let service: RoleManageService;
  let roleRepo: Record<string, jest.Mock>;
  let userRoleRepo: Record<string, jest.Mock>;
  let permissionRepo: Record<string, jest.Mock>;
  let rpRepo: Record<string, jest.Mock>;
  let orgMemberRepo: Record<string, jest.Mock>;
  let rbacService: Record<string, jest.Mock>;
  let orgCoreService: Record<string, jest.Mock>;
  let dataSource: Record<string, jest.Mock>;
  // mock EntityManager used inside dataSource.transaction
  let txManager: Record<string, jest.Mock>;

  beforeEach(async () => {
    roleRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      softRemove: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    userRoleRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    permissionRepo = {
      find: jest.fn(),
      findBy: jest.fn(),
    };

    rpRepo = {
      create: jest.fn(),
      upsert: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    orgMemberRepo = {
      findOne: jest.fn(),
    };

    rbacService = {
      getUserSystemRole: jest.fn(),
      getUserPermissions: jest.fn(),
      hasPermission: jest.fn(),
    };

    orgCoreService = {
      getOrganizationById: jest.fn(),
    };

    // Mock EntityManager inside transaction callback
    txManager = {
      create: jest
        .fn()
        .mockImplementation((_cls, data) => ({ id: 'new-uuid', ...data })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      upsert: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    // dataSource.transaction calls the callback with txManager
    dataSource = {
      transaction: jest.fn().mockImplementation((cb) => cb(txManager)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleManageService,
        { provide: getRepositoryToken(Role), useValue: roleRepo },
        { provide: getRepositoryToken(UserRole), useValue: userRoleRepo },
        { provide: getRepositoryToken(Permission), useValue: permissionRepo },
        {
          provide: getRepositoryToken(RolePermission),
          useValue: rpRepo,
        },
        {
          provide: getRepositoryToken(OrganizationMember),
          useValue: orgMemberRepo,
        },
        { provide: RbacService, useValue: rbacService },
        { provide: OrganizationCoreService, useValue: orgCoreService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<RoleManageService>(RoleManageService);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // createRole
  // ─────────────────────────────────────────────────────────────────────────
  describe('createRole', () => {
    const dto = { name: 'editor', description: 'Editor role' };

    it('should create a role in the organization', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(mockOrg as any);
      roleRepo.findOne.mockResolvedValue(null); // no duplicate

      await service.createRole(
        { name: 'editor', description: 'Editor role' },
        CALLER_ID,
        ORG_ID,
      );

      // dataSource.transaction was called
      expect(dataSource.transaction).toHaveBeenCalled();
      // manager.create/save were called inside transaction
      expect(txManager.create).toHaveBeenCalled();
      expect(txManager.save).toHaveBeenCalled();
    });

    it('should throw ValidationException when org not found', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(null as any);

      await expect(service.createRole(dto, CALLER_ID, ORG_ID)).rejects.toThrow(
        ValidationException,
      );
    });

    it('should throw ValidationException when role name already exists in org', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(mockOrg as any);
      roleRepo.findOne.mockResolvedValue(mockRole()); // duplicate found

      await expect(service.createRole(dto, CALLER_ID, ORG_ID)).rejects.toThrow(
        ValidationException,
      );
    });

    it('should create role with permissions when permissionCodes provided', async () => {
      const dtoWithPerms = {
        ...dto,
        permissionCodes: ['documents.create', 'projects.view'],
      };
      orgCoreService.getOrganizationById.mockResolvedValue(mockOrg as any);
      roleRepo.findOne.mockResolvedValue(null);
      rbacService.getUserSystemRole.mockResolvedValue(
        SYSTEM_ROLES.SYSTEM_ADMIN,
      );
      const permissions = [
        { id: 'perm-1', code: 'documents.create' },
        { id: 'perm-2', code: 'projects.view' },
      ];
      permissionRepo.find.mockResolvedValue(permissions as any);

      await service.createRole(dtoWithPerms, CALLER_ID, ORG_ID);

      // upsert called inside transaction manager
      expect(txManager.upsert).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when non-admin tries to assign permissions they do not have', async () => {
      const dtoWithPerms = {
        ...dto,
        permissionCodes: ['documents.create', 'secret.admin'],
      };
      orgCoreService.getOrganizationById.mockResolvedValue(mockOrg as any);
      roleRepo.findOne.mockResolvedValue(null);

      rbacService.getUserSystemRole.mockResolvedValue(null);
      rbacService.getUserPermissions.mockResolvedValue(['documents.create']);

      await expect(
        service.createRole(dtoWithPerms, CALLER_ID, ORG_ID),
      ).rejects.toThrow(ForbiddenException);
      // transaction should NOT have been called (fail-fast before transaction)
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getMyRole
  // ─────────────────────────────────────────────────────────────────────────
  describe('getMyRole', () => {
    it('should return user roles in the organization', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(mockOrg as any);
      const mockUserRoles = [
        {
          id: 'ur-1',
          roleId: ROLE_ID,
          roleName: 'editor',
          roleDescription: 'Editor',
          scopeType: 'organization',
          assignedAt: new Date(),
        },
      ];
      const qb = createMockQueryBuilder(mockUserRoles);
      userRoleRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getMyRole(CALLER_ID, ORG_ID);

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
    });

    it('should throw ValidationException when org not found', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(null as any);

      await expect(service.getMyRole(CALLER_ID, ORG_ID)).rejects.toThrow(
        ValidationException,
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getRoles (with pagination & filter)
  // ─────────────────────────────────────────────────────────────────────────
  describe('getRoles', () => {
    it('should return paginated roles using getManyAndCount (1 query)', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(mockOrg as any);
      const roles = [mockRole(), mockOrgAdminRole()];
      const qb = createMockQueryBuilder(roles);
      roleRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getRoles(ORG_ID, { page: 1, limit: 10 });

      expect(result.data).toBeDefined();
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.total).toBe(2);
      expect(result.data.length).toBe(2);
      // getManyAndCount called instead of separate getCount + getMany
      expect(qb.getManyAndCount).toHaveBeenCalled();
      expect(qb.getCount).not.toHaveBeenCalled();
    });

    it('should include org_admin in WHERE clause (not post-process)', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(mockOrg as any);
      const qb = createMockQueryBuilder([]);
      roleRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getRoles(ORG_ID, {});

      // org_admin included in WHERE, not separate query
      expect(qb.where).toHaveBeenCalledWith(
        '((role.organizationId = :orgId AND role.projectId IS NULL) OR (role.isSystemRole = :isSystem AND role.name = :adminName AND role.projectId IS NULL))',
        expect.objectContaining({
          orgId: ORG_ID,
          adminName: SYSTEM_ROLES.ORG_ADMIN,
        }),
      );
      // No separate findOne query for org_admin
      expect(roleRepo.findOne).not.toHaveBeenCalled();
    });

    it('should apply search filter when provided', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(mockOrg as any);
      const qb = createMockQueryBuilder([]);
      roleRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getRoles(ORG_ID, { search: 'manager' });

      expect(qb.andWhere).toHaveBeenCalledWith('role.name ILIKE :search', {
        search: '%manager%',
      });
    });

    it('should return empty items when no roles found', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(mockOrg as any);
      const qb = createMockQueryBuilder([]);
      roleRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getRoles(ORG_ID, {});

      expect(result.data.length).toBe(0);
      expect(result.meta.total).toBe(0);
    });

    it('should throw ValidationException when org not found', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(null as any);

      await expect(service.getRoles(ORG_ID, {})).rejects.toThrow(
        ValidationException,
      );
    });

    it('should use safe column mapping for sortBy', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(mockOrg as any);
      const qb = createMockQueryBuilder([]);
      roleRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getRoles(ORG_ID, {});

      // Uses 'role.createdAt' (mapped) not 'role.createdAt' from string interpolation
      expect(qb.orderBy).toHaveBeenCalledWith('role.createdAt', 'DESC');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getRoleDetail
  // ─────────────────────────────────────────────────────────────────────────
  describe('getRoleDetail', () => {
    it('should return role detail with permissions', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(mockOrg as any);
      roleRepo.findOne.mockResolvedValue(mockRole());
      const permissionQb = createMockQueryBuilder([
        { code: 'documents.create' },
        { code: 'projects.view' },
      ]);
      rpRepo.createQueryBuilder.mockReturnValue(permissionQb);

      const result = await service.getRoleDetail(ROLE_ID, ORG_ID);

      expect(result).toBeDefined();
      expect(result.permissions).toEqual(['documents.create', 'projects.view']);
    });

    it('should throw ValidationException when role not found', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(mockOrg as any);
      roleRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getRoleDetail('non-existent', ORG_ID),
      ).rejects.toThrow(ValidationException);
    });

    it('should throw ValidationException when org not found', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(null as any);

      await expect(service.getRoleDetail(ROLE_ID, ORG_ID)).rejects.toThrow(
        ValidationException,
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // updateRole
  // ─────────────────────────────────────────────────────────────────────────
  describe('updateRole', () => {
    const dto = { name: 'new_name', description: 'Updated desc' };

    it('should update role name and description', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(mockOrg as any);
      const role = mockRole();
      roleRepo.findOne.mockResolvedValueOnce(role); // find role
      roleRepo.findOne.mockResolvedValueOnce(null); // no duplicate
      roleRepo.save.mockResolvedValue(role);

      await service.updateRole(ROLE_ID, ORG_ID, dto);

      expect(roleRepo.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when trying to update org_admin role', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(mockOrg as any);
      roleRepo.findOne.mockResolvedValue(
        mockRole({ name: SYSTEM_ROLES.ORG_ADMIN }),
      );

      await expect(service.updateRole(ROLE_ID, ORG_ID, dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ValidationException when new name already exists', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(mockOrg as any);
      roleRepo.findOne.mockResolvedValueOnce(mockRole()); // find role
      roleRepo.findOne.mockResolvedValueOnce(mockRole({ id: 'other-id' })); // duplicate

      await expect(service.updateRole(ROLE_ID, ORG_ID, dto)).rejects.toThrow(
        ValidationException,
      );
    });

    it('should throw ValidationException when role not found', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(mockOrg as any);
      roleRepo.findOne.mockResolvedValue(null);

      await expect(service.updateRole(ROLE_ID, ORG_ID, dto)).rejects.toThrow(
        ValidationException,
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // deleteRole (soft delete)
  // ─────────────────────────────────────────────────────────────────────────
  describe('deleteRole', () => {
    it('should soft-delete the role', async () => {
      const role = mockRole();
      roleRepo.findOne.mockResolvedValue(role);
      roleRepo.softRemove.mockResolvedValue(role);

      await service.deleteRole(ROLE_ID, ORG_ID);

      expect(roleRepo.softRemove).toHaveBeenCalledWith(role);
    });

    it('should throw ValidationException when role not found', async () => {
      roleRepo.findOne.mockResolvedValue(null);

      await expect(service.deleteRole(ROLE_ID, ORG_ID)).rejects.toThrow(
        ValidationException,
      );
    });

    it('should throw ForbiddenException when trying to delete any system role', async () => {
      roleRepo.findOne.mockResolvedValue(
        mockRole({ isSystemRole: true, name: SYSTEM_ROLES.ORG_ADMIN }),
      );

      await expect(service.deleteRole(ROLE_ID, ORG_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should NOT throw for a custom role with any name (including member-like names)', async () => {
      // Custom role named 'member' should be deletable since isSystemRole=false
      roleRepo.findOne.mockResolvedValue(
        mockRole({ name: 'member', isSystemRole: false }),
      );
      roleRepo.softRemove.mockResolvedValue(undefined);

      await expect(service.deleteRole(ROLE_ID, ORG_ID)).resolves.not.toThrow();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // assignPermissions
  // ─────────────────────────────────────────────────────────────────────────
  describe('assignPermissions', () => {
    const dto = {
      roleId: ROLE_ID,
      permissionCodes: ['documents.create', 'projects.view'],
    };

    it('should assign permissions to role (system_admin bypass)', async () => {
      roleRepo.findOne.mockResolvedValue(mockRole());
      rbacService.getUserSystemRole.mockResolvedValue(
        SYSTEM_ROLES.SYSTEM_ADMIN,
      );
      const permissions = [
        { id: 'p1', code: 'documents.create' },
        { id: 'p2', code: 'projects.view' },
      ];
      permissionRepo.find.mockResolvedValue(permissions as any);
      rpRepo.create.mockImplementation((data) => data);
      rpRepo.upsert.mockResolvedValue(undefined as any);

      await service.assignPermissions(dto, CALLER_ID, ORG_ID);

      expect(rpRepo.upsert).toHaveBeenCalled();
    });

    it('should throw ValidationException when role not found', async () => {
      roleRepo.findOne.mockResolvedValue(null);

      await expect(
        service.assignPermissions(dto, CALLER_ID, ORG_ID),
      ).rejects.toThrow(ValidationException);
    });

    it('should throw ForbiddenException on anti-privilege-escalation for non-admin', async () => {
      roleRepo.findOne.mockResolvedValue(mockRole());
      rbacService.getUserSystemRole.mockResolvedValue(null);
      rbacService.getUserPermissions.mockResolvedValue(['documents.create']); // missing projects.view

      await expect(
        service.assignPermissions(dto, CALLER_ID, ORG_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ValidationException when no valid permissions found', async () => {
      roleRepo.findOne.mockResolvedValue(mockRole());
      rbacService.getUserSystemRole.mockResolvedValue(
        SYSTEM_ROLES.SYSTEM_ADMIN,
      );
      permissionRepo.find.mockResolvedValue([]);

      await expect(
        service.assignPermissions(dto, CALLER_ID, ORG_ID),
      ).rejects.toThrow(ValidationException);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // revokePermissions
  // ─────────────────────────────────────────────────────────────────────────
  describe('revokePermissions', () => {
    const dto = {
      roleId: ROLE_ID,
      permissionCodes: ['documents.create'],
    };

    it('should revoke permissions from role', async () => {
      roleRepo.findOne.mockResolvedValue(mockRole());
      permissionRepo.find.mockResolvedValue([
        { id: 'p1', code: 'documents.create' },
      ] as any);
      const qb = createMockQueryBuilder();
      rpRepo.createQueryBuilder.mockReturnValue(qb);

      await service.revokePermissions(dto, ORG_ID);

      expect(qb.execute).toHaveBeenCalled();
    });

    it('should throw ValidationException when role not found', async () => {
      roleRepo.findOne.mockResolvedValue(null);

      await expect(service.revokePermissions(dto, ORG_ID)).rejects.toThrow(
        ValidationException,
      );
    });

    it('should throw ValidationException when role belongs to different org', async () => {
      // findOne returns null because orgId filter mismatches
      roleRepo.findOne.mockResolvedValue(null);

      await expect(
        service.revokePermissions(dto, 'different-org'),
      ).rejects.toThrow(ValidationException);
    });

    it('should return early when no permissions found to revoke', async () => {
      roleRepo.findOne.mockResolvedValue(mockRole());
      permissionRepo.find.mockResolvedValue([]);

      // Should not throw — revoke is idempotent
      await service.revokePermissions(dto, ORG_ID);

      expect(rpRepo.createQueryBuilder).not.toHaveBeenCalled();
    });
  });

  describe('updateRolePermissions', () => {
    it('should sync permissions for system_admin in a single transaction', async () => {
      roleRepo.findOne.mockResolvedValue(mockRole());
      rbacService.getUserSystemRole.mockResolvedValue(
        SYSTEM_ROLES.SYSTEM_ADMIN,
      );
      permissionRepo.find
        .mockResolvedValueOnce([
          { id: 'perm-1', code: 'documents.create' },
        ] as any)
        .mockResolvedValueOnce([
          { id: 'perm-2', code: 'projects.view' },
        ] as any);
      rpRepo.createQueryBuilder.mockReturnValue(
        createMockQueryBuilder([{ code: 'projects.view' }]),
      );

      await service.updateRolePermissions(
        ROLE_ID,
        { permissionCodes: ['documents.create'] },
        CALLER_ID,
        ORG_ID,
      );

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(txManager.upsert).toHaveBeenCalled();
      expect(txManager.delete).toHaveBeenCalled();
    });

    it('should preserve locked permissions outside caller scope', async () => {
      roleRepo.findOne.mockResolvedValue(mockRole());
      rbacService.getUserSystemRole.mockResolvedValue(null);
      rbacService.getUserPermissions.mockResolvedValue([
        'documents.create',
        'rbac.roles.revoke_permissions',
      ]);
      permissionRepo.find.mockResolvedValue([
        { id: 'perm-1', code: 'documents.create' },
      ] as any);
      rpRepo.createQueryBuilder.mockReturnValue(
        createMockQueryBuilder([
          { code: 'documents.create' },
          { code: 'billing.invoices.list' },
        ]),
      );

      await service.updateRolePermissions(
        ROLE_ID,
        { permissionCodes: [] },
        CALLER_ID,
        ORG_ID,
      );

      expect(txManager.delete).toHaveBeenCalledWith(
        RolePermission,
        expect.objectContaining({
          roleId: ROLE_ID,
          permissionId: expect.anything(),
        }),
      );
      expect(txManager.upsert).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when caller tries to add a permission they do not have', async () => {
      roleRepo.findOne.mockResolvedValue(mockRole());
      rbacService.getUserSystemRole.mockResolvedValue(null);
      rbacService.getUserPermissions.mockResolvedValue([
        'documents.create',
        'rbac.roles.assign_permissions',
      ]);
      permissionRepo.find.mockResolvedValue([
        { id: 'perm-1', code: 'projects.view' },
      ] as any);
      rpRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder([]));

      await expect(
        service.updateRolePermissions(
          ROLE_ID,
          { permissionCodes: ['projects.view'] },
          CALLER_ID,
          ORG_ID,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when caller lacks revoke permission for a removal diff', async () => {
      roleRepo.findOne.mockResolvedValue(mockRole());
      rbacService.getUserSystemRole.mockResolvedValue(null);
      rbacService.getUserPermissions.mockResolvedValue(['documents.create']);
      permissionRepo.find.mockResolvedValue([] as any);
      rpRepo.createQueryBuilder.mockReturnValue(
        createMockQueryBuilder([{ code: 'documents.create' }]),
      );

      await expect(
        service.updateRolePermissions(
          ROLE_ID,
          { permissionCodes: [] },
          CALLER_ID,
          ORG_ID,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // assignRoleToMember
  // ─────────────────────────────────────────────────────────────────────────
  describe('assignRoleToMember', () => {
    const dto = { userId: 'member-uuid', roleId: ROLE_ID };

    it('should assign role to a member', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(mockOrg as any);
      orgMemberRepo.findOne.mockResolvedValue({
        userId: dto.userId,
        organizationId: ORG_ID,
        isActive: true,
      } as any);
      roleRepo.findOne.mockResolvedValue(mockRole());
      userRoleRepo.findOne.mockResolvedValue(null); // no existing assignment
      userRoleRepo.create.mockReturnValue({} as any);
      userRoleRepo.save.mockResolvedValue({} as any);

      await service.assignRoleToMember(dto, CALLER_ID, ORG_ID);

      expect(userRoleRepo.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when assigning role to yourself', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(mockOrg as any);
      orgMemberRepo.findOne.mockResolvedValue({
        userId: CALLER_ID,
        organizationId: ORG_ID,
        isActive: true,
      } as any);

      await expect(
        service.assignRoleToMember(
          { userId: CALLER_ID, roleId: ROLE_ID },
          CALLER_ID,
          ORG_ID,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ValidationException when member not found', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(mockOrg as any);
      orgMemberRepo.findOne.mockResolvedValue(null);

      await expect(
        service.assignRoleToMember(dto, CALLER_ID, ORG_ID),
      ).rejects.toThrow(ValidationException);
    });

    it('should throw ValidationException when role not found', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(mockOrg as any);
      orgMemberRepo.findOne.mockResolvedValue({
        userId: dto.userId,
        isActive: true,
      } as any);
      roleRepo.findOne.mockResolvedValue(null);

      await expect(
        service.assignRoleToMember(dto, CALLER_ID, ORG_ID),
      ).rejects.toThrow(ValidationException);
    });

    it('should throw ForbiddenException when trying to assign system_admin', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(mockOrg as any);
      orgMemberRepo.findOne.mockResolvedValue({
        userId: dto.userId,
        isActive: true,
      } as any);
      roleRepo.findOne.mockResolvedValue(
        mockRole({ name: SYSTEM_ROLES.SYSTEM_ADMIN }),
      );

      await expect(
        service.assignRoleToMember(dto, CALLER_ID, ORG_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when role does not belong to org', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(mockOrg as any);
      orgMemberRepo.findOne.mockResolvedValue({
        userId: dto.userId,
        isActive: true,
      } as any);
      roleRepo.findOne.mockResolvedValue(
        mockRole({
          isSystemRole: false,
          organizationId: 'other-org-uuid',
        }),
      );

      await expect(
        service.assignRoleToMember(dto, CALLER_ID, ORG_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException when role already assigned', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(mockOrg as any);
      orgMemberRepo.findOne.mockResolvedValue({
        userId: dto.userId,
        isActive: true,
      } as any);
      roleRepo.findOne.mockResolvedValue(mockRole());
      userRoleRepo.findOne.mockResolvedValue({ id: 'existing' } as any);

      await expect(
        service.assignRoleToMember(dto, CALLER_ID, ORG_ID),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // revokeRoleFromMember
  // ─────────────────────────────────────────────────────────────────────────
  describe('revokeRoleFromMember', () => {
    const dto = { userId: 'member-uuid', roleId: ROLE_ID };

    it('should revoke role from member', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(mockOrg as any);
      orgMemberRepo.findOne.mockResolvedValue({
        userId: dto.userId,
        isActive: true,
        isOwner: false,
      } as any);
      userRoleRepo.findOne.mockResolvedValue({ id: 'ur-1' } as any);
      userRoleRepo.remove.mockResolvedValue({} as any);

      await service.revokeRoleFromMember(dto, ORG_ID);

      expect(userRoleRepo.remove).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when revoking role of org owner', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(mockOrg as any);
      orgMemberRepo.findOne.mockResolvedValue({
        userId: dto.userId,
        isActive: true,
        isOwner: true,
      } as any);

      await expect(service.revokeRoleFromMember(dto, ORG_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ValidationException when member not found', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(mockOrg as any);
      orgMemberRepo.findOne.mockResolvedValue(null);

      await expect(service.revokeRoleFromMember(dto, ORG_ID)).rejects.toThrow(
        ValidationException,
      );
    });

    it('should throw ValidationException when user role not found', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(mockOrg as any);
      orgMemberRepo.findOne.mockResolvedValue({
        userId: dto.userId,
        isActive: true,
        isOwner: false,
      } as any);
      userRoleRepo.findOne.mockResolvedValue(null);

      await expect(service.revokeRoleFromMember(dto, ORG_ID)).rejects.toThrow(
        ValidationException,
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getMemberRoles
  // ─────────────────────────────────────────────────────────────────────────
  describe('getMemberRoles', () => {
    it('should return roles of a specific member', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(mockOrg as any);
      orgMemberRepo.findOne.mockResolvedValue({
        userId: 'member-uuid',
        isActive: true,
      } as any);
      const qb = createMockQueryBuilder([
        {
          id: 'ur-1',
          roleId: ROLE_ID,
          roleName: 'editor',
          roleDescription: 'Editor',
          scopeType: 'organization',
          assignedAt: new Date(),
        },
      ]);
      userRoleRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getMemberRoles('member-uuid', ORG_ID);

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
    });

    it('should throw ValidationException when member not found', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(mockOrg as any);
      orgMemberRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getMemberRoles('non-existent', ORG_ID),
      ).rejects.toThrow(ValidationException);
    });
  });
});
