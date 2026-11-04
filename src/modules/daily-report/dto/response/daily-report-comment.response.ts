import { ApiProperty } from '@nestjs/swagger';

class DailyReportCommentAuthorResponse {
  @ApiProperty({ example: '4b6f223b-2e53-4698-aa8e-6570f6cb2f60' })
  id: string;

  @ApiProperty({ example: 'Nguyen Van A' })
  displayName: string;

  @ApiProperty({ example: 'pm@example.com' })
  email: string;

  @ApiProperty({ example: 'https://example.com/avatar.png', nullable: true })
  avatarUrl?: string | null;
}

export class DailyReportCommentResponse {
  @ApiProperty({ example: 'd4d5f9fd-2900-4f4b-ac67-c92fb7cb0467' })
  id: string;

  @ApiProperty({ example: '45df565a-3367-4bd4-9f80-a0344d310807' })
  dailyReportId: string;

  @ApiProperty({ type: () => DailyReportCommentAuthorResponse })
  author: DailyReportCommentAuthorResponse;

  @ApiProperty({
    example: 'Please clarify blocker number 2 and share the expected fix plan.',
  })
  content: string;

  @ApiProperty({ example: '2026-04-18T13:00:00.000Z' })
  createdAt: Date;
}
