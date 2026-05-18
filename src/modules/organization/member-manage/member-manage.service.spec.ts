import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';

import { MemberManageService } from './member-manage.service';
import { OrganizationMember } from '../core/entities/organization-member.entity';
import { UserRole, ScopeType } from '@modules/rbac/entities/user-role.entity';
import { OrganizationCoreService } from '../core/organization-core.service';
import { ValidationException } from '@common/exceptions/validation.exception';
import { ErrorCode } from '@common/constants/error-code.constant';
import { MemberSortBy } from './dto/request/get-members-query.request';
import { SortOrder } from '@common/dto/pagination.request';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const ORG_ID = 'org-uuid-1';
const CALLER_ID = 'caller-uuid-1';
const MEMBER_USER_ID = 'member-uuid-1';

const mockOrg = { id: ORG_ID, name: 'Test Org' };

const mockMember = (
  overrides: Partial<OrganizationMember> = {},
): OrganizationMember =>
  ({
    id: 'membership-uuid-1',
    organizationId: ORG_ID,
    userId: MEMBER_USER_ID,
    invitedBy: CALLER_ID,
    isActive: true,
    isOwner: false,
    isDeleted: false,
    joinedAt: new Date('2026-01-01'),
    leftAt: undefined,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  }) as OrganizationMember;

const mockRawMember = (
  overrides: Record<string, any> = {},
): Record<string, any> => ({
  id: 'membership-uuid-1',
  userId: MEMBER_USER_ID,
  memberStatus: true,
  isOwner: false,
  joinedAt: new Date('2026-01-01'),
  user_id: MEMBER_USER_ID,
  user_email: 'member@test.com',
  user_firstName: 'John',
  user_lastName: 'Doe',
  user_avatarUrl: null,
  role_names: 'user,editor',
  ...overrides,
});

const mockRawMemberDetail = (
  overrides: Record<string, any> = {},
): Record<string, any> => ({
  id: 'membership-uuid-1',
  organizationId: ORG_ID,
  userId: MEMBER_USER_ID,
  invitedBy: CALLER_ID,
  memberStatus: true,
  isOwner: false,
  joinedAt: new Date('2026-01-01'),
  leftAt: null,
  invitationAcceptedAt: null,
  createdAt: new Date('2026-01-01'),
  user_id: MEMBER_USER_ID,
  user_email: 'member@test.com',
  user_firstName: 'John',
  user_lastName: 'Doe',
  user_avatarUrl: null,
  user_phone: null,
  user_dateOfBirth: null,
  user_isActive: true,
  user_isVerified: true,
  ...overrides,
});

const mockRoles = [
  { id: 'role-1', name: 'user', description: 'Basic user' },
  { id: 'role-2', name: 'editor', description: 'Can edit' },
];

// Mock QueryBuilder
const createMockQueryBuilder = (result: any = []) => {
  const qb: any = {
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getRawMany: jest
      .fn()
      .mockResolvedValue(Array.isArray(result) ? result : [result]),
    getRawOne: jest.fn().mockResolvedValue(result),
    getCount: jest
      .fn()
      .mockResolvedValue(Array.isArray(result) ? result.length : 0),
    getManyAndCount: jest
      .fn()
      .mockResolvedValue([
        Array.isArray(result) ? result : [result],
        Array.isArray(result) ? result.length : 1,
      ]),
  };
  return qb;
};

