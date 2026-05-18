import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ─────────────────────────────────────────────────────────────────────────────
// User info — compact version cho list
// ─────────────────────────────────────────────────────────────────────────────
export class MemberUserSummary {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID user',
  })
  id: string;

  @ApiProperty({ example: 'user@example.com', description: 'Email' })
  email: string;

  @ApiPropertyOptional({ example: 'Nguyen', description: 'Họ' })
  firstName?: string;

  @ApiPropertyOptional({ example: 'Van A', description: 'Tên' })
  lastName?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/avatar.png',
    description: 'Avatar URL',
  })
  avatarUrl?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// User info — full version cho detail
// ─────────────────────────────────────────────────────────────────────────────
export class MemberUserDetail extends MemberUserSummary {
  @ApiPropertyOptional({ example: '0901234567', description: 'Số điện thoại' })
  phone?: string;

  @ApiPropertyOptional({ example: '1999-05-20', description: 'Ngày sinh' })
  dateOfBirth?: Date;

  @ApiProperty({ example: true, description: 'Tài khoản đang hoạt động' })
  isActive: boolean;

  @ApiProperty({ example: true, description: 'Email đã xác thực' })
  isVerified: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Role info — detail endpoint trả về object thay vì chỉ tên
// ─────────────────────────────────────────────────────────────────────────────
export class MemberRoleInfo {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID role',
  })
  id: string;

  @ApiProperty({ example: 'org_admin', description: 'Tên role' })
  name: string;

  @ApiPropertyOptional({
    example: 'Organization administrator',
    description: 'Mô tả role',
  })
  description?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary response — dùng cho GET list (ít field, hiển thị bảng)
// ─────────────────────────────────────────────────────────────────────────────
export class MemberSummaryResponse {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID membership',
  })
  id: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID user',
  })
  userId: string;

  @ApiProperty({
    example: true,
    description: 'Trạng thái thành viên trong org (active/inactive)',
  })
  memberStatus: boolean;

  @ApiProperty({ example: false, description: 'Là owner của tổ chức' })
  isOwner: boolean;

  @ApiProperty({
    example: '2025-01-15T08:30:00.000Z',
    description: 'Ngày tham gia',
  })
  joinedAt: Date;

  @ApiProperty({
    type: MemberUserSummary,
    description: 'Thông tin cơ bản user',
  })
  user: MemberUserSummary;

  @ApiProperty({
    example: ['org_admin', 'editor'],
    description: 'Tên các roles trong org',
  })
  roles: string[];

  /**
   * Map raw SQL row vào MemberSummaryResponse.
   * Dùng cho getRawMany() với alias user_xxx và role_names.
   */
  static fromRaw(r: Record<string, any>): MemberSummaryResponse {
    const res = new MemberSummaryResponse();
    res.id = r.id;
    res.userId = r.userId;
    res.memberStatus = r.memberStatus;
    res.isOwner = r.isOwner;
    res.joinedAt = r.joinedAt;
    res.user = {
      id: r.user_id,
      email: r.user_email,
      firstName: r.user_firstName,
      lastName: r.user_lastName,
      avatarUrl: r.user_avatarUrl,
    };
    res.roles = r.role_names ? r.role_names.split(',') : [];
    return res;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Detail response — dùng cho GET detail (đầy đủ thông tin + role objects)
// ─────────────────────────────────────────────────────────────────────────────
export class MemberDetailResponse {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID membership',
  })
  id: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID tổ chức',
  })
  organizationId: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID user',
  })
  userId: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID người mời',
  })
  invitedBy?: string;

  @ApiProperty({
    example: true,
    description: 'Trạng thái thành viên trong org (active/inactive)',
  })
  memberStatus: boolean;

  @ApiProperty({ example: false, description: 'Là owner của tổ chức' })
  isOwner: boolean;

  @ApiProperty({
    example: '2025-01-15T08:30:00.000Z',
    description: 'Ngày tham gia',
  })
  joinedAt: Date;

  @ApiPropertyOptional({
    example: '2025-06-01T10:00:00.000Z',
    description: 'Ngày rời tổ chức',
  })
  leftAt?: Date;

  @ApiPropertyOptional({
    example: '2025-01-15T09:00:00.000Z',
    description: 'Ngày chấp nhận lời mời',
  })
  invitationAcceptedAt?: Date;

  @ApiProperty({
    example: '2025-01-15T08:30:00.000Z',
    description: 'Ngày tạo record',
  })
  createdAt: Date;

  @ApiProperty({ type: MemberUserDetail, description: 'Thông tin đầy đủ user' })
  user: MemberUserDetail;

  @ApiProperty({
    type: [MemberRoleInfo],
    description: 'Danh sách roles chi tiết',
  })
  roles: MemberRoleInfo[];

  /**
   * Map raw SQL row + roles array vào MemberDetailResponse.
   * Tách riêng roles vì detail dùng role objects thay vì chỉ tên.
   */
  static fromRaw(
    r: Record<string, any>,
    roles: MemberRoleInfo[],
  ): MemberDetailResponse {
    const res = new MemberDetailResponse();
    res.id = r.id;
    res.organizationId = r.organizationId;
    res.userId = r.userId;
    res.invitedBy = r.invitedBy;
    res.memberStatus = r.memberStatus;
    res.isOwner = r.isOwner;
    res.joinedAt = r.joinedAt;
    res.leftAt = r.leftAt;
    res.invitationAcceptedAt = r.invitationAcceptedAt;
    res.createdAt = r.createdAt;
    res.user = {
      id: r.user_id,
      email: r.user_email,
      firstName: r.user_firstName,
      lastName: r.user_lastName,
      avatarUrl: r.user_avatarUrl,
      phone: r.user_phone,
      dateOfBirth: r.user_dateOfBirth,
      isActive: r.user_isActive,
      isVerified: r.user_isVerified,
    };
    res.roles = roles;
    return res;
  }
}
