import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MemberTaskProgressResponse {
  @ApiProperty({ example: '4b6f223b-2e53-4698-aa8e-6570f6cb2f60' })
  userId: string;

  @ApiPropertyOptional({ example: 'Nguyen Van A' })
  fullName?: string;

  @ApiPropertyOptional({ example: 'member@iccp.com' })
  email?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar/a.png' })
  avatar?: string;

  @ApiPropertyOptional({ example: 'uuid-of-role' })
  roleId?: string;

  @ApiPropertyOptional({ example: 'project_manager' })
  roleName?: string;

  @ApiPropertyOptional({ example: ['uuid-of-role'], type: [String] })
  roleIds?: string[];

  @ApiPropertyOptional({ example: ['project_manager'], type: [String] })
  roleNames?: string[];

  @ApiProperty({ example: 12 })
  totalAssignedTasks: number;

  @ApiProperty({ example: 7 })
  doneTasks: number;

  @ApiProperty({ example: 5 })
  openTasks: number;

  @ApiProperty({ example: 5 })
  doneOnTimeTasks: number;

  @ApiProperty({ example: 2 })
  doneLateTasks: number;

  @ApiProperty({ example: 1 })
  overdueOpenTasks: number;

  @ApiProperty({ example: 2 })
  dueSoonTasks: number;

  @ApiProperty({ example: 58 })
  completionRate: number;

  @ApiProperty({ example: 71 })
  onTimeRate: number;

  @ApiProperty({ example: 62 })
  progressScore: number;
}
