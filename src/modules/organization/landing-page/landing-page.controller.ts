import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiParam, ApiTags } from '@nestjs/swagger';

import { Public } from '@common/decorators/auth/public.decorator';
import { GetUser } from '@common/decorators/auth/get-user.decorator';
import { RequirePermission } from '@common/decorators/role/require-permission.decorator';
import { ApiOperationAuto } from '@common/decorators/swagger/api-operation.decorator';
import { ApiResponseDto } from '@common/dto/api-response.dto';
import { PermissionGuard } from '@guards/rbac-guard/permission.guard';
import { PERMISSIONS } from '@modules/rbac/constant/permission.constant';
import {
  GetOrgId,
  ORGANIZATION_HEADERS,
} from '../../../decorators/organization/get-org-id.decorator';

import { CreateTemplateRequest } from './dto/request/create-template.request';
import { SubmitLandingPageLeadRequest } from './dto/request/submit-landing-page-lead.request';
import { UpdateTemplateRequest } from './dto/request/update-template.request';
import { UpsertLandingPageDraftRequest } from './dto/request/upsert-landing-page-draft.request';
import { UpsertLandingPageRequest } from './dto/request/upsert-landing-page.request';
import { LandingPageDraftResponse } from './dto/response/landing-page-draft.response';
import { LandingPageLeadResponse } from './dto/response/landing-page-lead.response';
import { LandingPageResponse } from './dto/response/landing-page.response';
import { LandingPageTemplateResponse } from './dto/response/landing-page-template.response';
import { LandingPageService } from './landing-page.service';

const AUTH_HEADERS = {
  bearer: 'Authorization',
  orgHeader: {
    name: ORGANIZATION_HEADERS.X_ORGANIZATION_ID,
    required: true,
    description: 'Organization UUID',
  },
} as const;

@ApiTags('Organization Landing Page')
@Controller({ path: 'organizations', version: '1' })
export class LandingPageController {
  constructor(private readonly landingPageService: LandingPageService) {}

  @Public()
  @Get(':slug/landing-page')
  @ApiParam({ name: 'slug', description: 'Organization slug' })
  @ApiOperationAuto(
    'Get organization landing page (public)',
    'Return the published landing page without authentication.',
  )
  async getBySlug(
    @Param('slug') slug: string,
  ): Promise<ApiResponseDto<LandingPageResponse | null>> {
    const data = await this.landingPageService.getLandingPageBySlug(slug);
    return new ApiResponseDto(200, 'Fetched landing page', data);
  }

  @Public()
  @Post(':slug/landing-page-leads')
  @HttpCode(201)
  @ApiParam({ name: 'slug', description: 'Organization slug' })
  @ApiOperationAuto(
    'Submit landing page lead',
    'Accept a public landing page lead and notify the admins of that organization.',
  )
  async submitLead(
    @Param('slug') slug: string,
    @Body() dto: SubmitLandingPageLeadRequest,
  ): Promise<ApiResponseDto<LandingPageLeadResponse>> {
    const data = await this.landingPageService.submitLandingPageLead(slug, dto);
    return new ApiResponseDto(
      201,
      'Landing page lead submitted successfully',
      data,
    );
  }

  @ApiBearerAuth(AUTH_HEADERS.bearer)
  @ApiHeader(AUTH_HEADERS.orgHeader)
  @UseGuards(PermissionGuard)
  @RequirePermission(PERMISSIONS.TENANT.ORGANIZATIONS.MANAGE_LANDING_PAGE)
  @Put(':orgId/landing-page')
  @HttpCode(200)
  @ApiParam({ name: 'orgId', description: 'Organization UUID' })
  @ApiOperationAuto(
    'Create or update landing page',
    'Upsert the landing page for one organization.',
  )
  async upsert(
    @Param('orgId') orgId: string,
    @GetOrgId() scopedOrgId: string,
    @Body() dto: UpsertLandingPageRequest,
  ): Promise<ApiResponseDto<LandingPageResponse>> {
    const data = await this.landingPageService.upsertLandingPage(
      orgId,
      dto,
      scopedOrgId,
    );
    return new ApiResponseDto(200, 'Landing page saved successfully', data);
  }

  @ApiBearerAuth(AUTH_HEADERS.bearer)
  @ApiHeader(AUTH_HEADERS.orgHeader)
  @UseGuards(PermissionGuard)
  @RequirePermission(PERMISSIONS.TENANT.ORGANIZATIONS.MANAGE_LANDING_PAGE)
  @Get(':orgId/landing-page-draft')
  @ApiParam({ name: 'orgId', description: 'Organization UUID' })
  @ApiOperationAuto(
    'Get landing page editor draft',
    'Return the current user draft for this organization.',
  )
  async getDraft(
    @Param('orgId') orgId: string,
    @GetOrgId() scopedOrgId: string,
    @GetUser('sub') userId: string,
  ): Promise<ApiResponseDto<LandingPageDraftResponse | null>> {
    const data = await this.landingPageService.getLandingPageDraft(
      orgId,
      userId,
      scopedOrgId,
    );
    return new ApiResponseDto(200, 'Fetched landing page draft', data);
  }

