import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskWorklogSource } from '../../entities/task-worklog.entity';

export class TaskWorklogResponse {
  @ApiProperty({ example: '70af8ea3-19d4-466a-a4d3-04d181038833' })
  id: string;

  @ApiProperty({ example: 'f8f1e2ff-7f9d-4ce2-9301-a497f376facd' })
  projectId: string;

  @ApiProperty({ example: '18d17aea-7e8c-4a58-8e56-74c2949dcdd6' })
  organizationId: string;

  @ApiProperty({ example: 'b56bc271-dd9c-47ea-95d6-26ddf2f64fca' })
  taskId: string;

  @ApiPropertyOptional({ example: 'Design API contract' })
  taskTitle?: string;

  @ApiPropertyOptional({ example: 'ICCP-23' })
  taskSlug?: string;

  @ApiProperty({ example: '4b6f223b-2e53-4698-aa8e-6570f6cb2f60' })
  userId: string;

  @ApiPropertyOptional({ example: 'Nguyen Van A' })
  userDisplayName?: string;

  @ApiPropertyOptional({ example: 'member@example.com' })
  userEmail?: string;

  @ApiProperty({ example: '2026-04-18' })
  workDate: string;

  @ApiPropertyOptional({ example: '2026-04-18T01:00:00.000Z' })
  startedAt?: Date | null;

  @ApiPropertyOptional({ example: '2026-04-18T02:30:00.000Z' })
  endedAt?: Date | null;

  @ApiProperty({ example: 90 })
  durationMinutes: number;

  @ApiPropertyOptional({ example: 'Implemented daily report draft generation' })
  description?: string | null;

  @ApiPropertyOptional({ example: 60 })
  progressPercent?: number | null;

  @ApiProperty({ example: false })
  isBlocker: boolean;

  @ApiProperty({ enum: TaskWorklogSource, example: TaskWorklogSource.MANUAL })
  source: TaskWorklogSource;

  @ApiPropertyOptional({ example: '45df565a-3367-4bd4-9f80-a0344d310807' })
  reportedDailyReportId?: string | null;

  @ApiProperty({ example: false })
  isSubmitted: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
