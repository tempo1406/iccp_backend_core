import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TaskPriority } from '../../entities/task.entity';

export class CreateTaskRequest {
  @ApiProperty({ example: 'Design API contract' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title: string;

  @ApiPropertyOptional({ example: 'Define request/response payloads for project API' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: TaskPriority, example: TaskPriority.MEDIUM })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({
    example: '8f0bc90e-9d5f-4c66-9e10-8ae567f2d8ea',
    description: 'Status-task id in this project',
  })
  @IsOptional()
  @IsUUID()
  statusId?: string;

  @ApiPropertyOptional({
    example: 'f51ebec9-66cd-4c4e-8408-9427c845f31b',
    description: 'Parent task id (for subtask)',
  })
  @IsOptional()
  @IsUUID()
  parentTaskId?: string;

  @ApiPropertyOptional({ example: '4b6f223b-2e53-4698-aa8e-6570f6cb2f60' })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiPropertyOptional({ example: '2026-03-15T08:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  dueDate?: Date;

  @ApiPropertyOptional({ example: 3, description: 'Story points (PM only)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  estimatedPoint?: number;

  @ApiPropertyOptional({ example: 4.5, description: 'Estimated hours (PM only)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(999.99)
  estimatedHours?: number;

  @ApiPropertyOptional({ example: '2026-03-10T08:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  actualStart?: Date;

  @ApiPropertyOptional({ example: '2026-03-12T18:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  actualEnd?: Date;
}