  @ApiBearerAuth(AUTH_HEADERS.bearer)
  @ApiHeader(AUTH_HEADERS.orgHeader)
  @UseGuards(PermissionGuard)
  @RequirePermission(PERMISSIONS.TENANT.ORGANIZATIONS.MANAGE_LANDING_PAGE)
  @Put(':orgId/landing-page-draft')
  @HttpCode(200)
  @ApiParam({ name: 'orgId', description: 'Organization UUID' })
  @ApiOperationAuto(
    'Save landing page editor draft',
    'Persist the current editor state for the current user.',
  )
  async upsertDraft(
    @Param('orgId') orgId: string,
    @GetOrgId() scopedOrgId: string,
    @GetUser('sub') userId: string,
    @Body() dto: UpsertLandingPageDraftRequest,
  ): Promise<ApiResponseDto<LandingPageDraftResponse>> {
    const data = await this.landingPageService.upsertLandingPageDraft(
      orgId,
      userId,
      dto,
      scopedOrgId,
    );
    return new ApiResponseDto(
      200,
      'Landing page draft saved successfully',
      data,
    );
  }

  @ApiBearerAuth(AUTH_HEADERS.bearer)
  @ApiHeader(AUTH_HEADERS.orgHeader)
  @UseGuards(PermissionGuard)
  @RequirePermission(PERMISSIONS.TENANT.ORGANIZATIONS.MANAGE_LANDING_PAGE)
  @Get(':orgId/landing-page-templates')
  @ApiParam({ name: 'orgId', description: 'Organization UUID' })
  @ApiOperationAuto(
    'List templates',
    'Return all landing page templates for the organization.',
  )
  async listTemplates(
    @Param('orgId') orgId: string,
    @GetOrgId() scopedOrgId: string,
  ): Promise<ApiResponseDto<LandingPageTemplateResponse[]>> {
    const data = await this.landingPageService.listTemplates(
      orgId,
      scopedOrgId,
    );
    return new ApiResponseDto(200, 'Fetched templates', data);
  }

  @ApiBearerAuth(AUTH_HEADERS.bearer)
  @ApiHeader(AUTH_HEADERS.orgHeader)
  @UseGuards(PermissionGuard)
  @RequirePermission(PERMISSIONS.TENANT.ORGANIZATIONS.MANAGE_LANDING_PAGE)
  @Post(':orgId/landing-page-templates')
  @ApiParam({ name: 'orgId', description: 'Organization UUID' })
  @ApiOperationAuto(
    'Create template',
    'Create a new page template for the organization.',
  )
  async createTemplate(
    @Param('orgId') orgId: string,
    @GetOrgId() scopedOrgId: string,
    @Body() dto: CreateTemplateRequest,
  ): Promise<ApiResponseDto<LandingPageTemplateResponse>> {
    const data = await this.landingPageService.createTemplate(
      orgId,
      dto,
      scopedOrgId,
    );
    return new ApiResponseDto(201, 'Template created', data);
  }

  @ApiBearerAuth(AUTH_HEADERS.bearer)
  @ApiHeader(AUTH_HEADERS.orgHeader)
  @UseGuards(PermissionGuard)
  @RequirePermission(PERMISSIONS.TENANT.ORGANIZATIONS.MANAGE_LANDING_PAGE)
  @Patch(':orgId/landing-page-templates/:templateId')
  @ApiParam({ name: 'orgId', description: 'Organization UUID' })
  @ApiParam({ name: 'templateId', description: 'Template UUID' })
  @ApiOperationAuto('Update template', 'Update one page template.')
  async updateTemplate(
    @Param('orgId') orgId: string,
    @Param('templateId') templateId: string,
    @GetOrgId() scopedOrgId: string,
    @Body() dto: UpdateTemplateRequest,
  ): Promise<ApiResponseDto<LandingPageTemplateResponse>> {
    const data = await this.landingPageService.updateTemplate(
      orgId,
      templateId,
      dto,
      scopedOrgId,
    );
    return new ApiResponseDto(200, 'Template updated', data);
  }

  @ApiBearerAuth(AUTH_HEADERS.bearer)
  @ApiHeader(AUTH_HEADERS.orgHeader)
  @UseGuards(PermissionGuard)
  @RequirePermission(PERMISSIONS.TENANT.ORGANIZATIONS.MANAGE_LANDING_PAGE)
  @Delete(':orgId/landing-page-templates/:templateId')
  @HttpCode(204)
  @ApiParam({ name: 'orgId', description: 'Organization UUID' })
  @ApiParam({ name: 'templateId', description: 'Template UUID' })
  @ApiOperationAuto('Delete template', 'Delete one page template.')
  async deleteTemplate(
    @Param('orgId') orgId: string,
    @Param('templateId') templateId: string,
    @GetOrgId() scopedOrgId: string,
  ): Promise<void> {
    await this.landingPageService.deleteTemplate(
      orgId,
      templateId,
      scopedOrgId,
    );
  }
}
