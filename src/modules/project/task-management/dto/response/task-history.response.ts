import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskHistoryAction } from '../../entities/task-history.entity';

export class TaskHistoryResponse {
  @ApiProperty({ example: 'a29a10f9-5d85-46e6-a4c6-a234f2e4e6ab' })
  id: string;

  @ApiProperty({ example: 'b56bc271-dd9c-47ea-95d6-26ddf2f64fca' })
  taskId: string;

  @ApiProperty({ enum: TaskHistoryAction, example: TaskHistoryAction.STATUS_CHANGE })
  action: TaskHistoryAction;

  @ApiProperty({ example: '4b6f223b-2e53-4698-aa8e-6570f6cb2f60' })
  actorId: string;

  @ApiProperty({ example: 'Demo Manager' })
  actorDisplayName: string;

  @ApiPropertyOptional({ example: 'todo' })
  fromValue?: string;

  @ApiPropertyOptional({ example: 'in_progress' })
  toValue?: string;

  @ApiPropertyOptional({ example: { commentId: 'uuid' } })
  metadata?: Record<string, unknown>;

  @ApiProperty({ example: '2026-03-04T10:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '5 minutes ago' })
  relativeTime: string;
}
