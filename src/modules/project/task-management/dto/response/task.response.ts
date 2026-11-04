import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPriority } from '../../entities/task.entity';

export enum TaskDueState {
  NO_DUE_DATE = 'no_due_date',
  ON_TRACK = 'on_track',
  DUE_SOON = 'due_soon',
  OVERDUE = 'overdue',
  DONE_ON_TIME = 'done_on_time',
  DONE_LATE = 'done_late',
}

export class TaskResponse {
  @ApiProperty({ example: 'b56bc271-dd9c-47ea-95d6-26ddf2f64fca' })
  id: string;

  @ApiProperty({ example: 'f8f1e2ff-7f9d-4ce2-9301-a497f376facd' })
  projectId: string;

  @ApiProperty({ example: '18d17aea-7e8c-4a58-8e56-74c2949dcdd6' })
  organizationId: string;

  @ApiProperty({ example: 'Design API contract' })
  title: string;

  @ApiPropertyOptional({ example: 'ICCP-23' })
  slug?: string;

  @ApiPropertyOptional({ example: 'f51ebec9-66cd-4c4e-8408-9427c845f31b' })
  parentTaskId?: string;

  @ApiPropertyOptional({ example: 'Define request/response payloads for project API' })
  description?: string;

  @ApiProperty({ example: 'To Do' })
  status: string;

  @ApiPropertyOptional({ example: '8f0bc90e-9d5f-4c66-9e10-8ae567f2d8ea' })
  statusId?: string;

  @ApiProperty({ enum: TaskPriority, example: TaskPriority.MEDIUM })
  priority: TaskPriority;

  @ApiPropertyOptional({ example: '4b6f223b-2e53-4698-aa8e-6570f6cb2f60' })
  assignedTo?: string;

  @ApiProperty({ example: '4b6f223b-2e53-4698-aa8e-6570f6cb2f60' })
  createdBy: string;

  @ApiPropertyOptional({ example: '2026-03-15T08:00:00.000Z' })
  dueDate?: Date;

  @ApiPropertyOptional({ example: '2026-03-10T08:00:00.000Z' })
  startedAt?: Date;

  @ApiPropertyOptional({ example: '2026-03-12T18:00:00.000Z' })
  completedAt?: Date;

  @ApiPropertyOptional({ example: '2026-03-10T08:00:00.000Z' })
  actualStart?: Date;

  @ApiPropertyOptional({ example: '2026-03-12T18:00:00.000Z' })
  actualEnd?: Date;

  @ApiPropertyOptional({ example: 3, description: 'Story points' })
  estimatedPoint?: number;

  @ApiPropertyOptional({ example: 4.5, description: 'Estimated hours' })
  estimatedHours?: number;

  @ApiPropertyOptional({ example: 135, description: 'Actual logged time in minutes' })
  actualLoggedMinutes?: number;

  @ApiProperty({
    enum: TaskDueState,
    example: TaskDueState.ON_TRACK,
    description:
      'no_due_date | on_track | due_soon | overdue | done_on_time | done_late',
  })
  dueState: TaskDueState;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
