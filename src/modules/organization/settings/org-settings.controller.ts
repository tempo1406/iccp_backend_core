import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import {
  GetOrgId,
  ORGANIZATION_HEADERS,
} from 'src/decorators/organization/get-org-id.decorator';
import { RequirePermission } from '@decorators/role/require-permission.decorator';
import { PERMISSIONS } from '@modules/rbac/constant/permission.constant';
import { ApiOperationAuto } from '@common/decorators/swagger/api-operation.decorator';
import { ApiResponseDto } from '@common/dto/api-response.dto';
import { OrgSettingsService } from './org-settings.service';
import { UpsertOrgSettingsRequest } from './dto/request/upsert-org-settings.request';
import { OrgSettingsResponse } from './dto/response/org-settings.response';

@ApiTags('Org Config — Settings')
@ApiBearerAuth('Authorization')
@ApiHeader({
  name: ORGANIZATION_HEADERS.X_ORGANIZATION_ID,
  description: 'Organization ID (required)',
  required: true,
})
@Controller({ path: 'org-config/settings', version: '1' })
export class OrgSettingsController {
  constructor(private readonly orgSettingsService: OrgSettingsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.ORG_CONFIG.SETTINGS.VIEW)
  @ApiOperationAuto('Get org settings')
  async getSettings(
    @GetOrgId() orgId: string,
  ): Promise<ApiResponseDto<OrgSettingsResponse>> {
    const data = await this.orgSettingsService.getSettings(orgId);
    return new ApiResponseDto(200, 'Fetched org settings successfully', data);
  }

  @Put()
  @RequirePermission(PERMISSIONS.ORG_CONFIG.SETTINGS.MANAGE)
  @ApiOperationAuto('Update org settings (Org Admin only)')
  async upsertSettings(
    @GetOrgId() orgId: string,
    @Body() dto: UpsertOrgSettingsRequest,
  ): Promise<ApiResponseDto<OrgSettingsResponse>> {
    const data = await this.orgSettingsService.upsertSettings(orgId, dto);
    return new ApiResponseDto(200, 'Updated org settings successfully', data);
  }
}
