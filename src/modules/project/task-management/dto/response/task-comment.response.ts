import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskCommentAuthorRole } from '../../entities/task-comment.entity';
import { TaskCommentReactionSummaryResponse } from './task-comment-reaction-summary.response';

export class TaskCommentResponse {
  @ApiProperty({ example: '6f3d0f0e-7b9f-4f50-9a67-209a6394df92' })
  id: string;

  @ApiProperty({ example: 'b56bc271-dd9c-47ea-95d6-26ddf2f64fca' })
  taskId: string;

  @ApiProperty({ example: '4b6f223b-2e53-4698-aa8e-6570f6cb2f60' })
  authorId: string;

  @ApiProperty({ enum: TaskCommentAuthorRole, example: TaskCommentAuthorRole.MANAGER })
  authorRole: TaskCommentAuthorRole;

  @ApiProperty({ example: '@member@iccp.com Vui long review API contract moi.' })
  content: string;

  @ApiPropertyOptional({ example: 'b6f1a4d0-2f6a-4f2c-bf6f-9d7d6b0ec6bb' })
  parentCommentId?: string;

  @ApiProperty({
    type: [String],
    example: ['4b6f223b-2e53-4698-aa8e-6570f6cb2f60'],
  })
  mentionUserIds: string[];

  @ApiProperty({
    type: [TaskCommentReactionSummaryResponse],
  })
  reactions: TaskCommentReactionSummaryResponse[];

  @ApiProperty({ example: 2 })
  thumbsUpCount: number;

  @ApiProperty({ example: true })
  hasThumbsUpByMe: boolean;

  @ApiProperty({ example: '2026-03-04T10:30:00.000Z' })
  createdAt: Date;
}
