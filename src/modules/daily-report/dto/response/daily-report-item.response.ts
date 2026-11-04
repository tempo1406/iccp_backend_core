import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DailyReportItemType } from '../../entities/daily-report-item.entity';

export class DailyReportItemResponse {
  @ApiProperty({ example: '64f0b72f-c216-4018-9f55-2be4e063cf25' })
  id: string;

  @ApiProperty({ enum: DailyReportItemType, example: DailyReportItemType.WORKLOG })
  type: DailyReportItemType;

  @ApiPropertyOptional({ example: '70af8ea3-19d4-466a-a4d3-04d181038833' })
  worklogId?: string | null;

  @ApiPropertyOptional({ example: 'f8f1e2ff-7f9d-4ce2-9301-a497f376facd' })
  projectId?: string | null;

  @ApiPropertyOptional({ example: 'Project Phoenix' })
  projectName?: string | null;

  @ApiPropertyOptional({ example: 'b56bc271-dd9c-47ea-95d6-26ddf2f64fca' })
  taskId?: string | null;

  @ApiPropertyOptional({ example: 'Design API contract' })
  taskTitle?: string | null;

  @ApiPropertyOptional({ example: 'ICCP-23' })
  taskSlug?: string | null;

  @ApiPropertyOptional({ example: 'Implemented daily report draft generation' })
  content?: string | null;

  @ApiProperty({ example: '2026-04-18' })
  workDate: string;

  @ApiPropertyOptional({ example: '2026-04-18T01:00:00.000Z' })
  startedAt?: Date | null;

  @ApiPropertyOptional({ example: '2026-04-18T02:30:00.000Z' })
  endedAt?: Date | null;

  @ApiProperty({ example: 90 })
  durationMinutes: number;

  @ApiPropertyOptional({ example: 60 })
  progressPercent?: number | null;

  @ApiProperty({ example: false })
  isBlocker: boolean;

  @ApiProperty({ example: 1 })
  displayOrder: number;
}