describe('MemberManageService', () => {
  let service: MemberManageService;
  let memberRepo: Record<string, jest.Mock>;
  let userRoleRepo: Record<string, jest.Mock>;
  let orgCoreService: Record<string, jest.Mock>;

  beforeEach(async () => {
    memberRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    userRoleRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    orgCoreService = {
      getOrganizationById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemberManageService,
        {
          provide: getRepositoryToken(OrganizationMember),
          useValue: memberRepo,
        },
        { provide: getRepositoryToken(UserRole), useValue: userRoleRepo },
        { provide: OrganizationCoreService, useValue: orgCoreService },
      ],
    }).compile();

    service = module.get<MemberManageService>(MemberManageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getMembers (pagination + filter + search)
  // ─────────────────────────────────────────────────────────────────────────
  describe('getMembers', () => {
    it('should return paginated members', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(mockOrg as any);
      const rows = [
        mockRawMember(),
        mockRawMember({
          id: 'm2',
          userId: 'user-2',
          user_email: 'user2@test.com',
        }),
      ];
      const qb = createMockQueryBuilder(rows);
      memberRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getMembers(ORG_ID, { page: 1, limit: 10 });

      expect(result.data).toBeDefined();
      expect(result.data.length).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });

    it('should apply search filter when provided', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(mockOrg as any);
      const qb = createMockQueryBuilder([]);
      memberRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getMembers(ORG_ID, { search: 'john' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(u.email ILIKE :search OR u.first_name ILIKE :search OR u.last_name ILIKE :search)',
        { search: '%john%' },
      );
    });

    it('should apply isActive filter when provided', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(mockOrg as any);
      const qb = createMockQueryBuilder([]);
      memberRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getMembers(ORG_ID, { isActive: true });

      expect(qb.andWhere).toHaveBeenCalledWith('m.is_active = :isActive', {
        isActive: true,
      });
    });

    it('should return empty items when no members found', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(mockOrg as any);
      const qb = createMockQueryBuilder([]);
      memberRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getMembers(ORG_ID, {});

      expect(result.data.length).toBe(0);
      expect(result.meta.total).toBe(0);
    });

    it('should throw ValidationException when org not found', async () => {
      orgCoreService.getOrganizationById.mockRejectedValue(
        new ValidationException(ErrorCode.O001),
      );

      await expect(service.getMembers(ORG_ID, {})).rejects.toThrow(
        ValidationException,
      );
    });

    it('should parse roles from role_names string', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(mockOrg as any);
      const rows = [mockRawMember({ role_names: 'org_admin,editor,viewer' })];
      const qb = createMockQueryBuilder(rows);
      memberRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getMembers(ORG_ID, { page: 1, limit: 10 });

      expect(result.data[0].roles).toEqual(['org_admin', 'editor', 'viewer']);
    });

    it('should return empty roles array when role_names is null', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(mockOrg as any);
      const rows = [mockRawMember({ role_names: null })];
      const qb = createMockQueryBuilder(rows);
      memberRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getMembers(ORG_ID, { page: 1, limit: 10 });

      expect(result.data[0].roles).toEqual([]);
    });

    it('should only include summary fields in list response', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(mockOrg as any);
      const rows = [mockRawMember()];
      const qb = createMockQueryBuilder(rows);
      memberRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getMembers(ORG_ID, { page: 1, limit: 10 });
      const item = result.data[0];

      // Summary fields should exist
      expect(item.id).toBeDefined();
      expect(item.userId).toBeDefined();
      expect(item.memberStatus).toBeDefined();
      expect(item.isOwner).toBeDefined();
      expect(item.joinedAt).toBeDefined();
      expect(item.user).toBeDefined();
      expect(item.user.email).toBe('member@test.com');
      expect(item.roles).toBeDefined();

      // Detail-only fields should NOT exist
      expect((item as any).organizationId).toBeUndefined();
      expect((item as any).invitedBy).toBeUndefined();
      expect((item as any).leftAt).toBeUndefined();
      expect((item as any).invitationAcceptedAt).toBeUndefined();
      expect((item as any).createdAt).toBeUndefined();
      expect((item as any).user.phone).toBeUndefined();
      expect((item as any).user.dateOfBirth).toBeUndefined();
    });

    it('should use default sort (joinedAt DESC) when not specified', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(mockOrg as any);
      const qb = createMockQueryBuilder([]);
      memberRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getMembers(ORG_ID, {});

      expect(qb.orderBy).toHaveBeenCalledWith('m.joined_at', 'DESC');
    });

    it('should use custom sort when specified', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(mockOrg as any);
      const qb = createMockQueryBuilder([]);
      memberRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getMembers(ORG_ID, {
        sortBy: MemberSortBy.EMAIL,
        sortOrder: SortOrder.ASC,
      });

      expect(qb.orderBy).toHaveBeenCalledWith('u.email', 'ASC');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getMemberDetail
  // ─────────────────────────────────────────────────────────────────────────
  describe('getMemberDetail', () => {
    it('should return member detail with full user info and role objects', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(mockOrg as any);
      const rawDetail = mockRawMemberDetail();
      const memberQb = createMockQueryBuilder(rawDetail);
      memberQb.getRawOne.mockResolvedValue(rawDetail);
      memberRepo.createQueryBuilder.mockReturnValue(memberQb);

      const roleQb = createMockQueryBuilder(mockRoles);
      roleQb.getRawMany.mockResolvedValue(mockRoles);
      userRoleRepo.createQueryBuilder.mockReturnValue(roleQb);

      const result = await service.getMemberDetail(MEMBER_USER_ID, ORG_ID);

      expect(result).toBeDefined();
      expect(result.userId).toBe(MEMBER_USER_ID);
      expect(result.user.email).toBe('member@test.com');
      // Detail should have full user info
      expect(result.user.phone).toBeNull();
      expect(result.user.isActive).toBe(true);
      expect(result.user.isVerified).toBe(true);
      // Detail should have full member fields
      expect(result.organizationId).toBe(ORG_ID);
      expect(result.invitedBy).toBe(CALLER_ID);
      expect(result.createdAt).toBeDefined();
      // Roles should be objects with id, name, description
      expect(result.roles).toEqual(mockRoles);
      expect(result.roles[0].id).toBe('role-1');
      expect(result.roles[0].name).toBe('user');
    });

    it('should return empty roles array when member has no roles', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(mockOrg as any);
      const rawDetail = mockRawMemberDetail();
      const memberQb = createMockQueryBuilder(rawDetail);
      memberQb.getRawOne.mockResolvedValue(rawDetail);
      memberRepo.createQueryBuilder.mockReturnValue(memberQb);

      const roleQb = createMockQueryBuilder([]);
      roleQb.getRawMany.mockResolvedValue([]);
      userRoleRepo.createQueryBuilder.mockReturnValue(roleQb);

      const result = await service.getMemberDetail(MEMBER_USER_ID, ORG_ID);

      expect(result.roles).toEqual([]);
    });

    it('should throw ValidationException when member not found', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(mockOrg as any);
      const memberQb = createMockQueryBuilder(null);
      memberQb.getRawOne.mockResolvedValue(null);
      memberRepo.createQueryBuilder.mockReturnValue(memberQb);

      await expect(
        service.getMemberDetail('non-existent', ORG_ID),
      ).rejects.toThrow(ValidationException);
    });

    it('should throw ValidationException when org not found', async () => {
      orgCoreService.getOrganizationById.mockRejectedValue(
        new ValidationException(ErrorCode.O001),
      );

      await expect(
        service.getMemberDetail(MEMBER_USER_ID, ORG_ID),
      ).rejects.toThrow(ValidationException);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // updateMemberStatus
  // ─────────────────────────────────────────────────────────────────────────
  describe('updateMemberStatus', () => {
    it('should deactivate member and remove user_roles', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(mockOrg as any);
      const member = mockMember();
      memberRepo.findOne.mockResolvedValue(member);
      memberRepo.save.mockResolvedValue(member);
      userRoleRepo.delete.mockResolvedValue({ affected: 1 });

      await service.updateMemberStatus(
        MEMBER_USER_ID,
        ORG_ID,
        { isActive: false },
        CALLER_ID,
      );

      expect(memberRepo.save).toHaveBeenCalled();
      expect(member.isActive).toBe(false);
      expect(member.leftAt).toBeDefined();
      expect(userRoleRepo.delete).toHaveBeenCalledWith({
        userId: MEMBER_USER_ID,
        organizationId: ORG_ID,
        scopeType: ScopeType.ORGANIZATION,
      });
    });

    it('should reactivate member and clear leftAt', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(mockOrg as any);
      const member = mockMember({ isActive: false, leftAt: new Date() });
      memberRepo.findOne.mockResolvedValue(member);
      memberRepo.save.mockResolvedValue(member);

      await service.updateMemberStatus(
        MEMBER_USER_ID,
        ORG_ID,
        { isActive: true },
        CALLER_ID,
      );

      expect(member.isActive).toBe(true);
      expect(member.leftAt).toBeUndefined();
      // Should NOT delete user_roles when reactivating
      expect(userRoleRepo.delete).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when trying to update owner', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(mockOrg as any);
      memberRepo.findOne.mockResolvedValue(mockMember({ isOwner: true }));

      await expect(
        service.updateMemberStatus(
          MEMBER_USER_ID,
          ORG_ID,
          { isActive: false },
          CALLER_ID,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when trying to update yourself', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(mockOrg as any);
      memberRepo.findOne.mockResolvedValue(mockMember({ userId: CALLER_ID }));

      await expect(
        service.updateMemberStatus(
          CALLER_ID,
          ORG_ID,
          { isActive: false },
          CALLER_ID,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ValidationException when member not found', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(mockOrg as any);
      memberRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateMemberStatus(
          'non-existent',
          ORG_ID,
          { isActive: false },
          CALLER_ID,
        ),
      ).rejects.toThrow(ValidationException);
    });

    it('should throw ValidationException when org not found', async () => {
      orgCoreService.getOrganizationById.mockRejectedValue(
        new ValidationException(ErrorCode.O001),
      );

      await expect(
        service.updateMemberStatus(
          MEMBER_USER_ID,
          ORG_ID,
          { isActive: false },
          CALLER_ID,
        ),
      ).rejects.toThrow(ValidationException);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // removeMember (soft-delete)
  // ─────────────────────────────────────────────────────────────────────────
  describe('removeMember', () => {
    it('should soft-delete member and remove user_roles', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(mockOrg as any);
      const member = mockMember();
      memberRepo.findOne.mockResolvedValue(member);
      memberRepo.save.mockResolvedValue(member);
      userRoleRepo.delete.mockResolvedValue({ affected: 1 });

      await service.removeMember(MEMBER_USER_ID, ORG_ID, CALLER_ID);

      expect(memberRepo.save).toHaveBeenCalled();
      expect(member.isActive).toBe(false);
      expect(member.isDeleted).toBe(true);
      expect(member.leftAt).toBeDefined();
      expect(userRoleRepo.delete).toHaveBeenCalledWith({
        userId: MEMBER_USER_ID,
        organizationId: ORG_ID,
        scopeType: ScopeType.ORGANIZATION,
      });
    });

    it('should throw ForbiddenException when trying to remove owner', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(mockOrg as any);
      memberRepo.findOne.mockResolvedValue(mockMember({ isOwner: true }));

      await expect(
        service.removeMember(MEMBER_USER_ID, ORG_ID, CALLER_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when trying to remove yourself', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(mockOrg as any);
      memberRepo.findOne.mockResolvedValue(mockMember({ userId: CALLER_ID }));

      await expect(
        service.removeMember(CALLER_ID, ORG_ID, CALLER_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ValidationException when member not found', async () => {
      orgCoreService.getOrganizationById.mockResolvedValue(mockOrg as any);
      memberRepo.findOne.mockResolvedValue(null);

      await expect(
        service.removeMember('non-existent', ORG_ID, CALLER_ID),
      ).rejects.toThrow(ValidationException);
    });

    it('should throw ValidationException when org not found', async () => {
      orgCoreService.getOrganizationById.mockRejectedValue(
        new ValidationException(ErrorCode.O001),
      );

      await expect(
        service.removeMember(MEMBER_USER_ID, ORG_ID, CALLER_ID),
      ).rejects.toThrow(ValidationException);
    });
  });
});
