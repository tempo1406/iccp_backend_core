import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
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
import { PaymentService } from './payment.service';
import { Public } from '@decorators/auth/public.decorator';
import { ApiResponseDto } from '@common/dto/api-response.dto';
import { PaginatedResponse } from '@common/dto/paginated.response';
import { CreatePaymentLinkRequest } from './dto/request/create-payment-link.request';
import { ChangePlanRequest } from './dto/request/change-plan.request';
import { QueryTransactionRequest } from './dto/request/query-transaction.request';
import { PaymentLinkResponse } from './dto/response/payment-link.response';
import { PaymentStatusResponse } from './dto/response/payment-status.response';
import { PaymentTransactionResponse } from './dto/response/payment-transaction.response';
import { Roles } from '@decorators/role/role.decorator';
import { RequirePermission } from '@decorators/role/require-permission.decorator';
import { RolesGuard } from '@guards/rbac-guard/roles.guard';
import { PermissionGuard } from '@guards/rbac-guard/permission.guard';
import { SystemRole } from '@common/enums/system-role.enum';
import { PERMISSIONS } from '@modules/rbac/constant/permission.constant';
import {
  GetOrgId,
  ORGANIZATION_HEADERS,
} from '../../decorators/organization/get-org-id.decorator';
import type { Webhook } from '@payos/node';

