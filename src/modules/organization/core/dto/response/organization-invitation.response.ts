import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvitationStatus } from '../../entities/organization-invitation.entity';

export class OrganizationInvitationResponse {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID của lời mời',
  })
  id: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID của tổ chức',
  })
  organizationId: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'Email của người được mời',
  })
  email: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID của người đã mời',
  })
  invitedBy: string;

  @ApiPropertyOptional({
    example: 'Dear team, welcome to our workspace.',
    description: 'Lời nhắn tuỳ chỉnh đi kèm lời mời',
  })
  message?: string | null;

  @ApiProperty({
    enum: InvitationStatus,
    description: 'Trạng thái của lời mời',
  })
  status: InvitationStatus;

  @ApiProperty({
    example: '2021-01-01',
    description: 'Ngày hết hạn của lời mời',
  })
  expiresAt: Date;

  @ApiPropertyOptional({
    example: '2021-01-01',
    description: 'Ngày chấp nhận của lời mời',
  })
  acceptedAt?: Date;

  @ApiProperty({
    example: '2021-01-01',
    description: 'Ngày tạo của lời mời',
  })
  createdAt: Date;
}
