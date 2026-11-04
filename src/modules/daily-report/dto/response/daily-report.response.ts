import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DailyReportStatus } from '../../entities/daily-report.entity';
import { DailyReportCommentResponse } from './daily-report-comment.response';
import { DailyReportItemResponse } from './daily-report-item.response';

export class DailyReportResponse {
  @ApiProperty({ example: '45df565a-3367-4bd4-9f80-a0344d310807' })
  id: string;

  @ApiProperty({ example: '18d17aea-7e8c-4a58-8e56-74c2949dcdd6' })
  organizationId: string;

  @ApiProperty({ example: 'f8f1e2ff-7f9d-4ce2-9301-a497f376facd' })
  projectId: string;

  @ApiPropertyOptional({ example: 'Project Phoenix' })
  projectName?: string;

  @ApiProperty({ example: '4b6f223b-2e53-4698-aa8e-6570f6cb2f60' })
  userId: string;

  @ApiPropertyOptional({ example: 'Nguyen Van A' })
  userDisplayName?: string;

  @ApiPropertyOptional({ example: 'member@example.com' })
  userEmail?: string;

  @ApiProperty({ example: '2026-04-18' })
  reportDate: string;

  @ApiProperty({ enum: DailyReportStatus, example: DailyReportStatus.DRAFT })
  status: DailyReportStatus;

  @ApiPropertyOptional({
    example: 'Completed backend draft generation and worklog CRUD.',
  })
  summary?: string | null;

  @ApiPropertyOptional({
    example: 'Still waiting for frontend payload contract.',
  })
  blockers?: string | null;

  @ApiPropertyOptional({
    example: 'Finalize submit flow and connect manager view.',
  })
  planTomorrow?: string | null;

  @ApiProperty({ example: 180 })
  totalLoggedMinutes: number;

  @ApiPropertyOptional({ example: '2026-04-18T12:00:00.000Z' })
  submittedAt?: Date | null;

  @ApiProperty({ example: false })
  isSeen: boolean;

  @ApiPropertyOptional({ example: '4b6f223b-2e53-4698-aa8e-6570f6cb2f60' })
  seenByUserId?: string | null;

  @ApiPropertyOptional({ example: 'Project Manager' })
  seenByDisplayName?: string | null;

  @ApiPropertyOptional({ example: 'pm@example.com' })
  seenByEmail?: string | null;

  @ApiPropertyOptional({ example: '2026-04-18T13:00:00.000Z' })
  seenAt?: Date | null;

  @ApiProperty({ type: () => [DailyReportItemResponse] })
  items: DailyReportItemResponse[];

  @ApiProperty({ type: () => [DailyReportCommentResponse] })
  comments: DailyReportCommentResponse[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
