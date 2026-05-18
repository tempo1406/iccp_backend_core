import { ApiProperty } from '@nestjs/swagger';

export class RoomPermissionResponse {
  @ApiProperty({ example: true })
  canView: boolean;

  @ApiProperty({ example: false })
  canJoin: boolean;

  @ApiProperty({ example: true })
  canSendMessage: boolean;

  @ApiProperty({ example: false })
  canInviteMembers: boolean;

  @ApiProperty({ example: false })
  canManageMembers: boolean;

  @ApiProperty({ example: true })
  canLeave: boolean;

  @ApiProperty({ example: false })
  canPinMessages: boolean;

  @ApiProperty({ example: false })
  canChangeVisibilityToPublic: boolean;

  @ApiProperty({ example: true })
  canChangeVisibilityToPrivate: boolean;
}
