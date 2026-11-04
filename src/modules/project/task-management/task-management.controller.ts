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
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiHeader,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ApiResponseDto } from '@common/dto/api-response.dto';
import { GetUser } from '@common/decorators/auth/get-user.decorator';
import { ApiOperationAuto } from '@decorators/swagger/api-operation.decorator';
import {
  GetOrgId,
  ORGANIZATION_HEADERS,
} from 'src/decorators/organization/get-org-id.decorator';
import { TaskManagementService } from './task-management.service';
import { CreateTaskRequest } from './dto/request/create-task.request';
import { UpdateTaskRequest } from './dto/request/update-task.request';
import { UpdateTaskStatusRequest } from './dto/request/update-task-status.request';
import { TaskDueState, TaskResponse } from './dto/response/task.response';
import { AddTaskTagRequest } from './dto/request/add-task-tag.request';
import { AddTaskAttachmentRequest } from './dto/request/add-task-attachment.request';
import { CreateTaskCommentRequest } from './dto/request/create-task-comment.request';
import { AddCommentReactionRequest } from './dto/request/add-comment-reaction.request';
import { TaskTagResponse } from './dto/response/task-tag.response';
import { TaskAttachmentResponse } from './dto/response/task-attachment.response';
import { TaskCommentResponse } from './dto/response/task-comment.response';
import { TaskHistoryResponse } from './dto/response/task-history.response';
import { DuplicateTaskRequest } from './dto/request/duplicate-task.request';
import { MemberTaskProgressResponse } from './dto/response/member-task-progress.response';

@ApiTags('Task Management')
@ApiBearerAuth('Authorization')
@ApiHeader({
  name: ORGANIZATION_HEADERS.X_ORGANIZATION_ID,
  description: 'Organization ID for tenant scoping',
  required: true,
})
@Controller({ path: 'projects/:projectId/tasks', version: '1' })
export class TaskManagementController {
  constructor(private readonly taskService: TaskManagementService) {}

  @Post()
  @ApiOperationAuto(
    'Tạo task trong project',
    'Tạo task mới trong project. Assignee (nếu có) phải là thành viên đang hoạt động của organization và đã thuộc project.',
  )
  async createTask(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Body() dto: CreateTaskRequest,
  ): Promise<ApiResponseDto<TaskResponse>> {
    const data = await this.taskService.createTask(
      projectId,
      orgId,
      userId,
      dto,
    );
    return new ApiResponseDto(201, 'Task created successfully', data);
  }

  @Get()
  @ApiOperationAuto(
    'Lấy danh sách task',
    'Lấy danh sách task của project. Có thể lọc theo assignee và dueState để phục vụ board tiến độ/deadline.',
  )
  async getTasks(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('dueState') dueState?: TaskDueState,
  ): Promise<ApiResponseDto<TaskResponse[]>> {
    const pageValue = Number(page);
    const limitValue = Number(limit);
    const data = await this.taskService.getTasks(
      projectId,
      orgId,
      userId,
      Number.isFinite(pageValue) ? pageValue : undefined,
      Number.isFinite(limitValue) ? limitValue : undefined,
      assigneeId,
      dueState,
    );
    return new ApiResponseDto(200, 'Tasks fetched successfully', data);
  }

  @Get('member-progress')
  @ApiOperationAuto(
    'Lấy tiến độ theo thành viên',
    'Tổng hợp tiến độ theo từng thành viên dựa trên leaf-task được giao: done, overdue, due soon, on-time rate và progress score.',
  )
  async getMemberProgress(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Query('targetUserId') targetUserId?: string,
  ): Promise<ApiResponseDto<MemberTaskProgressResponse[]>> {
    const data = await this.taskService.getMemberTaskProgress(
      projectId,
      orgId,
      userId,
      targetUserId,
    );
    return new ApiResponseDto(
      200,
      'Member task progress fetched successfully',
      data,
    );
  }

  @Get(':taskId')
  @ApiOperationAuto(
    'Lấy chi tiết task',
    'Lấy chi tiết một task. Được phép khi user có quyền projects.tasks.view hoặc là người tạo/người được giao task.',
  )
  async getTaskById(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
  ): Promise<ApiResponseDto<TaskResponse>> {
    const data = await this.taskService.getTaskById(
      taskId,
      projectId,
      orgId,
      userId,
    );
    return new ApiResponseDto(200, 'Task fetched successfully', data);
  }

  @Put(':taskId')
  @ApiOperationAuto(
    'Cập nhật task',
    'Cập nhật thông tin task. Được phép khi user có quyền projects.tasks.update hoặc là người tạo/người được giao task. Nếu đổi assignedTo thì cần quyền projects.tasks.assign.',
  )
  async updateTask(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Body() dto: UpdateTaskRequest,
  ): Promise<ApiResponseDto<TaskResponse>> {
    const data = await this.taskService.updateTask(
      taskId,
      projectId,
      orgId,
      userId,
      dto,
    );
    return new ApiResponseDto(200, 'Task updated successfully', data);
  }

