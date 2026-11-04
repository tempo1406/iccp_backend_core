import {
  ChatContextScope,
  ChatRoomType,
} from '@modules/chat-box/room-management/entities/room.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoomCandidateItemResponse {
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

  @ApiProperty({
    example: true,
    description:
      'true neu user hop le de them vao room theo scope dang chon (organization/project).',
  })
  isEligible: boolean;

  @ApiPropertyOptional({
    example: 'not_in_project',
    description: 'Ly do user khong hop le (neu co)',
  })
  reasonBlocked?: string;
}

export class CreateRoomCandidatesResponse {
  @ApiProperty({ enum: ChatRoomType, example: ChatRoomType.GROUP_DM })
  roomType: ChatRoomType;

  @ApiProperty({
    enum: ChatContextScope,
    example: ChatContextScope.PROJECT,
  })
  contextScope: ChatContextScope;

  @ApiPropertyOptional({
    format: 'uuid',
    example: '4f495fd6-7529-4eb8-bf3c-a294362608f7',
  })
  contextId?: string;

  @ApiProperty({ type: [CreateRoomCandidateItemResponse] })
  items: CreateRoomCandidateItemResponse[];
}
