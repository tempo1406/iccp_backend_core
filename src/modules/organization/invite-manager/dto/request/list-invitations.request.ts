import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { InvitationStatus } from '@modules/organization/core/entities/organization-invitation.entity';
import { PaginationRequest } from '@common/dto/pagination.request';

export class ListInvitationsRequest extends PaginationRequest {
  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái lời mời',
    enum: InvitationStatus,
    example: InvitationStatus.PENDING,
  })
  @IsEnum(InvitationStatus)
  @IsOptional()
  status?: InvitationStatus;
}

// Các field được phép sort để tránh injection
export const INVITATION_SORT_FIELDS = [
  'createdAt',
  'email',
  'status',
  'expiresAt',
];
