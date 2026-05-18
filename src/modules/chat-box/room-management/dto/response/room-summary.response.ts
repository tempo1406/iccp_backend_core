import {
  ChatHiddenReason,
  ChatMemberRole,
  ChatNotifyLevel,
} from '@modules/chat-box/room-management/entities/room-member.entity';
import {
  ChatContextScope,
  ChatRoomType,
  ChatRoomVisibility,
} from '@modules/chat-box/room-management/entities/room.entity';
import { ChatPresenceStatus } from '@modules/chat-box/presence/entities/user-presence.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoomPermissionResponse } from './room-permission.response';
import { RoomViewerStateResponse } from './room-viewer-state.response';

export class RoomMemberPreviewResponse {
  @ApiProperty({ example: '6e882f55-74d2-4f5f-b1df-7862908bd465' })
  userId: string;

  @ApiProperty({ example: 'Bo Bui' })
  displayName: string;

  @ApiPropertyOptional({ example: 'team.user@iccp.com' })
  email?: string;

  @ApiPropertyOptional({ example: 'Bo' })
  firstName?: string;

  @ApiPropertyOptional({ example: 'Bui' })
  lastName?: string;

  @ApiPropertyOptional({
    example: 'https://ik.imagekit.io/your-space/avatar-user.png',
  })
  avatarUrl?: string;
}

export class RoomDmCounterpartResponse extends RoomMemberPreviewResponse {
  @ApiPropertyOptional({
    enum: ChatPresenceStatus,
    example: ChatPresenceStatus.ONLINE,
  })
  presenceStatus?: ChatPresenceStatus;

  @ApiPropertyOptional({ example: '2026-03-11T05:30:00.000Z' })
  lastActivityAt?: Date;
}

export class RoomSummaryResponse {
  @ApiProperty({ example: 'ee57ff89-a83f-4e1d-ab5a-b0243c88f19d' })
  id: string;

  @ApiProperty({ example: 'ebf11c0a-f8ac-4ddf-ad81-9e7c98ea1cd5' })
  organizationId: string;

  @ApiProperty({ enum: ChatRoomType, example: ChatRoomType.CHANNEL })
  roomType: ChatRoomType;

  @ApiProperty({
    enum: ChatRoomVisibility,
    example: ChatRoomVisibility.PRIVATE,
  })
  visibility: ChatRoomVisibility;

  @ApiPropertyOptional({ example: 'marketing-private' })
  name?: string;

  @ApiPropertyOptional({ example: 'marketing-private' })
  roomKey?: string;

  @ApiPropertyOptional({ example: 'Kenh thao luan noi bo team marketing' })
  topic?: string;

  @ApiPropertyOptional({ example: 'Noi thao luan noi bo team marketing' })
  description?: string;

  @ApiProperty({
    enum: ChatContextScope,
    example: ChatContextScope.ORGANIZATION,
  })
  contextScope: ChatContextScope;

  @ApiPropertyOptional({ example: '7f7f7448-c6f1-4561-8f34-ff1f8cc4f3f6' })
  contextId?: string;

  @ApiProperty({ example: '6e882f55-74d2-4f5f-b1df-7862908bd465' })
  createdBy: string;

  @ApiPropertyOptional({
    example: 'Bo Bui',
    description: 'Ten hien thi cua nguoi tao room',
  })
  createdByDisplayName?: string;

  @ApiPropertyOptional({ example: '6e882f55-74d2-4f5f-b1df-7862908bd465' })
  ownerId?: string;

  @ApiPropertyOptional({ example: '2026-03-11T03:00:00.000Z' })
  lastMessageAt?: Date;

  @ApiPropertyOptional({
    example: 'Meeting agenda updated in latest message',
    description:
      'Lightweight snippet for room list row to avoid extra hydrate request',
  })
  lastMessageSnippet?: string;

  @ApiProperty({ example: false })
  isArchived: boolean;

  @ApiPropertyOptional({ example: '2026-03-20T08:00:00.000Z' })
  archivedAt?: Date;

  @ApiPropertyOptional({ example: '6e882f55-74d2-4f5f-b1df-7862908bd465' })
  archivedByUserId?: string;

  @ApiPropertyOptional({ example: 'Bo Bui' })
  archivedByDisplayName?: string;

  @ApiProperty({
    enum: ChatNotifyLevel,
    example: ChatNotifyLevel.ALL,
  })
  myNotifyLevel: ChatNotifyLevel;

  @ApiProperty({
    example: false,
    description: 'Room nay dang bi user hien tai hide hay khong',
  })
  isHiddenByUser: boolean;

  @ApiPropertyOptional({
    enum: ChatHiddenReason,
    example: ChatHiddenReason.MUTE_AND_HIDE,
  })
  hiddenReason?: ChatHiddenReason;

  @ApiPropertyOptional({ example: '2026-03-20T10:00:00.000Z' })
  hiddenAt?: Date;

  @ApiProperty({
    example: false,
    description:
      'True neu user hien tai co quyen unarchive room nay (owner/admin va room dang archived)',
  })
  canUnarchive: boolean;

  @ApiProperty({
    example: false,
    description:
      'True neu user hien tai co the unhide room nay khoi Hidden bucket',
  })
  canUnhide: boolean;

  @ApiProperty({
    example: false,
    description: 'Room nay da duoc user hien tai star hay chua',
  })
  isStarred: boolean;

  @ApiPropertyOptional({
    example: '2026-03-17T10:20:00.000Z',
    nullable: true,
    description: 'Thoi diem user hien tai star room (neu co)',
  })
  starredAt?: Date;

  @ApiProperty({
    example: false,
    description: 'Chính sách ở cấp room: role member có thể ghim message',
  })
  allowMemberPinMessages: boolean;

  @ApiProperty({
    example: false,
    description: 'Chính sách ở cấp room: role guest có thể ghim message',
  })
  allowGuestPinMessages: boolean;

  @ApiProperty({ enum: ChatMemberRole, example: ChatMemberRole.OWNER })
  myRole: ChatMemberRole;

  @ApiProperty({ example: 6 })
  memberCount: number;

  @ApiProperty({
    example: false,
    description:
      'True khi current user da danh dau room nay bang action manual mark unread',
  })
  isManualUnreadByUser: boolean;

  @ApiPropertyOptional({ example: '2026-04-23T14:25:00.000Z' })
  manualUnreadAt?: Date;

  @ApiPropertyOptional({ example: 'fd4f66c6-9a07-4c49-bf90-d82a8a6f27fa' })
  manualUnreadFromMessageId?: string;

  @ApiPropertyOptional({
    type: RoomDmCounterpartResponse,
    description:
      'Counterpart summary for DM room to avoid FE fan-out user hydrate',
  })
  dmCounterpart?: RoomDmCounterpartResponse;

  @ApiPropertyOptional({
    type: [RoomMemberPreviewResponse],
    description:
      'Member preview for group DM sidebar (excluding current user)',
  })
  groupMemberPreview?: RoomMemberPreviewResponse[];

  @ApiPropertyOptional({
    example: false,
    description:
      'True when groupMemberPreview only includes partial members and still has more',
  })
  groupMemberPreviewHasMore?: boolean;

  @ApiProperty({ type: RoomPermissionResponse })
  myPermissions: RoomPermissionResponse;

  @ApiProperty({ type: RoomViewerStateResponse })
  viewerState: RoomViewerStateResponse;

  @ApiProperty({ example: '2026-03-11T02:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-03-11T02:30:00.000Z' })
  updatedAt: Date;
}
