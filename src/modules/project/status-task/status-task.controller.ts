import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
import { StatusTaskService } from './status-task.service';
import { CreateStatusTaskRequest } from './dto/request/create-status-task.request';
import { UpdateStatusTaskRequest } from './dto/request/update-status-task.request';
import { StatusTaskResponse } from './dto/response/status-task.response';
import { DeleteStatusTaskRequest } from './dto/request/delete-status-task.request';

@ApiTags('Status Task')
@ApiBearerAuth('Authorization')
@ApiHeader({
  name: ORGANIZATION_HEADERS.X_ORGANIZATION_ID,
  description: 'Organization ID for tenant scoping',
  required: true,
})
@Controller({ path: 'projects/:projectId/statuses', version: '1' })
export class StatusTaskController {
  constructor(private readonly statusTaskService: StatusTaskService) {}

  @Get()
  @ApiOperationAuto(
    'Lấy danh sách trạng thái của dự án',
    'Lấy tất cả trạng thái đang hoạt động trong dự án',
  )
  async getStatuses(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<ApiResponseDto<StatusTaskResponse[]>> {
    const pageValue = Number(page);
    const limitValue = Number(limit);
    const data = await this.statusTaskService.getStatuses(
      projectId,
      orgId,
      userId,
      Number.isFinite(pageValue) ? pageValue : undefined,
      Number.isFinite(limitValue) ? limitValue : undefined,
    );
    return new ApiResponseDto(200, 'Statuses fetched successfully', data);
  }

  @Post()
  @ApiOperationAuto(
    'Tạo trạng thái',
    'Chỉ PM/owner mới có thể tạo trạng thái trong dự án',
  )
  async createStatus(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Body() dto: CreateStatusTaskRequest,
  ): Promise<ApiResponseDto<StatusTaskResponse>> {
    const data = await this.statusTaskService.createStatus(
      projectId,
      orgId,
      userId,
      dto,
    );
    return new ApiResponseDto(201, 'Status created successfully', data);
  }

  @Patch(':statusId')
  @ApiOperationAuto(
    'Cập nhật trạng thái',
    'Chỉ PM/owner mới có thể cập nhật trạng thái trong dự án',
  )
  async updateStatus(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('statusId', ParseUUIDPipe) statusId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Body() dto: UpdateStatusTaskRequest,
  ): Promise<ApiResponseDto<StatusTaskResponse>> {
    const data = await this.statusTaskService.updateStatus(
      projectId,
      statusId,
      orgId,
      userId,
      dto,
    );
    return new ApiResponseDto(200, 'Status updated successfully', data);
  }

  @Delete(':statusId')
  @ApiOperationAuto(
    'Xóa trạng thái',
    'Xóa mềm trạng thái và chuyển task sang trạng thái gần nhất hoặc moveToStatusId',
  )
  async deleteStatus(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('statusId', ParseUUIDPipe) statusId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Body() dto?: DeleteStatusTaskRequest,
  ): Promise<ApiResponseDto<void>> {
    await this.statusTaskService.deleteStatus(
      projectId,
      statusId,
      orgId,
      userId,
      dto,
    );
    return new ApiResponseDto(200, 'Status deleted successfully');
  }
}
