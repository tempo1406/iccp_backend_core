import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { Public } from '@decorators/auth/public.decorator';
import { ApiResponseDto } from '@common/dto/api-response.dto';
import { PaginatedResponse } from '@common/dto/paginated.response';
import { SubscriptionPlanResponse } from './dto/response/subscription-plan.response';
import { SubscriptionResponse } from './dto/response/subscription.response';
import { SubscriptionDetailResponse } from './dto/response/subscription-detail.response';
import { InvoiceResponse } from './dto/response/invoice.response';
import { CreatePlanRequest } from './dto/request/create-plan.request';
import { UpdatePlanRequest } from './dto/request/update-plan.request';
import { QueryPlanRequest } from './dto/request/query-plan.request';
import { QuerySubscriptionRequest } from './dto/request/query-subscription.request';
import { QueryInvoiceRequest } from './dto/request/query-invoice.request';
import { Roles } from '@decorators/role/role.decorator';
import { RolesGuard } from '@guards/rbac-guard/roles.guard';
import { PermissionGuard } from '@guards/rbac-guard/permission.guard';
import { RequirePermission } from '@decorators/role/require-permission.decorator';
import { PERMISSIONS } from '@modules/rbac/constant/permission.constant';
import { SystemRole } from '@common/enums/system-role.enum';
import {
  GetOrgId,
  ORGANIZATION_HEADERS,
} from '../../decorators/organization/get-org-id.decorator';
import { LegacyInternalKeyGuard } from '@guards/internal-key-guard/legacy-internal-key.guard';

