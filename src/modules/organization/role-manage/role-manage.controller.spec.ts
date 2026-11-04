import { Test, TestingModule } from '@nestjs/testing';
import { RoleManageController } from './role-manage.controller';
import { RoleManageService } from './role-manage.service';
import { ApiResponseDto } from '@common/dto/api-response.dto';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const ORG_ID = 'org-uuid-1';
const USER_ID = 'user-uuid-1';
const ROLE_ID = 'role-uuid-1';

// Helper to access private properties of ApiResponseDto
const getResponseField = (res: any, field: string) => res[field];

describe('RoleManageController', () => {
  let controller: RoleManageController;
  let service: Record<string, jest.Mock>;

  beforeEach(async () => {
    service = {
      createRole: jest.fn(),
      getMyRole: jest.fn(),
      getRoles: jest.fn(),
      getRoleDetail: jest.fn(),
      updateRole: jest.fn(),
      deleteRole: jest.fn(),
      assignPermissions: jest.fn(),
      updateRolePermissions: jest.fn(),
      revokePermissions: jest.fn(),
      assignRoleToMember: jest.fn(),
      revokeRoleFromMember: jest.fn(),
      getMemberRoles: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoleManageController],
      providers: [{ provide: RoleManageService, useValue: service }],
    }).compile();

    controller = module.get<RoleManageController>(RoleManageController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getMyRole
  // ─────────────────────────────────────────────────────────────────────────
  describe('getMyRole', () => {
    it('should return ApiResponseDto with status 200 (no scopeType)', async () => {
      const mockRoles = [{ id: 'ur-1', roleName: 'editor' }];
      service.getMyRole.mockResolvedValue(mockRoles);

      const result = await controller.getMyRole(USER_ID, ORG_ID, undefined);

      expect(result).toBeInstanceOf(ApiResponseDto);
      expect(getResponseField(result, 'statusCode')).toBe(200);
      expect(getResponseField(result, 'data')).toBe(mockRoles);
      expect(service.getMyRole).toHaveBeenCalledWith(
        USER_ID,
        ORG_ID,
        undefined,
      );
    });

    it('should filter by scopeType when provided', async () => {
      service.getMyRole.mockResolvedValue([]);

      await controller.getMyRole(USER_ID, ORG_ID, 'project' as any);

      expect(service.getMyRole).toHaveBeenCalledWith(
        USER_ID,
        ORG_ID,
        'project',
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // createRole
  // ─────────────────────────────────────────────────────────────────────────
  describe('createRole', () => {
    it('should return ApiResponseDto with status 201', async () => {
      service.createRole.mockResolvedValue(undefined);
      const dto = { name: 'editor', description: 'Editor role' };

      const result = await controller.createRole(ORG_ID, USER_ID, dto);

      expect(result).toBeInstanceOf(ApiResponseDto);
      expect(getResponseField(result, 'statusCode')).toBe(201);
      expect(service.createRole).toHaveBeenCalledWith(dto, USER_ID, ORG_ID);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getRoles (paginated)
  // ─────────────────────────────────────────────────────────────────────────
  describe('getRoles', () => {
    it('should return ApiResponseDto with paginated data', async () => {
      const paginatedResult = {
        data: [{ id: 'r1', name: 'editor' }],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      };
      service.getRoles.mockResolvedValue(paginatedResult);
      const query = { page: 1, limit: 10 };

      const result = await controller.getRoles(ORG_ID, query as any);

      expect(result).toBeInstanceOf(ApiResponseDto);
      expect(getResponseField(result, 'statusCode')).toBe(200);
      expect(getResponseField(result, 'data')).toBe(paginatedResult);
      expect(service.getRoles).toHaveBeenCalledWith(ORG_ID, query);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getRoleDetail
  // ─────────────────────────────────────────────────────────────────────────
  describe('getRoleDetail', () => {
    it('should return ApiResponseDto with role detail', async () => {
      const mockDetail = {
        id: ROLE_ID,
        name: 'editor',
        permissions: ['documents.create'],
      };
      service.getRoleDetail.mockResolvedValue(mockDetail);

      const result = await controller.getRoleDetail(ROLE_ID, ORG_ID);

      expect(result).toBeInstanceOf(ApiResponseDto);
      expect(getResponseField(result, 'statusCode')).toBe(200);
      expect(getResponseField(result, 'data')).toBe(mockDetail);
      expect(service.getRoleDetail).toHaveBeenCalledWith(ROLE_ID, ORG_ID);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // updateRole
  // ─────────────────────────────────────────────────────────────────────────
  describe('updateRole', () => {
    it('should return ApiResponseDto with status 200', async () => {
      service.updateRole.mockResolvedValue(undefined);
      const dto = { name: 'new_name' };

      const result = await controller.updateRole(ROLE_ID, ORG_ID, dto);

      expect(result).toBeInstanceOf(ApiResponseDto);
      expect(getResponseField(result, 'statusCode')).toBe(200);
      expect(service.updateRole).toHaveBeenCalledWith(ROLE_ID, ORG_ID, dto);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // deleteRole
  // ─────────────────────────────────────────────────────────────────────────
  describe('deleteRole', () => {
    it('should return ApiResponseDto with status 200', async () => {
      service.deleteRole.mockResolvedValue(undefined);

      const result = await controller.deleteRole(ROLE_ID, ORG_ID);

      expect(result).toBeInstanceOf(ApiResponseDto);
      expect(getResponseField(result, 'statusCode')).toBe(200);
      expect(service.deleteRole).toHaveBeenCalledWith(ROLE_ID, ORG_ID);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // assignPermissions
  // ─────────────────────────────────────────────────────────────────────────
  describe('assignPermissions', () => {
    it('should return ApiResponseDto with status 200', async () => {
      service.assignPermissions.mockResolvedValue(undefined);
      const dto = {
        roleId: ROLE_ID,
        permissionCodes: ['documents.create'],
      };

      const result = await controller.assignPermissions(ORG_ID, USER_ID, dto);

      expect(result).toBeInstanceOf(ApiResponseDto);
      expect(getResponseField(result, 'statusCode')).toBe(200);
      expect(service.assignPermissions).toHaveBeenCalledWith(
        dto,
        USER_ID,
        ORG_ID,
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // revokePermissions
  // ─────────────────────────────────────────────────────────────────────────
  describe('revokePermissions', () => {
    it('should return ApiResponseDto with status 200', async () => {
      service.revokePermissions.mockResolvedValue(undefined);
      const dto = {
        roleId: ROLE_ID,
        permissionCodes: ['documents.create'],
      };

      const result = await controller.revokePermissions(ORG_ID, dto);

      expect(result).toBeInstanceOf(ApiResponseDto);
      expect(getResponseField(result, 'statusCode')).toBe(200);
      expect(service.revokePermissions).toHaveBeenCalledWith(dto, ORG_ID);
    });
  });

  describe('updateRolePermissions', () => {
    it('should return ApiResponseDto with status 200', async () => {
      service.updateRolePermissions.mockResolvedValue(undefined);
      const dto = {
        permissionCodes: ['documents.create'],
      };

      const result = await controller.updateRolePermissions(
        ROLE_ID,
        ORG_ID,
        USER_ID,
        dto,
      );

      expect(result).toBeInstanceOf(ApiResponseDto);
      expect(getResponseField(result, 'statusCode')).toBe(200);
      expect(service.updateRolePermissions).toHaveBeenCalledWith(
        ROLE_ID,
        dto,
        USER_ID,
        ORG_ID,
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getMemberRoles
  // ─────────────────────────────────────────────────────────────────────────
  describe('getMemberRoles', () => {
    it('should return ApiResponseDto with member roles (no scopeType)', async () => {
      const mockRoles = [{ id: 'ur-1', roleName: 'editor' }];
      service.getMemberRoles.mockResolvedValue(mockRoles);

      const result = await controller.getMemberRoles(
        'member-uuid',
        ORG_ID,
        undefined,
      );

      expect(result).toBeInstanceOf(ApiResponseDto);
      expect(getResponseField(result, 'statusCode')).toBe(200);
      expect(getResponseField(result, 'data')).toBe(mockRoles);
      expect(service.getMemberRoles).toHaveBeenCalledWith(
        'member-uuid',
        ORG_ID,
        undefined,
      );
    });

    it('should filter by scopeType when provided', async () => {
      service.getMemberRoles.mockResolvedValue([]);

      await controller.getMemberRoles('member-uuid', ORG_ID, 'project' as any);

      expect(service.getMemberRoles).toHaveBeenCalledWith(
        'member-uuid',
        ORG_ID,
        'project',
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // assignRoleToMember
  // ─────────────────────────────────────────────────────────────────────────
  describe('assignRoleToMember', () => {
    it('should return ApiResponseDto with status 200', async () => {
      service.assignRoleToMember.mockResolvedValue(undefined);
      const dto = { userId: 'member-uuid', roleId: ROLE_ID };

      const result = await controller.assignRoleToMember(ORG_ID, USER_ID, dto);

      expect(result).toBeInstanceOf(ApiResponseDto);
      expect(getResponseField(result, 'statusCode')).toBe(200);
      expect(service.assignRoleToMember).toHaveBeenCalledWith(
        dto,
        USER_ID,
        ORG_ID,
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // revokeRoleFromMember
  // ─────────────────────────────────────────────────────────────────────────
  describe('revokeRoleFromMember', () => {
    it('should return ApiResponseDto with status 200', async () => {
      service.revokeRoleFromMember.mockResolvedValue(undefined);
      const dto = { userId: 'member-uuid', roleId: ROLE_ID };

      const result = await controller.revokeRoleFromMember(ORG_ID, dto);

      expect(result).toBeInstanceOf(ApiResponseDto);
      expect(getResponseField(result, 'statusCode')).toBe(200);
      expect(service.revokeRoleFromMember).toHaveBeenCalledWith(dto, ORG_ID);
    });
  });
});
