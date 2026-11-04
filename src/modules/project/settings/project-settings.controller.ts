import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { GetUser } from '@common/decorators/auth/get-user.decorator';
import {
  GetOrgId,
  ORGANIZATION_HEADERS,
} from 'src/decorators/organization/get-org-id.decorator';
import { ApiOperationAuto } from '@common/decorators/swagger/api-operation.decorator';
import { ApiResponseDto } from '@common/dto/api-response.dto';
import { ProjectSettingsService } from './project-settings.service';
import { UpsertProjectSettingsRequest } from './dto/request/upsert-project-settings.request';
import { ProjectSettingsResponse } from './dto/response/project-settings.response';

@ApiTags('Project Settings')
@ApiBearerAuth('Authorization')
@ApiHeader({
  name: ORGANIZATION_HEADERS.X_ORGANIZATION_ID,
  description: 'Organization ID (required)',
  required: true,
})
@Controller({ path: 'projects/:projectId/settings', version: '1' })
export class ProjectSettingsController {
  constructor(
    private readonly projectSettingsService: ProjectSettingsService,
  ) {}

  @Get()
  @ApiOperationAuto('Get project settings (merged with org defaults)')
  async getSettings(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
  ): Promise<ApiResponseDto<ProjectSettingsResponse>> {
    const data = await this.projectSettingsService.getSettings(
      projectId,
      orgId,
      userId,
    );
    return new ApiResponseDto(
      200,
      'Fetched project settings successfully',
      data,
    );
  }

  @Put()
  @ApiOperationAuto('Update project settings (PM or Org Admin only)')
  async upsertSettings(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Body() dto: UpsertProjectSettingsRequest,
  ): Promise<ApiResponseDto<ProjectSettingsResponse>> {
    const data = await this.projectSettingsService.upsertSettings(
      projectId,
      orgId,
      userId,
      dto,
    );
    return new ApiResponseDto(
      200,
      'Updated project settings successfully',
      data,
    );
  }

  @Delete()
  @ApiOperationAuto(
    'Reset project settings to org defaults (PM or Org Admin only)',
  )
  async resetSettings(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
  ): Promise<ApiResponseDto<void>> {
    await this.projectSettingsService.resetSettings(projectId, orgId, userId);
    return new ApiResponseDto(
      200,
      'Project settings reset to org defaults successfully',
    );
  }
}