@ApiTags('Billing')
@Controller({ path: 'billing', version: '1' })
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  // ========================
  // Public
  // ========================

  @Public()
  @Get('plans')
  @ApiOperation({ summary: 'Lấy các gói cước subscription của hệ thống' })
  async getAllPlans(): Promise<ApiResponseDto<SubscriptionPlanResponse[]>> {
    const plans = await this.billingService.getAllPlans();
    return new ApiResponseDto(200, 'Lấy danh sách gói cước thành công', plans);
  }

  // ========================
  // Org-facing (require x-organization-id header + permission)
  // ========================

  @Get('my-subscription')
  @ApiBearerAuth('Authorization')
  @ApiHeader({
    name: ORGANIZATION_HEADERS.X_ORGANIZATION_ID,
    description: 'UUID of organization',
    required: true,
  })
  @UseGuards(RolesGuard, PermissionGuard)
  @RequirePermission(PERMISSIONS.BILLING.SUBSCRIPTIONS.VIEW)
  @ApiOperation({ summary: 'Xem subscription hiện tại của tố chức' })
  async getMySubscription(
    @GetOrgId() orgId: string,
  ): Promise<ApiResponseDto<SubscriptionDetailResponse | null>> {
    const data = await this.billingService.getMySubscription(orgId);
    return new ApiResponseDto(
      200,
      'Lấy thông tin subscription thành công',
      data,
    );
  }

  @Get('my-invoices')
  @ApiBearerAuth('Authorization')
  @ApiHeader({
    name: ORGANIZATION_HEADERS.X_ORGANIZATION_ID,
    description: 'UUID of organization',
    required: true,
  })
  @UseGuards(RolesGuard, PermissionGuard)
  @RequirePermission(PERMISSIONS.BILLING.INVOICES.LIST)
  @ApiOperation({ summary: 'Xem danh sách hóa đơn của tổ chức' })
  async getMyInvoices(
    @GetOrgId() orgId: string,
    @Query() query: QueryInvoiceRequest,
  ): Promise<ApiResponseDto<PaginatedResponse<InvoiceResponse>>> {
    const data = await this.billingService.getMyInvoices(orgId, query);
    return new ApiResponseDto(200, 'Lấy danh sách hóa đơn thành công', data);
  }

  @Post('my-subscription/cancel')
  @ApiBearerAuth('Authorization')
  @ApiHeader({
    name: ORGANIZATION_HEADERS.X_ORGANIZATION_ID,
    description: 'UUID of organization',
    required: true,
  })
  @UseGuards(RolesGuard, PermissionGuard)
  @RequirePermission(PERMISSIONS.BILLING.SUBSCRIPTIONS.CANCEL)
  @ApiOperation({ summary: 'Huy subscription hien tai cua to chuc' })
  async cancelMySubscription(
    @GetOrgId() orgId: string,
  ): Promise<ApiResponseDto<void>> {
    await this.billingService.cancelMySubscription(orgId);
    return new ApiResponseDto(200, 'Huy subscription thanh cong');
  }

  @Public()
  @Get('internal/subscription')
  @UseGuards(LegacyInternalKeyGuard)
  @ApiOperation({
    summary: '[INTERNAL] Lấy subscription hiện tại của tổ chức theo orgId',
  })
  async getOrgSubscriptionInternal(
    @Query('orgId', new ParseUUIDPipe()) orgId?: string,
  ): Promise<ApiResponseDto<SubscriptionDetailResponse | null>> {
    if (!orgId) {
      throw new BadRequestException('orgId is required');
    }

    const data = await this.billingService.getMySubscription(orgId);
    return new ApiResponseDto(
      200,
      'Lấy thông tin subscription thành công',
      data,
    );
  }

  // ========================
  // Admin — Plans CRUD
  // ========================

  @Post('plans')
  @ApiBearerAuth('Authorization')
  @UseGuards(RolesGuard, PermissionGuard)
  @Roles(SystemRole.SYSTEM_ADMIN)
  @RequirePermission(PERMISSIONS.BILLING.PLANS.CREATE)
  @ApiOperation({ summary: '[SYSTEM_ADMIN] Tạo gói cước mới' })
  async createPlan(
    @Body() dto: CreatePlanRequest,
  ): Promise<ApiResponseDto<SubscriptionPlanResponse>> {
    const plan = await this.billingService.createPlan(dto);
    return new ApiResponseDto(201, 'Tạo gói cước thành công', plan);
  }

  @Get('plans/admin')
  @ApiBearerAuth('Authorization')
  @UseGuards(RolesGuard, PermissionGuard)
  @Roles(SystemRole.SYSTEM_ADMIN)
  @RequirePermission(PERMISSIONS.BILLING.PLANS.LIST)
  @ApiOperation({
    summary: '[SYSTEM_ADMIN] Lấy danh sách gói cước (phân trang, bộ lọc)',
  })
  async getPlansAdmin(
    @Query() query: QueryPlanRequest,
  ): Promise<ApiResponseDto<PaginatedResponse<SubscriptionPlanResponse>>> {
    const data = await this.billingService.getPlansAdmin(query);
    return new ApiResponseDto(200, 'Lấy danh sách gói cước thành công', data);
  }

  @Get('plans/:id')
  @ApiBearerAuth('Authorization')
  @UseGuards(RolesGuard, PermissionGuard)
  @Roles(SystemRole.SYSTEM_ADMIN)
  @RequirePermission(PERMISSIONS.BILLING.PLANS.VIEW)
  @ApiOperation({ summary: '[SYSTEM_ADMIN] Xem chi tiết gói cước' })
  async getPlanById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<SubscriptionPlanResponse>> {
    const plan = await this.billingService.getPlanById(id);
    return new ApiResponseDto(200, 'Lấy chi tiết gói cước thành công', plan);
  }

  @Patch('plans/:id')
  @ApiBearerAuth('Authorization')
  @UseGuards(RolesGuard, PermissionGuard)
  @Roles(SystemRole.SYSTEM_ADMIN)
  @RequirePermission(PERMISSIONS.BILLING.PLANS.UPDATE)
  @ApiOperation({ summary: '[SYSTEM_ADMIN] Cập nhật gói cước' })
  async updatePlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlanRequest,
  ): Promise<ApiResponseDto<SubscriptionPlanResponse>> {
    const plan = await this.billingService.updatePlan(id, dto);
    return new ApiResponseDto(200, 'Cập nhật gói cước thành công', plan);
  }

  @Delete('plans/:id')
  @ApiBearerAuth('Authorization')
  @UseGuards(RolesGuard, PermissionGuard)
  @Roles(SystemRole.SYSTEM_ADMIN)
  @RequirePermission(PERMISSIONS.BILLING.PLANS.DEACTIVATE)
  @ApiOperation({ summary: '[SYSTEM_ADMIN] Vô hiệu hóa gói cước' })
  async deactivatePlan(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<void>> {
    await this.billingService.deactivatePlan(id);
    return new ApiResponseDto(200, 'Vô hiệu hóa gói cước thành công');
  }

  @Patch('plans/:id/activate')
  @ApiBearerAuth('Authorization')
  @UseGuards(RolesGuard, PermissionGuard)
  @Roles(SystemRole.SYSTEM_ADMIN)
  @RequirePermission(PERMISSIONS.BILLING.PLANS.ACTIVATE)
  @ApiOperation({ summary: '[SYSTEM_ADMIN] Kích hoạt lại gói cước' })
  async activatePlan(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<void>> {
    await this.billingService.activatePlan(id);
    return new ApiResponseDto(200, 'Kích hoạt lại gói cước thành công');
  }

  // ========================
  // Admin — Subscriptions
  // ========================

  @Get('subscriptions')
  @ApiBearerAuth('Authorization')
  @UseGuards(RolesGuard, PermissionGuard)
  @Roles(SystemRole.SYSTEM_ADMIN)
  @RequirePermission(PERMISSIONS.BILLING.SUBSCRIPTIONS.LIST)
  @ApiOperation({
    summary: '[SYSTEM_ADMIN] Lấy danh sách subscriptions (phân trang, bộ lọc)',
  })
  async getSubscriptions(
    @Query() query: QuerySubscriptionRequest,
  ): Promise<ApiResponseDto<PaginatedResponse<SubscriptionResponse>>> {
    const data = await this.billingService.getSubscriptions(query);
    return new ApiResponseDto(
      200,
      'Lấy danh sách subscriptions thành công',
      data,
    );
  }

  @Get('subscriptions/:id')
  @ApiBearerAuth('Authorization')
  @UseGuards(RolesGuard, PermissionGuard)
  @Roles(SystemRole.SYSTEM_ADMIN)
  @RequirePermission(PERMISSIONS.BILLING.SUBSCRIPTIONS.VIEW)
  @ApiOperation({ summary: '[SYSTEM_ADMIN] Xem chi tiết subscription' })
  async getSubscriptionById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<SubscriptionDetailResponse>> {
    const data = await this.billingService.getSubscriptionById(id);
    return new ApiResponseDto(
      200,
      'Lấy chi tiết subscription thành công',
      data,
    );
  }
}
