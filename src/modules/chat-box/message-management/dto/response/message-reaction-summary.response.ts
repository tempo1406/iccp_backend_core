import { ApiProperty } from '@nestjs/swagger';

export class MessageReactionActorResponse {
  @ApiProperty({ example: '545390ea-3f05-4998-a35f-f78805045a9b' })
  userId: string;

  @ApiProperty({ example: 'dnote097@gmail.com', required: false })
  email?: string;

  @ApiProperty({ example: 'Bao', required: false })
  firstName?: string;

  @ApiProperty({ example: 'An', required: false })
  lastName?: string;

  @ApiProperty({ example: 'Bao An' })
  displayName: string;

  @ApiProperty({
    example: 'https://ik.imagekit.io/your-space/avatar-bao-an.png',
    required: false,
  })
  avatarUrl?: string;

  @ApiProperty({ example: '2026-03-18T09:23:41.000Z' })
  reactedAt: Date;
}

export class MessageReactionSummaryResponse {
  @ApiProperty({ example: '👍' })
  emoji: string;

  @ApiProperty({ example: 4 })
  count: number;

  @ApiProperty({ example: true })
  reactedByMe: boolean;

  @ApiProperty({
    type: [MessageReactionActorResponse],
    description: 'Danh sach user da tha emoji nay de FE render tooltip/popover',
  })
  reactors: MessageReactionActorResponse[];
}
