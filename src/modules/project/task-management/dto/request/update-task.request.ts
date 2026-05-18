import { PartialType } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';
import { CreateTaskRequest } from './create-task.request';

export class UpdateTaskRequest extends PartialType(CreateTaskRequest) {
  @IsOptional()
  @IsDateString()
  startedAt?: Date;

  @IsOptional()
  @IsDateString()
  completedAt?: Date;
}
