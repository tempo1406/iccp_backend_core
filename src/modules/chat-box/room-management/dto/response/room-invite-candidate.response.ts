import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RoomInviteCandidateItemResponse {
  @ApiProperty({ example: '8eb14979-fdf1-48fb-8eb8-8cf2015dc8de' })
  userId: string;

  @ApiProperty({ example: 'Alice Nguyen' })
  displayName: string;

  @ApiProperty({ example: 'alice@company.com' })
  email: string;

  @ApiPropertyOptional({
    example: 'https://ik.imagekit.io/company/avatar-alice.png',
  })
  avatarUrl?: string;

  @ApiProperty({ example: false })
  isAlreadyMember: boolean;

  @ApiProperty({ example: true })
  hasPendingInvitation: boolean;

  @ApiPropertyOptional({
    example: 'pending_invitation',
    description: 'Ly do user chua the duoc moi moi (neu co)',
  })
  reasonBlocked?: string;
}

export class RoomInviteCandidatesResponse {
  @ApiProperty({ example: 'ee57ff89-a83f-4e1d-ab5a-b0243c88f19d' })
  roomId: string;

  @ApiProperty({ type: [RoomInviteCandidateItemResponse] })
  items: RoomInviteCandidateItemResponse[];
}

