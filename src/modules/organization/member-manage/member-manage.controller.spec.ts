import { Test, TestingModule } from '@nestjs/testing';
import { MemberManageController } from './member-manage.controller';
import { MemberManageService } from './member-manage.service';
import { ApiResponseDto } from '@common/dto/api-response.dto';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const ORG_ID = 'org-uuid-1';
const USER_ID = 'user-uuid-1';
const MEMBER_ID = 'member-uuid-1';

const getResponseField = (res: any, field: string) => res[field];

describe('MemberManageController', () => {
  let controller: MemberManageController;
  let service: Record<string, jest.Mock>;

  beforeEach(async () => {
    service = {
      getMembers: jest.fn(),
      getMemberDetail: jest.fn(),
      updateMemberStatus: jest.fn(),
      removeMember: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MemberManageController],
      providers: [{ provide: MemberManageService, useValue: service }],
    }).compile();

    controller = module.get<MemberManageController>(MemberManageController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getMembers (paginated)
  // ─────────────────────────────────────────────────────────────────────────
  describe('getMembers', () => {
    it('should return ApiResponseDto with paginated data', async () => {
      const paginatedResult = {
        data: [
          {
            id: 'm1',
            userId: MEMBER_ID,
            user: { id: MEMBER_ID, email: 'test@test.com' },
            roles: ['user'],
          },
        ],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      };
      service.getMembers.mockResolvedValue(paginatedResult);
      const query = { page: 1, limit: 10 };

      const result = await controller.getMembers(ORG_ID, query as any);

      expect(result).toBeInstanceOf(ApiResponseDto);
      expect(getResponseField(result, 'statusCode')).toBe(200);
      expect(getResponseField(result, 'data')).toBe(paginatedResult);
      expect(service.getMembers).toHaveBeenCalledWith(ORG_ID, query);
    });

    it('should pass search and filter parameters', async () => {
      service.getMembers.mockResolvedValue({
        data: [],
        meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
      });
      const query = { page: 1, limit: 10, search: 'john', isActive: true };

      await controller.getMembers(ORG_ID, query as any);

      expect(service.getMembers).toHaveBeenCalledWith(ORG_ID, query);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getMemberDetail
  // ─────────────────────────────────────────────────────────────────────────
  describe('getMemberDetail', () => {
    it('should return ApiResponseDto with member detail including role objects', async () => {
      const mockDetail = {
        id: 'm1',
        organizationId: ORG_ID,
        userId: MEMBER_ID,
        invitedBy: USER_ID,
        isActive: true,
        isOwner: false,
        joinedAt: new Date(),
        leftAt: null,
        invitationAcceptedAt: null,
        createdAt: new Date(),
        user: {
          id: MEMBER_ID,
          email: 'test@test.com',
          firstName: 'John',
          lastName: 'Doe',
          avatarUrl: null,
          phone: null,
          dateOfBirth: null,
          isActive: true,
          isVerified: true,
        },
        roles: [
          { id: 'role-1', name: 'org_admin', description: 'Admin' },
          { id: 'role-2', name: 'editor', description: 'Editor' },
        ],
      };
      service.getMemberDetail.mockResolvedValue(mockDetail);

      const result = await controller.getMemberDetail(MEMBER_ID, ORG_ID);

      expect(result).toBeInstanceOf(ApiResponseDto);
      expect(getResponseField(result, 'statusCode')).toBe(200);
      expect(getResponseField(result, 'data')).toBe(mockDetail);
      expect(service.getMemberDetail).toHaveBeenCalledWith(MEMBER_ID, ORG_ID);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // updateMemberStatus
  // ─────────────────────────────────────────────────────────────────────────
  describe('updateMemberStatus', () => {
    it('should return ApiResponseDto with status 200 when deactivating', async () => {
      service.updateMemberStatus.mockResolvedValue(undefined);
      const dto = { isActive: false };

      const result = await controller.updateMemberStatus(
        MEMBER_ID,
        ORG_ID,
        dto,
        USER_ID,
      );

      expect(result).toBeInstanceOf(ApiResponseDto);
      expect(getResponseField(result, 'statusCode')).toBe(200);
      expect(service.updateMemberStatus).toHaveBeenCalledWith(
        MEMBER_ID,
        ORG_ID,
        dto,
        USER_ID,
      );
    });

    it('should return ApiResponseDto with status 200 when reactivating', async () => {
      service.updateMemberStatus.mockResolvedValue(undefined);
      const dto = { isActive: true };

      const result = await controller.updateMemberStatus(
        MEMBER_ID,
        ORG_ID,
        dto,
        USER_ID,
      );

      expect(result).toBeInstanceOf(ApiResponseDto);
      expect(getResponseField(result, 'statusCode')).toBe(200);
      expect(service.updateMemberStatus).toHaveBeenCalledWith(
        MEMBER_ID,
        ORG_ID,
        dto,
        USER_ID,
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // removeMember
  // ─────────────────────────────────────────────────────────────────────────
  describe('removeMember', () => {
    it('should return ApiResponseDto with status 200', async () => {
      service.removeMember.mockResolvedValue(undefined);

      const result = await controller.removeMember(MEMBER_ID, ORG_ID, USER_ID);

      expect(result).toBeInstanceOf(ApiResponseDto);
      expect(getResponseField(result, 'statusCode')).toBe(200);
      expect(service.removeMember).toHaveBeenCalledWith(
        MEMBER_ID,
        ORG_ID,
        USER_ID,
      );
    });
  });
});
