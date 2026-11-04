import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ProjectInviteRole,
  ProjectInviteStatus,
} from '../../entities/project-invite.entity';

export class ProjectInviteResponse {
  @ApiProperty({ example: '8f0bc90e-9d5f-4c66-9e10-8ae567f2d8ea' })
  id: string;

  @ApiProperty({ example: 'f8f1e2ff-7f9d-4ce2-9301-a497f376facd' })
  projectId: string;

  @ApiProperty({ example: '18d17aea-7e8c-4a58-8e56-74c2949dcdd6' })
  organizationId: string;

  @ApiProperty({ example: '4b6f223b-2e53-4698-aa8e-6570f6cb2f60' })
  inviteeUserId: string;

  @ApiProperty({ enum: ProjectInviteRole, example: ProjectInviteRole.PM })
  role: ProjectInviteRole;

  @ApiProperty({ enum: ProjectInviteStatus, example: ProjectInviteStatus.PENDING })
  status: ProjectInviteStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  expiresAt?: Date;

  @ApiPropertyOptional()
  acceptedAt?: Date;
}
