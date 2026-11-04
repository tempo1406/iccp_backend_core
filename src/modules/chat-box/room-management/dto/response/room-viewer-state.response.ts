import { ApiProperty } from '@nestjs/swagger';

export enum ChatRoomViewerMembershipStatus {
  MEMBER = 'member',
  INVITED = 'invited',
  NON_MEMBER = 'non_member',
}

export class RoomViewerStateResponse {
  @ApiProperty({
    enum: ChatRoomViewerMembershipStatus,
    example: ChatRoomViewerMembershipStatus.MEMBER,
  })
  membershipStatus: ChatRoomViewerMembershipStatus;

  @ApiProperty({ example: false })
  isInvited: boolean;

  @ApiProperty({ example: true })
  canViewPreview: boolean;

  @ApiProperty({ example: false })
  canJoin: boolean;
}