  @Post(':taskId/duplicate')
  @ApiOperationAuto(
    'Nhân bản task',
    'Tạo bản sao task để giao cho người khác khi task hiện tại chỉ có một assignee.',
  )
  async duplicateTask(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Body() dto: DuplicateTaskRequest,
  ): Promise<ApiResponseDto<TaskResponse>> {
    const data = await this.taskService.duplicateTask(
      taskId,
      projectId,
      orgId,
      userId,
      dto,
    );
    return new ApiResponseDto(201, 'Task duplicated successfully', data);
  }

  @Put(':taskId/status')
  @ApiOperationAuto(
    'Cập nhật trạng thái task',
    'Cập nhật trạng thái của task theo statusId trong project. Được phép khi user có quyền projects.tasks.change_status hoặc chính là assignee của task.',
  )
  async updateTaskStatus(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Body() dto: UpdateTaskStatusRequest,
  ): Promise<ApiResponseDto<TaskResponse>> {
    const data = await this.taskService.updateTaskStatus(
      taskId,
      projectId,
      orgId,
      userId,
      dto,
    );
    return new ApiResponseDto(200, 'Task status updated successfully', data);
  }

  @Delete(':taskId')
  @ApiOperationAuto(
    'Xóa task',
    'Xóa một task trong project. User phải thuộc project và có quyền projects.tasks.delete.',
  )
  async deleteTask(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
  ): Promise<ApiResponseDto<void>> {
    await this.taskService.deleteTask(taskId, projectId, orgId, userId);
    return new ApiResponseDto(200, 'Task deleted successfully');
  }

  @Get(':taskId/history')
  @ApiOperationAuto(
    'Lấy lịch sử task',
    'Lấy log lịch sử của task (status, description, tag, attachment...). Trả thêm relative time theo phút/giờ/ngày.',
  )
  async getTaskHistory(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
  ): Promise<ApiResponseDto<TaskHistoryResponse[]>> {
    const data = await this.taskService.getTaskHistory(
      taskId,
      projectId,
      orgId,
      userId,
    );
    return new ApiResponseDto(200, 'Task history fetched successfully', data);
  }

  @Get(':taskId/tags')
  @ApiOperationAuto(
    'Lấy danh sách tag của task',
    'Lấy toàn bộ tag đã gắn với task.',
  )
  async getTaskTags(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
  ): Promise<ApiResponseDto<TaskTagResponse[]>> {
    const data = await this.taskService.getTaskTags(
      taskId,
      projectId,
      orgId,
      userId,
    );
    return new ApiResponseDto(200, 'Task tags fetched successfully', data);
  }

  @Post(':taskId/tags')
  @ApiOperationAuto(
    'Thêm tag cho task',
    'Thêm một tag vào task. Không cho phép trùng tag trong cùng task.',
  )
  async addTaskTag(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Body() dto: AddTaskTagRequest,
  ): Promise<ApiResponseDto<TaskTagResponse>> {
    const data = await this.taskService.addTaskTag(
      taskId,
      projectId,
      orgId,
      userId,
      dto,
    );
    return new ApiResponseDto(201, 'Task tag added successfully', data);
  }

  @Delete(':taskId/tags/:tagId')
  @ApiOperationAuto('Xóa tag khỏi task', 'Xóa một tag đã gắn vào task.')
  async removeTaskTag(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('tagId', ParseUUIDPipe) tagId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
  ): Promise<ApiResponseDto<void>> {
    await this.taskService.removeTaskTag(
      taskId,
      tagId,
      projectId,
      orgId,
      userId,
    );
    return new ApiResponseDto(200, 'Task tag removed successfully');
  }

  @Get(':taskId/attachments')
  @ApiOperationAuto(
    'Lấy danh sách tệp đính kèm của task',
    'Lấy toàn bộ attachment của task.',
  )
  async getTaskAttachments(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
  ): Promise<ApiResponseDto<TaskAttachmentResponse[]>> {
    const data = await this.taskService.getTaskAttachments(
      taskId,
      projectId,
      orgId,
      userId,
    );
    return new ApiResponseDto(
      200,
      'Task attachments fetched successfully',
      data,
    );
  }