@ApiTags('Payment')
@Controller({ path: 'payment', version: '1' })
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // ========================
  // Org-facing (require x-organization-id header + permission)
  // ========================

  @Post('create-payment-link')
  @ApiBearerAuth('Authorization')
  @ApiHeader({
    name: ORGANIZATION_HEADERS.X_ORGANIZATION_ID,
    description: 'UUID of organization',
    required: true,
  })
  @UseGuards(RolesGuard, PermissionGuard)
  @RequirePermission(PERMISSIONS.BILLING.SUBSCRIPTIONS.CREATE)
  @ApiOperation({
    summary:
      'Tao link thanh toan PayOS cho subscription (yeu cau quyen billing trong org)',
  })
  async createPaymentLink(
    @Body() dto: CreatePaymentLinkRequest,
    @GetOrgId() orgId: string,
  ): Promise<ApiResponseDto<PaymentLinkResponse>> {
    const data = await this.paymentService.createPaymentLink(dto, orgId);
    return new ApiResponseDto(201, 'Tao link thanh toan thanh cong', data);
  }

  @Get('status/:orderCode')
  @ApiBearerAuth('Authorization')
  @ApiHeader({
    name: ORGANIZATION_HEADERS.X_ORGANIZATION_ID,
    description: 'UUID of organization',
    required: true,
  })
  @UseGuards(RolesGuard, PermissionGuard)
  @RequirePermission(PERMISSIONS.BILLING.SUBSCRIPTIONS.VIEW)
  @ApiOperation({ summary: 'Query trang thai thanh toan tu PayOS' })
  async getPaymentStatus(
    @Param('orderCode', ParseIntPipe) orderCode: number,
    @GetOrgId() orgId: string,
  ): Promise<ApiResponseDto<PaymentStatusResponse>> {
    const data = await this.paymentService.getPaymentStatus(orderCode, orgId);
    return new ApiResponseDto(
      200,
      'Lay trang thai thanh toan thanh cong',
      data,
    );
  }

  @Post('confirm/:orderCode')
  @ApiBearerAuth('Authorization')
  @ApiHeader({
    name: ORGANIZATION_HEADERS.X_ORGANIZATION_ID,
    description: 'UUID of organization',
    required: true,
  })
  @UseGuards(RolesGuard, PermissionGuard)
  @RequirePermission(PERMISSIONS.BILLING.SUBSCRIPTIONS.CREATE)
  @ApiOperation({
    summary:
      'Xac nhan thanh toan - FE goi khi user quay ve returnUrl, tu dong sync trang thai tu PayOS',
  })
  async confirmPayment(
    @Param('orderCode', ParseIntPipe) orderCode: number,
    @GetOrgId() orgId: string,
  ): Promise<ApiResponseDto<PaymentStatusResponse>> {
    const data = await this.paymentService.confirmPayment(orderCode, orgId);
    return new ApiResponseDto(200, 'Xac nhan thanh toan thanh cong', data);
  }

  @Post('cancel/:orderCode')
  @ApiBearerAuth('Authorization')
  @ApiHeader({
    name: ORGANIZATION_HEADERS.X_ORGANIZATION_ID,
    description: 'UUID of organization',
    required: true,
  })
  @UseGuards(RolesGuard, PermissionGuard)
  @RequirePermission(PERMISSIONS.BILLING.SUBSCRIPTIONS.CANCEL)
  @ApiOperation({ summary: 'Huy thanh toan dang pending' })
  async cancelPayment(
    @Param('orderCode', ParseIntPipe) orderCode: number,
    @GetOrgId() orgId: string,
  ): Promise<ApiResponseDto<void>> {
    await this.paymentService.cancelPayment(orderCode, orgId);
    return new ApiResponseDto(200, 'Huy thanh toan thanh cong');
  }

  @Post('change-plan')
  @ApiBearerAuth('Authorization')
  @ApiHeader({
    name: ORGANIZATION_HEADERS.X_ORGANIZATION_ID,
    description: 'UUID of organization',
    required: true,
  })
  @UseGuards(RolesGuard, PermissionGuard)
  @RequirePermission(PERMISSIONS.BILLING.SUBSCRIPTIONS.CHANGE_PLAN)
  @ApiOperation({
    summary:
      'Doi goi cuoc (upgrade/downgrade) — huy subscription hien tai va tao payment cho goi moi',
  })
  async changePlan(
    @Body() dto: ChangePlanRequest,
    @GetOrgId() orgId: string,
  ): Promise<ApiResponseDto<PaymentLinkResponse>> {
    const data = await this.paymentService.changePlan(dto, orgId);
    return new ApiResponseDto(
      201,
      'Tao link thanh toan doi goi thanh cong',
      data,
    );
  }

  // ========================
  // Webhook (public - PayOS calls this)
  // ========================

  @Public()
  @Post('webhook')
  @ApiOperation({ summary: 'PayOS webhook callback (verify signature)' })
  async handleWebhook(@Body() body: Webhook): Promise<ApiResponseDto<void>> {
    await this.paymentService.handleWebhook(body);
    return new ApiResponseDto(200, 'Webhook processed successfully');
  }

  // ========================
  // Admin-only (SYSTEM_ADMIN)
  // ========================

  @Post('confirm-webhook')
  @ApiBearerAuth('Authorization')
  @UseGuards(RolesGuard, PermissionGuard)
  @Roles(SystemRole.SYSTEM_ADMIN)
  @ApiOperation({
    summary: '[SYSTEM_ADMIN] Dang ky webhook URL voi PayOS (chi can goi 1 lan)',
  })
  async confirmWebhookUrl(
    @Body('webhookUrl') webhookUrl: string,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.paymentService.confirmWebhookUrl(webhookUrl);
    return new ApiResponseDto(200, 'Dang ky webhook URL thanh cong', data);
  }

  @Get('transactions')
  @ApiBearerAuth('Authorization')
  @UseGuards(RolesGuard, PermissionGuard)
  @Roles(SystemRole.SYSTEM_ADMIN)
  @ApiOperation({
    summary: '[SYSTEM_ADMIN] Lay danh sach giao dich (phan trang)',
  })
  async getTransactions(
    @Query() query: QueryTransactionRequest,
  ): Promise<ApiResponseDto<PaginatedResponse<PaymentTransactionResponse>>> {
    const data = await this.paymentService.getTransactions(query);
    return new ApiResponseDto(200, 'Lay danh sach giao dich thanh cong', data);
  }
}
