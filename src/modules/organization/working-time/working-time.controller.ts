import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import {
  GetOrgId,
  ORGANIZATION_HEADERS,
} from 'src/decorators/organization/get-org-id.decorator';
import { RequirePermission } from '@decorators/role/require-permission.decorator';
import { PERMISSIONS } from '@modules/rbac/constant/permission.constant';
import { ApiOperationAuto } from '@common/decorators/swagger/api-operation.decorator';
import { ApiResponseDto } from '@common/dto/api-response.dto';
import { WorkingTimeService } from './working-time.service';
import { UpsertWorkingTimeRequest } from './dto/request/upsert-working-time.request';
import { CreateHolidayRequest } from './dto/request/create-holiday.request';
import { WorkingTimeConfigResponse } from './dto/response/working-time-config.response';
import { HolidayResponse } from './dto/response/holiday.response';

@ApiTags('Org Config — Working Time')
@ApiBearerAuth('Authorization')
@ApiHeader({
  name: ORGANIZATION_HEADERS.X_ORGANIZATION_ID,
  description: 'Organization ID (required)',
  required: true,
})
@Controller({ path: 'org-config/working-time', version: '1' })
export class WorkingTimeController {
  constructor(private readonly workingTimeService: WorkingTimeService) {}

  @Get()
  @RequirePermission(PERMISSIONS.ORG_CONFIG.WORKING_TIME.VIEW)
  @ApiOperationAuto('Get org working time config')
  async getConfig(
    @GetOrgId() orgId: string,
  ): Promise<ApiResponseDto<WorkingTimeConfigResponse>> {
    const data = await this.workingTimeService.getConfig(orgId);
    return new ApiResponseDto(
      200,
      'Fetched working time config successfully',
      data,
    );
  }

  @Put()
  @RequirePermission(PERMISSIONS.ORG_CONFIG.WORKING_TIME.MANAGE)
  @ApiOperationAuto('Update org working time config (Org Admin only)')
  async upsertConfig(
    @GetOrgId() orgId: string,
    @Body() dto: UpsertWorkingTimeRequest,
  ): Promise<ApiResponseDto<WorkingTimeConfigResponse>> {
    const data = await this.workingTimeService.upsertConfig(orgId, dto);
    return new ApiResponseDto(
      200,
      'Updated working time config successfully',
      data,
    );
  }

  @Get('holidays')
  @RequirePermission(PERMISSIONS.ORG_CONFIG.WORKING_TIME.VIEW)
  @ApiOperationAuto('List org holidays')
  async listHolidays(
    @GetOrgId() orgId: string,
  ): Promise<ApiResponseDto<HolidayResponse[]>> {
    const data = await this.workingTimeService.listHolidays(orgId);
    return new ApiResponseDto(200, 'Fetched holidays successfully', data);
  }

  @Post('holidays')
  @RequirePermission(PERMISSIONS.ORG_CONFIG.WORKING_TIME.MANAGE)
  @ApiOperationAuto('Add a holiday (Org Admin only)')
  async addHoliday(
    @GetOrgId() orgId: string,
    @Body() dto: CreateHolidayRequest,
  ): Promise<ApiResponseDto<HolidayResponse>> {
    const data = await this.workingTimeService.addHoliday(orgId, dto);
    return new ApiResponseDto(201, 'Holiday added successfully', data);
  }

  @Delete('holidays/:id')
  @RequirePermission(PERMISSIONS.ORG_CONFIG.WORKING_TIME.MANAGE)
  @ApiOperationAuto('Delete a holiday (Org Admin only)')
  async deleteHoliday(
    @GetOrgId() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<void>> {
    await this.workingTimeService.deleteHoliday(orgId, id);
    return new ApiResponseDto(200, 'Holiday deleted successfully');
  }
}
