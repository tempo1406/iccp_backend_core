import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class DuplicateTaskRequest {
  @ApiPropertyOptional({ example: '4b6f223b-2e53-4698-aa8e-6570f6cb2f60' })
  @IsOptional()
  @IsUUID()
  assigneeUserId?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Keep source parentTaskId for the duplicated task',
  })
  @IsOptional()
  @IsBoolean()
  keepParentTask?: boolean;

  @ApiPropertyOptional({
    example: 'f51ebec9-66cd-4c4e-8408-9427c845f31b',
    description: 'Override parentTaskId for duplicated task',
  })
  @IsOptional()
  @IsUUID()
  parentTaskId?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  copyTags?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  copyAttachments?: boolean;
}
