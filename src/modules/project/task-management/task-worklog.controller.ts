import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { ApiResponseDto } from '@common/dto/api-response.dto';
import { GetUser } from '@common/decorators/auth/get-user.decorator';
import { ApiOperationAuto } from '@decorators/swagger/api-operation.decorator';
import {
  GetOrgId,
  ORGANIZATION_HEADERS,
} from 'src/decorators/organization/get-org-id.decorator';
import { CreateTaskWorklogRequest } from './dto/request/create-task-worklog.request';
import { UpdateTaskWorklogRequest } from './dto/request/update-task-worklog.request';
import { QueryTaskWorklogsRequest } from './dto/request/query-task-worklogs.request';
import { TaskWorklogResponse } from './dto/response/task-worklog.response';
import { TaskWorklogService } from './task-worklog.service';

@ApiTags('Task Worklogs')
@ApiBearerAuth('Authorization')
@ApiHeader({
  name: ORGANIZATION_HEADERS.X_ORGANIZATION_ID,
  description: 'Organization ID for tenant scoping',
  required: true,
})
@Controller({
  path: 'projects/:projectId/tasks/:taskId/worklogs',
  version: '1',
})
export class TaskWorklogController {
  constructor(private readonly taskWorklogService: TaskWorklogService) {}

  @Post()
  @ApiOperationAuto(
    'Log task work',
    'Create a worklog entry for a task or subtask. The logged user must be the assignee of that task/subtask. Managers/users with log-time permission can log on behalf of the assigned member.',
  )
  async createTaskWorklog(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Body() dto: CreateTaskWorklogRequest,
  ): Promise<ApiResponseDto<TaskWorklogResponse>> {
    const data = await this.taskWorklogService.createTaskWorklog(
      projectId,
      taskId,
      orgId,
      userId,
      dto,
    );
    return new ApiResponseDto(201, 'Task worklog created successfully', data);
  }

  @Get()
  @ApiOperationAuto(
    'List task worklogs',
    'Fetch worklog entries for a task or subtask. Direct entries belong to the selected task/subtask; parent task actuals also include rolled-up subtask time.',
  )
  async getTaskWorklogs(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Query() query: QueryTaskWorklogsRequest,
  ): Promise<ApiResponseDto<TaskWorklogResponse[]>> {
    const data = await this.taskWorklogService.getTaskWorklogs(
      projectId,
      taskId,
      orgId,
      userId,
      query,
    );
    return new ApiResponseDto(200, 'Task worklogs fetched successfully', data);
  }

  @Put(':worklogId')
  @ApiOperationAuto(
    'Update task worklog',
    'Update an existing task worklog. Owners can edit their own entry, users with log-time permission can manage entries, but the worklog user must remain the task/subtask assignee.',
  )
  async updateTaskWorklog(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('worklogId', ParseUUIDPipe) worklogId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Body() dto: UpdateTaskWorklogRequest,
  ): Promise<ApiResponseDto<TaskWorklogResponse>> {
    const data = await this.taskWorklogService.updateTaskWorklog(
      projectId,
      taskId,
      worklogId,
      orgId,
      userId,
      dto,
    );
    return new ApiResponseDto(200, 'Task worklog updated successfully', data);
  }

  @Delete(':worklogId')
  @ApiOperationAuto(
    'Delete task worklog',
    'Delete a task worklog entry. Owners can remove their own entry, users with log-time permission can manage any entry in the project.',
  )
  async deleteTaskWorklog(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('worklogId', ParseUUIDPipe) worklogId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
  ): Promise<ApiResponseDto<void>> {
    await this.taskWorklogService.deleteTaskWorklog(
      projectId,
      taskId,
      worklogId,
      orgId,
      userId,
    );
    return new ApiResponseDto(200, 'Task worklog deleted successfully');
  }
}