  @Post(':taskId/attachments')
  @ApiOperationAuto(
    'Upload và đính kèm tệp cho task',
    'Upload file từ máy người dùng lên ImageKit và lưu attachment vào task chỉ trong một lần gọi API.',
  )
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        folder: {
          type: 'string',
          example: 'api-contracts',
        },
      },
    },
  })
  async addTaskAttachment(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder?: string,
  ): Promise<ApiResponseDto<TaskAttachmentResponse>> {
    const data = await this.taskService.uploadToImagekitAndAttach(
      taskId,
      projectId,
      orgId,
      userId,
      file,
      folder,
    );
    return new ApiResponseDto(
      201,
      'Task attachment uploaded to ImageKit and attached successfully',
      data,
    );
  }

  @Post(':taskId/attachments/web-link')
  @ApiOperationAuto(
    'Thêm web link cho task',
    'Thêm một liên kết web vào danh sách attachment của task.',
  )
  async addTaskAttachmentWebLink(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Body() dto: AddTaskAttachmentRequest,
  ): Promise<ApiResponseDto<TaskAttachmentResponse>> {
    const data = await this.taskService.addTaskWebLinkAttachment(
      taskId,
      projectId,
      orgId,
      userId,
      dto,
    );
    return new ApiResponseDto(
      201,
      'Task web link attachment added successfully',
      data,
    );
  }

  @Get(':taskId/attachments/:attachmentId/content')
  @ApiOperationAuto(
    'Xem nội dung attachment',
    'Nếu attachment là local file thì trả file; nếu là web link thì redirect đến URL gốc.',
  )
  async getTaskAttachmentContent(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Res() res: Response,
  ): Promise<void> {
    const content = await this.taskService.getTaskAttachmentContent(
      taskId,
      attachmentId,
      projectId,
      orgId,
      userId,
    );

    if (content.kind === 'web_link') {
      res.redirect(content.redirectUrl);
      return;
    }

    if (content.mimeType) {
      res.setHeader('Content-Type', content.mimeType);
    }
    res.sendFile(content.absolutePath);
  }

  @Delete(':taskId/attachments/:attachmentId')
  @ApiOperationAuto(
    'Xóa tệp đính kèm của task',
    'Xóa một attachment khỏi task.',
  )
  async removeTaskAttachment(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
  ): Promise<ApiResponseDto<void>> {
    await this.taskService.removeTaskAttachment(
      taskId,
      attachmentId,
      projectId,
      orgId,
      userId,
    );
    return new ApiResponseDto(200, 'Task attachment removed successfully');
  }

  @Get(':taskId/comments')
  @ApiOperationAuto(
    'Lấy danh sách comment của task',
    'Lấy toàn bộ comment của task kèm danh sách user được mention.',
  )
  async getTaskComments(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
  ): Promise<ApiResponseDto<TaskCommentResponse[]>> {
    const data = await this.taskService.getTaskComments(
      taskId,
      projectId,
      orgId,
      userId,
    );
    return new ApiResponseDto(200, 'Task comments fetched successfully', data);
  }

  @Post(':taskId/comments')
  @ApiOperationAuto(
    'Thêm comment cho task',
    'Manager và assignee đều có thể comment. Hệ thống lưu tác giả, vai trò, thời gian, nội dung và mention.',
  )
  async addTaskComment(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Body() dto: CreateTaskCommentRequest,
  ): Promise<ApiResponseDto<TaskCommentResponse>> {
    const data = await this.taskService.addTaskComment(
      taskId,
      projectId,
      orgId,
      userId,
      dto,
    );
    return new ApiResponseDto(201, 'Task comment added successfully', data);
  }

  @Post(':taskId/comments/:commentId/thumbs-up')
  @ApiOperationAuto(
    'Bật/tắt thumbs up cho comment',
    'Thêm hoặc bỏ thumbs up của user hiện tại trên comment.',
  )
  async toggleCommentThumbsUp(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
  ): Promise<ApiResponseDto<TaskCommentResponse>> {
    const data = await this.taskService.toggleCommentThumbsUp(
      taskId,
      commentId,
      projectId,
      orgId,
      userId,
    );
    return new ApiResponseDto(
      200,
      'Comment thumbs up toggled successfully',
      data,
    );
  }

  @Post(':taskId/comments/:commentId/reactions')
  @ApiOperationAuto(
    'Thêm reaction cho comment',
    'Thêm reaction bất kỳ (heart, laugh, fire...) cho comment. Idempotent theo user + reaction.',
  )
  async addCommentReaction(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Body() dto: AddCommentReactionRequest,
  ): Promise<ApiResponseDto<TaskCommentResponse>> {
    const data = await this.taskService.addCommentReaction(
      taskId,
      commentId,
      projectId,
      orgId,
      userId,
      dto,
    );
    return new ApiResponseDto(200, 'Comment reaction added successfully', data);
  }

  @Delete(':taskId/comments/:commentId/reactions/:reaction')
  @ApiOperationAuto(
    'Xóa reaction của tôi trên comment',
    'Xóa reaction theo mã reaction ở path (ví dụ: heart, laugh, thumbs_up).',
  )
  async removeCommentReaction(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Param('reaction') reaction: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
  ): Promise<ApiResponseDto<TaskCommentResponse>> {
    const data = await this.taskService.removeCommentReaction(
      taskId,
      commentId,
      reaction,
      projectId,
      orgId,
      userId,
    );
    return new ApiResponseDto(
      200,
      'Comment reaction removed successfully',
      data,
    );
  }
}
