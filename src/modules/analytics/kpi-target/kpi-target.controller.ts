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
import { GetUser } from '@common/decorators/auth/get-user.decorator';
import {
  GetOrgId,
  ORGANIZATION_HEADERS,
} from 'src/decorators/organization/get-org-id.decorator';
import { ApiOperationAuto } from '@common/decorators/swagger/api-operation.decorator';
import { ApiResponseDto } from '@common/dto/api-response.dto';
import { KpiTargetService } from './kpi-target.service';
import {
  CloneKpiTargetRequest,
  UpdateKpiTargetRequest,
  UpsertKpiTargetRequest,
} from './dto/request/upsert-kpi-target.request';
import { ListKpiTargetsRequest } from './dto/request/list-kpi-targets.request';
import { KpiTargetResponse } from './dto/response/kpi-target.response';

@ApiTags('Analytics - KPI Targets')
@ApiBearerAuth('Authorization')
@ApiHeader({
  name: ORGANIZATION_HEADERS.X_ORGANIZATION_ID,
  description: 'Organization ID (required)',
  required: true,
})
@Controller({ path: 'kpi-targets', version: '1' })
export class KpiTargetController {
  constructor(private readonly service: KpiTargetService) {}

  @Post()
  @ApiOperationAuto('Gan KPI target da scope cho user/role/project role')
  async bulkUpsert(
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Body() dto: UpsertKpiTargetRequest,
  ): Promise<ApiResponseDto<KpiTargetResponse[]>> {
    const data = await this.service.bulkUpsert(orgId, userId, dto);
    return new ApiResponseDto(201, 'Assigned KPI targets successfully', data);
  }

  @Post('clone')
  @ApiOperationAuto('Clone KPI target tu ky truoc sang ky moi')
  async clone(
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Body() dto: CloneKpiTargetRequest,
  ): Promise<ApiResponseDto<KpiTargetResponse[]>> {
    const data = await this.service.clone(orgId, userId, dto);
    return new ApiResponseDto(201, 'Cloned KPI targets successfully', data);
  }

  @Get()
  @ApiOperationAuto('Danh sach KPI target theo filter')
  async list(
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Query() query: ListKpiTargetsRequest,
  ): Promise<ApiResponseDto<KpiTargetResponse[]>> {
    const data = await this.service.list(orgId, userId, query);
    return new ApiResponseDto(200, 'Fetched KPI targets successfully', data);
  }

  @Get('me')
  @ApiOperationAuto('Danh sach KPI target effective dang ap dung cho toi')
  async listMine(
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
  ): Promise<ApiResponseDto<KpiTargetResponse[]>> {
    const data = await this.service.listMine(orgId, userId);
    return new ApiResponseDto(200, 'Fetched my KPI targets successfully', data);
  }

  @Get(':id')
  @ApiOperationAuto('Xem chi tiet KPI target')
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
  ): Promise<ApiResponseDto<KpiTargetResponse>> {
    const data = await this.service.getById(id, orgId, userId);
    return new ApiResponseDto(200, 'Fetched KPI target successfully', data);
  }

  @Patch(':id')
  @ApiOperationAuto('Cap nhat KPI target')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Body() dto: UpdateKpiTargetRequest,
  ): Promise<ApiResponseDto<KpiTargetResponse>> {
    const data = await this.service.update(id, orgId, userId, dto);
    return new ApiResponseDto(200, 'Updated KPI target successfully', data);
  }

  @Delete(':id')
  @ApiOperationAuto('Xoa mem KPI target')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
  ): Promise<ApiResponseDto<void>> {
    await this.service.remove(id, orgId, userId);
    return new ApiResponseDto(200, 'Deleted KPI target successfully');
  }
}
