import { ChatPresenceStatus } from '@modules/chat-box/presence/entities/user-presence.entity';
import {
  ChatGlobalSearchEntityType,
} from '@modules/chat-box/message-management/constants/search-global.constant';
import { ChatAttachmentType } from '@modules/chat-box/message-management/entities/message-attachment.entity';
import { ChatRoomType, ChatRoomVisibility } from '@modules/chat-box/room-management/entities/room.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GlobalSearchSuggestPersonItemResponse {
  @ApiProperty({ enum: ChatGlobalSearchEntityType, example: ChatGlobalSearchEntityType.PERSON })
  entityType: ChatGlobalSearchEntityType.PERSON;

  @ApiProperty({ example: '8eb14979-fdf1-48fb-8eb8-8cf2015dc8de' })
  userId: string;

  @ApiProperty({ example: 'Nguyen Khang' })
  displayName: string;

  @ApiProperty({ example: 'khang@iccp.vn' })
  email: string;

  @ApiPropertyOptional({
    example: 'https://ik.imagekit.io/your-space/avatar-khang.png',
  })
  avatarUrl?: string;

  @ApiProperty({ enum: ChatPresenceStatus, example: ChatPresenceStatus.ONLINE })
  presenceStatus: ChatPresenceStatus;

  @ApiProperty({
    example: false,
    description:
      'True when this person result is the current user (self-DM candidate).',
  })
  isSelf: boolean;

  @ApiPropertyOptional({
    example: '2a14ea23-ce41-44be-825b-8bb8891716d1',
    description: 'Existing DM room id between current user and this person, if any.',
  })
  dmRoomId?: string;
}

export class GlobalSearchSuggestRoomItemResponse {
  @ApiProperty({ enum: ChatGlobalSearchEntityType, example: ChatGlobalSearchEntityType.ROOM })
  entityType: ChatGlobalSearchEntityType.ROOM;

  @ApiProperty({ example: '47e7a79a-20b7-4a4f-bfe2-122eaa8fee78' })
  roomId: string;

  @ApiProperty({ enum: ChatRoomType, example: ChatRoomType.CHANNEL })
  roomType: ChatRoomType;

  @ApiProperty({ enum: ChatRoomVisibility, example: ChatRoomVisibility.PRIVATE })
  visibility: ChatRoomVisibility;

  @ApiPropertyOptional({ example: 'iccp-helpdesk' })
  name?: string;

  @ApiPropertyOptional({ example: 'iccp-helpdesk' })
  roomKey?: string;

  @ApiPropertyOptional({ example: 'Internal support room' })
  topic?: string;

  @ApiProperty({ example: 12 })
  memberCount: number;

  @ApiPropertyOptional({ example: '2026-04-07T08:20:00.000Z' })
  lastMessageAt?: Date;
}

export class GlobalSearchSuggestMessageItemResponse {
  @ApiProperty({ enum: ChatGlobalSearchEntityType, example: ChatGlobalSearchEntityType.MESSAGE })
  entityType: ChatGlobalSearchEntityType.MESSAGE;

  @ApiProperty({ example: '71f1cf08-e67c-4222-bfed-884848f2b137' })
  messageId: string;

  @ApiProperty({ example: '47e7a79a-20b7-4a4f-bfe2-122eaa8fee78' })
  roomId: string;

  @ApiPropertyOptional({ example: 'marketing-private' })
  roomName?: string;

  @ApiProperty({ enum: ChatRoomType, example: ChatRoomType.CHANNEL })
  roomType: ChatRoomType;

  @ApiPropertyOptional({ example: '545390ea-3f05-4998-a35f-f78805045a9b' })
  senderId?: string;

  @ApiPropertyOptional({ example: 'Bao Bui' })
  senderDisplayName?: string;

  @ApiPropertyOptional({
    example: 'https://ik.imagekit.io/your-space/avatar-bao.png',
  })
  senderAvatarUrl?: string;

