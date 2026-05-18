import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { OrganizationMember } from '../core/entities/organization-member.entity';
import { User } from '@modules/users/entities/user.entity';
import { UserRole, ScopeType } from '@modules/rbac/entities/user-role.entity';
import { Role } from '@modules/rbac/entities/role.entity';
import { OrganizationCoreService } from '../core/organization-core.service';
import { ValidationException } from '@common/exceptions/validation.exception';
import { ErrorCode } from '@common/constants/error-code.constant';

import {
  GetMembersQueryRequest,
  MemberSortBy,
  MEMBER_SORT_FIELDS,
} from './dto/request/get-members-query.request';
import { UpdateMemberStatusRequest } from './dto/request/update-member-status.request';
import {
  MemberSummaryResponse,
  MemberDetailResponse,
  MemberRoleInfo,
} from './dto/response/member.response';
import { PaginatedResponse } from '@common/dto/paginated.response';
import { PaginationHelper } from '@common/helpers/pagination.helper';
import { SortOrder } from '@common/dto/pagination.request';

@Injectable()
export class MemberManageService {
  constructor(
    @InjectRepository(OrganizationMember)
    private readonly memberRepo: Repository<OrganizationMember>,

    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,

    private readonly organizationCoreService: OrganizationCoreService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // Lấy danh sách members (phân trang + filter + search)
  // ─────────────────────────────────────────────────────────────────────────────
  async getMembers(
    orgId: string,
    query: GetMembersQueryRequest = {},
  ): Promise<PaginatedResponse<MemberSummaryResponse>> {
    try {
      const organization =
        await this.organizationCoreService.getOrganizationById(orgId);

      if (!organization) {
        throw new ValidationException(ErrorCode.O001);
      }

      // Safe column mapping — tránh string interpolation trực tiếp vào SQL
      const sortColumnMap: Record<MemberSortBy, string> = {
        [MemberSortBy.JOINED_AT]: 'm.joined_at',
        [MemberSortBy.EMAIL]: 'u.email',
        [MemberSortBy.FIRST_NAME]: 'u.first_name',
      };

      const qb = this.memberRepo
        .createQueryBuilder('m')
        .innerJoin(User, 'u', 'u.id = m.user_id')
        // LEFT JOIN để lấy role names (có thể không có role)
        .leftJoin(
          UserRole,
          'ur',
          'ur.user_id = m.user_id AND ur.organization_id = m.organization_id',
        )
        .leftJoin(Role, 'r', 'r.id = ur.role_id AND r.deleted_at IS NULL')
        .where('m.organization_id = :orgId', { orgId })
        .andWhere('u.deleted_at IS NULL');

      // Filter theo isActive nếu có
      if (query.isActive !== undefined) {
        qb.andWhere('m.is_active = :isActive', { isActive: query.isActive });
        // Nếu filter active members thì ẩn deleted
        if (query.isActive) {
          qb.andWhere('m.is_deleted = false');
        }
      } else {
        // Mặc định ẩn deleted members
        qb.andWhere('m.is_deleted = false');
      }

      // Search theo email, firstName, lastName (ILIKE)
      if (query.search) {
        qb.andWhere(
          '(u.email ILIKE :search OR u.first_name ILIKE :search OR u.last_name ILIKE :search)',
          { search: `%${query.search}%` },
        );
      }

      // GROUP BY để aggregate role names
      qb.select([
        'm.id AS "id"',
        'm.user_id AS "userId"',
        'm.is_active AS "memberStatus"',
        'm.is_owner AS "isOwner"',
        'm.joined_at AS "joinedAt"',
        // User summary info
        'u.id AS "user_id"',
        'u.email AS "user_email"',
        'u.first_name AS "user_firstName"',
        'u.last_name AS "user_lastName"',
        'u.avatar_url AS "user_avatarUrl"',
        // Aggregate role names
        'STRING_AGG(DISTINCT r.name, \',\') AS "role_names"',
      ])
        .groupBy('m.id')
        .addGroupBy('u.id');

      // Count total trước khi pagination — dùng sub-query cho chính xác
      const countQb = this.memberRepo
        .createQueryBuilder('m')
        .innerJoin(User, 'u', 'u.id = m.user_id')
        .where('m.organization_id = :orgId', { orgId })
        .andWhere('u.deleted_at IS NULL');

      if (query.isActive !== undefined) {
        countQb.andWhere('m.is_active = :isActive', {
          isActive: query.isActive,
        });
        if (query.isActive) {
          countQb.andWhere('m.is_deleted = false');
        }
      } else {
        countQb.andWhere('m.is_deleted = false');
      }

      if (query.search) {
        countQb.andWhere(
          '(u.email ILIKE :search OR u.first_name ILIKE :search OR u.last_name ILIKE :search)',
          { search: `%${query.search}%` },
        );
      }

      const total = await countQb.getCount();

      // Ensure valid sort fields and values
      const { skip, take } = PaginationHelper.getSkipAndTake(query);
      const sortByStr = query.sortBy || MemberSortBy.JOINED_AT;

      let validSortBy = MemberSortBy.JOINED_AT;
      if ((MEMBER_SORT_FIELDS as string[]).includes(sortByStr)) {
        validSortBy = sortByStr as MemberSortBy;
      }

      // The default pagination helper getOrder expects allowedSortFields and defaultAlias
      // but MemberSortBy fields belong to multiple aliases.
      // Easiest is to manually get the order.
      const sortOrder = query.sortOrder === SortOrder.ASC ? 'ASC' : 'DESC';

      // Sort + Pagination
      qb.orderBy(sortColumnMap[validSortBy], sortOrder)
        .offset(skip)
        .limit(take);

      const rows = await qb.getRawMany<Record<string, any>>();

      const items = rows.map((r) => MemberSummaryResponse.fromRaw(r));
      const meta = PaginationHelper.buildMeta(total, query);

      return new PaginatedResponse(items, meta);
    } catch (error) {
      console.error('Error getting members:', error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Lấy chi tiết 1 member (kèm user info + roles)
  // ─────────────────────────────────────────────────────────────────────────────
  async getMemberDetail(
    memberId: string,
    orgId: string,
  ): Promise<MemberDetailResponse> {
    try {
      const organization =
        await this.organizationCoreService.getOrganizationById(orgId);

      if (!organization) {
        throw new ValidationException(ErrorCode.O001);
      }

      // Query 1: member + user info (no role join, no GROUP BY)
      const row = await this.memberRepo
        .createQueryBuilder('m')
        .innerJoin(User, 'u', 'u.id = m.user_id')
        .where('m.user_id = :memberId', { memberId })
        .andWhere('m.organization_id = :orgId', { orgId })
        .andWhere('m.is_deleted = false')
        .select([
          'm.id AS "id"',
          'm.organization_id AS "organizationId"',
          'm.user_id AS "userId"',
          'm.invited_by AS "invitedBy"',
          'm.is_active AS "memberStatus"',
          'm.is_owner AS "isOwner"',
          'm.joined_at AS "joinedAt"',
          'm.left_at AS "leftAt"',
          'm.invitation_accepted_at AS "invitationAcceptedAt"',
          'm.created_at AS "createdAt"',
          'u.id AS "user_id"',
          'u.email AS "user_email"',
          'u.first_name AS "user_firstName"',
          'u.last_name AS "user_lastName"',
          'u.avatar_url AS "user_avatarUrl"',
          'u.phone AS "user_phone"',
          'u.date_of_birth AS "user_dateOfBirth"',
          'u.is_active AS "user_isActive"',
          'u.is_verified AS "user_isVerified"',
        ])
        .getRawOne<Record<string, any>>();

      if (!row) {
        throw new ValidationException(ErrorCode.O003);
      }

      // Query 2: roles cho member này trong org (trả về objects)
      const roles = await this.userRoleRepo
        .createQueryBuilder('ur')
        .innerJoin(Role, 'r', 'r.id = ur.role_id AND r.deleted_at IS NULL')
        .where('ur.user_id = :userId', { userId: memberId })
        .andWhere('ur.organization_id = :orgId', { orgId })
        .select([
          'r.id AS "id"',
          'r.name AS "name"',
          'r.description AS "description"',
        ])
        .getRawMany<MemberRoleInfo>();

      return MemberDetailResponse.fromRaw(row, roles);
    } catch (error) {
      console.error('Error getting member detail:', error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Cập nhật trạng thái member (active/inactive)
  // ─────────────────────────────────────────────────────────────────────────────
  async updateMemberStatus(
    memberId: string,
    orgId: string,
    dto: UpdateMemberStatusRequest,
    callerId: string,
  ): Promise<void> {
    try {
      const organization =
        await this.organizationCoreService.getOrganizationById(orgId);

      if (!organization) {
        throw new ValidationException(ErrorCode.O001);
      }

      const member = await this.memberRepo.findOne({
        where: { organizationId: orgId, userId: memberId, isDeleted: false },
      });

      if (!member) {
        throw new ValidationException(ErrorCode.O003);
      }

      // Không cho sửa trạng thái owner
      if (member.isOwner) {
        throw new ForbiddenException(ErrorCode.O007);
      }

      // Không cho sửa chính mình
      if (member.userId === callerId) {
        throw new ForbiddenException(
          'You cannot update your own member status',
        );
      }

      // Cập nhật trạng thái
      member.isActive = dto.isActive;

      if (!dto.isActive) {
        // Deactivate: set leftAt, isDeleted giữ false (chỉ inactive, chưa xóa)
        member.leftAt = new Date();
      } else {
        // Reactivate: clear leftAt
        member.leftAt = undefined;
      }

      await this.memberRepo.save(member);

      // Nếu deactivate → xóa user_roles trong scope ORGANIZATION
      if (!dto.isActive) {
        await this.userRoleRepo.delete({
          userId: memberId,
          organizationId: orgId,
          scopeType: ScopeType.ORGANIZATION,
        });
      }
    } catch (error) {
      console.error('Error updating member status:', error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Soft-delete member (isActive=false, isDeleted=true, leftAt=now)
  // ─────────────────────────────────────────────────────────────────────────────
  async removeMember(
    memberId: string,
    orgId: string,
    callerId: string,
  ): Promise<void> {
    try {
      const organization =
        await this.organizationCoreService.getOrganizationById(orgId);

      if (!organization) {
        throw new ValidationException(ErrorCode.O001);
      }

      const member = await this.memberRepo.findOne({
        where: { organizationId: orgId, userId: memberId, isDeleted: false },
      });

      if (!member) {
        throw new ValidationException(ErrorCode.O003);
      }

      // Không cho xóa owner
      if (member.isOwner) {
        throw new ForbiddenException(ErrorCode.O007);
      }

      // Không cho xóa chính mình
      if (member.userId === callerId) {
        throw new ForbiddenException(
          'You cannot remove yourself from the organization',
        );
      }

      // Soft delete
      member.isActive = false;
      member.isDeleted = true;
      member.leftAt = new Date();
      await this.memberRepo.save(member);

      // Xoá UserRole trong scope ORGANIZATION
      await this.userRoleRepo.delete({
        userId: memberId,
        organizationId: orgId,
        scopeType: ScopeType.ORGANIZATION,
      });
    } catch (error) {
      console.error('Error removing member:', error);
      throw error;
    }
  }
}
