import { PartialType } from '@nestjs/swagger';
import { CreateTaskWorklogRequest } from './create-task-worklog.request';

export class UpdateTaskWorklogRequest extends PartialType(CreateTaskWorklogRequest) {}