  @ApiProperty({
    example: 'Khang oi, please help verify deploy config before release.',
  })
  snippet: string;

  @ApiProperty({ example: '2026-04-07T07:50:00.000Z' })
  sentAt: Date;

  @ApiProperty({ example: false })
  hasAttachments: boolean;
}

export class GlobalSearchSuggestFileItemResponse {
  @ApiProperty({ enum: ChatGlobalSearchEntityType, example: ChatGlobalSearchEntityType.FILE })
  entityType: ChatGlobalSearchEntityType.FILE;

  @ApiProperty({ example: 'bbf9f5b2-c8ea-4fe2-a9e5-8e95d1de31f7' })
  attachmentId: string;

  @ApiProperty({ example: '71f1cf08-e67c-4222-bfed-884848f2b137' })
  messageId: string;

  @ApiProperty({ example: '47e7a79a-20b7-4a4f-bfe2-122eaa8fee78' })
  roomId: string;

  @ApiPropertyOptional({ example: 'iccp-product' })
  roomName?: string;

  @ApiProperty({ example: 'khang-onboarding.pdf' })
  fileName: string;

  @ApiPropertyOptional({ example: 'pdf' })
  documentType?: string;

  @ApiProperty({ enum: ChatAttachmentType, example: ChatAttachmentType.FILE })
  attachmentType: ChatAttachmentType;

  @ApiPropertyOptional({ example: 'Ha Nguyen' })
  uploaderDisplayName?: string;

  @ApiProperty({ example: '2026-04-06T14:00:00.000Z' })
  sentAt: Date;
}

export class GlobalSearchSuggestPeopleSectionResponse {
  @ApiProperty({ example: 4 })
  count: number;

  @ApiProperty({ example: false })
  hasMore: boolean;

  @ApiProperty({ type: [GlobalSearchSuggestPersonItemResponse] })
  items: GlobalSearchSuggestPersonItemResponse[];
}

export class GlobalSearchSuggestRoomsSectionResponse {
  @ApiProperty({ example: 3 })
  count: number;

  @ApiProperty({ example: true })
  hasMore: boolean;

  @ApiProperty({ type: [GlobalSearchSuggestRoomItemResponse] })
  items: GlobalSearchSuggestRoomItemResponse[];
}

export class GlobalSearchSuggestMessagesSectionResponse {
  @ApiProperty({ example: 6 })
  count: number;

  @ApiProperty({ example: true })
  hasMore: boolean;

  @ApiProperty({ type: [GlobalSearchSuggestMessageItemResponse] })
  items: GlobalSearchSuggestMessageItemResponse[];
}

export class GlobalSearchSuggestFilesSectionResponse {
  @ApiProperty({ example: 2 })
  count: number;

  @ApiProperty({ example: false })
  hasMore: boolean;

  @ApiProperty({ type: [GlobalSearchSuggestFileItemResponse] })
  items: GlobalSearchSuggestFileItemResponse[];
}

export class SearchGlobalSuggestSectionsResponse {
  @ApiProperty({ type: GlobalSearchSuggestPeopleSectionResponse })
  people: GlobalSearchSuggestPeopleSectionResponse;

  @ApiProperty({ type: GlobalSearchSuggestRoomsSectionResponse })
  rooms: GlobalSearchSuggestRoomsSectionResponse;

  @ApiProperty({ type: GlobalSearchSuggestMessagesSectionResponse })
  messages: GlobalSearchSuggestMessagesSectionResponse;

  @ApiProperty({ type: GlobalSearchSuggestFilesSectionResponse })
  files: GlobalSearchSuggestFilesSectionResponse;
}

export class SearchGlobalSuggestResponse {
  @ApiProperty({ example: 'khang' })
  query: string;

  @ApiProperty({ example: 43 })
  tookMs: number;

  @ApiProperty({ type: SearchGlobalSuggestSectionsResponse })
  sections: SearchGlobalSuggestSectionsResponse;
}
