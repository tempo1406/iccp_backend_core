import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { InvitationStatus } from '@modules/organization/core/entities/organization-invitation.entity';

export class InvitationDetailResponse {
  @ApiProperty({ description: 'ID lời mời' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'ID tổ chức' })
  @Expose()
  organizationId: string;

  @ApiProperty({ description: 'Email người được mời' })
  @Expose()
  email: string;

  @ApiProperty({ description: 'ID người mời' })
  @Expose()
  invitedBy: string;

  @ApiPropertyOptional({ description: 'Lời nhắn tuỳ chỉnh đi kèm lời mời' })
  @Expose()
  message?: string | null;

  @ApiProperty({ enum: InvitationStatus, description: 'Trạng thái lời mời' })
  @Expose()
  status: InvitationStatus;

  @ApiProperty({ description: 'Thời điểm hết hạn' })
  @Expose()
  expiresAt: Date;

  @ApiPropertyOptional({ description: 'Thời điểm chấp nhận (nếu đã accepted)' })
  @Expose()
  acceptedAt?: Date;

  @ApiProperty({ description: 'Thời điểm tạo lời mời' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ description: 'Lời mời còn hiệu lực không' })
  @Expose()
  isExpired: boolean;
}
