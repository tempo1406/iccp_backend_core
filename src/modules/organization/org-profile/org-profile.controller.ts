import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';

import { ApiResponseDto } from '@common/dto/api-response.dto';
import { GetUser } from '@common/decorators/auth/get-user.decorator';
import { RequirePermission } from '@common/decorators/role/require-permission.decorator';
import { ApiOperationAuto } from '@common/decorators/swagger/api-operation.decorator';
import { PermissionGuard } from '@guards/rbac-guard/permission.guard';
import { PERMISSIONS } from '@modules/rbac/constant/permission.constant';
import {
  GetOrgId,
  ORGANIZATION_HEADERS,
} from '../../../decorators/organization/get-org-id.decorator';

import { OrgProfileService } from './org-profile.service';
import { UpdateOrgGeneralRequest } from './dto/request/update-org-general.request';
import { UpdateOrgBrandingRequest } from './dto/request/update-org-branding.request';
import {
  OrgBrandingResponse,
  OrgBrandingUpdateResponse,
  OrgProfileResponse,
} from './dto/response/org-profile.response';

@ApiTags('Organization Profile')
@ApiBearerAuth('Authorization')
@ApiHeader({
  name: ORGANIZATION_HEADERS.X_ORGANIZATION_ID,
  required: true,
  description: 'Organization UUID',
})
@UseGuards(PermissionGuard)
@Controller({ path: 'organizations/profile', version: '1' })
export class OrgProfileController {
  constructor(private readonly orgProfileService: OrgProfileService) {}

  @Get('branding')
  @RequirePermission(PERMISSIONS.CHATBOT.RAG.USE)
  @ApiOperationAuto(
    'Lấy branding của tổ chức',
    'Trả về brandColor, botName, botPersona. Dành cho tất cả members trong org để render chatbot widget.',
  )
  async getBranding(
    @GetOrgId() orgId: string,
  ): Promise<ApiResponseDto<OrgBrandingResponse>> {
    const data = await this.orgProfileService.getBranding(orgId);
    return new ApiResponseDto(
      200,
      'Fetched organization branding successfully',
      data,
    );
  }

  @Get()
  @RequirePermission(PERMISSIONS.TENANT.ORGANIZATIONS.VIEW)
  @ApiOperationAuto(
    'Lấy profile tổ chức',
    'Trả về thông tin general và branding của tổ chức. Cần quyền tenant.organizations.view.',
  )
  async getProfile(
    @GetOrgId() orgId: string,
  ): Promise<ApiResponseDto<OrgProfileResponse>> {
    const data = await this.orgProfileService.getProfile(orgId);
    return new ApiResponseDto(
      200,
      'Fetched organization profile successfully',
      data,
    );
  }

  @Patch('general')
  @HttpCode(200)
  @RequirePermission(PERMISSIONS.TENANT.ORGANIZATIONS.UPDATE)
  @ApiOperationAuto(
    'Cập nhật thông tin chung',
    'Cập nhật name, description, logoUrl, website, contactEmail. Cần quyền tenant.organizations.update.',
  )
  async updateGeneral(
    @GetOrgId() orgId: string,
    @GetUser('sub') _userId: string,
    @Body() dto: UpdateOrgGeneralRequest,
  ): Promise<ApiResponseDto<OrgProfileResponse>> {
    const data = await this.orgProfileService.updateGeneral(orgId, dto);
    return new ApiResponseDto(
      200,
      'General profile updated successfully',
      data,
    );
  }

  @Patch('branding')
  @HttpCode(200)
  @RequirePermission(PERMISSIONS.TENANT.ORGANIZATIONS.MANAGE_SETTINGS)
  @ApiOperationAuto(
    'Cập nhật branding',
    'Cập nhật brandColor, botName, botPersona trong settings JSONB. Cần quyền tenant.organizations.manage_settings.',
  )
  async updateBranding(
    @GetOrgId() orgId: string,
    @GetUser('sub') _userId: string,
    @Body() dto: UpdateOrgBrandingRequest,
  ): Promise<ApiResponseDto<OrgBrandingUpdateResponse>> {
    const data = await this.orgProfileService.updateBranding(orgId, dto);
    return new ApiResponseDto(200, 'Branding updated successfully', data);
  }
}
