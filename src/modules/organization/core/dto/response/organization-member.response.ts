import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MemberUserInfo {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID của user',
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

  @ApiPropertyOptional({ example: '0901234567', description: 'Số điện thoại' })
  phone?: string;

  @ApiPropertyOptional({ example: '1999-05-20', description: 'Ngày sinh' })
  dateOfBirth?: Date;

  @ApiProperty({ example: true, description: 'Tài khoản đang hoạt động' })
  isActive: boolean;

  @ApiProperty({ example: true, description: 'Email đã xác thực' })
  isVerified: boolean;
}

export class OrganizationMemberResponse {
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

  @ApiProperty({ example: true, description: 'Thành viên đang hoạt động' })
  isActive: boolean;

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

  @ApiProperty({ type: MemberUserInfo, description: 'Thông tin user' })
  user: MemberUserInfo;

  static fromRaw(r: Record<string, any>): OrganizationMemberResponse {
    const res = new OrganizationMemberResponse();
    res.id = r.id;
    res.organizationId = r.organizationId;
    res.userId = r.userId;
    res.invitedBy = r.invitedBy;
    res.isActive = r.isActive;
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
    return res;
  }
}
